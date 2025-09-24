import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { InvoicesView } from '@/app/(dashboard)/invoices/page'
import { InvoiceFiltersProvider } from '@/hooks/use-invoices-filters'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the API calls with detailed response
jest.mock('@/lib/api/invoices', () => ({
  fetchInvoices: jest.fn().mockImplementation((params) => {
    // Mock different responses based on status filter
    const allInvoices = [
      { id: '1', amount: 100, status: 'pending', description: 'Office supplies', vendorName: 'OfficeMax' },
      { id: '2', amount: 200, status: 'paid', description: 'Software license', vendorName: 'Microsoft' },
      { id: '3', amount: 150, status: 'overdue', description: 'Consulting', vendorName: 'TechConsult' },
      { id: '4', amount: 300, status: 'pending', description: 'Equipment', vendorName: 'TechStore' },
      { id: '5', amount: 75, status: 'paid', description: 'Utilities', vendorName: 'PowerCorp' },
    ]

    let filteredInvoices = allInvoices

    if (params?.status?.length > 0) {
      filteredInvoices = allInvoices.filter(inv => params.status.includes(inv.status))
    }

    return Promise.resolve({
      data: filteredInvoices,
      pagination: { total: filteredInvoices.length, pageCount: 1 }
    })
  }),
  fetchInvoiceFacets: jest.fn().mockResolvedValue({
    facets: {
      statuses: ['pending', 'paid', 'overdue'],
      categories: ['Office', 'Software', 'Consulting'],
      vendors: ['OfficeMax', 'Microsoft', 'TechConsult']
    }
  }),
  fetchInvoiceSavedViews: jest.fn().mockResolvedValue({ views: [] })
}))

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <InvoiceFiltersProvider>
        {children}
      </InvoiceFiltersProvider>
    </QueryClientProvider>
  )
}

