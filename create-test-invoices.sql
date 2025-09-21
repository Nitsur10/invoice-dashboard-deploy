-- Create test invoices for kanban testing
-- This assumes your existing table structure

-- Insert test invoices with different statuses for kanban testing
-- Replace with your actual table name if different

INSERT INTO invoices (
    id,
    invoice_number,
    total,
    supplier_name,
    subject,
    status,
    payment_status,
    due_date,
    invoice_date,
    category,
    created_at,
    updated_at
) VALUES

-- PENDING INVOICES (3 invoices)
(gen_random_uuid(), 'TEST-001-PENDING', 1500.00, 'ABC Construction Ltd', 'Office renovation materials', 'pending', 'pending', '2025-10-15', '2025-09-15', 'standard_pdf', NOW(), NOW()),
(gen_random_uuid(), 'TEST-002-PENDING', 2250.75, 'XYZ Electrical Services', 'Electrical installation work', 'pending', 'pending', '2025-10-20', '2025-09-18', 'xero_with_pdf', NOW(), NOW()),
(gen_random_uuid(), 'TEST-003-PENDING', 875.50, 'QuickPrint Solutions', 'Marketing material printing', 'pending', 'pending', '2025-10-25', '2025-09-20', 'standard_pdf', NOW(), NOW()),

-- IN REVIEW INVOICES (2 invoices)
(gen_random_uuid(), 'TEST-004-REVIEW', 3200.00, 'Steel & Co Materials', 'Structural steel supply', 'in_review', 'in_review', '2025-11-01', '2025-09-22', 'xero_with_pdf', NOW(), NOW()),
(gen_random_uuid(), 'TEST-005-REVIEW', 1100.25, 'Professional Cleaning Co', 'Monthly cleaning services', 'in_review', 'in_review', '2025-11-05', '2025-09-25', 'standard_pdf', NOW(), NOW()),

-- APPROVED INVOICES (2 invoices)
(gen_random_uuid(), 'TEST-006-APPROVED', 4500.00, 'Tech Solutions Australia', 'IT equipment purchase', 'approved', 'approved', '2025-11-10', '2025-09-28', 'xero_links_only', NOW(), NOW()),
(gen_random_uuid(), 'TEST-007-APPROVED', 850.00, 'Office Supplies Direct', 'Stationery and supplies', 'approved', 'approved', '2025-11-12', '2025-09-30', 'standard_pdf', NOW(), NOW()),

-- PAID INVOICES (2 invoices)
(gen_random_uuid(), 'TEST-008-PAID', 2800.00, 'Legal Services Group', 'Contract review services', 'paid', 'paid', '2025-09-15', '2025-08-15', 'xero_with_pdf', NOW(), NOW()),
(gen_random_uuid(), 'TEST-009-PAID', 1650.00, 'Marketing Agency Plus', 'Brand design work', 'paid', 'paid', '2025-09-20', '2025-08-20', 'standard_pdf', NOW(), NOW()),

-- OVERDUE INVOICES (2 invoices)
(gen_random_uuid(), 'TEST-010-OVERDUE', 3750.00, 'Heavy Machinery Rentals', 'Equipment rental fees', 'overdue', 'overdue', '2025-09-01', '2025-08-01', 'xero_with_pdf', NOW(), NOW()),
(gen_random_uuid(), 'TEST-011-OVERDUE', 950.00, 'Urgent Repairs Ltd', 'Emergency repair work', 'overdue', 'overdue', '2025-08-25', '2025-07-25', 'standard_pdf', NOW(), NOW());

-- Verify the inserted data
SELECT
    'Test Invoices by Status' as summary,
    status,
    COUNT(*) as count,
    SUM(total) as total_amount
FROM invoices
WHERE invoice_number LIKE 'TEST-%'
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

-- Show all test invoices
SELECT
    'All Test Invoices' as summary,
    invoice_number,
    supplier_name,
    total,
    status,
    due_date,
    created_at
FROM invoices
WHERE invoice_number LIKE 'TEST-%'
ORDER BY status, invoice_number;