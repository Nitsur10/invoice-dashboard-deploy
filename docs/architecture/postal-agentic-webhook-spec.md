# Postal Agentic Pipeline – Webhook & Queue Specification

## Graph Webhook Listener

### Endpoint
- **Method:** `POST /api/postal-inbox/onedrive-hook`
- **Hosted in:** Next.js API route (or Supabase Edge Function)
- **Authentication:** Microsoft Graph provides `validationToken` for initial handshake and signs subsequent notifications; we verify via expected tenant ID + app ID.
- **Renewal:** Graph webhook subscriptions expire every 2–3 days; add `PATCH /api/postal-inbox/renew-subscription` utility or cron.

### Handshake
- When Graph calls the endpoint with a `validationToken`, respond `200 OK` with the token in the body.

### Payload Handling
1. Validate signature (if using signed notifications) or at minimum check that `tenantId` matches our Microsoft 365 tenant.
2. Extract `resourceData` object per notification: includes `driveId`, `itemId`, and `resource` path.
3. Build job payload:
   ```json
   {
     "drive_id": "...",
     "file_id": "...",
     "parent_reference": "...",
     "path": "...",
     "change_type": "created",
     "received_at": "... iso8601 ..."
   }
   ```
4. Upsert into `postal_jobs` with status `pending` unless a pending job with same file checksum already exists.

### Error Handling
- If queue insert fails (e.g., DB unavailable), return 500 so Graph retries.
- Log webhook receipt + job ID into `postal_ingest_log` with status `webhook_received`.

## Supabase Job Queue Schema

### Table: `postal_jobs`
| Column          | Type              | Notes                                           |
|-----------------|-------------------|-------------------------------------------------|
| `id`            | uuid (PK)         | `default uuid_generate_v4()`                    |
| `drive_id`      | text              | Microsoft Graph drive ID                        |
| `file_id`       | text              | Item ID (used to fetch binary)                  |
| `file_path`     | text              | `/Rudra Projects/.../filename.pdf`              |
| `file_checksum` | text              | SHA-256 (optional; computed later)              |
| `status`        | text              | Enum: `pending`, `processing`, `success`, `failed`, `retry_scheduled` |
| `attempts`      | int               | Incremented per processing attempt              |
| `error_message` | text              | Last error/traces                               |
| `payload`       | jsonb             | Original webhook payload for debugging          |
| `scheduled_at`  | timestamptz       | If retry, schedule future processing            |
| `created_at`    | timestamptz       | default `now()`                                 |
| `updated_at`    | timestamptz       | default `now()` via trigger                     |

Indexes:
- `CREATE INDEX ON postal_jobs (status, scheduled_at);`
- Unique constraint on `(drive_id, file_id)` to avoid duplicate jobs for same file.

### Table: `postal_ingest_log`
| Column          | Type        | Notes                                      |
|-----------------|-------------|--------------------------------------------|
| `id`            | uuid (PK)   |                                            |
| `job_id`        | uuid        | FK → `postal_jobs.id`                      |
| `file_path`     | text        |                                            |
| `status`        | text        | `webhook_received`, `processing`, `supabase_upserted`, `exception`, etc. |
| `details`       | jsonb       | Key-value info (confidence, totals, etc.)  |
| `created_at`    | timestamptz |                                            |

### Table: `postal_invoice_exceptions`
| Column          | Type        | Notes                                              |
|-----------------|-------------|----------------------------------------------------|
| `id`            | uuid (PK)   |                                                    |
| `job_id`        | uuid        | FK → `postal_jobs.id`                              |
| `file_path`     | text        |                                                    |
| `reason`        | text        | e.g., `missing_total`, `low_confidence`            |
| `model_output`  | jsonb       | Raw OpenAI JSON for review                         |
| `created_at`    | timestamptz |                                                    |

## Processing Sequence

1. Webhook inserts row into `postal_jobs`:
   ```sql
   INSERT INTO postal_jobs (drive_id, file_id, file_path, status, attempts, payload)
   VALUES (..., 'pending', 0, payload)
   ON CONFLICT (drive_id, file_id) DO UPDATE SET status='pending', scheduled_at=now();
   ```

2. Worker selects jobs:
   ```sql
   UPDATE postal_jobs
   SET status='processing', updated_at=now()
   WHERE id = (
     SELECT id FROM postal_jobs
     WHERE status='pending'
       AND (scheduled_at IS NULL OR scheduled_at <= now())
     ORDER BY created_at
     FOR UPDATE SKIP LOCKED
     LIMIT 1
   )
   RETURNING *;
   ```

3. After processing:
   - On success: `status='success'`, set checksum, store invoice metadata (including `file_url`, `file_id`, `folder_path`, `folder_id`), insert `postal_ingest_log` entry, move/copy file into archive folder.
   - On retry: increment `attempts`, set `status='retry_scheduled'`, compute `scheduled_at=now()+interval '5 minutes'*(2^attempts)`.
   - On final failure: `status='failed'`, insert into `postal_invoice_exceptions`.

## Dashboard Hooks
- Views/Materialised view summarising:
  - Jobs by status (pending, processing, failed).
  - Recent successes with invoice numbers, totals, confidence.
  - Exception queue with reason and link to OneDrive file.
