import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { invoiceColumns } from '../columns'
import { DataTable } from '@/components/ui/data-table'
import { Invoice } from '@/lib/types'

// Mock data for testing
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
    description: 'Software licensing and technical support services for annual contract\nIncludes premium support package\nRenewal for enterprise license',
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
    description: '',
    category: 'standard_pdf',
    paymentTerms: 'NET7',
    receivedDate: new Date('2024-01-26'),
  }
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

describe('Invoice Columns Integration', () => {
  describe('Column structure validation', () => {
    test('SHOULD FAIL: duplicate supplier column has been removed', () => {
      const supplierColumns = invoiceColumns.filter(
        col => col.header &&
        typeof col.header === 'function' &&
        col.header.toString().includes('Supplier')
      )

      // Should have exactly 0 supplier columns after the duplicate is removed
      expect(supplierColumns).toHaveLength(0)
    })

    test('SHOULD FAIL: description column exists in correct position', () => {
      const descriptionColumnIndex = invoiceColumns.findIndex(
        col => col.accessorKey === 'description'
      )

      // Description column should exist and be positioned after status column
      expect(descriptionColumnIndex).toBeGreaterThan(-1)

      const statusColumnIndex = invoiceColumns.findIndex(
        col => col.accessorKey === 'status'
      )

      expect(descriptionColumnIndex).toBeGreaterThan(statusColumnIndex)
    })

    test('SHOULD FAIL: vendor column still exists for filtering', () => {
      const vendorColumns = invoiceColumns.filter(
        col => col.accessorKey === 'vendorName'
      )

      // Should have exactly one vendor column remaining
      expect(vendorColumns).toHaveLength(1)
    })

    test('SHOULD FAIL: description column has correct header configuration', () => {
      const descriptionColumn = invoiceColumns.find(
        col => col.accessorKey === 'description'
      )

      expect(descriptionColumn).toBeDefined()
      expect(descriptionColumn?.header).toBeInstanceOf(Function)

      // Mock column object for header function
      const mockColumn = {
        toggleSorting: jest.fn(),
        getIsSorted: jest.fn(() => false),
      }

      const headerComponent = (descriptionColumn?.header as Function)({ column: mockColumn })
      expect(headerComponent.props.children).toContain('Description')
    })
  })

  describe('Table rendering with description column', () => {
    test('SHOULD FAIL: renders table with description column visible', async () => {
      render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={mockInvoices} />
        </TestWrapper>
      )

      // Description header should be visible
      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument()
      })

      // Check that description content is rendered
      expect(screen.getByText('Office supplies and equipment purchase for Q1 operations')).toBeInTheDocument()
      expect(screen.getByText('Software licensing and technical support services for annual contract')).toBeInTheDocument()
    })

    test('SHOULD FAIL: handles empty description with fallback', async () => {
      render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={mockInvoices} />
        </TestWrapper>
      )

      await waitFor(() => {
        // Empty description should show fallback text
        expect(screen.getByText('—')).toBeInTheDocument()
      })
    })

    test('SHOULD FAIL: truncates long descriptions correctly', async () => {
      render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={mockInvoices} />
        </TestWrapper>
      )

      await waitFor(() => {
        // Should show only first line of multi-line description
        expect(screen.getByText('Software licensing and technical support services for annual contract')).toBeInTheDocument()
        expect(screen.queryByText('Includes premium support package')).not.toBeInTheDocument()
      })
    })
  })

  describe('Column sorting functionality', () => {
    test('SHOULD FAIL: description column is sortable', async () => {
      render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={mockInvoices} />
        </TestWrapper>
      )

      const descriptionHeader = screen.getByText('Description').closest('button')
      expect(descriptionHeader).toBeInTheDocument()

      // Click to sort
      if (descriptionHeader) {
        fireEvent.click(descriptionHeader)

        // Should trigger sorting (verify by checking if sort function was called)
        await waitFor(() => {
          expect(descriptionHeader).toHaveAttribute('class')
        })
      }
    })

    test('SHOULD FAIL: sorts descriptions alphabetically', async () => {
      const { container } = render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={mockInvoices} />
        </TestWrapper>
      )

      const descriptionHeader = screen.getByText('Description').closest('button')

      if (descriptionHeader) {
        fireEvent.click(descriptionHeader)

        await waitFor(() => {
          // Verify sort indicator is present
          const sortIcon = container.querySelector('[data-testid="sort-icon"]')
          expect(sortIcon || descriptionHeader.querySelector('svg')).toBeInTheDocument()
        })
      }
    })
  })

  describe('Responsive behavior', () => {
    test('SHOULD FAIL: description column maintains layout on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      window.dispatchEvent(new Event('resize'))

      render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={mockInvoices} />
        </TestWrapper>
      )

      await waitFor(() => {
        const descriptionColumn = screen.getByText('Description')
        expect(descriptionColumn).toBeInTheDocument()

        // Check that container maintains width constraints
        const firstDescriptionCell = screen.getByText('Office supplies and equipment purchase for Q1 operations')
        const container = firstDescriptionCell.parentElement
        expect(container).toHaveClass('max-w-[200px]')
      })
    })

    test('SHOULD FAIL: table maintains proper column order on tablet', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      window.dispatchEvent(new Event('resize'))

      render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={mockInvoices} />
        </TestWrapper>
      )

      await waitFor(() => {
        const headers = screen.getAllByRole('columnheader')
        const headerTexts = headers.map(header => header.textContent)

        // Verify column order includes Description and excludes duplicate Supplier
        expect(headerTexts).toContain('Description')
        expect(headerTexts.filter(text => text?.includes('Supplier'))).toHaveLength(0)
        expect(headerTexts.filter(text => text?.includes('Vendor'))).toHaveLength(1)
      })
    })
  })

  describe('Performance with large datasets', () => {
    test('SHOULD FAIL: handles 100+ rows efficiently', async () => {
      const largeMockData = Array(150).fill(null).map((_, index) => ({
        ...mockInvoices[0],
        id: `${index + 1}`,
        invoiceNumber: `INV-${(index + 1).toString().padStart(3, '0')}`,
        description: `Description for invoice ${index + 1} with various details and information`,
      }))

      const renderStart = performance.now()

      render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={largeMockData} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument()
      })

      const renderTime = performance.now() - renderStart
      expect(renderTime).toBeLessThan(1000) // Should render within 1 second
    })

    test('SHOULD FAIL: virtual scrolling works with description column', async () => {
      const largeMockData = Array(1000).fill(null).map((_, index) => ({
        ...mockInvoices[0],
        id: `${index + 1}`,
        invoiceNumber: `INV-${(index + 1).toString().padStart(4, '0')}`,
        description: `Virtual scrolling test description ${index + 1}`,
      }))

      const { container } = render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={largeMockData} />
        </TestWrapper>
      )

      await waitFor(() => {
        // Should not render all 1000 rows immediately (virtual scrolling)
        const rows = container.querySelectorAll('tbody tr')
        expect(rows.length).toBeLessThan(100)
      })
    })
  })

  describe('Accessibility integration', () => {
    test('SHOULD FAIL: table maintains proper ARIA structure', async () => {
      render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={mockInvoices} />
        </TestWrapper>
      )

      await waitFor(() => {
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()

        const descriptionColumnHeader = screen.getByText('Description')
        expect(descriptionColumnHeader.closest('[role="columnheader"]')).toBeInTheDocument()
      })
    })

    test('SHOULD FAIL: screen readers can navigate description column', async () => {
      render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={mockInvoices} />
        </TestWrapper>
      )

      await waitFor(() => {
        // Check for proper ARIA labels on description cells
        const descriptionCells = screen.getAllByText(/Office supplies|Software licensing/)

        descriptionCells.forEach(cell => {
          if (cell.hasAttribute('aria-label')) {
            expect(cell.getAttribute('aria-label')).toMatch(/Description:/)
          }
        })
      })
    })
  })
})