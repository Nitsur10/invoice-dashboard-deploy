import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicesCsv } from '@/lib/csv-export'
import type { InvoiceFiltersState } from '@/types/invoice-filters'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const filters: InvoiceFiltersState | undefined = body?.filters

    if (!filters || typeof filters !== 'object') {
      return NextResponse.json({ code: 'INVALID_BODY', message: 'filters payload is required' }, { status: 400 })
    }

    // Create URL with filters to fetch invoices using the main API
    const searchParams = new URLSearchParams()

    // Add all filters to search params
    if (filters.search) searchParams.set('search', filters.search)
    if (filters.status?.length) {
      filters.status.forEach(s => searchParams.append('status', s))
    }
    if (filters.category?.length) {
      filters.category.forEach(c => searchParams.append('category', c))
    }
    if (filters.vendor?.length) {
      filters.vendor.forEach(v => searchParams.append('vendor', v))
    }
    if (filters.dateFrom) searchParams.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) searchParams.set('dateTo', filters.dateTo)
    if (filters.amountMin !== undefined) searchParams.set('amountMin', filters.amountMin.toString())
    if (filters.amountMax !== undefined) searchParams.set('amountMax', filters.amountMax.toString())

    // Set large limit to get all matching invoices
    searchParams.set('limit', '10000')
    searchParams.set('page', '0')

    // Create internal request to the invoices API
    const invoicesUrl = new URL('/api/invoices', request.url)
    invoicesUrl.search = searchParams.toString()

    const invoicesResponse = await fetch(invoicesUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!invoicesResponse.ok) {
      throw new Error(`Failed to fetch invoices: ${invoicesResponse.status}`)
    }

    const invoicesData = await invoicesResponse.json()
    const invoices = invoicesData.data || []

    if (invoices.length === 0) {
      return NextResponse.json({
        code: 'NO_DATA',
        message: 'No invoices found matching the specified filters'
      }, { status: 400 })
    }

    // Generate CSV content
    const csvContent = generateInvoicesCsv(invoices)

    // Generate filename with current date
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD format
    const filename = `invoices-export-${dateStr}.csv`

    // Return CSV as download
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error) {
    console.error('Unexpected error generating CSV export:', error)
    return NextResponse.json({
      code: 'SERVER_ERROR',
      message: 'Failed to generate CSV export'
    }, { status: 500 })
  }
}
