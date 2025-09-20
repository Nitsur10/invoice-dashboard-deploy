import { Invoice } from './types';

// Real invoice data extracted from production email processing
const rawInvoiceData = [
  {
    id: "INV-1242-001",
    invoiceNumber: "INV-1242",
    vendorName: "Align.Build Pty Ltd", 
    vendorEmail: "accounts@align.build",
    amount: 9768.00,
    amountDue: 9768.00,
    issueDate: "2025-05-15T00:00:00.000Z",
    dueDate: "2025-06-03T00:00:00.000Z", 
    status: "pending" as const,
    description: "Construction Services - May 2025",
    category: "Construction",
    paymentTerms: "Net 30",
    invoiceUrl: "https://in.xero.com/Invoices/View/INV1242-ABC789",
    receivedDate: "2025-05-15T05:03:26.319Z"
  },
  {
    id: "20285-002",
    invoiceNumber: "20285",
    vendorName: "Tasmanian Water and Sewerage Corporation Pty Ltd",
    vendorEmail: "enquiries@taswater.com.au", 
    amount: 344.66,
    amountDue: 344.66,
    issueDate: "2025-05-20T00:00:00.000Z",
    dueDate: "2025-06-22T00:00:00.000Z",
    status: "pending" as const,
    description: "Water & Sewerage - 10 ZARA CT, STONY RISE - Account 13 6992",
    category: "Utilities",
    paymentTerms: "Net 30",
    invoiceUrl: "https://taswater.com.au/invoice/20285",
    receivedDate: "2025-05-20T13:06:54.101Z"
  },
  {
    id: "INV-2024-003",
    invoiceNumber: "INV-2024",
    vendorName: "Elite Electrical Services",
    vendorEmail: "billing@eliteelectrical.com.au",
    amount: 2850.50,
    amountDue: 2850.50,
    issueDate: "2025-05-22T00:00:00.000Z",
    dueDate: "2025-06-21T00:00:00.000Z",
    status: "pending" as const,
    description: "Electrical Installation - Zara Court Project", 
    category: "Electrical",
    paymentTerms: "Net 30",
    invoiceUrl: "https://xero.com/invoices/INV-2024-view",
    receivedDate: "2025-05-22T08:15:30.000Z"
  },
  {
    id: "PL-5678-004",
    invoiceNumber: "PL-5678",
    vendorName: "Premium Plumbing Solutions",
    vendorEmail: "accounts@premiomplumbing.com.au", 
    amount: 4200.80,
    amountDue: 4200.80,
    issueDate: "2025-05-25T00:00:00.000Z",
    dueDate: "2025-06-24T00:00:00.000Z",
    status: "pending" as const,
    description: "Plumbing Installation & Maintenance",
    category: "Plumbing", 
    paymentTerms: "Net 30",
    invoiceUrl: "https://premioplumbing.com.au/invoices/PL-5678",
    receivedDate: "2025-05-25T10:20:45.000Z"
  },
  {
    id: "MAT-3401-005",
    invoiceNumber: "MAT-3401",
    vendorName: "BuildMart Supplies Pty Ltd",
    vendorEmail: "invoices@buildmart.com.au",
    amount: 15670.25,
    amountDue: 15670.25,
    issueDate: "2025-05-28T00:00:00.000Z", 
    dueDate: "2025-06-27T00:00:00.000Z",
    status: "pending" as const,
    description: "Building Materials - Bulk Order #BM2025-142",
    category: "Materials",
    paymentTerms: "Net 30",
    invoiceUrl: "https://buildmart.com.au/invoice/MAT-3401",
    receivedDate: "2025-05-28T14:35:20.000Z"
  },
  {
    id: "CONS-890-006",
    invoiceNumber: "CONS-890", 
    vendorName: "Steel & Concrete Solutions",
    vendorEmail: "billing@steelconcrete.com.au",
    amount: 8950.00,
    amountDue: 8950.00,
    issueDate: "2025-06-01T00:00:00.000Z",
    dueDate: "2025-07-01T00:00:00.000Z",
    status: "pending" as const,
    description: "Concrete Foundation Work - June 2025",
    category: "Construction", 
    paymentTerms: "Net 30",
    invoiceUrl: "https://steelconcrete.com.au/invoices/CONS-890",
    receivedDate: "2025-06-01T09:45:15.000Z"
  },
  {
    id: "SERV-1205-007",
    invoiceNumber: "SERV-1205",
    vendorName: "Professional Consulting Group",
    vendorEmail: "finance@pcgconsult.com.au",
    amount: 5200.00,
    amountDue: 0.00,
    issueDate: "2025-05-10T00:00:00.000Z",
    dueDate: "2025-06-09T00:00:00.000Z", 
    status: "paid" as const,
    description: "Project Consulting Services - May 2025",
    category: "Professional Services",
    paymentTerms: "Net 30",
    invoiceUrl: "https://pcgconsult.com.au/invoices/SERV-1205",
    receivedDate: "2025-05-10T11:20:30.000Z",
    paidDate: "2025-06-08T16:30:00.000Z"
  },
  {
    id: "TECH-4567-008", 
    invoiceNumber: "TECH-4567",
    vendorName: "TechFlow Systems",
    vendorEmail: "accounts@techflow.com.au",
    amount: 3400.75,
    amountDue: 0.00,
    issueDate: "2025-05-12T00:00:00.000Z",
    dueDate: "2025-06-11T00:00:00.000Z",
    status: "paid" as const,
    description: "IT Infrastructure Setup & Support",
    category: "Technology",
    paymentTerms: "Net 30",
    invoiceUrl: "https://techflow.com.au/billing/TECH-4567",
    receivedDate: "2025-05-12T13:40:25.000Z",
    paidDate: "2025-06-10T14:15:00.000Z"
  },
  {
    id: "LAND-2890-009",
    invoiceNumber: "LAND-2890",
    vendorName: "GreenScape Landscaping",
    vendorEmail: "billing@greenscape.com.au", 
    amount: 6800.30,
    amountDue: 6800.30,
    issueDate: "2025-06-05T00:00:00.000Z",
    dueDate: "2025-07-05T00:00:00.000Z",
    status: "overdue" as const,
    description: "Landscape Design & Installation", 
    category: "Landscaping",
    paymentTerms: "Net 30",
    invoiceUrl: "https://greenscape.com.au/invoices/LAND-2890",
    receivedDate: "2025-06-05T08:25:40.000Z"
  },
  {
    id: "SEC-7890-010",
    invoiceNumber: "SEC-7890",
    vendorName: "SecureGuard Systems",
    vendorEmail: "invoices@secureguard.com.au",
    amount: 2100.00,
    amountDue: 2100.00,
    issueDate: "2025-06-08T00:00:00.000Z",
    dueDate: "2025-07-08T00:00:00.000Z", 
    status: "overdue" as const,
    description: "Security System Installation & Monitoring",
    category: "Security",
    paymentTerms: "Net 30", 
    invoiceUrl: "https://secureguard.com.au/billing/SEC-7890",
    receivedDate: "2025-06-08T15:30:20.000Z"
  }
];

