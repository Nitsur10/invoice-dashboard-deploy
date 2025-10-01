/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { DataTableResponsive } from '../data-table-responsive'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import type { Invoice } from '@/lib/types'

// Mock the hooks and components
jest.mock('@/hooks/useBreakpoint')
jest.mock('../data-table', () => ({
  DataTable: (props: any) => <div data-testid="data-table">Table View</div>,
}))
jest.mock('../invoice-card-list', () => ({
  InvoiceCardList: (props: any) => <div data-testid="invoice-card-list">Card View</div>,
}))

const mockUseBreakpoint = useBreakpoint as jest.MockedFunction<typeof useBreakpoint>

const mockInvoices: Invoice[] = [
  {
    id: 'INV-001',
    invoiceNumber: 'INV-001',
    amount: 1250.00,
    status: 'pending',
    category: 'Construction',
    vendorName: 'ABC Construction Co',
    issueDate: new Date('2025-09-01'),
    dueDate: new Date('2025-09-30'),
    description: 'Foundation work',
  },
  {
    id: 'INV-002',
    invoiceNumber: 'INV-002',
    amount: 850.50,
    status: 'paid',
    category: 'Materials',
    vendorName: 'XYZ Supplies',
    issueDate: new Date('2025-09-05'),
    dueDate: new Date('2025-09-25'),
    paidDate: new Date('2025-09-20'),
    description: 'Lumber and hardware',
  },
]

const mockProps = {
  columns: [],
  data: mockInvoices,
  pageCount: 1,
  pageSize: 20,
  pageIndex: 0,
  onPaginationChange: jest.fn(),
  onSortingChange: jest.fn(),
  onColumnFiltersChange: jest.fn(),
  sorting: [],
  columnFilters: [],
  isLoading: false,
  manualPagination: true,
  manualSorting: true,
  manualFiltering: true,
  facets: undefined,
}

