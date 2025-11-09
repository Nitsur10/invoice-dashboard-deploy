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
const worksheetName = process.env.EXCEL_POSTAL_WORKSHEET || 'Postal';

const dryRun = process.argv.includes('--dry-run');

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to acquire Graph token (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json.access_token;
}

async function getWorksheetAndTable(token) {
  // Get worksheet
  const wsUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/worksheets`;
  const wsRes = await fetch(wsUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!wsRes.ok) {
    const text = await wsRes.text();
    throw new Error(`Failed to list worksheets (${wsRes.status}): ${text}`);
  }

  const wsData = await wsRes.json();
  const worksheet = wsData.value.find(ws => ws.name === worksheetName);
  
  if (!worksheet) {
    throw new Error(`Worksheet "${worksheetName}" not found`);
  }

  // Get table
  const tablesUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/worksheets/${worksheet.id}/tables`;
  const tablesRes = await fetch(tablesUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!tablesRes.ok) {
    const text = await tablesRes.text();
    throw new Error(`Failed to list tables (${tablesRes.status}): ${text}`);
  }

  const tablesData = await tablesRes.json();
  const table = tablesData.value[0];

  return { worksheet, table };
}

async function getTableData(token, tableId) {
  const rowsUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/tables/${tableId}/rows`;
  const rowsRes = await fetch(rowsUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!rowsRes.ok) {
    const text = await rowsRes.text();
    throw new Error(`Failed to get table rows (${rowsRes.status}): ${text}`);
  }

  const rowsData = await rowsRes.json();
  
  const columnsUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/tables/${tableId}/columns`;
  const columnsRes = await fetch(columnsUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!columnsRes.ok) {
    const text = await columnsRes.text();
    throw new Error(`Failed to get table columns (${columnsRes.status}): ${text}`);
  }

  const columnsData = await columnsRes.json();
  const headers = columnsData.value.map(col => col.name);

  return {
    headers,
    rows: rowsData.value || []
  };
}

function parseRow(headers, values) {
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index];
  });
  return row;
}

function buildDuplicateKey(row) {
  const invoiceNumber = row.invoice_number || row.Invoice_Number || '';
  const invoiceDate = row.invoice_date || row.Invoice_Date || '';
  const total = row.total || row.Total || row.Amount || '';
  return `${invoiceNumber}|${invoiceDate}|${total}`;
}

function scoreRowCompleteness(row) {
  let score = 0;
  
  // Check for key fields
  if (row.invoice_number || row.Invoice_Number) score += 10;
  if (row.file_name || row.File_Name) score += 5;
  if (row.file_url || row.File_URL) score += 5;
  if (row.supplier_name || row.Supplier_Name) score += 3;
  if (row.supplier_abn || row.Supplier_ABN) score += 2;
  if (row.bank_bsb || row.Bank_BSB) score += 1;
  if (row.bank_account || row.Bank_Account) score += 1;
  if (row.gst_total || row.GST_Total) score += 1;
  
  return score;
}

function identifyDuplicates(tableData) {
  const rows = tableData.rows.map((row, index) => {
    const parsed = parseRow(tableData.headers, row.values[0]);
    return {
      index,
      rowId: row.index,
      rowIndex: row.index, // Excel row index for deletion
      completenessScore: scoreRowCompleteness(parsed),
      ...parsed
    };
  });

  // Group by duplicate key
  const duplicateGroups = new Map();
  
  rows.forEach(row => {
    const key = buildDuplicateKey(row);
    if (!duplicateGroups.has(key)) {
      duplicateGroups.set(key, []);
    }
    duplicateGroups.get(key).push(row);
  });

  // Identify rows to keep vs delete
  const toKeep = [];
  const toDelete = [];
  
  for (const [key, group] of duplicateGroups.entries()) {
    if (group.length === 1) {
      toKeep.push(group[0]);
    } else {
      // Sort by completeness score (highest first)
      group.sort((a, b) => b.completenessScore - a.completenessScore);
      
      // Keep the most complete row
      toKeep.push(group[0]);
      
      // Mark others for deletion
      for (let i = 1; i < group.length; i++) {
        toDelete.push(group[i]);
      }
    }
  }

  return {
    allRows: rows,
    toKeep,
    toDelete,
    duplicateGroups: Array.from(duplicateGroups.entries())
      .filter(([_, group]) => group.length > 1)
      .map(([key, group]) => ({ key, count: group.length, rows: group }))
  };
}

