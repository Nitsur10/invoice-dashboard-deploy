# Postal Invoice Intake – OCR Workflow (Proposed)

## Objective
- Ingest scanned/email-forwarded “postal” invoices stored in OneDrive (`Rudra Projects/Invoice Management/Postal Invoices`) and land them in both Supabase and the existing Excel workbook so downstream dashboards keep a single contract.
- Extract invoice metadata from image-based PDFs via OCR, archive the binary in the existing SharePoint structure, and upsert structured rows directly into Supabase (`Invoice` table) with strong deduplication.
- Append the same structured record into `Invoice Register.xlsx` (`Postal` sheet/table) to maintain parity with the other three invoice workflows.
- Align with the production Supabase dataset that already powers the dashboard so reporting remains consistent across sources.
- Produce rich run telemetry so finance can audit what was read, skipped, or flagged for manual follow-up.

## Current Status (2025‑11‑07)
- **Workflow implementation:** The draft design now runs in n8n as **“Postal Invoice V2.0”** (ID `pt8Wc5cH85tRPtvU`). We are still triggering it manually while the three‑hour Cron remains disabled until the Supabase insert path is finalised.
- **Production artefacts audited:**
  - OneDrive `Postal Invoices` source folder (post‑cleanup): **48** files ready for OCR.
  - OneDrive `Pending` folder: **16** files that still require human QA (missing totals, unreadable PDFs, etc.). These must be validated before they can hit the dashboard backend.
  - OneDrive archive (`Invoice_Attachments/YYYY-MM-DD`): **61** processed binaries with long‑term retention.
  - `Invoice Register.xlsx → Postal` table: **74** rows populated via the workflow, all tagged with `source='pdf'` and pointing at the archived attachment URL.
- **Cleanup & reconciliation:**
  - Added `scripts/cleanup-postal-onedrive.mjs` to enumerate archive/source/pending folders through Microsoft Graph. It hashes name+size combinations and deletes source/pending files once the archive contains an identical copy. Running it removed **82** leftover duplicates from the first 109‑invoice backfill.
  - Duplicate summary (invoice number • date • amount) is stored in `reports/postal-duplicates.json`. Six duplicate groups remain visible in Excel intentionally; they will be collapsed during the Supabase import to avoid double‑counting.
  - The “pending” folder is now the explicit queue for invoices that failed validation (missing totals, OCR confidence < 0.3, etc.). Keeping that list short—and documenting the rejection reason—prevents gaps once we start writing to the backend tables.
- **Next milestone:** Map the postal schema to existing Supabase tables (`invoice`, `postal_ingest_log`, Excel mirrors) with a `source='postal_ocr'` tag so dashboard filters can distinguish the new feed. Only archive‑backed rows will be eligible for insertion; pending items stay quarantined until corrected.

## Trigger & Scope
- **Trigger:** Scheduled every 3 hours (in sync with other invoice flows) plus a manual trigger for backfills.
- **Source:** Microsoft OneDrive folder `Postal Invoices` (recursive).
  - Monitor `createdDateTime` and maintain a checkpoint (Supabase table `postal_ingest_log` or n8n static data) to avoid reprocessing older files.
  - Exclude files already stamped with a `_processed.json` companion or older than 90 days during steady-state runs.

## High-Level Flow
1. **Schedule / Manual Trigger**
2. **List New Files (OneDrive)**
   - Filter by extensions (`.pdf`, `.jpg`, `.png`).
   - Add metadata (path, created time, SHA-256 checksum via Code node).
3. **Deduplicate vs. Supabase**
   - Query Supabase for existing checksum/message IDs.
   - Drop anything already processed.
4. **Fetch Binary (OneDrive → Binary)**
5. **Vision Extraction (OpenAI)**
   - Upload PDF/image binary to OpenAI `files` endpoint (`purpose=vision`).
   - Call `responses.create` with a structured prompt + JSON schema.
   - Capture raw JSON and model metadata for telemetry.
6. **Parse Model Result (Code Node)**
   - Map `json.invoice_number`, `json.invoice_date`, totals, etc.
   - Normalise supplier/customer, GST, banking fields.
   - Apply Aussie-specific heuristics (ABN regex, due date fallback).
   - Attach model confidence scores per field.
