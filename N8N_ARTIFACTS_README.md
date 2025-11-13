# N8N Invoice Pipeline Artifacts

This repository contains the **complete N8N invoice ingestion pipeline** documentation and tooling that feeds data into the Invoice Dashboard.

## 🎯 Purpose

**Preserve the entire invoice data pipeline** for future reference, disaster recovery, and knowledge transfer. These artifacts document how invoices flow from various sources (email, postal, Excel) into Supabase, where the dashboard consumes them.

## 📁 Directory Structure

```
invoice-dashboard-deploy/
│
├── 📄 N8N_INVOICE_PIPELINE.md          ← START HERE - Architecture overview
├── 📄 POSTAL_MIGRATION_README.md       ← Postal invoice migration guide
│
├── 📁 docs/
│   ├── n8n-workflows/                  ← N8N workflow documentation
│   │   ├── README.md                   ← Workflow catalog (all active flows)
│   │   ├── invoice-dataset-schema.md   ← Data contract for Invoice table
│   │   ├── postal-invoice-ocr.md       ← Postal OCR workflow spec
│   │   ├── invoice-management-frank-only.md
│   │   ├── zara-invoice-management-v20-xero-only.md
│   │   ├── zara-invoice-management-v20-taxcellent.md
│   │   └── exports/                    ← N8N JSON workflow exports
│   │       ├── wf-wzR6HlmIjTuvfyfj.json  (Xero workflow)
│   │       ├── wf-ZZcktTuP2fFegZ26.json  (Taxcellent workflow)
│   │       └── wf-fEAs3LZr0lMDWziF.json  (Frank workflow)
│   │
│   └── architecture/                   ← Advanced pipeline designs
│       ├── postal-agentic-pipeline.md
│       ├── postal-agent-worker-spec.md
│       └── postal-agentic-webhook-spec.md
│
├── 📁 scripts/                         ← Migration & processing scripts
│   ├── POSTAL_SCRIPTS_README.md        ← Script usage reference
│   ├── migrate-postal-to-supabase.ts   ← Excel → Supabase migration
│   ├── analyze-postal-excel.mjs        ← Excel analysis tool
│   ├── dedupe-postal-excel.mjs         ← Deduplication tool
│   ├── validate-supabase-schema.ts     ← Schema validator
│   ├── reconcile-onedrive-postal.mjs   ← OneDrive reconciliation
│   ├── cleanup-postal-onedrive.mjs     ← OneDrive cleanup
│   ├── postal-ocr.ts                   ← Standalone OCR processor
│   ├── list-invoice-attachments.mjs    ← Attachment lister
│   ├── list-onedrive-folders.mjs       ← Folder browser
│   ├── setup-env-from-workflows.mjs    ← Extract env vars from N8N
│   └── validate-postal-migration.sql   ← SQL validation queries
│
├── 📁 migrations/                      ← Database migrations
│   └── postal-invoice-schema.sql       ← Postal-specific columns
│
├── 📁 workflows/                       ← N8N workflow backups
│   ├── postal-ocr-workflow.json        ← Postal OCR flow
│   └── postal-cleanup.workflow.json    ← Cleanup automation
│
├── 📁 reports/                         ← Migration reports & guides
│   ├── POSTAL_MIGRATION_GUIDE.md       ← Step-by-step execution guide
│   ├── POSTAL_MIGRATION_SUMMARY.md     ← Implementation summary
│   ├── IMPLEMENTATION_COMPLETE.md      ← Delivery checklist
│   ├── ENVIRONMENT_VARIABLES_TEMPLATE.md ← Configuration template
│   ├── FINAL_MIGRATION_REPORT.md       ← Migration results
│   ├── MIGRATION_STATUS_SUMMARY.md     ← Status overview
│   ├── COMPLETE_ACCOUNTABILITY_SUMMARY.md
│   ├── POSTAL_INVOICES_CLIENT_REVIEW.md
│   ├── ONEDRIVE_RECONCILIATION_CLIENT_REPORT.md
│   ├── QUICK_STATUS.md
│   ├── onedrive-cleanup-status.md
│   └── [execution logs excluded from git]
│
└── 📁 agents/                          ← Multi-agent orchestration (separate)
    └── [agent coordinator for dashboard features]
```

## 🚀 Quick Start

### 1. Understand the Architecture

Read **[N8N_INVOICE_PIPELINE.md](N8N_INVOICE_PIPELINE.md)** to understand:
- How invoices flow from sources → N8N → Supabase → Dashboard
- N8N production environment (Lightsail)
- Active workflows and data schema
- Dashboard integration (read-only, decoupled)

### 2. Review Active Workflows

See **[docs/n8n-workflows/README.md](docs/n8n-workflows/README.md)** for:
- Catalog of all production workflows
- N8N workflow exports (JSON)
- Data contracts and field mappings
- Trigger schedules and outputs

