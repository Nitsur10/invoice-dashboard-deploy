"use client"

import * as React from 'react'
import { Loader2, Download } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import {
  enqueueInvoiceExport,
  fetchInvoiceExportJob,
  type InvoiceExportJob,
} from '@/lib/api/invoices'
import { useInvoiceFilters } from '@/hooks/use-invoices-filters'
import { serializeInvoiceFilters } from '@/types/invoice-filters'

type ExportButtonState = 'idle' | 'queued' | 'processing' | 'ready' | 'failed'

interface ExportProgressButtonProps {
  className?: string
  onStatusChange?: (payload: { state: ExportButtonState; message?: string; error?: string }) => void
}

export function ExportProgressButton({ className, onStatusChange }: ExportProgressButtonProps) {
  const { filters } = useInvoiceFilters()
  const [job, setJob] = React.useState<InvoiceExportJob | null>(null)
  const [state, setState] = React.useState<ExportButtonState>('idle')
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const exportMutation = useMutation({
    mutationFn: async () => {
      setState('queued')
      const snapshot = serializeInvoiceFilters(filters)
      return enqueueInvoiceExport({ filters: snapshot })
    },
    onSuccess: (nextJob) => {
      setErrorMessage(null)
      setJob(nextJob)
      setState(nextJob.status === 'processing' ? 'processing' : 'queued')
      onStatusChange?.({ state: nextJob.status === 'processing' ? 'processing' : 'queued', message: 'Export job created' })
    },
    onError: (error: unknown) => {
      setState('failed')
      const message = error instanceof Error ? error.message : 'Unable to start export'
      setErrorMessage(message)
      onStatusChange?.({ state: 'failed', error: message })
    },
  })

  const jobQuery = useQuery({
    queryKey: ['invoice-export-job', job?.id],
    enabled: Boolean(job?.id),
    queryFn: () => fetchInvoiceExportJob(job!.id),
    refetchInterval: (latestJob) => {
      if (!latestJob) return false
      if (latestJob.status === 'completed' || latestJob.status === 'failed') {
        return false
      }
      return 2000
    },
  })

  React.useEffect(() => {
    if (!jobQuery.data) return

    setJob(jobQuery.data)

    if (jobQuery.data.status === 'completed') {
      setState('ready')
      if (jobQuery.data.filePath) {
        try {
          window.open(jobQuery.data.filePath, '_blank', 'noopener')
        } catch (error) {
          console.warn('Unable to open export file automatically', error)
        }
      }
      onStatusChange?.({ state: 'ready', message: 'Export ready to download' })
    } else if (jobQuery.data.status === 'failed') {
      setState('failed')
      const message = jobQuery.data.errorMessage || 'Export job failed'
      setErrorMessage(message)
      onStatusChange?.({ state: 'failed', error: message })
    } else {
      setState('processing')
      onStatusChange?.({ state: 'processing', message: 'Preparing export…' })
    }
  }, [jobQuery.data, onStatusChange])

  const handleClick = () => {
    if (state === 'ready' && job?.filePath) {
      window.open(job.filePath, '_blank', 'noopener')
      return
    }

    setErrorMessage(null)
    exportMutation.mutate()
  }

  const label = getButtonLabel(state)
  const isDisabled = state === 'queued' || state === 'processing' || exportMutation.isLoading

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
        {state === 'queued' || state === 'processing' ? (
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
    case 'queued':
      return 'Export queued…'
    case 'processing':
      return 'Processing export…'
    case 'ready':
      return 'Download ready'
    case 'failed':
      return 'Retry export'
    default:
      return 'Export CSV'
  }
}
