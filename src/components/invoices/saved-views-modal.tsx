"use client"

import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { InvoiceSavedView } from '@/lib/api/invoices'
import { useInvoiceFilters } from '@/hooks/use-invoices-filters'

interface SavedViewsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  views: InvoiceSavedView[]
  isLoading?: boolean
  onCreate: (payload: { name: string; isDefault?: boolean }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRefresh?: () => void
}

export function SavedViewsModal({
  open,
  onOpenChange,
  views,
  isLoading,
  onCreate,
  onDelete,
  onRefresh,
}: SavedViewsModalProps) {
  const { applySavedView, filters } = useInvoiceFilters()
  const [name, setName] = React.useState('')
  const [isDefault, setIsDefault] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const activeViewId = filters.savedViewId

  React.useEffect(() => {
    if (!open) {
      setName('')
      setIsDefault(false)
      setIsSubmitting(false)
    }
  }, [open])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      await onCreate({ name: name.trim(), isDefault })
      setName('')
      setIsDefault(false)
      onRefresh?.()
    } catch (error) {
      console.error('Failed to create saved view', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApply = (view: InvoiceSavedView) => {
    applySavedView(view)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Saved views</DialogTitle>
          <DialogDescription>
            Save frequent filter combinations to switch contexts quickly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Your views</p>
            {onRefresh && (
              <Button type="button" size="sm" variant="ghost" onClick={onRefresh} disabled={isLoading}>
                Refresh
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading saved views…</p>
            ) : views.length === 0 ? (
              <p className="text-sm text-slate-500">No saved views yet. Create one below to get started.</p>
            ) : (
              views.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center justify-between rounded-md border border-slate-200/60 bg-slate-50 px-3 py-2 dark:border-slate-800/60 dark:bg-slate-900/40"
                >
                  <button
                    type="button"
                    className="flex flex-1 flex-col items-start text-left"
                    onClick={() => handleApply(view)}
                  >
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {view.name}
                      {view.isDefault && <span className="ml-2 text-xs text-primary">Default</span>}
                    </span>
                    <span className="text-xs text-slate-500">
                      Updated {new Date(view.updatedAt).toLocaleString()}
                      {view.id === activeViewId && <span className="ml-2 text-xs text-primary">Active</span>}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      try {
                        await onDelete(view.id)
                        onRefresh?.()
                      } catch (error) {
                        console.error('Failed to delete saved view', error)
                      }
                    }}
                    className="text-slate-500 hover:text-red-600"
                    aria-label={`Delete ${view.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <Separator />

          <form className="space-y-3" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label htmlFor="saved-view-name">Create new view</Label>
              <Input
                id="saved-view-name"
                placeholder="e.g. Q1 Overdue"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(event) => setIsDefault(event.target.checked)}
              />
              Set as default view
            </label>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Save view
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
