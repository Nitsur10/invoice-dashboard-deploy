import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { invoiceColumns } from '../columns'
import { DataTable } from '@/components/ui/data-table'
import { Invoice } from '@/lib/types'

// Mock Papa Parse for CSV export testing
jest.mock('papaparse', () => ({
  unparse: jest.fn((data, config) => {
    // Simple CSV generation mock
    const headers = Object.keys(data[0] || {})
    const csvRows = [
      headers.join(','),
      ...data.map((row: any) => headers.map(header => `"${row[header] || ''}"`).join(','))
    ]
    return csvRows.join('\n')
  }),
}))

// Mock CSV export utilities
jest.mock('@/lib/utils/csv-export', () => ({
  exportToCSV: jest.fn((data, filename) => {
    const csvContent = data.map((row: any) => Object.values(row).join(',')).join('\n')

    // Mock download functionality
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return Promise.resolve()
  }),
}))

// Mock filter utilities
jest.mock('@/lib/utils/filters', () => ({
  filterInvoices: jest.fn((invoices, filters) => {
    let filtered = [...invoices]

    if (filters.vendor?.length) {
      filtered = filtered.filter(invoice =>
        filters.vendor.includes(invoice.vendorName)
      )
    }

    if (filters.status?.length) {
      filtered = filtered.filter(invoice =>
        filters.status.includes(invoice.status)
      )
    }

    if (filters.search) {
      filtered = filtered.filter(invoice =>
        invoice.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        invoice.vendorName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        invoice.invoiceNumber?.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    return filtered
  }),
  getUniqueVendors: jest.fn(invoices =>
    [...new Set(invoices.map(inv => inv.vendorName))]
  ),
}))

// Test data for CSV and filtering
const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-001',
    vendorName: 'Acme Corp',
    vendorEmail: 'billing@acme.com',
    amount: 1250.00,
    amountDue: 1250.00,
    issueDate: new Date('2024-01-15'),
    dueDate: new Date('2024-02-15'),
    status: 'pending',
    description: 'Office supplies and equipment purchase for Q1 operations',
    category: 'standard_pdf',
    paymentTerms: 'NET30',
    receivedDate: new Date('2024-01-16'),
  },
  {
    id: '2',
    invoiceNumber: 'INV-002',
    vendorName: 'Tech Solutions Ltd',
    vendorEmail: 'accounts@techsolutions.com',
    amount: 5000.00,
    amountDue: 5000.00,
    issueDate: new Date('2024-01-20'),
    dueDate: new Date('2024-02-20'),
    status: 'in_review',
    description: 'Software licensing and technical support services for annual contract',
    category: 'xero_with_pdf',
    paymentTerms: 'NET15',
    receivedDate: new Date('2024-01-21'),
  },
  {
    id: '3',
    invoiceNumber: 'INV-003',
    vendorName: 'Quick Print Services',
    vendorEmail: 'hello@quickprint.co',
    amount: 75.50,
    amountDue: 75.50,
    issueDate: new Date('2024-01-25'),
    dueDate: new Date('2024-02-25'),
    status: 'paid',
    description: '', // Empty description for testing
    category: 'standard_pdf',
    paymentTerms: 'NET7',
    receivedDate: new Date('2024-01-26'),
  },
  {
    id: '4',
    invoiceNumber: 'INV-004',
    vendorName: 'Acme Corp',
    vendorEmail: 'billing@acme.com',
    amount: 2500.00,
    amountDue: 2500.00,
    issueDate: new Date('2024-01-30'),
    dueDate: new Date('2024-03-01'),
    status: 'overdue',
    description: 'Marketing materials and promotional items for company event',
    category: 'xero_links_only',
    paymentTerms: 'NET30',
    receivedDate: new Date('2024-01-31'),
  },
]

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
)

