import { z } from 'zod';
import { pageSchema, limitSchema, sortOrderSchema, sortBySchema } from './pagination';

// Invoice query schema with all supported filters
export const invoicesQuerySchema = z.object({
  // Pagination
  page: pageSchema,
  limit: limitSchema,
  
  // Sorting
  sortBy: sortBySchema(['created_at', 'invoice_number', 'supplier_name', 'total', 'due_date']).optional(),
  sortOrder: sortOrderSchema.optional(),
  
  // Filters
  invoice_number: z.string().optional(),
  supplier_name: z.string().optional(),
  dateFrom: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  dateTo: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  minAmount: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0)).optional(),
  maxAmount: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0)).optional(),
  status: z.enum(['pending', 'processing', 'paid', 'overdue', 'cancelled', 'disputed']).optional(),
  
  // Search
  search: z.string().optional(),
});

// Invoice creation schema - minimum required fields
export const invoiceCreateSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  supplier_name: z.string().min(1, 'Supplier name is required'), 
  total: z.number().min(0, 'Total must be non-negative'),
  
  // Optional fields
  email_id: z.string().optional(),
  subject: z.string().optional(),
  from_email: z.string().email().optional(),
  from_name: z.string().optional(),
  received_date: z.string().datetime().optional(),
  category: z.string().optional(),
  due_date: z.string().datetime().optional(),
  onedrive_link: z.string().url().optional(),
  xero_link: z.string().url().optional(),
  processing_status: z.string().default('pending'),
  
  // Payment tracking
  payment_status: z.enum(['pending', 'processing', 'paid', 'overdue', 'cancelled', 'disputed']).default('pending'),
  payment_date: z.string().datetime().optional(),
  payment_method: z.string().optional(),
  transaction_id: z.string().optional(),
  payment_notes: z.string().optional(),
  confirmed_by: z.string().optional(),
  
  // Source tracking
  source_tab: z.string().optional(),
  source_workflow_id: z.string().optional(),
  import_batch_id: z.string().optional(),
});

// Invoice update schema - all fields optional (partial)
export const invoiceUpdateSchema = invoiceCreateSchema.partial();

export type InvoicesQuery = z.infer<typeof invoicesQuerySchema>;
export type InvoiceCreate = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdate = z.infer<typeof invoiceUpdateSchema>;