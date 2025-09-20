import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Server-only Supabase admin client with service role key
// This bypasses RLS and should only be used in API routes
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);