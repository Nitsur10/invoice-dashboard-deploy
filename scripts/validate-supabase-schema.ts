import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';

loadEnv({ path: '.env.local', override: true });
loadEnv();

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var ${key}`);
  }
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const tableName = process.env.SUPABASE_INVOICES_TABLE || 'invoices';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Required columns for postal invoice migration
const REQUIRED_COLUMNS = [
  { name: 'id', type: 'uuid', nullable: false },
  { name: 'invoice_number', type: 'text', nullable: true },
  { name: 'invoice_date', type: 'text', nullable: true },
  { name: 'due_date', type: 'text', nullable: true },
  { name: 'supplier_name', type: 'text', nullable: true },
  { name: 'supplier_abn', type: 'text', nullable: true },
  { name: 'supplier_email', type: 'text', nullable: true },
  { name: 'customer_name', type: 'text', nullable: true },
  { name: 'customer_abn', type: 'text', nullable: true },
  { name: 'total', type: 'numeric', nullable: true },
  { name: 'subtotal', type: 'numeric', nullable: true },
  { name: 'gst_total', type: 'numeric', nullable: true },
  { name: 'amount_due', type: 'numeric', nullable: true },
  { name: 'currency', type: 'text', nullable: true },
  { name: 'bank_bsb', type: 'text', nullable: true },
  { name: 'bank_account', type: 'text', nullable: true },
  { name: 'payment_reference', type: 'text', nullable: true },
  { name: 'line_1_desc', type: 'text', nullable: true },
  { name: 'line_1_qty', type: 'numeric', nullable: true },
  { name: 'line_1_unit_price', type: 'numeric', nullable: true },
  { name: 'notes', type: 'text', nullable: true },
  { name: 'source', type: 'text', nullable: true },
  { name: 'file_checksum', type: 'text', nullable: true },
  { name: 'file_name', type: 'text', nullable: true },
  { name: 'file_url', type: 'text', nullable: true },
  { name: 'ocr_confidence', type: 'numeric', nullable: true },
  { name: 'ocr_model', type: 'text', nullable: true },
  { name: 'message_id', type: 'text', nullable: true },
  { name: 'created_at', type: 'timestamp with time zone', nullable: true }
];

async function getTableSchema(tableName: string) {
  const { data, error } = await supabase.rpc('get_table_columns', {
    table_name: tableName
  }).select();

  // If RPC doesn't exist, query information_schema directly
  if (error) {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = '${tableName}'
      ORDER BY ordinal_position;
    `;

    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.columns' as any)
      .select('column_name, data_type, is_nullable, column_default');

    if (schemaError) {
      // Try raw SQL query
      console.log('Attempting direct SQL query for schema...');
      return null;
    }

    return schemaData;
  }

  return data;
}

async function checkTableExists(tableName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(tableName)
    .select('id')
    .limit(1);

  return !error || error.code !== 'PGRST204';
}

