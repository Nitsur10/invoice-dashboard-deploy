// Client-side API for invoice operations
import { trackAPIPerformance } from '@/lib/observability'
import type { InvoiceFiltersState } from '@/types/invoice-filters'

export interface Invoice {
  id: string
  emailId?: string
  subject?: string
  invoiceNumber: string
  amount: number
  vendor: string
  sourceTab?: string
  paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE'
  createdAt: string
  updatedAt?: string
  dueDate?: string
  description?: string
  category?: string
  invoiceUrl?: string
}

export interface InvoicesParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  status?: string | string[]
  category?: string | string[]
  vendor?: string | string[]
  dateFrom?: string
  dateTo?: string
  amountMin?: number
  amountMax?: number
  savedViewId?: string
}

export interface InvoicesResponse {
  data: Invoice[]
  pagination: {
    total: number
    pageCount: number
    pageSize: number
    pageIndex: number
  }
}

export interface InvoiceFacetsResponse {
  facets: {
    statuses: Array<{ value: string; count: number }>
    categories: Array<{ value: string; count: number }>
    vendors: Array<{ value: string; email?: string; count: number }>
    amountRange: { min: number; max: number }
    dateRange: { min: string | null; max: string | null }
  }
}

export interface InvoiceSavedView {
  id: string
  name: string
  filters: InvoiceFiltersState
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface InvoiceSavedViewsResponse {
  views: InvoiceSavedView[]
}

// Export types removed - using direct CSV download instead

const API_BASE = ''

export async function fetchInvoices(params: InvoicesParams = {}): Promise<InvoicesResponse> {
  const startTime = Date.now()

  try {
    const url = new URL(`${API_BASE}/api/invoices`,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry !== undefined && entry !== null && entry !== '') {
            url.searchParams.append(key, String(entry))
          }
        })
        return
      }

      url.searchParams.set(key, String(value))
    })

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Invoices API failed: ${response.status} ${response.statusText}`)
    }

    const data: InvoicesResponse = await response.json()
    const duration = Date.now() - startTime
    
    // Log API performance for budget tracking (client-side)
    trackAPIPerformance('/api/invoices', duration)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Invoices API] Success: ${duration}ms`, { params, total: data.pagination.total })
    }

    return data
  } catch (error) {
    const duration = Date.now() - startTime
    
    // Track failed requests too
    trackAPIPerformance('/api/invoices', duration)
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Invoices API] Error: ${duration}ms`, { params, error })
    }
    
    throw error
  }
}

export async function fetchInvoiceFacets(): Promise<InvoiceFacetsResponse> {
  const startTime = Date.now()

  try {
    const url = new URL(`${API_BASE}/api/invoices/facets`,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')

    const response = await fetch(url.toString(), { cache: 'no-store' })

    if (!response.ok) {
      throw new Error(`Invoice facets API failed: ${response.status} ${response.statusText}`)
    }

    const data: InvoiceFacetsResponse = await response.json()
    const duration = Date.now() - startTime

    trackAPIPerformance('/api/invoices/facets', duration)

    return data
  } catch (error) {
    const duration = Date.now() - startTime
    trackAPIPerformance('/api/invoices/facets', duration)

    if (process.env.NODE_ENV === 'development') {
      console.error('[Invoice Facets API] Error', error)
    }

    throw error
  }
}

export async function fetchInvoiceById(id: string): Promise<Invoice> {
  const startTime = Date.now()
  
  try {
    const url = new URL(`${API_BASE}/api/invoices/${id}`, 
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Invoice not found')
      }
      throw new Error(`Invoice API failed: ${response.status} ${response.statusText}`)
    }

    const data: Invoice = await response.json()
    const duration = Date.now() - startTime
    
    trackAPIPerformance('/api/invoices/[id]', duration)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Invoice API] Success: ${duration}ms`, { id })
    }

    return data
  } catch (error) {
    const duration = Date.now() - startTime
    
    trackAPIPerformance('/api/invoices/[id]', duration)
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Invoice API] Error: ${duration}ms`, { id, error })
    }
    
    throw error
  }
}

export async function fetchInvoiceSavedViews(): Promise<InvoiceSavedViewsResponse> {
  const response = await fetch(`${API_BASE}/api/invoices/saved-views`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Failed to load saved views')
  }

  return response.json()
}

export async function createInvoiceSavedView(payload: {
  name: string
  filters: InvoiceFiltersState
  isDefault?: boolean
}): Promise<InvoiceSavedView> {
  const response = await fetch(`${API_BASE}/api/invoices/saved-views`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message ?? 'Failed to save view')
  }

  return response.json()
}

export async function updateInvoiceSavedView(
  id: string,
  payload: Partial<{ name: string; filters: InvoiceFiltersState; isDefault: boolean }>,
): Promise<InvoiceSavedView> {
  const response = await fetch(`${API_BASE}/api/invoices/saved-views/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message ?? 'Failed to update view')
  }

  return response.json()
}

export async function deleteInvoiceSavedView(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/invoices/saved-views/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message ?? 'Failed to delete view')
  }
}

// CSV export is now handled directly via fetch in the component
// No longer need job-based export functions

// Update invoice status with audit logging
export async function updateInvoiceStatus(
  invoiceId: string,
  status: string
): Promise<{
  success: boolean
  invoice?: Invoice
  auditLog?: any
  message?: string
  error?: string
}> {
  const startTime = Date.now()

  try {
    const url = new URL(`${API_BASE}/api/invoices/${invoiceId}/status`,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })

    const data = await response.json()
    const duration = Date.now() - startTime

    trackAPIPerformance('/api/invoices/[id]/status', duration)

    if (!response.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Status Update API] Error: ${duration}ms`, { invoiceId, status, error: data })
      }

      return {
        success: false,
        error: data.message || `HTTP ${response.status}`,
        ...data
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Status Update API] Success: ${duration}ms`, { invoiceId, status })
    }

    return data

  } catch (error) {
    const duration = Date.now() - startTime

    trackAPIPerformance('/api/invoices/[id]/status', duration)

    if (process.env.NODE_ENV === 'development') {
      console.error(`[Status Update API] Error: ${duration}ms`, { invoiceId, status, error })
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

// Get status history for an invoice
export async function getInvoiceStatusHistory(invoiceId: string): Promise<{
  currentStatus?: string
  history?: any[]
  error?: string
}> {
  const startTime = Date.now()

  try {
    const url = new URL(`${API_BASE}/api/invoices/${invoiceId}/status`,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')

    const response = await fetch(url.toString())

    const data = await response.json()
    const duration = Date.now() - startTime

    trackAPIPerformance('/api/invoices/[id]/status', duration)

    if (!response.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Status History API] Error: ${duration}ms`, { invoiceId, error: data })
      }

      return {
        error: data.message || `HTTP ${response.status}`
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Status History API] Success: ${duration}ms`, { invoiceId })
    }

    return data

  } catch (error) {
    const duration = Date.now() - startTime

    trackAPIPerformance('/api/invoices/[id]/status', duration)

    if (process.env.NODE_ENV === 'development') {
      console.error(`[Status History API] Error: ${duration}ms`, { invoiceId, error })
    }

    return {
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}
