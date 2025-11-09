# Environment Variables Template

Copy this template to `.env.local` and fill in your values.

```bash
# ============================================================================
# Azure / Microsoft Graph API
# ============================================================================
# Get these from Azure Portal → App Registrations → Your App
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here

# ============================================================================
# Excel Workbook (Invoice Register.xlsx)
# ============================================================================
# Drive ID: Found in SharePoint URL or via Graph API
# Example: b!eiqu1iWPf0iNdIbe4yR3T25SssYW3mNNqp4GbZEDKHuCzdNUTpvRRKs2arBeCoIP
EXCEL_DRIVE_ID=your-drive-id-here

# Workbook ID: Found in SharePoint URL or via Graph API
# Example: 015B23OEQ5YEAYVVQ3RFBYSPXSBCRUAV4U
EXCEL_WORKBOOK_ID=your-workbook-id-here

# Worksheet name (default: Postal)
EXCEL_POSTAL_WORKSHEET=Postal

# ============================================================================
# OneDrive Folders (Postal Invoices)
# ============================================================================
# Drive ID (same as Excel if on same SharePoint site)
POSTAL_ONEDRIVE_DRIVE_ID=your-drive-id-here

# Source folder ID (where new postal invoices are dropped)
# Example: 015B23OEWTPI4NF2PWV5BLAAHOHNJB66FR
POSTAL_ONEDRIVE_FOLDER_ID=your-source-folder-id-here

# Pending folder ID (invoices that failed processing)
POSTAL_ONEDRIVE_PENDING_FOLDER_ID=your-pending-folder-id-here

# Archive folder ID (successfully processed invoices)
POSTAL_ONEDRIVE_ARCHIVE_FOLDER_ID=your-archive-folder-id-here

# ============================================================================
# Supabase
# ============================================================================
# Supabase project URL
# Example: https://abcdefghijklmnop.supabase.co
SUPABASE_URL=your-supabase-url-here

# Service role key (found in Supabase Dashboard → Settings → API)
# ⚠️ KEEP THIS SECRET! Never commit to git!
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Table name (default: invoices)
SUPABASE_INVOICES_TABLE=invoices

# ============================================================================
# Optional: OpenAI (if running OCR directly)
# ============================================================================
# Only needed if running scripts/postal-ocr.ts directly
# OPENAI_API_KEY=your-openai-key-here
# OPENAI_VISION_MODEL=gpt-4o-mini

# ============================================================================
# Optional: Postal OCR Settings
# ============================================================================
# POSTAL_BACKFILL_DAYS=30
# POSTAL_DRY_RUN=true
# POSTAL_MAX_FILES=10
```

## How to Find IDs

### Drive ID
1. Go to SharePoint site
2. Open any document
3. Look at URL: `https://[tenant].sharepoint.com/sites/[site]/_layouts/15/Doc.aspx?sourcedoc={WORKBOOK_ID}&file=...`
4. Or use Graph API: `GET https://graph.microsoft.com/v1.0/sites/[site-id]/drives`

### Workbook ID
1. Open Invoice Register.xlsx in SharePoint
2. Look at URL parameter `sourcedoc={WORKBOOK_ID}`
3. Or use Graph API: `GET https://graph.microsoft.com/v1.0/drives/{drive-id}/root/children`

### Folder IDs
1. Navigate to folder in OneDrive/SharePoint
2. Right-click → Get Link → Copy
3. Extract ID from URL
4. Or use Graph API: `GET https://graph.microsoft.com/v1.0/drives/{drive-id}/root/children`

## Verification

After setting up `.env.local`, verify with:

```bash
# Check Azure credentials
node -e "require('dotenv').config({path:'.env.local'}); console.log('Azure Tenant:', process.env.AZURE_TENANT_ID ? '✅' : '❌')"

# Check Supabase credentials
node -e "require('dotenv').config({path:'.env.local'}); console.log('Supabase URL:', process.env.SUPABASE_URL ? '✅' : '❌')"

# Check Excel IDs
node -e "require('dotenv').config({path:'.env.local'}); console.log('Excel Drive:', process.env.EXCEL_DRIVE_ID ? '✅' : '❌')"
```

## Security Notes

- ⚠️ **Never commit `.env.local` to git**
- ⚠️ **Keep service role key secret**
- ⚠️ **Rotate Azure client secrets periodically**
- ✅ `.env.local` is already in `.gitignore`

## Permissions Required

Your Azure App Registration needs:
- `Files.ReadWrite.All` (for Excel and OneDrive)
- `Sites.ReadWrite.All` (for SharePoint)

Your Supabase service role key needs:
- Full access to `invoices` table
- Full access to `postal_ingest_log` table

