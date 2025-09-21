'use client'

import { useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'

let supabaseBrowserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (!supabaseBrowserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      // Create a mock client for development when env vars are missing
      console.warn('⚠️ Supabase environment variables not configured. Using mock client for development.')

      // Create a minimal mock client that won't crash
      supabaseBrowserClient = {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signOut: async () => ({ error: null }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: { message: 'Database not configured' } }),
              order: () => ({
                limit: () => ({
                  data: [], error: null
                })
              }),
              data: [], error: null
            }),
            order: () => ({
              limit: () => ({
                data: [], error: null
              })
            }),
            data: [], error: null
          }),
          insert: () => ({ data: null, error: { message: 'Database not configured' } }),
          update: () => ({ data: null, error: { message: 'Database not configured' } }),
          delete: () => ({ error: { message: 'Database not configured' } }),
        }),
        storage: {
          from: () => ({
            upload: async () => ({ data: null, error: { message: 'Storage not configured' } }),
            download: async () => ({ data: null, error: { message: 'Storage not configured' } }),
          })
        }
      } as any
    } else {
      supabaseBrowserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
    }
  }
  return supabaseBrowserClient
}

export function createSupabaseBrowserClient() {
  return getSupabaseBrowserClient()
}

export function useSupabaseBrowserClient() {
  return useMemo(() => getSupabaseBrowserClient(), [])
}
