import { NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/server/supabase-admin'
import { isSupabaseConfigured } from '@/lib/server/env'

interface FacetPayload {
  facets: {
    statuses: Array<{ value: string; count: number }>;
    categories: Array<{ value: string; count: number }>;
    vendors: Array<{ value: string; email?: string; count: number }>;
    amountRange: { min: number; max: number };
    dateRange: { min: string | null; max: string | null };
  };
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json<FacetPayload>({
        facets: {
          statuses: [],
          categories: [],
          vendors: [],
          amountRange: { min: 0, max: 0 },
          dateRange: { min: null, max: null },
        },
      })
    }

    // Prefer materialized view output if available
    const viewName = 'invoice_filter_facets_v'
    const viewQuery = await supabaseAdmin.from(viewName).select('facets').limit(1)

    if (!viewQuery.error && viewQuery.data && viewQuery.data.length > 0) {
      const facets = viewQuery.data[0].facets as FacetPayload['facets']
      return NextResponse.json({ facets })
    }

    // Fallback: derive facets directly from base table
    const fallback = await supabaseAdmin.from('Invoice').select(
      'payment_status, category, supplier_name, supplier_email, total, created_at'
    )

    if (fallback.error) {
      return NextResponse.json<FacetPayload>({
        facets: {
          statuses: [],
          categories: [],
          vendors: [],
          amountRange: { min: 0, max: 0 },
          dateRange: { min: null, max: null },
        },
      })
    }

    const rows = fallback.data ?? []
    const statusMap = new Map<string, number>()
    const categoryMap = new Map<string, number>()
    const vendorMap = new Map<string, { email?: string; count: number }>()
    let minAmount = Number.POSITIVE_INFINITY
    let maxAmount = Number.NEGATIVE_INFINITY
    let minDate: string | null = null
    let maxDate: string | null = null

    for (const row of rows) {
      const status = (row.payment_status ?? 'pending').toLowerCase()
      statusMap.set(status, (statusMap.get(status) ?? 0) + 1)

      const category = row.category ?? 'Uncategorized'
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1)

      const vendor = row.supplier_name ?? 'Unknown Vendor'
      if (!vendorMap.has(vendor)) {
        vendorMap.set(vendor, { email: row.supplier_email ?? undefined, count: 1 })
      } else {
        const entry = vendorMap.get(vendor)!
        entry.count += 1
        if (!entry.email && row.supplier_email) {
          entry.email = row.supplier_email
        }
      }

      const amount = Number(row.total ?? 0)
      if (!Number.isNaN(amount)) {
        minAmount = Math.min(minAmount, amount)
        maxAmount = Math.max(maxAmount, amount)
      }

      const createdAt = row.created_at ? new Date(row.created_at).toISOString() : null
      if (createdAt) {
        if (!minDate || createdAt < minDate) minDate = createdAt
        if (!maxDate || createdAt > maxDate) maxDate = createdAt
      }
    }

    if (minAmount === Number.POSITIVE_INFINITY) {
      minAmount = 0
      maxAmount = 0
    }

    const facets: FacetPayload['facets'] = {
      statuses: Array.from(statusMap.entries()).map(([value, count]) => ({ value, count })),
      categories: Array.from(categoryMap.entries()).map(([value, count]) => ({ value, count })),
      vendors: Array.from(vendorMap.entries()).map(([value, { email, count }]) => ({ value, email, count })),
      amountRange: { min: minAmount, max: maxAmount },
      dateRange: { min: minDate, max: maxDate },
    }

    return NextResponse.json({ facets })
  } catch (error) {
    console.error('Failed to load invoice facets', error)
    return NextResponse.json<FacetPayload>(
      {
        facets: {
          statuses: [],
          categories: [],
          vendors: [],
          amountRange: { min: 0, max: 0 },
          dateRange: { min: null, max: null },
        },
      },
      { status: 500 }
    )
  }
}
