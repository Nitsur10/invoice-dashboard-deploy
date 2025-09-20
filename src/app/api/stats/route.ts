import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/server/env';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
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
      invoices: number
      amount: number
    }
  }
  breakdowns: {
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

function deriveInvoiceStatus(amountDue: unknown, dueDate: unknown, now: Date): 'pending' | 'paid' | 'overdue' {
  const numericalAmount = typeof amountDue === 'number' ? amountDue : amountDue == null ? null : Number(amountDue)
  if (numericalAmount === 0) return 'paid'
  const due = dueDate ? new Date(dueDate) : null
  if (numericalAmount != null && numericalAmount > 0 && due && due.getTime() < now.getTime()) return 'overdue'
  return 'pending'
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const dateFrom = parseDateParam(url.searchParams.get('dateFrom'))
    const dateTo = parseDateParam(url.searchParams.get('dateTo'))
    const now = new Date()

    const minClamp = '2025-05-01T00:00:00.000Z'
    const fromIso = dateFrom ?? minClamp
    const toIso = dateTo

    let rows: Array<{ total: number; amount_due?: number | null; due_date?: string | null; category?: string | null; supplier_name?: string | null; created_at?: string | null }>

    if (isSupabaseConfigured()) {
      const primaryTable = process.env.SUPABASE_INVOICES_TABLE || 'invoices'
      const fallbackTable = primaryTable === 'invoices' ? 'Invoice' : 'invoices'

      const buildQuery = (table: string) => {
        // Fetch broadly; we'll apply flexible date filtering in-memory
        return supabaseAdmin.from(table).select('*').limit(5000)
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
              trends: { invoices: 0, amount: 0 },
            },
            breakdowns: { categories: [], topVendors: [] },
            metadata: { generatedAt: new Date().toISOString(), dateRange: { from: fromIso, to: toIso }, periodDays: 0 },
          })
        }
        rows = (fb.data ?? []) as any
      } else {
        rows = (resp.data ?? []) as any
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

    // Aggregate
    let totalInvoices = 0
    let totalAmount = 0
    let paidAmount = 0
    let pendingAmount = 0
    let pendingPayments = 0
    let overdueAmount = 0
    let overduePayments = 0

    const byCategory = new Map<string, { count: number; amount: number }>()
    const byVendor = new Map<string, { count: number; amount: number }>()

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

    for (const r of rows as any[]) {
      // Apply date filter window using common created/received fields
      const createdIso = pickDateIso(r, ['created_at', 'createdAt', 'received_date', 'receivedDate', 'invoice_date', 'invoiceDate'])
      if (fromIso && createdIso && createdIso < fromIso) continue
      if (toIso && createdIso && createdIso > toIso) continue
      totalInvoices += 1
      const amount = Number(pick(r, ['total', 'amount', 'total_amount', 'grand_total'], 0)) || 0
      const amountDueRaw = pick(r, ['amount_due', 'due_amount', 'outstanding', 'balance_due'], null)
      const amountDue = amountDueRaw == null ? null : Number(amountDueRaw)
      totalAmount += amount

      const dueDateValue = pick(r, ['due_date', 'dueDate', 'payment_due', 'payment_due_date'], null)
      const status = deriveInvoiceStatus(amountDue, dueDateValue, now)
      if (status === 'paid') {
        paidAmount += amount
      } else if (status === 'overdue') {
        overduePayments += 1
        overdueAmount += amountDue ?? amount
      } else {
        pendingPayments += 1
        pendingAmount += amountDue ?? amount
      }

      const cat = (pick(r, ['category', 'category_name', 'type'], 'Uncategorized')) as string
      const catEntry = byCategory.get(cat) || { count: 0, amount: 0 }
      catEntry.count += 1
      catEntry.amount += amount
      byCategory.set(cat, catEntry)

      const vendor = (pick(r, ['supplier_name', 'vendor', 'vendor_name', 'supplier'], 'Unknown Vendor')) as string
      const venEntry = byVendor.get(vendor) || { count: 0, amount: 0 }
      venEntry.count += 1
      venEntry.amount += amount
      byVendor.set(vendor, venEntry)
    }

    const categories = Array.from(byCategory.entries()).map(([category, v]) => ({ category, count: v.count, amount: v.amount }))
    const topVendors = Array.from(byVendor.entries()).map(([vendor, v]) => ({ vendor, count: v.count, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

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
          invoices: totalInvoices,
          amount: totalAmount,
        },
      },
      breakdowns: {
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
          trends: { invoices: 0, amount: 0 },
        },
        breakdowns: { categories: [], topVendors: [] },
        metadata: { generatedAt: new Date().toISOString(), dateRange: { from: null, to: null }, periodDays: 0 },
      },
      { status: 500 }
    )
  }
}