# Zara Invoice Management V2.0 – Taxcellent (`ZZcktTuP2fFegZ26`)

## Overview
Handles supplier emails from Taxcellent (and related government notices detected heuristically) to keep the Taxcellent register in sync. The flow ingests recent Outlook messages, extracts invoice/payment details with OpenAI, normalises entity names for ATO/ASIC content, archives the PDF to OneDrive, and appends structured rows into the `Invoice Register.xlsx` workbook.

- **Export:** `docs/n8n-workflows/exports/wf-ZZcktTuP2fFegZ26.json`
- **Last updated (n8n):** 2025-09-07T09:55:32Z

## Trigger
- `Schedule` trigger executes every 3 hours.
- Looks back 6 hours in the shared mailbox via **Microsoft Outlook account 2**.

## Inputs
- Outlook filter: `from/emailAddress/address = admin@taxcellent.com.au`, `hasAttachments = true`, `subject` contains `Payment Reminder`.
- Captures message metadata, body HTML, and attachment headers for AI parsing and traceability.

## Process Highlights
- `Deduplicate` node avoids double-processing by retaining the latest email per Xero link, while letting through non-Xero (pure attachment) messages.
- Attachment/PDF branch mirrors the Xero-only workflow: `List Attachments` → `Only PDFs` → `Read PDF (attach)` → LangChain OpenAI extraction.
- `Compute Xero Link` + `HTTP Request` + `Read PDF (xero)` fetch invoices referenced by links.
- `Normalize Entities (pdf)` rewrites supplier/customer names for ATO and ASIC notices and fills gaps in `invoice_number` from payment references.
- Onedrive uploads (`Upload a file`, `Upload a file PDF attachments`) persist cleaned PDFs in folder `015B23OEWATWVPW3ZR3ZDYQVBEYCUAYKUS`.
- `flatten + tidy` nodes shape the AI output into the expected schema before rows are appended.

## Outputs & Contracts
- **Primary destination:** `Invoice Register.xlsx`
  - Sheet `Taxcellent`, Table `Table5` (`Append to Excel (Graph)`).
  - Captures supplier/customer details, invoice identifiers, due dates, totals, banking instructions, message metadata, OneDrive file references.
- **Secondary destination:** For link-derived records, `Append to Excel (Graph)1` also writes to sheet `Xero only`/`Table4` to keep the consolidated view up to date.
- **Binary artifacts:** PDFs archived to the finance OneDrive; downstream nodes expose `file_id`, `file_url`, `folder_path`.
- **Source tagging:** Each record carries `source = 'taxcellent_email'` (with derived identifiers for ATO/ASIC variants) so analytics can isolate this feed.
- Target freshness matches scheduler frequency (≤3 hours). Downstream consumers should tolerate duplicates prevented by `message_id`/`xero_link`.

## Operational Notes
- Same credential set as the other invoice flows:
  - `Microsoft Outlook account 2`
  - `Microsoft Excel account`
  - `Microsoft Drive account`
- CLI exports log missing `n8n-nodes-openai` packages; production relies on `@n8n/n8n-nodes-langchain.openAi`.
- Heuristics inside `Normalize Entities (pdf)` promote ATO/ASIC notices to consistent supplier labels—adjust with caution to avoid breaking Taxcellent reporting.

## Coverage & Reconciliation Enhancements

### 1. Backfill Plan (30-Day Window)
- Introduce a `Set → window_start` code node ahead of `Get recent messages` that emits `now.minus({ days: 30 })`. Point the Outlook node at that timestamp instead of the fixed 6h offset during controlled backfills.
- Execute the workflow manually with:
  1. `window_start = now - 30d` (full historical sweep).
  2. `window_start = now - 7d` (sanity check for dedupe + rate limits).
- After each run, export the execution summary JSON and commit it under `docs/n8n-workflows/exports/execution-logs/` for traceability.

### 2. Missing-Data Detection
- **Excel sheet audit:** Use Power Query or Excel filters on `Sheet: Taxcellent` to confirm every date in the last 30 days has at least one entry (or a documented zero-activity day). Highlight gaps in red and record them in the data-quality log.
- **Supabase query:** leverage the live dataset:
  ```sql
  select
    invoice_date,
    count(*) as row_count,
    sum(total) as gross_total
  from invoice
  where source = 'taxcellent_email'
    and invoice_date >= current_date - interval '30 days'
  group by invoice_date
  order by invoice_date;
  ```
  - Cross-check totals against Excel pivot tables; discrepancies >$5 require investigation.
- Create a lightweight `n8n` workflow that runs nightly to alert on any dates missing records (post-Supabase integration).

### 3. Supabase / Excel Hardening
- Confirm the existing Supabase upsert captures `source = 'taxcellent_email'`, `xero_link`, `file_checksum`, and feeds the returned `supabase_id` into downstream nodes.
- Validate that Excel tables (`Taxcellent` + consolidated `Xero only`) persist the Supabase ID by comparing a recent invoice row between Excel and Supabase.
- Review the conflict-handling branch to ensure 409 responses merge updates correctly; log summaries in `email_ingest_log` for visibility.
- Document any heuristics that adjust invoice numbers (e.g., derived keys for ATO/ASIC) so reconciliation scripts can mirror the same logic.

### 4. Deployment Checklist
- Secrets: ensure the shared `Supabase Finance REST` credential remains valid; rotate alongside Outlook/Graph secrets.
- Monitoring: extend the Supabase dashboard to track `source = 'taxcellent_email'` separately; set alert thresholds for sudden drops.
- Rollback: keep the current workflow export in version control so production can revert to this known-good Supabase-integrated version if needed.