### 3. Run Migration Scripts (If Needed)

See **[scripts/POSTAL_SCRIPTS_README.md](scripts/POSTAL_SCRIPTS_README.md)** for:
- Script usage and options
- Dry-run safety features
- Report generation
- Rollback procedures

### 4. Execute Postal Migration (If Needed)

See **[POSTAL_MIGRATION_README.md](POSTAL_MIGRATION_README.md)** for:
- Step-by-step migration guide
- Environment configuration
- Phase-by-phase execution
- Validation and testing

## 📊 What's Included

### ✅ Committed to Git

**Documentation (Markdown):**
- Architecture overviews
- Workflow specifications
- Migration guides
- Script usage references
- Client reports and summaries

**Scripts (TypeScript/JavaScript):**
- Migration tools
- Analysis utilities
- Validation scripts
- Reconciliation tools

**SQL Migrations:**
- Schema updates
- Validation queries

**N8N Workflow Exports (JSON):**
- Production workflow definitions
- Backup/restore capability

### ❌ Excluded from Git (Too Large)

**Binary Files:**
- `*.sqlite` - N8N local database (2.5GB)
- `*.xlsx` - Excel data snapshots (60MB+)
- `data/` - Temporary data directory

**Execution Logs:**
- `execution-*.json` - N8N execution dumps (100MB+ each)
- `postal-migration-*.json` - Migration run logs
- `postal-excel-*.json` - Excel export snapshots
- `supabase-schema-validation-*.json` - Validation dumps

**See `.gitignore`** for complete exclusion list.

## 🔑 Key Files by Use Case

### "I need to restore N8N workflows"
→ **`docs/n8n-workflows/exports/*.json`** - Import into N8N UI

### "I need to migrate postal invoices"
→ **`POSTAL_MIGRATION_README.md`** - Complete guide
→ **`scripts/migrate-postal-to-supabase.ts`** - Main migration script

### "I need to understand the data schema"
→ **`docs/n8n-workflows/invoice-dataset-schema.md`** - Data contract
→ **`migrations/postal-invoice-schema.sql`** - SQL schema

### "I need to set up environment variables"
→ **`reports/ENVIRONMENT_VARIABLES_TEMPLATE.md`** - Config template
→ **`.env.local`** (not in git) - Your actual credentials

### "I need to debug a workflow"
→ **`docs/n8n-workflows/{workflow-name}.md`** - Workflow documentation
→ **N8N UI**: `https://13-54-176-108.nip.io` - Live debugging

### "I need to validate Supabase data"
→ **`scripts/validate-supabase-schema.ts`** - Schema validator
→ **`scripts/validate-postal-migration.sql`** - SQL queries

## 🔄 Data Flow Summary

```
SOURCES (Email, Postal, Excel)
  ↓
N8N WORKFLOWS (Lightsail instance)
  • Parse & extract
  • Deduplicate
  • Validate
  • OCR (if needed)
  ↓
SUPABASE (PostgreSQL)
  • Invoice table
  • audit_log table
  • postal_ingest_log table
  ↓
DASHBOARD (This Repo → Vercel)
  • Read-only views
  • Stats & charts
  • Kanban board
  • Invoice table
```

**Key Point:** The dashboard is **completely decoupled** from N8N. It only reads from Supabase. Changes to N8N workflows or migration scripts do NOT affect the dashboard deployment.

## 🛡️ Safety & Best Practices

### Before Running Scripts

1. **Always use `--dry-run` first**
   ```bash
   tsx scripts/migrate-postal-to-supabase.ts --dry-run
   ```

2. **Check environment variables**
   ```bash
   cat .env.local | grep -E "SUPABASE|AZURE|EXCEL"
   ```

3. **Validate Supabase schema**
   ```bash
   tsx scripts/validate-supabase-schema.ts
   ```

4. **Review reports from previous runs**
   ```bash
   ls -lt reports/*.json | head -5
   ```

### During Execution

- Monitor progress logs
- Check JSON reports in `reports/`
- Verify row counts in Supabase
- Review error messages carefully

### After Execution

- Run validation SQL queries
- Compare record counts (Excel vs Supabase)
- Test dashboard to verify data appears
- Document any issues in reports

## 🔧 Environment Setup

### Required Environment Variables

```bash
# Azure/Microsoft Graph
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=

# Excel/OneDrive
EXCEL_DRIVE_ID=
EXCEL_WORKBOOK_ID=
EXCEL_POSTAL_WORKSHEET=
POSTAL_ONEDRIVE_DRIVE_ID=
POSTAL_ONEDRIVE_FOLDER_ID=
POSTAL_ONEDRIVE_PENDING_FOLDER_ID=
POSTAL_ONEDRIVE_ARCHIVE_FOLDER_ID=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_INVOICES_TABLE=

# OpenAI (for OCR)
OPENAI_API_KEY=
OPENAI_VISION_MODEL=
```

