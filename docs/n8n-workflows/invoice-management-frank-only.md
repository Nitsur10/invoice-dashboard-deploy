# Invoice Management – Frank Only (`fEAs3LZr0lMDWziF`)

## Overview
Automates ingestion of invoices from Frank at FBCS Construction. The workflow polls the finance mailbox, filters Frank’s invoice emails, extracts structured data from attachments or Xero links using OpenAI, archives the cleaned PDFs to OneDrive, and posts the results into the Frank worksheet of `Invoice Register.xlsx` (plus a consolidated Xero sheet) for the Invoice Dashboard.

- **Export:** `docs/n8n-workflows/exports/wf-fEAs3LZr0lMDWziF.json`
- **Last updated (n8n):** 2025-09-07T09:51:58Z

## Trigger
- `Schedule` trigger fires every 3 hours with a 6-hour lookback window.
- Source mailbox accessed through **Microsoft Outlook account 2**.

## Inputs
- Outlook filter: sender `frank@fbcs.com.au`, `subject` contains `Invoice`, attachments required.
- Retrieves the message body, attachment metadata, and identifiers to support dedupe and auditing.

## Process Highlights
- `Deduplicate` node collapses duplicate Xero links while letting attachment-only messages through.
- `Has Attachments?` + `drop non-invoice PDFs, keep invoices` ensure only genuine invoice files progress.
- Attachment branch: `Read PDF (attach)` → LangChain OpenAI extraction → `flatten + tidy pdf`.
- Link branch: `Compute Xero Link` → `HTTP Request` → `Read PDF (xero)` → OpenAI extraction → `flatten + tidy`.
- PDFs are uploaded to the finance OneDrive folder (`parentId 015B23OEWATWVPW3ZR3ZDYQVBEYCUAYKUS`) via `Upload a file` nodes.
- `Filter` safeguards against rows missing the resolved Xero link, preventing partial records.
- `Route Fallback` feeds any message that still lacks a usable PDF into the link/Xero branch; `No Xero Link (log)` now also stamps a manual placeholder row (flagged `source = manual_fallback`) so invoices without a retrievable PDF/Xero link still land in Excel for human follow-up.

## Outputs & Contracts
- **Primary destination:** `Invoice Register.xlsx`
  - Sheet `Frank`, Table `Table2` (`Append to Excel (Graph)`).
  - Data contract mirrors other invoice flows (supplier/customer info, invoice numbers, totals, banking details, message metadata, OneDrive references).
- **Secondary destination:** `Append to Excel (Graph)1` writes the same record into the consolidated `Xero only` sheet/Table4.
- **Binary artifacts:** Archived PDFs available via the stored OneDrive IDs/URLs. Downstream ETL should use the `message_id` and `xero_link` fields as natural keys.
- **Source tagging:** Records are stamped with `source = 'frank_email'` (or `manual_fallback` when applicable) so finance can segment Frank invoices from Xero-only traffic.

## Operational Notes
- Credentials reused:
  - `Microsoft Outlook account 2`
  - `Microsoft Excel account`
  - `Microsoft Drive account`
- CLI export logs warnings about missing `n8n-nodes-openai` packages; runtime depends on the built-in LangChain OpenAI nodes.
- Filtering heuristics in `drop non-invoice PDFs, keep invoices` drop remittance/statement emails—review before expanding coverage to other Frank communications.
- 2025-10-16 n8n encryption key rotation invalidated all stored secrets; re-save Outlook, Excel, Drive, and OpenAI credentials whenever the instance key changes.

## Recovery Playbook — Oct 2025 Credential Rotation
1. Open each credential referenced in the workflow (`Microsoft Outlook account 2`, `Microsoft Drive account`, `Microsoft Excel account`, `OpenAI Chat Model`, `OpenAI Chat Model1`) and click **Reconnect/Save** so they are encrypted with the new instance key. (Completed 2025-10-19.)
2. Run the workflow manually with a widened window (e.g. set `Get Recent Messages` filter to 30 days or temporarily replace the `Schedule` trigger) to backfill invoices received since 2025-09-15. Confirm the `Append to Excel (Graph)` nodes append non-zero items to the `Frank` and `Xero only` tables; anything that still lacks a PDF or resolvable Xero link remains flagged with `fallback_from_attachments: true` in the execution log for manual follow-up.
3. Re-enable the `Schedule` trigger (3-hour cadence) once the backfill succeeds and monitor the next executions for `status: success`.
4. Keep the debug clone disabled until credentials remain stable—its runs fail the same way and add no new coverage.

## Coverage & Reconciliation Enhancements

### 1. Manual Backfill Procedure
- Introduce a `Set → window_start` function node ahead of `Get recent messages` to calculate `new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()`.
- Pause the Schedule trigger, run a manual execution with the widened window, and monitor the Outlook API limits (Frank sends bursts; expect ~400 messages for 30 days).
- After the 30-day replay, run a second pass with `window_start = now - 48h` to validate dedupe logic and confirm the workflow settles back to the normal cadence.
- Export both execution logs and commit them under `docs/n8n-workflows/exports/execution-logs/`.

### 2. Data-Miss Detection
- **Excel audit:** In `Invoice Register.xlsx` filter the `Frank` sheet for `invoice_date >= today()-30` and build a pivot counting invoices per day. Mark dates with `count = 0` and validate that Outlook truly had no invoice mail that day.
- **Supabase audit:**
  ```sql
  select
    invoice_date,
    count(*) filter (where source = 'frank_email') as frank_rows,
    count(*) filter (where source = 'xero_only') as consolidated_rows
  from invoice
  where invoice_date >= current_date - interval '30 days'
  group by invoice_date
  order by invoice_date;
  ```
  - Compare `frank_rows` with the Excel pivot; `consolidated_rows` should remain in sync with the `Xero only` sheet.
- Create a lightweight Supabase view `invoice_daily_counts` and surface it on the finance dashboard for continuous monitoring.

### 3. Supabase / Excel Hardening
- Confirm the live Supabase upsert populates `source = 'frank_email'`, `fallback_from_attachments`, and generates a deterministic `invoice_number` for fallback rows (e.g., `FRANK-{message_id}`).
- Verify `supabase_id` lands in both the `Frank` sheet and the consolidated `Xero only` sheet by matching recent records across systems.
- Review `email_ingest_log` entries to ensure error routing is active; expand alerting so consecutive failures page the finance ops channel.
- Document the fallback ID strategy in the repository so downstream analytics can reproduce it when joining datasets.

### 4. Rollout Checklist
- Secrets: keep the shared `Supabase Finance REST` credential aligned with other secret rotations.
- QA: run the workflow in **test mode** against the cloned workbook to ensure Excel + Supabase stay consistent after any changes.
- Monitoring: configure Supabase Logflare alert for 4xx errors on the `invoice` endpoint scoped to `source = 'frank_email'`.
- Rollback: capture fresh exports after substantive edits so the Supabase-enabled configuration is recoverable.
