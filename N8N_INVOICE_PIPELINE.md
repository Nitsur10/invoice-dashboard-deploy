# N8N Invoice Ingestion Pipeline

## Overview

The Invoice Dashboard displays data collected through a **multi-source N8N pipeline** that runs on an AWS Lightsail instance. This pipeline processes invoices from various sources (email, postal, Excel) and loads them into Supabase, where the Next.js dashboard consumes them in real-time.

**Key Separation of Concerns:**
- **N8N Pipeline** → Data ingestion, processing, and Supabase storage
- **Dashboard (This Repo)** → Read-only visualization of Supabase data
- **No Direct Coupling** → Dashboard works with any data in Supabase, regardless of source

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      INVOICE SOURCES                                 │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │  Email  │          │  Postal │          │  Excel  │
    │ (Xero,  │          │ (OneDrive│          │SharePoint│
    │  Frank, │          │   OCR)  │          │ Register)│
    │Taxcellent│          │         │          │         │
    └────┬────┘          └────┬────┘          └────┬────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   N8N PIPELINE     │
                    │  (Lightsail)       │
                    │  v1.115.3          │
                    │                    │
                    │  • Parse emails    │
                    │  • OCR documents   │
                    │  • Deduplicate     │
                    │  • Validate        │
                    │  • Enrich          │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │    SUPABASE        │
                    │   PostgreSQL       │
                    │                    │
                    │  Tables:           │
                    │  • Invoice         │
                    │  • audit_log       │
                    │  • postal_ingest_  │
                    │    log             │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  NEXT.JS DASHBOARD │
                    │  (This Repo)       │
                    │  → Vercel          │
                    │                    │
                    │  Read-only views:  │
                    │  • Stats cards     │
                    │  • Invoice table   │
                    │  • Analytics       │
                    │  • Kanban board    │
                    └────────────────────┘
```

## N8N Production Environment

**AWS Lightsail Instance:**
- Host: `ubuntu@13.54.176.108`
- SSH: `ssh -i ~/.ssh/lightsail_n8n.pem ubuntu@13.54.176.108`
- N8N URL: `https://13-54-176-108.nip.io`
- Version: `1.115.3`
- Container: Docker (n8n)
- Storage: `/home/ubuntu/n8n-hub/data`
- Database: SQLite (2.7GB local to N8N)

**Active Workflows:**
1. **Xero Invoice Management** (`wf-wzR6HlmIjTuvfyfj`)
2. **Taxcellent Invoice Management** (`wf-ZZcktTuP2fFegZ26`)
3. **Frank/FBCS Invoice Management** (`wf-fEAs3LZr0lMDWziF`)
4. **Postal Invoice OCR** (`pt8Wc5cH85tRPtvU`) - Planned
5. **ZARA Email Automation V1.3.2** (`tkQhi81f24yhshdW`)

## Data Flow

### 1. Email-Based Invoice Ingestion

**Sources:**
- **Xero Reminder Emails** → Contains invoice links
- **Taxcellent Payment Reminders** → ATO/ASIC payments
- **Frank/FBCS Invoices** → Construction invoices

**Process:**
```
Email arrives (Outlook/Gmail)
  → N8N polls every 3 hours
  → Parse email body/attachments
  → Extract invoice data (vendor, amount, date, etc.)
  → Download PDF attachments
  → Archive to OneDrive
  → Insert into Supabase `Invoice` table
  → Update Excel `Invoice Register.xlsx`
  → Mark email as processed
```

**Fields Extracted:**
- `vendor` - Supplier name
- `amount` - Invoice total
- `invoice_date` - Issue date
- `due_date` - Payment deadline
- `invoice_number` - Unique identifier
- `category` - Invoice type
- `source` - Email source (xero_email, frank_email, etc.)
- `file_url` - OneDrive archive link
- `description` - Invoice description

### 2. Postal Invoice Processing

**Source:** Physical invoices scanned and uploaded to OneDrive