7. **Business Rules & Validation**
   - Reject if total or supplier missing → push to manual queue table `postal_invoice_exceptions`.
   - Validate totals vs. GST (10% tolerance). Flag mismatch.
8. **Supabase Upsert**
   - `HTTP Request` with service-role key hitting Supabase REST (`/rest/v1/Invoice`).
   - `Prefer: return=minimal`.
   - `on_conflict=invoice_number` (fall back to checksum hash if missing).
   - Store additional fields: `source='postal_ocr'`, `file_checksum`, `ocr_model`, `ocr_confidence`.
9. **Excel Append**
   - Append flattened payload to `Invoice Register.xlsx` → `Postal` sheet (new `Table6`) while ensuring column parity with other flows (`supabase_id`, `source`, `file_url`, etc.).
   - Use a dedicated Microsoft Graph Excel node to avoid contention with the scheduled flows (lock retries enabled).
10. **Archive & Tag**
   - Move processed file into dated folder (`/Postal Invoices/Processed/YYYY-MM-DD`) or add OneDrive facet metadata via Graph API.
   - Optional: write `_processed.json` companion with Supabase ID + timestamp.
11. **Telemetry & Notifications**
    - Push execution summary to Supabase (new table `postal_ingest_log`) for dashboarding.
    - If any exception rows, send Teams/Email summary with file links & reason.

## n8n Node Blueprint
| Node | Purpose | Notes |
| ---- | ------- | ----- |
| Schedule / Manual | Trigger | 3 h cron + manual backfill |
| **Set: Compute Window** | Manage `lastRun` timestamps | Use execution metadata or Supabase log |
| Microsoft OneDrive – List | Pull recent files | Filter by created/modified timestamp |
| Code – Hash & Prepare | Compute SHA-256 and set flags | Use `crypto.createHash('sha256')` |
| HTTP Request – Supabase `select` | Dedup by checksum/invoice number | `?or=(file_checksum.eq...,invoice_number.eq...)` |
| IF – Already processed? | Skip duplicates | Pass-through only new files |
| OneDrive – Download | Get binary | Provide as `binaryData` to OCR |
| HTTP Request – OpenAI Upload | Send binary for vision analysis | Returns `file_id` |
| HTTP Request – OpenAI Vision | Request structured invoice JSON | Provide prompt + schema |
| Code – Parse Vision Output | Map response to invoice schema | Extract invoice fields, fallback logic |
| Code – Validate | GST math, mandatory fields, classification | Collect warnings/errors |
| IF – Valid vs. Exception | Route accordingly | Exceptions to log/notify |
| HTTP Request – Supabase Upsert | Insert structured row | `on_conflict=invoice_number` with `Prefer: resolution=merge-duplicates` |
| Microsoft Excel – Append Row | Keep Excel dataset in sync | Append to `Invoice Register.xlsx` → `Postal` table (retry on contention) |
| OneDrive – Move / Tag | Archive processed files | Create `/Processed/YYYY-MM-DD/` |
| HTTP Request – Supabase Insert | Log success/exceptions | Table `postal_ingest_log` |
| Code – Summary | Build execution report | Counts: processed, skipped, exceptions |
| Email/Teams Notification | Alert on exceptions | Optional but recommended |

### n8n Implementation (Follow Existing Workflow Pattern)
Mirror the structure of the Xero/Frank flows so ops can manage everything in one place.

1. **Trigger**
   - Node: `Cron`
   - Mode: Every 3 hours (same as other invoice workflows)
   - Manual backfill: enable `Execute Workflow` manually or wire a webhook trigger clone.

2. **Compute Lookback Window**
   - Node: `Function` (or `Set`)
   - Logic: Default 30 days for backfill, override via workflow parameter (`{{$json.daysBack || 30}}`).
   ```js
   const daysBack = $json.daysBack ?? 30;
   const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
   return [{ cutoffIso: cutoff.toISOString() }];
   ```

3. **List Postal Files**
   - Node: `Microsoft OneDrive` (Graph API) → *List root folder*
   - Credentials: **n8n OneDrive – Rudra** (now with Files/Sites app permissions)
   - Path: `Rudra Projects/Invoice Management/Postal Invoices`
   - Parameters:
     - `IncludeSubfolders=false`
     - `Filter`: `createdDateTime ge {{$json.cutoffIso}}`
     - `Binary Property`: `data`
   - Optional: set `$limit` if you want to process in batches (matching existing flows).

