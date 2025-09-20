'use client';

import { useQuery } from '@tanstack/react-query';

async function fetchInvoiceCount(): Promise<number> {
  try {
    // Try to fetch from stats API first
    const response = await fetch('/api/stats');
    if (response.ok) {
      const stats = await response.json();
      return stats.overview?.totalInvoices || 0;
    }
    
    // Fallback to invoices API
    const invoiceResponse = await fetch('/api/invoices?page=1&pageSize=1');
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