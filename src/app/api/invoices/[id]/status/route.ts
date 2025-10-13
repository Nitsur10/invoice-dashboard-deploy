import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/server/supabase-admin'
import { getRequiredEnv } from '@/lib/env'
import { verifyAPIAuth } from '@/lib/server/auth'
import { invoiceStatusUpdateSchema, invoiceIdSchema } from '@/lib/schemas/api'

const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

// Valid status transitions to prevent invalid changes
// Allow more flexible transitions for development/testing
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_review', 'overdue', 'approved', 'paid'],
  in_review: ['approved', 'pending', 'overdue', 'paid'],
  approved: ['paid', 'in_review', 'pending', 'overdue'],
  paid: ['in_review', 'approved', 'pending', 'overdue'],
  overdue: ['in_review', 'approved', 'paid', 'pending'],
}

// PATCH /api/invoices/[id]/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify authentication first
  const authResult = await verifyAPIAuth(request);
  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error, code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const authenticatedUser = authResult.user!;
  try {
    // Validate parameters
    const paramsResult = invoiceIdSchema.safeParse(await params)
    if (!paramsResult.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid invoice ID',
          errors: paramsResult.error.issues
        },
        { status: 400 }
      )
    }

    const { id } = paramsResult.data
    const body = await request.json()

    // Validate request body
    const bodyResult = invoiceStatusUpdateSchema.safeParse(body)
    if (!bodyResult.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          errors: bodyResult.error.issues
        },
        { status: 400 }
      )
    }

    const { status: newStatus } = bodyResult.data

    // Validate status value
    const validStatuses = ['pending', 'in_review', 'approved', 'paid', 'overdue']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { code: 'INVALID_STATUS', message: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Check if Supabase is configured
    let hasSupabase = true
    try {
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
    } catch {
      hasSupabase = false
    }

    if (!hasSupabase) {
      return NextResponse.json({
        code: 'NOT_IMPLEMENTED',
        message: 'Database functionality not configured for this deployment. Please configure Supabase environment variables.',
        success: true,
        invoice: { invoiceNumber: id, status: newStatus },
        note: 'Mock update - no database changes made'
      })
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

    // Use the authenticated user from the middleware
    const user = {
      id: authenticatedUser.id,
      email: authenticatedUser.email
    }

    // Get current invoice to check existing status
    // Detect if the parameter is an invoice number (contains INV-, or is numeric but not a typical ID)
    const isInvoiceNumber = id && (
      id.startsWith('INV-') ||
      /^\d{4,}$/.test(id)  // Numbers with 4+ digits are likely invoice numbers
    );
    const columnToFetch = isInvoiceNumber ? 'invoice_number' : 'id';
    const valueToFetch = id;

    const { data: currentInvoice, error: fetchError } = await supabaseAdmin
      .from('Invoice')
      .select('invoice_number, status')
      .eq(columnToFetch, valueToFetch)
      .single()

    if (fetchError || !currentInvoice) {
      console.error('Invoice lookup failed:', {
        columnToFetch,
        valueToFetch,
        fetchError,
        currentInvoice
      })
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'Invoice not found',
          debug: { columnToFetch, valueToFetch, fetchError }
        },
        { status: 404 }
      )
    }

    // Get current status
    const currentStatus = currentInvoice.status || 'pending'

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
      .from('Invoice')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq(columnToFetch, valueToFetch)
      .select('invoice_number, status')
      .single()

    if (updateError || !updatedInvoice) {
      console.error('Invoice update failed:', {
        updateError,
        updatedInvoice,
        columnToFetch,
        valueToFetch,
        newStatus
      })
      return NextResponse.json(
        {
          code: 'UPDATE_FAILED',
          message: 'Failed to update invoice status',
          debug: { updateError, columnToFetch, valueToFetch, newStatus }
        },
        { status: 500 }
      )
    }

    // 2. Create audit log entry
    const auditLogData = {
      entityType: 'invoice',
      entityId: updatedInvoice.invoice_number || id,
      action: 'STATUS_CHANGE',
      userId: user.id,
      changes: {
        old_status: currentStatus,
        new_status: newStatus,
        user_email: user.email,
        timestamp: new Date().toISOString()
      },
      ipAddress: request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    console.log('Creating audit log:', auditLogData)
    const { error: auditError } = await supabaseAdmin
      .from('AuditLog')
      .insert(auditLogData)

    if (auditError) {
      console.error('Failed to create audit log:', {
        auditError,
        auditLogData,
        table: 'AuditLog'
      })
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