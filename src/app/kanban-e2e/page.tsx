'use client';

import { useState } from 'react';
import { PerfectJiraKanban, BoardStatus } from '@/components/kanban/perfect-jira-kanban';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const mockInvoices = [
  { id: 'mock-001', invoiceNumber: 'INV-001-PENDING', vendor: 'ABC Construction Ltd', subject: 'Office renovation materials', amount: 1500.0, status: 'pending' as BoardStatus, paymentStatus: 'pending' as BoardStatus, dueDate: '2025-10-15', category: 'standard_pdf', oneDriveLink: null },
  { id: 'mock-002', invoiceNumber: 'INV-002-PENDING', vendor: 'XYZ Electrical Services', subject: 'Electrical installation work', amount: 2250.75, status: 'pending' as BoardStatus, paymentStatus: 'pending' as BoardStatus, dueDate: '2025-10-20', category: 'xero_with_pdf', oneDriveLink: null },
  { id: 'mock-003', invoiceNumber: 'INV-003-REVIEW', vendor: 'Steel & Co Materials', subject: 'Structural steel supply', amount: 3200.0, status: 'in_review' as BoardStatus, paymentStatus: 'in_review' as BoardStatus, dueDate: '2025-11-01', category: 'xero_with_pdf', oneDriveLink: null },
  { id: 'mock-004', invoiceNumber: 'INV-004-APPROVED', vendor: 'Tech Solutions Australia', subject: 'IT equipment purchase', amount: 4500.0, status: 'approved' as BoardStatus, paymentStatus: 'approved' as BoardStatus, dueDate: '2025-11-10', category: 'xero_links_only', oneDriveLink: null },
  { id: 'mock-005', invoiceNumber: 'INV-005-PAID', vendor: 'Legal Services Group', subject: 'Contract review services', amount: 2800.0, status: 'paid' as BoardStatus, paymentStatus: 'paid' as BoardStatus, dueDate: '2025-09-15', category: 'xero_with_pdf', oneDriveLink: null },
  { id: 'mock-006', invoiceNumber: 'INV-006-OVERDUE', vendor: 'Heavy Machinery Rentals', subject: 'Equipment rental fees', amount: 3750.0, status: 'overdue' as BoardStatus, paymentStatus: 'overdue' as BoardStatus, dueDate: '2025-09-01', category: 'xero_with_pdf', oneDriveLink: null },
];

export default function KanbanE2EPage() {
  const [invoices, setInvoices] = useState(mockInvoices);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="rpd-heading-xl">E2E Kanban</h1>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50">
        <PerfectJiraKanban
          invoices={invoices as any}
          onInvoiceUpdate={(id, status) =>
            setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status, paymentStatus: status } : inv))
          }
        />
      </div>
    </div>
  );
}


