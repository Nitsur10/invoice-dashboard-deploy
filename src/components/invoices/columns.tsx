"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, MoreHorizontal, ExternalLink, CheckCircle, Clock, AlertTriangle, ChevronDown } from "lucide-react"
import { Invoice } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { updateInvoiceStatus } from "@/lib/api/invoices"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { useState } from "react"

export const invoiceColumns: ColumnDef<Invoice>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        className="h-4 w-4 rounded border border-slate-300 dark:border-slate-600"
        aria-label="Select all invoices on this page"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        className="h-4 w-4 rounded border border-slate-300 dark:border-slate-600"
        aria-label={`Select invoice ${row.original.invoiceNumber}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "invoiceNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3 text-slate-900 dark:text-slate-100 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Invoice #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const invoice = row.original
      return (
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {invoice.invoiceNumber}
          </span>
          {invoice.invoiceUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(invoice.invoiceUrl, '_blank')}
              className="h-6 w-6 p-0"
              aria-label={`Open invoice ${invoice.invoiceNumber} in new tab`}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "vendorName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3 text-slate-900 dark:text-slate-100 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Vendor
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const vendor = row.getValue("vendorName") as string
      return (
        <div className="max-w-[200px]">
          <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
            {vendor}
          </div>
          <div className="truncate text-xs text-slate-600 dark:text-slate-300">
            {row.original.vendorEmail}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number
      return (
        <div className="text-right">
          <div className="font-semibold text-lg text-primary rpd-text-gradient">
            {formatCurrency(amount)}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3 text-slate-900 dark:text-slate-100 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const invoice = row.original
      const status = row.getValue("status") as string

      const statusConfig = {
        pending: {
          label: "Pending",
          variant: "secondary" as const,
          className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800/30"
        },
        in_review: {
          label: "In Review",
          variant: "secondary" as const,
          className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800/30"
        },
        approved: {
          label: "Approved",
          variant: "secondary" as const,
          className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800/30"
        },
        paid: {
          label: "Paid",
          variant: "secondary" as const,
          className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800/30"
        },
        overdue: {
          label: "Overdue",
          variant: "destructive" as const,
          className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800/30"
        },
      }

      const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

      return (
        <div className="flex items-center gap-2">
          <Badge variant={config.variant} className={config.className}>
            {config.label}
          </Badge>
          <StatusUpdateDropdown invoice={invoice} />
        </div>
      )
    },
  },
  {
    accessorKey: "line_1_desc",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3 text-slate-900 dark:text-slate-100 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Description
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const description = row.getValue("line_1_desc") as string
      return <DescriptionCell description={description} />
    },
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3 text-slate-900 dark:text-slate-100 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Due Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const dueDate = row.getValue("dueDate") as Date | undefined

      if (!dueDate) {
        return <div className="text-sm text-slate-500 dark:text-slate-400">—</div>
      }

      const isOverdue = dueDate < new Date() && row.original.status !== 'paid'

      return (
        <div className={`text-sm font-medium ${isOverdue ? 'text-red-600 dark:text-red-300' : 'text-slate-700 dark:text-slate-300'}`}>
          {dueDate.toLocaleDateString('en-AU')}
        </div>
      )
    },
  },
  {
    accessorKey: "receivedDate", 
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3 text-slate-900 dark:text-slate-100 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Received
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const receivedDate = row.getValue("receivedDate") as Date | undefined

      if (!receivedDate) {
        return <div className="text-sm text-slate-500 dark:text-slate-400">—</div>
      }

      return (
        <div className="text-sm text-slate-600 dark:text-slate-300">
          {receivedDate.toLocaleDateString('en-AU')}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const invoice = row.original

      return (
        <div className="pr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" aria-label={`Open actions menu for invoice ${invoice.invoiceNumber}`}>
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Status Updates */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">Update Status</DropdownMenuLabel>
              {invoice.status !== 'pending' && (
                <DropdownMenuItem
                  onClick={async () => {
                    const result = await updateInvoiceStatus(invoice.id, 'pending')
                    if (result.success) {
                      window.dispatchEvent(new CustomEvent('status-update-toast', {
                        detail: { type: 'success', message: `Invoice ${invoice.invoiceNumber} status updated to Pending` }
                      }))
                    } else {
                      window.dispatchEvent(new CustomEvent('status-update-toast', {
                        detail: { type: 'error', message: result.error || 'Failed to update status' }
                      }))
                    }
                  }}
                  className="cursor-pointer"
                >
                  <Clock className="mr-2 h-4 w-4 text-blue-500" />
                  Mark as Pending
                </DropdownMenuItem>
              )}
              {invoice.status !== 'in_review' && (
                <DropdownMenuItem
                  onClick={async () => {
                    const result = await updateInvoiceStatus(invoice.id, 'in_review')
                    if (result.success) {
                      window.dispatchEvent(new CustomEvent('status-update-toast', {
                        detail: { type: 'success', message: `Invoice ${invoice.invoiceNumber} status updated to In Review` }
                      }))
                    } else {
                      window.dispatchEvent(new CustomEvent('status-update-toast', {
                        detail: { type: 'error', message: result.error || 'Failed to update status' }
                      }))
                    }
                  }}
                  className="cursor-pointer"
                >
                  <Clock className="mr-2 h-4 w-4 text-amber-500" />
                  Mark as In Review
                </DropdownMenuItem>
              )}
              {invoice.status !== 'approved' && (
                <DropdownMenuItem
                  onClick={async () => {
                    const result = await updateInvoiceStatus(invoice.id, 'approved')
                    if (result.success) {
                      window.dispatchEvent(new CustomEvent('status-update-toast', {
                        detail: { type: 'success', message: `Invoice ${invoice.invoiceNumber} status updated to Approved` }
                      }))
                    } else {
                      window.dispatchEvent(new CustomEvent('status-update-toast', {
                        detail: { type: 'error', message: result.error || 'Failed to update status' }
                      }))
                    }
                  }}
                  className="cursor-pointer"
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-purple-500" />
                  Mark as Approved
                </DropdownMenuItem>
              )}
              {invoice.status !== 'paid' && (
                <DropdownMenuItem
                  onClick={async () => {
                    const result = await updateInvoiceStatus(invoice.id, 'paid')
                    if (result.success) {
                      window.dispatchEvent(new CustomEvent('status-update-toast', {
                        detail: { type: 'success', message: `Invoice ${invoice.invoiceNumber} status updated to Paid` }
                      }))
                    } else {
                      window.dispatchEvent(new CustomEvent('status-update-toast', {
                        detail: { type: 'error', message: result.error || 'Failed to update status' }
                      }))
                    }
                  }}
                  className="cursor-pointer"
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Mark as Paid
                </DropdownMenuItem>
              )}
              {invoice.status !== 'overdue' && (
                <DropdownMenuItem
                  onClick={async () => {
                    const result = await updateInvoiceStatus(invoice.id, 'overdue')
                    if (result.success) {
                      window.dispatchEvent(new CustomEvent('status-update-toast', {
                        detail: { type: 'success', message: `Invoice ${invoice.invoiceNumber} status updated to Overdue` }
                      }))
                    } else {
                      window.dispatchEvent(new CustomEvent('status-update-toast', {
                        detail: { type: 'error', message: result.error || 'Failed to update status' }
                      }))
                    }
                  }}
                  className="cursor-pointer"
                >
                  <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                  Mark as Overdue
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* File Actions */}
              {invoice.invoiceUrl && (
                <DropdownMenuItem
                  onClick={() => window.open(invoice.invoiceUrl, '_blank')}
                  className="cursor-pointer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Invoice
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* Copy Actions */}
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(invoice.invoiceNumber)}
                className="cursor-pointer"
              >
                Copy Invoice #
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(invoice.vendorEmail)}
                className="cursor-pointer"
              >
                Copy Vendor Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]

// Description Cell Component
interface DescriptionCellProps {
  description: string
}

function DescriptionCell({ description }: DescriptionCellProps) {
  if (!description) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">—</div>
  }

  // Get first line only
  const truncatedDescription = description.split('\n')[0]
  const needsTooltip = description !== truncatedDescription || truncatedDescription.length > 50

  return (
    <div className="max-w-[200px]">
      <div
        className={`truncate font-medium text-slate-900 dark:text-slate-100 ${
          needsTooltip ? 'cursor-help' : ''
        }`}
        title={needsTooltip ? description : undefined}
        aria-label={needsTooltip ? `Description: ${description}` : undefined}
        tabIndex={needsTooltip ? 0 : -1}
        data-testid="description-cell"
      >
        {truncatedDescription}
      </div>
    </div>
  )
}

// Export DescriptionCell for testing
export { DescriptionCell }

// Status Update Dropdown Component
interface StatusUpdateDropdownProps {
  invoice: Invoice
}

function StatusUpdateDropdown({ invoice }: StatusUpdateDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  const statusUpdateMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update status')
      }

      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setIsOpen(false)
    },
    onError: (error) => {
      console.error('Failed to update invoice status:', error)
    },
  })

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'blue' },
    { value: 'in_review', label: 'In Review', color: 'amber' },
    { value: 'approved', label: 'Approved', color: 'purple' },
    { value: 'paid', label: 'Paid', color: 'emerald' },
    { value: 'overdue', label: 'Overdue', color: 'red' },
  ]

  const currentStatus = invoice.status || 'pending'

  const handleStatusChange = (newStatus: string) => {
    if (newStatus !== currentStatus) {
      statusUpdateMutation.mutate(newStatus)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
          disabled={statusUpdateMutation.isPending}
        >
          {statusUpdateMutation.isPending ? (
            <div className="h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <DropdownMenuLabel className="text-slate-900 dark:text-slate-100">Update Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            className={`cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 ${
              currentStatus === option.value ? 'bg-slate-100 dark:bg-slate-800' : ''
            }`}
            disabled={statusUpdateMutation.isPending}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                option.color === 'blue' ? 'bg-blue-500' :
                option.color === 'amber' ? 'bg-amber-500' :
                option.color === 'purple' ? 'bg-purple-500' :
                option.color === 'emerald' ? 'bg-emerald-500' :
                option.color === 'red' ? 'bg-red-500' : 'bg-blue-500'
              }`} />
              {option.label}
              {currentStatus === option.value && (
                <span className="ml-auto text-xs text-slate-600 dark:text-slate-400">✓</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
