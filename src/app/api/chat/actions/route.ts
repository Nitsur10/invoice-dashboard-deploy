import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getSupabaseServerComponentClient } from '@/lib/supabase-server';
import { executeStatusUpdate, executeNoteAddition } from '@/lib/ai/function-handlers';

/**
 * POST /api/chat/actions
 * Execute a confirmed action (status update or note addition)
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
    const body = await request.json();
    const { conversationId, messageId, actionType, params } = body;
    
    // Validate required fields
    if (!conversationId || !messageId || !actionType || !params) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Verify invoice ownership - CRITICAL SECURITY CHECK
    // Use user-scoped client to ensure RLS is applied
    const { data: invoice, error: invoiceError } = await supabase
      .from('Invoice')
      .select('id, invoice_number, status')
      .eq('id', params.invoiceId)
      .single();

    if (invoiceError) {
      // Log unauthorized access attempt
      console.warn('Invoice access denied:', {
        userId,
        invoiceId: params.invoiceId,
        actionType,
        error: invoiceError.code,
      });

      // Distinguish between not found and access denied
      const status = invoiceError.code === 'PGRST116' ? 404 : 403;
      const message = invoiceError.code === 'PGRST116'
        ? 'Invoice not found'
        : 'Access denied - you do not have permission to modify this invoice';

      return NextResponse.json({ error: message }, { status });
    }

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Execute action based on type
    let result: { success: boolean; message: string };
    let invoiceIds: string[] = [];
    let oldValues: any = null;
    let newValues: any = null;
    
    if (actionType === 'status_update') {
      result = await executeStatusUpdate({
        invoiceId: params.invoiceId,
        newStatus: params.newStatus,
        userId,
        reason: params.reason,
      }, supabase);

      invoiceIds = [params.invoiceId];
      oldValues = { status: params.oldStatus };
      newValues = { status: params.newStatus };
    } else if (actionType === 'note_added') {
      result = await executeNoteAddition({
        invoiceId: params.invoiceId,
        note: params.note,
        userId,
      }, supabase);
      
      invoiceIds = [params.invoiceId];
      newValues = { note: params.note };
    } else {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      );
    }
    
    // Log the action
    const { error: logError } = await supabaseAdmin
      .from('chat_actions_log')
      .insert({
        conversation_id: conversationId,
        message_id: messageId,
        action_type: actionType,
        invoice_ids: invoiceIds,
        old_values: oldValues,
        new_values: newValues,
        success: result.success,
        error_message: result.success ? null : result.message,
        user_id: userId,
        user_confirmed: true,
      });
    
    if (logError) {
      console.error('Log action error:', logError);
      // Don't fail the request if logging fails
    }
    
    // If action requires audit log entry (for invoices table)
    if (result.success && actionType === 'status_update') {
      // Create audit log entry
      const { error: auditError } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          invoice_id: params.invoiceId,
          old_status: params.oldStatus,
          new_status: params.newStatus,
          user_id: userId,
          user_email: session.user.email,
          action_type: 'status_change',
          metadata: {
            source: 'chat_assistant',
            conversation_id: conversationId,
            message_id: messageId,
          },
        });
      
      if (auditError) {
        console.error('Audit log error:', auditError);
        // Don't fail the request if audit logging fails
      }
    }
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error('POST /api/chat/actions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/actions
 * Get action history for a conversation
 */
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    
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
    
    // Get action history
    const { data: actions, error } = await supabaseAdmin
      .from('chat_actions_log')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get actions error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch action history' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      actions: actions || [],
    });
  } catch (error) {
    console.error('GET /api/chat/actions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
