import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/server/supabase-admin'
import { getRequiredEnv } from '@/lib/env'

const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

// Valid status transitions to prevent invalid changes
// Align backend transitions with Kanban UI rules
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_review', 'overdue'],
  in_review: ['approved', 'pending', 'overdue'],
  approved: ['paid', 'in_review'],
  paid: [],
  overdue: ['in_review', 'approved', 'paid'],
}

// PATCH /api/invoices/[id]/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status: newStatus } = body

    if (!newStatus) {
      return NextResponse.json(
        { code: 'INVALID_BODY', message: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status value
    const validStatuses = ['pending', 'in_review', 'approved', 'paid', 'overdue']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { code: 'INVALID_STATUS', message: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Create authenticated Supabase client to get user info
    const response = NextResponse.json({ status: 'ok' })
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    })

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current invoice to check existing status
    // Use invoiceNumber if id is empty
    const columnToFetch = id && id.trim() !== '' ? 'id' : 'invoiceNumber';
    const valueToFetch = id && id.trim() !== '' ? id : id;

    const { data: currentInvoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('id, invoiceNumber, status, payment_status')
      .eq(columnToFetch, valueToFetch)
      .single()

    if (fetchError || !currentInvoice) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Get current status (check both status and payment_status columns)
    const currentStatus = currentInvoice.status || currentInvoice.payment_status || 'pending'

    // Validate status transition
    if (currentStatus !== newStatus && VALID_STATUS_TRANSITIONS[currentStatus] &&
        !VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus)) {
      return NextResponse.json(
        {
          code: 'INVALID_TRANSITION',
          message: `Cannot change status from ${currentStatus} to ${newStatus}`,
          allowedTransitions: VALID_STATUS_TRANSITIONS[currentStatus]
        },
        { status: 400 }
      )
    }

    // Skip update if status is the same
    if (currentStatus === newStatus) {
      return NextResponse.json({
        success: true,
        invoice: currentInvoice,
        message: 'Status unchanged'
      })
    }

    // Start transaction-like operations
    // 1. Update invoice status
    const { data: updatedInvoice, error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({
        status: newStatus,
        payment_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq(currentInvoice.id ? 'id' : 'invoiceNumber', currentInvoice.id || currentInvoice.invoiceNumber)
      .select('*')
      .single()

    if (updateError || !updatedInvoice) {
      return NextResponse.json(
        { code: 'UPDATE_FAILED', message: 'Failed to update invoice status' },
        { status: 500 }
      )
    }

    // 2. Create audit log entry
    const auditLogData = {
      invoice_id: id,
      old_status: currentStatus,
      new_status: newStatus,
      user_id: user.id,
      user_email: user.email,
      action_type: 'status_change',
      metadata: {
        timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
      }
    }

    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert(auditLogData)

    if (auditError) {
      console.error('Failed to create audit log:', auditError)
      // Don't fail the request if audit log fails, but log the error
    }

    // Return success response
    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      auditLog: auditError ? null : auditLogData
    })

  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json(
      { code: 'SERVER_ERROR', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/invoices/[id]/status - Get status history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get current invoice status
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('id, status, payment_status')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Get audit history
    const { data: auditLogs, error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('invoice_id', id)
      .eq('action_type', 'status_change')
      .order('created_at', { ascending: false })

    if (auditError) {
      console.error('Failed to fetch audit logs:', auditError)
      // Return invoice status even if audit logs fail
      return NextResponse.json({
        currentStatus: invoice.status || invoice.payment_status,
        history: []
      })
    }

    return NextResponse.json({
      currentStatus: invoice.status || invoice.payment_status,
      history: auditLogs || []
    })

  } catch (error) {
    console.error('Status history error:', error)
    return NextResponse.json(
      { code: 'SERVER_ERROR', message: 'Internal server error' },
      { status: 500 }
    )
  }
}