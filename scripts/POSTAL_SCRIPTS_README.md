# Postal Invoice Migration Scripts

This directory contains scripts for migrating postal invoices from Excel to Supabase.

## Quick Reference

### Excel Scripts

```bash
# Analyze Excel for duplicates
node scripts/analyze-postal-excel.mjs

# Deduplicate Excel (dry-run first!)
node scripts/dedupe-postal-excel.mjs --dry-run
node scripts/dedupe-postal-excel.mjs
```

### Supabase Scripts

```bash
# Validate schema
tsx scripts/validate-supabase-schema.ts

# Migrate data (test first!)
tsx scripts/migrate-postal-to-supabase.ts --dry-run --limit=5
tsx scripts/migrate-postal-to-supabase.ts --dry-run
tsx scripts/migrate-postal-to-supabase.ts
```

### OneDrive Scripts

```bash
# Clean up duplicates
node scripts/cleanup-postal-onedrive.mjs --dry-run
node scripts/cleanup-postal-onedrive.mjs
```

## Script Details

### analyze-postal-excel.mjs

**Purpose**: Analyze the Postal sheet in Invoice Register.xlsx

**Requirements**:
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `EXCEL_DRIVE_ID`
- `EXCEL_WORKBOOK_ID`

**Output**:
- `reports/postal-excel-analysis-YYYY-MM-DD.json`
- `reports/postal-excel-data-YYYY-MM-DD.json`

**What it does**:
1. Connects to Excel via Microsoft Graph API
2. Reads all rows from Postal sheet
3. Identifies duplicates using key: `invoice_number|invoice_date|total`
4. Generates data quality metrics
5. Saves detailed report

**Usage**:
```bash
node scripts/analyze-postal-excel.mjs
```

---

### dedupe-postal-excel.mjs

**Purpose**: Remove duplicate rows from Excel Postal sheet

**Requirements**: Same as analyze-postal-excel.mjs

**Flags**:
- `--dry-run` - Preview changes without applying

**Output**:
- `reports/postal-excel-backup-YYYY-MM-DD.json` (backup)
- `reports/postal-excel-dedupe-plan-YYYY-MM-DD.json` (plan)
- `reports/postal-excel-dedupe-report-YYYY-MM-DD.json` (results)

**What it does**:
1. Creates automatic backup of current data
2. Identifies duplicate groups
3. Scores rows by completeness
4. Keeps most complete row per group
5. Deletes other duplicates (from bottom up)

**Usage**:
```bash
# Always dry-run first!
node scripts/dedupe-postal-excel.mjs --dry-run

# Review output, then execute
node scripts/dedupe-postal-excel.mjs
```

---

### validate-supabase-schema.ts

**Purpose**: Validate Supabase schema is ready for migration

**Requirements**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Output**:
- `reports/supabase-schema-validation-YYYY-MM-DD.json`

**What it does**:
1. Checks if invoices table exists
2. Validates required columns exist
3. Checks for postal_ingest_log table
4. Provides recommendations

**Usage**:
```bash
tsx scripts/validate-supabase-schema.ts
```

**Exit codes**:
- `0` - Schema is ready
- `1` - Schema needs updates (run migration SQL)

---

### migrate-postal-to-supabase.ts

**Purpose**: Migrate postal invoices from Excel to Supabase

**Requirements**:
- All Azure/Excel env vars
- All Supabase env vars

**Flags**:
- `--dry-run` - Preview without inserting
- `--limit=N` - Process only first N rows

**Output**:
- `reports/postal-migration-[dry-run-]YYYY-MM-DD.json`
- Entries in `postal_ingest_log` table (if not dry-run)

**What it does**:
1. Fetches data from Excel Postal sheet
2. Maps columns to Supabase schema
3. Validates each row (required fields, data types)
4. Checks for duplicates (by file_checksum or invoice_number)
5. Inserts valid, non-duplicate rows
6. Logs all operations to postal_ingest_log

**Usage**:
```bash
# Test with 5 rows
tsx scripts/migrate-postal-to-supabase.ts --dry-run --limit=5

# Full dry-run
tsx scripts/migrate-postal-to-supabase.ts --dry-run

# Production (after reviewing dry-run results)
tsx scripts/migrate-postal-to-supabase.ts
```

