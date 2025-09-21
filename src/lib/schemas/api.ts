import { z } from 'zod';

// Invoice status update schema
export const invoiceStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'in_review', 'approved', 'paid', 'overdue'], {
    required_error: 'Status is required',
    invalid_type_error: 'Invalid status value'
  }),
});

// Invoice query parameters schema
export const invoiceQuerySchema = z.object({
  page: z.string().optional().transform((val) => {
    const parsed = parseInt(val || '0', 10);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }),
  limit: z.string().optional().transform((val) => {
    const parsed = parseInt(val || '20', 10);
    return isNaN(parsed) ? 20 : Math.max(1, Math.min(100, parsed));
  }),
  search: z.string().optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  vendor: z.union([z.string(), z.array(z.string())]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  amountMin: z.string().optional().transform((val) => {
    const parsed = parseFloat(val || '0');
    return isNaN(parsed) ? undefined : parsed;
  }),
  amountMax: z.string().optional().transform((val) => {
    const parsed = parseFloat(val || '0');
    return isNaN(parsed) ? undefined : parsed;
  }),
  savedViewId: z.string().optional(),
});

// User creation schema
export const userCreationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

// Invoice ID parameter schema
export const invoiceIdSchema = z.object({
  id: z.string().min(1, 'Invoice ID is required'),
});

// Export types
export type InvoiceStatusUpdate = z.infer<typeof invoiceStatusUpdateSchema>;
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;
export type UserCreation = z.infer<typeof userCreationSchema>;
export type InvoiceId = z.infer<typeof invoiceIdSchema>;
