'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Calendar, Filter, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { StatsCards } from '@/components/dashboard/stats-cards';
import { DashboardStatsProvider, useDashboardStats } from '@/components/dashboard/dashboard-stats-provider';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateForSydney } from '@/lib/data';
import { InvoiceFiltersProvider, useInvoiceFilters } from '@/hooks/use-invoices-filters';
import { InvoiceFilterDrawer } from '@/components/invoices/filter-drawer';
import { InvoiceFilterChips } from '@/components/invoices/filter-chips';
import { fetchInvoiceFacets } from '@/lib/api/invoices';

const StatusBreakdown = dynamic(() => import('@/components/charts/supplier-breakdown').then((m) => m.StatusBreakdown), {
  ssr: false,
  loading: () => (
    <Card className="rpd-card-elevated">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
          <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </CardContent>
    </Card>
  ),
});

const TopVendors = dynamic(() => import('@/components/charts/top-vendors').then((m) => m.TopVendors), {
  ssr: false,
  loading: () => (
    <Card className="rpd-card-elevated">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </CardContent>
    </Card>
  ),
});

function Clock() {
  const [now, setNow] = useState<string>('');
  useEffect(() => {
    const id = setInterval(() => setNow(formatDateForSydney(new Date())), 1000);
    setNow(formatDateForSydney(new Date()));
    return () => clearInterval(id);
  }, []);
  return <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">{now}</span>;
}

export default function Dashboard() {
  return (
    <InvoiceFiltersProvider>
      <DashboardStatsProvider>
        <DashboardView />
      </DashboardStatsProvider>
    </InvoiceFiltersProvider>
  );
}

const MIN_DATE = '2025-05-01';

function toIsoStart(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function toIsoEnd(date: string): string {
  return `${date}T23:59:59.999Z`;
}

function DashboardView() {
  const { filters } = useInvoiceFilters();
  const { data: stats, isLoading, isError, params, setParams } = useDashboardStats();
  const [isFilterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Fetch facets for filter options
  const facetsQuery = useQuery({
    queryKey: ['invoice-facets'],
    queryFn: fetchInvoiceFacets,
    staleTime: 10 * 60 * 1000,
  });

  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.statuses.length > 0 ||
      filters.categories.length > 0 ||
      filters.vendors.length > 0 ||
      filters.amountRange !== undefined
    );
  }, [filters]);

  const dateRangeLabel = (() => {
    const fromLabel = params.dateFrom ? params.dateFrom.slice(0, 10) : MIN_DATE;
    const toLabel = params.dateTo ? params.dateTo.slice(0, 10) : 'Today';
    return `${fromLabel} → ${toLabel}`;
  })();

  return (
    <div className="rpd-gradient-bg min-h-screen">
      <div className="rpd-container rpd-section-padding space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="rpd-heading-xl rpd-text-gradient mb-2">
              RPD Invoice Dashboard
            </h1>
            <p className="rpd-body-lg text-muted-foreground">
              Welcome back! Here&apos;s what&apos;s happening with your invoices today.
            </p>
            <div className="flex items-center space-x-2 mt-3">
              <Calendar className="h-4 w-4 text-primary" />
              <Clock />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Data window: {dateRangeLabel}</p>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              size="sm"
              className="rpd-btn-secondary space-x-2 border hover:border-primary"
              onClick={() => setFilterDrawerOpen(true)}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </Button>
          </div>
        </div>

        {/* Filter Chips */}
        <InvoiceFilterChips className="mt-4" />

        {/* Stats Cards */}
        {isLoading && (
          <div className="rpd-grid-responsive">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rpd-card h-32 rpd-skeleton" />
            ))}
          </div>
        )}
        {isError && (
          <div className="rpd-card-elevated p-6 border-red-800/30">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-red-400" />
              <span className="rpd-body text-red-400">Failed to load dashboard stats.</span>
            </div>
          </div>
        )}
        <StatsCards />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="animate-fade-in">
            <StatusBreakdown
              data={stats?.breakdowns.processingStatus ?? []}
              isLoading={isLoading}
              isFiltered={hasActiveFilters}
            />
          </div>
          <div className="animate-fade-in" style={{animationDelay: '0.1s'}}>
            <TopVendors
              data={stats?.breakdowns.topVendors ?? []}
              isLoading={isLoading}
              isFiltered={hasActiveFilters}
            />
          </div>
        </div>

        {/* Filter Drawer */}
        <InvoiceFilterDrawer
          open={isFilterDrawerOpen}
          onOpenChange={setFilterDrawerOpen}
          facets={facetsQuery.data?.facets}
          isLoading={facetsQuery.isLoading}
        />
      </div>
    </div>
  );
}
