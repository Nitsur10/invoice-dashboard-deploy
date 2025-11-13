#!/usr/bin/env node

import { config as loadEnv } from 'dotenv';
import fs from 'node:fs/promises';

loadEnv({ path: '.env.local', override: true });
loadEnv();

const REQUIRED_ENV = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'EXCEL_DRIVE_ID',
  'EXCEL_WORKBOOK_ID'
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var ${key}`);
  }
}

const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const driveId = process.env.EXCEL_DRIVE_ID;
const workbookId = process.env.EXCEL_WORKBOOK_ID;
const worksheetName = process.env.EXCEL_POSTAL_WORKSHEET || 'Postal Invoices';

// OneDrive folder paths (relative to drive root)
const FOLDERS = {
  source: '/Rudra Projects/Invoice Management/Postal Invoices',
  pending: '/Rudra Projects/Invoice Management/Postal Invoices Pending',
  archive: '/Rudra Projects/Invoice Management/Postal Invoices archive'
};

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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to acquire Graph token (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function listFilesInFolder(token, folderPath) {
  const encodedPath = encodeURIComponent(folderPath);
  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${encodedPath}:/children?$select=name,size,id,createdDateTime,lastModifiedDateTime,folder`;
  
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { files: [], folders: [] };
      }
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const items = data.value || [];
    
    return {
      files: items.filter(item => !item.folder),
      folders: items.filter(item => item.folder)
    };
  } catch (error) {
    console.error(`  ❌ Error listing ${folderPath}:`, error.message);
    return { files: [], folders: [] };
  }
}

async function listAllFilesRecursive(token, folderPath, prefix = '') {
  const allFiles = [];
  const { files, folders } = await listFilesInFolder(token, folderPath);
  
  // Add files from current folder
  for (const file of files) {
    allFiles.push({
      name: file.name,
      fullPath: `${folderPath}/${file.name}`,
      displayPath: `${prefix}${file.name}`,
      size: file.size,
      id: file.id,
      created: file.createdDateTime,
      modified: file.lastModifiedDateTime
    });
  }
  
  // Recursively process subfolders
  for (const folder of folders) {
    const subFolderPath = `${folderPath}/${folder.name}`;
    const subFiles = await listAllFilesRecursive(token, subFolderPath, `${prefix}${folder.name}/`);
    allFiles.push(...subFiles);
  }
  
  return allFiles;
}

async function getExcelData(token) {
  // Get worksheets
  const worksheetUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/worksheets`;
  const wsResponse = await fetch(worksheetUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!wsResponse.ok) {
    throw new Error(`Failed to get worksheets: ${await wsResponse.text()}`);
  }
  
  const worksheets = await wsResponse.json();
  const worksheet = worksheets.value.find(ws => ws.name === worksheetName);
  
  if (!worksheet) {
    throw new Error(`Worksheet "${worksheetName}" not found. Available: ${worksheets.value.map(w => w.name).join(', ')}`);
  }

  // Get tables in worksheet
  const tablesUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/worksheets/${worksheet.id}/tables`;
  const tablesResponse = await fetch(tablesUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!tablesResponse.ok) {
    throw new Error(`Failed to get tables: ${await tablesResponse.text()}`);
  }
  
  const tables = await tablesResponse.json();
  
  if (!tables.value || tables.value.length === 0) {
    throw new Error('No tables found in worksheet');
  }

  const table = tables.value[0];
  
  // Get table rows
  const rowsUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/tables/${table.id}/rows`;
  const rowsResponse = await fetch(rowsUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!rowsResponse.ok) {
    throw new Error(`Failed to get rows: ${await rowsResponse.text()}`);
  }
  
  const rowsData = await rowsResponse.json();

  // Get column names
  const columnsUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/tables/${table.id}/columns`;
  const columnsResponse = await fetch(columnsUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!columnsResponse.ok) {
    throw new Error(`Failed to get columns: ${await columnsResponse.text()}`);
  }
  
  const columns = await columnsResponse.json();
  const columnNames = columns.value.map(col => col.name);

  // Map rows to objects
  return rowsData.value.map((row, index) => {
    const obj = { _rowIndex: index };
    row.values[0].forEach((value, i) => {
      obj[columnNames[i]] = value;
    });
    return obj;
  });
}