4. **Split into Items**
   - Node: `Item Lists → Split In Batches`
   - Batch Size: 1 (process sequentially)
   - Downstream nodes read from `$binary.data`.

5. **Deduplicate against Supabase**
   - Node: `Function`
   ```js
   const crypto = require('crypto');
   const content = this.helpers.binaryToBuffer($binary.data.data);
   const checksum = crypto.createHash('sha256').update(content).digest('hex');
   $item().$binary.checksum = checksum;
   return [{ checksum, filename: $json.name }];
   ```
   - Node: `HTTP Request` (Supabase REST)
     - Method: `GET`
     - URL: `{{SUPABASE_URL}}/rest/v1/invoice`
     - Query parameters:
       - `select=id,invoice_number`
       - `or=(file_checksum.eq.{{$json.checksum}},invoice_number.eq.{{$json.invoice_number || 'NULL'}})`
       - `apikey={{SUPABASE_SERVICE_ROLE_KEY}}`
     - Headers: `Authorization: Bearer {{SUPABASE_SERVICE_ROLE_KEY}}`
   - Node: `IF` to skip duplicates (if response array length > 0).

6. **Convert PDF to Image**
   - Preferred: `HTTP Request` (Graph)
     - Method: `GET`
     - URL: `https://graph.microsoft.com/v1.0/drives/{{driveId}}/items/{{$json.id}}/thumbnails/0/large`
     - Download binary: yes (`binaryProperty=thumbnail`)
   - `IF` branch: if thumbnail not available, use `Run Command` (qlmanage) or a custom Node to convert the `data` binary to PNG (macOS host requirement) and store as `thumbnail`.

7. **OpenAI Vision**
   - Node: `HTTP Request`
     - Method: `POST`
     - URL: `https://api.openai.com/v1/responses`
     - Authentication: Use `OpenAiVision` credential
     - Body: raw JSON referencing the file upload (n8n’s OpenAI node can’t send images yet; continue using HTTP Request)
     - Pre-step: upload binary to `https://api.openai.com/v1/files` (`multipart/form-data` with `purpose=vision`). Store returned `file_id`.
     - Prompt: same JSON schema as the backend script (copy from spec).
   - Extract JSON with `Function`:
   ```js
   const text = $json.output_text || $json.output?.[0]?.content?.[0]?.text;
   return [JSON.parse(text)];
   ```

8. **Validation & Mapping**
   - Node: `Function`
     - Ensure `supplier_name`, positive `total`, GST/total consistency.
     - Add metadata: `source='postal_ocr'`, `file_checksum`, `ocr_confidence`.
     - On failure: set `validationStatus='exception'` and route to exception branch.

9. **Supabase Upsert**
   - Node: `HTTP Request`
     - Method: `POST`
     - URL: `{{SUPABASE_URL}}/rest/v1/invoice?on_conflict=invoice_number`
     - Headers: `apikey`, `Authorization`, `Content-Type: application/json`
     - Body: Result from validation node (map fields 1:1).
     - Response includes `{ id }` → store as `supabase_id`.

10. **Excel Append**
    - Node: `Microsoft Excel`
      - Operation: `Append`
      - Worksheet: `Postal`
      - Table: `Table6` (add Supabase ID column if needed)
      - Map fields to the same schema as existing workflows (include `supabase_id`, `file_url`, etc.).

11. **OneDrive Archive**
    - Node: `Microsoft OneDrive → Move File`
      - Destination: `Invoice_Attachments/{{today}}/`
      - Create folder on the fly if missing (use a `Function` to format the date and a `Move` node with `KeepOriginalName=true`).
      - Optionally generate a sharing link (`POST /createLink`) and update Supabase with the link (patch request).

12. **Logging & Notifications**
    - Node: `HTTP Request` → insert into `postal_ingest_log` (status `processed`, `skipped_duplicate`, `exception`).
    - Node: `IF` (status === exception) → `Microsoft Teams` or `Email`.
    - Node: `Function` to aggregate summary and pass to a `Slack/Email` node for daily digest (optional, matches existing patterns).

