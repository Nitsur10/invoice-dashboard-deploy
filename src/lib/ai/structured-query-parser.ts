/**
 * Structured Query Parser
 * Fallback for simple queries when AI is unavailable or for faster responses
 */

import { InvoiceSearchParams } from './function-handlers';

interface ParsedQuery {
  type: 'search' | 'summary' | 'details' | 'unknown';
  params: any;
  confidence: number;
}

/**
 * Parse natural language query into structured parameters
 */
export function parseQuery(query: string): ParsedQuery {
  const lowerQuery = query.toLowerCase().trim();
  
  // Check for status queries
  const statusMatch = parseStatusQuery(lowerQuery);
  if (statusMatch) {
    return {
      type: 'search',
      params: statusMatch,
      confidence: 0.9,
    };
  }
  
  // Check for vendor queries
  const vendorMatch = parseVendorQuery(lowerQuery);
  if (vendorMatch) {
    return {
      type: 'search',
      params: vendorMatch,
      confidence: 0.85,
    };
  }
  
  // Check for amount queries
  const amountMatch = parseAmountQuery(lowerQuery);
  if (amountMatch) {
    return {
      type: 'search',
      params: amountMatch,
      confidence: 0.8,
    };
  }
  
  // Check for date queries
  const dateMatch = parseDateQuery(lowerQuery);
  if (dateMatch) {
    return {
      type: 'search',
      params: dateMatch,
      confidence: 0.8,
    };
  }
  
  // Check for summary queries
  const summaryMatch = parseSummaryQuery(lowerQuery);
  if (summaryMatch) {
    return {
      type: 'summary',
      params: summaryMatch,
      confidence: 0.85,
    };
  }
  
  // General search
  if (lowerQuery.includes('show') || lowerQuery.includes('find') || lowerQuery.includes('list')) {
    return {
      type: 'search',
      params: { limit: 20 },
      confidence: 0.5,
    };
  }
  
  return {
    type: 'unknown',
    params: {},
    confidence: 0,
  };
}

/**
 * Parse status-related queries
 */
function parseStatusQuery(query: string): InvoiceSearchParams | null {
  const statusPatterns = [
    { pattern: /\b(pending|unpaid|waiting)\b/, status: 'pending' },
    { pattern: /\b(overdue|late|past\s*due)\b/, status: 'overdue' },
    { pattern: /\b(paid|completed)\b/, status: 'paid' },
    { pattern: /\b(in\s*review|reviewing)\b/, status: 'in_review' },
    { pattern: /\b(approved)\b/, status: 'approved' },
  ];
  
  for (const { pattern, status } of statusPatterns) {
    if (pattern.test(query)) {
      return { status: [status] };
    }
  }
  
  return null;
}

/**
 * Parse vendor-related queries
 */
function parseVendorQuery(query: string): InvoiceSearchParams | null {
  // Pattern: "from <vendor>" or "by <vendor>" or "vendor <name>"
  const vendorPatterns = [
    /(?:from|by|vendor)\s+([a-zA-Z0-9\s&]+?)(?:\s|$)/,
  ];
  
  for (const pattern of vendorPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const vendorName = match[1].trim();
      return { vendor: [vendorName] };
    }
  }
  
  return null;
}

/**
 * Parse amount-related queries
 */
function parseAmountQuery(query: string): InvoiceSearchParams | null {
  // Pattern: "over $X" or "above $X" or "more than $X"
  const overPattern = /(?:over|above|more\s+than|greater\s+than)\s*\$?\s*([0-9,]+)/;
  const overMatch = query.match(overPattern);
  if (overMatch) {
    const amount = parseFloat(overMatch[1].replace(/,/g, ''));
    return { amountMin: amount };
  }
  
  // Pattern: "under $X" or "below $X" or "less than $X"
  const underPattern = /(?:under|below|less\s+than)\s*\$?\s*([0-9,]+)/;
  const underMatch = query.match(underPattern);
  if (underMatch) {
    const amount = parseFloat(underMatch[1].replace(/,/g, ''));
    return { amountMax: amount };
  }
  
  // Pattern: "between $X and $Y"
  const betweenPattern = /between\s*\$?\s*([0-9,]+)\s*and\s*\$?\s*([0-9,]+)/;
  const betweenMatch = query.match(betweenPattern);
  if (betweenMatch) {
    const min = parseFloat(betweenMatch[1].replace(/,/g, ''));
    const max = parseFloat(betweenMatch[2].replace(/,/g, ''));
    return { amountMin: min, amountMax: max };
  }
  
  return null;
}