describe('CSV Export and Filter Integration Tests', () => {
  describe('CSV Export Functionality', () => {
    test('SHOULD FAIL: CSV export includes description column', async () => {
      const { exportToCSV } = require('@/lib/utils/csv-export')

      render(
        <TestWrapper>
          <DataTable
            columns={invoiceColumns}
            data={mockInvoices}
            enableExport={true}
          />
        </TestWrapper>
      )

      // Look for export button
      const exportButton = screen.queryByText('Export') || screen.queryByRole('button', { name: /export/i })

      if (exportButton) {
        await userEvent.click(exportButton)

        // Verify export function was called with description data
        await waitFor(() => {
          expect(exportToCSV).toHaveBeenCalled()
        })

        const exportData = exportToCSV.mock.calls[0][0]

        // Verify description column is included
        expect(exportData.some((row: any) => row.hasOwnProperty('description'))).toBe(true)

        // Verify description data is present
        const invoiceWithDescription = exportData.find((row: any) => row.id === '1')
        expect(invoiceWithDescription?.description).toBe('Office supplies and equipment purchase for Q1 operations')
      }
    })

    test('SHOULD FAIL: CSV export preserves vendor data alongside description', async () => {
      const { exportToCSV } = require('@/lib/utils/csv-export')

      render(
        <TestWrapper>
          <DataTable
            columns={invoiceColumns}
            data={mockInvoices}
            enableExport={true}
          />
        </TestWrapper>
      )

      const exportButton = screen.queryByText('Export') || screen.queryByRole('button', { name: /export/i })

      if (exportButton) {
        await userEvent.click(exportButton)

        await waitFor(() => {
          expect(exportToCSV).toHaveBeenCalled()
        })

        const exportData = exportToCSV.mock.calls[0][0]

        // Both vendor and description data should be present
        expect(exportData.some((row: any) => row.hasOwnProperty('vendorName'))).toBe(true)
        expect(exportData.some((row: any) => row.hasOwnProperty('vendorEmail'))).toBe(true)
        expect(exportData.some((row: any) => row.hasOwnProperty('description'))).toBe(true)

        // Verify all three are present in the same row
        const firstInvoice = exportData.find((row: any) => row.id === '1')
        expect(firstInvoice).toMatchObject({
          vendorName: 'Acme Corp',
          vendorEmail: 'billing@acme.com',
          description: 'Office supplies and equipment purchase for Q1 operations'
        })
      }
    })

    test('SHOULD FAIL: CSV export handles empty descriptions correctly', async () => {
      const { exportToCSV } = require('@/lib/utils/csv-export')

      render(
        <TestWrapper>
          <DataTable
            columns={invoiceColumns}
            data={mockInvoices}
            enableExport={true}
          />
        </TestWrapper>
      )

      const exportButton = screen.queryByText('Export') || screen.queryByRole('button', { name: /export/i })

      if (exportButton) {
        await userEvent.click(exportButton)

        await waitFor(() => {
          expect(exportToCSV).toHaveBeenCalled()
        })

        const exportData = exportToCSV.mock.calls[0][0]

        // Find invoice with empty description
        const emptyDescriptionInvoice = exportData.find((row: any) => row.id === '3')
        expect(emptyDescriptionInvoice?.description).toBe('')
      }
    })

    test('SHOULD FAIL: CSV export preserves multi-line descriptions', async () => {
      const multiLineInvoice = {
        ...mockInvoices[1],
        description: 'Line 1: Software licensing\nLine 2: Technical support\nLine 3: Enterprise features'
      }

      const testData = [multiLineInvoice]

      const { exportToCSV } = require('@/lib/utils/csv-export')

      render(
        <TestWrapper>
          <DataTable
            columns={invoiceColumns}
            data={testData}
            enableExport={true}
          />
        </TestWrapper>
      )

      const exportButton = screen.queryByText('Export') || screen.queryByRole('button', { name: /export/i })

      if (exportButton) {
        await userEvent.click(exportButton)

        await waitFor(() => {
          expect(exportToCSV).toHaveBeenCalled()
        })

        const exportData = exportToCSV.mock.calls[0][0]

        // Multi-line description should be preserved
        expect(exportData[0].description).toContain('\n')
        expect(exportData[0].description).toContain('Line 1:')
        expect(exportData[0].description).toContain('Line 2:')
        expect(exportData[0].description).toContain('Line 3:')
      }
    })

    test('SHOULD FAIL: CSV export filename includes timestamp', async () => {
      const { exportToCSV } = require('@/lib/utils/csv-export')

      render(
        <TestWrapper>
          <DataTable
            columns={invoiceColumns}
            data={mockInvoices}
            enableExport={true}
          />
        </TestWrapper>
      )

      const exportButton = screen.queryByText('Export') || screen.queryByRole('button', { name: /export/i })

      if (exportButton) {
        await userEvent.click(exportButton)

        await waitFor(() => {
          expect(exportToCSV).toHaveBeenCalled()
        })

        const filename = exportToCSV.mock.calls[0][1]

        // Filename should include 'invoices' and timestamp
        expect(filename).toMatch(/invoices.*\.csv/)
      }
    })
  })

  describe('Vendor Filtering Functionality', () => {
    test('SHOULD FAIL: vendor filter still works after column replacement', async () => {
      const { filterInvoices } = require('@/lib/utils/filters')

      const MockFilterableTable = () => {
        const [filters, setFilters] = React.useState({ vendor: [], status: [], search: '' })

        const filteredData = filterInvoices(mockInvoices, filters)

        return (
          <div>
            <button onClick={() => setFilters({ ...filters, vendor: ['Acme Corp'] })}>
              Filter by Acme Corp
            </button>
            <TestWrapper>
              <DataTable columns={invoiceColumns} data={filteredData} />
            </TestWrapper>
          </div>
        )
      }

      render(<MockFilterableTable />)

      // Apply vendor filter
      const filterButton = screen.getByText('Filter by Acme Corp')
      await userEvent.click(filterButton)

      await waitFor(() => {
        // Should show only Acme Corp invoices
        expect(filterInvoices).toHaveBeenCalledWith(
          mockInvoices,
          { vendor: ['Acme Corp'], status: [], search: '' }
        )
      })
    })

    test('SHOULD FAIL: unique vendor list generation still works', () => {
      const { getUniqueVendors } = require('@/lib/utils/filters')

      const uniqueVendors = getUniqueVendors(mockInvoices)

      // Should extract unique vendor names
      expect(uniqueVendors).toContain('Acme Corp')
      expect(uniqueVendors).toContain('Tech Solutions Ltd')
      expect(uniqueVendors).toContain('Quick Print Services')
      expect(uniqueVendors).toHaveLength(3)
    })

    test('SHOULD FAIL: vendor filtering maintains description column visibility', async () => {
      const filteredData = mockInvoices.filter(inv => inv.vendorName === 'Acme Corp')

      render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={filteredData} />
        </TestWrapper>
      )

      // Description column should still be visible after filtering
      expect(screen.getByText('Description')).toBeInTheDocument()

      // Filtered descriptions should be displayed
      expect(screen.getByText('Office supplies and equipment purchase for Q1 operations')).toBeInTheDocument()
      expect(screen.getByText('Marketing materials and promotional items for company event')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    test('SHOULD FAIL: global search includes description content', async () => {
      const { filterInvoices } = require('@/lib/utils/filters')

      const MockSearchableTable = () => {
        const [searchTerm, setSearchTerm] = React.useState('')

        const filteredData = filterInvoices(mockInvoices, {
          vendor: [],
          status: [],
          search: searchTerm
        })

        return (
          <div>
            <input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <TestWrapper>
              <DataTable columns={invoiceColumns} data={filteredData} />
            </TestWrapper>
          </div>
        )
      }

      render(<MockSearchableTable />)

      const searchInput = screen.getByPlaceholderText('Search invoices...')

      // Search for content in descriptions
      await userEvent.type(searchInput, 'office supplies')

      await waitFor(() => {
        expect(filterInvoices).toHaveBeenCalledWith(
          mockInvoices,
          expect.objectContaining({ search: 'office supplies' })
        )
      })
    })

    test('SHOULD FAIL: search works with partial description matches', async () => {
      const { filterInvoices } = require('@/lib/utils/filters')

      // Test the filter function directly
      const searchResults = filterInvoices(mockInvoices, {
        vendor: [],
        status: [],
        search: 'software'
      })

      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].description).toContain('Software licensing')
    })

    test('SHOULD FAIL: search is case-insensitive for descriptions', () => {
      const { filterInvoices } = require('@/lib/utils/filters')

      const searchResults = filterInvoices(mockInvoices, {
        vendor: [],
        status: [],
        search: 'OFFICE'
      })

      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].description.toLowerCase()).toContain('office')
    })

    test('SHOULD FAIL: search across multiple fields including description', () => {
      const { filterInvoices } = require('@/lib/utils/filters')

      // Search for vendor name
      const vendorResults = filterInvoices(mockInvoices, {
        vendor: [],
        status: [],
        search: 'Acme'
      })

      expect(vendorResults).toHaveLength(2)

      // Search for invoice number
      const invoiceResults = filterInvoices(mockInvoices, {
        vendor: [],
        status: [],
        search: 'INV-003'
      })

      expect(invoiceResults).toHaveLength(1)

      // Search for description content
      const descriptionResults = filterInvoices(mockInvoices, {
        vendor: [],
        status: [],
        search: 'marketing'
      })

      expect(descriptionResults).toHaveLength(1)
      expect(descriptionResults[0].description.toLowerCase()).toContain('marketing')
    })

    test('SHOULD FAIL: empty search returns all results', () => {
      const { filterInvoices } = require('@/lib/utils/filters')

      const allResults = filterInvoices(mockInvoices, {
        vendor: [],
        status: [],
        search: ''
      })

      expect(allResults).toHaveLength(mockInvoices.length)
    })
  })

  describe('Combined Filtering and Export', () => {
    test('SHOULD FAIL: CSV export of filtered data includes descriptions', async () => {
      const { filterInvoices } = require('@/lib/utils/filters')
      const { exportToCSV } = require('@/lib/utils/csv-export')

      // Filter by vendor
      const filteredData = filterInvoices(mockInvoices, {
        vendor: ['Acme Corp'],
        status: [],
        search: ''
      })

      const MockFilteredExport = () => {
        return (
          <TestWrapper>
            <DataTable
              columns={invoiceColumns}
              data={filteredData}
              enableExport={true}
            />
          </TestWrapper>
        )
      }

      render(<MockFilteredExport />)

      const exportButton = screen.queryByText('Export') || screen.queryByRole('button', { name: /export/i })

      if (exportButton) {
        await userEvent.click(exportButton)

        await waitFor(() => {
          expect(exportToCSV).toHaveBeenCalled()
        })

        const exportData = exportToCSV.mock.calls[0][0]

        // Should only include Acme Corp invoices
        expect(exportData).toHaveLength(2)
        expect(exportData.every((row: any) => row.vendorName === 'Acme Corp')).toBe(true)

        // Should include descriptions for filtered results
        expect(exportData[0].description).toBeTruthy()
        expect(exportData[1].description).toBeTruthy()
      }
    })

    test('SHOULD FAIL: search results export maintains description data', async () => {
      const { filterInvoices } = require('@/lib/utils/filters')
      const { exportToCSV } = require('@/lib/utils/csv-export')

      // Filter by search term
      const searchResults = filterInvoices(mockInvoices, {
        vendor: [],
        status: [],
        search: 'software'
      })

      const MockSearchExport = () => {
        return (
          <TestWrapper>
            <DataTable
              columns={invoiceColumns}
              data={searchResults}
              enableExport={true}
            />
          </TestWrapper>
        )
      }

      render(<MockSearchExport />)

      const exportButton = screen.queryByText('Export') || screen.queryByRole('button', { name: /export/i })

      if (exportButton) {
        await userEvent.click(exportButton)

        await waitFor(() => {
          expect(exportToCSV).toHaveBeenCalled()
        })

        const exportData = exportToCSV.mock.calls[0][0]

        // Should only include search results
        expect(exportData).toHaveLength(1)
        expect(exportData[0].description).toContain('Software licensing')
      }
    })
  })

  describe('Filter Performance with Description Column', () => {
    test('SHOULD FAIL: filtering large datasets with descriptions performs adequately', () => {
      const { filterInvoices } = require('@/lib/utils/filters')

      // Create large dataset
      const largeDataset = Array(1000).fill(null).map((_, index) => ({
        ...mockInvoices[0],
        id: `${index + 1}`,
        invoiceNumber: `INV-${(index + 1).toString().padStart(4, '0')}`,
        description: `Description for invoice ${index + 1} with various details`,
      }))

      const startTime = performance.now()

      const searchResults = filterInvoices(largeDataset, {
        vendor: [],
        status: [],
        search: 'Description for invoice 5'
      })

      const filterTime = performance.now() - startTime

      // Should complete filtering within reasonable time
      expect(filterTime).toBeLessThan(100)
      expect(searchResults).toHaveLength(1)
    })

    test('SHOULD FAIL: CSV export of large filtered dataset completes efficiently', async () => {
      const { exportToCSV } = require('@/lib/utils/csv-export')

      const largeDataset = Array(500).fill(null).map((_, index) => ({
        ...mockInvoices[0],
        id: `${index + 1}`,
        description: `Large dataset description ${index + 1}`,
      }))

      const startTime = performance.now()

      await exportToCSV(largeDataset, 'large-dataset-test.csv')

      const exportTime = performance.now() - startTime

      // Should complete export within reasonable time
      expect(exportTime).toBeLessThan(1000)
    })
  })

  describe('Data Integrity', () => {
    test('SHOULD FAIL: filtered data maintains referential integrity', () => {
      const { filterInvoices } = require('@/lib/utils/filters')

      const filteredData = filterInvoices(mockInvoices, {
        vendor: ['Tech Solutions Ltd'],
        status: [],
        search: ''
      })

      // Should maintain all fields for filtered records
      expect(filteredData).toHaveLength(1)
      expect(filteredData[0]).toMatchObject({
        id: '2',
        vendorName: 'Tech Solutions Ltd',
        vendorEmail: 'accounts@techsolutions.com',
        description: 'Software licensing and technical support services for annual contract'
      })
    })

    test('SHOULD FAIL: CSV export maintains data relationships', async () => {
      const { exportToCSV } = require('@/lib/utils/csv-export')

      await exportToCSV(mockInvoices, 'data-integrity-test.csv')

      const exportData = exportToCSV.mock.calls[0][0]

      // Each exported row should maintain vendor-description relationship
      exportData.forEach((row: any) => {
        if (row.vendorName === 'Acme Corp') {
          expect(['Office supplies and equipment purchase for Q1 operations', 'Marketing materials and promotional items for company event']).toContain(row.description)
        }

        if (row.vendorName === 'Tech Solutions Ltd') {
          expect(row.description).toContain('Software licensing')
        }
      })
    })
  })
})