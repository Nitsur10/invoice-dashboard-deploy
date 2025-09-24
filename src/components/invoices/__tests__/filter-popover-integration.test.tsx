import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvoiceFilterPopover } from '../filter-popover'
import { InvoiceFiltersProvider, useInvoiceFilters } from '@/hooks/use-invoices-filters'
import { fetchInvoiceFacets } from '@/lib/api/invoices'
import type { InvoiceFacetsResponse } from '@/lib/api/invoices'

// Mock API functions
jest.mock('@/lib/api/invoices', () => ({
  fetchInvoiceFacets: jest.fn(),
}))

const mockFetchInvoiceFacets = fetchInvoiceFacets as jest.MockedFunction<typeof fetchInvoiceFacets>

// Mock data
const mockFacetsResponse: InvoiceFacetsResponse = {
  facets: {
    statuses: [
      { value: 'pending', count: 15 },
      { value: 'paid', count: 25 },
      { value: 'overdue', count: 8 }
    ],
    categories: [
      { value: 'Office Supplies', count: 12 },
      { value: 'Software', count: 18 },
      { value: 'Travel', count: 9 },
      { value: 'Marketing', count: 6 }
    ],
    vendors: [
      { value: 'Acme Corp', count: 10 },
      { value: 'Tech Solutions Inc', count: 15 },
      { value: 'Office Depot', count: 8 },
      { value: 'Adobe Systems', count: 12 }
    ],
    amountRange: {
      min: 25.50,
      max: 8750.00
    }
  }
}

// Test wrapper with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <InvoiceFiltersProvider>
        {children}
      </InvoiceFiltersProvider>
    </QueryClientProvider>
  )
}

// Helper component to test hook integration
const FilterStateDisplay = () => {
  const { filters } = useInvoiceFilters()
  return (
    <div data-testid="filter-state">
      <span data-testid="status-count">{filters.statuses.length}</span>
      <span data-testid="category-count">{filters.categories.length}</span>
      <span data-testid="vendor-count">{filters.vendors.length}</span>
      <span data-testid="has-date-range">{filters.dateRange ? 'yes' : 'no'}</span>
      <span data-testid="has-amount-range">{filters.amountRange ? 'yes' : 'no'}</span>
      <span data-testid="search-value">{filters.search || ''}</span>
    </div>
  )
}

