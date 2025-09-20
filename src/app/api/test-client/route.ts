import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test our lazy initialization
    const { getSupabaseBrowserClient } = await import('@/lib/supabase-browser')
    
    const client = getSupabaseBrowserClient()
    
    // Test a simple operation
    const { data, error } = await client.auth.getSession()
    
    return NextResponse.json({
      success: true,
      hasClient: !!client,
      sessionError: error?.message || null,
      environment: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
      }
    })
  }
}