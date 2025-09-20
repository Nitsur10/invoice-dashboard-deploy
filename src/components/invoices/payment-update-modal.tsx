'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Invoice, PaymentStatus } from '@/lib/types';
import { formatDateForSydney } from '@/lib/data';
import {
  CheckCircle,
  DollarSign,
  Calendar,
  User,
  FileText,
  AlertTriangle
} from 'lucide-react';

interface PaymentUpdateModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (invoiceId: string, updates: Partial<Invoice>) => void;
}

export function PaymentUpdateModal({
  invoice,
  isOpen,
  onClose,
  onUpdate
}: PaymentUpdateModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmedBy, setConfirmedBy] = useState('');

  if (!invoice) return null;

  const handleSubmit = () => {
    const updates: Partial<Invoice> = {
      paymentStatus,
      processedAt: new Date().toISOString(),
    };

    // Store payment details in a structured way
    const paymentDetails = {
      status: paymentStatus,
      date: paymentDate,
      method: paymentMethod,
      transactionId,
      notes,
      confirmedBy,
      updatedAt: formatDateForSydney(new Date())
    };

    // In production, this would save to database
    console.log('Payment Update:', paymentDetails);
    
    onUpdate(invoice.id, updates);
    
    // Show success message
    alert(`Invoice ${invoice.invoiceNumber} marked as ${paymentStatus}`);
    
    // Reset form
    setPaymentMethod('');
    setTransactionId('');
    setNotes('');
    setConfirmedBy('');
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <span>Update Payment Status</span>
          </DialogTitle>
          <DialogDescription>
            Update payment information for invoice {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Invoice Summary */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Invoice Number</span>
              <span className="font-medium">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Vendor</span>
              <span className="font-medium">{invoice.vendor}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Amount</span>
              <span className="font-bold text-lg text-emerald-600">
                ${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Due Date</span>
                <span className="font-medium">
                  {new Date(invoice.dueDate).toLocaleDateString('en-AU')}
                </span>
              </div>
            )}
          </div>

          {/* Payment Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Payment Status *</Label>
            <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mr-2" />
                    Pending
                  </div>
                </SelectItem>
                <SelectItem value="in_review">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                    In Review
                  </div>
                </SelectItem>
                <SelectItem value="approved">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                    Approved
                  </div>
                </SelectItem>
                <SelectItem value="paid">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
                    Paid
                  </div>
                </SelectItem>
                <SelectItem value="overdue">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                    Overdue
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="pl-8"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="debit_card">Debit Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transaction ID */}
          <div className="space-y-2">
            <Label htmlFor="transactionId">Transaction/Reference ID</Label>
            <Input
              id="transactionId"
              placeholder="e.g., TXN-123456 or Check #789"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
          </div>

          {/* Confirmed By */}
          <div className="space-y-2">
            <Label htmlFor="confirmedBy">Confirmed By (Team Member) *</Label>
            <div className="relative">
              <User className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="confirmedBy"
                placeholder="Enter your name"
                value={confirmedBy}
                onChange={(e) => setConfirmedBy(e.target.value)}
                className="pl-8"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this payment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning for Overdue */}
          {paymentStatus === 'overdue' && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-300">
                Marking as overdue will trigger alerts. Please ensure follow-up actions are taken.
              </div>
            </div>
          )}

          {/* Success Message for Paid */}
          {paymentStatus === 'paid' && (
            <div className="flex items-start space-x-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div className="text-sm text-emerald-700 dark:text-emerald-300">
                Payment confirmation will be recorded in the system.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!confirmedBy || !paymentDate}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}