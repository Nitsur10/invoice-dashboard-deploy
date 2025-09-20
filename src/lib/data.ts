import { Invoice, DashboardStats, PaymentStatus } from './types';
import { formatInTimeZone } from 'date-fns-tz';
import { parse } from 'papaparse';

const SYDNEY_TZ = 'Australia/Sydney';

export function formatDateForSydney(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, SYDNEY_TZ, 'yyyy-MM-dd HH:mm:ss zzz');
}

export function isDueSoon(dueDate?: string): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 7 && diffDays >= 0;
}

export function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  return due < now;
}

export function determinePaymentStatus(invoice: Invoice): PaymentStatus {
  if (invoice.paymentStatus) {
    return invoice.paymentStatus;
  }
  
  // Auto-determine based on due date and processing status
  if (invoice.dueDate && isOverdue(invoice.dueDate)) {
    return 'overdue';
  }
  
  if (invoice.processingStatus === 'Processed') {
    return 'pending';
  }
  
  return 'pending';
}

export function calculateDashboardStats(invoices: Invoice[]): DashboardStats {
  const stats: DashboardStats = {
    totalInvoices: invoices.length,
    totalAmount: 0,
    pendingPayments: 0,
    overduePayments: 0,
    paidAmount: 0,
    averageAmount: 0,
  };

  invoices.forEach(invoice => {
    stats.totalAmount += invoice.amount;
    
    const status = determinePaymentStatus(invoice);
    
    switch (status) {
      case 'paid':
        stats.paidAmount += invoice.amount;
        break;
      case 'overdue':
        stats.overduePayments += 1;
        break;
      case 'pending':
      case 'in_review':
      case 'approved':
        stats.pendingPayments += 1;
        break;
    }
  });

  stats.averageAmount = stats.totalInvoices > 0 ? stats.totalAmount / stats.totalInvoices : 0;
  
  return stats;
}

export function parseCSVData(csvContent: string): Promise<Invoice[]> {
  return new Promise((resolve, reject) => {
    parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const invoices: Invoice[] = results.data.map((row: any, index: number) => ({
            id: row.Email_ID || `invoice-${index}`,
            emailId: row.Email_ID || '',
            subject: row.Subject || '',
            fromEmail: row.From_Email || '',
            fromName: row.From_Name || '',
            receivedDate: row.Received_Date || '',
            category: row.Category || 'standard_pdf',
            invoiceNumber: row.Invoice_Number || '',
            amount: parseFloat(row.Amount) || 0,
            vendor: row.Vendor || '',
            dueDate: row.Due_Date || undefined,
            oneDriveLink: row.OneDrive_Link || undefined,
            xeroLink: row.Xero_Link || undefined,
            processingStatus: row.Processing_Status || 'Pending',
            processedAt: row.Processed_At || '',
            paymentStatus: determinePaymentStatus({
              dueDate: row.Due_Date,
              processingStatus: row.Processing_Status,
            } as Invoice),
          }));
          
          resolve(invoices);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export function groupInvoicesByStatus(invoices: Invoice[]) {
  const groups = {
    pending: [] as Invoice[],
    in_review: [] as Invoice[],
    approved: [] as Invoice[],
    paid: [] as Invoice[],
    overdue: [] as Invoice[],
  };

  invoices.forEach(invoice => {
    const status = determinePaymentStatus(invoice);
    groups[status].push(invoice);
  });

  return groups;
}