"use client"

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { InvoiceFacetsResponse } from '@/lib/api/invoices'
import {
  useInvoiceFilters,
  type InvoiceStatusFilter,
} from '@/hooks/use-invoices-filters'

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const MIN_REPORT_DATE = new Date(Date.UTC(2025, 4, 1))

interface InvoiceFilterSidebarProps {
  facets?: InvoiceFacetsResponse['facets']
  isLoading?: boolean
  className?: string
  onClose?: () => void
}

export function InvoiceFilterSidebar({
  facets,
  isLoading,
  className,
  onClose,
}: InvoiceFilterSidebarProps) {
  return (
    <aside className={cn('hidden lg:block', className)}>
      <div className="sticky top-28 space-y-4">
        <InvoiceFilterForm facets={facets} isLoading={isLoading} onClose={onClose} />
      </div>
    </aside>
  )
}

interface InvoiceFilterFormProps {
  facets?: InvoiceFacetsResponse['facets']
  isLoading?: boolean
  onClose?: () => void
}

export function InvoiceFilterForm({ facets, isLoading, onClose }: InvoiceFilterFormProps) {
  const {
    filters,
    reset,
    toggleStatus,
    toggleCategory,
    toggleVendor,
    setDateRange,
    setAmountRange,
  } = useInvoiceFilters()

  const [amountMin, setAmountMin] = React.useState('')
  const [amountMax, setAmountMax] = React.useState('')

  React.useEffect(() => {
    setAmountMin(filters.amountRange?.min != null ? String(filters.amountRange.min) : '')
    setAmountMax(filters.amountRange?.max != null ? String(filters.amountRange.max) : '')
  }, [filters.amountRange?.min, filters.amountRange?.max])

  const applyAmountRange = React.useCallback(
    (minValue: string, maxValue: string) => {
      const minNumber = minValue ? Number(minValue) : undefined
      const maxNumber = maxValue ? Number(maxValue) : undefined

      if (Number.isNaN(minNumber) || Number.isNaN(maxNumber)) {
        return
      }

      setAmountRange({
        min: minNumber,
        max: maxNumber,
      })
    },
    [setAmountRange],
  )

  const setQuickDateRange = (
    preset: 'thisMonth' | 'lastMonth' | 'last2Months' | 'thisQuarter' | 'yearToDate',
  ) => {
    const now = new Date()
    const clampDate = (date: Date) => {
      const minDate = MIN_REPORT_DATE
      return date < minDate ? minDate : date
    }

    const toInputValue = (date: Date) => date.toISOString().split('T')[0]

    let start: Date
    let end: Date | undefined

    switch (preset) {
      case 'thisMonth':
        start = clampDate(new Date(now.getFullYear(), now.getMonth(), 1))
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'lastMonth':
        start = clampDate(new Date(now.getFullYear(), now.getMonth() - 1, 1))
        end = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'last2Months':
        start = clampDate(new Date(now.getFullYear(), now.getMonth() - 2, 1))
        end = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'thisQuarter': {
        const quarter = Math.floor(now.getMonth() / 3)
        start = clampDate(new Date(now.getFullYear(), quarter * 3, 1))
        end = new Date(now.getFullYear(), quarter * 3 + 3, 0)
        break
      }
      case 'yearToDate':
      default:
        start = clampDate(new Date(now.getFullYear(), 0, 1))
        end = now
        break
    }

    const startISO = toInputValue(start)
    const endISO = end ? toInputValue(end) : undefined

    setDateRange({
      start: startISO,
      end: endISO,
    })
  }

  const clearAll = () => {
    reset()
    setAmountMin('')
    setAmountMax('')
    onClose?.()
  }

  const statuses = facets?.statuses?.map((status) => status.value as InvoiceStatusFilter) ?? ['pending', 'paid', 'overdue']
  const categories = facets?.categories ?? []
  const vendors = facets?.vendors ?? []

  const isActive = (value: string, collection: string[]) => collection.includes(value)

  const startDate = React.useMemo(() => parseISODate(filters.dateRange?.start), [filters.dateRange?.start])
  const endDate = React.useMemo(() => parseISODate(filters.dateRange?.end), [filters.dateRange?.end])

  const handleCalendarChange = (range: [Date | null, Date | null] | null) => {
    const [start, end] = range ?? [null, null]

    if (!start && !end) {
      setDateRange({})
      return
    }

    setDateRange({
      start: start ? formatISODate(start) : undefined,
      end: end ? formatISODate(end) : undefined,
    })
  }

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Filters</CardTitle>
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={isLoading}>
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">Date range</p>
            <div className="flex flex-wrap gap-1">
              <QuickRangeButton label="This month" onClick={() => setQuickDateRange('thisMonth')} disabled={isLoading} />
              <QuickRangeButton label="Last month" onClick={() => setQuickDateRange('lastMonth')} disabled={isLoading} />
              <QuickRangeButton label="Last 2 months" onClick={() => setQuickDateRange('last2Months')} disabled={isLoading} />
              <QuickRangeButton label="This quarter" onClick={() => setQuickDateRange('thisQuarter')} disabled={isLoading} />
              <QuickRangeButton label="Year to date" onClick={() => setQuickDateRange('yearToDate')} disabled={isLoading} />
            </div>
          </div>
          <div className="calendar-surface rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <DatePicker
              inline
              selectsRange
              startDate={startDate}
              endDate={endDate}
              onChange={(range) => handleCalendarChange(range as [Date | null, Date | null])}
              minDate={MIN_REPORT_DATE}
              maxDate={new Date()}
              isClearable
              disabled={isLoading}
              calendarClassName="invoice-date-picker"
              wrapperClassName="invoice-date-picker-wrapper"
              shouldCloseOnSelect={false}
              monthsShown={1}
              fixedHeight
            />
          </div>
          <div className="text-xs text-slate-500">
            <p>
              <span className="font-medium text-slate-600">From:</span>{' '}
              {startDate ? formatDisplayDate(startDate) : 'Any time'}
            </p>
            <p>
              <span className="font-medium text-slate-600">To:</span>{' '}
              {endDate ? formatDisplayDate(endDate) : 'Present'}
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Status</p>
          <div className="flex flex-wrap gap-2">
            {isLoading && !facets ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-8 w-20 rounded-full" />)
            ) : (
              statuses.map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant={isActive(status, filters.statuses) ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full capitalize"
                  aria-pressed={isActive(status, filters.statuses)}
                  onClick={() => toggleStatus(status)}
                >
                  {status}
                </Button>
              ))
            )}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Categories</p>
          <div className="flex flex-wrap gap-2">
            {isLoading && !facets ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-8 w-24" />)
            ) : categories.length === 0 ? (
              <p className="text-xs text-slate-500">No categories detected</p>
            ) : (
              categories.map((category) => (
                <Button
                  key={category.value}
                  type="button"
                  variant={isActive(category.value, filters.categories) ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full"
                  aria-pressed={isActive(category.value, filters.categories)}
                  onClick={() => toggleCategory(category.value)}
                >
                  {category.value}
                </Button>
              ))
            )}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Vendors</p>
          <div className="flex flex-wrap gap-2">
            {isLoading && !facets ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-8 w-28" />)
            ) : vendors.length === 0 ? (
              <p className="text-xs text-slate-500">No vendor facets available</p>
            ) : (
              vendors.map((vendor) => (
                <Button
                  key={vendor.value}
                  type="button"
                  variant={isActive(vendor.value, filters.vendors) ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full"
                  aria-pressed={isActive(vendor.value, filters.vendors)}
                  onClick={() => toggleVendor(vendor.value)}
                >
                  {vendor.value}
                </Button>
              ))
            )}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Amount range</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-slate-500">Min</Label>
              <Input
                inputMode="decimal"
                value={amountMin}
                onChange={(event) => {
                  const value = event.target.value
                  setAmountMin(value)
                  applyAmountRange(value, amountMax)
                }}
                placeholder={facets?.amountRange ? String(facets.amountRange.min) : '0'}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-slate-500">Max</Label>
              <Input
                inputMode="decimal"
                value={amountMax}
                onChange={(event) => {
                  const value = event.target.value
                  setAmountMax(value)
                  applyAmountRange(amountMin, value)
                }}
                placeholder={facets?.amountRange ? String(facets.amountRange.max) : ''}
                disabled={isLoading}
              />
            </div>
          </div>
        </section>

        {onClose && (
          <div className="flex justify-end">
            <Button type="button" onClick={onClose} variant="secondary">
              Done
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function QuickRangeButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  )
}

function formatISODate(date: Date) {
  return date.toISOString().split('T')[0]
}

function parseISODate(value?: string) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
