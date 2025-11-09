#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Extract credentials from existing workflow files and create .env.local
 */

async function main() {
  console.log('Extracting credentials from workflow files...\n');

  // Known values from workflow files
  const credentials = {
    // From workflows/postal-ocr-workflow.json
    POSTAL_ONEDRIVE_DRIVE_ID: 'b!eiqu1iWPf0iNdIbe4yR3T25SssYW3mNNqp4GbZEDKHuCzdNUTpvRRKs2arBeCoIP',
    POSTAL_ONEDRIVE_FOLDER_ID: '015B23OEWTPI4NF2PWV5BLAAHOHNJB66FR',
    
    // From docs/n8n-workflows/exports/wf-fEAs3LZr0lMDWziF.json
    EXCEL_WORKBOOK_ID: '015B23OEQ5YEAYVVQ3RFBYSPXSBCRUAV4U',
    EXCEL_DRIVE_ID: 'b!eiqu1iWPf0iNdIbe4yR3T25SssYW3mNNqp4GbZEDKHuCzdNUTpvRRKs2arBeCoIP',
    EXCEL_POSTAL_WORKSHEET: 'Postal',
  };

  // Check if .env.local already exists
  const envPath = path.join(process.cwd(), '.env.local');
  let existingEnv = {};
  
  try {
    const existing = await fs.readFile(envPath, 'utf-8');
    console.log('✅ Found existing .env.local file');
    
    // Parse existing env file
    existing.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          existingEnv[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    console.log(`   Found ${Object.keys(existingEnv).length} existing variables\n`);
  } catch (error) {
    console.log('ℹ️  No existing .env.local file found (will create new)\n');
  }

  // Merge: existing values take precedence, add new ones
  const merged = { ...credentials, ...existingEnv };

  // Build .env.local content
  const envContent = `# Environment Variables for Postal Invoice Migration
# Auto-generated from workflow files on ${new Date().toISOString()}

# ============================================================================
# Azure / Microsoft Graph API
# ============================================================================
AZURE_TENANT_ID=${merged.AZURE_TENANT_ID || 'YOUR_TENANT_ID_HERE'}
AZURE_CLIENT_ID=${merged.AZURE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE'}
AZURE_CLIENT_SECRET=${merged.AZURE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE'}

# ============================================================================
# Excel Workbook (Invoice Register.xlsx)
# ============================================================================
EXCEL_DRIVE_ID=${merged.EXCEL_DRIVE_ID}
EXCEL_WORKBOOK_ID=${merged.EXCEL_WORKBOOK_ID}
EXCEL_POSTAL_WORKSHEET=${merged.EXCEL_POSTAL_WORKSHEET}

# ============================================================================
# OneDrive Folders (Postal Invoices)
# ============================================================================
POSTAL_ONEDRIVE_DRIVE_ID=${merged.POSTAL_ONEDRIVE_DRIVE_ID}
POSTAL_ONEDRIVE_FOLDER_ID=${merged.POSTAL_ONEDRIVE_FOLDER_ID}
POSTAL_ONEDRIVE_PENDING_FOLDER_ID=${merged.POSTAL_ONEDRIVE_PENDING_FOLDER_ID || 'YOUR_PENDING_FOLDER_ID_HERE'}
POSTAL_ONEDRIVE_ARCHIVE_FOLDER_ID=${merged.POSTAL_ONEDRIVE_ARCHIVE_FOLDER_ID || 'YOUR_ARCHIVE_FOLDER_ID_HERE'}

# ============================================================================
# Supabase
# ============================================================================
SUPABASE_URL=${merged.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE'}
SUPABASE_SERVICE_ROLE_KEY=${merged.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE'}
SUPABASE_INVOICES_TABLE=${merged.SUPABASE_INVOICES_TABLE || 'invoices'}

# ============================================================================
# Optional: OpenAI (if running OCR directly)
# ============================================================================
OPENAI_API_KEY=${merged.OPENAI_API_KEY || ''}
OPENAI_VISION_MODEL=${merged.OPENAI_VISION_MODEL || 'gpt-4o-mini'}

# ============================================================================
# Optional: Postal OCR Settings
# ============================================================================
POSTAL_BACKFILL_DAYS=${merged.POSTAL_BACKFILL_DAYS || '30'}
POSTAL_DRY_RUN=${merged.POSTAL_DRY_RUN || 'false'}
POSTAL_MAX_FILES=${merged.POSTAL_MAX_FILES || '0'}
`;

  // Write .env.local
  await fs.writeFile(envPath, envContent);
  console.log('✅ Created/updated .env.local file\n');

  // Report what was set
  console.log('Credentials Status:');
  console.log('='.repeat(80));
  
  const checkVar = (name, value) => {
    const isSet = value && !value.includes('YOUR_') && !value.includes('_HERE');
    const status = isSet ? '✅' : '⚠️ ';
    console.log(`${status} ${name}: ${isSet ? 'SET' : 'NEEDS MANUAL INPUT'}`);
    return isSet;
  };

  let needsInput = [];
  
  console.log('\nAzure/Graph:');
  if (!checkVar('AZURE_TENANT_ID', merged.AZURE_TENANT_ID)) needsInput.push('AZURE_TENANT_ID');
  if (!checkVar('AZURE_CLIENT_ID', merged.AZURE_CLIENT_ID)) needsInput.push('AZURE_CLIENT_ID');
  if (!checkVar('AZURE_CLIENT_SECRET', merged.AZURE_CLIENT_SECRET)) needsInput.push('AZURE_CLIENT_SECRET');
  
  console.log('\nExcel:');
  checkVar('EXCEL_DRIVE_ID', merged.EXCEL_DRIVE_ID);
  checkVar('EXCEL_WORKBOOK_ID', merged.EXCEL_WORKBOOK_ID);
  checkVar('EXCEL_POSTAL_WORKSHEET', merged.EXCEL_POSTAL_WORKSHEET);
  
  console.log('\nOneDrive:');
  checkVar('POSTAL_ONEDRIVE_DRIVE_ID', merged.POSTAL_ONEDRIVE_DRIVE_ID);
  checkVar('POSTAL_ONEDRIVE_FOLDER_ID', merged.POSTAL_ONEDRIVE_FOLDER_ID);
  if (!checkVar('POSTAL_ONEDRIVE_PENDING_FOLDER_ID', merged.POSTAL_ONEDRIVE_PENDING_FOLDER_ID)) needsInput.push('POSTAL_ONEDRIVE_PENDING_FOLDER_ID');
  if (!checkVar('POSTAL_ONEDRIVE_ARCHIVE_FOLDER_ID', merged.POSTAL_ONEDRIVE_ARCHIVE_FOLDER_ID)) needsInput.push('POSTAL_ONEDRIVE_ARCHIVE_FOLDER_ID');
  
  console.log('\nSupabase:');
  if (!checkVar('SUPABASE_URL', merged.SUPABASE_URL)) needsInput.push('SUPABASE_URL');
  if (!checkVar('SUPABASE_SERVICE_ROLE_KEY', merged.SUPABASE_SERVICE_ROLE_KEY)) needsInput.push('SUPABASE_SERVICE_ROLE_KEY');
  checkVar('SUPABASE_INVOICES_TABLE', merged.SUPABASE_INVOICES_TABLE);

  console.log('\n' + '='.repeat(80));
  
  if (needsInput.length > 0) {
    console.log('\n⚠️  The following variables need manual input:');
    needsInput.forEach(v => console.log(`   - ${v}`));
    console.log('\nPlease edit .env.local and fill in these values.');
    console.log('You may find them in:');
    console.log('  - Azure Portal (for Azure credentials)');
    console.log('  - Supabase Dashboard → Settings → API (for Supabase)');
    console.log('  - OneDrive/SharePoint URLs (for folder IDs)');
  } else {
    console.log('\n✅ All required variables are set!');
    console.log('\nYou can now run the migration scripts.');
  }
  
  console.log(`\nFile location: ${envPath}`);
}

main().catch(err => {
  console.error('Failed to setup environment:', err);
  process.exit(1);
});

