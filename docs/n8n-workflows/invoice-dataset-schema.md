# Invoice Dataset Schema

The three active invoice workflows (`Zara Invoice Management V2.0 – Xero only`, `Zara Invoice Management V2.0 – Taxcellent`, `Invoice Management – Frank only`) write rows into the `Invoice Register.xlsx` workbook. Each row shares the same JSON contract before the Microsoft Excel nodes append the data. Use this page as the canonical reference when validating dashboard ingestion, building transformations, or extending the automations.

## Field Groups

### Email Metadata
- `message_id` – Outlook message identifier; primary key for dedupe.
- `email_subject` – Raw subject line.
- `email_from_name` / `email_from_address` – Sender details captured from the Outlook message.
- `received_sydney` / `email_received` – Localised timestamp (Australia/Sydney) for auditing.
- `has_attachments` – Boolean flag derived from Outlook metadata.
- `safe_subject` – Sanitised subject used when naming PDF uploads.

### Invoice Core Fields (from AI extraction)
- `source` – Canonical pipeline identifier used across Supabase and Excel. See **Source Taxonomy** below.
- `invoice_number`
- `invoice_date_iso`, `due_date_iso` – ISO 8601 timestamps produced by the OpenAI extraction.
- `invoice_date`, `due_date` – Truncated `YYYY-MM-DD` strings mapped into Excel columns.
- `currency`, `subtotal`, `gst_total`, `total`, `amount_due`
- `confidence` – Model-reported confidence score.
- `notes` – Free-form remarks from the extraction.

### Parties
- `supplier` (object with `name`, `abn`, `email`) – Preserved for full fidelity.
- `supplier_name`, `supplier_abn` – Flattened columns used in Excel.
- `customer` (object with `name`, `abn`).
- `customer_name`, `customer_abn` – Flattened equivalents.

### Banking & Payment
- `bank` object (`bsb`, `account`, `reference_hint`) from the PDF/text.
- `bank_bsb`, `bank_account` – Flattened columns for Excel.
- `payment_reference` – Normalised reference number (also used to backfill `invoice_number` when missing).

### Line Items
- `line_items` – Array of objects (`description`, `quantity`, `unit_price`, `tax_rate`, `line_total`).
- `line_1_desc`, `line_1_qty`, `line_1_unit_price` – First line flattened for legacy dashboard sheets.

### File & Link Artifacts
- `xero_link` – Normalised download URL scraped from the email body.
- `pdf_url_clean`, `pdf_url_download`, `url_for_http`, `debug_url_for_http` – Internal helper fields; the `Filter` node rejects rows where `debug_url_for_http == "⚠️ undefined"`.
- `file_name`, `file_id`, `file_url`, `folder_id`, `folder_path` – Returned by the OneDrive upload nodes so downstream processes can fetch the archived PDF.

### Additional Context
- `email_from` – Raw sender address prior to parsing name/address pairs.
- `ctx_*` fields (e.g., `ctx_message_id`) – Transit-only context for attachment processing; retained but not consumed by the dashboard.
- `log`, `subject` – Populated when a message fails validation (e.g., missing Xero link).

## Source Taxonomy
Every row written by the automations includes a `source` column so downstream systems can filter by workflow. Current values:

| Source value | Workflow | Notes |
| --- | --- | --- |
| `xero_email` | Zara Invoice Management V2.0 – Xero only | Link-driven Xero reminders. |
| `taxcellent_email` | Zara Invoice Management V2.0 – Taxcellent | Attachment + link ingestion for Taxcellent/ATO/ASIC. |
| `frank_email` | Invoice Management – Frank only | Frank FBCS invoices, includes fallback rows for missing PDFs. |
| `postal_ocr` | Postal Invoice Intake – OCR | OneDrive postal invoices processed via OCR (planned rollout). |
| `manual_fallback` | (Frank workflow branch) | Explicit flag when no PDF/link is retrievable; investigate manually. |

Append new values here whenever additional flows launch so the dashboard and analytics retain a single source of truth.

## Validation Tips
- Dedupe logic relies on `message_id` plus `xero_link`; downstream transformations should respect both.
- Monetary values are coerced to numbers inside `Code`/`Code1` nodes. Expect `null` for missing amounts, not `0`.
- The workflows upload PDFs to OneDrive folder `015B23OEWATWVPW3ZR3ZDYQVBEYCUAYKUS`. Use `file_id`/`file_url` for traceability.
- When testing, emulate Outlook payloads that include `internetMessageId`, `receivedDateTime`, and HTML bodies—several nodes reference these paths directly.