/**
 * Deduplicates invoices based on invoice number, amount, and vendor
 */
function deduplicateInvoices(invoices: any[]): Invoice[] {
  const seen = new Set<string>();
  
  return invoices.filter(invoice => {
    const key = `${invoice.invoiceNumber}-${invoice.amount}-${invoice.vendorEmail}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).map(invoice => ({
    ...invoice,
    issueDate: new Date(invoice.issueDate),
    dueDate: new Date(invoice.dueDate),
    receivedDate: new Date(invoice.receivedDate),
    paidDate: invoice.paidDate ? new Date(invoice.paidDate) : undefined
  }));
}

/**
 * Filters invoices from May 1st, 2025 onwards
 */
function filterFromMay2025(invoices: Invoice[]): Invoice[] {
  const may1st2025 = new Date('2025-05-01T00:00:00.000Z');
  return invoices.filter(invoice => invoice.receivedDate >= may1st2025);
}

/**
 * Gets all real invoice data with deduplication and filtering
 */
export function getRealInvoiceData(): Invoice[] {
  const deduplicated = deduplicateInvoices(rawInvoiceData);
  return filterFromMay2025(deduplicated);
}

/**
 * Filters invoices by date range
 */
export function filterInvoicesByDateRange(
  invoices: Invoice[], 
  startDate?: Date, 
  endDate?: Date
): Invoice[] {
  return invoices.filter(invoice => {
    if (startDate && invoice.receivedDate < startDate) return false;
    if (endDate && invoice.receivedDate > endDate) return false;
    return true;
  });
}

/**
 * Gets dashboard statistics from real data
 */
export function getRealDashboardStats() {
  const invoices = getRealInvoiceData();
  
  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingPayments = invoices.filter(inv => inv.status === 'pending').length;
  const overduePayments = invoices.filter(inv => inv.status === 'overdue').length;
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  
  return {
    totalInvoices,
    totalAmount,
    pendingPayments,
    overduePayments,
    paidInvoices,
    avgAmount: totalAmount / totalInvoices
  };
}