#!/usr/bin/env node

import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local', override: true });
loadEnv();

const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const driveId = process.env.EXCEL_DRIVE_ID;

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }
  );

  const data = await response.json();
  return data.access_token;
}

async function listFolder(token, path) {
  const encodedPath = encodeURIComponent(path);
  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${encodedPath}:/children?$select=name,folder,file`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.value || [];
}

async function main() {
  console.log('Listing Invoice_Attachments Subfolders...\n');
  
  const token = await getAccessToken();
  const items = await listFolder(token, '/Invoice_Attachments');
  
  console.log('Contents of /Invoice_Attachments:');
  console.log('='.repeat(80));
  
  const folders = items.filter(item => item.folder);
  const files = items.filter(item => item.file);
  
  if (folders.length > 0) {
    console.log('\n📁 SUBFOLDERS:');
    folders.forEach(folder => {
      console.log(`   - ${folder.name}`);
    });
  }
  
  if (files.length > 0) {
    console.log(`\n📄 FILES: ${files.length} files`);
    if (files.length <= 20) {
      files.forEach(file => {
        console.log(`   - ${file.name}`);
      });
    } else {
      files.slice(0, 10).forEach(file => {
        console.log(`   - ${file.name}`);
      });
      console.log(`   ... and ${files.length - 10} more files`);
    }
  }
  
  console.log(`\nTotal: ${folders.length} subfolders, ${files.length} files`);
  
  // Look for postal-related folders
  console.log('\n🔍 Postal-related subfolders:');
  const postalFolders = folders.filter(f => 
    f.name.toLowerCase().includes('postal')
  );
  
  if (postalFolders.length > 0) {
    postalFolders.forEach(folder => {
      console.log(`   ✅ ${folder.name}`);
    });
  } else {
    console.log('   ⚠️  No subfolders with "postal" in the name found');
    console.log('\n   All subfolders:');
    folders.forEach(f => console.log(`      - ${f.name}`));
  }
}

main().catch(console.error);

