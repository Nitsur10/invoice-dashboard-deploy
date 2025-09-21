'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { PerfectJiraKanban, BoardStatus } from '@/components/kanban/perfect-jira-kanban';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { fetchInvoices } from '@/lib/api/invoices';
import { Invoice } from '@/lib/types';

export default function KanbanTestCopyPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetchInvoices({ page: 0, limit: 50 });
      setInvoices((res.data as any[]) as Invoice[]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const mapped = useMemo(() => {
    return invoices.map((inv, idx) => {
      const rawStatus = (inv.status ?? inv.paymentStatus ?? 'pending')
        .toString()
        .toLowerCase() as BoardStatus;
      const id = String((inv as any).invoiceNumber ?? `gen-${idx}`);
      return {
        id,
        invoiceNumber: (inv as any).invoiceNumber ?? id,
        vendor: (inv as any).vendor,
        vendorName: (inv as any).vendorName,
        subject: (inv as any).subject,
        description: (inv as any).description,
        amount: Number((inv as any).amount ?? 0),
        status: rawStatus,
        paymentStatus: rawStatus,
        dueDate: (inv as any).dueDate ?? (inv as any).invoiceDate ?? (inv as any).issueDate ?? null,
        category: (inv as any).category ?? 'standard_pdf',
        oneDriveLink: (inv as any).oneDriveLink ?? null,
        invoiceUrl: (inv as any).invoiceUrl,
      } as any;
    });
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="rpd-heading-xl rpd-text-gradient">Kanban Test (Live Data)</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 text-red-600">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Loading invoices…</p>
          </div>
        </div>
      ) : (
        <div className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <PerfectJiraKanban
            invoices={mapped as any}
            onInvoiceUpdate={() => {/* noop on test copy */}}
          />
        </div>
      )}
    </div>
  );
}



