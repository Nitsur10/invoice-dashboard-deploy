'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchDashboardStats, type DashboardStats, type StatsParams } from '@/lib/api/stats';
import { useInvoiceFilters } from '@/hooks/use-invoices-filters';

interface DashboardStatsParams extends StatsParams {}

const MIN_DATE = '2025-05-01';

interface DashboardStatsContextValue {
  data: DashboardStats | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  params: DashboardStatsParams;
  setParams: (updater: DashboardStatsParams | ((prev: DashboardStatsParams) => DashboardStatsParams)) => void;
}

const DashboardStatsContext = createContext<DashboardStatsContextValue | undefined>(undefined);

export function DashboardStatsProvider({ children }: { children: React.ReactNode }) {
  // Try to access filters from InvoiceFiltersProvider if available
  let filters;
  try {
    const invoiceFiltersContext = useInvoiceFilters();
    filters = invoiceFiltersContext.filters;
  } catch {
    // If not wrapped in InvoiceFiltersProvider, use empty filters
    filters = {
      statuses: [],
      categories: [],
      vendors: [],
      amountRange: undefined,
      dateRange: undefined,
    };
  }

  const [params, setParamsState] = useState<DashboardStatsParams>({
    dateFrom: `${MIN_DATE}T00:00:00.000Z`,
  });

  // Merge params with filters for query key
  const queryParams = useMemo(() => {
    // Use dateRange from filters if available, otherwise use params
    const dateFrom = filters.dateRange?.start
      ? `${filters.dateRange.start}T00:00:00.000Z`
      : params.dateFrom;
    const dateTo = filters.dateRange?.end
      ? `${filters.dateRange.end}T23:59:59.999Z`
      : params.dateTo;

    return {
      dateFrom,
      dateTo,
      status: filters.statuses.length > 0 ? filters.statuses : undefined,
      category: filters.categories.length > 0 ? filters.categories : undefined,
      vendor: filters.vendors.length > 0 ? filters.vendors : undefined,
      amountMin: filters.amountRange?.min,
      amountMax: filters.amountRange?.max,
    };
  }, [params, filters]);

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', queryParams],
    queryFn: () => fetchDashboardStats(queryParams),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const value = useMemo<DashboardStatsContextValue>(
    () => ({
      data: statsQuery.data,
      isLoading: statsQuery.isLoading,
      isError: Boolean(statsQuery.error),
      error: statsQuery.error,
      refetch: statsQuery.refetch,
      params,
      setParams: (updater) => {
        setParamsState((prev) => (typeof updater === 'function' ? updater(prev) : updater));
      },
    }),
    [params, statsQuery.data, statsQuery.error, statsQuery.isLoading, statsQuery.refetch]
  );

  return <DashboardStatsContext.Provider value={value}>{children}</DashboardStatsContext.Provider>;
}

export function useDashboardStats(): DashboardStatsContextValue {
  const context = useContext(DashboardStatsContext);
  if (!context) {
    throw new Error('useDashboardStats must be used within a DashboardStatsProvider');
  }
  return context;
}