async function deleteRow(token, tableId, rowIndex) {
  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/tables/${tableId}/rows/itemAt(index=${rowIndex})`;
  
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.status === 204 || res.status === 200) {
    return true;
  }

  const text = await res.text();
  console.warn(`Failed to delete row ${rowIndex}: ${res.status} ${text}`);
  return false;
}

async function main() {
  console.log('Postal Excel Deduplication Script');
  console.log('='.repeat(80));
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('⚠️  PRODUCTION MODE - Changes will be applied!\n');
  }
  
  const token = await getAccessToken();
  console.log('✅ Acquired Graph API token');
  
  const { worksheet, table } = await getWorksheetAndTable(token);
  console.log(`✅ Found worksheet "${worksheetName}" and table "${table.name}"`);
  
  const tableData = await getTableData(token, table.id);
  console.log(`✅ Retrieved ${tableData.rows.length} rows`);
  
  // Create backup
  const timestamp = new Date().toISOString().split('T')[0];
  const backupPath = `reports/postal-excel-backup-${timestamp}.json`;
  await fs.writeFile(backupPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    worksheet: worksheetName,
    table: table.name,
    headers: tableData.headers,
    rows: tableData.rows
  }, null, 2));
  console.log(`✅ Backup saved to: ${backupPath}`);
  
  // Identify duplicates
  const analysis = identifyDuplicates(tableData);
  
  console.log('\n' + '-'.repeat(80));
  console.log('DEDUPLICATION ANALYSIS:');
  console.log('-'.repeat(80));
  console.log(`Total rows: ${analysis.allRows.length}`);
  console.log(`Rows to keep: ${analysis.toKeep.length}`);
  console.log(`Rows to delete: ${analysis.toDelete.length}`);
  console.log(`Duplicate groups: ${analysis.duplicateGroups.length}`);
  
  if (analysis.duplicateGroups.length > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log('DUPLICATE GROUPS:');
    console.log('-'.repeat(80));
    
    analysis.duplicateGroups.forEach((group, idx) => {
      console.log(`\n${idx + 1}. Key: ${group.key} (${group.count} duplicates)`);
      group.rows.forEach((row, rowIdx) => {
        const fileName = row.file_name || row.File_Name || '';
        const action = rowIdx === 0 ? '✅ KEEP' : '❌ DELETE';
        console.log(`   ${action} [Score: ${row.completenessScore}] Row ${row.index}: ${fileName}`);
      });
    });
  }
  
  // Save deduplication plan
  const planPath = `reports/postal-excel-dedupe-plan-${timestamp}.json`;
  await fs.writeFile(planPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    dryRun,
    summary: {
      totalRows: analysis.allRows.length,
      toKeep: analysis.toKeep.length,
      toDelete: analysis.toDelete.length,
      duplicateGroups: analysis.duplicateGroups.length
    },
    duplicateGroups: analysis.duplicateGroups,
    rowsToDelete: analysis.toDelete.map(r => ({
      index: r.index,
      rowIndex: r.rowIndex,
      invoice_number: r.invoice_number || r.Invoice_Number,
      file_name: r.file_name || r.File_Name,
      completenessScore: r.completenessScore
    }))
  }, null, 2));
  console.log(`\n✅ Deduplication plan saved to: ${planPath}`);
  
  if (analysis.toDelete.length === 0) {
    console.log('\n✅ No duplicates to delete!');
    return;
  }
  
  if (dryRun) {
    console.log('\n🔍 Dry run complete. Run without --dry-run to apply changes.');
    return;
  }
  
  // Delete duplicates (in reverse order to maintain indices)
  console.log('\n' + '-'.repeat(80));
  console.log('DELETING DUPLICATE ROWS:');
  console.log('-'.repeat(80));
  
  // Sort by row index descending to delete from bottom up
  const sortedToDelete = [...analysis.toDelete].sort((a, b) => b.rowIndex - a.rowIndex);
  
  let deleted = 0;
  for (const row of sortedToDelete) {
    const fileName = row.file_name || row.File_Name || 'unknown';
    console.log(`Deleting row ${row.rowIndex}: ${fileName}...`);
    
    const success = await deleteRow(token, table.id, row.rowIndex);
    if (success) {
      deleted++;
      console.log(`  ✅ Deleted`);
    } else {
      console.log(`  ❌ Failed`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`DEDUPLICATION COMPLETE: Deleted ${deleted}/${analysis.toDelete.length} duplicate rows`);
  console.log('='.repeat(80));
  
  // Save execution report
  const reportPath = `reports/postal-excel-dedupe-report-${timestamp}.json`;
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    success: true,
    deleted,
    attempted: analysis.toDelete.length,
    backupPath,
    planPath
  }, null, 2));
  console.log(`\n✅ Execution report saved to: ${reportPath}`);
}

main().catch((err) => {
  console.error('Deduplication failed:', err);
  process.exit(1);
});

