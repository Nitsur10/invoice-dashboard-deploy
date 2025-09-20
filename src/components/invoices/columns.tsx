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
import { ArrowUpDown, MoreHorizontal, ExternalLink } from "lucide-react"
import { Invoice } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

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
          className="h-8 px-2 lg:px-3"
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
          <span className="font-medium text-slate-900 dark:text-slate-100">
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
          className="h-8 px-2 lg:px-3"
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
          <div className="truncate font-medium text-slate-900 dark:text-slate-100">
            {vendor}
          </div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
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
          className="h-8 px-2 lg:px-3"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      
      const statusConfig = {
        pending: { 
          label: "Pending", 
          variant: "secondary" as const,
          className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
        },
        paid: { 
          label: "Paid", 
          variant: "secondary" as const,
          className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
        },
        overdue: { 
          label: "Overdue", 
          variant: "destructive" as const,
          className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
        },
      }
      
      const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
      
      return (
        <Badge variant={config.variant} className={config.className}>
          {config.label}
        </Badge>
      )
    },
  },
  {
    accessorKey: "category",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const category = row.getValue("category") as string | undefined

      if (!category) {
        return <span className="text-sm italic text-slate-400">Uncategorised</span>
      }

      return (
        <Badge variant="secondary" className="border-slate-200 bg-slate-100/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
          {category}
        </Badge>
      )
    },
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Due Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const dueDate = row.getValue("dueDate") as Date | undefined

      if (!dueDate) {
        return <div className="text-sm text-slate-400">—</div>
      }

      const isOverdue = dueDate < new Date() && row.original.status !== 'paid'

      return (
        <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
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
          className="h-8 px-2 lg:px-3"
        >
          Received
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const receivedDate = row.getValue("receivedDate") as Date | undefined

      if (!receivedDate) {
        return <div className="text-sm text-slate-400">—</div>
      }

      return (
        <div className="text-sm text-slate-600 dark:text-slate-400">
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
            {invoice.invoiceUrl && (
              <DropdownMenuItem
                onClick={() => window.open(invoice.invoiceUrl, '_blank')}
                className="cursor-pointer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Invoice
              </DropdownMenuItem>
            )}
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
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]
