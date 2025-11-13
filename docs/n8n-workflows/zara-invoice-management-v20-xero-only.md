# Zara Invoice Management V2.0 – Xero Only (`wzR6HlmIjTuvfyfj`)

## Overview
Polls the shared finance mailbox for Xero-generated reminder emails that only include invoice links. The flow deduplicates recently received messages, downloads or reads the associated PDF, extracts key invoice metadata with OpenAI, uploads the clean PDF to the finance OneDrive, and appends a structured record into the `Invoice Register.xlsx` workbook used by the Invoice Dashboard.

- **Export:** `docs/n8n-workflows/exports/wf-wzR6HlmIjTuvfyfj.json`
- **Last updated (n8n):** 2025-09-07T10:03:08Z

## Trigger
- `Schedule` node runs every 3 hours.
- Pulls messages from **Microsoft Outlook account 2** (`rudraprojects` shared mailbox) within the last 6 hours.

## Inputs
- Filters Outlook messages to:
  - `invoicereminders@post.xero.com`
  - `messaging-service@post.xero.com` with `subject` containing `Invoice`.
- Retrieves headers, body HTML, attachment metadata, and message IDs for downstream correlation.

## Process Highlights
- `Deduplicate` code node keeps only the newest email per Xero link and drops self-sent replies.
- `Compute Xero Link` parses the HTML body to normalise the Xero “DownloadPdf” URL; falls back to parsed fields when necessary.
- Conditional branches:
  - **Attachment path:** Downloads PDF attachments, runs `Read PDF (attach)` and `@n8n/n8n-nodes-langchain.openAi` to extract invoice data.
  - **Xero link path:** Uses the prepared URL with `HTTP Request` → `Read PDF (xero)` → OpenAI extraction.
- Two `Upload a file` nodes store the processed PDF in the finance OneDrive folder (`parentId 015B23OEWATWVPW3ZR3ZDYQVBEYCUAYKUS`) to keep an auditable copy.
- `flatten + tidy` / `flatten + tidy pdf` nodes transform the AI output into a consistent schema (supplier/customer names & ABNs, invoice/due dates, bank details, first line item, message metadata).
- `Filter` ensures only rows with a valid Xero URL (debug field populated) reach the final append.

## Outputs & Contracts
- **Primary destination:** SharePoint workbook `Invoice Register.xlsx`
  - Sheet `Xero only`, Table `Table4` via `Microsoft Excel` node (`Append to Excel (Graph)` and `Append to Excel (Graph)1`).
  - Data columns include (not exhaustive): `supplier_name`, `supplier_abn`, `customer_name`, `invoice_number`, `invoice_date`, `due_date`, `total_gross`, `gst`, `bank_bsb`, `bank_account`, `line_1_desc`, `payment_reference`, `message_id`, `email_subject`, link metadata.
- **Binary artifacts:** PDF uploaded to the shared OneDrive folder; link fields (`file_id`, `file_url`, `folder_path`) are appended for the dashboard ETL.
- **Source tagging:** Supabase rows and Excel entries are stamped with `source = 'xero_email'` for downstream filtering.
- **Freshness expectation:** Up to 3h delay from email receipt (scheduler cadence + 6h lookback for resilience).

## Operational Notes
- CLI interactions emit warnings about missing `n8n-nodes-openai` packages; production runs rely on the bundled `@n8n/n8n-nodes-langchain.openAi` nodes and continue operating.
- Credentials in use:
  - `Microsoft Outlook account 2`
  - `Microsoft Excel account`
  - `Microsoft Drive account`
- Update `docs/n8n-workflows/README.md` if workbook locations or credential names change.
- When modifying, export a backup and verify that the PDF upload folder ID and Excel table GUIDs remain aligned with the Invoice Dashboard ingestion scripts.

## Coverage & Reconciliation Enhancements

### 1. Backfill & Detection (30-Day Window)
- Replace the `Get recent messages` fixed **6h** filter with a dynamic window:
  - Add a `Set → window_start` code node that calculates `now.minus({ days: 30 })` and feeds it into the Outlook `receivedDateTime` filter.
  - Keep the existing 6h cadence on the Schedule trigger; the wider window is only active during the manual backfill run.
- Before re-enabling the scheduler, run **two manual executions**:
  1. `windowStart = now - 30d` to backfill historical gaps after credential outages.
  2. `windowStart = now - 24h` to confirm dedupe behaviour still suppresses duplicates.
- Capture execution IDs and save them in `docs/n8n-workflows/exports/execution-logs/` for audit.

### 2. Data Completeness Checks
- **Excel parity:** After the backfill execution finishes, download the `Invoice Register.xlsx` version history, filter `Sheet: Xero only` for `invoice_date >= (today - 30d)` and confirm there are no date gaps.
- **Supabase reconciliation:** Use the existing Supabase dataset to detect missing days:
  ```sql
  select
    invoice_date,
    count(*) as row_count
  from invoice
  where source = 'xero_email'
    and invoice_date >= current_date - interval '30 days'
  group by invoice_date
  order by invoice_date;
  ```
  - Investigate any day where `row_count = 0` but Outlook shows mail delivery.
- Log discrepancies in `docs/reports/data-quality/2025-xx-xero-only.md`.

### 3. Supabase / Excel Hardening
- Confirm the existing Supabase upsert node includes `source = 'xero_email'`, `file_checksum`, and returns `supabase_id` (check recent successful executions for the response payload).
- Verify the `supabase_id` column is flowing into Excel (`Table4`) by downloading a recent workbook version and spot-checking rows against Supabase.
- Ensure error handling routes are capturing non-2xx responses in `email_ingest_log`; add alerting if failures exceed the historical baseline.
- Document the credential (`Supabase Finance REST`) used by the workflow and confirm rotation procedures are up to date.

### 4. Operational Checklist Before Go-Live
- Secrets: confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE` remain valid in the n8n credentials vault (rotate together with Excel/Graph tokens).
- Observability: create a Grafana panel or Supabase dashboard to monitor daily insert counts vs. Excel row deltas.
- Rollback: keep the latest workflow export on file so reverted changes can restore the current Supabase-integrated behaviour quickly.