/**
 * Parse date-related queries
 */
function parseDateQuery(query: string): InvoiceSearchParams | null {
  const now = new Date();
  
  // Last X days
  const lastDaysPattern = /last\s+(\d+)\s+days?/;
  const lastDaysMatch = query.match(lastDaysPattern);
  if (lastDaysMatch) {
    const days = parseInt(lastDaysMatch[1], 10);
    const dateFrom = new Date(now);
    dateFrom.setDate(dateFrom.getDate() - days);
    return {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: now.toISOString().split('T')[0],
    };
  }
  
  // This week
  if (query.includes('this week')) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return {
      dateFrom: weekStart.toISOString().split('T')[0],
      dateTo: now.toISOString().split('T')[0],
    };
  }
  
  // This month
  if (query.includes('this month')) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      dateFrom: monthStart.toISOString().split('T')[0],
      dateTo: now.toISOString().split('T')[0],
    };
  }
  
  // Last month
  if (query.includes('last month')) {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      dateFrom: lastMonth.toISOString().split('T')[0],
      dateTo: lastMonthEnd.toISOString().split('T')[0],
    };
  }
  
  return null;
}

/**
 * Parse summary/statistics queries
 */
function parseSummaryQuery(query: string): any | null {
  // Total queries
  if (query.includes('total') || query.includes('sum')) {
    // Check if it's for a specific status
    const statusMatch = parseStatusQuery(query);
    if (statusMatch) {
      return statusMatch;
    }
    return {};
  }
  
  // Count queries
  if (query.includes('how many') || query.includes('count')) {
    const statusMatch = parseStatusQuery(query);
    if (statusMatch) {
      return statusMatch;
    }
    return {};
  }
  
  // Average queries
  if (query.includes('average') || query.includes('mean')) {
    return {};
  }
  
  return null;
}

/**
 * Generate a user-friendly description of parsed params
 */
export function describeQuery(parsed: ParsedQuery): string {
  if (parsed.type === 'unknown') {
    return 'I\'m not sure what you\'re looking for. Could you rephrase that?';
  }
  
  const parts: string[] = [];
  
  if (parsed.params.status) {
    parts.push(`${parsed.params.status.join(' or ')} invoices`);
  }
  
  if (parsed.params.vendor) {
    parts.push(`from ${parsed.params.vendor.join(' or ')}`);
  }
  
  if (parsed.params.amountMin && parsed.params.amountMax) {
    parts.push(`between $${parsed.params.amountMin} and $${parsed.params.amountMax}`);
  } else if (parsed.params.amountMin) {
    parts.push(`over $${parsed.params.amountMin}`);
  } else if (parsed.params.amountMax) {
    parts.push(`under $${parsed.params.amountMax}`);
  }
  
  if (parsed.params.dateFrom && parsed.params.dateTo) {
    parts.push(`from ${parsed.params.dateFrom} to ${parsed.params.dateTo}`);
  } else if (parsed.params.dateFrom) {
    parts.push(`from ${parsed.params.dateFrom}`);
  } else if (parsed.params.dateTo) {
    parts.push(`until ${parsed.params.dateTo}`);
  }
  
  if (parts.length === 0) {
    return 'all invoices';
  }
  
  return parts.join(', ');
}

/**
 * Check if query is simple enough for structured parsing
 */
export function shouldUseStructuredParsing(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  // Simple queries that work well with structured parsing
  const simplePatterns = [
    /^(show|list|find|get)\s+(all\s+)?(\w+\s+)?invoices?$/,
    /^(pending|overdue|paid)\s+invoices?$/,
    /^invoices?\s+(from|by)\s+\w+$/,
    /^total\s+(pending|overdue|paid)?/,
    /^how\s+many\s+(pending|overdue|paid)?\s*invoices?/,
  ];
  
  return simplePatterns.some(pattern => pattern.test(lowerQuery));
}
