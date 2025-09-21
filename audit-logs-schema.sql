-- Create audit_logs table for tracking invoice status changes
CREATE TABLE IF NOT EXISTS "audit_logs" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id VARCHAR(255) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    user_id UUID,
    user_email VARCHAR(255),
    action_type VARCHAR(50) DEFAULT 'status_change',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign key constraint if Invoice table has UUID ids
    -- FOREIGN KEY (invoice_id) REFERENCES "Invoice"(id),

    -- Index for better query performance
    INDEX idx_audit_logs_invoice_id (invoice_id),
    INDEX idx_audit_logs_user_id (user_id),
    INDEX idx_audit_logs_created_at (created_at),
    INDEX idx_audit_logs_action_type (action_type)
);

-- Create RLS (Row Level Security) policies
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read audit logs
CREATE POLICY "Users can read audit logs" ON "audit_logs"
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy to allow authenticated users to insert audit logs
CREATE POLICY "Users can insert audit logs" ON "audit_logs"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON "audit_logs" TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE "audit_logs" IS 'Audit trail for tracking all invoice status changes and user actions';
COMMENT ON COLUMN "audit_logs".invoice_id IS 'Reference to the invoice that was modified';
COMMENT ON COLUMN "audit_logs".old_status IS 'Previous status before the change';
COMMENT ON COLUMN "audit_logs".new_status IS 'New status after the change';
COMMENT ON COLUMN "audit_logs".user_id IS 'UUID of the user who made the change';
COMMENT ON COLUMN "audit_logs".user_email IS 'Email of the user who made the change (for easier debugging)';
COMMENT ON COLUMN "audit_logs".action_type IS 'Type of action performed (status_change, bulk_update, etc.)';
COMMENT ON COLUMN "audit_logs".metadata IS 'Additional context data about the change';