import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getSupabaseServerComponentClient } from '@/lib/supabase-server';
import { sendMessage, isClaudeConfigured } from '@/lib/ai/claude-client';
import { executeFunctionCall } from '@/lib/ai/function-handlers';
import { parseQuery, shouldUseStructuredParsing, describeQuery } from '@/lib/ai/structured-query-parser';

// Rate limiting: Track message counts per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20; // messages per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT - userLimit.count };
}

/**
 * POST /api/chat/messages
 * Send a message and get AI response
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await getSupabaseServerComponentClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    // Check rate limit
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before sending more messages.' },
        { status: 429 }
      );
    }
    
    const body = await request.json();
    const { conversationId, message, context } = body;
    
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }
    
    // Verify conversation belongs to user
    const { data: conversation } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    // Save user message
    const { data: userMessage, error: userMsgError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        metadata: { context },
      })
      .select()
      .single();
    
    if (userMsgError) {
      console.error('Save user message error:', userMsgError);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }
    
    // Get conversation history
    const { data: history } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true })
      .limit(20); // Last 20 messages for context
    
    const conversationHistory = (history || []).map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
    
    // Decide whether to use Claude or structured parsing
    const useStructured = shouldUseStructuredParsing(message) && !isClaudeConfigured();
    
    let assistantResponse = '';
    let functionCalls: any[] = [];
    let invoiceContext: string[] = [];
    let metadata: any = {};
    
    if (useStructured) {
      // Use structured parsing for simple queries
      const parsed = parseQuery(message);
      metadata.parser = 'structured';
      metadata.confidence = parsed.confidence;
      
      if (parsed.type === 'search' && parsed.confidence > 0.7) {
        try {
          const searchResults = await executeFunctionCall('searchInvoices', parsed.params, supabase);
          assistantResponse = formatSearchResults(searchResults);
          invoiceContext = searchResults.invoices.map((inv: any) => inv.id);
        } catch (error) {
          assistantResponse = 'I encountered an error searching for invoices. Please try again.';
        }
      } else if (parsed.type === 'summary' && parsed.confidence > 0.7) {
        try {
          const stats = await executeFunctionCall('getSummaryStats', parsed.params, supabase);
          assistantResponse = formatSummaryStats(stats);
        } catch (error) {
          assistantResponse = 'I encountered an error getting summary statistics. Please try again.';
        }
      } else {
        assistantResponse = `I understand you're asking about ${describeQuery(parsed)}. Could you provide more details or rephrase your question?`;
      }
    } else {
      // Use Claude AI
      try {
        const response = await sendMessage(conversationHistory, {}, context ? JSON.stringify(context) : undefined);
        
        metadata.model = 'claude-3-5-sonnet';
        metadata.inputTokens = response.usage.inputTokens;
        metadata.outputTokens = response.usage.outputTokens;
        
        assistantResponse = response.content;
        functionCalls = response.functionCalls;
        
        // Execute function calls
        if (functionCalls.length > 0) {
          const functionResults: any[] = [];
          
          for (const call of functionCalls) {
            try {
              const result = await executeFunctionCall(call.name, call.input, supabase);
              functionResults.push({ name: call.name, result });
              
              // Track invoice context
              if (call.name === 'searchInvoices' && result.invoices) {
                invoiceContext.push(...result.invoices.map((inv: any) => inv.id));
              } else if (call.name === 'getInvoiceDetails' && result) {
                invoiceContext.push(result.id);
              }
            } catch (error) {
              console.error(`Function call error (${call.name}):`, error);
              functionResults.push({
                name: call.name,
                result: { error: 'Function execution failed' },
              });
            }
          }
          
          // Enhance response with function results
          assistantResponse += '\n\n' + formatFunctionResults(functionResults);
        }
      } catch (error) {
        console.error('Claude API error:', error);
        // Fallback to structured parsing
        const parsed = parseQuery(message);
        if (parsed.confidence > 0.5) {
          try {
            if (parsed.type === 'search') {
              const searchResults = await executeFunctionCall('searchInvoices', parsed.params, supabase);
              assistantResponse = formatSearchResults(searchResults);
              invoiceContext = searchResults.invoices.map((inv: any) => inv.id);
            } else if (parsed.type === 'summary') {
              const stats = await executeFunctionCall('getSummaryStats', parsed.params, supabase);
              assistantResponse = formatSummaryStats(stats);
            }
          } catch (fallbackError) {
            assistantResponse = 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment.';
          }
        } else {
          assistantResponse = 'I apologize, but I\'m having trouble understanding your request. Could you rephrase it?';
        }
        metadata.fallback = true;
      }
    }
    
    // Save assistant response
    const { data: assistantMessage, error: assistantMsgError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantResponse,
        invoice_context: invoiceContext,
        action_taken: functionCalls.length > 0 ? { functions: functionCalls } : null,
        metadata,
      })
      .select()
      .single();
    
    if (assistantMsgError) {
      console.error('Save assistant message error:', assistantMsgError);
      return NextResponse.json(
        { error: 'Failed to save response' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      userMessage,
      assistantMessage,
      requiresConfirmation: functionCalls.some(c => 
        c.name === 'updateInvoiceStatus' || c.name === 'addInvoiceNote'
      ),
    });
  } catch (error) {
    console.error('POST /api/chat/messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Format search results for display
 */