async function getExistingColumns(tableName: string) {
  // Try to get one row to see what columns exist
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (error) {
    throw new Error(`Failed to query table ${tableName}: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.log(`⚠️  Table ${tableName} exists but is empty. Cannot determine schema from data.`);
    return [];
  }

  return Object.keys(data[0]);
}

async function checkIndexes(tableName: string) {
  // Query pg_indexes to check for indexes
  const query = `
    SELECT 
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = '${tableName}'
    ORDER BY indexname;
  `;

  try {
    // This requires direct SQL execution which may not be available via REST API
    console.log('Note: Index checking requires direct database access');
    return [];
  } catch (error) {
    console.log('Unable to check indexes via REST API');
    return [];
  }
}

async function checkPostalIngestLogTable(): Promise<boolean> {
  const { error } = await supabase
    .from('postal_ingest_log')
    .select('id')
    .limit(1);

  return !error || error.code !== 'PGRST204';
}

async function main() {
  console.log('Supabase Schema Validation');
  console.log('='.repeat(80));
  console.log(`\nTarget table: ${tableName}`);
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  // Check if table exists
  console.log('Checking table existence...');
  const tableExists = await checkTableExists(tableName);

  if (!tableExists) {
    console.error(`❌ Table "${tableName}" does not exist!`);
    process.exit(1);
  }

  console.log(`✅ Table "${tableName}" exists`);

  // Get existing columns
  console.log('\nRetrieving table schema...');
  const existingColumns = await getExistingColumns(tableName);
  console.log(`✅ Found ${existingColumns.length} columns`);

  // Check for required columns
  console.log('\n' + '-'.repeat(80));
  console.log('COLUMN VALIDATION:');
  console.log('-'.repeat(80));

  const missingColumns = [];
  const existingRequiredColumns = [];

  for (const required of REQUIRED_COLUMNS) {
    const exists = existingColumns.some(col => 
      col.toLowerCase() === required.name.toLowerCase()
    );

    if (exists) {
      existingRequiredColumns.push(required.name);
      console.log(`✅ ${required.name}`);
    } else {
      missingColumns.push(required);
      console.log(`❌ ${required.name} (MISSING)`);
    }
  }

  // Check for postal_ingest_log table
  console.log('\n' + '-'.repeat(80));
  console.log('POSTAL_INGEST_LOG TABLE:');
  console.log('-'.repeat(80));

  const postalLogExists = await checkPostalIngestLogTable();
  if (postalLogExists) {
    console.log('✅ postal_ingest_log table exists');
  } else {
    console.log('❌ postal_ingest_log table does NOT exist (needs to be created)');
  }

  // Check for existing postal invoices
  console.log('\n' + '-'.repeat(80));
  console.log('EXISTING POSTAL DATA:');
  console.log('-'.repeat(80));

  if (existingColumns.includes('source')) {
    const { data: postalInvoices, error } = await supabase
      .from(tableName)
      .select('id, invoice_number, source')
      .eq('source', 'postal_ocr')
      .limit(10);

    if (error) {
      console.log(`⚠️  Unable to query postal invoices: ${error.message}`);
    } else {
      console.log(`Found ${postalInvoices?.length || 0} existing postal_ocr invoices`);
      if (postalInvoices && postalInvoices.length > 0) {
        console.log('\nSample postal invoices:');
        postalInvoices.slice(0, 5).forEach((inv: any) => {
          console.log(`  - ${inv.invoice_number || 'NO_NUMBER'} (ID: ${inv.id})`);
        });
      }
    }
  } else {
    console.log('⚠️  "source" column not found - cannot check for existing postal invoices');
  }

  // Generate report
  const timestamp = new Date().toISOString().split('T')[0];
  const report = {
    timestamp: new Date().toISOString(),
    supabaseUrl,
    tableName,
    validation: {
      tableExists,
      totalColumns: existingColumns.length,
      requiredColumns: REQUIRED_COLUMNS.length,
      existingRequiredColumns: existingRequiredColumns.length,
      missingColumns: missingColumns.length,
      postalIngestLogExists: postalLogExists
    },
    existingColumns,
    missingColumns: missingColumns.map(c => c.name),
    recommendations: []
  };

  // Add recommendations
  if (missingColumns.length > 0) {
    report.recommendations.push(
      'Run the migration SQL script to add missing columns'
    );
  }

  if (!postalLogExists) {
    report.recommendations.push(
      'Create postal_ingest_log table using the migration script'
    );
  }

  if (missingColumns.length === 0 && postalLogExists) {
    report.recommendations.push(
      'Schema is ready for postal invoice migration!'
    );
  }

  // Save report
  const reportPath = `reports/supabase-schema-validation-${timestamp}.json`;
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Validation report saved to: ${reportPath}`);

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('VALIDATION SUMMARY:');
  console.log('='.repeat(80));
  console.log(`Table exists: ${tableExists ? '✅' : '❌'}`);
  console.log(`Required columns present: ${existingRequiredColumns.length}/${REQUIRED_COLUMNS.length}`);
  console.log(`Missing columns: ${missingColumns.length}`);
  console.log(`postal_ingest_log table: ${postalLogExists ? '✅' : '❌'}`);

  if (report.recommendations.length > 0) {
    console.log('\n📋 RECOMMENDATIONS:');
    report.recommendations.forEach((rec, idx) => {
      console.log(`${idx + 1}. ${rec}`);
    });
  }

  if (missingColumns.length > 0 || !postalLogExists) {
    console.log('\n⚠️  Schema requires updates before migration can proceed.');
    console.log('   See migrations/postal-invoice-schema.sql for required changes.');
    process.exit(1);
  } else {
    console.log('\n✅ Schema validation passed! Ready for migration.');
  }
}

main().catch((err) => {
  console.error('Schema validation failed:', err);
  process.exit(1);
});

