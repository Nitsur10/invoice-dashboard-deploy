export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  vendorEmail: string;
  amount: number;
  amountDue: number;
  issueDate: Date;
  dueDate: Date;
  status: PaymentStatus;
  description: string;
  category: string;
  paymentTerms: string;
  invoiceUrl?: string;
  receivedDate: Date;
  paidDate?: Date;
}

export type InvoiceCategory = 'standard_pdf' | 'xero_with_pdf' | 'xero_links_only';

export type ProcessingStatus = 'Processed' | 'Needs Manual Download' | 'Pending' | 'Failed';

export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export interface DashboardStats {
  totalInvoices: number;
  totalAmount: number;
  pendingPayments: number;
  overduePayments: number;
  paidAmount: number;
  averageAmount: number;
}

// Extended dashboard stats from API
export interface ExtendedDashboardStats {
  overview: {
    totalInvoices: number
    pendingPayments: number
    overduePayments: number
    paidInvoices: number
    totalAmount: number
    pendingAmount: number
    overdueAmount: number
    paidAmount: number
    trends: {
      invoices: number
      amount: number
    }
  }
  breakdowns: {
    processingStatus: Array<{
      status: string
      count: number
      amount: number
    }>
    categories: Array<{
      category: string
      count: number
      amount: number
    }>
    topVendors: Array<{
      vendor: string
      count: number
      amount: number
    }>
  }
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    amount?: number
    status?: string
  }>
  metadata: {
    generatedAt: string
    dateRange: {
      from: string | null
      to: string | null
    }
    periodDays: number
  }
}

export interface KanbanColumn {
  id: PaymentStatus;
  title: string;
  invoices: Invoice[];
}

export interface FilterOptions {
  status?: PaymentStatus[];
  category?: InvoiceCategory[];
  vendor?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  amountRange?: {
    min: number;
    max: number;
  };
}

export interface SortOption {
  field: keyof Invoice;
  direction: 'asc' | 'desc';
}

export type Theme = 'light' | 'dark' | 'system';