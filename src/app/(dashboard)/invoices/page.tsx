"use client"

import * as React from "react"
import {
  ColumnFiltersState,
  SortingState,
  PaginationState,
} from "@tanstack/react-table"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { DataTable } from "@/components/invoices/data-table"
import { invoiceColumns } from "@/components/invoices/columns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  RefreshCw, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  Filter,
  ExternalLink,
  Loader2,
  Bookmark
} from "lucide-react"

import { fetchInvoices, fetchInvoiceFacets, fetchInvoiceSavedViews, createInvoiceSavedView, deleteInvoiceSavedView } from "@/lib/api/invoices"
import { cn, formatCurrency } from "@/lib/utils"
import { InvoiceFiltersProvider, useInvoiceFilters } from "@/hooks/use-invoices-filters"
import { InvoiceFilterSidebar } from "@/components/invoices/filter-sidebar"
import { InvoiceFilterDrawer } from "@/components/invoices/filter-drawer"
import { InvoiceFilterChips } from "@/components/invoices/filter-chips"
import { ExportProgressButton } from "@/components/invoices/export-progress-button"
import { SavedViewsModal } from "@/components/invoices/saved-views-modal"
import { serializeInvoiceFilters } from "@/types/invoice-filters"

// Force this page to be client-only (no SSR/SSG)
export const dynamic = 'force-dynamic'

export default function InvoicesPage() {
  return (
    <InvoiceFiltersProvider>
      <InvoicesView />
    </InvoiceFiltersProvider>
  )
}

