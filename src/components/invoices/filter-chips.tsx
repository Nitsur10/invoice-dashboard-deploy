"use client"

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { InvoiceSavedView } from '@/lib/api/invoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useInvoiceFilters } from '@/hooks/use-invoices-filters'

interface InvoiceFilterChipsProps {
  savedViews?: InvoiceSavedView[]
  className?: string
}

interface ChipDefinition {
  id: string
  label: string
  onRemove: () => void
}

export function InvoiceFilterChips({ savedViews, className }: InvoiceFilterChipsProps) {
  const {
    filters,
    setFilters,
    toggleStatus,
    toggleCategory,
    toggleVendor,
    setSearch,
    setDateRange,
    setAmountRange,
    reset,
  } = useInvoiceFilters()

  const chips: ChipDefinition[] = []

  if (filters.savedViewId) {
    const view = savedViews?.find((candidate) => candidate.id === filters.savedViewId)
    chips.push({
      id: `saved-view-${filters.savedViewId}`,
      label: `View: ${view?.name ?? 'Custom view'}`,
      onRemove: () => {
        setFilters((prev) => ({ ...prev, savedViewId: undefined }))
      },
    })
  }

  if (filters.search) {
    chips.push({
      id: 'search',
      label: `Search: “${filters.search}”`,
      onRemove: () => setSearch(''),
    })
  }

  filters.statuses.forEach((status) => {
    chips.push({
      id: `status-${status}`,
      label: `Status: ${status}`,
      onRemove: () => toggleStatus(status),
    })
  })

  filters.categories.forEach((category) => {
    chips.push({
      id: `category-${category}`,
      label: `Category: ${category}`,
      onRemove: () => toggleCategory(category),
    })
  })

  filters.vendors.forEach((vendor) => {
    chips.push({
      id: `vendor-${vendor}`,
      label: `Vendor: ${vendor}`,
      onRemove: () => toggleVendor(vendor),
    })
  })

  if (filters.dateRange?.start || filters.dateRange?.end) {
    const startLabel = filters.dateRange?.start ? formatDate(filters.dateRange.start) : 'Any'
    const endLabel = filters.dateRange?.end ? formatDate(filters.dateRange.end) : 'Present'
    chips.push({
      id: 'date-range',
      label: `Date: ${startLabel} → ${endLabel}`,
      onRemove: () => setDateRange({}),
    })
  }

  if (filters.amountRange?.min != null || filters.amountRange?.max != null) {
    const minLabel =
      filters.amountRange?.min != null ? formatCurrency(filters.amountRange.min) : 'Any'
    const maxLabel =
      filters.amountRange?.max != null ? formatCurrency(filters.amountRange.max) : 'Any'
    chips.push({
      id: 'amount-range',
      label: `Amount: ${minLabel} → ${maxLabel}`,
      onRemove: () => setAmountRange(),
    })
  }

  if (chips.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <Button
            key={chip.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full px-3"
            onClick={chip.onRemove}
          >
            <span>{chip.label}</span>
            <X className="ml-2 h-3.5 w-3.5" />
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300"
          onClick={() => {
            reset()
          }}
        >
          Clear all
        </Button>
      </div>
    </div>
  )
}
