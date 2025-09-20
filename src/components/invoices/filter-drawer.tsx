"use client"

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import type { InvoiceFacetsResponse } from '@/lib/api/invoices'
import { cn } from '@/lib/utils'

import { InvoiceFilterForm } from './filter-sidebar'

interface InvoiceFilterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  facets?: InvoiceFacetsResponse['facets']
  isLoading?: boolean
}

export function InvoiceFilterDrawer({ open, onOpenChange, facets, isLoading }: InvoiceFilterDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-slate-900/40 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md translate-x-full flex-col bg-white shadow-2xl transition-transform duration-200 ease-out data-[state=open]:translate-x-0',
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 bg-slate-50">
            <div>
              <p className="text-sm font-semibold text-slate-700">Filters</p>
              <p className="text-xs text-slate-500">Refine invoices with advanced options</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close filters</span>
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <InvoiceFilterForm facets={facets} isLoading={isLoading} onClose={() => onOpenChange(false)} />
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
