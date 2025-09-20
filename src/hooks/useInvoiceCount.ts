'use client';

import { useQuery } from '@tanstack/react-query';

async function fetchInvoiceCount(): Promise<number> {
  try {
    // Try to fetch from stats API first with May 1st, 2025 filter
    const params = new URLSearchParams({
      dateFrom: '2025-05-01T00:00:00.000Z'
    });
    const response = await fetch(`/api/stats?${params}`);
    if (response.ok) {
      const stats = await response.json();
      return stats.overview?.totalInvoices || 0;
    }

    // Fallback to invoices API with same date filter
    const invoiceParams = new URLSearchParams({
      page: '1',
      pageSize: '1',
      dateFrom: '2025-05-01T00:00:00.000Z'
    });
    const invoiceResponse = await fetch(`/api/invoices?${invoiceParams}`);
    if (invoiceResponse.ok) {
      const data = await invoiceResponse.json();
      return data.total || 0;
    }

    return 0;
  } catch (error) {
    console.warn('Failed to fetch invoice count:', error);
    return 0;
  }
}

export function useInvoiceCount() {
  return useQuery({
    queryKey: ['invoice-count'],
    queryFn: fetchInvoiceCount,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}