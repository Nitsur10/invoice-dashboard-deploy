'use client'

import { InvoiceCard } from './invoice-card'
import type { Invoice } from '@/lib/types'

interface InvoiceCardListProps {
  invoices: Invoice[]
}

/**
 * Container component for displaying invoices as cards on mobile
 */
export function InvoiceCardList({ invoices }: InvoiceCardListProps) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No invoices found
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <InvoiceCard key={invoice.id} invoice={invoice} />
      ))}
    </div>
  )
}
