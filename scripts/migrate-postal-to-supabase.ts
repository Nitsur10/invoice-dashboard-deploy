import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

loadEnv({ path: '.env.local', override: true });
loadEnv();

const REQUIRED_ENV = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'EXCEL_DRIVE_ID',
  'EXCEL_WORKBOOK_ID',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var ${key}`);
  }
}

const tenantId = process.env.AZURE_TENANT_ID!;
const clientId = process.env.AZURE_CLIENT_ID!;
const clientSecret = process.env.AZURE_CLIENT_SECRET!;
const driveId = process.env.EXCEL_DRIVE_ID!;
const workbookId = process.env.EXCEL_WORKBOOK_ID!;
const worksheetName = process.env.EXCEL_POSTAL_WORKSHEET || 'Postal';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const tableName = process.env.SUPABASE_INVOICES_TABLE || 'invoices';

const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 0;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to acquire Graph token (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json.access_token;
}

async function getExcelData(token: string) {
  // Get worksheet
  const wsUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/worksheets`;
  const wsRes = await fetch(wsUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!wsRes.ok) {
    throw new Error(`Failed to list worksheets: ${wsRes.status}`);
  }

  const wsData = await wsRes.json();
  const worksheet = wsData.value.find((ws: any) => ws.name === worksheetName);

  if (!worksheet) {
    throw new Error(`Worksheet "${worksheetName}" not found`);
  }

  // Get table
  const tablesUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/worksheets/${worksheet.id}/tables`;
  const tablesRes = await fetch(tablesUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!tablesRes.ok) {
    throw new Error(`Failed to list tables: ${tablesRes.status}`);
  }

  const tablesData = await tablesRes.json();
  const table = tablesData.value[0];

  // Get rows
  const rowsUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/tables/${table.id}/rows`;
  const rowsRes = await fetch(rowsUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!rowsRes.ok) {
    throw new Error(`Failed to get rows: ${rowsRes.status}`);
  }

  const rowsData = await rowsRes.json();

  // Get columns
  const columnsUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${workbookId}/workbook/tables/${table.id}/columns`;
  const columnsRes = await fetch(columnsUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!columnsRes.ok) {
    throw new Error(`Failed to get columns: ${columnsRes.status}`);
  }

  const columnsData = await columnsRes.json();
  const headers = columnsData.value.map((col: any) => col.name);

  return {
    headers,
    rows: rowsData.value || []
  };
}

function parseRow(headers: string[], values: any[]) {
  const row: any = {};
  headers.forEach((header, index) => {
    row[header] = values[index];
  });
  return row;
}

function normalizeColumnName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function mapExcelToSupabase(excelRow: any): any {
  // Map Excel column names to Supabase column names
  const mapped: any = {};

  // Helper to get value from multiple possible column names
  const getValue = (names: string[]) => {
    for (const name of names) {
      const normalized = normalizeColumnName(name);
      for (const key of Object.keys(excelRow)) {
        if (normalizeColumnName(key) === normalized && excelRow[key]) {
          return excelRow[key];
        }
      }
    }
    return null;
  };

  // Helper to convert Excel serial date to ISO date string
  const excelDateToISO = (excelDate: any): string | null => {
    if (!excelDate) return null;
    const num = parseFloat(excelDate);
    if (isNaN(num)) return excelDate; // Already a string date
    // Excel serial date: days since 1900-01-01 (with 1900 leap year bug)
    const epoch = new Date(1899, 11, 30); // Dec 30, 1899
    const date = new Date(epoch.getTime() + num * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  // Get file_name first (needed for fallback invoice number)
  mapped.file_name = getValue(['file_name', 'filename', 'name']);
  
  // Generate fallback invoice number if missing (use file_name hash or timestamp)
  const invoiceNum = getValue(['invoice_number', 'invoicenumber', 'number']);
  if (invoiceNum) {
    mapped.invoice_number = String(invoiceNum);
  } else {
    // Generate a unique invoice number from file_checksum or file_name
    const fileName = mapped.file_name || 'unknown';
    const hash = crypto.createHash('md5').update(fileName).digest('hex').substring(0, 8);
    mapped.invoice_number = `POSTAL-${hash}`.toUpperCase();
  }

  mapped.invoice_date = excelDateToISO(getValue(['invoice_date', 'invoicedate', 'date']));
  mapped.due_date = excelDateToISO(getValue(['due_date', 'duedate', 'payment_due']));
  mapped.supplier_name = getValue(['supplier_name', 'suppliername', 'supplier', 'vendor']);
  mapped.supplier_abn = getValue(['supplier_abn', 'supplierabn', 'abn']);
  mapped.supplier_email = getValue(['supplier_email', 'supplieremail', 'email']);
  mapped.customer_name = getValue(['customer_name', 'customername', 'customer']);
  mapped.customer_abn = getValue(['customer_abn', 'customerabn']);
  mapped.total = parseFloat(getValue(['total', 'amount', 'total_amount']) || '0') || null;
  mapped.subtotal = parseFloat(getValue(['subtotal', 'sub_total']) || '0') || null;
  mapped.gst_total = parseFloat(getValue(['gst_total', 'gst', 'tax']) || '0') || null;
  mapped.amount_due = parseFloat(getValue(['amount_due', 'amountdue', 'balance']) || '0') || null;
  mapped.currency = getValue(['currency']) || 'AUD';
  mapped.bank_bsb = getValue(['bank_bsb', 'bsb']);
  mapped.bank_account = getValue(['bank_account', 'bankaccount', 'account']);
  mapped.payment_reference = getValue(['payment_reference', 'reference']);
  mapped.line_1_desc = getValue(['line_1_desc', 'description', 'line_desc']);
  mapped.line_1_qty = parseFloat(getValue(['line_1_qty', 'quantity']) || '0') || null;
  mapped.line_1_unit_price = parseFloat(getValue(['line_1_unit_price', 'unit_price']) || '0') || null;
  mapped.notes = getValue(['notes', 'memo']);
  // file_name already set above
  mapped.file_url = getValue(['file_url', 'fileurl', 'url', 'link']);
  mapped.file_checksum = getValue(['file_checksum', 'checksum', 'hash']);
  mapped.ocr_confidence = parseFloat(getValue(['ocr_confidence', 'confidence']) || '0') || null;
  mapped.ocr_model = getValue(['ocr_model', 'model']);
  mapped.message_id = getValue(['message_id', 'messageid']);
  
  // Always set source to postal_ocr for these migrations
  mapped.source = 'postal_ocr';
  
  // Generate file_checksum if missing but we have file_name
  if (!mapped.file_checksum && mapped.file_name) {
    const hash = crypto.createHash('sha256');
    hash.update(mapped.file_name + (mapped.invoice_number || '') + (mapped.total || ''));
    mapped.file_checksum = hash.digest('hex');
  }

  return mapped;
}

function validateRow(row: any): { valid: boolean; errors: string[]; warnings?: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!row.supplier_name) {
    errors.push('Missing supplier_name');
  }

  // Check if total exists and is valid
  if (!row.total) {
    errors.push('Missing or invalid total');
  } else if (parseFloat(row.total) === 0) {
    // Zero dollar invoices need client review
    errors.push('Zero dollar amount - requires client verification');
    warnings.push('Invoice shows $0.00 total payable');
  } else if (parseFloat(row.total) < 0) {
    errors.push('Negative total amount');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

async function checkDuplicate(row: any): Promise<{ isDuplicate: boolean; existingId?: string }> {
  let query = supabase.from(tableName).select('invoice_number').limit(1);

  if (row.file_checksum) {
    query = query.eq('file_checksum', row.file_checksum);
  } else if (row.invoice_number) {
    query = query.eq('invoice_number', row.invoice_number).eq('source', 'postal_ocr');
  } else {
    // Can't check for duplicates without checksum or invoice number
    return { isDuplicate: false };
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.warn(`Warning: Duplicate check failed: ${error.message}`);
    return { isDuplicate: false };
  }

  return {
    isDuplicate: !!data,
    existingId: data?.invoice_number
  };
}

async function insertInvoice(row: any): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from(tableName)
    .insert({
      ...row,
      created_at: new Date().toISOString()
    })
    .select('invoice_number')
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data?.invoice_number };
}

async function logIngest(params: {
  fileName: string;
  fileChecksum: string | null;
  status: 'processed' | 'skipped_duplicate' | 'exception';
  reason?: string;
  invoiceNumber?: string | null;
  supabaseId?: string | null;
}) {
  await supabase.from('postal_ingest_log').insert({
    file_name: params.fileName,
    file_checksum: params.fileChecksum,
    status: params.status,
    reason: params.reason || null,
    invoice_number: params.invoiceNumber || null,
    supabase_id: params.supabaseId || null,
    execution_id: `migration-${new Date().toISOString()}`,
    created_at: new Date().toISOString()
  });
}

async function main() {
  console.log('Postal Invoice Migration to Supabase');
  console.log('='.repeat(80));
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No data will be inserted\n');
  } else {
    console.log('⚠️  PRODUCTION MODE - Data will be inserted!\n');
  }

  if (limit > 0) {
    console.log(`📊 Processing limited to first ${limit} rows\n`);
  }

  const timestamp = new Date().toISOString().split('T')[0];

  // Get Excel data
  console.log('Fetching Excel data...');
  const token = await getAccessToken();
  const excelData = await getExcelData(token);
  console.log(`✅ Retrieved ${excelData.rows.length} rows from Excel`);

  // Parse and map rows
  console.log('\nMapping Excel rows to Supabase schema...');
  let rows = excelData.rows.map((row: any) => {
    const parsed = parseRow(excelData.headers, row.values[0]);
    return mapExcelToSupabase(parsed);
  });

  if (limit > 0) {
    rows = rows.slice(0, limit);
  }

  console.log(`✅ Mapped ${rows.length} rows`);

  // Process rows
  const stats = {
    total: rows.length,
    valid: 0,
    invalid: 0,
    duplicates: 0,
    inserted: 0,
    failed: 0
  };

  const results: any[] = [];

  console.log('\n' + '-'.repeat(80));
  console.log('PROCESSING ROWS:');
  console.log('-'.repeat(80));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const fileName = row.file_name || `row-${rowNum}`;

    console.log(`\n[${rowNum}/${rows.length}] ${fileName}`);

    // Validate
    const validation = validateRow(row);
    if (!validation.valid) {
      console.log(`  ❌ Invalid: ${validation.errors.join(', ')}`);
      stats.invalid++;
      results.push({
        rowNum,
        fileName,
        status: 'invalid',
        errors: validation.errors
      });

      if (!dryRun) {
        await logIngest({
          fileName,
          fileChecksum: row.file_checksum,
          status: 'exception',
          reason: validation.errors.join(', '),
          invoiceNumber: row.invoice_number
        });
      }
      continue;
    }

    stats.valid++;

    // Check for duplicates
    const dupCheck = await checkDuplicate(row);
    if (dupCheck.isDuplicate) {
      console.log(`  🔁 Duplicate (existing ID: ${dupCheck.existingId})`);
      stats.duplicates++;
      results.push({
        rowNum,
        fileName,
        status: 'duplicate',
        existingId: dupCheck.existingId
      });

      if (!dryRun) {
        await logIngest({
          fileName,
          fileChecksum: row.file_checksum,
          status: 'skipped_duplicate',
          invoiceNumber: row.invoice_number,
          supabaseId: dupCheck.existingId
        });
      }
      continue;
    }

    // Insert
    if (dryRun) {
      console.log(`  ✅ Would insert (invoice: ${row.invoice_number || 'N/A'})`);
      stats.inserted++;
      results.push({
        rowNum,
        fileName,
        status: 'would_insert',
        invoiceNumber: row.invoice_number
      });
    } else {
      const insertResult = await insertInvoice(row);
      if (insertResult.success) {
        console.log(`  ✅ Inserted (ID: ${insertResult.id})`);
        stats.inserted++;
        results.push({
          rowNum,
          fileName,
          status: 'inserted',
          id: insertResult.id,
          invoiceNumber: row.invoice_number
        });

        await logIngest({
          fileName,
          fileChecksum: row.file_checksum,
          status: 'processed',
          invoiceNumber: row.invoice_number,
          supabaseId: insertResult.id
        });
      } else {
        console.log(`  ❌ Failed: ${insertResult.error}`);
        stats.failed++;
        results.push({
          rowNum,
          fileName,
          status: 'failed',
          error: insertResult.error
        });

        await logIngest({
          fileName,
          fileChecksum: row.file_checksum,
          status: 'exception',
          reason: insertResult.error,
          invoiceNumber: row.invoice_number
        });
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('MIGRATION SUMMARY:');
  console.log('='.repeat(80));
  console.log(`Total rows: ${stats.total}`);
  console.log(`Valid: ${stats.valid}`);
  console.log(`Invalid: ${stats.invalid}`);
  console.log(`Duplicates: ${stats.duplicates}`);
  console.log(`Inserted: ${stats.inserted}`);
  console.log(`Failed: ${stats.failed}`);

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    dryRun,
    limit: limit || null,
    stats,
    results
  };

  const reportPath = `reports/postal-migration-${dryRun ? 'dry-run-' : ''}${timestamp}.json`;
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Migration report saved to: ${reportPath}`);

  if (dryRun) {
    console.log('\n🔍 Dry run complete. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Migration complete!');
    
    if (stats.failed > 0 || stats.invalid > 0) {
      console.log('\n⚠️  Some rows failed or were invalid. Check the report for details.');
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

