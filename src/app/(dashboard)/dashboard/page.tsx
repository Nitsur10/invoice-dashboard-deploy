'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Invoice {
  id: string;
  emailId: string;
  subject: string;
  invoiceNumber: string;
  amount: number;
  vendor: string;
  sourceTab: 'tab1' | 'tab2' | 'tab3';
  paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE';
  createdAt: string;
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'OVERDUE'>('ALL');

  useEffect(() => {
    // Load processed invoice data
    loadInvoices();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadInvoices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadInvoices = async () => {
    try {
      // For now, load from processed data files
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (invoiceId: string, status: string) => {
    try {
      await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: status }),
      });
      
      // Update local state
      setInvoices(invoices.map(inv => 
        inv.id === invoiceId ? { ...inv, paymentStatus: status as any } : inv
      ));
    } catch (error) {
      console.error('Failed to update payment status:', error);
    }
  };

  const filteredInvoices = filter === 'ALL' 
    ? invoices 
    : invoices.filter(inv => inv.paymentStatus === filter);

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingCount = invoices.filter(inv => inv.paymentStatus === 'PENDING').length;
  const paidCount = invoices.filter(inv => inv.paymentStatus === 'PAID').length;

  const getSourceTabName = (tab: string) => {
    const names = { tab1: 'Workflow 1', tab2: 'Workflow 2', tab3: 'Workflow 3' };
    return names[tab as keyof typeof names] || tab;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🏢 Rudra Projects - Invoice Dashboard
        </h1>
        <p className="text-gray-600">
          Consolidated view of all invoices from SharePoint workflows
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredInvoices.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['ALL', 'PENDING', 'PAID', 'OVERDUE'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status as any)}
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Invoice Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Invoice #</th>
                  <th className="text-left p-4">Vendor</th>
                  <th className="text-left p-4">Amount</th>
                  <th className="text-left p-4">Source</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{invoice.invoiceNumber}</td>
                    <td className="p-4">{invoice.vendor}</td>
                    <td className="p-4">${invoice.amount.toLocaleString()}</td>
                    <td className="p-4">
                      <Badge variant="secondary">
                        {getSourceTabName(invoice.sourceTab)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusBadge(invoice.paymentStatus)}>
                        {invoice.paymentStatus}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {invoice.paymentStatus === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updatePaymentStatus(invoice.id, 'PAID')}
                          >
                            Mark Paid
                          </Button>
                        )}
                        {invoice.paymentStatus === 'PAID' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updatePaymentStatus(invoice.id, 'PENDING')}
                          >
                            Mark Pending
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredInvoices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No invoices found for the selected filter.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-sync Status */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-blue-800">
            Auto-sync active - Checking SharePoint every 15 minutes
          </span>
        </div>
      </div>
    </div>
  );
}