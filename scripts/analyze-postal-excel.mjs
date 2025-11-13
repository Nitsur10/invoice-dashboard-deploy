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

async function getWorksheetId(token) {
  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/worksheets`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list worksheets (${res.status}): ${text}`);
  }

  const data = await res.json();
  const worksheet = data.value.find(ws => ws.name === worksheetName);
  
  if (!worksheet) {
    throw new Error(`Worksheet "${worksheetName}" not found. Available: ${data.value.map(w => w.name).join(', ')}`);
  }

  return worksheet.id;
}

async function getTableData(token, worksheetId) {
  // First, list tables in the worksheet
  const tablesUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/worksheets/${worksheetId}/tables`;
  const tablesRes = await fetch(tablesUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!tablesRes.ok) {
    const text = await tablesRes.text();
    throw new Error(`Failed to list tables (${tablesRes.status}): ${text}`);
  }

  const tablesData = await tablesRes.json();
  
  if (!tablesData.value || tablesData.value.length === 0) {
    throw new Error(`No tables found in worksheet "${worksheetName}"`);
  }

  // Use the first table (should be the Postal table)
  const table = tablesData.value[0];
  console.log(`Found table: ${table.name} (ID: ${table.id})`);

  // Get table rows
  const rowsUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/tables/${table.id}/rows`;
  const rowsRes = await fetch(rowsUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!rowsRes.ok) {
    const text = await rowsRes.text();
    throw new Error(`Failed to get table rows (${rowsRes.status}): ${text}`);
  }

  const rowsData = await rowsRes.json();
  
  // Get column headers
  const columnsUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/tables/${table.id}/columns`;
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
    tableName: table.name,
    tableId: table.id,
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

function analyzeData(tableData) {
  const rows = tableData.rows.map((row, index) => {
    const parsed = parseRow(tableData.headers, row.values[0]);
    return {
      index,
      rowId: row.index,
      ...parsed
    };
  });

  console.log(`\nTotal rows in Excel: ${rows.length}`);
  console.log(`\nSample row (first):`);
  console.log(JSON.stringify(rows[0], null, 2));

  // Group by duplicate key
  const duplicateGroups = new Map();
  
  rows.forEach(row => {
    const key = buildDuplicateKey(row);
    if (!duplicateGroups.has(key)) {
      duplicateGroups.set(key, []);
    }
    duplicateGroups.get(key).push(row);
  });

  // Find duplicates
  const duplicates = [];
  for (const [key, group] of duplicateGroups.entries()) {
    if (group.length > 1) {
      duplicates.push({
        key,
        count: group.length,
        rows: group
      });
    }
  }

  return {
    totalRows: rows.length,
    uniqueKeys: duplicateGroups.size,
    duplicateGroups: duplicates.length,
    duplicates,
    allRows: rows,
    headers: tableData.headers
  };
}

function generateReport(analysis) {
  console.log('\n' + '='.repeat(80));
  console.log('POSTAL EXCEL ANALYSIS REPORT');
  console.log('='.repeat(80));
  
  console.log(`\nTotal rows: ${analysis.totalRows}`);
  console.log(`Unique invoice keys: ${analysis.uniqueKeys}`);
  console.log(`Duplicate groups: ${analysis.duplicateGroups}`);
  
  if (analysis.duplicates.length > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log('DUPLICATE GROUPS:');
    console.log('-'.repeat(80));
    
    analysis.duplicates.forEach((group, idx) => {
      console.log(`\n${idx + 1}. Key: ${group.key} (${group.count} duplicates)`);
      group.rows.forEach((row, rowIdx) => {
        const fileName = row.file_name || row.File_Name || '';
        const supplierName = row.supplier_name || row.Supplier_Name || '';
        console.log(`   [${rowIdx + 1}] Row ${row.index}: ${supplierName} - ${fileName}`);
      });
    });
  } else {
    console.log('\n✅ No duplicates found!');
  }

  // Data quality checks
  console.log('\n' + '-'.repeat(80));
  console.log('DATA QUALITY CHECKS:');
  console.log('-'.repeat(80));
  
  const missingInvoiceNumber = analysis.allRows.filter(r => 
    !r.invoice_number && !r.Invoice_Number
  ).length;
  
  const missingTotal = analysis.allRows.filter(r => 
    !r.total && !r.Total && !r.Amount
  ).length;
  
  const missingSupplier = analysis.allRows.filter(r => 
    !r.supplier_name && !r.Supplier_Name
  ).length;
  
  const missingFileUrl = analysis.allRows.filter(r => 
    !r.file_url && !r.File_URL
  ).length;

  console.log(`Missing invoice_number: ${missingInvoiceNumber}`);
  console.log(`Missing total: ${missingTotal}`);
  console.log(`Missing supplier_name: ${missingSupplier}`);
  console.log(`Missing file_url: ${missingFileUrl}`);

  return {
    summary: {
      totalRows: analysis.totalRows,
      uniqueKeys: analysis.uniqueKeys,
      duplicateGroups: analysis.duplicateGroups,
      dataQuality: {
        missingInvoiceNumber,
        missingTotal,
        missingSupplier,
        missingFileUrl
      }
    },
    duplicates: analysis.duplicates,
    headers: analysis.headers
  };
}

async function main() {
  console.log('Analyzing Postal Excel sheet...\n');
  
  const token = await getAccessToken();
  console.log('✅ Acquired Graph API token');
  
  const worksheetId = await getWorksheetId(token);
  console.log(`✅ Found worksheet "${worksheetName}" (ID: ${worksheetId})`);
  
  const tableData = await getTableData(token, worksheetId);
  console.log(`✅ Retrieved table data: ${tableData.rows.length} rows`);
  
  const analysis = analyzeData(tableData);
  const report = generateReport(analysis);
  
  // Save detailed report
  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = `reports/postal-excel-analysis-${timestamp}.json`;
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Detailed report saved to: ${reportPath}`);
  
  // Save full data for deduplication script
  const dataPath = `reports/postal-excel-data-${timestamp}.json`;
  await fs.writeFile(dataPath, JSON.stringify(analysis.allRows, null, 2));
  console.log(`✅ Full data saved to: ${dataPath}`);
}

main().catch((err) => {
  console.error('Analysis failed:', err);
  process.exit(1);
});

