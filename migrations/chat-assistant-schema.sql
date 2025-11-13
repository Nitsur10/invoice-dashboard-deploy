-- Chat Assistant Schema Migration
-- Creates tables for AI-powered chat assistant with conversation logging
-- IMPORTANT: This migration NEVER deletes invoice data - all operations are read-only or additive

-- ============================================================================
-- PART 1: Create chat_conversations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_email TEXT,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    archived BOOLEAN DEFAULT FALSE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id 
ON chat_conversations(user_id) 
WHERE archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at 
ON chat_conversations(created_at DESC);

-- Add comment
COMMENT ON TABLE chat_conversations IS 'Stores chat conversation metadata and history';
COMMENT ON COLUMN chat_conversations.metadata IS 'Stores context like active filters, dashboard state, etc.';
COMMENT ON COLUMN chat_conversations.archived IS 'Soft delete flag - conversations are never truly deleted';

-- ============================================================================
-- PART 2: Create chat_messages table
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    invoice_context JSONB DEFAULT '[]'::jsonb,
    action_taken JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id 
ON chat_messages(conversation_id, timestamp ASC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp 
ON chat_messages(timestamp DESC);

-- Add GIN index for JSONB searching
CREATE INDEX IF NOT EXISTS idx_chat_messages_invoice_context 
ON chat_messages USING GIN (invoice_context);

-- Add comments
COMMENT ON TABLE chat_messages IS 'Stores individual messages within conversations';
COMMENT ON COLUMN chat_messages.role IS 'Message sender: user, assistant, or system';
COMMENT ON COLUMN chat_messages.invoice_context IS 'Array of invoice IDs referenced in this message';
COMMENT ON COLUMN chat_messages.action_taken IS 'Details of any action performed by the assistant';
COMMENT ON COLUMN chat_messages.metadata IS 'AI model used, tokens consumed, confidence scores, etc.';

-- ============================================================================
-- PART 3: Create chat_actions_log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('status_update', 'note_added', 'search', 'summary', 'export', 'filter')),
    invoice_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    old_values JSONB,
    new_values JSONB,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    user_id TEXT NOT NULL,
    user_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_actions_log_conversation_id 
ON chat_actions_log(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_actions_log_user_id 
ON chat_actions_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_actions_log_action_type 
ON chat_actions_log(action_type);

-- Add GIN index for array searching
CREATE INDEX IF NOT EXISTS idx_chat_actions_log_invoice_ids 
ON chat_actions_log USING GIN (invoice_ids);

-- Add comments
COMMENT ON TABLE chat_actions_log IS 'Audit log for all actions performed through the chat assistant';
COMMENT ON COLUMN chat_actions_log.action_type IS 'Type of action: status_update, note_added, search, summary, export, filter';
COMMENT ON COLUMN chat_actions_log.invoice_ids IS 'Array of invoice IDs affected by this action';
COMMENT ON COLUMN chat_actions_log.user_confirmed IS 'Whether user explicitly confirmed the action before execution';
COMMENT ON COLUMN chat_actions_log.success IS 'Whether the action completed successfully';

-- ============================================================================
-- PART 4: Create helper function to update conversation timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update conversation timestamp on new message
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON chat_messages;
CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- ============================================================================
-- PART 5: Create helper function to auto-generate conversation titles
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_conversation_title()
RETURNS TRIGGER AS $$
BEGIN
    -- If title is not set and this is the first user message, use it as title
    IF (SELECT title FROM chat_conversations WHERE id = NEW.conversation_id) IS NULL 
       AND NEW.role = 'user' THEN
        UPDATE chat_conversations 
        SET title = CASE 
            WHEN LENGTH(NEW.content) > 60 THEN LEFT(NEW.content, 60) || '...'
            ELSE NEW.content
        END
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate title from first message
DROP TRIGGER IF EXISTS trigger_generate_conversation_title ON chat_messages;
CREATE TRIGGER trigger_generate_conversation_title
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION generate_conversation_title();

-- ============================================================================
-- PART 6: Create view for conversation summaries
-- ============================================================================

CREATE OR REPLACE VIEW chat_conversation_summaries AS
SELECT 
    c.id,
    c.user_id,
    c.user_email,
    c.title,
    c.created_at,
    c.updated_at,
    c.archived,
    COUNT(m.id) as message_count,
    MAX(m.timestamp) as last_message_at,
    (
        SELECT content 
        FROM chat_messages 
        WHERE conversation_id = c.id 
        AND role = 'user' 
        ORDER BY timestamp ASC 
        LIMIT 1
    ) as first_user_message,
    (
        SELECT content 
        FROM chat_messages 
        WHERE conversation_id = c.id 
        ORDER BY timestamp DESC 
        LIMIT 1
    ) as last_message
FROM chat_conversations c
LEFT JOIN chat_messages m ON c.id = m.conversation_id
GROUP BY c.id, c.user_id, c.user_email, c.title, c.created_at, c.updated_at, c.archived;

COMMENT ON VIEW chat_conversation_summaries IS 'Convenient view for listing conversations with message counts and previews';

-- ============================================================================
-- PART 7: Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all chat tables
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_actions_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own conversations
CREATE POLICY chat_conversations_user_access ON chat_conversations
    FOR ALL
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy: Users can only see messages from their conversations
CREATE POLICY chat_messages_user_access ON chat_messages
    FOR ALL
    USING (
        conversation_id IN (
            SELECT id FROM chat_conversations 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Policy: Users can only see their own action logs
CREATE POLICY chat_actions_log_user_access ON chat_actions_log
    FOR ALL
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================================
-- PART 8: Grant permissions (adjust role name as needed)
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON chat_conversations TO authenticated;
GRANT SELECT, INSERT ON chat_messages TO authenticated;
GRANT SELECT, INSERT ON chat_actions_log TO authenticated;
GRANT SELECT ON chat_conversation_summaries TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name IN ('chat_conversations', 'chat_messages', 'chat_actions_log')) = 3,
        'Not all chat tables were created successfully';
    
    RAISE NOTICE 'Chat assistant schema migration completed successfully!';
    RAISE NOTICE 'Created tables: chat_conversations, chat_messages, chat_actions_log';
    RAISE NOTICE 'Created view: chat_conversation_summaries';
    RAISE NOTICE 'RLS policies enabled for all chat tables';
END $$;
