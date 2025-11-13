/**
 * Function Handlers for Claude AI
 * These functions are called by Claude when it needs to interact with invoice data
 *
 * SECURITY: All functions use a user-scoped Supabase client to ensure RLS is enforced
 */

import { supabaseAdmin } from '@/lib/server/supabase-admin';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface InvoiceSearchParams {
  status?: string[];
  vendor?: string[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  limit?: number;
}

export interface InvoiceDetails {
  id: string;
  invoiceNumber: string;
  vendor: string;
  amount: number;
  status: string;
  issueDate: string;
  dueDate?: string;
  description?: string;
  category?: string;
  [key: string]: any;
}

/**
 * Search invoices based on filters
 * SECURITY: Uses user-scoped client to enforce RLS
 */
export async function searchInvoices(
  params: InvoiceSearchParams,
  supabase: SupabaseClient
): Promise<{
  invoices: InvoiceDetails[];
  total: number;
  summary: { totalAmount: number; count: number };
}> {
  try {
    const limit = params.limit || 20;

    // Build query - Uses user-scoped client (RLS enforced)
    let query = supabase
      .from('Invoice')
      .select('*', { count: 'exact' });

    // Apply filters
    if (params.status && params.status.length > 0) {
      query = query.in('status', params.status);
    }

    if (params.vendor && params.vendor.length > 0) {
      query = query.in('supplier_name', params.vendor);
    }
    
    if (params.dateFrom) {
      query = query.gte('invoice_date', params.dateFrom);
    }
    
    if (params.dateTo) {
      query = query.lte('invoice_date', params.dateTo);
    }
    
    if (params.amountMin !== undefined) {
      query = query.gte('total', params.amountMin);
    }
    
    if (params.amountMax !== undefined) {
      query = query.lte('total', params.amountMax);
    }
    
    if (params.search) {
      query = query.or(
        `invoice_number.ilike.%${params.search}%,` +
        `supplier_name.ilike.%${params.search}%,` +
        `description.ilike.%${params.search}%`
      );
    }
    
    // Execute query
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Search invoices error:', error);
      throw new Error('Failed to search invoices');
    }
    
    // Map to standard format
    const invoices: InvoiceDetails[] = (data || []).map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number || 'N/A',
      vendor: inv.supplier_name || 'Unknown',
      amount: parseFloat(inv.total || 0),
      status: inv.status || 'pending',
      issueDate: inv.invoice_date || inv.created_at,
      dueDate: inv.due_date,
      description: inv.description || inv.line_1_desc,
      category: inv.category,
      fileUrl: inv.file_url,
      source: inv.source,
    }));
    
    // Calculate summary
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    
    return {
      invoices,
      total: count || 0,
      summary: {
        totalAmount,
        count: invoices.length,
      },
    };
  } catch (error) {
    console.error('searchInvoices error:', error);
    throw error;
  }
}

/**
 * Get detailed information about a specific invoice
 * SECURITY: Uses user-scoped client to enforce RLS
 */
