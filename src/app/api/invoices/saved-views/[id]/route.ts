import { NextRequest, NextResponse } from 'next/server'

import { isSupabaseConfigured } from '@/lib/server/env'
import { supabaseAdmin } from '@/lib/server/supabase-admin'
import type { InvoiceFiltersState } from '@/types/invoice-filters'
import { serializeInvoiceFilters } from '@/types/invoice-filters'

const FALLBACK_USER_ID = '00000000-0000-0000-0000-000000000000'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ code: 'SUPABASE_DISABLED', message: 'Supabase not configured' }, { status: 503 })
  }

  const userId = resolveUserId(request)
  const { id } = params

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (typeof body?.name === 'string' && body.name.trim()) {
      updates.name = body.name.trim()
    }

    if (body?.filters && typeof body.filters === 'object') {
      updates.filters = serializeInvoiceFilters(body.filters as InvoiceFiltersState)
    }

    if (typeof body?.isDefault === 'boolean' && body.isDefault) {
      await supabaseAdmin
        .from('invoice_saved_views')
        .update({ is_default: false })
        .eq('user_id', userId)
      updates.is_default = true
    } else if (typeof body?.isDefault === 'boolean') {
      updates.is_default = body.isDefault
    }

    const { data, error } = await supabaseAdmin
      .from('invoice_saved_views')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) {
      console.error('Failed to update saved view', error)
      return NextResponse.json({ code: 'UPDATE_FAILED', message: 'Unable to update saved view' }, { status: 500 })
    }

    return NextResponse.json(mapSavedViewRow(data))
  } catch (error) {
    console.error('Unexpected error updating saved view', error)
    return NextResponse.json({ code: 'SERVER_ERROR', message: 'Failed to update saved view' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ code: 'SUPABASE_DISABLED', message: 'Supabase not configured' }, { status: 503 })
  }

  const userId = resolveUserId(request)
  const { id } = params

  try {
    const { error } = await supabaseAdmin
      .from('invoice_saved_views')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to delete saved view', error)
      return NextResponse.json({ code: 'DELETE_FAILED', message: 'Unable to delete saved view' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error deleting saved view', error)
    return NextResponse.json({ code: 'SERVER_ERROR', message: 'Failed to delete saved view' }, { status: 500 })
  }
}

function resolveUserId(request: NextRequest): string {
  return (
    request.headers.get('x-rpd-user-id') ||
    request.headers.get('x-user-id') ||
    process.env.SUPABASE_DEFAULT_USER_ID ||
    FALLBACK_USER_ID
  )
}

function mapSavedViewRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    filters: row.filters as InvoiceFiltersState,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