13. **Complete / Dry Run flag**
    - Use workflow parameter (`dryRun=true`) to bypass Supabase+Excel writes during testing; mirror the Play/QA flag used in other workflows.

#### Node Naming & Comments
- Prefix nodes with numeric groups like existing workflows (`10 – List Postal Files`, `20 – Fetch Thumbnail`, etc.) so the audit trail reads consistently.
- Add minimal comments (via `Notes`) describing purpose, especially around the thumbnail fallback and Supabase upsert.

#### Credentials Reuse
| Credential Name | Used by Nodes |
|-----------------|---------------|
| `n8n OneDrive – Rudra` | List files, download PDF, thumbnails, move/archive |
| `OpenAiVision` | OpenAI upload + response |
| `ZARA 2.0 – Supabase Database` | Dedup select, upsert, ingest log |
| `Invoice Register.xlsx` Excel credential | Append postal row |

#### Testing Playbook (n8n)
1. Clone the workflow, set `dryRun=true`, run with `daysBack=30` and inspect the debug data.
2. Disable `dryRun`, set `maxFiles=1` using a `Function` node (similar to backend flag) and run manually to create a single Supabase/Excel row.
3. Verify Supabase row (`source = 'postal_ocr'`) and Excel `Postal` sheet entry.
4. Reset parameters, enable cron trigger, and monitor the first scheduled execution.

Once this n8n workflow is live, retire the ad-hoc backend script or keep it as a fallback for large backfills. The structure above is intentionally aligned with the Xero/Frank flows so future maintainers can reuse the same runbooks, alerts, and dashboards without deviation.

## Data Mapping (Vision → Invoice Schema)
| Invoice Field | Model Output | Notes |
| ------------- | ---------- | ----- |
| `invoice_number` | `json.invoice_number` | Fallback regex on combined text |
| `invoice_date` | `json.invoice_date` | Expect ISO string |
| `due_date` | `json.due_date` | Fallback via payment terms |
| `supplier_name` | `json.supplier.name` | Trim / normalise casing |
| `supplier_abn` | `json.supplier.abn` | Validate 11-digit ABN |
| `customer_name` | `json.customer.name` | |
| `total` | `json.total` | |
| `subtotal` | `json.subtotal` | |
| `gst_total` | `json.gst_total` | |
| `amount_due` | `json.amount_due` or `total` | |
| `bank_bsb` / `bank_account` | `json.bank.bsb` / `json.bank.account` | Regex fallback |
| `line_items` | `json.line_items[0]` | Map to `line_1_*` |
| `file_checksum` | From hash node | Supabase dedupe |
| `ocr_confidence` | Weighted average of model field confidences | Store for auditing |
| `file_url` | OneDrive share link | Use Graph API to create sharing link |
| `source` | `'postal_ocr'` | Distinguish from other flows |
| `supabase_id` | Returned by Supabase upsert | Stored in Excel + telemetry |

### Excel Schema Alignment
Ensure the `Postal` table mirrors the columns produced by the Supabase payload so downstream PowerQuery transforms stay contract-compatible:
- Required columns: `supabase_id`, `source`, `invoice_number`, `invoice_date`, `due_date`, `supplier_name`, `supplier_abn`, `customer_name`, `total`, `gst_total`, `bank_bsb`, `bank_account`, `line_1_desc`, `file_url`, `file_checksum`, `ocr_confidence`, `created_at`.
- Configure the Graph append node to map camelCase JSON properties to the existing header casing (e.g. `invoice_date_iso` → `invoice_date`).
- Enable `retry on failure` (max 5 attempts) on the Excel node to handle workbook locks caused by the other flows.

## Supabase Changes
- Table `Invoice`
  - Ensure columns exist: `file_checksum`, `ocr_confidence`, `ocr_model`, `source`.
  - Constraints: unique index on `invoice_number` + `source`; secondary unique on `file_checksum`.
- New table `postal_ingest_log`
  - Columns: `id`, `file_path`, `file_checksum`, `status` (`processed`, `skipped_duplicate`, `exception`), `reason`, `invoice_number`, `supabase_id`, `created_at`, `execution_id`.

