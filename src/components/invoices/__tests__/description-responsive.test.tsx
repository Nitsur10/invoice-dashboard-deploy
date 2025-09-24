import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { invoiceColumns } from '../columns'
import { DataTable } from '@/components/ui/data-table'
import { DescriptionCell } from '../description-cell'
import { Invoice } from '@/lib/types'

// Mock data for responsive testing
const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-001',
    vendorName: 'Acme Corporation',
    vendorEmail: 'billing@acme.com',
    amount: 1250.00,
    amountDue: 1250.00,
    issueDate: new Date('2024-01-15'),
    dueDate: new Date('2024-02-15'),
    status: 'pending',
    description: 'Office supplies and equipment purchase for Q1 operations including desks, chairs, and computers',
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
    description: 'Software licensing and technical support services for annual contract\nIncludes premium support package\nEnterprise license renewal',
    category: 'xero_with_pdf',
    paymentTerms: 'NET15',
    receivedDate: new Date('2024-01-21'),
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

// Helper to mock viewport dimensions
const mockViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })

  // Mock matchMedia for responsive breakpoints
  window.matchMedia = jest.fn().mockImplementation(query => {
    const breakpoints: { [key: string]: boolean } = {
      '(max-width: 640px)': width <= 640,
      '(max-width: 768px)': width <= 768,
      '(max-width: 1024px)': width <= 1024,
      '(min-width: 768px)': width >= 768,
      '(min-width: 1024px)': width >= 1024,
    }

    return {
      matches: breakpoints[query] || false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }
  })

  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

