import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const { email, password } = await request.json()
  
  try {
    console.log('🔐 Testing login with server-side client...')
    
    // Create client with current environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('📝 Environment check:')
    console.log('  URL:', supabaseUrl ? 'SET' : 'NOT SET')
    console.log('  Key length:', supabaseAnonKey?.length || 0)
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        debug: { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey }
      })
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    console.log('🚀 Attempting login for:', email)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      console.error('❌ Login error:', error.message)
      return NextResponse.json({
        success: false,
        error: error.message,
        debug: { code: error.status, name: error.name }
      })
    }
    
    console.log('✅ Login successful for:', email)
    return NextResponse.json({
      success: true,
      user: data.user?.email,
      session: !!data.session
    })
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}