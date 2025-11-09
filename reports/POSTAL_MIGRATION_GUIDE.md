# Postal Invoice Migration - Execution Guide

## Overview

This guide provides step-by-step instructions for completing the postal invoice migration from Excel to Supabase. All necessary scripts have been created and are ready for execution.

## Prerequisites

### Required Environment Variables

Add the following to `.env.local`:

```bash
# Azure/Microsoft Graph (for Excel and OneDrive access)
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>

# Excel workbook
EXCEL_DRIVE_ID=<drive-id>
EXCEL_WORKBOOK_ID=<workbook-id>
EXCEL_POSTAL_WORKSHEET=Postal

# OneDrive folders
POSTAL_ONEDRIVE_DRIVE_ID=<drive-id>
POSTAL_ONEDRIVE_FOLDER_ID=<source-folder-id>
POSTAL_ONEDRIVE_PENDING_FOLDER_ID=<pending-folder-id>
POSTAL_ONEDRIVE_ARCHIVE_FOLDER_ID=<archive-folder-id>

# Supabase
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_INVOICES_TABLE=invoices
```

## Phase 1: OneDrive Cleanup (Optional but Recommended)

### Purpose
Remove duplicate files from source/pending folders that already exist in archive.

### Commands

```bash
# Dry run first to see what would be deleted
node scripts/cleanup-postal-onedrive.mjs --dry-run

# Review the output, then run for real
node scripts/cleanup-postal-onedrive.mjs
```

### Expected Output
- List of files that will be/were deleted
- Count of duplicates removed
- Files remain in archive folder

## Phase 2: Excel Analysis and Deduplication

### Step 2.1: Analyze Excel Data

```bash
# Analyze the Postal sheet for duplicates
node scripts/analyze-postal-excel.mjs
```

**Expected Output:**
- Total rows in Excel
- Number of duplicate groups
- Data quality metrics (missing fields)
- Report saved to `reports/postal-excel-analysis-YYYY-MM-DD.json`

### Step 2.2: Deduplicate Excel Data

```bash
# Dry run first to see what would be deleted
node scripts/dedupe-postal-excel.mjs --dry-run

# Review the deduplication plan, then run for real
node scripts/dedupe-postal-excel.mjs
```

**Expected Output:**
- Backup created in `reports/postal-excel-backup-YYYY-MM-DD.json`
- Deduplication plan in `reports/postal-excel-dedupe-plan-YYYY-MM-DD.json`
- Duplicate rows deleted from Excel (keeps most complete row per group)
- Execution report in `reports/postal-excel-dedupe-report-YYYY-MM-DD.json`

**Important:** The backup file can be used to restore Excel data if needed.

## Phase 3: Supabase Schema Preparation

### Step 3.1: Validate Current Schema

```bash
# Check if Supabase schema is ready
tsx scripts/validate-supabase-schema.ts
```

**Expected Output:**
- List of existing columns
- List of missing columns (if any)
- Status of postal_ingest_log table
- Validation report in `reports/supabase-schema-validation-YYYY-MM-DD.json`

### Step 3.2: Apply Schema Migrations (if needed)

If the validation script reports missing columns or tables:

1. Open Supabase SQL Editor
2. Copy the contents of `migrations/postal-invoice-schema.sql`
3. Execute the SQL script
4. Re-run the validation script to confirm

**What the migration does:**
- Adds missing columns: `source`, `file_checksum`, `file_name`, `file_url`, `ocr_confidence`, `ocr_model`, `message_id`
- Creates indexes for performance
- Creates `postal_ingest_log` table for tracking
- Sets up Row Level Security policies

## Phase 4: Data Migration

### Step 4.1: Backup Current Data

**Supabase Backup:**
1. Go to Supabase Dashboard → Database → Backups
2. Create a manual backup before proceeding
3. Note the backup timestamp

**Excel Backup:**
1. Download a copy of `Invoice Register.xlsx`
2. Save to `reports/Invoice-Register-backup-YYYY-MM-DD.xlsx`

### Step 4.2: Test Migration (Dry Run)

```bash
# Test with first 5 rows only
tsx scripts/migrate-postal-to-supabase.ts --dry-run --limit=5
```

**Review the output:**
- Check mapping of Excel columns to Supabase
- Verify validation logic
- Confirm duplicate detection works
- Review report in `reports/postal-migration-dry-run-YYYY-MM-DD.json`

### Step 4.3: Full Dry Run

```bash
# Test with all rows (no actual insertion)
tsx scripts/migrate-postal-to-supabase.ts --dry-run
```

**Expected Output:**
- Total rows to process
- Number of valid/invalid rows
- Number of duplicates detected
- Number that would be inserted

### Step 4.4: Execute Production Migration

⚠️ **IMPORTANT:** Only proceed if dry runs look correct!

```bash
# Execute the actual migration
tsx scripts/migrate-postal-to-supabase.ts
```

**Expected Output:**
- Progress for each row
- Final statistics
- Migration report in `reports/postal-migration-YYYY-MM-DD.json`
- Entries in `postal_ingest_log` table

