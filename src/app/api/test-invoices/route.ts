import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing invoice API...')

    // Test 1: Check if we can connect to Supabase with a simple query
    const { data: testConnection, error: connectionError } = await supabaseAdmin
      .from('invoices')
      .select('*', { count: 'exact', head: true })

    if (connectionError) {
      console.error('Supabase connection error:', connectionError)
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: connectionError
      })
    }

    // Test 2: Get all invoices to see what we have
    const { data: allInvoices, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .limit(20)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch invoices',
        details: fetchError
      })
    }

    // Test 3: Check specifically for test invoices
    const { data: testInvoices, error: testError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .ilike('invoice_number', 'TEST-%')

    if (testError) {
      console.error('Test invoice error:', testError)
    }

    return NextResponse.json({
      success: true,
      connection: 'OK',
      totalInvoices: allInvoices?.length || 0,
      testInvoices: testInvoices?.length || 0,
      sampleInvoice: allInvoices?.[0] || null,
      allInvoices: allInvoices || [],
      testInvoicesData: testInvoices || [],
      connectionTest: testConnection,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}