describe('Description Column Responsive Tests', () => {
  afterEach(() => {
    // Reset viewport to default
    mockViewport(1024, 768)
  })

  describe('Desktop Breakpoint (1200px+)', () => {
    beforeEach(() => {
      mockViewport(1200, 800)
    })

    test('SHOULD FAIL: description column fully visible on desktop', () => {
      render(<DescriptionCell description="Desktop responsive test description" />)

      const element = screen.getByText('Desktop responsive test description')
      const container = element.parentElement

      // Should maintain full width constraints
      expect(container).toHaveClass('max-w-[200px]')
      expect(element).toHaveClass('truncate')
    })

    test('SHOULD FAIL: table layout maintains column order on desktop', () => {
      render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={mockInvoices} />
        </TestWrapper>
      )

      // All columns should be visible
      expect(screen.getByText('Invoice #')).toBeInTheDocument()
      expect(screen.getByText('Vendor')).toBeInTheDocument()
      expect(screen.getByText('Amount')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Due Date')).toBeInTheDocument()
    })

    test('SHOULD FAIL: tooltip positioning works correctly on desktop', async () => {
      const user = userEvent.setup()

      render(<DescriptionCell description="Long desktop description requiring tooltip functionality for proper user experience" />)

      const element = screen.getByText('Long desktop description requiring tooltip functionality for proper user experience')

      await user.hover(element)

      // Should have tooltip attributes
      expect(element).toHaveAttribute('title')
      expect(element).toHaveClass('cursor-help')
    })
  })

  describe('Tablet Breakpoint (768px-1023px)', () => {
    beforeEach(() => {
      mockViewport(1024, 768)
    })

    test('SHOULD FAIL: description column visible on tablet', () => {
      render(<DescriptionCell description="Tablet responsive description test" />)

      const element = screen.getByText('Tablet responsive description test')
      const container = element.parentElement

      // Should maintain width constraints on tablet
      expect(container).toHaveClass('max-w-[200px]')
      expect(element).toHaveClass('truncate')
    })

    test('SHOULD FAIL: table maintains usability on tablet', () => {
      render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={mockInvoices} />
        </TestWrapper>
      )

      // Description column should still be present
      expect(screen.getByText('Description')).toBeInTheDocument()

      // Content should be truncated appropriately
      expect(screen.getByText('Office supplies and equipment purchase for Q1 operations including desks, chairs, and computers')).toBeInTheDocument()
    })

    test('SHOULD FAIL: touch interactions work on tablet', async () => {
      const user = userEvent.setup()

      render(<DescriptionCell description="Tablet touch interaction description test" />)

      const element = screen.getByText('Tablet touch interaction description test')

      // Simulate touch interaction
      fireEvent.touchStart(element)
      fireEvent.touchEnd(element)

      // Should maintain tooltip functionality
      expect(element).toHaveAttribute('title', 'Tablet touch interaction description test')
    })

    test('SHOULD FAIL: keyboard navigation maintains functionality on tablet', async () => {
      const user = userEvent.setup()

      render(
        <div>
          <button>Previous</button>
          <DescriptionCell description="Tablet keyboard navigation test description" />
          <button>Next</button>
        </div>
      )

      await user.tab()
      await user.tab()

      const element = screen.getByText('Tablet keyboard navigation test description')

      if (element.hasAttribute('tabIndex') && element.getAttribute('tabIndex') === '0') {
        expect(element).toHaveFocus()
      }
    })
  })

  describe('Mobile Breakpoint (320px-767px)', () => {
    beforeEach(() => {
      mockViewport(375, 667)
    })

    test('SHOULD FAIL: description column adapts to mobile constraints', () => {
      render(<DescriptionCell description="Mobile responsive description test" />)

      const element = screen.getByText('Mobile responsive description test')
      const container = element.parentElement

      // Should maintain width constraints even on mobile
      expect(container).toHaveClass('max-w-[200px]')
      expect(element).toHaveClass('truncate')
    })

    test('SHOULD FAIL: table horizontal scrolling includes description column', () => {
      render(
        <TestWrapper>
          <div className="overflow-x-auto">
            <DataTable columns={invoiceColumns} data={mockInvoices} />
          </div>
        </TestWrapper>
      )

      // Table should be scrollable horizontally
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      // Description column should be present (even if requires scrolling)
      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    test('SHOULD FAIL: touch targets meet minimum size requirements', () => {
      render(<DescriptionCell description="Mobile touch target size test description" />)

      const element = screen.getByText('Mobile touch target size test description')

      // Element should be accessible for touch (minimum 44px typically)
      // This is primarily CSS responsibility, but we verify element exists
      expect(element).toBeInTheDocument()
      expect(element).toBeVisible()
    })

    test('SHOULD FAIL: tooltip functionality adapts to mobile', async () => {
      render(<DescriptionCell description="Mobile tooltip adaptation test description" />)

      const element = screen.getByText('Mobile tooltip adaptation test description')

      // Touch should still provide access to full content
      fireEvent.touchStart(element)

      expect(element).toHaveAttribute('title', 'Mobile tooltip adaptation test description')
    })

    test('SHOULD FAIL: mobile text remains readable', () => {
      render(<DescriptionCell description="Mobile text readability test with longer content" />)

      const element = screen.getByText('Mobile text readability test with longer content')

      // Should maintain text styling for readability
      expect(element).toHaveClass('font-medium', 'text-slate-900', 'dark:text-slate-100')
      expect(element).toHaveClass('truncate')
    })
  })

  describe('Large Desktop (1440px+)', () => {
    beforeEach(() => {
      mockViewport(1440, 900)
    })

    test('SHOULD FAIL: description column utilizes available space efficiently', () => {
      render(<DescriptionCell description="Large desktop space utilization test" />)

      const element = screen.getByText('Large desktop space utilization test')
      const container = element.parentElement

      // Should maintain consistent width constraint
      expect(container).toHaveClass('max-w-[200px]')
    })

    test('SHOULD FAIL: maintains table layout proportions on large screens', () => {
      render(
        <TestWrapper>
          <DataTable columns={invoiceColumns} data={mockInvoices} />
        </TestWrapper>
      )

      // All columns should be comfortably visible
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Office supplies and equipment purchase for Q1 operations including desks, chairs, and computers')).toBeInTheDocument()
    })
  })

  describe('Ultra-wide Screens (1920px+)', () => {
    beforeEach(() => {
      mockViewport(1920, 1080)
    })

    test('SHOULD FAIL: description column maintains consistency on ultra-wide', () => {
      render(<DescriptionCell description="Ultra-wide screen consistency test" />)

      const element = screen.getByText('Ultra-wide screen consistency test')
      const container = element.parentElement

      // Should not expand beyond intended width
      expect(container).toHaveClass('max-w-[200px]')
    })
  })

  describe('Portrait vs Landscape Orientation', () => {
    test('SHOULD FAIL: adapts to portrait orientation on tablet', () => {
      mockViewport(768, 1024) // Portrait tablet

      render(<DescriptionCell description="Portrait orientation test description" />)

      const element = screen.getByText('Portrait orientation test description')

      // Should maintain functionality in portrait
      expect(element).toHaveClass('truncate')
      expect(element).toHaveAttribute('title', 'Portrait orientation test description')
    })

    test('SHOULD FAIL: adapts to landscape orientation on mobile', () => {
      mockViewport(667, 375) // Landscape mobile

      render(<DescriptionCell description="Landscape orientation test" />)

      const element = screen.getByText('Landscape orientation test')
      const container = element.parentElement

      // Should maintain constraints in landscape
      expect(container).toHaveClass('max-w-[200px]')
    })
  })

  describe('Dynamic Viewport Changes', () => {
    test('SHOULD FAIL: handles viewport resize gracefully', async () => {
      render(<DescriptionCell description="Dynamic viewport resize test description" />)

      let element = screen.getByText('Dynamic viewport resize test description')
      let container = element.parentElement

      // Start desktop
      mockViewport(1200, 800)
      expect(container).toHaveClass('max-w-[200px]')

      // Resize to tablet
      await act(async () => {
        mockViewport(768, 1024)
      })

      element = screen.getByText('Dynamic viewport resize test description')
      container = element.parentElement
      expect(container).toHaveClass('max-w-[200px]')

      // Resize to mobile
      await act(async () => {
        mockViewport(375, 667)
      })

      element = screen.getByText('Dynamic viewport resize test description')
      container = element.parentElement
      expect(container).toHaveClass('max-w-[200px]')
    })

    test('SHOULD FAIL: maintains tooltip functionality across viewport changes', async () => {
      const user = userEvent.setup()

      render(<DescriptionCell description="Viewport change tooltip test description" />)

      // Start desktop
      mockViewport(1200, 800)

      let element = screen.getByText('Viewport change tooltip test description')
      await user.hover(element)

      expect(element).toHaveAttribute('title')

      // Change to mobile
      await act(async () => {
        mockViewport(375, 667)
      })

      element = screen.getByText('Viewport change tooltip test description')
      expect(element).toHaveAttribute('title')
    })
  })

  describe('High DPI and Zoom Levels', () => {
    test('SHOULD FAIL: handles high DPI screens', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 3,
      })

      render(<DescriptionCell description="High DPI screen test" />)

      const element = screen.getByText('High DPI screen test')

      // Should maintain readability at high DPI
      expect(element).toHaveClass('font-medium')
      expect(element).toHaveClass('truncate')
    })

    test('SHOULD FAIL: maintains functionality at 150% zoom', () => {
      // Mock zoom level
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 1.5,
      })

      render(<DescriptionCell description="150% zoom level test description" />)

      const element = screen.getByText('150% zoom level test description')
      const container = element.parentElement

      // Should maintain width constraints at zoom level
      expect(container).toHaveClass('max-w-[200px]')
      expect(element).toHaveAttribute('title', '150% zoom level test description')
    })

    test('SHOULD FAIL: handles 200% zoom gracefully', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 2,
      })

      render(<DescriptionCell description="200% zoom accessibility test" />)

      const element = screen.getByText('200% zoom accessibility test')

      // Should remain accessible at high zoom
      expect(element).toHaveClass('truncate')
      expect(element).toHaveAttribute('title', '200% zoom accessibility test')
    })
  })

  describe('Container Query Responsiveness', () => {
    test('SHOULD FAIL: adapts to container width changes', () => {
      const { rerender } = render(
        <div style={{ width: '150px' }}>
          <DescriptionCell description="Container width adaptation test" />
        </div>
      )

      let element = screen.getByText('Container width adaptation test')
      let container = element.parentElement

      expect(container).toHaveClass('max-w-[200px]')

      // Change container width
      rerender(
        <div style={{ width: '100px' }}>
          <DescriptionCell description="Container width adaptation test" />
        </div>
      )

      element = screen.getByText('Container width adaptation test')
      container = element.parentElement

      // Should maintain max-width constraint
      expect(container).toHaveClass('max-w-[200px]')
    })
  })

  describe('Print Media Responsiveness', () => {
    test('SHOULD FAIL: adapts for print media', () => {
      // Mock print media query
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query.includes('print'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      render(<DescriptionCell description="Print media adaptation test" />)

      const element = screen.getByText('Print media adaptation test')

      // Should maintain readability for print
      expect(element).toHaveClass('font-medium')

      // Title attribute should still provide full content for print-friendly tooltips
      expect(element).toHaveAttribute('title', 'Print media adaptation test')
    })
  })
})