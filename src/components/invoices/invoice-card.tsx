'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { Invoice } from '@/lib/types'

interface InvoiceCardProps {
  invoice: Invoice
}

/**
 * Mobile-friendly card view for individual invoices
 * Displays essential information with expand/collapse for details
 */
export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Determine badge variant based on status
  const statusVariant = {
    paid: 'default',
    pending: 'secondary',
    overdue: 'destructive'
  }[invoice.status.toLowerCase()] as 'default' | 'secondary' | 'destructive'

  // Format dates
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-'
    try {
      const d = typeof date === 'string' ? new Date(date) : date
      return d.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return '-'
    }
  }

  return (
    <Card
      className="w-full hover:shadow-md transition-shadow"
      data-testid="invoice-card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-base">
              {invoice.invoiceNumber}
            </span>
            <span className="text-sm text-muted-foreground">
              {invoice.category}
            </span>
          </div>
          <Badge variant={statusVariant}>
            {invoice.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Essential Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-semibold text-base">
              {formatCurrency(invoice.amount)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Vendor:</span>
            <span className="truncate ml-2 max-w-[60%] text-right">
              {invoice.vendorName}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Due Date:</span>
            <span>{formatDate(invoice.dueDate)}</span>
          </div>
        </div>

        {/* Expandable Details */}
        {expanded && (
          <div className="pt-3 border-t space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issue Date:</span>
              <span>{formatDate(invoice.issueDate)}</span>
            </div>

            {invoice.paidDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid Date:</span>
                <span>{formatDate(invoice.paidDate)}</span>
              </div>
            )}

            {invoice.description && (
              <div className="pt-2">
                <span className="text-muted-foreground block mb-1">Description:</span>
                <span className="text-xs">{invoice.description}</span>
              </div>
            )}
          </div>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 h-9"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show More
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
