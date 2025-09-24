import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { InvoicesView } from '@/app/(dashboard)/invoices/page'
import { InvoiceFiltersProvider, useInvoiceFilters } from '@/hooks/use-invoices-filters'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the API calls
jest.mock('@/lib/api/invoices', () => ({
  fetchInvoices: jest.fn().mockResolvedValue({
    data: [
      { id: '1', amount: 100, status: 'pending', description: 'Invoice 1' },
      { id: '2', amount: 200, status: 'paid', description: 'Invoice 2' },
      { id: '3', amount: 150, status: 'overdue', description: 'Invoice 3' },
    ],
    pagination: { total: 3, pageCount: 1 }
  }),
  fetchInvoiceFacets: jest.fn().mockResolvedValue({
    facets: { statuses: ['pending', 'paid', 'overdue'], categories: [], vendors: [] }
  }),
  fetchInvoiceSavedViews: jest.fn().mockResolvedValue({ views: [] })
}))

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
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

describe('Clickable Summary Cards', () => {
  describe('Unit Tests - Card Click Handlers', () => {
    test('SHOULD FAIL: pending card click toggles pending status filter', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      // Find the pending card
      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')
      expect(pendingCard).toBeInTheDocument()

      // Should be clickable
      expect(pendingCard).toHaveAttribute('role', 'button')
      expect(pendingCard).toHaveAttribute('tabIndex', '0')
      expect(pendingCard).toHaveClass('cursor-pointer')

      // Click should toggle filter
      await userEvent.click(pendingCard!)

      // Should show active state
      expect(pendingCard).toHaveClass('ring-2', 'ring-amber-500')
      expect(pendingCard).toHaveAttribute('aria-pressed', 'true')
    })

    test('SHOULD FAIL: paid card click toggles paid status filter', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Paid')).toBeInTheDocument()
      })

      const paidCard = screen.getByText('Paid').closest('[data-testid="status-card-paid"]')
      expect(paidCard).toBeInTheDocument()
      expect(paidCard).toHaveAttribute('role', 'button')

      await userEvent.click(paidCard!)

      expect(paidCard).toHaveClass('ring-2', 'ring-emerald-500')
      expect(paidCard).toHaveAttribute('aria-pressed', 'true')
    })

    test('SHOULD FAIL: overdue card click toggles overdue status filter', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Overdue')).toBeInTheDocument()
      })

      const overdueCard = screen.getByText('Overdue').closest('[data-testid="status-card-overdue"]')
      expect(overdueCard).toBeInTheDocument()
      expect(overdueCard).toHaveAttribute('role', 'button')

      await userEvent.click(overdueCard!)

      expect(overdueCard).toHaveClass('ring-2', 'ring-rose-500')
      expect(overdueCard).toHaveAttribute('aria-pressed', 'true')
    })

    test('SHOULD FAIL: clicking active card removes filter (toggle off)', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')

      // Click to activate
      await userEvent.click(pendingCard!)
      expect(pendingCard).toHaveAttribute('aria-pressed', 'true')

      // Click again to deactivate
      await userEvent.click(pendingCard!)
      expect(pendingCard).toHaveAttribute('aria-pressed', 'false')
      expect(pendingCard).not.toHaveClass('ring-2')
    })

    test('SHOULD FAIL: multiple cards can be active simultaneously', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')
      const paidCard = screen.getByText('Paid').closest('[data-testid="status-card-paid"]')

      // Click both cards
      await userEvent.click(pendingCard!)
      await userEvent.click(paidCard!)

      // Both should be active
      expect(pendingCard).toHaveAttribute('aria-pressed', 'true')
      expect(paidCard).toHaveAttribute('aria-pressed', 'true')
    })

    test('SHOULD FAIL: total invoices and total amount cards are not clickable', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Total Invoices')).toBeInTheDocument()
      })

      const totalCard = screen.getByText('Total Invoices').closest('[data-testid="summary-card-total"]')
      const amountCard = screen.getByText('Current Page Total').closest('[data-testid="summary-card-amount"]')

      // Should not be clickable
      expect(totalCard).not.toHaveAttribute('role', 'button')
      expect(totalCard).not.toHaveAttribute('tabIndex')
      expect(totalCard).not.toHaveClass('cursor-pointer')

      expect(amountCard).not.toHaveAttribute('role', 'button')
      expect(amountCard).not.toHaveAttribute('tabIndex')
      expect(amountCard).not.toHaveClass('cursor-pointer')
    })
  })

  describe('Integration Tests - useInvoiceFilters Hook', () => {
    function TestComponent() {
      const { filters, toggleStatus } = useInvoiceFilters()

      return (
        <div>
          <span data-testid="current-filters">
            {JSON.stringify(filters.statuses)}
          </span>
          <button onClick={() => toggleStatus('pending')}>
            Toggle Pending
          </button>
          <button onClick={() => toggleStatus('paid')}>
            Toggle Paid
          </button>
        </div>
      )
    }

    test('SHOULD FAIL: hook integration with card clicks updates filter state', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      const filtersDisplay = screen.getByTestId('current-filters')
      const pendingButton = screen.getByText('Toggle Pending')

      // Initially no filters
      expect(filtersDisplay).toHaveTextContent('[]')

      // Toggle pending
      await userEvent.click(pendingButton)
      expect(filtersDisplay).toHaveTextContent('["pending"]')

      // Toggle pending again (remove)
      await userEvent.click(pendingButton)
      expect(filtersDisplay).toHaveTextContent('[]')
    })

    test('SHOULD FAIL: multiple status filters can be active', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      const filtersDisplay = screen.getByTestId('current-filters')
      const pendingButton = screen.getByText('Toggle Pending')
      const paidButton = screen.getByText('Toggle Paid')

      await userEvent.click(pendingButton)
      await userEvent.click(paidButton)

      const filtersText = filtersDisplay.textContent
      expect(filtersText).toContain('pending')
      expect(filtersText).toContain('paid')
    })
  })

  describe('Keyboard Accessibility', () => {
    test('SHOULD FAIL: cards are focusable with keyboard', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')

      // Should be focusable
      expect(pendingCard).toHaveAttribute('tabIndex', '0')

      // Focus the card
      pendingCard?.focus()
      expect(pendingCard).toHaveFocus()
    })

    test('SHOULD FAIL: Enter key activates card filter', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')

      // Focus and press Enter
      pendingCard?.focus()
      fireEvent.keyDown(pendingCard!, { key: 'Enter', code: 'Enter' })

      expect(pendingCard).toHaveAttribute('aria-pressed', 'true')
    })

    test('SHOULD FAIL: Space key activates card filter', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Paid')).toBeInTheDocument()
      })

      const paidCard = screen.getByText('Paid').closest('[data-testid="status-card-paid"]')

      // Focus and press Space
      paidCard?.focus()
      fireEvent.keyDown(paidCard!, { key: ' ', code: 'Space' })

      expect(paidCard).toHaveAttribute('aria-pressed', 'true')
    })

    test('SHOULD FAIL: cards have proper ARIA attributes', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')

      expect(pendingCard).toHaveAttribute('role', 'button')
      expect(pendingCard).toHaveAttribute('aria-pressed', 'false')
      expect(pendingCard).toHaveAttribute('aria-label', 'Filter by pending status. Currently not filtered.')
    })

    test('SHOULD FAIL: ARIA labels update based on filter state', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Overdue')).toBeInTheDocument()
      })

      const overdueCard = screen.getByText('Overdue').closest('[data-testid="status-card-overdue"]')

      // Initially not filtered
      expect(overdueCard).toHaveAttribute('aria-label', 'Filter by overdue status. Currently not filtered.')

      // Click to activate filter
      await userEvent.click(overdueCard!)

      // Should update ARIA label
      expect(overdueCard).toHaveAttribute('aria-label', 'Filter by overdue status. Currently filtered.')
    })
  })

  describe('Visual State Management', () => {
    test('SHOULD FAIL: active cards show correct visual feedback', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')

      // Initially not active
      expect(pendingCard).not.toHaveClass('ring-2', 'ring-amber-500')

      // Click to activate
      await userEvent.click(pendingCard!)

      // Should show active visual state
      expect(pendingCard).toHaveClass('ring-2', 'ring-amber-500')
      expect(pendingCard).toHaveClass('bg-amber-50', 'dark:bg-amber-900/20')
    })

    test('SHOULD FAIL: hover states work correctly', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Paid')).toBeInTheDocument()
      })

      const paidCard = screen.getByText('Paid').closest('[data-testid="status-card-paid"]')

      // Should have hover styling classes
      expect(paidCard).toHaveClass('hover:bg-slate-50', 'hover:dark:bg-slate-800')
      expect(paidCard).toHaveClass('transition-colors')
    })

    test('SHOULD FAIL: focus states are visually distinct', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Overdue')).toBeInTheDocument()
      })

      const overdueCard = screen.getByText('Overdue').closest('[data-testid="status-card-overdue"]')

      // Should have focus ring classes
      expect(overdueCard).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-rose-500')
    })
  })

  describe('Screen Reader Announcements', () => {
    test('SHOULD FAIL: screen readers announce filter state changes', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      // Should have a live region for announcements
      const liveRegion = screen.getByRole('status', { name: /filter announcements/i })
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')

      const pendingCard = screen.getByText('Pending').closest('[data-testid="status-card-pending"]')
      await userEvent.click(pendingCard!)

      // Should announce the filter change
      expect(liveRegion).toHaveTextContent('Pending filter activated. Showing pending invoices only.')
    })

    test('SHOULD FAIL: screen readers announce filter removal', async () => {
      render(
        <TestWrapper>
          <InvoicesView />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Paid')).toBeInTheDocument()
      })

      const liveRegion = screen.getByRole('status', { name: /filter announcements/i })
      const paidCard = screen.getByText('Paid').closest('[data-testid="status-card-paid"]')

      // Activate then deactivate filter
      await userEvent.click(paidCard!)
      await userEvent.click(paidCard!)

      // Should announce the removal
      expect(liveRegion).toHaveTextContent('Paid filter removed. Showing all invoices.')
    })
  })
})