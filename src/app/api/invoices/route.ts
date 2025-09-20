import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { isSupabaseConfigured } from '@/lib/server/env';
import type { InvoiceFiltersState } from '@/types/invoice-filters';
import { mockInvoiceData } from '@/lib/sample-data';

// Get invoices with server-side filtering, sorting, and pagination (Supabase)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const nowIso = now.toISOString();
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = page * limit;
    
    // Sorting parameters (map UI fields to DB columns)
    const sortByRaw = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const sortMap: Record<string, string> = {
      createdAt: 'created_at',
      receivedDate: 'created_at',
      dueDate: 'due_date',
      issueDate: 'invoice_date',
      vendorName: 'supplier_name',
      invoiceNumber: 'invoice_number',
      amount: 'total',
      status: 'due_date',
      category: 'category',
    };
    const sortBy = sortMap[sortByRaw] || 'created_at';
    
    const searchParam = searchParams.get('search') || '';
    const statusFilters = searchParams.getAll('status');
    const categoryFilters = searchParams.getAll('category');
    const vendorFilters = searchParams.getAll('vendor');
    const savedViewId = searchParams.get('savedViewId');
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');
    const amountMinParam = parseNullableNumber(searchParams.get('amountMin'));
    const amountMaxParam = parseNullableNumber(searchParams.get('amountMax'));

    // If Supabase is not configured, return safe empty payload
    const useSupabase = isSupabaseConfigured();

    // Resolve table with fallback
    const primaryTable = process.env.SUPABASE_INVOICES_TABLE || 'invoices';
    const fallbackTable = primaryTable === 'invoices' ? 'Invoice' : 'invoices';

    let resolvedFilters: NormalisedFilters = {
      search: searchParam,
      statuses: normaliseStatusArray(statusFilters),
      categories: normaliseStringArray(categoryFilters),
      vendors: normaliseStringArray(vendorFilters),
      dateFrom: dateFromParam || undefined,
      dateTo: dateToParam || undefined,
      amountMin: amountMinParam ?? undefined,
      amountMax: amountMaxParam ?? undefined,
    };

    if (savedViewId) {
      const savedView = await loadSavedView(savedViewId);
      if (savedView) {
        resolvedFilters = mergeSavedViewFilters(resolvedFilters, savedView);
      }
    }

    if (!useSupabase) {
      // For local fixtures, honour explicit date filters but do not clamp to May 2025.
      const response = buildLocalInvoiceResponse(resolvedFilters, page, limit, sortBy, sortOrder, now);
      return NextResponse.json(response);
    }

    // Always clamp to May 1, 2025 to honour reporting baseline when using Supabase data
    const minClampDate = '2025-05-01T00:00:00.000Z';
    if (!resolvedFilters.dateFrom) {
      resolvedFilters.dateFrom = minClampDate;
    } else if (new Date(resolvedFilters.dateFrom) < new Date(minClampDate)) {
      resolvedFilters.dateFrom = minClampDate;
    }

    // New resilient fetching strategy: select('*') and filter/sort/paginate in-memory
    const pick = (record: any, keys: string[], fallback?: any) => {
      for (const k of keys) {
        if (record[k] !== undefined && record[k] !== null) return record[k]
      }
      return fallback
    }

    const fetchAll = async (table: string) => {
      return supabaseAdmin
        .from(table)
        .select('*')
        .limit(5000)
    }

    let primaryRes = await fetchAll(primaryTable)
    let supaError = primaryRes.error
    let supaData: any[] = (primaryRes.data as any[]) || []
    if (supaError) {
      const fbRes = await fetchAll(fallbackTable)
      supaError = fbRes.error
      supaData = (fbRes.data as any[]) || []
    }

    if (supaError) {
      console.warn('Supabase error in /api/invoices, falling back to mock data:', supaError)
      const response = buildLocalInvoiceResponse(resolvedFilters, page, limit, sortBy, sortOrder, now)
      return NextResponse.json(response)
    }

    // Map to internal shape
    const mapped = supaData.map((row: any) => {
      const amount = Number(pick(row, ['total', 'amount', 'total_amount', 'grand_total'], 0)) || 0
      const amountDueRaw = pick(row, ['amount_due', 'due_amount', 'outstanding', 'balance_due'], null)
      const amountDue = amountDueRaw == null ? amount : Number(amountDueRaw)

      const dueDate = pick(row, ['due_date', 'dueDate', 'payment_due', 'payment_due_date'], null)
      const status = deriveInvoiceStatus(amountDue, dueDate, now)

      const receivedDate = pick(row, ['created_at', 'createdAt', 'received_date', 'receivedDate'], null)
      const issueDate = pick(row, ['invoice_date', 'invoiceDate'], null)

      return {
        id: row.id ?? pick(row, ['invoice_id', 'uuid'], ''),
        invoiceNumber: pick(row, ['invoice_number', 'invoiceNumber', 'number'], ''),
        vendorName: pick(row, ['supplier_name', 'vendor', 'vendor_name', 'supplier'], ''),
        vendorEmail: pick(row, ['supplier_email', 'vendor_email', 'email'], '') || '',
        amount,
        amountDue,
        issueDate,
        dueDate,
        status,
        description: pick(row, ['description', 'memo', 'details'], '') || '',
        category: pick(row, ['category', 'category_name', 'type'], 'Uncategorized'),
        paymentTerms: pick(row, ['payment_terms', 'terms'], 'Net 30'),
        invoiceUrl: pick(row, ['file_url', 'source_url', 'url', 'link'], '') || '',
        receivedDate,
        paidDate: pick(row, ['paid_at', 'paidDate'], null),
      }
    })

    // Apply filters and sort/paginate in-memory
    const filtered = filterLocalInvoices(mapped as any, resolvedFilters, now)
    const sorted = sortLocalInvoices(filtered as any, sortBy, sortOrder)
    const start = page * limit
    const end = start + limit
    const paginated = sorted.slice(start, end)

    const total = filtered.length
    const pageCount = Math.ceil(total / limit) || 0

    return NextResponse.json({
      data: paginated,
      pagination: {
        total,
        pageCount,
        pageSize: limit,
        pageIndex: page,
      },
    })
  } catch (error) {
    console.error('Failed to load invoices:', error);
    return NextResponse.json(
      { code: 'SERVER_ERROR', message: 'Failed to load invoices' },
      { status: 500 }
    );
  }
}

