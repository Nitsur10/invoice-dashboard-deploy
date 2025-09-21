"use client";

import * as React from 'react';
import { useMemo } from 'react';
import { useQuery, useQueryClient, useQueries } from '@tanstack/react-query';
import { KanbanBoard, BoardStatus } from '@/components/kanban/kanban-board';
import { PerfectJiraKanban } from '@/components/kanban/perfect-jira-kanban';
import { updateInvoiceStatus } from '@/lib/api/invoices';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutGrid, Filter, RefreshCw, DollarSign } from 'lucide-react';
import { Invoice } from '@/lib/types';
import { fetchInvoices } from '@/lib/api/invoices';
import { InvoiceFiltersProvider, useInvoiceFilters } from '@/hooks/use-invoices-filters';
import { InvoiceFilterDrawer } from '@/components/invoices/filter-drawer';
import { InvoiceFilterChips } from '@/components/invoices/filter-chips';
import { ExportProgressButton } from '@/components/invoices/export-progress-button';

export default function KanbanPage() {
  return (
    <InvoiceFiltersProvider>
      <KanbanView />
    </InvoiceFiltersProvider>
  );
}

function KanbanView() {
  const { filters } = useInvoiceFilters();
  const [isFilterDrawerOpen, setFilterDrawerOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const apiParams = useMemo(() => ({
    page: 0,
    limit: 5, // Show 5 cards per request as requested
    search: filters.search || undefined,
    status: filters.statuses.length ? filters.statuses : undefined,
    category: filters.categories.length ? filters.categories : undefined,
    vendor: filters.vendors.length ? filters.vendors : undefined,
    dateFrom: filters.dateRange?.start,
    dateTo: filters.dateRange?.end,
    amountMin: filters.amountRange?.min,
    amountMax: filters.amountRange?.max,
    savedViewId: filters.savedViewId,
  }), [filters]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['kanban-invoices', apiParams],
    queryFn: async () => {
      console.log('Fetching invoices with params:', apiParams);
      const result = await fetchInvoices(apiParams);
      console.log('Fetched invoices result:', result);
      return result;
    },
    staleTime: 2 * 60 * 1000,
    placeholderData: 'keepPreviousData',
    enabled: typeof window !== 'undefined',
  });

  const invoices: Invoice[] = useMemo(() => {
    console.log('Processing invoices data:', { data, hasData: !!data?.data });
    if (!data?.data) {
      console.log('No data available');
      return [] as Invoice[];
    }

    const processed = (data.data as any[]).map((inv, idx) => {
      const rawStatus = (inv.status ?? inv.paymentStatus ?? 'pending')
        .toString()
        .toLowerCase() as BoardStatus;
      const uniqueId = String((inv as any).invoiceNumber ?? `gen-${idx}`);
      return {
        ...inv,
        id: uniqueId,
        status: rawStatus,
        paymentStatus: rawStatus,
        issueDate: inv.issueDate ? new Date(inv.issueDate) : undefined,
        dueDate: inv.dueDate ? new Date(inv.dueDate) : undefined,
        receivedDate: inv.receivedDate ? new Date(inv.receivedDate) : undefined,
        paidDate: inv.paidDate ? new Date(inv.paidDate) : undefined,
      } as Invoice;
    });

    console.log('Processed invoices:', processed.length, processed.slice(0, 2));
    return processed;
  }, [data]);

  const grouped = useMemo(() => ({
    pending: invoices.filter((i) => i.status === 'pending'),
    in_review: invoices.filter((i) => i.status === 'in_review'),
    approved: invoices.filter((i) => i.status === 'approved'),
    paid: invoices.filter((i) => i.status === 'paid'),
    overdue: invoices.filter((i) => i.status === 'overdue'),
  }), [invoices]);

  // Fetch server-side totals per status (respects current filters)
  const statusList: BoardStatus[] = ['pending','in_review','approved','paid','overdue'];
  const totalsQueries = useQueries({
    queries: statusList.map((s) => ({
      queryKey: ['kanban-invoices-total', { ...apiParams, status: [s] }],
      queryFn: () => fetchInvoices({ ...apiParams, status: [s], limit: 1 }),
      staleTime: 2 * 60 * 1000,
      enabled: typeof window !== 'undefined',
    })),
  });

  const totalsByStatus = useMemo(() => {
    const map: Partial<Record<BoardStatus, number>> = {};
    statusList.forEach((s, idx) => {
      const q = totalsQueries[idx];
      const total = (q?.data as any)?.pagination?.total;
      if (typeof total === 'number') map[s] = total;
    });
    return map;
  }, [totalsQueries]);

  const stats = useMemo(() => {
    const totalAmount = data?.pagination?.totalAmount ??
                       invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    return {
      total: data?.pagination?.total ?? 0,
      totalAmount,
      pending: totalsByStatus.pending ?? 0,
      in_review: totalsByStatus.in_review ?? 0,
      approved: totalsByStatus.approved ?? 0,
      paid: totalsByStatus.paid ?? 0,
      overdue: totalsByStatus.overdue ?? 0,
    };
  }, [data?.pagination?.total, data?.pagination?.totalAmount, totalsByStatus, invoices]);

  const handleInvoiceUpdate = async (invoiceId: string, newStatus: BoardStatus) => {
    // Optimistically update the React Query cache for this page's dataset
    const queryKey = ['kanban-invoices', apiParams] as const;
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old?.data) return old;
      const next = {
        ...old,
        data: old.data.map((inv: any) =>
          (inv.id === invoiceId || inv.invoiceNumber === invoiceId) ? { ...inv, status: newStatus, paymentStatus: newStatus } : inv
        ),
      };
      return next;
    });

    // Actually update the database
    try {
      const result = await updateInvoiceStatus(invoiceId, newStatus);
      if (!result.success) {
        // Revert optimistic update on failure
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.data) return old;
          const reverted = {
            ...old,
            data: old.data.map((inv: any) =>
              (inv.id === invoiceId || inv.invoiceNumber === invoiceId) ? { ...inv, status: inv.status, paymentStatus: inv.paymentStatus } : inv
            ),
          };
          return reverted;
        });
        console.error('Failed to update invoice status:', result.error);
      }
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.data) return old;
        const reverted = {
          ...old,
          data: old.data.map((inv: any) =>
            (inv.id === invoiceId || inv.invoiceNumber === invoiceId) ? { ...inv, status: inv.status, paymentStatus: inv.paymentStatus } : inv
          ),
        };
        return reverted;
      });
      console.error('Error updating invoice status:', error);
    }
  };

  const handleInvoiceUpdateError = (error: string) => {
    console.error('Failed to update invoice:', error);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading kanban board…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="rpd-heading-xl rpd-text-gradient mb-2">RPD Kanban Board</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Filter and export the same as the Invoices page. Showing up to 5 cards.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setFilterDrawerOpen(true)}>
            <Filter className="h-4 w-4 mr-2" /> Filters
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <ExportProgressButton />
        </div>
      </div>

      <InvoiceFilterDrawer
        open={isFilterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
      />

      <InvoiceFilterChips />

      {/* Quick Stats (actual totals from database) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200/50 dark:border-blue-800/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.pending}</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Pending</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.in_review}</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">In Review</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.approved}</p>
              <p className="text-sm text-purple-700 dark:text-purple-300">Approved</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200/50 dark:border-emerald-800/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{stats.paid}</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">Paid</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200/50 dark:border-red-800/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.overdue}</p>
              <p className="text-sm text-red-700 dark:text-red-300">Overdue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Guide */}
      <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <LayoutGrid className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Status Workflow</span>
            </div>
            <div className="flex items-center space-x-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center space-x-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div><span>Pending</span></div>
              <span>→</span>
              <div className="flex items-center space-x-1"><div className="w-2 h-2 bg-amber-500 rounded-full"></div><span>Review</span></div>
              <span>→</span>
              <div className="flex items-center space-x-1"><div className="w-2 h-2 bg-purple-500 rounded-full"></div><span>Approved</span></div>
              <span>→</span>
              <div className="flex items-center space-x-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span>Paid</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board (Jira-like behavior) */}
      <div className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm rounded-xl p-6 border border-slate-200/40 dark:border-slate-700/40">
        <PerfectJiraKanban
          invoices={invoices as any}
          onInvoiceUpdate={async (id, status) => {
            await handleInvoiceUpdate(id, status);
          }}
        />
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-3">Showing up to 5 matching cards. Adjust filters to refine.</div>
      </div>
    </div>
  );
}