describe('InvoiceFilterPopover Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchInvoiceFacets.mockResolvedValue(mockFacetsResponse)
  })

  describe('Integration with useInvoiceFilters hook', () => {
    test('SHOULD FAIL: integrates with filter state and updates count badge', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
          <FilterStateDisplay />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })

      // Initially no filters applied
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument()
      expect(screen.getByTestId('status-count')).toHaveTextContent('0')

      // Open popover
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Apply status filters
      const pendingButton = screen.getByRole('button', { name: /pending/i })
      const paidButton = screen.getByRole('button', { name: /paid/i })

      await userEvent.click(pendingButton)
      await userEvent.click(paidButton)

      // Check that hook state is updated
      await waitFor(() => {
        expect(screen.getByTestId('status-count')).toHaveTextContent('2')
      })

      // Close popover
      await userEvent.keyboard('{Escape}')

      // Badge should now show count
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })

    test('SHOULD FAIL: category filter integration works correctly', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
          <FilterStateDisplay />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Apply category filters
      const officeSuppliesButton = screen.getByRole('button', { name: /office supplies/i })
      const softwareButton = screen.getByRole('button', { name: /software/i })

      await userEvent.click(officeSuppliesButton)
      await userEvent.click(softwareButton)

      // Check integration with hook
      await waitFor(() => {
        expect(screen.getByTestId('category-count')).toHaveTextContent('2')
      })

      // Close and verify badge
      await userEvent.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })

    test('SHOULD FAIL: vendor filter integration works correctly', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
          <FilterStateDisplay />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Apply vendor filter
      const acmeButton = screen.getByRole('button', { name: /acme corp/i })
      await userEvent.click(acmeButton)

      // Check integration with hook
      await waitFor(() => {
        expect(screen.getByTestId('vendor-count')).toHaveTextContent('1')
      })
    })

    test('SHOULD FAIL: date range filter integration works correctly', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
          <FilterStateDisplay />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Apply date range using quick preset
      const thisMonthButton = screen.getByRole('button', { name: /this month/i })
      await userEvent.click(thisMonthButton)

      // Check integration with hook
      await waitFor(() => {
        expect(screen.getByTestId('has-date-range')).toHaveTextContent('yes')
      })

      // Badge should reflect date filter
      await userEvent.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument()
      })
    })

    test('SHOULD FAIL: amount range filter integration works correctly', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
          <FilterStateDisplay />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Apply amount range
      const minInput = screen.getByLabelText(/min/i)
      const maxInput = screen.getByLabelText(/max/i)

      await userEvent.clear(minInput)
      await userEvent.type(minInput, '100')
      await userEvent.clear(maxInput)
      await userEvent.type(maxInput, '5000')

      // Check integration with hook
      await waitFor(() => {
        expect(screen.getByTestId('has-amount-range')).toHaveTextContent('yes')
      })
    })

    test('SHOULD FAIL: multiple filter types integration works correctly', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
          <FilterStateDisplay />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Apply multiple filter types
      const pendingButton = screen.getByRole('button', { name: /pending/i })
      const officeSuppliesButton = screen.getByRole('button', { name: /office supplies/i })
      const acmeButton = screen.getByRole('button', { name: /acme corp/i })
      const thisMonthButton = screen.getByRole('button', { name: /this month/i })

      await userEvent.click(pendingButton)
      await userEvent.click(officeSuppliesButton)
      await userEvent.click(acmeButton)
      await userEvent.click(thisMonthButton)

      // Check all filter types are applied
      await waitFor(() => {
        expect(screen.getByTestId('status-count')).toHaveTextContent('1')
        expect(screen.getByTestId('category-count')).toHaveTextContent('1')
        expect(screen.getByTestId('vendor-count')).toHaveTextContent('1')
        expect(screen.getByTestId('has-date-range')).toHaveTextContent('yes')
      })

      // Badge should show total count (4 filters)
      await userEvent.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument()
      })
    })

    test('SHOULD FAIL: filter reset clears all filters and updates badge', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
          <FilterStateDisplay />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      // Apply some filters first
      const pendingButton = screen.getByRole('button', { name: /pending/i })
      const officeSuppliesButton = screen.getByRole('button', { name: /office supplies/i })

      await userEvent.click(pendingButton)
      await userEvent.click(officeSuppliesButton)

      await waitFor(() => {
        expect(screen.getByTestId('status-count')).toHaveTextContent('1')
        expect(screen.getByTestId('category-count')).toHaveTextContent('1')
      })

      // Reset all filters
      const resetButton = screen.getByRole('button', { name: /reset/i })
      await userEvent.click(resetButton)

      // Check that all filters are cleared
      await waitFor(() => {
        expect(screen.getByTestId('status-count')).toHaveTextContent('0')
        expect(screen.getByTestId('category-count')).toHaveTextContent('0')
        expect(screen.getByTestId('vendor-count')).toHaveTextContent('0')
        expect(screen.getByTestId('has-date-range')).toHaveTextContent('no')
        expect(screen.getByTestId('has-amount-range')).toHaveTextContent('no')
      })

      // Badge should not be visible
      await userEvent.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByText(/\d+/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Facets loading and API integration', () => {
    test('SHOULD FAIL: displays loading state while facets are loading', async () => {
      // Mock delayed API response
      mockFetchInvoiceFacets.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockFacetsResponse), 100))
      )

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

        // Should show skeleton loading states
        const skeletonElements = popoverContent.querySelectorAll('.animate-pulse')
        expect(skeletonElements.length).toBeGreaterThan(0)
      })
    })

    test('SHOULD FAIL: displays facets after loading completes', async () => {
      const TestComponent = () => {
        const [isLoading, setIsLoading] = React.useState(true)
        const [facets, setFacets] = React.useState<typeof mockFacetsResponse.facets | undefined>(undefined)

        React.useEffect(() => {
          setTimeout(() => {
            setFacets(mockFacetsResponse.facets)
            setIsLoading(false)
          }, 50)
        }, [])

        return <InvoiceFilterPopover facets={facets} isLoading={isLoading} />
      }

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      // Initially loading
      await waitFor(() => {
        const popoverContent = screen.getByRole('dialog')
        const skeletonElements = popoverContent.querySelectorAll('.animate-pulse')
        expect(skeletonElements.length).toBeGreaterThan(0)
      })

      // After loading completes
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pending/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /office supplies/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /acme corp/i })).toBeInTheDocument()
      }, { timeout: 200 })
    })

    test('SHOULD FAIL: handles empty facets gracefully', async () => {
      const emptyFacetsResponse = {
        facets: {
          statuses: [],
          categories: [],
          vendors: [],
          amountRange: { min: 0, max: 0 }
        }
      }

      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={emptyFacetsResponse.facets} isLoading={false} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        // Should show empty state messages
        expect(screen.getByText(/no categories detected/i)).toBeInTheDocument()
        expect(screen.getByText(/no vendor facets available/i)).toBeInTheDocument()

        // Status filters should still show default statuses
        expect(screen.getByRole('button', { name: /pending/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /paid/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /overdue/i })).toBeInTheDocument()
      })
    })

    test('SHOULD FAIL: updates when new facets are provided', async () => {
      const TestComponent = () => {
        const [facets, setFacets] = React.useState(mockFacetsResponse.facets)

        const updateFacets = () => {
          setFacets({
            ...mockFacetsResponse.facets,
            vendors: [
              ...mockFacetsResponse.facets.vendors,
              { value: 'New Vendor Inc', count: 5 }
            ]
          })
        }

        return (
          <div>
            <button onClick={updateFacets} data-testid="update-facets">Update Facets</button>
            <InvoiceFilterPopover facets={facets} />
          </div>
        )
      }

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      // Initially should not have the new vendor
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /new vendor inc/i })).not.toBeInTheDocument()
      })

      await userEvent.keyboard('{Escape}')

      // Update facets
      const updateButton = screen.getByTestId('update-facets')
      await userEvent.click(updateButton)

      // Reopen popover
      await userEvent.click(triggerButton)

      // Should now have the new vendor
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new vendor inc/i })).toBeInTheDocument()
      })
    })
  })

  describe('Filter application and clearing', () => {
    test('SHOULD FAIL: applies filters correctly and maintains state', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
          <FilterStateDisplay />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })

      // Apply filters
      await userEvent.click(triggerButton)

      const pendingButton = screen.getByRole('button', { name: /pending/i })
      const overdueButton = screen.getByRole('button', { name: /overdue/i })

      await userEvent.click(pendingButton)
      await userEvent.click(overdueButton)

      // Check that buttons show selected state
      await waitFor(() => {
        expect(pendingButton).toHaveAttribute('aria-pressed', 'true')
        expect(overdueButton).toHaveAttribute('aria-pressed', 'true')
      })

      // Close and reopen to verify state persistence
      await userEvent.keyboard('{Escape}')
      await userEvent.click(triggerButton)

      // Filters should still be applied
      await waitFor(() => {
        const pendingButtonAfterReopen = screen.getByRole('button', { name: /pending/i })
        const overdueButtonAfterReopen = screen.getByRole('button', { name: /overdue/i })

        expect(pendingButtonAfterReopen).toHaveAttribute('aria-pressed', 'true')
        expect(overdueButtonAfterReopen).toHaveAttribute('aria-pressed', 'true')
      })
    })

    test('SHOULD FAIL: removes individual filters correctly', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
          <FilterStateDisplay />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      // Apply multiple filters
      const pendingButton = screen.getByRole('button', { name: /pending/i })
      const paidButton = screen.getByRole('button', { name: /paid/i })

      await userEvent.click(pendingButton)
      await userEvent.click(paidButton)

      await waitFor(() => {
        expect(screen.getByTestId('status-count')).toHaveTextContent('2')
      })

      // Remove one filter
      await userEvent.click(pendingButton)

      await waitFor(() => {
        expect(screen.getByTestId('status-count')).toHaveTextContent('1')
        expect(pendingButton).toHaveAttribute('aria-pressed', 'false')
        expect(paidButton).toHaveAttribute('aria-pressed', 'true')
      })
    })

    test('SHOULD FAIL: clears date range correctly', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
          <FilterStateDisplay />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      // Apply date range
      const thisMonthButton = screen.getByRole('button', { name: /this month/i })
      await userEvent.click(thisMonthButton)

      await waitFor(() => {
        expect(screen.getByTestId('has-date-range')).toHaveTextContent('yes')
      })

      // Clear date range using the calendar clear button
      const clearButton = screen.getByText(/clear/i)
      await userEvent.click(clearButton)

      await waitFor(() => {
        expect(screen.getByTestId('has-date-range')).toHaveTextContent('no')
      })
    })

    test('SHOULD FAIL: clears amount range correctly', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
          <FilterStateDisplay />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      // Apply amount range
      const minInput = screen.getByLabelText(/min/i)
      const maxInput = screen.getByLabelText(/max/i)

      await userEvent.type(minInput, '100')
      await userEvent.type(maxInput, '1000')

      await waitFor(() => {
        expect(screen.getByTestId('has-amount-range')).toHaveTextContent('yes')
      })

      // Clear amount range
      await userEvent.clear(minInput)
      await userEvent.clear(maxInput)

      await waitFor(() => {
        expect(screen.getByTestId('has-amount-range')).toHaveTextContent('no')
      })
    })
  })

  describe('Saved views integration', () => {
    test('SHOULD FAIL: integrates with saved views functionality', async () => {
      const TestComponent = () => {
        const { filters, applySavedView } = useInvoiceFilters()

        const applySampleView = () => {
          applySavedView({
            id: 'sample-view',
            name: 'Sample View',
            filters: {
              statuses: ['pending', 'overdue'],
              categories: ['Office Supplies'],
              vendors: ['Acme Corp'],
              dateRange: { start: '2023-01-01', end: '2023-12-31' },
              amountRange: { min: 100, max: 5000 },
              search: '',
              savedViewId: 'sample-view'
            }
          })
        }

        return (
          <div>
            <button onClick={applySampleView} data-testid="apply-saved-view">
              Apply Saved View
            </button>
            <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
            <div data-testid="saved-view-id">{filters.savedViewId || 'none'}</div>
          </div>
        )
      }

      render(
        <TestWrapper>
          <TestComponent />
          <FilterStateDisplay />
        </TestWrapper>
      )

      // Apply saved view
      const applySavedViewButton = screen.getByTestId('apply-saved-view')
      await userEvent.click(applySavedViewButton)

      // Check that filters are applied
      await waitFor(() => {
        expect(screen.getByTestId('status-count')).toHaveTextContent('2')
        expect(screen.getByTestId('category-count')).toHaveTextContent('1')
        expect(screen.getByTestId('vendor-count')).toHaveTextContent('1')
        expect(screen.getByTestId('has-date-range')).toHaveTextContent('yes')
        expect(screen.getByTestId('has-amount-range')).toHaveTextContent('yes')
        expect(screen.getByTestId('saved-view-id')).toHaveTextContent('sample-view')
      })

      // Badge should show total count (5 filters)
      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      // Open popover to verify filter states
      await userEvent.click(triggerButton)

      await waitFor(() => {
        const pendingButton = screen.getByRole('button', { name: /pending/i })
        const overdueButton = screen.getByRole('button', { name: /overdue/i })
        const officeSuppliesButton = screen.getByRole('button', { name: /office supplies/i })
        const acmeButton = screen.getByRole('button', { name: /acme corp/i })

        expect(pendingButton).toHaveAttribute('aria-pressed', 'true')
        expect(overdueButton).toHaveAttribute('aria-pressed', 'true')
        expect(officeSuppliesButton).toHaveAttribute('aria-pressed', 'true')
        expect(acmeButton).toHaveAttribute('aria-pressed', 'true')
      })
    })

    test('SHOULD FAIL: clears saved view ID when filters are modified', async () => {
      const TestComponent = () => {
        const { filters, applySavedView } = useInvoiceFilters()

        const applySampleView = () => {
          applySavedView({
            id: 'sample-view',
            name: 'Sample View',
            filters: {
              statuses: ['pending'],
              categories: [],
              vendors: [],
              dateRange: undefined,
              amountRange: undefined,
              search: '',
              savedViewId: 'sample-view'
            }
          })
        }

        return (
          <div>
            <button onClick={applySampleView} data-testid="apply-saved-view">
              Apply Saved View
            </button>
            <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
            <div data-testid="saved-view-id">{filters.savedViewId || 'none'}</div>
          </div>
        )
      }

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Apply saved view
      const applySavedViewButton = screen.getByTestId('apply-saved-view')
      await userEvent.click(applySavedViewButton)

      await waitFor(() => {
        expect(screen.getByTestId('saved-view-id')).toHaveTextContent('sample-view')
      })

      // Modify filters
      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      const paidButton = screen.getByRole('button', { name: /paid/i })
      await userEvent.click(paidButton)

      // Saved view ID should be cleared
      await waitFor(() => {
        expect(screen.getByTestId('saved-view-id')).toHaveTextContent('none')
      })
    })
  })

  describe('Performance and optimization', () => {
    test('SHOULD FAIL: handles rapid filter changes efficiently', async () => {
      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
          <FilterStateDisplay />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      const pendingButton = screen.getByRole('button', { name: /pending/i })
      const paidButton = screen.getByRole('button', { name: /paid/i })
      const overdueButton = screen.getByRole('button', { name: /overdue/i })

      // Rapidly toggle filters
      const rapidChanges = async () => {
        await userEvent.click(pendingButton)
        await userEvent.click(paidButton)
        await userEvent.click(overdueButton)
        await userEvent.click(pendingButton) // untoggle
        await userEvent.click(paidButton) // untoggle
      }

      const startTime = performance.now()
      await rapidChanges()
      const endTime = performance.now()

      // Should handle rapid changes quickly (< 100ms)
      expect(endTime - startTime).toBeLessThan(100)

      // Final state should be correct
      await waitFor(() => {
        expect(screen.getByTestId('status-count')).toHaveTextContent('1') // only overdue
      })
    })

    test('SHOULD FAIL: optimizes re-renders with large facet datasets', async () => {
      // Create large dataset
      const largeFacets = {
        statuses: mockFacetsResponse.facets.statuses,
        categories: Array.from({ length: 50 }, (_, i) => ({ value: `Category ${i}`, count: i + 1 })),
        vendors: Array.from({ length: 100 }, (_, i) => ({ value: `Vendor ${i}`, count: i + 1 })),
        amountRange: mockFacetsResponse.facets.amountRange
      }

      const startTime = performance.now()

      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={largeFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const renderTime = performance.now() - startTime

      // Should render efficiently even with large datasets (< 500ms)
      expect(renderTime).toBeLessThan(500)

      // Should display all categories and vendors
      const categoryButtons = screen.getAllByText(/category \d+/i)
      const vendorButtons = screen.getAllByText(/vendor \d+/i)

      expect(categoryButtons.length).toBe(50)
      expect(vendorButtons.length).toBe(100)
    })

    test('SHOULD FAIL: debounces amount range input changes', async () => {
      const TestComponent = () => {
        const { filters } = useInvoiceFilters()
        const [renderCount, setRenderCount] = React.useState(0)

        React.useEffect(() => {
          setRenderCount(prev => prev + 1)
        }, [filters.amountRange])

        return (
          <div>
            <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
            <div data-testid="render-count">{renderCount}</div>
          </div>
        )
      }

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })
      await userEvent.click(triggerButton)

      const minInput = screen.getByLabelText(/min/i)

      // Type multiple characters rapidly
      await userEvent.type(minInput, '12345', { delay: 10 })

      // Should not render for every keystroke
      await waitFor(() => {
        const renderCount = parseInt(screen.getByTestId('render-count').textContent || '0')
        expect(renderCount).toBeLessThan(6) // Should be debounced
      })
    })
  })

  describe('Error handling and edge cases', () => {
    test('SHOULD FAIL: handles filter hook context errors gracefully', () => {
      // Test component outside of provider context
      const TestComponentWithoutProvider = () => {
        try {
          return <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
        } catch (error) {
          return <div data-testid="error-caught">Error: {(error as Error).message}</div>
        }
      }

      render(<TestComponentWithoutProvider />)

      expect(screen.getByTestId('error-caught')).toHaveTextContent(
        'useInvoiceFilters must be used within an InvoiceFiltersProvider'
      )
    })

    test('SHOULD FAIL: handles malformed facet data gracefully', async () => {
      const malformedFacets = {
        statuses: null as any,
        categories: undefined as any,
        vendors: [] as any,
        amountRange: null as any
      }

      render(
        <TestWrapper>
          <InvoiceFilterPopover facets={malformedFacets} />
        </TestWrapper>
      )

      const triggerButton = screen.getByRole('button', { name: /filters/i })

      // Should not crash
      expect(triggerButton).toBeInTheDocument()

      await userEvent.click(triggerButton)

      // Should show fallback states
      await waitFor(() => {
        expect(screen.getByText(/no categories detected/i)).toBeInTheDocument()
        expect(screen.getByText(/no vendor facets available/i)).toBeInTheDocument()
      })
    })

    test('SHOULD FAIL: recovers from filter state corruption', async () => {
      const TestComponent = () => {
        const { setFilters } = useInvoiceFilters()

        const corruptState = () => {
          // Simulate corrupted state
          setFilters({
            statuses: null as any,
            categories: undefined as any,
            vendors: 'invalid' as any,
            dateRange: 'not-an-object' as any,
            amountRange: true as any,
            search: 123 as any,
            savedViewId: {} as any
          })
        }

        return (
          <div>
            <button onClick={corruptState} data-testid="corrupt-state">
              Corrupt State
            </button>
            <InvoiceFilterPopover facets={mockFacetsResponse.facets} />
          </div>
        )
      }

      render(
        <TestWrapper>
          <TestComponent />
          <FilterStateDisplay />
        </TestWrapper>
      )

      // Corrupt the state
      const corruptButton = screen.getByTestId('corrupt-state')
      await userEvent.click(corruptButton)

      // Component should not crash
      const triggerButton = screen.getByRole('button', { name: /filters/i })
      expect(triggerButton).toBeInTheDocument()

      // Should show reasonable defaults or handle gracefully
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })
  })
})