## Phase 5: Validation

### Step 5.1: Run SQL Validation Queries

1. Open Supabase SQL Editor
2. Copy queries from `scripts/validate-postal-migration.sql`
3. Run each query section to verify:
   - Count of postal invoices
   - Sum of totals matches expectations
   - Data completeness
   - No unexpected duplicates
   - Successful postal_ingest_log entries

### Step 5.2: Verify Dashboard Display

1. Open the invoice dashboard
2. Add a filter for `source = 'postal_ocr'` (if available)
3. Verify postal invoices display correctly:
   - Invoice numbers visible
   - Supplier names correct
   - Amounts display properly
   - File URLs work (if shown)
4. Check summary statistics include postal invoices

### Step 5.3: Spot Check Sample Invoices

Compare a few invoices between:
- Excel `Postal` sheet
- Supabase `invoices` table
- Dashboard display

Verify data matches across all three.

## Rollback Procedures

### If Excel Deduplication Needs Rollback

```bash
# Restore from backup (requires manual Excel import)
# 1. Open Invoice Register.xlsx
# 2. Delete current Postal sheet
# 3. Import data from reports/postal-excel-backup-YYYY-MM-DD.json
```

### If Supabase Migration Needs Rollback

```sql
-- Delete all postal_ocr invoices inserted during migration
DELETE FROM invoices 
WHERE source = 'postal_ocr' 
  AND created_at >= 'MIGRATION_START_TIMESTAMP';

-- Clear postal_ingest_log
DELETE FROM postal_ingest_log 
WHERE created_at >= 'MIGRATION_START_TIMESTAMP';
```

Alternatively, restore from the Supabase backup created in Phase 4.1.

## Troubleshooting

### Error: Missing Environment Variables

**Solution:** Add all required variables to `.env.local` (see Prerequisites section)

### Error: Table/Column Not Found

**Solution:** Run the schema migration SQL script in Supabase

### Error: Duplicate Key Violation

**Solution:** This means an invoice already exists. The script should handle this automatically, but if not:
1. Check `postal_ingest_log` for the file
2. Verify if it's a legitimate duplicate
3. If needed, manually remove the duplicate from Excel before re-running

### Error: Graph API Authentication Failed

**Solution:** 
1. Verify Azure credentials are correct
2. Check that the service principal has permissions to access Excel and OneDrive
3. Regenerate client secret if expired

### Low OCR Confidence Scores

**Note:** Some invoices may have low confidence scores. These are still migrated but flagged for review. Check the validation queries to see the distribution.

## Success Criteria

✅ Migration is successful when:
1. All valid Excel rows are in Supabase with `source='postal_ocr'`
2. No unexpected duplicates exist
3. Sum of totals matches between Excel and Supabase
4. Dashboard displays postal invoices correctly
5. `postal_ingest_log` shows all rows as 'processed' or 'skipped_duplicate'
6. No 'exception' entries in `postal_ingest_log` (or very few with documented reasons)

## Post-Migration Tasks

1. **Update n8n workflow** to write directly to Supabase instead of just Excel
2. **Enable cron trigger** on the postal OCR workflow (currently disabled)
3. **Monitor** the first few scheduled runs
4. **Document** any edge cases discovered during migration
5. **Archive** the Excel `Postal` sheet (keep as backup but stop using for new invoices)

## Files Created

### Scripts
- `scripts/analyze-postal-excel.mjs` - Excel analysis
- `scripts/dedupe-postal-excel.mjs` - Excel deduplication
- `scripts/validate-supabase-schema.ts` - Schema validation
- `scripts/migrate-postal-to-supabase.ts` - Main migration
- `scripts/cleanup-postal-onedrive.mjs` - OneDrive cleanup (already existed)

### SQL
- `migrations/postal-invoice-schema.sql` - Schema changes
- `scripts/validate-postal-migration.sql` - Validation queries

### Reports (Generated During Execution)
- `reports/onedrive-cleanup-status.md` - OneDrive cleanup requirements
- `reports/postal-excel-analysis-*.json` - Excel analysis results
- `reports/postal-excel-backup-*.json` - Excel data backup
- `reports/postal-excel-dedupe-plan-*.json` - Deduplication plan
- `reports/postal-excel-dedupe-report-*.json` - Deduplication results
- `reports/supabase-schema-validation-*.json` - Schema validation
- `reports/postal-migration-*.json` - Migration results

## Support

If you encounter issues not covered in this guide:
1. Check the generated report files for detailed error messages
2. Review the `postal_ingest_log` table for processing history
3. Verify all environment variables are set correctly
4. Ensure Azure service principal has necessary permissions

## Timeline Estimate

- Phase 1 (OneDrive Cleanup): 5-10 minutes
- Phase 2 (Excel Deduplication): 10-15 minutes
- Phase 3 (Schema Preparation): 5-10 minutes
- Phase 4 (Migration): 15-30 minutes (depending on row count)
- Phase 5 (Validation): 10-15 minutes

**Total: ~1-1.5 hours** (including review time between phases)

