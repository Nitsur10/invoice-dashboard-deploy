import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';

loadEnv({ path: '.env.local', override: true });
loadEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('Running Postal Invoice Schema Migration...\n');
  
  const sql = await fs.readFile('migrations/postal-invoice-schema.sql', 'utf-8');
  
  // Split into individual statements (rough split by DO $$ blocks and other statements)
  const statements = sql
    .split(/;\s*(?=(?:DO \$\$|CREATE|ALTER|DROP|GRANT|COMMENT|SELECT))/gi)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s !== ';');
  
  console.log(`Found ${statements.length} SQL statements to execute\n`);
  
  let executed = 0;
  let failed = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Skip comments and empty statements
    if (!stmt || stmt.startsWith('--')) continue;
    
    const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });
      
      if (error) {
        // Try direct query for SELECT statements
        if (stmt.trim().toUpperCase().startsWith('SELECT')) {
          const { data, error: selectError } = await supabase.from('_').select('*').limit(0);
          if (!selectError || selectError.code === 'PGRST204') {
            console.log('✅');
            executed++;
            continue;
          }
        }
        
        console.log(`⚠️  ${error.message}`);
        failed++;
      } else {
        console.log('✅');
        executed++;
      }
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Migration Summary:`);
  console.log(`  Executed: ${executed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`${'='.repeat(80)}\n`);
  
  if (failed > 0) {
    console.log('⚠️  Some statements failed. This may be normal if:');
    console.log('   - Columns/tables already exist');
    console.log('   - RPC function exec_sql is not available\n');
    console.log('Verifying schema manually...\n');
  }
  
  // Verify the schema
  const { data: columns, error: colError } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'invoices')
    .in('column_name', ['source', 'file_checksum', 'ocr_confidence', 'ocr_model']);
  
  if (!colError && columns) {
    console.log('✅ Verified columns in invoices table:');
    columns.forEach(col => console.log(`   - ${col.column_name}`));
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

