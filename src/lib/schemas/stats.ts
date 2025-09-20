import { z } from 'zod';

export const statsQuerySchema = z.object({
  dateFrom: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  dateTo: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  triggerError: z.string().transform(val => val === 'true').optional(),
});

export type StatsQuery = z.infer<typeof statsQuerySchema>;

export interface StatsOverview {
  totalInvoices: number;
  pendingPayments: number;
  overduePayments: number;
  paidInvoices: number;
  totalAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  paidAmount: number;
  trends: {
    invoices: number;
    amount: number;
  };
}

export interface StatsBreakdowns {
  processingStatus: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  categories: Array<{
    category: string;
    count: number;
    amount: number;
  }>;
  topVendors: Array<{
    vendor: string;
    count: number;
    amount: number;
  }>;
}

export interface StatsResponse {
  overview: StatsOverview;
  breakdowns: StatsBreakdowns;
  recentActivity: any[];
  metadata: {
    generatedAt: string;
    dateRange: {
      from: string | null;
      to: string | null;
    };
    periodDays: number;
  };
}