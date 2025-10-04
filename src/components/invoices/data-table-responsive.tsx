'use client'

import { useBreakpoint } from '@/hooks/useBreakpoint'
import { DataTable } from './data-table'
import { InvoiceCardList } from './invoice-card-list'
import type { ColumnDef, SortingState, ColumnFiltersState, PaginationState } from '@tanstack/react-table'
import type { Invoice } from '@/lib/types'
import type { InvoiceFacetsResponse } from '@/lib/api/invoices'

interface DataTableResponsiveProps {
  columns: ColumnDef<Invoice, any>[]
  data: Invoice[]
  pageCount: number
  pageSize: number
  pageIndex: number
  onPaginationChange: (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => void
  onSortingChange: (updater: SortingState | ((prev: SortingState) => SortingState)) => void
  onColumnFiltersChange: (updater: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => void
  sorting: SortingState
  columnFilters: ColumnFiltersState
  isLoading?: boolean
  manualPagination?: boolean
  manualSorting?: boolean
  manualFiltering?: boolean
  facets?: InvoiceFacetsResponse['facets']
}

/**
 * Responsive wrapper for invoice data display
 * - Mobile (< 768px): Card-based list view
 * - Desktop (>= 768px): Full table view
 */
export function DataTableResponsive(props: DataTableResponsiveProps) {
  const isMobile = !useBreakpoint('md')

  // Mobile: Render card view
  if (isMobile) {
    return <InvoiceCardList invoices={props.data} />
  }

  // Desktop/Tablet: Render table view
  return <DataTable {...props} />
}