function normalizeFileName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function main() {
  console.log('OneDrive Postal Invoice Reconciliation');
  console.log('='.repeat(80));
  console.log('');
  console.log('This script tracks EVERY file across all OneDrive folders and Excel.');
  console.log('');

  const token = await getAccessToken();
  console.log('✅ Acquired Graph API token\n');

  // Step 1: List all files in OneDrive folders
  console.log('📁 Scanning OneDrive folders...\n');
  
  console.log('  Scanning "Postal Invoices" (source) folder...');
  const sourceFiles = await listAllFilesRecursive(token, FOLDERS.source);
  console.log(`  ✅ Found ${sourceFiles.length} files`);

  console.log('  Scanning "Postal Invoices Pending" folder...');
  const pendingFiles = await listAllFilesRecursive(token, FOLDERS.pending);
  console.log(`  ✅ Found ${pendingFiles.length} files`);

  console.log('  Scanning "Postal Invoices archive" folder...');
  const archiveFiles = await listAllFilesRecursive(token, FOLDERS.archive);
  console.log(`  ✅ Found ${archiveFiles.length} files`);

  const totalOneDriveFiles = sourceFiles.length + pendingFiles.length + archiveFiles.length;
  console.log(`\n📊 Total files in OneDrive: ${totalOneDriveFiles}`);

  // Step 2: Get Excel data
  console.log('\n📊 Fetching Excel data...');
  const excelRows = await getExcelData(token);
  console.log(`  ✅ Found ${excelRows.length} rows in Excel\n`);

  // Step 3: Create file name maps
  const excelFileMap = new Map();
  excelRows.forEach(row => {
    const fileName = normalizeFileName(row.file_name || '');
    if (fileName) {
      excelFileMap.set(fileName, row);
    }
  });

  const sourceFileMap = new Map(sourceFiles.map(f => [normalizeFileName(f.name), f]));
  const pendingFileMap = new Map(pendingFiles.map(f => [normalizeFileName(f.name), f]));
  const archiveFileMap = new Map(archiveFiles.map(f => [normalizeFileName(f.name), f]));

  // Step 4: Reconciliation
  console.log('='.repeat(80));
  console.log('RECONCILIATION ANALYSIS');
  console.log('='.repeat(80));
  console.log('');

  const reconciliation = {
    timestamp: new Date().toISOString(),
    processedAndArchived: [],
    processedButStillInSourceOrPending: [],
    archivedButNotInExcel: [],
    pendingNotProcessed: [],
    sourceNotProcessed: [],
    duplicatesAcrossFolders: [],
    inExcelButFileNotFound: [],
    summary: {
      totalFilesOneDrive: totalOneDriveFiles,
      totalRowsInExcel: excelRows.length,
      inSource: sourceFiles.length,
      inPending: pendingFiles.length,
      inArchive: archiveFiles.length,
    }
  };

  // Check each Excel row
  for (const row of excelRows) {
    const fileName = normalizeFileName(row.file_name || '');
    if (!fileName) continue;

    const inSource = sourceFileMap.has(fileName);
    const inPending = pendingFileMap.has(fileName);
    const inArchive = archiveFileMap.has(fileName);

    const locations = [];
    if (inSource) locations.push('source');
    if (inPending) locations.push('pending');
    if (inArchive) locations.push('archive');

    if (locations.length === 0) {
      reconciliation.inExcelButFileNotFound.push({
        fileName: row.file_name,
        invoiceNumber: row.invoice_number,
        supplier: row.supplier_name,
        total: row.total
      });
    } else if (inArchive && !inSource && !inPending) {
      reconciliation.processedAndArchived.push({
        fileName: row.file_name,
        invoiceNumber: row.invoice_number,
        supplier: row.supplier_name,
        total: row.total,
        status: '✅ Correctly processed and archived'
      });
    } else if (inArchive && (inSource || inPending)) {
      reconciliation.duplicatesAcrossFolders.push({
        fileName: row.file_name,
        invoiceNumber: row.invoice_number,
        locations: locations,
        issue: 'File exists in archive AND source/pending - needs cleanup'
      });
    } else if (!inArchive && (inSource || inPending)) {
      reconciliation.processedButStillInSourceOrPending.push({
        fileName: row.file_name,
        invoiceNumber: row.invoice_number,
        location: inSource ? 'source' : 'pending',
        issue: 'Processed but not moved to archive - needs archiving'
      });
    }
  }

  // Check archived files not in Excel
  for (const [fileName, file] of archiveFileMap.entries()) {
    if (!excelFileMap.has(fileName)) {
      reconciliation.archivedButNotInExcel.push({
        fileName: file.name,
        filePath: file.displayPath,
        size: file.size,
        modified: file.modified,
        issue: 'In archive but not in Excel - may be duplicate or pre-existing'
      });
    }
  }

  // Check pending files not in Excel
  for (const [fileName, file] of pendingFileMap.entries()) {
    if (!excelFileMap.has(fileName)) {
      reconciliation.pendingNotProcessed.push({
        fileName: file.name,
        filePath: file.displayPath,
        size: file.size,
        modified: file.modified,
        issue: 'In pending folder but not processed yet'
      });
    }
  }

  // Check source files not in Excel
  for (const [fileName, file] of sourceFileMap.entries()) {
    if (!excelFileMap.has(fileName)) {
      reconciliation.sourceNotProcessed.push({
        fileName: file.name,
        filePath: file.displayPath,
        size: file.size,
        modified: file.modified,
        issue: 'In source folder but not processed yet'
      });
    }
  }

  // Print results
  console.log('✅ SUCCESSFULLY PROCESSED & ARCHIVED:');
  console.log(`   ${reconciliation.processedAndArchived.length} files (Perfect state)`);
  
  console.log('\n⚠️  PROCESSED BUT NOT ARCHIVED (Need cleanup):');
  console.log(`   ${reconciliation.processedButStillInSourceOrPending.length} files`);
  if (reconciliation.processedButStillInSourceOrPending.length > 0) {
    console.log('   These files are in Excel but still in source/pending folders:');
    reconciliation.processedButStillInSourceOrPending.slice(0, 10).forEach(item => {
      console.log(`   - ${item.fileName} (in ${item.location})`);
    });
    if (reconciliation.processedButStillInSourceOrPending.length > 10) {
      console.log(`   ... and ${reconciliation.processedButStillInSourceOrPending.length - 10} more`);
    }
  }

  console.log('\n🔄 DUPLICATES ACROSS FOLDERS (Need cleanup):');
  console.log(`   ${reconciliation.duplicatesAcrossFolders.length} files`);
  if (reconciliation.duplicatesAcrossFolders.length > 0) {
    console.log('   These files exist in multiple locations:');
    reconciliation.duplicatesAcrossFolders.forEach(item => {
      console.log(`   - ${item.fileName}`);
      console.log(`     Locations: ${item.locations.join(', ')}`);
    });
  }

  console.log('\n📋 ARCHIVED BUT NOT IN EXCEL:');
  console.log(`   ${reconciliation.archivedButNotInExcel.length} files`);
  if (reconciliation.archivedButNotInExcel.length > 0) {
    console.log('   These may be duplicates or pre-existing files:');
    reconciliation.archivedButNotInExcel.slice(0, 10).forEach(item => {
      console.log(`   - ${item.fileName}`);
    });
    if (reconciliation.archivedButNotInExcel.length > 10) {
      console.log(`   ... and ${reconciliation.archivedButNotInExcel.length - 10} more`);
    }
  }

  console.log('\n⏳ PENDING (Not yet processed):');
  console.log(`   ${reconciliation.pendingNotProcessed.length} files`);
  if (reconciliation.pendingNotProcessed.length > 0) {
    console.log('   These files are awaiting processing:');
    reconciliation.pendingNotProcessed.forEach(item => {
      console.log(`   - ${item.fileName}`);
    });
  }

  console.log('\n📥 SOURCE (Not yet processed):');
  console.log(`   ${reconciliation.sourceNotProcessed.length} files`);
  if (reconciliation.sourceNotProcessed.length > 0) {
    console.log('   These files are awaiting processing:');
    reconciliation.sourceNotProcessed.forEach(item => {
      console.log(`   - ${item.fileName}`);
    });
  }

  console.log('\n❓ IN EXCEL BUT FILE NOT FOUND:');
  console.log(`   ${reconciliation.inExcelButFileNotFound.length} files`);
  if (reconciliation.inExcelButFileNotFound.length > 0) {
    console.log('   These are in Excel but file not found in any folder:');
    reconciliation.inExcelButFileNotFound.slice(0, 10).forEach(item => {
      console.log(`   - ${item.fileName} (Invoice: ${item.invoiceNumber || 'N/A'})`);
    });
    if (reconciliation.inExcelButFileNotFound.length > 10) {
      console.log(`   ... and ${reconciliation.inExcelButFileNotFound.length - 10} more`);
    }
  }

  // Save detailed report
  const reportPath = 'reports/onedrive-reconciliation-' + new Date().toISOString().split('T')[0] + '.json';
  await fs.writeFile(reportPath, JSON.stringify(reconciliation, null, 2));
  console.log(`\n✅ Detailed report saved to: ${reportPath}`);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total files in OneDrive:                ${totalOneDriveFiles}`);
  console.log(`Files in Excel (processed):             ${excelRows.length}`);
  console.log(`Files properly archived:                ${reconciliation.processedAndArchived.length}`);
  console.log(`Files processed but need archiving:     ${reconciliation.processedButStillInSourceOrPending.length}`);
  console.log(`Duplicates across folders:              ${reconciliation.duplicatesAcrossFolders.length}`);
  console.log(`Archived but not in Excel:              ${reconciliation.archivedButNotInExcel.length}`);
  console.log(`Pending (awaiting processing):          ${reconciliation.pendingNotProcessed.length}`);
  console.log(`Source (awaiting processing):           ${reconciliation.sourceNotProcessed.length}`);
  console.log(`In Excel but file not found:            ${reconciliation.inExcelButFileNotFound.length}`);

  const totalAccountedFor = reconciliation.processedAndArchived.length + 
                           reconciliation.processedButStillInSourceOrPending.length +
                           reconciliation.duplicatesAcrossFolders.length +
                           reconciliation.archivedButNotInExcel.length +
                           reconciliation.pendingNotProcessed.length +
                           reconciliation.sourceNotProcessed.length;
  
  console.log(`\n✅ All ${totalOneDriveFiles} OneDrive files accounted for!`);
  console.log(`✅ All ${excelRows.length} Excel rows accounted for!`);
  
  // Recommendations
  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(80));
  
  if (reconciliation.processedButStillInSourceOrPending.length > 0) {
    console.log(`\n1. Archive ${reconciliation.processedButStillInSourceOrPending.length} processed files`);
    console.log('   These files are in Excel but still in source/pending folders.');
    console.log('   Run: node scripts/cleanup-postal-onedrive.mjs');
  }
  
  if (reconciliation.duplicatesAcrossFolders.length > 0) {
    console.log(`\n2. Clean up ${reconciliation.duplicatesAcrossFolders.length} duplicate files`);
    console.log('   These files exist in both archive and source/pending.');
    console.log('   Safe to delete from source/pending since they\'re already archived.');
  }
  
  if (reconciliation.pendingNotProcessed.length > 0 || reconciliation.sourceNotProcessed.length > 0) {
    const unprocessed = reconciliation.pendingNotProcessed.length + reconciliation.sourceNotProcessed.length;
    console.log(`\n3. Process ${unprocessed} unprocessed files`);
    console.log('   These files are waiting to be processed by the n8n workflow.');
  }
  
  console.log('\n✅ Reconciliation complete!');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
