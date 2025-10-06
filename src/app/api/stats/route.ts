import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/server/env';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { mockInvoiceData } from '@/lib/sample-data';

type DashboardStatsResponse = {
  overview: {
    totalInvoices: number
    totalAmount: number
    paidAmount: number
    pendingAmount: number
    pendingPayments: number
    overdueAmount: number
    overduePayments: number
    trends: {
      invoices: number | null
      amount: number | null
      invoicesDelta: number
      amountDelta: number
      hasPriorData: boolean
    }
  }
  breakdowns: {
    processingStatus: Array<{ status: string; count: number; amount: number }>
    categories: Array<{ category: string; count: number; amount: number }>
    topVendors: Array<{ vendor: string; count: number; amount: number }>
  }
  recentActivity?: Array<{ id: string; type: string; description: string; timestamp: string; amount?: number; status?: string }>
  metadata: {
    generatedAt: string
    dateRange: { from: string | null; to: string | null }
    periodDays: number
  }
}

function parseDateParam(value: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function calculateMoMPercentage(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function deriveInvoiceStatus(amountDue: unknown, dueDate: unknown, issueDate: unknown, now: Date): 'pending' | 'paid' | 'overdue' {
  const cutoffDate = new Date('2025-05-01T00:00:00.000Z')
  const issue = issueDate ? new Date(issueDate) : null

  // If invoice issued before May 1st 2025, default to paid
  if (issue && issue.getTime() < cutoffDate.getTime()) {
    return 'paid'
  }

  // For invoices from May 1st onwards, check due date vs current date
  const numericalAmount = typeof amountDue === 'number' ? amountDue : amountDue == null ? null : Number(amountDue)
  if (numericalAmount === 0) return 'paid'

  const due = dueDate ? new Date(dueDate) : null
  if (numericalAmount != null && numericalAmount > 0 && due && due.getTime() < now.getTime()) {
    return 'overdue'
  }

  return 'pending'
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const dateFrom = parseDateParam(url.searchParams.get('dateFrom'))
    const dateTo = parseDateParam(url.searchParams.get('dateTo'))

    // Parse filter params
    const statusFilters = url.searchParams.getAll('status')
    const categoryFilters = url.searchParams.getAll('category')
    const vendorFilters = url.searchParams.getAll('vendor')
    const amountMinParam = parseFloat(url.searchParams.get('amountMin') || '')
    const amountMaxParam = parseFloat(url.searchParams.get('amountMax') || '')

    const now = new Date()

    const minClamp = '2025-05-01T00:00:00.000Z'
    const fromIso = dateFrom ?? minClamp
    const toIso = dateTo

    // Debug logging - updated
    // console.log('[Stats API] Received params:', {
    //   dateFrom: url.searchParams.get('dateFrom'),
    //   dateTo: url.searchParams.get('dateTo'),
    //   parsedFrom: dateFrom,
    //   parsedTo: dateTo,
    //   finalFromIso: fromIso,
    //   finalToIso: toIso
    // })

    let rows: Array<{ total: number; amount_due?: number | null; due_date?: string | null; category?: string | null; supplier_name?: string | null; created_at?: string | null }>

    if (isSupabaseConfigured()) {
      try {
        const primaryTable = process.env.SUPABASE_INVOICES_TABLE || 'invoices'
        const fallbackTable = primaryTable === 'invoices' ? 'Invoice' : 'invoices'

        const buildQuery = (table: string) => {
          // Fetch broadly; we'll apply flexible date filtering in-memory
          return getSupabaseAdmin().from(table).select('*').limit(5000)
        }

      let resp = await buildQuery(primaryTable)
      if (resp.error) {
        const fb = await buildQuery(fallbackTable)
        if (fb.error) {
          // If both fail, respond with safe empty payload
          return NextResponse.json<DashboardStatsResponse>({
            overview: {
              totalInvoices: 0,
              totalAmount: 0,
              paidAmount: 0,
              pendingAmount: 0,
              pendingPayments: 0,
              overdueAmount: 0,
              overduePayments: 0,
              trends: { invoices: null, amount: null, invoicesDelta: 0, amountDelta: 0, hasPriorData: false },
            },
            breakdowns: { categories: [], topVendors: [] },
            metadata: { generatedAt: new Date().toISOString(), dateRange: { from: fromIso, to: toIso }, periodDays: 0 },
          })
        }
        rows = (fb.data ?? []) as any
      } else {
        rows = (resp.data ?? []) as any
      }
      } catch (error) {
        console.error('Supabase query failed:', error);
        // Fall back to mock data
        rows = mockInvoiceData
          .filter((inv) => {
            const created = inv.receivedDate ?? inv.issueDate
            if (!created) return false
            const createdIso = typeof created === 'string' ? created : (created as Date).toISOString()
            if (fromIso && createdIso < fromIso) return false
            if (toIso && createdIso > toIso) return false
            return true
          })
          .map((inv) => ({
            total: inv.amount ?? 0,
            amount_due: inv.amountDue ?? inv.amount ?? 0,
            due_date: inv.dueDate ? (typeof inv.dueDate === 'string' ? inv.dueDate : inv.dueDate.toISOString()) : null,
            category: inv.category ?? 'Uncategorized',
            supplier_name: inv.vendorName ?? 'Unknown Vendor',
            created_at: inv.receivedDate ? (typeof inv.receivedDate === 'string' ? inv.receivedDate : inv.receivedDate.toISOString()) : null,
          }))
      }
    } else {
      // Local mock data path
      rows = mockInvoiceData
        .filter((inv) => {
          const created = inv.receivedDate ?? inv.issueDate
          if (!created) return false
          const createdIso = typeof created === 'string' ? created : (created as Date).toISOString()
          if (fromIso && createdIso < fromIso) return false
          if (toIso && createdIso > toIso) return false
          return true
        })
        .map((inv) => ({
          total: inv.amount ?? 0,
          amount_due: inv.amountDue ?? inv.amount ?? 0,
          due_date: inv.dueDate ? (typeof inv.dueDate === 'string' ? inv.dueDate : inv.dueDate.toISOString()) : null,
          category: inv.category ?? 'Uncategorized',
          supplier_name: inv.vendorName ?? 'Unknown Vendor',
          created_at: inv.receivedDate ? (typeof inv.receivedDate === 'string' ? inv.receivedDate : inv.receivedDate.toISOString()) : null,
        }))
    }

    // Aggregate current period
    let totalInvoices = 0
    let totalAmount = 0
    let paidAmount = 0
    let pendingAmount = 0
    let pendingPayments = 0
    let overdueAmount = 0
    let overduePayments = 0

    const byCategory = new Map<string, { count: number; amount: number }>()
    const byVendor = new Map<string, { count: number; amount: number }>()
    const byStatus = new Map<string, { count: number; amount: number }>()

    const pick = (record: any, keys: string[], fallback?: any) => {
      for (const k of keys) {
        if (record[k] !== undefined && record[k] !== null) return record[k]
      }
      return fallback
    }

    const pickDateIso = (record: any, keys: string[]) => {
      for (const k of keys) {
        const v = record[k]
        if (v) {
          const d = typeof v === 'string' ? new Date(v) : new Date(v as any)
          if (!Number.isNaN(d.getTime())) return d.toISOString()
        }
      }
      return null as string | null
    }

    let processedCount = 0
    let filteredCount = 0
    let missingDateCount = 0

    for (const r of rows as any[]) {
      // Apply date filter window using common created/received fields
      const createdIso = pickDateIso(r, ['invoice_date', 'invoiceDate', 'received_date', 'receivedDate', 'created_at', 'createdAt'])

      if (!createdIso) {
        missingDateCount++
        // console.log(`[Stats API] Invoice missing date fields:`, {
        //   id: r.id || r.invoice_number || 'unknown',
        //   available_fields: Object.keys(r).filter(k => k.toLowerCase().includes('date'))
        // })
        continue
      }

      // Debug: log first few records to see the actual date field values
      // if (totalInvoices < 3) {
      //   console.log(`[Stats API] Sample record #${totalInvoices + 1}:`, {
      //     invoice_number: r.invoice_number,
      //     invoice_date: r.invoice_date,
      //     created_at: r.created_at,
      //     createdIso,
      //     fromIso,
      //     toIso,
      //     passesFilter: (!fromIso || createdIso >= fromIso) && (!toIso || createdIso <= toIso)
      //   });
      // }

      if (fromIso && createdIso < fromIso) {
        filteredCount++
        continue
      }
      if (toIso && createdIso > toIso) {
        filteredCount++
        continue
      }

      // Get invoice fields for filtering
      const amount = Number(pick(r, ['total', 'amount', 'total_amount', 'grand_total'], 0)) || 0
      const amountDueRaw = pick(r, ['amount_due', 'due_amount', 'outstanding', 'balance_due'], null)
      const amountDue = amountDueRaw == null ? null : Number(amountDueRaw)
      const dueDateValue = pick(r, ['due_date', 'dueDate', 'payment_due', 'payment_due_date'], null)
      const issueDateValue = pick(r, ['issue_date', 'issueDate', 'invoice_date', 'invoiceDate', 'created_at', 'createdAt'], null)
      const status = deriveInvoiceStatus(amountDue, dueDateValue, issueDateValue, now)
      const cat = (pick(r, ['category', 'category_name', 'type'], 'Uncategorized')) as string
      const vendor = (pick(r, ['supplier_name', 'vendor', 'vendor_name', 'supplier'], 'Unknown Vendor')) as string

      // Apply additional filters
      // Status filter
      if (statusFilters.length && !statusFilters.includes(status)) {
        filteredCount++
        continue
      }

      // Category filter
      if (categoryFilters.length && !categoryFilters.includes(cat)) {
        filteredCount++
        continue
      }

      // Vendor filter
      if (vendorFilters.length && !vendorFilters.includes(vendor)) {
        filteredCount++
        continue
      }

      // Amount filter
      if (!isNaN(amountMinParam) && amount < amountMinParam) {
        filteredCount++
        continue
      }
      if (!isNaN(amountMaxParam) && amount > amountMaxParam) {
        filteredCount++
        continue
      }

      processedCount++
      totalInvoices += 1
      totalAmount += amount

      // Track by status for breakdown
      const statusEntry = byStatus.get(status) || { count: 0, amount: 0 }
      statusEntry.count += 1
      statusEntry.amount += amount
      byStatus.set(status, statusEntry)

      if (status === 'paid') {
        paidAmount += amount
      } else if (status === 'overdue') {
        overduePayments += 1
        overdueAmount += amountDue ?? amount
      } else {
        pendingPayments += 1
        pendingAmount += amountDue ?? amount
      }

      const catEntry = byCategory.get(cat) || { count: 0, amount: 0 }
      catEntry.count += 1
      catEntry.amount += amount
      byCategory.set(cat, catEntry)

      const venEntry = byVendor.get(vendor) || { count: 0, amount: 0 }
      venEntry.count += 1
      venEntry.amount += amount
      byVendor.set(vendor, venEntry)
    }

    const categories = Array.from(byCategory.entries()).map(([category, v]) => ({ category, count: v.count, amount: v.amount }))
    const topVendors = Array.from(byVendor.entries()).map(([vendor, v]) => ({ vendor, count: v.count, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
    const processingStatus = Array.from(byStatus.entries()).map(([status, v]) => ({ status, count: v.count, amount: v.amount }))
      .sort((a, b) => b.count - a.count)

    // Calculate previous period for MoM trends
    let previousPeriodInvoices = 0
    let previousPeriodAmount = 0
    let hasPriorData = false

    if (fromIso && toIso) {
      // Calculate previous period date range
      const currentStart = new Date(fromIso)
      const currentEnd = new Date(toIso)
      const periodDays = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

      const previousStart = new Date(currentStart)
      previousStart.setDate(previousStart.getDate() - periodDays)
      const previousEnd = new Date(currentEnd)
      previousEnd.setDate(previousEnd.getDate() - periodDays)

      const previousFromIso = previousStart.toISOString()
      const previousToIso = previousEnd.toISOString()

      // Filter for previous period
      for (const r of rows as any[]) {
        const createdIso = pickDateIso(r, ['invoice_date', 'invoiceDate', 'received_date', 'receivedDate', 'created_at', 'createdAt'])

        if (!createdIso) continue
        if (createdIso < previousFromIso || createdIso > previousToIso) continue

        previousPeriodInvoices += 1
        const amount = Number(pick(r, ['total', 'amount', 'total_amount', 'grand_total'], 0)) || 0
        previousPeriodAmount += amount
        hasPriorData = true
      }
    }

    // Calculate MoM percentages
    const invoiceTrend = hasPriorData ? calculateMoMPercentage(totalInvoices, previousPeriodInvoices) : null
    const amountTrend = hasPriorData ? calculateMoMPercentage(totalAmount, previousPeriodAmount) : null
    const invoicesDelta = totalInvoices - previousPeriodInvoices
    const amountDelta = totalAmount - previousPeriodAmount

    // Summary logging
    // console.log(`[Stats API] Processing summary:`, {
    //   totalRows: rows.length,
    //   processedCount,
    //   filteredCount,
    //   missingDateCount,
    //   finalTotalInvoices: totalInvoices,
    //   statusCounts: { pending: pendingPayments, overdue: overduePayments, paidInvoices: totalInvoices - pendingPayments - overduePayments },
    //   dateRange: { fromIso, toIso }
    // })

    const result: DashboardStatsResponse = {
      overview: {
        totalInvoices,
        totalAmount,
        paidAmount,
        pendingAmount,
        pendingPayments,
        overdueAmount,
        overduePayments,
        trends: {
          invoices: invoiceTrend,
          amount: amountTrend,
          invoicesDelta,
          amountDelta,
          hasPriorData,
        },
      },
      breakdowns: {
        processingStatus,
        categories,
        topVendors,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dateRange: { from: fromIso, to: toIso },
        periodDays: fromIso && toIso ? Math.max(0, Math.ceil((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86400000) + 1) : 0,
      },
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to build dashboard stats:', error)
    return NextResponse.json(
      {
        overview: {
          totalInvoices: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          pendingPayments: 0,
          overdueAmount: 0,
          overduePayments: 0,
          trends: { invoices: null, amount: null, invoicesDelta: 0, amountDelta: 0, hasPriorData: false },
        },
        breakdowns: { processingStatus: [], categories: [], topVendors: [] },
        metadata: { generatedAt: new Date().toISOString(), dateRange: { from: null, to: null }, periodDays: 0 },
      },
      { status: 500 }
    )
  }
}