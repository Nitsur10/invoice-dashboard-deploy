import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabase-admin'

// GET /api/invoices/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json(
        { code: 'SERVER_ERROR', message: 'Failed to get invoice' },
        { status: 500 }
      )
    }
    if (!data) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { code: 'SERVER_ERROR', message: 'Failed to get invoice' },
      { status: 500 }
    )
  }
}

// PATCH /api/invoices/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const allowed = ['paymentStatus', 'category', 'description']
    const updates: any = {}
    if (body.paymentStatus) updates.payment_status = String(body.paymentStatus).toLowerCase()
    if (body.category) updates.category = body.category
    if (body.description) updates.description = body.description

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { code: 'INVALID_BODY', message: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { code: 'SERVER_ERROR', message: 'Failed to update invoice' },
        { status: 500 }
      )
    }
    if (!data) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, invoice: data })
  } catch (error) {
    return NextResponse.json(
      { code: 'SERVER_ERROR', message: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

// DELETE /api/invoices/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { error, count } = await supabaseAdmin
      .from('invoices')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { code: 'SERVER_ERROR', message: 'Failed to delete invoice' },
        { status: 500 }
      )
    }
    if (!count) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Invoice not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { code: 'SERVER_ERROR', message: 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}

