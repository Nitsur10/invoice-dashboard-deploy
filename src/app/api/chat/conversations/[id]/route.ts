import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getSupabaseServerComponentClient } from '@/lib/supabase-server';

/**
 * GET /api/chat/conversations/[id]
 * Get a specific conversation with all messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
    
    // Get conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    // Get messages
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('timestamp', { ascending: true });
    
    if (msgError) {
      console.error('Get messages error:', msgError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      conversation,
      messages: messages || [],
    });
  } catch (error) {
    console.error('GET /api/chat/conversations/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chat/conversations/[id]
 * Update conversation metadata (e.g., title)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
    
    // Build update object
    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.metadata !== undefined) updates.metadata = body.metadata;
    
    // Update conversation
    const { data: conversation, error } = await supabaseAdmin
      .from('chat_conversations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error || !conversation) {
      console.error('Update conversation error:', error);
      return NextResponse.json(
        { error: 'Failed to update conversation' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(conversation);
  } catch (error) {
    console.error('PATCH /api/chat/conversations/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat/conversations/[id]
 * Archive a conversation (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
    
    // Archive conversation (never truly delete)
    const { error } = await supabaseAdmin
      .from('chat_conversations')
      .update({ archived: true })
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Archive conversation error:', error);
      return NextResponse.json(
        { error: 'Failed to archive conversation' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/chat/conversations/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