type NormalisedFilters = {
  search: string
  statuses: string[]
  categories: string[]
  vendors: string[]
  dateFrom?: string
  dateTo?: string
  amountMin?: number
  amountMax?: number
}

function parseNullableNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normaliseStringArray(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function normaliseStatusArray(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)))
}

async function loadSavedView(id: string): Promise<InvoiceFiltersState | undefined> {
  try {
    const { data, error } = await supabaseAdmin
      .from('invoice_saved_views')
      .select('filters')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.warn('Failed to load saved view', error)
      return undefined
    }

    if (!data?.filters) {
      return undefined
    }

    return data.filters as InvoiceFiltersState
  } catch (error) {
    console.warn('Unexpected error retrieving saved view', error)
    return undefined
  }
}

function mergeSavedViewFilters(current: NormalisedFilters, savedView: InvoiceFiltersState): NormalisedFilters {
  return {
    search: current.search || savedView.search || '',
    statuses: current.statuses.length ? current.statuses : normaliseStatusArray(savedView.statuses ?? []),
    categories: current.categories.length ? current.categories : normaliseStringArray(savedView.categories ?? []),
    vendors: current.vendors.length ? current.vendors : normaliseStringArray(savedView.vendors ?? []),
    dateFrom: current.dateFrom ?? savedView.dateRange?.start ?? undefined,
    dateTo: current.dateTo ?? savedView.dateRange?.end ?? undefined,
    amountMin: current.amountMin ?? savedView.amountRange?.min ?? undefined,
    amountMax: current.amountMax ?? savedView.amountRange?.max ?? undefined,
  }
}

function applyFilters(query: any, filters: NormalisedFilters, nowIso: string) {
  let next = query

  if (filters.search) {
    const escaped = filters.search.replace(/[\\%_]/g, (match) => `\\${match}`)
    next = next.or(
      `invoice_number.ilike.%${escaped}%,supplier_name.ilike.%${escaped}%,supplier_email.ilike.%${escaped}%,description.ilike.%${escaped}%`
    )
  }

  if (filters.dateFrom) {
    next = next.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    next = next.lte('created_at', filters.dateTo)
  }

  if (filters.categories.length) {
    next = next.in('category', filters.categories)
  }

  if (filters.vendors.length) {
    next = next.in('supplier_name', filters.vendors)
  }

  if (typeof filters.amountMin === 'number') {
    next = next.gte('total', filters.amountMin)
  }

  if (typeof filters.amountMax === 'number') {
    next = next.lte('total', filters.amountMax)
  }

  if (filters.statuses.length > 0 && filters.statuses.length < 3) {
    const conditions = buildStatusConditions(filters.statuses, nowIso)
    if (conditions.length) {
      next = next.or(conditions.join(','))
    }
  }

  return next
}

function buildStatusConditions(statuses: string[], nowIso: string): string[] {
  const result: string[] = []
  const hasPending = statuses.includes('pending')
  const hasPaid = statuses.includes('paid')
  const hasOverdue = statuses.includes('overdue')

  if (hasPaid) {
    result.push('amount_due.eq.0')
  }

  if (hasOverdue) {
    result.push(`and(amount_due.gt.0,due_date.not.is.null,due_date.lt.${nowIso})`)
  }

  if (hasPending) {
    result.push(`and(or(amount_due.is.null,amount_due.gt.0),or(due_date.is.null,due_date.gte.${nowIso}))`)
  }

  return result
}

function deriveInvoiceStatus(amountDue: unknown, dueDate: unknown, now: Date): 'pending' | 'paid' | 'overdue' {
  const numericalAmount = typeof amountDue === 'number' ? amountDue : amountDue == null ? null : Number(amountDue)

  if (numericalAmount === 0) {
    return 'paid'
  }

  const dueDateValue = dueDate ? new Date(dueDate) : null

  if (numericalAmount != null && numericalAmount > 0 && dueDateValue && dueDateValue.getTime() < now.getTime()) {
    return 'overdue'
  }

  return 'pending'
}

