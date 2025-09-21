'use client';

import { useState } from 'react';
import { PerfectJiraKanban, BoardStatus } from '@/components/kanban/perfect-jira-kanban';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

// Mock invoice data for testing
const mockInvoices = [
  {
    id: 'mock-001',
    invoiceNumber: 'INV-001-PENDING',
    vendor: 'ABC Construction Ltd',
    subject: 'Office renovation materials',
    amount: 1500.00,
    status: 'pending' as BoardStatus,
    paymentStatus: 'pending' as BoardStatus,
    dueDate: '2025-10-15',
    category: 'standard_pdf',
    oneDriveLink: null,
  },
  {
    id: 'mock-002',
    invoiceNumber: 'INV-002-PENDING',
    vendor: 'XYZ Electrical Services',
    subject: 'Electrical installation work',
    amount: 2250.75,
    status: 'pending' as BoardStatus,
    paymentStatus: 'pending' as BoardStatus,
    dueDate: '2025-10-20',
    category: 'xero_with_pdf',
    oneDriveLink: null,
  },
  {
    id: 'mock-003',
    invoiceNumber: 'INV-003-REVIEW',
    vendor: 'Steel & Co Materials',
    subject: 'Structural steel supply',
    amount: 3200.00,
    status: 'in_review' as BoardStatus,
    paymentStatus: 'in_review' as BoardStatus,
    dueDate: '2025-11-01',
    category: 'xero_with_pdf',
    oneDriveLink: null,
  },
  {
    id: 'mock-004',
    invoiceNumber: 'INV-004-APPROVED',
    vendor: 'Tech Solutions Australia',
    subject: 'IT equipment purchase',
    amount: 4500.00,
    status: 'approved' as BoardStatus,
    paymentStatus: 'approved' as BoardStatus,
    dueDate: '2025-11-10',
    category: 'xero_links_only',
    oneDriveLink: null,
  },
  {
    id: 'mock-005',
    invoiceNumber: 'INV-005-PAID',
    vendor: 'Legal Services Group',
    subject: 'Contract review services',
    amount: 2800.00,
    status: 'paid' as BoardStatus,
    paymentStatus: 'paid' as BoardStatus,
    dueDate: '2025-09-15',
    category: 'xero_with_pdf',
    oneDriveLink: null,
  },
  {
    id: 'mock-006',
    invoiceNumber: 'INV-006-OVERDUE',
    vendor: 'Heavy Machinery Rentals',
    subject: 'Equipment rental fees',
    amount: 3750.00,
    status: 'overdue' as BoardStatus,
    paymentStatus: 'overdue' as BoardStatus,
    dueDate: '2025-09-01',
    category: 'xero_with_pdf',
    oneDriveLink: null,
  },
];

export default function KanbanTestPage() {
  const [invoices, setInvoices] = useState(mockInvoices);

  const handleInvoiceUpdate = (invoiceId: string, newStatus: BoardStatus) => {
    console.log('🎯 Status Update:', { invoiceId, newStatus });

    // Find the invoice being updated
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      console.log(`📋 Moving "${invoice.invoiceNumber}" from "${invoice.status}" to "${newStatus}"`);
    }

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

    // Show success message
    setTimeout(() => {
      console.log('✅ Status update completed successfully!');
    }, 100);
  };

  const handleInvoiceUpdateError = (error: string, invoiceId: string, attemptedStatus: BoardStatus) => {
    console.error('❌ Failed to update invoice:', { invoiceId, attemptedStatus, error });
    // Don't show alert in test mode - just log
    console.log('🔧 This would normally show an error, but we\'re in test mode');
  };

  const stats = {
    total: invoices.length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    pending: invoices.filter(i => i.status === 'pending').length,
    inReview: invoices.filter(i => i.status === 'in_review').length,
    approved: invoices.filter(i => i.status === 'approved').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="rpd-heading-xl rpd-text-gradient mb-2">
            🧪 Kanban Test Page
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Testing kanban functionality with mock data
          </p>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.total}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Total
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
                Pending
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200/50 dark:border-amber-800/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {stats.inReview}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Review
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {stats.approved}
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Approved
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
                Paid
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
      </div>

      {/* Kanban Board */}
      <div className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50">
        <PerfectJiraKanban
          invoices={invoices}
          onInvoiceUpdate={handleInvoiceUpdate}
        />
      </div>

      {/* Debug Info */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
        <h3 className="font-semibold mb-2">🔍 Debug Info</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This page uses mock data to test the kanban functionality.
          Drag invoices between columns to see the status updates in the browser console.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          <strong>Total invoices:</strong> {stats.total} |
          <strong> Total value:</strong> ${stats.totalAmount.toLocaleString()}
        </p>
      </div>
    </div>
  );
}