describe('Card-Table Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Filter State Synchronization', () => {
    test('SHOULD FAIL: clicking pending card filters table to pending invoices only', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByText('Office supplies')).toBeInTheDocument()
      })

      // Initially should show all invoices
      expect(screen.getByText('Office supplies')).toBeInTheDocument() // pending
      expect(screen.getByText('Software license')).toBeInTheDocument() // paid
      expect(screen.getByText('Consulting')).toBeInTheDocument() // overdue

      // Click pending card
      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')
      await userEvent.click(pendingCard!)

      // Table should now show only pending invoices
      await waitFor(() => {
        expect(screen.getByText('Office supplies')).toBeInTheDocument() // pending
        expect(screen.getByText('Equipment')).toBeInTheDocument() // pending
        expect(screen.queryByText('Software license')).not.toBeInTheDocument() // paid - should be hidden
        expect(screen.queryByText('Consulting')).not.toBeInTheDocument() // overdue - should be hidden
      })
    })

    test('SHOULD FAIL: clicking paid card filters table to paid invoices only', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Software license')).toBeInTheDocument()
      })

      // Click paid card
      const paidCard = screen.getByText('Paid').closest('[data-testid="status-card-paid"]')
      await userEvent.click(paidCard!)

      // Table should show only paid invoices
      await waitFor(() => {
        expect(screen.getByText('Software license')).toBeInTheDocument() // paid
        expect(screen.getByText('Utilities')).toBeInTheDocument() // paid
        expect(screen.queryByText('Office supplies')).not.toBeInTheDocument() // pending - should be hidden
        expect(screen.queryByText('Consulting')).not.toBeInTheDocument() // overdue - should be hidden
      })
    })

    test('SHOULD FAIL: clicking overdue card filters table to overdue invoices only', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Consulting')).toBeInTheDocument()
      })

      // Click overdue card
      const overdueCard = screen.getByText('Overdue').closest('[data-testid="status-card-overdue"]')
      await userEvent.click(overdueCard!)

      // Table should show only overdue invoices
      await waitFor(() => {
        expect(screen.getByText('Consulting')).toBeInTheDocument() // overdue
        expect(screen.queryByText('Office supplies')).not.toBeInTheDocument() // pending - should be hidden
        expect(screen.queryByText('Software license')).not.toBeInTheDocument() // paid - should be hidden
      })
    })

    test('SHOULD FAIL: multiple card selection shows combined filtered results', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Office supplies')).toBeInTheDocument()
      })

      // Click both pending and paid cards
      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')
      const paidCard = screen.getByText('Paid').closest('[data-testid="status-card-paid"]')

      await userEvent.click(pendingCard!)
      await userEvent.click(paidCard!)

      // Table should show both pending and paid invoices, but not overdue
      await waitFor(() => {
        expect(screen.getByText('Office supplies')).toBeInTheDocument() // pending
        expect(screen.getByText('Equipment')).toBeInTheDocument() // pending
        expect(screen.getByText('Software license')).toBeInTheDocument() // paid
        expect(screen.getByText('Utilities')).toBeInTheDocument() // paid
        expect(screen.queryByText('Consulting')).not.toBeInTheDocument() // overdue - should be hidden
      })
    })

    test('SHOULD FAIL: deactivating card removes filter and shows all invoices', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Office supplies')).toBeInTheDocument()
      })

      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')

      // Activate pending filter
      await userEvent.click(pendingCard!)

      // Should show only pending
      await waitFor(() => {
        expect(screen.queryByText('Consulting')).not.toBeInTheDocument()
      })

      // Deactivate pending filter
      await userEvent.click(pendingCard!)

      // Should show all invoices again
      await waitFor(() => {
        expect(screen.getByText('Office supplies')).toBeInTheDocument() // pending
        expect(screen.getByText('Software license')).toBeInTheDocument() // paid
        expect(screen.getByText('Consulting')).toBeInTheDocument() // overdue
      })
    })
  })

  describe('Table Column Filter Integration', () => {
    test('SHOULD FAIL: card filters sync with table column filters', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')
      await userEvent.click(pendingCard!)

      // Check that table column filter shows active state
      const statusColumnFilter = screen.getByRole('button', { name: /status filter/i })
      expect(statusColumnFilter).toHaveClass('bg-primary', 'text-primary-foreground')

      // Check filter badge/indicator
      const filterBadge = screen.getByText('Status: Pending')
      expect(filterBadge).toBeInTheDocument()
    })

    test('SHOULD FAIL: clearing table column filter updates card state', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      // Activate card filter first
      const paidCard = screen.getByText('Paid').closest('[data-testid="status-card-paid"]')
      await userEvent.click(paidCard!)

      expect(paidCard).toHaveAttribute('aria-pressed', 'true')

      // Clear filter using table controls
      const clearFiltersButton = screen.getByRole('button', { name: /clear filters/i })
      await userEvent.click(clearFiltersButton)

      // Card should be deactivated
      await waitFor(() => {
        expect(paidCard).toHaveAttribute('aria-pressed', 'false')
      })
    })

    test('SHOULD FAIL: sidebar filter changes reflect in card states', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      // Use sidebar to apply overdue filter
      const sidebarOverdueCheckbox = screen.getByRole('checkbox', { name: /overdue/i })
      await userEvent.click(sidebarOverdueCheckbox)

      // Overdue card should reflect the active state
      const overdueCard = screen.getByText('Overdue').closest('[data-testid="status-card-overdue"]')
      await waitFor(() => {
        expect(overdueCard).toHaveAttribute('aria-pressed', 'true')
      })
    })
  })

  describe('Mobile Filter Drawer Integration', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
    })

    test('SHOULD FAIL: card clicks work correctly when filter drawer is open', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      // Open mobile filter drawer
      const filtersButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(filtersButton)

      // Cards should still be clickable
      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')
      await userEvent.click(pendingCard!)

      expect(pendingCard).toHaveAttribute('aria-pressed', 'true')

      // Filter drawer should show the applied filter
      const drawerStatusFilter = screen.getByText('Pending', { selector: '[role="dialog"] *' })
      expect(drawerStatusFilter).toBeInTheDocument()
    })

    test('SHOULD FAIL: mobile drawer filter changes sync with cards', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument()
      })

      // Open drawer and apply filter
      const filtersButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(filtersButton)

      const drawerPaidCheckbox = screen.getByRole('checkbox', { name: /paid/i })
      await userEvent.click(drawerPaidCheckbox)

      // Close drawer
      const closeDrawer = screen.getByRole('button', { name: /close/i })
      await userEvent.click(closeDrawer)

      // Card should reflect the active state
      const paidCard = screen.getByText('Paid').closest('[data-testid="status-card-paid"]')
      expect(paidCard).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Pagination and Sorting Integration', () => {
    test('SHOULD FAIL: card filters persist across page navigation', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')
      await userEvent.click(pendingCard!)

      // Navigate to next page (if pagination exists)
      const nextPageButton = screen.queryByRole('button', { name: /next page/i })
      if (nextPageButton) {
        await userEvent.click(nextPageButton)

        // Card should still be active
        expect(pendingCard).toHaveAttribute('aria-pressed', 'true')
      }
    })

    test('SHOULD FAIL: sorting works correctly with card filters applied', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      // Apply paid filter
      const paidCard = screen.getByText('Paid').closest('[data-testid="status-card-paid"]')
      await userEvent.click(paidCard!)

      // Sort by amount
      const amountHeader = screen.getByRole('button', { name: /amount/i })
      await userEvent.click(amountHeader)

      // Should still show only paid invoices, but sorted
      await waitFor(() => {
        expect(screen.getByText('Software license')).toBeInTheDocument() // paid
        expect(screen.getByText('Utilities')).toBeInTheDocument() // paid
        expect(screen.queryByText('Office supplies')).not.toBeInTheDocument() // pending
      })

      // Card should remain active
      expect(paidCard).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Performance and State Management', () => {
    test('SHOULD FAIL: card clicks do not cause unnecessary re-renders', async () => {
      const renderSpy = jest.fn()

      function TestComponent() {
        renderSpy()
        return <InvoicesView />
      }

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      const initialRenderCount = renderSpy.mock.calls.length

      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')
      await userEvent.click(pendingCard!)

      await waitFor(() => {
        expect(pendingCard).toHaveAttribute('aria-pressed', 'true')
      })

      // Should not cause excessive re-renders
      const finalRenderCount = renderSpy.mock.calls.length
      expect(finalRenderCount - initialRenderCount).toBeLessThanOrEqual(2)
    })

    test('SHOULD FAIL: rapid card clicks are debounced appropriately', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Overdue')).toBeInTheDocument()
      })

      const overdueCard = screen.getByText('Overdue').closest('[data-testid="status-card-overdue"]')

      // Rapid clicks
      await userEvent.click(overdueCard!)
      await userEvent.click(overdueCard!)
      await userEvent.click(overdueCard!)
      await userEvent.click(overdueCard!)

      // Should end up in consistent state (off after even number of clicks)
      await waitFor(() => {
        expect(overdueCard).toHaveAttribute('aria-pressed', 'false')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('SHOULD FAIL: card clicks work when API request fails', async () => {
      // Mock API failure
      const mockFetch = require('@/lib/api/invoices')
      mockFetch.fetchInvoices.mockRejectedValueOnce(new Error('Network error'))

      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      // Should still be able to click cards even if data loading failed
      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')
      await userEvent.click(pendingCard!)

      expect(pendingCard).toHaveAttribute('aria-pressed', 'true')
    })

    test('SHOULD FAIL: cards handle zero count states correctly', async () => {
      // Mock empty data response
      const mockFetch = require('@/lib/api/invoices')
      mockFetch.fetchInvoices.mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, pageCount: 0 }
      })

      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument() // Zero count
      })

      // Cards should still be clickable even with zero counts
      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')
      expect(pendingCard).toHaveAttribute('role', 'button')

      await userEvent.click(pendingCard!)
      expect(pendingCard).toHaveAttribute('aria-pressed', 'true')
    })

    test('SHOULD FAIL: filter state persists through component unmount/mount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Paid')).toBeInTheDocument()
      })

      // Activate filter
      const paidCard = screen.getByText('Paid').closest('[data-testid="status-card-paid"]')
      await userEvent.click(paidCard!)

      expect(paidCard).toHaveAttribute('aria-pressed', 'true')

      // Unmount and remount component
      unmount()

      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Paid')).toBeInTheDocument()
      })

      // Filter state should be restored
      const newPaidCard = screen.getByText('Paid').closest('[data-testid="status-card-paid"]')
      expect(newPaidCard).toHaveAttribute('aria-pressed', 'true')
    })
  })
})