**Process:**
```
PDF uploaded to OneDrive "Postal Invoices" folder
  → N8N detects new file
  → Download PDF
  → OCR via OpenAI Vision API (gpt-4o-mini)
  → Extract structured data
  → Validate required fields
  → Calculate confidence score
  → Insert into Supabase `Invoice` table
  → Update Excel "Postal Invoices" sheet
  → Move file to Archive folder
  → Log in `postal_ingest_log`
```

**OCR Data Extraction:**
- Vendor name and ABN
- Invoice number and date
- Amount (inc/ex GST)
- Line items and descriptions
- Payment terms
- Confidence score per field

### 3. Excel Synchronization

**Excel File:** `Invoice Register.xlsx` (SharePoint/OneDrive)

**Sheets:**
- `Xero only` (Table4) - Xero invoices
- `Taxcellent` (Table5) - Tax/compliance payments
- `Frank` (Table2) - FBCS construction invoices
- `Postal Invoices` - Scanned postal invoices

**Sync Pattern:**
```
N8N writes to Supabase (source of truth)
  ↓
N8N also writes to Excel (for accounting team)
  ↓
Excel changes are NOT synced back to Supabase
  ↓
Dashboard reads ONLY from Supabase
```

**Important:** Excel is for **human review/editing** but Supabase is the **dashboard data source**.

## Invoice Data Schema

**Supabase Table:** `Invoice`

**Core Fields:**
| Field | Type | Source | Required | Notes |
|-------|------|--------|----------|-------|
| `id` | UUID | Auto | ✅ | Primary key |
| `vendor` | TEXT | Extracted | ✅ | Supplier name |
| `amount` | NUMERIC | Extracted | ✅ | Invoice total |
| `invoice_date` | DATE | Extracted | ✅ | Issue date |
| `due_date` | DATE | Extracted | ❌ | Payment deadline |
| `invoice_number` | TEXT | Extracted | ❌ | Supplier's invoice # |
| `category` | TEXT | Mapped | ✅ | Invoice category |
| `status` | TEXT | Derived | ✅ | pending/paid/overdue |
| `source` | TEXT | Pipeline | ✅ | Data source identifier |
| `description` | TEXT | Extracted | ❌ | Invoice description |

**Postal-Specific Fields:**
| Field | Type | Notes |
|-------|------|-------|
| `file_name` | TEXT | Original PDF filename |
| `file_url` | TEXT | OneDrive archive URL |
| `file_checksum` | TEXT | SHA-256 hash (deduplication) |
| `ocr_confidence` | NUMERIC | 0-100 confidence score |
| `ocr_model` | TEXT | gpt-4o-mini |
| `ocr_metadata` | JSONB | Full OCR response |
| `completeness_score` | NUMERIC | Field completeness % |

**Audit Fields:**
| Field | Type | Notes |
|-------|------|-------|
| `created_at` | TIMESTAMP | Record creation |
| `updated_at` | TIMESTAMP | Last modification |
| `user_id` | UUID | RLS owner (optional) |

## Source Taxonomy

**Invoice Source Identifiers:**

| `source` Value | Description | N8N Workflow |
|---------------|-------------|--------------|
| `xero_email` | Xero reminder emails | Xero V2.0 workflow |
| `taxcellent_email` | Taxcellent payment reminders | Taxcellent V2.0 |
| `frank_email` | Frank/FBCS construction invoices | Frank workflow |
| `postal_ocr` | Scanned postal invoices (OCR) | Postal OCR workflow |
| `manual` | Manual entry via dashboard | Dashboard (future) |

This allows the dashboard to filter/group by source and trace each invoice back to its origin.

## Key N8N Scripts & Tools

### Migration Scripts

**Location:** `scripts/`

| Script | Purpose | Usage |
|--------|---------|-------|
| `migrate-postal-to-supabase.ts` | Main migration from Excel → Supabase | `tsx scripts/migrate-postal-to-supabase.ts` |
| `analyze-postal-excel.mjs` | Analyze Excel for duplicates/issues | `node scripts/analyze-postal-excel.mjs` |
| `dedupe-postal-excel.mjs` | Deduplicate Excel rows | `node scripts/dedupe-postal-excel.mjs` |
| `validate-supabase-schema.ts` | Validate Supabase schema | `tsx scripts/validate-supabase-schema.ts` |
| `reconcile-onedrive-postal.mjs` | Reconcile OneDrive files with Excel | `node scripts/reconcile-onedrive-postal.mjs` |
| `cleanup-postal-onedrive.mjs` | Clean up OneDrive folders | `node scripts/cleanup-postal-onedrive.mjs` |
| `postal-ocr.ts` | Direct OCR processing (standalone) | `tsx scripts/postal-ocr.ts` |