---

### cleanup-postal-onedrive.mjs

**Purpose**: Remove duplicate files from OneDrive source/pending folders

**Requirements**:
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `POSTAL_ONEDRIVE_DRIVE_ID`
- `POSTAL_ONEDRIVE_FOLDER_ID`
- `POSTAL_ONEDRIVE_PENDING_FOLDER_ID`
- `POSTAL_ONEDRIVE_ARCHIVE_FOLDER_ID`

**Flags**:
- `--dry-run` - Preview without deleting

**What it does**:
1. Lists files in source, pending, and archive folders
2. Builds hash map (name + size) for archive files
3. Identifies duplicates in source/pending
4. Deletes files that exist in archive

**Usage**:
```bash
# Preview
node scripts/cleanup-postal-onedrive.mjs --dry-run

# Execute
node scripts/cleanup-postal-onedrive.mjs
```

---

### validate-postal-migration.sql

**Purpose**: SQL queries to validate migration results

**Requirements**: Supabase SQL Editor access

**What it includes**:
1. Count postal invoices
2. Sum/average of totals
3. Data completeness metrics
4. Duplicate detection
5. postal_ingest_log statistics
6. Failed migrations
7. Date distribution
8. Top suppliers
9. OCR confidence distribution
10. Source comparison
11. Missing fields
12. Sample invoices

**Usage**:
1. Open Supabase SQL Editor
2. Copy queries from the file
3. Run each section
4. Review results

---

## Common Issues

### "Missing required env var"

**Solution**: Add the variable to `.env.local`

See `reports/ENVIRONMENT_VARIABLES_TEMPLATE.md` for the complete list.

### "Failed to acquire Graph token"

**Solutions**:
1. Verify Azure credentials are correct
2. Check client secret hasn't expired
3. Ensure service principal has permissions

### "Worksheet not found"

**Solution**: Check `EXCEL_POSTAL_WORKSHEET` matches the actual worksheet name (default: "Postal")

### "Table does not exist"

**Solution**: Run the schema migration SQL first:
```bash
# In Supabase SQL Editor
# Run: migrations/postal-invoice-schema.sql
```

## Execution Order

Follow this order for the complete migration:

1. ✅ `analyze-postal-excel.mjs` - Understand current state
2. ✅ `dedupe-postal-excel.mjs --dry-run` - Plan deduplication
3. ✅ `dedupe-postal-excel.mjs` - Execute deduplication
4. ✅ `validate-supabase-schema.ts` - Check schema
5. ✅ Apply `migrations/postal-invoice-schema.sql` (if needed)
6. ✅ `migrate-postal-to-supabase.ts --dry-run` - Test migration
7. ✅ `migrate-postal-to-supabase.ts` - Execute migration
8. ✅ Run `validate-postal-migration.sql` - Verify results
9. ✅ `cleanup-postal-onedrive.mjs` - Clean up files (optional)

## Safety Features

All scripts include:
- ✅ **Dry-run mode** for testing
- ✅ **Automatic backups** before destructive operations
- ✅ **Detailed logging** to files
- ✅ **Error handling** with clear messages
- ✅ **Progress indicators** during execution

## Output Files

All scripts save reports to the `reports/` directory:

```
reports/
├── postal-excel-analysis-*.json
├── postal-excel-backup-*.json
├── postal-excel-dedupe-plan-*.json
├── postal-excel-dedupe-report-*.json
├── supabase-schema-validation-*.json
└── postal-migration-*.json
```

## Complete Documentation

For detailed instructions, see:
- **Main Guide**: `reports/POSTAL_MIGRATION_GUIDE.md`
- **Summary**: `reports/POSTAL_MIGRATION_SUMMARY.md`
- **Environment Setup**: `reports/ENVIRONMENT_VARIABLES_TEMPLATE.md`

## Support

If you encounter issues:
1. Check the generated report files for details
2. Review the troubleshooting section in the migration guide
3. Verify all environment variables are set correctly
4. Ensure Azure service principal has necessary permissions

