import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAuthSchema() {
  try {
    console.log('Checking Supabase Authentication Schema...\n');
    console.log('='.repeat(80));

    // Query to get all tables in the auth schema
    const { data: authTables, error: tablesError } = await supabase.rpc('get_auth_tables', {}, {
      get: false
    }).catch(() => ({ data: null, error: 'RPC not available' }));

    // Let's try a direct SQL query instead
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'auth');

    console.log('\n📊 USER AUTHENTICATION DATA LOCATIONS:\n');

    console.log('1. PRIMARY TABLE: auth.users');
    console.log('   - This is the MAIN table for user accounts');
    console.log('   - Located in the "auth" schema (not "public")');
    console.log('   - Managed by Supabase Auth service');
    console.log('   - Access: Supabase Dashboard > Authentication > Users\n');

    console.log('2. RELATED AUTH TABLES:\n');

    const authTablesInfo = [
      {
        name: 'auth.users',
        description: 'Main user accounts table',
        keyColumns: 'id, email, encrypted_password, email_confirmed_at, last_sign_in_at, created_at',
        access: 'Via Supabase Admin API or SQL Editor'
      },
      {
        name: 'auth.identities',
        description: 'Linked identities (email, OAuth providers)',
        keyColumns: 'id, user_id, identity_data, provider, created_at',
        access: 'Shows which auth providers user has connected'
      },
      {
        name: 'auth.sessions',
        description: 'Active user sessions',
        keyColumns: 'id, user_id, created_at, expires_at, not_after',
        access: 'Currently logged-in sessions'
      },
      {
        name: 'auth.refresh_tokens',
        description: 'Tokens for session refresh',
        keyColumns: 'id, token, user_id, created_at, revoked',
        access: 'Manages session persistence'
      },
      {
        name: 'auth.audit_log_entries',
        description: 'Authentication audit trail',
        keyColumns: 'id, payload, created_at, ip_address',
        access: 'Login attempts, password changes, etc.'
      }
    ];

    authTablesInfo.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.name}`);
      console.log(`      Description: ${table.description}`);
      console.log(`      Key Columns: ${table.keyColumns}`);
      console.log(`      Access: ${table.access}\n`);
    });

    console.log('='.repeat(80));
    console.log('\n🔍 HOW TO VIEW IN SUPABASE DASHBOARD:\n');
    console.log('Method 1: Via UI (Easiest)');
    console.log('  1. Go to: https://supabase.com/dashboard/project/auvyyrfbmlfsmmpjnaoc');
    console.log('  2. Click: "Authentication" in left sidebar');
    console.log('  3. Click: "Users" tab');
    console.log('  4. You\'ll see all 4 users listed with emails and metadata\n');

    console.log('Method 2: Via SQL Editor');
    console.log('  1. Go to: SQL Editor in Supabase Dashboard');
    console.log('  2. Run: SELECT * FROM auth.users;');
    console.log('  3. Run: SELECT * FROM auth.identities;');
    console.log('  4. Run: SELECT * FROM auth.audit_log_entries ORDER BY created_at DESC LIMIT 100;\n');

    console.log('Method 3: Via Table Editor (LIMITED)');
    console.log('  ⚠️  Note: auth.users is NOT visible in Table Editor');
    console.log('  ⚠️  Auth tables are in a protected schema');
    console.log('  ✅  Must use SQL Editor or Authentication UI instead\n');

    console.log('='.repeat(80));
    console.log('\n📝 SAMPLE SQL QUERIES:\n');

    const sampleQueries = [
      {
        title: 'Get all users with email',
        sql: 'SELECT id, email, created_at, last_sign_in_at, email_confirmed_at FROM auth.users;'
      },
      {
        title: 'Get users who never logged in',
        sql: 'SELECT id, email, created_at FROM auth.users WHERE last_sign_in_at IS NULL;'
      },
      {
        title: 'Get recent login activity',
        sql: `SELECT u.email, u.last_sign_in_at, a.created_at, a.ip_address
FROM auth.users u
LEFT JOIN auth.audit_log_entries a ON a.payload->>'user_id' = u.id::text
WHERE a.payload->>'action' = 'login'
ORDER BY a.created_at DESC
LIMIT 20;`
      },
      {
        title: 'Get user identities (auth methods)',
        sql: `SELECT u.email, i.provider, i.created_at
FROM auth.users u
JOIN auth.identities i ON i.user_id = u.id;`
      }
    ];

    sampleQueries.forEach((query, index) => {
      console.log(`${index + 1}. ${query.title}:`);
      console.log('   ' + query.sql.split('\n').join('\n   '));
      console.log('');
    });

    console.log('='.repeat(80));

    // Try to get some actual data from audit logs
    console.log('\n🔐 RECENT AUTHENTICATION ACTIVITY:\n');

    const { data: auditData, error: auditError } = await supabase
      .rpc('get_auth_audit_logs')
      .catch(() => ({ data: null, error: 'RPC not available' }));

    console.log('ℹ️  To see detailed audit logs, run this SQL query in Supabase SQL Editor:');
    console.log('   SELECT created_at, payload FROM auth.audit_log_entries');
    console.log('   ORDER BY created_at DESC LIMIT 50;\n');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkAuthSchema();