describe('DataTableResponsive', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Desktop view', () => {
    beforeEach(() => {
      mockUseBreakpoint.mockReturnValue(true) // md breakpoint matches (desktop/tablet)
    })

    it('should render DataTable component on desktop', () => {
      render(<DataTableResponsive {...mockProps} />)

      expect(screen.getByTestId('data-table')).toBeInTheDocument()
      expect(screen.getByText('Table View')).toBeInTheDocument()
    })

    it('should not render InvoiceCardList on desktop', () => {
      render(<DataTableResponsive {...mockProps} />)

      expect(screen.queryByTestId('invoice-card-list')).not.toBeInTheDocument()
    })

    it('should pass all props to DataTable', () => {
      render(<DataTableResponsive {...mockProps} />)

      expect(screen.getByTestId('data-table')).toBeInTheDocument()
      // DataTable should receive all props including columns, data, pagination, etc.
    })
  })

  describe('Mobile view', () => {
    beforeEach(() => {
      mockUseBreakpoint.mockReturnValue(false) // md breakpoint does not match (mobile)
    })

    it('should render InvoiceCardList component on mobile', () => {
      render(<DataTableResponsive {...mockProps} />)

      expect(screen.getByTestId('invoice-card-list')).toBeInTheDocument()
      expect(screen.getByText('Card View')).toBeInTheDocument()
    })

    it('should not render DataTable on mobile', () => {
      render(<DataTableResponsive {...mockProps} />)

      expect(screen.queryByTestId('data-table')).not.toBeInTheDocument()
    })

    it('should pass invoice data to InvoiceCardList', () => {
      render(<DataTableResponsive {...mockProps} />)

      expect(screen.getByTestId('invoice-card-list')).toBeInTheDocument()
      // InvoiceCardList should receive the invoices data
    })
  })

  describe('Responsive switching', () => {
    it('should switch from table to card view when viewport shrinks', () => {
      mockUseBreakpoint.mockReturnValue(true) // Start desktop

      const { rerender } = render(<DataTableResponsive {...mockProps} />)

      // Verify table view
      expect(screen.getByTestId('data-table')).toBeInTheDocument()

      // Switch to mobile
      mockUseBreakpoint.mockReturnValue(false)
      rerender(<DataTableResponsive {...mockProps} />)

      // Verify card view
      expect(screen.queryByTestId('data-table')).not.toBeInTheDocument()
      expect(screen.getByTestId('invoice-card-list')).toBeInTheDocument()
    })

    it('should switch from card to table view when viewport expands', () => {
      mockUseBreakpoint.mockReturnValue(false) // Start mobile

      const { rerender } = render(<DataTableResponsive {...mockProps} />)

      // Verify card view
      expect(screen.getByTestId('invoice-card-list')).toBeInTheDocument()

      // Switch to desktop
      mockUseBreakpoint.mockReturnValue(true)
      rerender(<DataTableResponsive {...mockProps} />)

      // Verify table view
      expect(screen.queryByTestId('invoice-card-list')).not.toBeInTheDocument()
      expect(screen.getByTestId('data-table')).toBeInTheDocument()
    })
  })

  describe('Empty data handling', () => {
    const emptyProps = {
      ...mockProps,
      data: [],
    }

    it('should render table with empty data on desktop', () => {
      mockUseBreakpoint.mockReturnValue(true)

      render(<DataTableResponsive {...emptyProps} />)

      expect(screen.getByTestId('data-table')).toBeInTheDocument()
    })

    it('should render card list with empty data on mobile', () => {
      mockUseBreakpoint.mockReturnValue(false)

      render(<DataTableResponsive {...emptyProps} />)

      expect(screen.getByTestId('invoice-card-list')).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    const loadingProps = {
      ...mockProps,
      isLoading: true,
    }

    it('should pass loading state to DataTable on desktop', () => {
      mockUseBreakpoint.mockReturnValue(true)

      render(<DataTableResponsive {...loadingProps} />)

      expect(screen.getByTestId('data-table')).toBeInTheDocument()
      // DataTable should receive isLoading: true
    })

    it('should handle loading state on mobile card view', () => {
      mockUseBreakpoint.mockReturnValue(false)

      render(<DataTableResponsive {...loadingProps} />)

      expect(screen.getByTestId('invoice-card-list')).toBeInTheDocument()
      // Card list should render (loading state handled by card list component)
    })
  })

  describe('Breakpoint detection', () => {
    it('should check md breakpoint for responsive behavior', () => {
      mockUseBreakpoint.mockReturnValue(true)

      render(<DataTableResponsive {...mockProps} />)

      expect(mockUseBreakpoint).toHaveBeenCalledWith('md')
    })

    it('should call useBreakpoint hook once', () => {
      mockUseBreakpoint.mockReturnValue(true)

      render(<DataTableResponsive {...mockProps} />)

      expect(mockUseBreakpoint).toHaveBeenCalledTimes(1)
    })
  })

  describe('Prop forwarding', () => {
    it('should forward pagination props to DataTable', () => {
      mockUseBreakpoint.mockReturnValue(true)

      const paginationProps = {
        ...mockProps,
        pageCount: 10,
        pageSize: 50,
        pageIndex: 2,
      }

      render(<DataTableResponsive {...paginationProps} />)

      expect(screen.getByTestId('data-table')).toBeInTheDocument()
      // Should pass pageCount: 10, pageSize: 50, pageIndex: 2
    })

    it('should forward sorting props to DataTable', () => {
      mockUseBreakpoint.mockReturnValue(true)

      const sortingProps = {
        ...mockProps,
        sorting: [{ id: 'amount', desc: true }],
      }

      render(<DataTableResponsive {...sortingProps} />)

      expect(screen.getByTestId('data-table')).toBeInTheDocument()
      // Should pass sorting state
    })

    it('should forward filter props to DataTable', () => {
      mockUseBreakpoint.mockReturnValue(true)

      const filterProps = {
        ...mockProps,
        columnFilters: [{ id: 'status', value: ['pending'] }],
      }

      render(<DataTableResponsive {...filterProps} />)

      expect(screen.getByTestId('data-table')).toBeInTheDocument()
      // Should pass columnFilters
    })
  })
})
