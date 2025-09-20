"use client"

import * as React from 'react'
import { Loader2, Download } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { useInvoiceFilters } from '@/hooks/use-invoices-filters'
import { serializeInvoiceFilters } from '@/types/invoice-filters'

type ExportButtonState = 'idle' | 'exporting' | 'failed'

interface ExportProgressButtonProps {
  className?: string
  onStatusChange?: (payload: { state: ExportButtonState; message?: string; error?: string }) => void
}

export function ExportProgressButton({ className, onStatusChange }: ExportProgressButtonProps) {
  const { filters } = useInvoiceFilters()
  const [state, setState] = React.useState<ExportButtonState>('idle')
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const exportMutation = useMutation({
    mutationFn: async () => {
      setState('exporting')
      onStatusChange?.({ state: 'exporting', message: 'Generating CSV export...' })

      const snapshot = serializeInvoiceFilters(filters)
      const response = await fetch('/api/invoices/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters: snapshot }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Export failed: ${response.status} ${response.statusText}`)
      }

      // Get the CSV blob and filename
      const blob = await response.blob()
      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'invoices-export.csv'

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      return { filename }
    },
    onSuccess: (result) => {
      setState('idle')
      setErrorMessage(null)
      onStatusChange?.({ state: 'idle', message: `CSV downloaded: ${result.filename}` })
    },
    onError: (error: unknown) => {
      setState('failed')
      const message = error instanceof Error ? error.message : 'Unable to export CSV'
      setErrorMessage(message)
      onStatusChange?.({ state: 'failed', error: message })
    },
  })

  const handleClick = () => {
    setErrorMessage(null)
    exportMutation.mutate()
  }

  const label = getButtonLabel(state)
  const isDisabled = state === 'exporting' || exportMutation.isLoading

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isDisabled}
        className={className}
      >
        {state === 'exporting' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {label}
      </Button>
      {errorMessage && (
        <span className="text-xs text-rose-600" role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  )
}

function getButtonLabel(state: ExportButtonState) {
  switch (state) {
    case 'exporting':
      return 'Generating CSV...'
    case 'failed':
      return 'Retry export'
    default:
      return 'Export CSV'
  }
}
