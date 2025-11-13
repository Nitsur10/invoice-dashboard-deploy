import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { getSupabaseServerComponentClient } from '@/lib/supabase-server';

/**
 * GET /api/chat/conversations
 * List user's conversations with pagination
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
    const page = parseInt(searchParams.get('page') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = page * limit;
    
    // Fetch conversations
    const { data: conversations, error, count } = await supabaseAdmin
      .from('chat_conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('archived', false)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Get conversations error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }
    
    // Get message counts for each conversation
    const conversationsWithCounts = await Promise.all(
      (conversations || []).map(async (conv: any) => {
        const { count: messageCount } = await supabaseAdmin
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);
        
        return {
          ...conv,
          messageCount: messageCount || 0,
        };
      })
    );
    
    return NextResponse.json({
      conversations: conversationsWithCounts,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('GET /api/chat/conversations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/conversations
 * Create a new conversation
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
    const body = await request.json();
    
    // Create conversation
    const { data: conversation, error } = await supabaseAdmin
      .from('chat_conversations')
      .insert({
        user_id: userId,
        user_email: userEmail,
        title: body.title || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();
    
    if (error) {
      console.error('Create conversation error:', error);
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error('POST /api/chat/conversations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
