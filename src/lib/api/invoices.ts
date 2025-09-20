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

export type InvoiceExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface InvoiceExportJob {
  id: string
  status: InvoiceExportJobStatus
  requestedFilters: Record<string, unknown>
  rowCount: number | null
  filePath: string | null
  errorMessage: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

const API_BASE = process.env.NODE_ENV === 'development' ? '' : '/api'

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

export async function enqueueInvoiceExport(payload: {
  filters: InvoiceFiltersState
}): Promise<InvoiceExportJob> {
  const response = await fetch(`${API_BASE}/api/invoices/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message ?? 'Failed to enqueue export')
  }

  return response.json()
}

export async function fetchInvoiceExportJob(id: string): Promise<InvoiceExportJob> {
  const response = await fetch(`${API_BASE}/api/invoices/export/${id}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message ?? 'Failed to retrieve export job')
  }

  return response.json()
}