**All scripts support:**
- `--dry-run` flag for safe testing
- JSON report generation
- Progress logging
- Rollback procedures

### SQL Migrations

**Location:** `migrations/`

| File | Purpose |
|------|---------|
| `postal-invoice-schema.sql` | Add postal-specific columns to `Invoice` table |

**Applied via Supabase SQL Editor** (not automated migrations).

### Workflow Exports

**Location:** `workflows/`

| File | Workflow | Status |
|------|----------|--------|
| `postal-ocr-workflow.json` | Postal Invoice OCR | Planned |
| `postal-cleanup.workflow.json` | OneDrive cleanup automation | Active |

*Note: Production workflow exports are in `docs/n8n-workflows/exports/`*

## Documentation Structure

```
├── N8N_INVOICE_PIPELINE.md          ← This file (architecture overview)
├── POSTAL_MIGRATION_README.md       ← Migration execution guide
├── docs/
│   ├── n8n-workflows/
│   │   ├── README.md                ← Workflow catalog
│   │   ├── invoice-dataset-schema.md ← Data contract
│   │   ├── postal-invoice-ocr.md    ← Postal OCR spec
│   │   ├── invoice-management-frank-only.md
│   │   ├── zara-invoice-management-v20-xero-only.md
│   │   ├── zara-invoice-management-v20-taxcellent.md
│   │   └── exports/
│   │       ├── wf-wzR6HlmIjTuvfyfj.json  ← Xero workflow
│   │       ├── wf-ZZcktTuP2fFegZ26.json  ← Taxcellent workflow
│   │       └── wf-fEAs3LZr0lMDWziF.json  ← Frank workflow
│   └── architecture/
│       ├── postal-agentic-pipeline.md
│       ├── postal-agent-worker-spec.md
│       └── postal-agentic-webhook-spec.md
├── scripts/
│   ├── POSTAL_SCRIPTS_README.md     ← Script usage guide
│   └── [migration scripts...]
├── migrations/
│   └── postal-invoice-schema.sql
└── reports/
    ├── POSTAL_MIGRATION_GUIDE.md
    ├── POSTAL_MIGRATION_SUMMARY.md
    ├── IMPLEMENTATION_COMPLETE.md
    └── [execution reports - NOT in git]
```

## Environment Variables

**Required for N8N Scripts:**

### Azure/Microsoft Graph
```bash
AZURE_TENANT_ID=            # Azure AD tenant ID
AZURE_CLIENT_ID=            # Application (client) ID
AZURE_CLIENT_SECRET=        # Client secret value
```

### Excel/OneDrive
```bash
EXCEL_DRIVE_ID=             # SharePoint drive ID
EXCEL_WORKBOOK_ID=          # Invoice Register.xlsx ID
EXCEL_POSTAL_WORKSHEET=     # "Postal Invoices"

POSTAL_ONEDRIVE_DRIVE_ID=   # OneDrive drive ID
POSTAL_ONEDRIVE_FOLDER_ID=  # Postal Invoices folder
POSTAL_ONEDRIVE_PENDING_FOLDER_ID=  # Pending folder
POSTAL_ONEDRIVE_ARCHIVE_FOLDER_ID=  # Archive folder
```

### Supabase
```bash
SUPABASE_URL=               # https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=  # Service role key (server-side)
SUPABASE_INVOICES_TABLE=    # "Invoice"
```

### OpenAI (for OCR)
```bash
OPENAI_API_KEY=             # OpenAI API key
OPENAI_VISION_MODEL=        # "gpt-4o-mini"
```

**See:** `reports/ENVIRONMENT_VARIABLES_TEMPLATE.md` for complete template

## Dashboard Integration