export function InvoicesView() {
  const { filters, setFilters, reset } = useInvoiceFilters()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [isFilterDrawerOpen, setFilterDrawerOpen] = React.useState(false)
  const [isSavedViewsOpen, setSavedViewsOpen] = React.useState(false)
  const [feedback, setFeedback] = React.useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null)

  const queryClient = useQueryClient()

  const apiParams = React.useMemo(() => {
    const sortOrder = sorting[0]?.desc ? 'desc' : 'asc'
    return {
      page: pagination.pageIndex,
      limit: pagination.pageSize,
      sortBy: sorting[0]?.id,
      sortOrder: sorting[0]?.id ? (sortOrder as 'asc' | 'desc') : undefined,
      search: filters.search || undefined,
      status: filters.statuses.length ? filters.statuses : undefined,
      category: filters.categories.length ? filters.categories : undefined,
      vendor: filters.vendors.length ? filters.vendors : undefined,
      dateFrom: filters.dateRange?.start,
      dateTo: filters.dateRange?.end,
      amountMin: filters.amountRange?.min,
      amountMax: filters.amountRange?.max,
      savedViewId: filters.savedViewId,
    }
  }, [filters, pagination, sorting])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoices', apiParams],
    queryFn: () => fetchInvoices(apiParams),
    staleTime: 2 * 60 * 1000,
    placeholderData: 'keepPreviousData',
    enabled: typeof window !== 'undefined',
  })

  const facetsQuery = useQuery({
    queryKey: ['invoice-facets'],
    queryFn: () => fetchInvoiceFacets(),
    staleTime: 10 * 60 * 1000,
  })

  const savedViewsQuery = useQuery({
    queryKey: ['invoice-saved-views'],
    queryFn: fetchInvoiceSavedViews,
    staleTime: 5 * 60 * 1000,
  })

  const savedViews = savedViewsQuery.data?.views ?? []

  const statusesKey = React.useMemo(() => filters.statuses.join(','), [filters.statuses])
  const categoriesKey = React.useMemo(() => filters.categories.join(','), [filters.categories])
  const vendorsKey = React.useMemo(() => filters.vendors.join(','), [filters.vendors])
  const dateFromKey = filters.dateRange?.start ?? ''
  const dateToKey = filters.dateRange?.end ?? ''
  const amountMinKey = filters.amountRange?.min ?? ''
  const amountMaxKey = filters.amountRange?.max ?? ''


  const createSavedViewMutation = useMutation({
    mutationFn: ({ name, isDefault, filters: payload }: { name: string; isDefault?: boolean; filters: ReturnType<typeof serializeInvoiceFilters> }) =>
      createInvoiceSavedView({ name, isDefault, filters: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-saved-views'] })
    },
  })

  const deleteSavedViewMutation = useMutation({
    mutationFn: (id: string) => deleteInvoiceSavedView(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-saved-views'] })
    },
  })

  const handleCreateSavedView = React.useCallback(
    async ({ name, isDefault }: { name: string; isDefault?: boolean }) => {
      try {
        await createSavedViewMutation.mutateAsync({
          name,
          isDefault,
          filters: serializeInvoiceFilters(filters),
        })
      } catch (exportError) {
        console.error('Failed to create saved view', exportError)
        throw exportError
      }
    },
    [createSavedViewMutation, filters],
  )

  const handleDeleteSavedView = React.useCallback(
    async (id: string) => {
      try {
        await deleteSavedViewMutation.mutateAsync(id)
      } catch (deleteError) {
        console.error('Failed to delete saved view', deleteError)
        throw deleteError
      }
    },
    [deleteSavedViewMutation],
  )

  const invoices = React.useMemo(() => {
    if (!data?.data) return []
    return data.data.map((inv: any) => ({
      ...inv,
      amount: inv.amount || 0,
      status: typeof inv.status === 'string' ? inv.status.toLowerCase() : 'pending',
      issueDate: inv.issueDate ? new Date(inv.issueDate) : undefined,
      dueDate: inv.dueDate ? new Date(inv.dueDate) : undefined,
      receivedDate: inv.receivedDate ? new Date(inv.receivedDate) : undefined,
      paidDate: inv.paidDate ? new Date(inv.paidDate) : undefined,
    }))
  }, [data])

  const totalCount = data?.pagination?.total ?? 0
  const pageCount = data?.pagination?.pageCount ?? 0

  const stats = React.useMemo(() => {
    if (!invoices.length) {
      return { total: totalCount, totalAmount: 0, pending: 0, paid: 0, overdue: 0 }
    }

    return {
      total: totalCount,
      totalAmount: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
      pending: invoices.filter((inv) => inv.status === 'pending').length,
      paid: invoices.filter((inv) => inv.status === 'paid').length,
      overdue: invoices.filter((inv) => inv.status === 'overdue').length,
    }
  }, [invoices, totalCount])

  const pageBaseIndex = pagination.pageIndex * pagination.pageSize
  const pageStart = invoices.length ? pageBaseIndex + 1 : 0
  const pageEnd = invoices.length ? pageBaseIndex + invoices.length : 0
  const showingMessage = invoices.length
    ? `Showing ${pageStart.toLocaleString('en-AU')}–${pageEnd.toLocaleString('en-AU')} of ${totalCount.toLocaleString('en-AU')} invoices`
    : 'No invoices match the current filters'

  React.useEffect(() => {
    setColumnFilters((prev) => {
      const retained = prev.filter((filter) => !SYNCED_FILTER_IDS.has(filter.id))

      if (filters.statuses.length) {
        retained.push({ id: 'status', value: filters.statuses })
      }
      if (filters.categories.length) {
        retained.push({ id: 'category', value: filters.categories })
      }
      if (filters.vendors.length) {
        retained.push({ id: 'vendorName', value: filters.vendors })
      }

      const previousKey = columnFiltersKey(prev)
      const nextKey = columnFiltersKey(retained)
      if (previousKey === nextKey) {
        return prev
      }

      return retained
    })
  }, [filters.categories, filters.statuses, filters.vendors])

  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [
    filters.search,
    statusesKey,
    categoriesKey,
    vendorsKey,
    dateFromKey,
    dateToKey,
    amountMinKey,
    amountMaxKey,
    filters.savedViewId,
  ])

  const handlePaginationChange = React.useCallback(
    (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => {
      setPagination(updater)
    },
    [],
  )

  const handleSortingChange = React.useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      setSorting(updater)
    },
    [],
  )

  const handleColumnFiltersChange = React.useCallback(
    (updater: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => {
      setColumnFilters((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        const statusFilter = next.find((filter) => filter.id === 'status')
        const categoryFilter = next.find((filter) => filter.id === 'category')
        const vendorFilter = next.find((filter) => filter.id === 'vendorName')

        setFilters((current) => {
          const nextStatuses = Array.isArray(statusFilter?.value) ? statusFilter.value : []
          const nextCategories = Array.isArray(categoryFilter?.value) ? categoryFilter.value : []
          const nextVendors = Array.isArray(vendorFilter?.value) ? vendorFilter.value : []

          if (
            arraysAreEqual(current.statuses, nextStatuses) &&
            arraysAreEqual(current.categories, nextCategories) &&
            arraysAreEqual(current.vendors, nextVendors)
          ) {
            return current
          }

          return {
            ...current,
            statuses: nextStatuses,
            categories: nextCategories,
            vendors: nextVendors,
          }
        })

        return next
      })
    },
    [setFilters],
  )

  const clearAllFilters = React.useCallback(() => {
    reset()
    setColumnFilters([])
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    setFeedback({ type: 'info', message: 'Filters reset to defaults' })
  }, [reset])

  return (
    <div className="container mx-auto space-y-6 py-6">
      <InvoiceFilterDrawer
        open={isFilterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        facets={facetsQuery.data?.facets}
        isLoading={facetsQuery.isLoading}
      />
      <SavedViewsModal
        open={isSavedViewsOpen}
        onOpenChange={setSavedViewsOpen}
        views={savedViews}
        isLoading={savedViewsQuery.isLoading}
        onCreate={handleCreateSavedView}
        onDelete={handleDeleteSavedView}
        onRefresh={() => savedViewsQuery.refetch()}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="rpd-heading-xl rpd-text-gradient">RPD Invoices</h1>
            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </div>
          <p className="text-slate-600">
            Server-side pagination with real invoice data — {totalCount} total invoices
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="md:hidden"
            onClick={() => setFilterDrawerOpen(true)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSavedViewsOpen(true)}
          >
            <Bookmark className="mr-2 h-4 w-4" />
            Saved views
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setFeedback({ type: 'info', message: 'Refreshing invoices…' })
              try {
                await refetch()
                setFeedback({ type: 'success', message: 'Invoice list updated' })
              } catch (err) {
                console.error('Failed to refresh invoices', err)
                setFeedback({ type: 'error', message: 'Unable to refresh invoices right now' })
              }
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={clearAllFilters}>
            Clear filters
          </Button>
          <ExportProgressButton
            onStatusChange={({ state, message, error }) => {
              if (state === 'failed' && error) {
                setFeedback({ type: 'error', message: error })
                return
              }
              if (message) {
                setFeedback({ type: state === 'ready' ? 'success' : 'info', message })
              }
            }}
          />
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={cn('rounded-lg border px-3 py-2 text-sm shadow-sm', {
            'border-blue-200 bg-blue-50 text-slate-700': feedback.type === 'info',
            'border-emerald-200 bg-emerald-50 text-emerald-700': feedback.type === 'success',
            'border-rose-200 bg-rose-50 text-rose-700': feedback.type === 'error',
          })}
        >
          {feedback.message}
        </div>
      )}

      {error && (
        <Alert className="border-rose-200 bg-rose-50">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          <AlertDescription className="text-rose-700">
            <strong>Error loading invoices:</strong> {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      )}

      <div className="lg:grid lg:grid-cols-[280px,1fr] lg:gap-6">
        <InvoiceFilterSidebar facets={facetsQuery.data?.facets} isLoading={facetsQuery.isLoading} />

        <div className="space-y-6">
          <InvoiceFilterChips savedViews={savedViews} />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            <Card className="rpd-card">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Total Invoices
                    </p>
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rpd-card">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Current Page Total
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(stats.totalAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rpd-card">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">Pending</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rpd-card">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">Paid</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.paid}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rpd-card">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">Overdue</p>
                    <p className="text-2xl font-bold text-rose-600">{stats.overdue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert className="border-slate-200 bg-slate-50">
            <ExternalLink className="h-4 w-4 text-primary" />
            <AlertDescription className="text-slate-700">
              <strong>Server-side pagination</strong> keeps the experience fast while filters refine large datasets.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Invoice List</span>
                <Badge variant="secondary">Page {pagination.pageIndex + 1} of {pageCount}</Badge>
              </CardTitle>
              <CardDescription className="space-y-1">
                <span>Use the toolbar filters and saved views to hone in on the records you need.</span>
                <span className="block text-xs text-slate-500">{showingMessage}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={invoiceColumns}
                data={invoices}
                pageCount={pageCount}
                pageSize={pagination.pageSize}
                pageIndex={pagination.pageIndex}
                onPaginationChange={handlePaginationChange}
                onSortingChange={handleSortingChange}
                onColumnFiltersChange={handleColumnFiltersChange}
                sorting={sorting}
                columnFilters={columnFilters}
                isLoading={isLoading}
                manualPagination
                manualSorting
                manualFiltering
                facets={facetsQuery.data?.facets}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

const SYNCED_FILTER_IDS = new Set(['status', 'category', 'vendorName'])

function columnFiltersKey(filters: ColumnFiltersState) {
  return JSON.stringify([...filters].sort((a, b) => a.id.localeCompare(b.id)))
}

function arraysAreEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}