**See:** `reports/ENVIRONMENT_VARIABLES_TEMPLATE.md` for details

### Dependencies

```bash
# Install dependencies
npm install

# TypeScript execution (for .ts scripts)
npm install -g tsx

# Or use npx
npx tsx scripts/migrate-postal-to-supabase.ts
```

## 📖 Documentation Index

| Document | Purpose | Audience |
|----------|---------|----------|
| [N8N_INVOICE_PIPELINE.md](N8N_INVOICE_PIPELINE.md) | Architecture overview | Developers, architects |
| [POSTAL_MIGRATION_README.md](POSTAL_MIGRATION_README.md) | Migration execution guide | Operations team |
| [docs/n8n-workflows/README.md](docs/n8n-workflows/README.md) | Workflow catalog | N8N maintainers |
| [scripts/POSTAL_SCRIPTS_README.md](scripts/POSTAL_SCRIPTS_README.md) | Script usage | Developers |
| [reports/POSTAL_MIGRATION_GUIDE.md](reports/POSTAL_MIGRATION_GUIDE.md) | Detailed migration steps | Operations |
| [docs/n8n-workflows/invoice-dataset-schema.md](docs/n8n-workflows/invoice-dataset-schema.md) | Data contract | Developers, analysts |

## ⚠️ Important Notes

### Dashboard Deployment (Vercel)

**These N8N artifacts do NOT affect Vercel deployment:**
- Vercel builds from `src/`, `public/`, Next.js config files
- N8N scripts/workflows are NOT included in build
- Dashboard reads data from Supabase (doesn't care about N8N)

**You can safely commit N8N docs without breaking the dashboard.**

### N8N Production Instance

**Do NOT modify the production N8N instance without:**
1. Exporting current workflows as backup
2. Testing changes in development
3. Documenting changes in `docs/n8n-workflows/`
4. Updating workflow exports in git

### Data Privacy

**Do NOT commit:**
- Actual invoice data (Excel files with real data)
- API keys or credentials
- SQLite database files
- Large execution logs
- Client-specific information

**These are already excluded via `.gitignore`**

## 🐛 Troubleshooting

### "Script fails with 'ENOENT: no such file'"
→ Check environment variables are set correctly
→ Verify OneDrive folder IDs match actual folders

### "Supabase connection refused"
→ Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
→ Test connection: `tsx scripts/validate-supabase-schema.ts`

### "Duplicate key error in Supabase"
→ Run deduplication: `node scripts/dedupe-postal-excel.mjs`
→ Check `file_checksum` uniqueness

### "OCR confidence too low"
→ Improve PDF quality (higher resolution scan)
→ Manually review low-confidence invoices
→ Adjust confidence threshold in script

### "Excel file locked"
→ Close Excel if file is open
→ Check SharePoint permissions
→ Retry after a few minutes

## 📞 Support

**For N8N Issues:**
- Check N8N UI: `https://13-54-176-108.nip.io`
- SSH to Lightsail: `ssh -i ~/.ssh/lightsail_n8n.pem ubuntu@13.54.176.108`
- Docker logs: `docker logs -f n8n`

**For Dashboard Issues:**
- Check GitHub issues in this repo
- Review Vercel deployment logs
- Test Supabase connection

**For Data Issues:**
- Review validation SQL queries
- Check N8N execution logs
- Reconcile Excel vs Supabase counts

## 🔄 Future Enhancements

**Planned Improvements:**
- [ ] Real-time webhook ingestion (replace polling)
- [ ] ML-based duplicate detection
- [ ] Automated reconciliation dashboard
- [ ] Multi-currency support
- [ ] Advanced OCR confidence tuning
- [ ] Workflow versioning system
- [ ] Error alerting via Slack/email
- [ ] Performance monitoring

## 📝 Maintenance

### When to Update This Documentation

- ✅ After deploying new N8N workflows
- ✅ After schema changes to `Invoice` table
- ✅ After adding new migration scripts
- ✅ After major pipeline architecture changes
- ✅ When environment variables change

### How to Update

1. Update relevant markdown files
2. Export updated N8N workflows to `docs/n8n-workflows/exports/`
3. Update `docs/n8n-workflows/README.md` catalog
4. Commit with descriptive message
5. Test scripts still work after changes

## 📚 Related Documentation

- **[Dashboard README](README.md)** - Next.js dashboard documentation
- **[Dashboard CLAUDE.md](CLAUDE.md)** - Development guidelines
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[.gitignore](.gitignore)** - Excluded files

---

**Last Updated:** 2025-11-09
**N8N Version:** 1.115.3
**Supabase Project:** `auvyyrfbmlfsmmpjnaoc`
**Lightsail Instance:** `13.54.176.108`

**Questions?** Review the main architecture doc: [N8N_INVOICE_PIPELINE.md](N8N_INVOICE_PIPELINE.md)
