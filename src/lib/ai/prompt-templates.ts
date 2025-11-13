/**
 * AI Prompt Templates for Invoice Chat Assistant
 * Defines system prompts and function definitions for Claude
 */

export const SYSTEM_PROMPT = `You are an intelligent invoice management assistant for a real estate invoice dashboard. Your role is to help users understand, search, and manage their invoices through natural conversation.

## Your Capabilities

You can help users with:
1. **Search & Query**: Find invoices by vendor, amount, date, status, or any combination
2. **Analytics & Summaries**: Provide insights, totals, trends, and breakdowns
3. **Status Updates**: Suggest status changes (pending → in_review → approved → paid)
4. **Invoice Details**: Explain invoice information in plain language
5. **Recommendations**: Suggest actions based on invoice data (e.g., overdue payments)

## Critical Safety Rules

⛔ **NEVER DELETE INVOICES** - You cannot and must not delete invoice data under any circumstances
⛔ **ALWAYS CONFIRM ACTIONS** - Any status update or modification MUST be confirmed by the user
⛔ **READ-ONLY BY DEFAULT** - Assume all operations are read-only unless explicitly requested
⛔ **ACCURATE DATA ONLY** - Never make up invoice numbers, amounts, or vendors - always query the database

## Response Guidelines

1. **Be Conversational**: Use natural language, not database jargon
2. **Be Precise**: When showing amounts, use currency formatting ($1,234.56)
3. **Be Helpful**: Offer related suggestions after answering questions
4. **Be Transparent**: Explain what functions you're calling and why
5. **Be Safe**: Always confirm before making changes

## Example Interactions

User: "Show me overdue invoices"
You: *Call searchInvoices with status=overdue* "I found X overdue invoices totaling $Y. Here are the details..."

User: "What's the total pending amount?"
You: *Call getSummaryStats with status=pending* "Your pending invoices total $X across Y invoices. Would you like to see a breakdown?"

User: "Mark invoice INV-123 as paid"
You: *Call updateInvoiceStatus but request confirmation* "I can update invoice INV-123 from 'pending' to 'paid'. This invoice is for $X from Vendor Y. Should I proceed?"

## Invoice Status Workflow

- **pending**: Initial state, awaiting review
- **in_review**: Under review by accounting team
- **approved**: Approved for payment
- **paid**: Payment completed
- **overdue**: Past due date and still unpaid

## Current Context

The user is viewing the invoice dashboard. They can see summary statistics, invoice lists, and analytics. Your responses should complement the visual information they already have.

## Important Notes

- Invoice amounts may include GST/tax
- Dates are in ISO format but should be displayed in a friendly format
- Vendors may have multiple invoices
- Some invoices may have attachments or file URLs
- The source field indicates where the invoice came from (xero, postal_ocr, frank, taxcellent)

Remember: You're a helpful assistant, not a database. Speak naturally and focus on helping users accomplish their goals efficiently.`;

export const FUNCTION_DEFINITIONS = [
  {
    name: 'searchInvoices',
    description: 'Search and filter invoices based on various criteria. Returns a list of matching invoices.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['pending', 'in_review', 'approved', 'paid', 'overdue']
          },
          description: 'Filter by payment status'
        },
        vendor: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by vendor name(s)'
        },
        dateFrom: {
          type: 'string',
          description: 'Start date for filtering (ISO format: YYYY-MM-DD)'
        },
        dateTo: {
          type: 'string',
          description: 'End date for filtering (ISO format: YYYY-MM-DD)'
        },
        amountMin: {
          type: 'number',
          description: 'Minimum invoice amount'
        },
        amountMax: {
          type: 'number',
          description: 'Maximum invoice amount'
        },
        search: {
          type: 'string',
          description: 'Text search across invoice number, description, and vendor'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)'
        }
      }
    }
  },
  {
    name: 'getInvoiceDetails',
    description: 'Get detailed information about a specific invoice by ID',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'string',
          description: 'The unique ID of the invoice'
        }
      },
      required: ['invoiceId']
    }
  },
  {
    name: 'getSummaryStats',
    description: 'Get summary statistics and analytics for invoices within optional filters',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['pending', 'in_review', 'approved', 'paid', 'overdue']
          },
          description: 'Filter stats by payment status'
        },
        dateFrom: {
          type: 'string',
          description: 'Start date for filtering (ISO format: YYYY-MM-DD)'
        },
        dateTo: {
          type: 'string',
          description: 'End date for filtering (ISO format: YYYY-MM-DD)'
        }
      }
    }
  },
  {
    name: 'getTopVendors',
    description: 'Get top vendors by invoice count or total amount',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of vendors to return (default: 10)'
        },
        sortBy: {
          type: 'string',
          enum: ['amount', 'count'],
          description: 'Sort by total amount or invoice count (default: amount)'
        }
      }
    }
  },
  {
    name: 'updateInvoiceStatus',
    description: 'Update the payment status of an invoice. REQUIRES USER CONFIRMATION before execution.',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'string',
          description: 'The unique ID of the invoice to update'
        },
        newStatus: {
          type: 'string',
          enum: ['pending', 'in_review', 'approved', 'paid', 'overdue'],
          description: 'The new status to set'
        },
        reason: {
          type: 'string',
          description: 'Optional reason for the status change'
        }
      },
      required: ['invoiceId', 'newStatus']
    }
  },
  {
    name: 'addInvoiceNote',
    description: 'Add a note or comment to an invoice. REQUIRES USER CONFIRMATION before execution.',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'string',
          description: 'The unique ID of the invoice'
        },
        note: {
          type: 'string',
          description: 'The note text to add'
        }
      },
      required: ['invoiceId', 'note']
    }
  }
];

/**
 * Generate a contextual prompt based on current dashboard state
 */
export function generateContextPrompt(context: {
  activeFilters?: any;
  visibleInvoiceCount?: number;
  totalAmount?: number;
}): string {
  const parts: string[] = [];
  
  if (context.activeFilters) {
    parts.push(`Current filters applied: ${JSON.stringify(context.activeFilters)}`);
  }
  
  if (context.visibleInvoiceCount !== undefined) {
    parts.push(`User is currently viewing ${context.visibleInvoiceCount} invoices`);
  }
  
  if (context.totalAmount !== undefined) {
    parts.push(`Total amount visible: $${context.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }
  
  if (parts.length === 0) {
    return '';
  }
  
  return `\n\nCurrent Dashboard Context:\n${parts.join('\n')}`;
}

/**
 * Format a confirmation prompt for actions
 */
export function formatActionConfirmation(action: {
  type: 'status_update' | 'note_added';
  invoiceNumber?: string;
  vendor?: string;
  oldValue?: string;
  newValue?: string;
}): string {
  if (action.type === 'status_update') {
    return `I need your confirmation to update invoice ${action.invoiceNumber} (${action.vendor}) from "${action.oldValue}" to "${action.newValue}". Should I proceed?`;
  }
  
  if (action.type === 'note_added') {
    return `I need your confirmation to add a note to invoice ${action.invoiceNumber} (${action.vendor}). The note will be: "${action.newValue}". Should I proceed?`;
  }
  
  return 'I need your confirmation to proceed with this action.';
}
