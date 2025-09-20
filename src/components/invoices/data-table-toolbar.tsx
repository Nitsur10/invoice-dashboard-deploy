"use client"

import { Cross2Icon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "@/components/invoices/data-table-view-options"
import { DataTableFacetedFilter } from "@/components/invoices/data-table-faceted-filter"
import { Search } from "lucide-react"
import type { InvoiceFacetsResponse } from "@/lib/api/invoices"
import { useInvoiceFilters } from "@/hooks/use-invoices-filters"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  facets?: InvoiceFacetsResponse['facets']
}

export function DataTableToolbar<TData>({
  table,
  facets,
}: DataTableToolbarProps<TData>) {
  const { filters, setSearch, reset } = useInvoiceFilters()
  const isFiltered = table.getState().columnFilters.length > 0 || Boolean(filters.search)

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            id="search-invoices"
            placeholder="Search invoices..."
            value={filters.search}
            onChange={(event) => {
              setSearch(event.target.value)
            }}
            className="pl-8"
            aria-label="Search invoices by vendor name, invoice number, or description"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {table.getColumn("status") && (
            <DataTableFacetedFilter
              column={table.getColumn("status")}
              title="Status"
              options={(facets?.statuses ?? []).map((status) => ({
                value: status.value,
                label: status.value.charAt(0).toUpperCase() + status.value.slice(1),
              }))}
            />
          )}
          {table.getColumn("category") && (
            <DataTableFacetedFilter
              column={table.getColumn("category")}
              title="Category"
              options={(facets?.categories ?? []).map((category) => ({
                value: category.value,
                label: category.value,
              }))}
            />
          )}
        </div>

        {isFiltered && (
          <Button
            variant="secondary"
            onClick={() => {
              table.resetColumnFilters()
              table.resetColumnVisibility()
              reset()
            }}
            className="h-8 px-2 lg:px-3"
          >
            Clear filters
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <DataTableViewOptions table={table} />
    </div>
  )
}
