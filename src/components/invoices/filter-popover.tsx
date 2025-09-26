'use client'

import * as React from 'react'
import { Filter } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { InvoiceFacetsResponse } from '@/lib/api/invoices'
import { useInvoiceFilters } from '@/hooks/use-invoices-filters'
import { cn } from '@/lib/utils'

import { InvoiceFilterForm } from './filter-sidebar'

interface InvoiceFilterPopoverProps {
  /** Facet data from Supabase API */
  facets?: InvoiceFacetsResponse['facets']

  /** Loading state for facets query */
  isLoading?: boolean

  /** Additional CSS classes */
  className?: string

  /** Optional callback when popover closes */
  onClose?: () => void
}

export function InvoiceFilterPopover({
  facets,
  isLoading,
  className,
  onClose,
}: InvoiceFilterPopoverProps) {
  const { filters } = useInvoiceFilters()
  const [open, setOpen] = React.useState(false)

  // Calculate active filter count
  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (filters.statuses.length > 0) count += filters.statuses.length
    if (filters.categories.length > 0) count += filters.categories.length
    if (filters.vendors.length > 0) count += filters.vendors.length
    if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) count += 1
    if (filters.amountRange && (filters.amountRange.min != null || filters.amountRange.max != null)) count += 1
    if (filters.search) count += 1
    return count
  }, [filters])

  const hasActiveFilters = activeFilterCount > 0

  const handleClose = React.useCallback(() => {
    setOpen(false)
    onClose?.()
  }, [onClose])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(className)}
          aria-label="Open invoice filters"
          aria-describedby="filter-description"
          aria-expanded={open}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge
              variant="secondary"
              className="ml-2 min-w-[1.25rem] h-5 px-1.5 text-xs"
              aria-label={`${activeFilterCount} active filters`}
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={8}
        role="dialog"
        aria-label="Invoice filters"
      >
        <div id="filter-description" className="sr-only">
          Filter invoices by status, category, vendor, date range, and amount
        </div>
        <InvoiceFilterForm
          facets={facets}
          isLoading={isLoading}
          onClose={handleClose}
          variant="popover"
        />
      </PopoverContent>
    </Popover>
  )
}
