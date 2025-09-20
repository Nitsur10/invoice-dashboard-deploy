'use client'

import { useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'

let supabaseBrowserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (!supabaseBrowserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
    }
    
    supabaseBrowserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseBrowserClient
}

export function createSupabaseBrowserClient() {
  return getSupabaseBrowserClient()
}

export function useSupabaseBrowserClient() {
  return useMemo(() => getSupabaseBrowserClient(), [])
}
