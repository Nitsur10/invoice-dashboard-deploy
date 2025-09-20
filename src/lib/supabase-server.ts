import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
  }
  
  return { url: supabaseUrl, key: supabaseAnonKey }
}

export function getSupabaseServerComponentClient() {
  const cookieStore = cookies()
  const headerStore = headers()
  const { url, key } = getSupabaseConfig()

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set() {
        // noop - server components cannot set cookies
      },
      remove() {
        // noop - server components cannot remove cookies
      },
    },
    headers: {
      get(key: string) {
        return headerStore.get(key) ?? undefined
      },
    },
  })
}

export function getSupabaseRouteHandlerClient(req: NextRequest, res: NextResponse) {
  const { url, key } = getSupabaseConfig()
  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        res.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        res.cookies.set({ name, value: '', ...options, maxAge: 0 })
      },
    },
    headers: {
      get(key: string) {
        return req.headers.get(key) ?? undefined
      },
    },
  })
}
