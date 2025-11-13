# Postal Agent Worker – Processing Specification

## Responsibilities
- Consume jobs from `postal_jobs` (status `pending` or `retry_scheduled`).
- Download OneDrive item using `drive_id` + `file_id`.
- Compute SHA-256 checksum (to assist dedupe/audit).
- Upload binary to OpenAI vision-capable endpoint, request structured invoice JSON.
- Validate and normalise response into Supabase `Invoice` schema.
- Archive file (move/copy) to `/Invoice_Attachments/YYYY-MM-DD/`.
- Generate sharing link (`file_url`) and capture `file_id`, `folder_id`, `folder_path`.
- Upsert structured row into Supabase (`source='postal_agent'`), logging confidence.
- Record telemetry in `postal_ingest_log`; insert exceptions when validation fails.
- Update job status (`success`, `retry_scheduled`, `failed`) with retry/backoff.

## Processing Flow
1. **Job Claim**
   - `UPDATE postal_jobs SET status='processing', updated_at=now() WHERE id = ... RETURNING *`.
   - Log `postal_ingest_log (status='processing')`.
2. **Download Binary**
   - GET `https://graph.microsoft.com/v1.0/drives/{driveId}/items/{fileId}/content`.
   - If 404/410 → mark job `failed` (`reason: missing_file`).
   - Compute `checksum = sha256(binary)`.
3. **OpenAI Vision**
   - Upload via `POST https://api.openai.com/v1/files` (`purpose=vision`).
   - Call `POST /v1/responses` with model `gpt-4o` (or `gpt-4.1`), referencing `file_id`.
   - Prompt includes instructions + JSON schema (below).
   - Handle 429/5xx with exponential backoff (max 3 attempts).
4. **Parse & Validate**
   - Parse `response.output_text` as JSON.
   - Validate fields:
     - Required: `invoice_number` OR `message_id`, `total`, `supplier.name`.
     - `gst_total` within ±10% of `total * 0.1` when number is present.
     - ABN: 11 digits when provided.
     - BSB format `NNN-NNN` (strip spaces).
   - If validation fails → insert into `postal_invoice_exceptions` (reason, raw JSON) and mark job `failed`.
5. **Archive / Share**
   - Determine archive folder: `/Invoice_Attachments/{YYYY-MM-DD}/`.
   - Ensure folder exists (`children?$filter=name eq '{date}'` or create).
   - Copy original file into archive; capture `archiveFileId`, `folderId`.
   - Generate view link: `POST /createLink {type:'view',scope:'organization'}`.
6. **Supabase Upsert**
   - Payload fields:
     - `invoice_number`, `invoice_date`, `due_date`, `currency`, `subtotal`, `gst_total`, `total`, `amount_due`.
     - `supplier_name`, `supplier_abn`, `supplier_email`.
     - `customer_name`, `customer_abn`.
     - `bank_bsb`, `bank_account`, `reference_hint`.
     - `line_1_desc`, `line_1_qty`, `line_1_unit_price`.
     - `message_id` (if provided by model).
     - `file_name`, `file_url`, `folder_path`, `file_id`, `folder_id`.
     - `source='postal_agent'`, `file_checksum`, `ocr_model`, `ocr_confidence`.
   - `POST https://...supabase.co/rest/v1/Invoice?on_conflict=invoice_number`
     - Prefer `return=minimal`.
7. **Telemetry Update**
   - Insert `postal_ingest_log` row (status `supabase_upserted`, confidence info).
   - Update job status `success`.
8. **Error handling**
   - On transient errors (Graph throttles, OpenAI 429), set `status='retry_scheduled'`, increment attempts, schedule `now() + interval '5 minutes' * pow(2, attempts)`.
   - On permanent errors, mark `failed`, record `error_message`.

## OpenAI Prompt (Sketch)
- System prompt: instruct model to act as invoice parser; ensure JSON output adheres to schema.
- User prompt example:
  ```
  You're processing a scanned invoice. Extract fields as JSON (UTF-8, no comments):
  {
    "invoice_number": string,
    "invoice_date": "YYYY-MM-DD" | null,
    "due_date": "YYYY-MM-DD" | null,
    "currency": string | null,
    "subtotal": number | null,
    "gst_total": number | null,
    "total": number,
    "amount_due": number | null,
    "supplier": {
      "name": string,
      "abn": string | null,
      "email": string | null
    },
    "customer": {
      "name": string | null,
      "abn": string | null
    },
    "bank": {
      "bsb": string | null,
      "account": string | null
    },
    "line_items": [
      {
        "description": string,
        "quantity": number | null,
        "unit_price": number | null
      }
    ],
    "message_id": string | null,
    "notes": string | null,
    "confidence": {
      "invoice_number": number,
      "supplier": number,
      "totals": number
    }
  }
  ```
  - Provide example, emphasise: return `null` for unknown, decimals as numbers, no additional text.
  - Attach file via `input_image` referencing uploaded `file_id`.

## Validation Heuristics
- `invoice_number`: default to checksum suffix if missing (but mark exception).
- `gst_total`: if null and `total` provided, attempt to compute `total / 11`.
- `bank_bsb`: normalise digits (remove spaces); ensure length=6 → format as `XXX-XXX`.
- Confidence aggregate: average of provided confidence scores; store in `ocr_confidence`.
- If `confidence.totals < 0.5`, escalate to exception (manual review).

## Logging & Monitoring
- Each job run logs to Supabase with:
  - Confidence scores.
  - Extracted totals.
  - File checksum.
  - Decision path (success vs exception).
- Expose metrics: average processing time, success rate, failure reasons.

## Testing Strategy
1. **Unit Tests**
   - Mock OpenAI response JSON; ensure normalisation handles missing fields.
   - Validation functions (ABN regex, GST tolerance).
   - Archive/link stub returning expected metadata.
2. **Integration Tests**
   - Use sample postal PDFs (converted to base64 fixtures) to simulate job end-to-end with mocked Graph/OpenAI responses.
   - Verify Supabase insert stub receives correct payload.
3. **End-to-End Dry Run**
   - Run worker against staging Supabase and OneDrive sandbox.
   - Confirm webhooks enqueue jobs and worker drains queue.