function formatSearchResults(results: any): string {
  if (!results.invoices || results.invoices.length === 0) {
    return 'I couldn\'t find any invoices matching your criteria.';
  }
  
  const { invoices, summary } = results;
  let response = `I found **${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}** `;
  response += `with a total amount of **$${summary.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.\n\n`;
  
  response += 'Here are the details:\n\n';
  
  for (const inv of invoices.slice(0, 10)) {
    response += `- **${inv.invoiceNumber}** from ${inv.vendor}\n`;
    response += `  Amount: $${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}, `;
    response += `Status: ${inv.status}, `;
    response += `Date: ${new Date(inv.issueDate).toLocaleDateString()}\n`;
  }
  
  if (invoices.length > 10) {
    response += `\n...and ${invoices.length - 10} more.`;
  }
  
  return response;
}

/**
 * Format summary statistics for display
 */
function formatSummaryStats(stats: any): string {
  let response = `## Summary Statistics\n\n`;
  response += `- **Total Invoices**: ${stats.totalInvoices}\n`;
  response += `- **Total Amount**: $${stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
  response += `- **Average Amount**: $${stats.averageAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
  
  if (stats.byStatus && Object.keys(stats.byStatus).length > 0) {
    response += `### Breakdown by Status:\n\n`;
    for (const [status, data] of Object.entries(stats.byStatus)) {
      const statusData = data as { count: number; amount: number };
      response += `- **${status}**: ${statusData.count} invoice${statusData.count !== 1 ? 's' : ''} `;
      response += `($${statusData.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n`;
    }
  }
  
  return response;
}

/**
 * Format function results for display
 */
function formatFunctionResults(results: any[]): string {
  let output = '';
  
  for (const { name, result } of results) {
    if (name === 'searchInvoices') {
      output += formatSearchResults(result);
    } else if (name === 'getSummaryStats') {
      output += formatSummaryStats(result);
    } else if (name === 'getTopVendors') {
      output += formatTopVendors(result);
    } else if (name === 'getInvoiceDetails') {
      output += formatInvoiceDetails(result);
    }
  }
  
  return output;
}

/**
 * Format top vendors for display
 */
function formatTopVendors(vendors: any[]): string {
  if (!vendors || vendors.length === 0) {
    return 'No vendor data available.';
  }
  
  let response = `### Top Vendors:\n\n`;
  
  for (const vendor of vendors) {
    response += `- **${vendor.vendor}**: ${vendor.count} invoice${vendor.count !== 1 ? 's' : ''} `;
    response += `($${vendor.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n`;
  }
  
  return response;
}

/**
 * Format invoice details for display
 */
function formatInvoiceDetails(invoice: any): string {
  if (!invoice) {
    return 'Invoice not found.';
  }
  
  let response = `## Invoice ${invoice.invoiceNumber}\n\n`;
  response += `- **Vendor**: ${invoice.vendor}\n`;
  response += `- **Amount**: $${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
  response += `- **Status**: ${invoice.status}\n`;
  response += `- **Issue Date**: ${new Date(invoice.issueDate).toLocaleDateString()}\n`;
  
  if (invoice.dueDate) {
    response += `- **Due Date**: ${new Date(invoice.dueDate).toLocaleDateString()}\n`;
  }
  
  if (invoice.description) {
    response += `- **Description**: ${invoice.description}\n`;
  }
  
  return response;
}
