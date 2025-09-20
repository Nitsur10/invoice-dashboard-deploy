import { Invoice } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

export interface CsvExportOptions {
  includeHeaders?: boolean
  delimiter?: string
}

export function generateInvoicesCsv(
  invoices: Invoice[],
  options: CsvExportOptions = {}
): string {
  const { includeHeaders = true, delimiter = ',' } = options

  const headers = [
    'Invoice Number',
    'Vendor Name',
    'Vendor Email',
    'Amount',
    'Status',
    'Category',
    'Due Date',
    'Received Date',
    'Description',
    'Invoice URL'
  ]

  const rows: string[] = []

  if (includeHeaders) {
    rows.push(headers.map(header => escapeCSVValue(header, delimiter)).join(delimiter))
  }

  for (const invoice of invoices) {
    const row = [
      invoice.invoiceNumber || '',
      invoice.vendorName || '',
      invoice.vendorEmail || '',
      formatCurrency(invoice.amount || 0),
      invoice.status || '',
      invoice.category || '',
      invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-AU') : '',
      invoice.receivedDate ? new Date(invoice.receivedDate).toLocaleDateString('en-AU') : '',
      invoice.description || '',
      invoice.invoiceUrl || ''
    ]

    rows.push(row.map(value => escapeCSVValue(String(value), delimiter)).join(delimiter))
  }

  return rows.join('\n')
}

function escapeCSVValue(value: string, delimiter: string): string {
  // If the value contains the delimiter, newlines, or quotes, wrap it in quotes
  if (value.includes(delimiter) || value.includes('\n') || value.includes('\r') || value.includes('"')) {
    // Escape existing quotes by doubling them
    const escapedValue = value.replace(/"/g, '""')
    return `"${escapedValue}"`
  }
  return value
}

export function createCSVDownload(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}