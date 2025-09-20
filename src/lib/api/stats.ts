// Client-side logging - simplified version without server-only dependency
import { trackAPIPerformance } from '@/lib/observability'

export interface DashboardStats {
  overview: {
    totalInvoices: number
    pendingPayments: number
    overduePayments: number
    paidInvoices: number
    totalAmount: number
    pendingAmount: number
    overdueAmount: number
    paidAmount: number
    trends: {
      invoices: number
      amount: number
    }
  }
  breakdowns: {
    processingStatus: Array<{
      status: string
      count: number
      amount: number
    }>
    categories: Array<{
      category: string
      count: number
      amount: number
    }>
    topVendors: Array<{
      vendor: string
      count: number
      amount: number
    }>
  }
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    amount?: number
    status?: string
  }>
  metadata: {
    generatedAt: string
    dateRange: {
      from: string | null
      to: string | null
    }
    periodDays: number
  }
}

export interface StatsParams {
  dateFrom?: string
  dateTo?: string
  triggerError?: boolean
}

export async function fetchDashboardStats(params: StatsParams = {}): Promise<DashboardStats> {
  const startTime = Date.now()
  
  try {
    const url = new URL(`/api/stats`, 
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })

    const response = await fetch(url.toString(), { cache: 'no-store' })
    
    if (!response.ok) {
      throw new Error(`Stats API failed: ${response.status} ${response.statusText}`)
    }

    const data: DashboardStats = await response.json()
    const duration = Date.now() - startTime
    
    // Log API performance for budget tracking (client-side)
    trackAPIPerformance('/api/stats', duration)
    
    // Optional console log in dev
    // console.log(`[Stats API] Success: ${duration}ms`, { params })

    return data
  } catch (error) {
    const duration = Date.now() - startTime
    
    // Track failed requests too
    trackAPIPerformance('/api/stats', duration)
    
    // Swallow errors and return safe default so UI stays responsive
    const empty: DashboardStats = {
      overview: {
        totalInvoices: 0,
        pendingPayments: 0,
        overduePayments: 0,
        paidInvoices: 0,
        totalAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        paidAmount: 0,
        trends: { invoices: 0, amount: 0 },
      },
      breakdowns: { processingStatus: [], categories: [], topVendors: [] },
      recentActivity: [],
      metadata: { generatedAt: new Date().toISOString(), dateRange: { from: null, to: null }, periodDays: 0 },
    }
    return empty
  }
}
