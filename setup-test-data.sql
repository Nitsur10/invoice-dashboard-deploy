-- Setup script for kanban testing
-- Run this in your Supabase SQL Editor

-- 1. First, create the audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id VARCHAR(255) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    user_id UUID,
    user_email VARCHAR(255),
    action_type VARCHAR(50) DEFAULT 'status_change',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_invoice_id ON "audit_logs"(invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON "audit_logs"(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON "audit_logs"(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON "audit_logs"(action_type);

-- Enable RLS (Row Level Security)
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can read audit logs" ON "audit_logs";
CREATE POLICY "Users can read audit logs" ON "audit_logs"
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can insert audit logs" ON "audit_logs";
CREATE POLICY "Users can insert audit logs" ON "audit_logs"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON "audit_logs" TO authenticated;

-- 2. Create test invoices in different statuses
-- First, let's check what table structure we have
-- Note: You may need to adjust the table name and columns based on your actual schema

-- Insert test invoices with different statuses
INSERT INTO invoices (
    id,
    invoice_number,
    amount,
    vendor,
    subject,
    status,
    payment_status,
    due_date,
    category,
    created_at,
    updated_at
) VALUES
-- Pending invoices
('test-001', 'INV-001-PENDING', 1500.00, 'ABC Construction Ltd', 'Office renovation materials', 'pending', 'pending', '2025-10-15', 'standard_pdf', NOW(), NOW()),
('test-002', 'INV-002-PENDING', 2250.75, 'XYZ Electrical Services', 'Electrical installation work', 'pending', 'pending', '2025-10-20', 'xero_with_pdf', NOW(), NOW()),
('test-003', 'INV-003-PENDING', 875.50, 'QuickPrint Solutions', 'Marketing material printing', 'pending', 'pending', '2025-10-25', 'standard_pdf', NOW(), NOW()),

-- In Review invoices
('test-004', 'INV-004-REVIEW', 3200.00, 'Steel & Co Materials', 'Structural steel supply', 'in_review', 'in_review', '2025-11-01', 'xero_with_pdf', NOW(), NOW()),
('test-005', 'INV-005-REVIEW', 1100.25, 'Professional Cleaning Co', 'Monthly cleaning services', 'in_review', 'in_review', '2025-11-05', 'standard_pdf', NOW(), NOW()),

-- Approved invoices
('test-006', 'INV-006-APPROVED', 4500.00, 'Tech Solutions Australia', 'IT equipment purchase', 'approved', 'approved', '2025-11-10', 'xero_links_only', NOW(), NOW()),
('test-007', 'INV-007-APPROVED', 850.00, 'Office Supplies Direct', 'Stationery and supplies', 'approved', 'approved', '2025-11-12', 'standard_pdf', NOW(), NOW()),

-- Paid invoices
('test-008', 'INV-008-PAID', 2800.00, 'Legal Services Group', 'Contract review services', 'paid', 'paid', '2025-09-15', 'xero_with_pdf', NOW(), NOW()),
('test-009', 'INV-009-PAID', 1650.00, 'Marketing Agency Plus', 'Brand design work', 'paid', 'paid', '2025-09-20', 'standard_pdf', NOW(), NOW()),

-- Overdue invoices
('test-010', 'INV-010-OVERDUE', 3750.00, 'Heavy Machinery Rentals', 'Equipment rental fees', 'overdue', 'overdue', '2025-09-01', 'xero_with_pdf', NOW(), NOW()),
('test-011', 'INV-011-OVERDUE', 950.00, 'Urgent Repairs Ltd', 'Emergency repair work', 'overdue', 'overdue', '2025-08-25', 'standard_pdf', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    invoice_number = EXCLUDED.invoice_number,
    amount = EXCLUDED.amount,
    vendor = EXCLUDED.vendor,
    subject = EXCLUDED.subject,
    status = EXCLUDED.status,
    payment_status = EXCLUDED.payment_status,
    due_date = EXCLUDED.due_date,
    category = EXCLUDED.category,
    updated_at = NOW();

-- 3. Add some sample audit log entries to show history
INSERT INTO "audit_logs" (
    invoice_id,
    old_status,
    new_status,
    user_email,
    action_type,
    metadata,
    created_at
) VALUES
('test-004', 'pending', 'in_review', 'test@example.com', 'status_change',
 '{"timestamp": "2025-09-20T10:30:00Z", "user_agent": "Test Browser", "ip_address": "127.0.0.1"}',
 NOW() - INTERVAL '2 hours'),

('test-006', 'in_review', 'approved', 'test@example.com', 'status_change',
 '{"timestamp": "2025-09-20T14:15:00Z", "user_agent": "Test Browser", "ip_address": "127.0.0.1"}',
 NOW() - INTERVAL '1 hour'),

('test-008', 'approved', 'paid', 'test@example.com', 'status_change',
 '{"timestamp": "2025-09-19T16:45:00Z", "user_agent": "Test Browser", "ip_address": "127.0.0.1"}',
 NOW() - INTERVAL '1 day');

-- 4. Verify the data
SELECT
    'Invoice Count by Status' as summary,
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM invoices
WHERE id LIKE 'test-%'
GROUP BY status
ORDER BY
    CASE status
        WHEN 'pending' THEN 1
        WHEN 'in_review' THEN 2
        WHEN 'approved' THEN 3
        WHEN 'paid' THEN 4
        WHEN 'overdue' THEN 5
        ELSE 6
    END;

-- Show audit log entries
SELECT
    'Audit Log Entries' as summary,
    invoice_id,
    old_status,
    new_status,
    user_email,
    created_at
FROM "audit_logs"
ORDER BY created_at DESC;

-- Final verification - show all test invoices
SELECT
    'All Test Invoices' as summary,
    id,
    invoice_number,
    vendor,
    amount,
    status,
    due_date
FROM invoices
WHERE id LIKE 'test-%'
ORDER BY status, invoice_number;