export async function getInvoiceDetails(
  invoiceId: string,
  supabase: SupabaseClient
): Promise<InvoiceDetails | null> {
  try {
    const { data, error} = await supabase
      .from('Invoice')
      .select('*')
      .eq('id', invoiceId)
      .single();
    
    if (error) {
      console.error('Get invoice details error:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    return {
      id: data.id,
      invoiceNumber: data.invoice_number || 'N/A',
      vendor: data.supplier_name || 'Unknown',
      vendorABN: data.supplier_abn,
      amount: parseFloat(data.total || 0),
      subtotal: parseFloat(data.subtotal || 0),
      gst: parseFloat(data.gst_total || 0),
      status: data.status || 'pending',
      issueDate: data.invoice_date || data.created_at,
      dueDate: data.due_date,
      description: data.description || data.line_1_desc,
      category: data.category,
      fileUrl: data.file_url,
      source: data.source,
      notes: data.notes,
      paymentTerms: data.payment_terms,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('getInvoiceDetails error:', error);
    return null;
  }
}

/**
 * Get summary statistics for invoices
 * SECURITY: Uses user-scoped client to enforce RLS
 */
export async function getSummaryStats(
  params: {
    status?: string[];
    dateFrom?: string;
    dateTo?: string;
  },
  supabase: SupabaseClient
): Promise<{
  totalInvoices: number;
  totalAmount: number;
  byStatus: Record<string, { count: number; amount: number }>;
  averageAmount: number;
}> {
  try {
    // Build query - Uses user-scoped client (RLS enforced)
    let query = supabase
      .from('Invoice')
      .select('status, total');

    // Apply filters
    if (params.status && params.status.length > 0) {
      query = query.in('status', params.status);
    }
    
    if (params.dateFrom) {
      query = query.gte('invoice_date', params.dateFrom);
    }
    
    if (params.dateTo) {
      query = query.lte('invoice_date', params.dateTo);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Get summary stats error:', error);
      throw new Error('Failed to get summary statistics');
    }
    
    // Calculate statistics
    const invoices = data || [];
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
    const averageAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;
    
    // Group by status
    const byStatus: Record<string, { count: number; amount: number }> = {};

    for (const inv of invoices) {
      const status = inv.status || 'pending';
      if (!byStatus[status]) {
        byStatus[status] = { count: 0, amount: 0 };
      }
      byStatus[status].count++;
      byStatus[status].amount += parseFloat(inv.total || 0);
    }
    
    return {
      totalInvoices,
      totalAmount,
      byStatus,
      averageAmount,
    };
  } catch (error) {
    console.error('getSummaryStats error:', error);
    throw error;
  }
}

/**
 * Get top vendors by invoice count or amount
 * SECURITY: Uses user-scoped client to enforce RLS
 */
export async function getTopVendors(
  params: {
    limit?: number;
    sortBy?: 'amount' | 'count';
  },
  supabase: SupabaseClient
): Promise<Array<{ vendor: string; count: number; amount: number }>> {
  try {
    const limit = params.limit || 10;
    const sortBy = params.sortBy || 'amount';

    const { data, error } = await supabase
      .from('Invoice')
      .select('supplier_name, total');
    
    if (error) {
      console.error('Get top vendors error:', error);
      throw new Error('Failed to get top vendors');
    }
    
    // Group by vendor
    const vendorMap: Record<string, { count: number; amount: number }> = {};
    
    for (const inv of data || []) {
      const vendor = inv.supplier_name || 'Unknown';
      if (!vendorMap[vendor]) {
        vendorMap[vendor] = { count: 0, amount: 0 };
      }
      vendorMap[vendor].count++;
      vendorMap[vendor].amount += parseFloat(inv.total || 0);
    }
    
    // Convert to array and sort
    const vendors = Object.entries(vendorMap)
      .map(([vendor, stats]) => ({
        vendor,
        count: stats.count,
        amount: stats.amount,
      }))
      .sort((a, b) => {
        if (sortBy === 'amount') {
          return b.amount - a.amount;
        }
        return b.count - a.count;
      })
      .slice(0, limit);
    
    return vendors;
  } catch (error) {
    console.error('getTopVendors error:', error);
    throw error;
  }
}

/**
 * Update invoice status (requires confirmation)
 * This returns the proposed change without executing it
 * SECURITY: Uses user-scoped client to enforce RLS
 */
export async function prepareStatusUpdate(
  params: {
    invoiceId: string;
    newStatus: string;
    reason?: string;
  },
  supabase: SupabaseClient
): Promise<{
  invoice: InvoiceDetails;
  oldStatus: string;
  newStatus: string;
  valid: boolean;
  message: string;
}> {
  try {
    // Get current invoice
    const invoice = await getInvoiceDetails(params.invoiceId, supabase);
    
    if (!invoice) {
      return {
        invoice: null as any,
        oldStatus: '',
        newStatus: params.newStatus,
        valid: false,
        message: 'Invoice not found',
      };
    }
    
    const oldStatus = invoice.status;
    
    // Validate status transition
    const validStatuses = ['pending', 'in_review', 'approved', 'paid', 'overdue'];
    if (!validStatuses.includes(params.newStatus)) {
      return {
        invoice,
        oldStatus,
        newStatus: params.newStatus,
        valid: false,
        message: 'Invalid status value',
      };
    }
    
    return {
      invoice,
      oldStatus,
      newStatus: params.newStatus,
      valid: true,
      message: 'Status update ready for confirmation',
    };
  } catch (error) {
    console.error('prepareStatusUpdate error:', error);
    throw error;
  }
}

/**
 * Execute status update (after user confirmation)
 * SECURITY: Uses user-scoped client to enforce RLS - only allows updates to authorized invoices
 */
export async function executeStatusUpdate(
  params: {
    invoiceId: string;
    newStatus: string;
    userId: string;
    reason?: string;
  },
  supabase: SupabaseClient
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase
      .from('Invoice')
      .update({
        status: params.newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.invoiceId)
      .select()
      .single();
    
    if (error) {
      console.error('Execute status update error:', error);
      return {
        success: false,
        message: 'Failed to update invoice status',
      };
    }
    
    return {
      success: true,
      message: `Successfully updated invoice status to ${params.newStatus}`,
    };
  } catch (error) {
    console.error('executeStatusUpdate error:', error);
    return {
      success: false,
      message: 'An error occurred while updating the invoice',
    };
  }
}

/**
 * Add a note to an invoice (requires confirmation)
 * SECURITY: Uses user-scoped client to enforce RLS
 */
export async function prepareNoteAddition(
  params: {
    invoiceId: string;
    note: string;
  },
  supabase: SupabaseClient
): Promise<{
  invoice: InvoiceDetails;
  note: string;
  valid: boolean;
  message: string;
}> {
  try {
    const invoice = await getInvoiceDetails(params.invoiceId, supabase);
    
    if (!invoice) {
      return {
        invoice: null as any,
        note: params.note,
        valid: false,
        message: 'Invoice not found',
      };
    }
    
    if (!params.note || params.note.trim().length === 0) {
      return {
        invoice,
        note: params.note,
        valid: false,
        message: 'Note cannot be empty',
      };
    }
    
    return {
      invoice,
      note: params.note,
      valid: true,
      message: 'Note ready to be added',
    };
  } catch (error) {
    console.error('prepareNoteAddition error:', error);
    throw error;
  }
}

/**
 * Execute note addition (after user confirmation)
 * SECURITY: Uses user-scoped client to enforce RLS - only allows updates to authorized invoices
 */
export async function executeNoteAddition(
  params: {
    invoiceId: string;
    note: string;
    userId: string;
  },
  supabase: SupabaseClient
): Promise<{ success: boolean; message: string }> {
  try {
    // Get current invoice to append note
    const invoice = await getInvoiceDetails(params.invoiceId, supabase);

    if (!invoice) {
      return {
        success: false,
        message: 'Invoice not found',
      };
    }

    // Append new note to existing notes
    const currentNotes = invoice.notes || '';
    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] ${params.note}`;
    const updatedNotes = currentNotes
      ? `${currentNotes}\n${newNote}`
      : newNote;

    const { error } = await supabase
      .from('Invoice')
      .update({
        notes: updatedNotes,
        updated_at: timestamp,
      })
      .eq('id', params.invoiceId);
    
    if (error) {
      console.error('Execute note addition error:', error);
      return {
        success: false,
        message: 'Failed to add note to invoice',
      };
    }
    
    return {
      success: true,
      message: 'Successfully added note to invoice',
    };
  } catch (error) {
    console.error('executeNoteAddition error:', error);
    return {
      success: false,
      message: 'An error occurred while adding the note',
    };
  }
}

/**
 * Route function calls from Claude to the appropriate handler
 * SECURITY: All handlers receive user-scoped Supabase client to enforce RLS
 */
export async function executeFunctionCall(
  functionName: string,
  params: any,
  supabase: SupabaseClient
): Promise<any> {
  switch (functionName) {
    case 'searchInvoices':
      return searchInvoices(params, supabase);

    case 'getInvoiceDetails':
      return getInvoiceDetails(params.invoiceId, supabase);

    case 'getSummaryStats':
      return getSummaryStats(params, supabase);

    case 'getTopVendors':
      return getTopVendors(params, supabase);

    case 'updateInvoiceStatus':
      return prepareStatusUpdate(params, supabase);

    case 'addInvoiceNote':
      return prepareNoteAddition(params, supabase);

    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}
