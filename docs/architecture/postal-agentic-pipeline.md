# Postal Invoice Agentic Pipeline – Architecture Snapshot

## Overview
Goal: replace the cron-based postal workflow with an event-driven pipeline that reacts instantly to new OneDrive uploads (and future dashboard file drops) while inserting structured rows directly into Supabase.

```
┌───────────┐       ┌──────────────┐       ┌───────────┐       ┌──────────────┐
│ OneDrive  │  ---> │ Graph Webhook│ --->  │ Job Queue │ --->  │ Processing   │
│ (Postal   │       │ Listener API │       │  (Supabase│       │ Agent Worker │
│ Invoices) │       │ (Next.js)    │       │  table)   │       │  (Node/Py)   │
└───────────┘       └──────────────┘       └───────────┘       └──────────────┘
                                                                    │
                                                                    ▼
                           ┌─────────────────────────────┐   ┌──────────────────────┐
                           │ Invoice Supabase Table      │   │ Postal Ingest Log    │
                           │ (source = 'postal_agent')   │   │ (status, confidence) │
                           └─────────────────────────────┘   └──────────────────────┘
```

## Workstream Progress
- ✅ Postal vision blueprint rewritten to use OpenAI (docs/n8n-workflows/postal-invoice-ocr.md).
- ✅ Sample postal PDF collected for prompt tuning.
- ✅ Agentic architecture drafted (this document).
- ☑ Graph webhook listener spec + API contract.
- ☑ Job Queue schema (`postal_jobs`) with state machine.
- ☑ Worker design (OpenAI vision call, validation, Supabase upsert).
- ☐ Implementation + unit/integration tests.
- ☐ Dashboard telemetry view / upload tab.

## Component Notes
### 1. Graph Webhook Listener (Next.js API route)
- Exposed endpoint: `POST /api/oneDrive/postal-hook`.
- Validates Microsoft Graph signature + subscription.
- Normalises payload to `{ fileId, driveId, path, createdDateTime }`.
- Inserts job row into Supabase `postal_jobs` with state `pending`.
- Handles subscription renewal (Graph webhook expires ~3 days).

### 2. Supabase Job Queue
- Table `postal_jobs`
  - `id uuid` (PK)
  - `file_id`, `drive_id`, `file_path`
  - `status` (`pending`, `processing`, `success`, `failed`, `retry_scheduled`)
  - `attempts int`
  - `error_message text`
  - `created_at`, `updated_at`
- Index on `status` for consumer polling.
- Scheduled cleanup (jobs > 30 days old) to keep table lean.

### 3. Processing Agent Worker
- Node.js service (could run in Lightsail or serverless cron).
- Polls queue: `select * from postal_jobs where status='pending' order by created_at limit 10 for update skip locked`.
- Workflow per job:
  1. Fetch file binary via Microsoft Graph `driveItem/{id}/content`.
  2. Upload to OpenAI `files` endpoint (`purpose=vision`).
  3. Call `responses.create` with structured prompt (JSON schema).
  4. Validate output (ABN regex, GST math, banking formats).
  5. On success:
     - Generate/retain a read-only sharing link via Graph (`createLink`) and capture `file_url`.
     - Move/copy the binary into the archive hierarchy used by other workflows (e.g. `/Invoice_Attachments/YYYY-MM-DD/`), returning `folder_path`, `file_id`, `folder_id`.
     - Upsert into `Invoice` with `source='postal_agent'`, `file_checksum`, `ocr_confidence`, `ocr_model`, plus the SharePoint metadata (`file_url`, `folder_path`, `file_id`, `folder_id`).
     - Insert record into `postal_ingest_log`.
     - Mark job `success`.
  6. On failure:
     - Increment attempts; if <3, reschedule with exponential delay.
     - If ≥3, mark `failed` and push entry into `postal_invoice_exceptions`.
- Observability: emit structured log to Supabase (or CloudWatch) with job ID + outcome.

### 4. Dashboard Integration
- New view: `Postal Intake` showing queue statuses, recent successes, flagged invoices.
- Upload tab (future): exposes `/api/postal/upload`, stores file (Supabase Storage), enqueues job identical to webhook path.

## Immediate Next Steps
1. Finalise Graph webhook listener spec (endpoint contract, auth, queue insertion).
2. Define Supabase schemas (`postal_jobs`, `postal_ingest_log`, `postal_invoice_exceptions`).
3. Draft worker specification with OpenAI JSON schema prompt and validation heuristics.
4. Kick off agent pipeline to implement:
   - Step 1/2 (spec/tests) for listener & queue (Day 1).
   - Step 3/4 (worker build) (Day 2–3).
   - Step 5 (dashboard telemetry + upload UI) (Day 4–5).
