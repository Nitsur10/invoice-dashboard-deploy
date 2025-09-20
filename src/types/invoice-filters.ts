export type InvoiceStatusFilter = 'pending' | 'paid' | 'overdue'

export interface InvoiceFiltersState {
  search: string
  statuses: InvoiceStatusFilter[]
  categories: string[]
  vendors: string[]
  amountRange?: {
    min?: number
    max?: number
  }
  dateRange?: {
    start?: string
    end?: string
  }
  savedViewId?: string
}

export const defaultInvoiceFilters: InvoiceFiltersState = {
  search: '',
  statuses: [],
  categories: [],
  vendors: [],
  amountRange: undefined,
  dateRange: { start: '2025-05-01T00:00:00.000Z' },
  savedViewId: undefined,
}

export interface InvoiceSavedViewPayload {
  id: string
  name: string
  isDefault: boolean
  filters: InvoiceFiltersState
  createdAt: string
  updatedAt: string
}

export function cloneInvoiceFilters(filters: InvoiceFiltersState): InvoiceFiltersState {
  return {
    search: filters.search ?? '',
    statuses: [...filters.statuses],
    categories: [...filters.categories],
    vendors: [...filters.vendors],
    amountRange: filters.amountRange ? { ...filters.amountRange } : undefined,
    dateRange: filters.dateRange ? { ...filters.dateRange } : undefined,
    savedViewId: filters.savedViewId,
  }
}

export function serializeInvoiceFilters(filters: InvoiceFiltersState): InvoiceFiltersState {
  return {
    search: filters.search ?? '',
    statuses: [...filters.statuses],
    categories: [...filters.categories],
    vendors: [...filters.vendors],
    amountRange: filters.amountRange ? { ...filters.amountRange } : undefined,
    dateRange: filters.dateRange ? { ...filters.dateRange } : undefined,
  }
}
