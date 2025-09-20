import { NextRequest, NextResponse } from 'next/server'

import { isSupabaseConfigured } from '@/lib/server/env'
import { supabaseAdmin } from '@/lib/server/supabase-admin'
import type { InvoiceFiltersState } from '@/types/invoice-filters'
import { serializeInvoiceFilters } from '@/types/invoice-filters'

const FALLBACK_USER_ID = '00000000-0000-0000-0000-000000000000'

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ code: 'SUPABASE_DISABLED', message: 'Supabase not configured' }, { status: 503 })
  }

  const userId = resolveUserId(request)

  try {
    const body = await request.json()
    const filters: InvoiceFiltersState | undefined = body?.filters

    if (!filters || typeof filters !== 'object') {
      return NextResponse.json({ code: 'INVALID_BODY', message: 'filters payload is required' }, { status: 400 })
    }

    const payload = {
      p_user_id: userId,
      p_filters: serializeInvoiceFilters(filters),
    }

    const { data, error } = await supabaseAdmin.rpc('rpc_enqueue_invoice_export', payload)

    if (error) {
      console.error('Failed to enqueue export job', error)
      return NextResponse.json({ code: 'ENQUEUE_FAILED', message: 'Unable to enqueue export job' }, { status: 500 })
    }

    const jobId = Array.isArray(data) ? data[0] : data

    if (!jobId) {
      return NextResponse.json({ code: 'ENQUEUE_FAILED', message: 'Supabase returned no job id' }, { status: 500 })
    }

    const job = await loadJob(jobId as string)
    if (!job) {
      return NextResponse.json({ code: 'JOB_NOT_FOUND', message: 'Export job not found after enqueue' }, { status: 404 })
    }

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Unexpected error enqueuing export', error)
    return NextResponse.json({ code: 'SERVER_ERROR', message: 'Failed to enqueue export job' }, { status: 500 })
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

async function loadJob(id: string) {
  const { data, error } = await supabaseAdmin
    .from('invoice_export_jobs')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Failed to load export job', error)
    return undefined
  }

  if (!data) return undefined

  return mapJobRow(data)
}

function mapJobRow(row: any) {
  return {
    id: row.id,
    status: row.status,
    requestedFilters: row.requested_filters || {},
    rowCount: row.row_count,
    filePath: row.file_path,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }
}