## Backfill & Data Quality Strategy
- **Initial Backfill:** Run the workflow manually with `window_start = now - 30 days`. Use OneDrive `createdDateTime` filters to only pick files within that range while honouring dedupe against Supabase (`file_checksum`).
- **Ongoing Drift Detection:**
  - Supabase query to monitor daily counts:
    ```sql
    select invoice_date, count(*) as postal_rows
    from invoice
    where source = 'postal_ocr'
      and invoice_date >= current_date - interval '30 days'
    group by invoice_date
    order by invoice_date;
    ```
  - Excel: refresh the `Postal` sheet pivot and confirm row counts match the Supabase query.
- **Exception Review:** Build a Supabase view `postal_ingest_exceptions` aggregating reasons. Review weekly to ensure OCR or validation failures stay <5% of volume.
- **Telemetry Dashboard:** Extend the existing finance dashboard to overlay OneDrive file counts vs. Supabase insert counts so missing files surface quickly.

## Credential Requirements
- **OpenAI API** (vision-capable model such as `gpt-4.1`, `gpt-4o`, `gpt-4o-mini`).
- **Supabase service role** (already available).
- **Microsoft Graph OneDrive OAuth** (already used by other workflows).
- **Microsoft Graph Excel OAuth** with access to `Invoice Register.xlsx` (same credential reused by the other flows).

## Error Handling
- OpenAI errors → retry (429/5xx with exponential backoff); persist failure in `postal_ingest_log`.
- Low confidence (<0.5) or missing required fields → route to exceptions table + notification.
- Move files that error into `/Postal Invoices/Review/` to avoid tight loops.

## Testing Strategy
1. **Unit (Code nodes)**
   - Mock Azure response JSON (high and low confidence) → ensure mapping handles decimals, missing GST, ABN extraction.
   - Hash & dedupe logic with synthetic inputs.
2. **Integration (n8n CLI)**
   - Use `n8n execute --file postal-ocr.test.json` with sample binaries (converted to base64) to verify end-to-end flow in CLI.
   - Validate Supabase row created, Excel row appended, and `postal_ingest_log` entries written.
3. **Regression**
   - Add Playwright/API tests hitting `/api/invoices` to ensure new source rows surface correctly.
4. **Manual dry run**
   - Process known sample(s) from `data/postal-invoices-sample/`.
   - Confirm Supabase inserts, Excel append, OneDrive move, exception notifications.

## Open Items
- Finalise OpenAI prompt & schema (ensure deterministic JSON output).
- Define backfill strategy for historical postal invoices (manual upload of processed metadata or staged reruns).
- Decide on retention / cleanup policy for processed files (keep originals vs. move to archive).
- Align with dashboard team on any new fields (e.g., `ocr_confidence`) they wish to surface.

## Next Steps
1. Gather sample postal PDFs (placed in `data/postal-invoices-sample/`) for prompt tuning.
2. Implement workflow per blueprint (use agents for spec → tests → impl → QA as per established process).
3. Populate additional postal samples for testing coverage.
4. After validation, schedule production run and monitor for first 48 hours with Supabase + Excel delta reports.

## Backend Worker (Node.js) Alternative
For tighter version control and automated testing, a TypeScript worker can run the full postal pipeline outside n8n.

- Script: `scripts/postal-ocr.ts`
- Run with: `tsx scripts/postal-ocr.ts`
- Environment variables (in addition to the OpenAiVision key):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_INVOICES_TABLE` (defaults to `invoices`)
  - `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
  - `POSTAL_ONEDRIVE_DRIVE_ID`, `POSTAL_ONEDRIVE_FOLDER_PATH`
  - `OPENAI_API_KEY`
  - Optional: `OPENAI_VISION_MODEL`, `POSTAL_LOOKBACK_HOURS`
- Behaviour:
  1. Lists recent files in the OneDrive postal folder, downloads each PDF, computes SHA-256 for dedupe.
  2. Uploads to OpenAI Vision (using the `OpenAiVision` credential) and parses the structured JSON response.
  3. Validates core fields, upserts into Supabase (`source = 'postal_ocr'`), logs the run in `postal_ingest_log`.
  4. (Placeholder) Move/archive processed files once Graph permissions are confirmed.

This worker can be scheduled via GitHub Actions, Cloud Run, or Cron, and serves as the foundation for migrating the other invoice pipelines out of n8n over time.
