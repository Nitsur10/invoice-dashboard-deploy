import { NextRequest, NextResponse } from 'next/server'

import { isSupabaseConfigured } from '@/lib/server/env'
import { supabaseAdmin } from '@/lib/server/supabase-admin'
import type { InvoiceFiltersState } from '@/types/invoice-filters'
import { serializeInvoiceFilters } from '@/types/invoice-filters'

const FALLBACK_USER_ID = '00000000-0000-0000-0000-000000000000'

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ views: [] })
  }

  const userId = resolveUserId(request)

  try {
    const { data, error } = await supabaseAdmin
      .from('invoice_saved_views')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Failed to load saved views', error)
      return NextResponse.json({ views: [] })
    }

    const views = (data ?? []).map(mapSavedViewRow)
    return NextResponse.json({ views })
  } catch (error) {
    console.error('Unexpected error loading saved views', error)
    return NextResponse.json({ views: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ code: 'SUPABASE_DISABLED', message: 'Supabase not configured' }, { status: 503 })
  }

  const userId = resolveUserId(request)

  try {
    const body = await request.json()
    const name: string | undefined = body?.name
    const filters: InvoiceFiltersState | undefined = body?.filters
    const isDefault: boolean = Boolean(body?.isDefault)

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ code: 'INVALID_BODY', message: 'name is required' }, { status: 400 })
    }

    if (!filters || typeof filters !== 'object') {
      return NextResponse.json({ code: 'INVALID_BODY', message: 'filters payload is required' }, { status: 400 })
    }

    if (isDefault) {
      await supabaseAdmin
        .from('invoice_saved_views')
        .update({ is_default: false })
        .eq('user_id', userId)
    }

    const payload = {
      user_id: userId,
      name: name.trim(),
      filters: serializeInvoiceFilters(filters),
      is_default: isDefault,
    }

    const { data, error } = await supabaseAdmin
      .from('invoice_saved_views')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      console.error('Failed to create saved view', error)
      return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create saved view' }, { status: 500 })
    }

    return NextResponse.json(mapSavedViewRow(data), { status: 201 })
  } catch (error) {
    console.error('Unexpected error creating saved view', error)
    return NextResponse.json({ code: 'SERVER_ERROR', message: 'Failed to create saved view' }, { status: 500 })
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
