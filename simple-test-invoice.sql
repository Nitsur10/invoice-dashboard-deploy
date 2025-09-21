-- Simple test invoice that should definitely work
-- Run this in your Supabase SQL Editor

-- First, let's see what columns exist in your invoices table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- Insert a single test invoice (adjust column names as needed)
INSERT INTO invoices (
    invoice_number,
    amount,
    supplier_name,
    status,
    created_at
) VALUES (
    'SIMPLE-TEST-001',
    1000.00,
    'Test Vendor',
    'pending',
    NOW()
);

-- Check what we have
SELECT * FROM invoices WHERE invoice_number = 'SIMPLE-TEST-001';