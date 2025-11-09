# OneDrive Cleanup Status

## Required Environment Variables

The cleanup script requires the following environment variables in `.env.local`:

```
AZURE_TENANT_ID=<your-azure-tenant-id>
AZURE_CLIENT_ID=<your-azure-client-id>
AZURE_CLIENT_SECRET=<your-azure-client-secret>
POSTAL_ONEDRIVE_DRIVE_ID=<drive-id>
POSTAL_ONEDRIVE_FOLDER_ID=<source-folder-id>
POSTAL_ONEDRIVE_PENDING_FOLDER_ID=<pending-folder-id>
POSTAL_ONEDRIVE_ARCHIVE_FOLDER_ID=<archive-folder-id>
```

## Current Status

- Script exists: ✅ `scripts/cleanup-postal-onedrive.mjs`
- Environment variables: ❌ Not configured
- Action required: Configure Azure credentials before running cleanup

## Next Steps

1. Add the required environment variables to `.env.local`
2. Run with dry-run first: `node scripts/cleanup-postal-onedrive.mjs --dry-run`
3. Review the output to confirm which files will be deleted
4. Run production: `node scripts/cleanup-postal-onedrive.mjs`

## Alternative Approach

If Azure credentials are not immediately available, we can:
1. Proceed with Excel analysis and deduplication (doesn't require OneDrive access)
2. Prepare Supabase schema validation
3. Return to OneDrive cleanup once credentials are available

