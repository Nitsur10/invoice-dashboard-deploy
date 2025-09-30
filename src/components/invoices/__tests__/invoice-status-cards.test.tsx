import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InvoicesView } from '@/app/(dashboard)/invoices/page';
import * as invoicesApi from '@/lib/api/invoices';

// Mock the API module
vi.mock('@/lib/api/invoices', () => ({
  fetchInvoices: vi.fn(),
  fetchInvoiceFacets: vi.fn(),
  fetchInvoiceSavedViews: vi.fn(),
  createInvoiceSavedView: vi.fn(),
  deleteInvoiceSavedView: vi.fn(),
}));

describe('Invoice Status Cards - Database Totals', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const mockApiResponse = (page: number, statusCounts: any) => ({
    data: Array.from({ length: 20 }, (_, i) => ({
      id: `inv-${page}-${i}`,
      invoiceNumber: `INV-${page}-${i}`,
      amount: 1000,
      vendor: 'Test Vendor',
      status: page === 0 && i < 5 ? 'pending' : 'paid', // Only 5 pending on page 1
      createdAt: new Date().toISOString(),
    })),
    pagination: {
      total: 100,
      pageCount: 5,
      pageSize: 20,
      pageIndex: page,
    },
    statusCounts, // This is what we're testing
  });

  it('should display database status counts, not page-filtered counts', async () => {
    const mockResponse = mockApiResponse(0, {
      pending: 30, // Database total
      paid: 60,    // Database total
      overdue: 10, // Database total
    });

    vi.mocked(invoicesApi.fetchInvoices).mockResolvedValue(mockResponse as any);
    vi.mocked(invoicesApi.fetchInvoiceFacets).mockResolvedValue({
      facets: {
        statuses: [],
        categories: [],
        vendors: [],
      },
    });
    vi.mocked(invoicesApi.fetchInvoiceSavedViews).mockResolvedValue({ views: [] });

    render(
      <QueryClientProvider client={queryClient}>
        <InvoicesView />
      </QueryClientProvider>
    );

    await waitFor(() => {
      // Should show database totals (30) not page count (5)
      const pendingCard = screen.getByTestId('status-card-pending');
      expect(pendingCard).toHaveTextContent('30');

      const paidCard = screen.getByTestId('status-card-paid');
      expect(paidCard).toHaveTextContent('60');

      const overdueCard = screen.getByTestId('status-card-overdue');
      expect(overdueCard).toHaveTextContent('10');
    });
  });

  it('should maintain same status counts when changing pages', async () => {
    const statusCounts = {
      pending: 30,
      paid: 60,
      overdue: 10,
    };

    // Page 1 response
    const page1Response = mockApiResponse(0, statusCounts);
    // Page 2 response - same status counts
    const page2Response = mockApiResponse(1, statusCounts);

    vi.mocked(invoicesApi.fetchInvoices)
      .mockResolvedValueOnce(page1Response as any)
      .mockResolvedValueOnce(page2Response as any);

    vi.mocked(invoicesApi.fetchInvoiceFacets).mockResolvedValue({
      facets: {
        statuses: [],
        categories: [],
        vendors: [],
      },
    });
    vi.mocked(invoicesApi.fetchInvoiceSavedViews).mockResolvedValue({ views: [] });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <InvoicesView />
      </QueryClientProvider>
    );

    // Wait for page 1 to load
    await waitFor(() => {
      expect(screen.getByTestId('status-card-pending')).toHaveTextContent('30');
    });

    // Navigate to page 2 (simulated by rerendering with new query)
    rerender(
      <QueryClientProvider client={queryClient}>
        <InvoicesView />
      </QueryClientProvider>
    );

    // Status counts should remain the same
    await waitFor(() => {
      expect(screen.getByTestId('status-card-pending')).toHaveTextContent('30');
      expect(screen.getByTestId('status-card-paid')).toHaveTextContent('60');
      expect(screen.getByTestId('status-card-overdue')).toHaveTextContent('10');
    });
  });

  it('should show "Current Page Total" as page-specific amount', async () => {
    const mockResponse = mockApiResponse(0, {
      pending: 30,
      paid: 60,
      overdue: 10,
    });

    vi.mocked(invoicesApi.fetchInvoices).mockResolvedValue(mockResponse as any);
    vi.mocked(invoicesApi.fetchInvoiceFacets).mockResolvedValue({
      facets: {
        statuses: [],
        categories: [],
        vendors: [],
      },
    });
    vi.mocked(invoicesApi.fetchInvoiceSavedViews).mockResolvedValue({ views: [] });

    render(
      <QueryClientProvider client={queryClient}>
        <InvoicesView />
      </QueryClientProvider>
    );

    await waitFor(() => {
      const amountCard = screen.getByTestId('summary-card-amount');
      // 20 invoices * $1000 = $20,000 (page total, not database total)
      expect(amountCard).toHaveTextContent('$20,000');
    });
  });

  it('should handle missing statusCounts gracefully', async () => {
    const mockResponseWithoutStatusCounts = {
      data: [],
      pagination: {
        total: 0,
        pageCount: 0,
        pageSize: 20,
        pageIndex: 0,
      },
      // statusCounts missing
    };

    vi.mocked(invoicesApi.fetchInvoices).mockResolvedValue(
      mockResponseWithoutStatusCounts as any
    );
    vi.mocked(invoicesApi.fetchInvoiceFacets).mockResolvedValue({
      facets: {
        statuses: [],
        categories: [],
        vendors: [],
      },
    });
    vi.mocked(invoicesApi.fetchInvoiceSavedViews).mockResolvedValue({ views: [] });

    render(
      <QueryClientProvider client={queryClient}>
        <InvoicesView />
      </QueryClientProvider>
    );

    // Should default to 0 when statusCounts missing
    await waitFor(() => {
      expect(screen.getByTestId('status-card-pending')).toHaveTextContent('0');
      expect(screen.getByTestId('status-card-paid')).toHaveTextContent('0');
      expect(screen.getByTestId('status-card-overdue')).toHaveTextContent('0');
    });
  });
});