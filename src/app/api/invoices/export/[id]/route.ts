import { NextRequest, NextResponse } from 'next/server'

import { isSupabaseConfigured } from '@/lib/server/env'
import { supabaseAdmin } from '@/lib/server/supabase-admin'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ code: 'SUPABASE_DISABLED', message: 'Supabase not configured' }, { status: 503 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('invoice_export_jobs')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (error) {
      console.error('Failed to load export job', error)
      return NextResponse.json({ code: 'LOAD_FAILED', message: 'Unable to load export job' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Export job not found' }, { status: 404 })
    }

    return NextResponse.json(mapJobRow(data))
  } catch (error) {
    console.error('Unexpected error loading export job', error)
    return NextResponse.json({ code: 'SERVER_ERROR', message: 'Failed to load export job' }, { status: 500 })
  }
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
