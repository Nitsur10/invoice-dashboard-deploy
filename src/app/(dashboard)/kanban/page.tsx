'use client';

import { useEffect, useMemo, useState } from 'react';
import { KanbanBoard, BoardStatus } from '@/components/kanban/kanban-board';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutGrid, Filter, Download, RefreshCw, Users, DollarSign, TrendingUp } from 'lucide-react';
import { Invoice } from '@/lib/types';
import { fetchInvoices } from '@/lib/api/invoices';

export default function KanbanPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFromApi();
  }, []);

  const loadFromApi = async () => {
    try {
      const res = await fetchInvoices({ page: 0, limit: 200 });
      const mapped: Invoice[] = (res.data.data as any[]).map((inv) => {
        const rawStatus = (inv.status ?? inv.paymentStatus ?? 'pending')
          .toString()
          .toLowerCase();

        const reviewStatus = (rawStatus === 'paid' ? 'pending' : rawStatus) as BoardStatus;

        return {
          ...inv,
          originalStatus: rawStatus,
          status: reviewStatus,
          paymentStatus: reviewStatus,
          issueDate: inv.issueDate ? new Date(inv.issueDate) : undefined,
          dueDate: inv.dueDate ? new Date(inv.dueDate) : undefined,
          receivedDate: inv.receivedDate ? new Date(inv.receivedDate) : undefined,
          paidDate: inv.paidDate ? new Date(inv.paidDate) : undefined,
        } as Invoice & { paymentStatus: string; originalStatus: string };
      }) as Invoice[];
      setInvoices(mapped);
    } catch (e) {
      console.error('Error loading invoices from API:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceUpdate = (invoiceId: string, newStatus: BoardStatus) => {
    setInvoices((prev) =>
      prev.map((invoice) =>
        invoice.id === invoiceId
          ? {
              ...invoice,
              status: newStatus,
              paymentStatus: newStatus,
            }
          : invoice
      )
    );
  };

  const grouped = useMemo(() => {
    return {
      pending: invoices.filter((i) => i.status === 'pending'),
      in_review: invoices.filter((i) => i.status === 'in_review'),
      approved: invoices.filter((i) => i.status === 'approved'),
      paid: invoices.filter((i) => i.status === 'paid'),
      overdue: invoices.filter((i) => i.status === 'overdue'),
    };
  }, [invoices]);

  const stats = useMemo(() => ({
    total: invoices.length,
    totalAmount: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    pending: grouped.pending.length,
    paid: grouped.paid.length,
    overdue: grouped.overdue.length,
  }), [invoices, grouped]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading kanban board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="rpd-heading-xl rpd-text-gradient mb-2">
            RPD Kanban Board
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Drag and drop invoices to update their payment status
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={loadFromApi} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.total}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Total Invoices
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200/50 dark:border-blue-800/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {stats.pending}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                In Progress
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200/50 dark:border-emerald-800/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {stats.paid}
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Completed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200/50 dark:border-red-800/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {stats.overdue}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Overdue
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                ${stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Total Value
              </p>
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Payment Status Workflow
              </span>
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Pending</span>
              </div>
              <span>→</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span>Review</span>
              </div>
              <span>→</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Approved</span>
              </div>
              <span>→</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Paid</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50">
        <KanbanBoard
          invoices={invoices}
          onInvoiceUpdate={handleInvoiceUpdate}
        />
      </div>
    </div>
  );
}
