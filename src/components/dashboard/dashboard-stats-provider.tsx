'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchDashboardStats, type DashboardStats, type StatsParams } from '@/lib/api/stats';

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
  const [params, setParamsState] = useState<DashboardStatsParams>({
    dateFrom: `${MIN_DATE}T00:00:00.000Z`,
  });

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', params],
    queryFn: () => fetchDashboardStats(params),
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
        setParamsState((prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }));
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
