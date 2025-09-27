import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;

/**
 * Get Supabase configuration from environment variables
 * @throws {Error} If required environment variables are missing
 */
function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url && !serviceKey) {
    throw new Error(
      'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
      'See .env.example for setup instructions.'
    );
  }

  if (!url) {
    throw new Error(
      'SUPABASE_URL is not configured. Please set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable.'
    );
  }

  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Please set SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'This key is required for server-side operations that bypass RLS.'
    );
  }

  return { url, serviceKey };
}

/**
 * Get the Supabase admin client instance (singleton)
 * Server-only client with service role key that bypasses RLS
 * Should only be used in API routes
 *
 * @throws {Error} If Supabase is not properly configured
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const { url, serviceKey } = getSupabaseConfig();

    supabaseAdminInstance = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminInstance;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getSupabaseAdmin() function instead for better error handling
 */
export const supabaseAdmin = (() => {
  try {
    return getSupabaseAdmin();
  } catch (error) {
    // In development, we want to fail gracefully to avoid crashes
    // The error will be thrown when the client is actually used
    if (process.env.NODE_ENV === 'development') {
      console.warn('Supabase admin client not configured:', (error as Error).message);
      return null as any; // Return null but type as SupabaseClient for compatibility
    }
    throw error;
  }
})();