function buildLocalInvoiceResponse(
  filters: NormalisedFilters,
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  now: Date,
) {
  const filtered = filterLocalInvoices(mockInvoiceData, filters, now)
  const sorted = sortLocalInvoices(filtered, sortBy, sortOrder)
  const start = page * limit
  const end = start + limit
  const paginated = sorted.slice(start, end)

  const data = paginated.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    vendorName: invoice.vendorName,
    vendorEmail: invoice.vendorEmail ?? '',
    amount: invoice.amount ?? 0,
    amountDue: invoice.amountDue ?? invoice.amount ?? 0,
    issueDate: invoice.issueDate ?? null,
    dueDate: invoice.dueDate ?? null,
    status: deriveInvoiceStatus(invoice.amountDue ?? invoice.amount ?? 0, invoice.dueDate, now),
    description: invoice.description ?? '',
    category: invoice.category ?? 'Uncategorized',
    paymentTerms: invoice.paymentTerms ?? 'Net 30',
    invoiceUrl: invoice.invoiceUrl ?? '',
    receivedDate: invoice.receivedDate ?? invoice.issueDate ?? now.toISOString(),
    paidDate: invoice.paidDate ?? null,
  }))

  const total = filtered.length
  const pageCount = Math.ceil(total / limit) || 0

  return {
    data,
    pagination: {
      total,
      pageCount,
      pageSize: limit,
      pageIndex: page,
    },
  }
}

function filterLocalInvoices(invoices: typeof mockInvoiceData, filters: NormalisedFilters, now: Date) {
  return invoices.filter((invoice) => {
    if (filters.search) {
      const haystack = [
        invoice.invoiceNumber,
        invoice.vendorName,
        invoice.description,
        invoice.category,
      ]
        .filter(Boolean)
        .join(' ') 
        .toLowerCase()

      if (!haystack.includes(filters.search.toLowerCase())) {
        return false
      }
    }

    if (filters.statuses.length) {
      const derivedStatus = deriveInvoiceStatus(invoice.amountDue ?? invoice.amount ?? 0, invoice.dueDate, now)
      if (!filters.statuses.includes(derivedStatus)) {
        return false
      }
    }

    if (filters.categories.length) {
      const category = (invoice.category ?? '').toLowerCase()
      if (!filters.categories.some((value) => category === value.toLowerCase())) {
        return false
      }
    }

    if (filters.vendors.length) {
      const vendor = (invoice.vendorName ?? '').toLowerCase()
      if (!filters.vendors.some((value) => vendor === value.toLowerCase())) {
        return false
      }
    }

    if (filters.dateFrom || filters.dateTo) {
      const created = invoice.receivedDate ?? invoice.issueDate
      if (!created) return false
      const createdDate = new Date(created)

      if (filters.dateFrom && createdDate < new Date(filters.dateFrom)) {
        return false
      }

      if (filters.dateTo && createdDate > new Date(filters.dateTo)) {
        return false
      }
    }

    if (typeof filters.amountMin === 'number' && (invoice.amount ?? 0) < filters.amountMin) {
      return false
    }

    if (typeof filters.amountMax === 'number' && (invoice.amount ?? 0) > filters.amountMax) {
      return false
    }

    return true
  })
}

function sortLocalInvoices(
  invoices: typeof mockInvoiceData,
  sortBy: string,
  sortOrder: 'asc' | 'desc',
) {
  const factor = sortOrder === 'asc' ? 1 : -1
  const key = sortBy

  const sorted = [...invoices].sort((a, b) => {
    switch (key) {
      case 'created_at':
        return factor * compareDate(a.receivedDate ?? a.issueDate, b.receivedDate ?? b.issueDate)
      case 'invoice_number':
        return factor * compareString(a.invoiceNumber, b.invoiceNumber)
      case 'supplier_name':
        return factor * compareString(a.vendorName, b.vendorName)
      case 'total':
        return factor * compareNumber(a.amount ?? 0, b.amount ?? 0)
      case 'due_date':
        return factor * compareDate(a.dueDate, b.dueDate)
      case 'invoice_date':
        return factor * compareDate(a.issueDate, b.issueDate)
      case 'category':
        return factor * compareString(a.category, b.category)
      default:
        return 0
    }
  })

  return sorted
}

function compareString(a?: string | null, b?: string | null) {
  return (a ?? '').localeCompare(b ?? '')
}

function compareNumber(a: number, b: number) {
  return a - b
}

function compareDate(a?: string | null, b?: string | null) {
  const dateA = a ? new Date(a).getTime() : 0
  const dateB = b ? new Date(b).getTime() : 0
  return dateA - dateB
}

// Create new invoice (for testing)
export async function POST(request: NextRequest) {
  try {
    const invoice = await request.json();
    
    // Add timestamp and generate ID
    const newInvoice = {
      ...invoice,
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    
    // For now, echo back. Implement Supabase insert if needed.
    return NextResponse.json(newInvoice, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