**The Next.js dashboard is COMPLETELY DECOUPLED from N8N:**

### What the Dashboard Does
✅ Reads invoices from Supabase `Invoice` table
✅ Displays stats, charts, kanban boards
✅ Updates invoice status via API (`/api/invoices/[id]`)
✅ Filters and searches invoices
✅ Exports to CSV

### What the Dashboard Does NOT Do
❌ Does not trigger N8N workflows
❌ Does not process invoices
❌ Does not interact with Excel directly
❌ Does not perform OCR
❌ Does not archive files

**Data Flow:**
```
N8N → Supabase → Dashboard (read-only)
         ↑
Dashboard updates (status changes only)
```

### Deployment Independence

**Vercel Dashboard:**
- Builds from `src/`, `public/`, config files
- Does NOT include `scripts/`, `workflows/`, `reports/`
- Ignores N8N artifacts (`.gitignore` configured)
- Works with Supabase regardless of how data arrived

**This means:**
- You can deploy dashboard changes without touching N8N
- You can modify N8N workflows without redeploying dashboard
- You can commit N8N docs to git without breaking Vercel

## Future Enhancements

### Planned Features
- [ ] Real-time invoice ingestion (webhooks instead of polling)
- [ ] Dashboard-triggered manual OCR for postal invoices
- [ ] Bulk invoice upload UI
- [ ] Approval workflow integration (multi-step status)
- [ ] Email notifications on invoice status changes
- [ ] Advanced duplicate detection (ML-based)
- [ ] Multi-currency support
- [ ] Automated payment reconciliation

### N8N Workflow Improvements
- [ ] 30-day backfill capability with gap detection
- [ ] Supabase ↔ Excel reconciliation dashboard
- [ ] Error alerting via Slack/email
- [ ] Retry logic for transient failures
- [ ] Performance monitoring and metrics
- [ ] Workflow versioning and rollback

## Support & Troubleshooting

### N8N Instance Issues
```bash
# SSH into Lightsail
ssh -i ~/.ssh/lightsail_n8n.pem ubuntu@13.54.176.108

# Check N8N container
docker ps | grep n8n
docker logs -f n8n

# Restart N8N
docker restart n8n
```

### Workflow Debugging
1. Open N8N UI: `https://13-54-176-108.nip.io`
2. Navigate to workflow
3. Click "Executions" tab
4. Review failed executions
5. Check individual node outputs

### Supabase Connection Issues
1. Verify credentials in `.env.local`
2. Test connection: `tsx scripts/validate-supabase-schema.ts`
3. Check RLS policies in Supabase dashboard
4. Verify `Invoice` table schema matches migration

### Common Errors

**"Table 'Invoice' does not exist"**
→ Run migration: Apply `migrations/postal-invoice-schema.sql` in Supabase

**"ENOENT: no such file"**
→ Ensure OneDrive folder IDs are correct in `.env.local`

**"401 Unauthorized" from Azure**
→ Refresh Azure client secret or verify tenant ID

**"OCR confidence too low"**
→ Check PDF quality, retry with higher resolution scan

## Related Documentation

- **[Postal Migration Guide](reports/POSTAL_MIGRATION_GUIDE.md)** - Step-by-step execution
- **[N8N Workflows Catalog](docs/n8n-workflows/README.md)** - All active workflows
- **[Invoice Dataset Schema](docs/n8n-workflows/invoice-dataset-schema.md)** - Data contract
- **[Scripts README](scripts/POSTAL_SCRIPTS_README.md)** - Script usage reference
- **[Dashboard CLAUDE.md](CLAUDE.md)** - Dashboard development guide

## Key Contacts

**N8N Instance:** Lightsail (sydney region)
**Supabase Project:** `auvyyrfbmlfsmmpjnaoc`
**Vercel Project:** `invoice-dashboard-deploy`

**For Issues:**
- N8N workflows → Check Lightsail instance logs
- Dashboard bugs → GitHub issues in this repo
- Supabase schema → Apply migrations in SQL editor
- Data quality → Review N8N execution logs

---

**Last Updated:** 2025-11-09
**N8N Version:** 1.115.3
**Dashboard Version:** See `package.json`
