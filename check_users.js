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

async function checkUsers() {
  try {
    console.log('Querying Supabase auth.users table...\n');

    // Get all users from auth.users table
    const { data, error, count } = await supabase.auth.admin.listUsers({
      perPage: 1000
    });

    if (error) {
      console.error('Error fetching users:', error.message);
      process.exit(1);
    }

    console.log(`Total users configured: ${data.users.length}\n`);

    if (data.users.length > 0) {
      console.log('User Details:');
      console.log('='.repeat(80));

      data.users.forEach((user, index) => {
        console.log(`\n${index + 1}. User ID: ${user.id}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
        console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   Provider: ${user.app_metadata?.provider || 'email'}`);
      });

      console.log('\n' + '='.repeat(80));
    } else {
      console.log('No users found in the system.');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

checkUsers();
