import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { InvoiceFilterPopover } from '../filter-popover'
import { InvoiceFiltersProvider } from '@/hooks/use-invoices-filters'
import type { InvoiceFacetsResponse } from '@/lib/api/invoices'

// Mock data for tests
const mockFacets: InvoiceFacetsResponse['facets'] = {
  statuses: [
    { value: 'pending', count: 5 },
    { value: 'paid', count: 10 },
    { value: 'overdue', count: 3 }
  ],
  categories: [
    { value: 'Office Supplies', count: 8 },
    { value: 'Software', count: 12 },
    { value: 'Travel', count: 4 }
  ],
  vendors: [
    { value: 'Acme Corp', count: 6 },
    { value: 'Tech Solutions', count: 9 },
    { value: 'Office Depot', count: 5 }
  ],
  amountRange: {
    min: 50,
    max: 5000
  }
}

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <InvoiceFiltersProvider>
    {children}
  </InvoiceFiltersProvider>
)

describe('InvoiceFilterPopover', () => {
  describe('Component rendering and structure', () => {
    test('SHOULD FAIL: renders filter trigger button with correct styling', () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      expect(triggerButton).toBeInTheDocument()
      expect(triggerButton).toHaveClass('inline-flex', 'items-center', 'justify-center')

      // Should have filter icon
      const filterIcon = triggerButton.querySelector('svg')
      expect(filterIcon).toBeInTheDocument()
    })

    test('SHOULD FAIL: displays filter count badge when filters are active', () => {
      // Mock the hook to return active filters
      const MockedPopover = () => {
        const { toggleStatus } = require('@/hooks/use-invoices-filters').useInvoiceFilters()
        React.useEffect(() => {
          toggleStatus('pending')
          toggleStatus('paid')
        }, [])

        return <InvoiceFilterPopover facets={mockFacets} />
      }

      render(
        <TestWrapper>
          <MockedPopover />
        </TestWrapper>
      )

      const badge = screen.getByText('2') // 2 active status filters
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('ml-2', 'min-w-[1.25rem]', 'h-5')
      expect(badge.closest('.badge')).toHaveAttribute('data-variant', 'secondary')
    })

    test('SHOULD FAIL: hides filter count badge when no filters are active', () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      expect(triggerButton).toBeInTheDocument()

      // Badge should not be present
      const badge = screen.queryByText(/\d+/)
      expect(badge).not.toBeInTheDocument()
    })

    test('SHOULD FAIL: applies custom className correctly', () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover
            facets={mockFacets}
            className="custom-filter-class"
          />
        </TestWrapper>
      )

      const container = screen.getByRole('button', { name: /filters/i }).closest('.custom-filter-class')
      expect(container).toBeInTheDocument()
    })

    test('SHOULD FAIL: applies hidden md:block classes for responsive display', () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover
            facets={mockFacets}
            className="hidden md:block"
          />
        </TestWrapper>
      )

      const container = screen.getByRole('button', { name: /filters/i }).closest('.hidden.md\\:block')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Popover open/close behavior', () => {
    test('SHOULD FAIL: opens popover when trigger button is clicked', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })

      // Popover content should not be visible initially
      expect(screen.queryByRole('dialog', { name: /invoice filters/i })).not.toBeInTheDocument()

      // Click to open
      await userEvent.click(triggerButton)

      // Popover content should now be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /invoice filters/i })).toBeInTheDocument()
      })
    })

    test('SHOULD FAIL: closes popover when trigger button is clicked again', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })

      // Open popover
      await userEvent.click(triggerButton)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Close popover
      await userEvent.click(triggerButton)
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    test('SHOULD FAIL: closes popover when clicking outside', async () => {
      render(
        <div>
          <button>Outside element</button>
          <TestWrapper>
            <InvoiceFilterPopover facets={mockFacets} />
          </TestWrapper>
        </div>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      const outsideButton = screen.getByRole('button', { name: /outside element/i })

      // Open popover
      await userEvent.click(triggerButton)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Click outside
      await userEvent.click(outsideButton)
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    test('SHOULD FAIL: closes popover when Escape key is pressed', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })

      // Open popover
      await userEvent.click(triggerButton)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Press Escape
      await userEvent.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Popover positioning and layout', () => {
    test('SHOULD FAIL: positions popover with correct alignment and offset', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        const popoverContent = screen.getByRole('dialog')
        expect(popoverContent).toBeInTheDocument()
        expect(popoverContent).toHaveAttribute('data-align', 'end')
        expect(popoverContent).toHaveAttribute('data-side-offset', '8')
      })
    })

    test('SHOULD FAIL: applies correct width class to popover content', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        const popoverContent = screen.getByRole('dialog')
        expect(popoverContent).toHaveClass('w-96') // 384px width
      })
    })

    test('SHOULD FAIL: has correct z-index for layering above content', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        const popoverContent = screen.getByRole('dialog')
        expect(popoverContent).toHaveClass('z-50')
      })
    })

    test('SHOULD FAIL: removes default padding from popover content', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        const popoverContent = screen.getByRole('dialog')
        expect(popoverContent).toHaveClass('p-0')
      })
    })
  })

  describe('Filter count badge logic', () => {
    test('SHOULD FAIL: calculates filter count correctly for status filters', () => {
      const MockedPopover = () => {
        const { toggleStatus } = require('@/hooks/use-invoices-filters').useInvoiceFilters()

        React.useEffect(() => {
          toggleStatus('pending')
          toggleStatus('paid')
          toggleStatus('overdue')
        }, [])

        return <InvoiceFilterPopover facets={mockFacets} />
      }

      render(
        <TestWrapper>
          <MockedPopover />
        </TestWrapper>
      )

      const badge = screen.getByText('3')
      expect(badge).toBeInTheDocument()
    })

    test('SHOULD FAIL: calculates filter count correctly for category filters', () => {
      const MockedPopover = () => {
        const { toggleCategory } = require('@/hooks/use-invoices-filters').useInvoiceFilters()

        React.useEffect(() => {
          toggleCategory('Office Supplies')
          toggleCategory('Software')
        }, [])

        return <InvoiceFilterPopover facets={mockFacets} />
      }

      render(
        <TestWrapper>
          <MockedPopover />
        </TestWrapper>
      )

      const badge = screen.getByText('2')
      expect(badge).toBeInTheDocument()
    })

    test('SHOULD FAIL: calculates filter count correctly for vendor filters', () => {
      const MockedPopover = () => {
        const { toggleVendor } = require('@/hooks/use-invoices-filters').useInvoiceFilters()

        React.useEffect(() => {
          toggleVendor('Acme Corp')
        }, [])

        return <InvoiceFilterPopover facets={mockFacets} />
      }

      render(
        <TestWrapper>
          <MockedPopover />
        </TestWrapper>
      )

      const badge = screen.getByText('1')
      expect(badge).toBeInTheDocument()
    })

    test('SHOULD FAIL: includes date range in filter count', () => {
      const MockedPopover = () => {
        const { setDateRange } = require('@/hooks/use-invoices-filters').useInvoiceFilters()

        React.useEffect(() => {
          setDateRange({ start: '2023-01-01', end: '2023-12-31' })
        }, [])

        return <InvoiceFilterPopover facets={mockFacets} />
      }

      render(
        <TestWrapper>
          <MockedPopover />
        </TestWrapper>
      )

      const badge = screen.getByText('1')
      expect(badge).toBeInTheDocument()
    })

    test('SHOULD FAIL: includes amount range in filter count', () => {
      const MockedPopover = () => {
        const { setAmountRange } = require('@/hooks/use-invoices-filters').useInvoiceFilters()

        React.useEffect(() => {
          setAmountRange({ min: 100, max: 1000 })
        }, [])

        return <InvoiceFilterPopover facets={mockFacets} />
      }

      render(
        <TestWrapper>
          <MockedPopover />
        </TestWrapper>
      )

      const badge = screen.getByText('1')
      expect(badge).toBeInTheDocument()
    })

    test('SHOULD FAIL: includes search term in filter count', () => {
      const MockedPopover = () => {
        const { setSearch } = require('@/hooks/use-invoices-filters').useInvoiceFilters()

        React.useEffect(() => {
          setSearch('office supplies')
        }, [])

        return <InvoiceFilterPopover facets={mockFacets} />
      }

      render(
        <TestWrapper>
          <MockedPopover />
        </TestWrapper>
      )

      const badge = screen.getByText('1')
      expect(badge).toBeInTheDocument()
    })

    test('SHOULD FAIL: calculates combined filter count correctly', () => {
      const MockedPopover = () => {
        const { toggleStatus, toggleCategory, setDateRange, setAmountRange } = require('@/hooks/use-invoices-filters').useInvoiceFilters()

        React.useEffect(() => {
          toggleStatus('pending')
          toggleStatus('paid')
          toggleCategory('Office Supplies')
          setDateRange({ start: '2023-01-01' })
          setAmountRange({ min: 100 })
        }, [])

        return <InvoiceFilterPopover facets={mockFacets} />
      }

      render(
        <TestWrapper>
          <MockedPopover />
        </TestWrapper>
      )

      const badge = screen.getByText('5') // 2 status + 1 category + 1 date + 1 amount = 5
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Loading states', () => {
    test('SHOULD FAIL: displays loading state when isLoading is true', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={undefined} isLoading={true} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        const popoverContent = screen.getByRole('dialog')
        expect(popoverContent).toBeInTheDocument()

        // Check for skeleton loaders in filter sections
        const skeletonElements = popoverContent.querySelectorAll('.animate-pulse')
        expect(skeletonElements.length).toBeGreaterThan(0)
      })
    })

    test('SHOULD FAIL: disables trigger button when facets are loading', () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={undefined} isLoading={true} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      expect(triggerButton).toBeDisabled()
    })

    test('SHOULD FAIL: shows empty state when no facets are provided', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={undefined} isLoading={false} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByText(/no categories detected/i)).toBeInTheDocument()
        expect(screen.getByText(/no vendor facets available/i)).toBeInTheDocument()
      })
    })
  })

  describe('Responsive behavior', () => {
    test('SHOULD FAIL: renders as popover on desktop screens', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      expect(triggerButton).toBeInTheDocument()
      expect(triggerButton).toHaveAttribute('data-testid', 'filter-popover-trigger')
    })

    test('SHOULD FAIL: switches to drawer on mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      // Mock matchMedia for mobile detection
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query.includes('768px'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      expect(triggerButton).toHaveAttribute('data-testid', 'filter-drawer-trigger')
    })

    test('SHOULD FAIL: adjusts popover width on tablet screens', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        const popoverContent = screen.getByRole('dialog')
        expect(popoverContent).toHaveClass('w-80') // Smaller width for tablet
      })
    })
  })

  describe('Accessibility features', () => {
    test('SHOULD FAIL: has proper ARIA labels on trigger button', () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      expect(triggerButton).toHaveAttribute('aria-label', 'Open invoice filters')
      expect(triggerButton).toHaveAttribute('aria-describedby', 'filter-description')
      expect(triggerButton).toHaveAttribute('aria-expanded', 'false')
    })

    test('SHOULD FAIL: updates aria-expanded when popover opens', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })

      // Initially collapsed
      expect(triggerButton).toHaveAttribute('aria-expanded', 'false')

      // Open popover
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(triggerButton).toHaveAttribute('aria-expanded', 'true')
      })
    })

    test('SHOULD FAIL: popover content has proper dialog role and label', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        const popoverContent = screen.getByRole('dialog')
        expect(popoverContent).toHaveAttribute('aria-label', 'Invoice filters')
      })
    })

    test('SHOULD FAIL: includes screen reader description', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        const description = document.getElementById('filter-description')
        expect(description).toBeInTheDocument()
        expect(description).toHaveClass('sr-only')
        expect(description).toHaveTextContent(/filter invoices by status, category, vendor, date range, and amount/i)
      })
    })

    test('SHOULD FAIL: includes filter count in aria-label when filters active', () => {
      const MockedPopover = () => {
        const { toggleStatus } = require('@/hooks/use-invoices-filters').useInvoiceFilters()

        React.useEffect(() => {
          toggleStatus('pending')
        }, [])

        return <InvoiceFilterPopover facets={mockFacets} />
      }

      render(
        <TestWrapper>
          <MockedPopover />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      expect(triggerButton).toHaveAttribute('aria-label', 'Open invoice filters (1 active)')
    })
  })

  describe('Focus management', () => {
    test('SHOULD FAIL: returns focus to trigger when popover closes', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })

      // Open popover
      await userEvent.click(triggerButton)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Close with Escape
      await userEvent.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(triggerButton).toHaveFocus()
      })
    })

    test('SHOULD FAIL: focuses first interactive element when popover opens', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        const popoverContent = screen.getByRole('dialog')
        expect(popoverContent).toBeInTheDocument()

        // First interactive element should be focused (likely a status filter button)
        const firstButton = popoverContent.querySelector('button')
        expect(firstButton).toHaveFocus()
      })
    })

    test('SHOULD FAIL: traps focus within popover content', async () => {
      render(
        <div>
          <button>Before popover</button>
          <TestWrapper>
            <InvoiceFilterPopover facets={mockFacets} />
          </TestWrapper>
          <button>After popover</button>
        </div>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Tab should not move focus outside popover
      const beforeButton = screen.getByRole('button', { name: /before popover/i })
      const afterButton = screen.getByRole('button', { name: /after popover/i })

      // Focus should remain within popover
      await userEvent.tab()
      expect(beforeButton).not.toHaveFocus()
      expect(afterButton).not.toHaveFocus()
    })
  })

  describe('Component integration', () => {
    test('SHOULD FAIL: renders InvoiceFilterForm with popover variant', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        const popoverContent = screen.getByRole('dialog')
        expect(popoverContent).toBeInTheDocument()

        // Check that form is rendered with popover variant
        const filterForm = popoverContent.querySelector('[data-variant="popover"]')
        expect(filterForm).toBeInTheDocument()
      })
    })

    test('SHOULD FAIL: passes facets and loading state to filter form', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} isLoading={true} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        const popoverContent = screen.getByRole('dialog')

        // Check that loading state is passed to form
        const skeletonElements = popoverContent.querySelectorAll('.animate-pulse')
        expect(skeletonElements.length).toBeGreaterThan(0)
      })
    })

    test('SHOULD FAIL: calls onClose callback when provided', async () => {
      const onClose = jest.fn()

      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} onClose={onClose} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      // Close popover
      await userEvent.keyboard('{Escape}')

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })

    test('SHOULD FAIL: updates filter count when filters change', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })

      // Initially no badge
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument()

      // Open popover and apply filter
      await userEvent.click(triggerButton)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Click a status filter
      const pendingButton = screen.getByRole('button', { name: /pending/i })
      await userEvent.click(pendingButton)

      // Close popover
      await userEvent.keyboard('{Escape}')

      // Badge should now show count
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument()
      })
    })
  })

  describe('Error handling', () => {
    test('SHOULD FAIL: handles missing facets gracefully', () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={undefined} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      expect(triggerButton).toBeInTheDocument()
      expect(triggerButton).not.toBeDisabled()
    })

    test('SHOULD FAIL: handles empty facets gracefully', async () => {
      const emptyFacets: InvoiceFacetsResponse['facets'] = {
        statuses: [],
        categories: [],
        vendors: [],
        amountRange: { min: 0, max: 0 }
      }

      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={emptyFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByText(/no categories detected/i)).toBeInTheDocument()
        expect(screen.getByText(/no vendor facets available/i)).toBeInTheDocument()
      })
    })

    test('SHOULD FAIL: continues to function when onClose callback throws error', async () => {
      const onClose = jest.fn().mockImplementation(() => {
        throw new Error('Callback error')
      })

      // Mock console.error to prevent test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacets} onClose={onClose} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      // Close popover - should not crash despite callback error
      await userEvent.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })
})