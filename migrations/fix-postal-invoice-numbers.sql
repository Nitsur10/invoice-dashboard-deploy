-- ============================================================================
-- Fix Long POSTAL Invoice Numbers
-- ============================================================================
-- Description: Fix invoice numbers with corrupted format
--              POSTAL-5C3E38A6-2-3-4-5-... → POSTAL-5C3E38A6
-- Created: 2025-11-14
-- Issue: Dashboard showing long corrupted POSTAL invoice numbers
-- ============================================================================

-- Step 1: Find affected invoices
SELECT
    id,
    invoice_number,
    LENGTH(invoice_number) as current_length,
    SUBSTRING(invoice_number FROM 1 FOR 16) as fixed_number,
    supplier_name,
    total,
    invoice_date
FROM "Invoice"
WHERE invoice_number LIKE 'POSTAL-%-%'
  AND LENGTH(invoice_number) > 16
ORDER BY LENGTH(invoice_number) DESC;

-- Expected output: Shows all invoices with long POSTAL numbers
-- Normal format: POSTAL-5C3E38A6 (16 chars)
-- Corrupted format: POSTAL-5C3E38A6-2-3-4-... (50+ chars)

-- ============================================================================
-- Step 2: Preview the fix (DRY RUN)
-- ============================================================================
SELECT
    id,
    invoice_number as old_number,
    SUBSTRING(invoice_number FROM 1 FOR 16) as new_number,
    LENGTH(invoice_number) - 16 as chars_to_remove
FROM "Invoice"
WHERE invoice_number LIKE 'POSTAL-%-%'
  AND LENGTH(invoice_number) > 16;

-- ============================================================================
-- Step 3: Apply the fix (UPDATE)
-- ============================================================================
-- IMPORTANT: Review the preview above before running this!

UPDATE "Invoice"
SET invoice_number = SUBSTRING(invoice_number FROM 1 FOR 16)
WHERE invoice_number LIKE 'POSTAL-%-%'
  AND LENGTH(invoice_number) > 16;

-- Expected result: X rows updated (where X = count from Step 1)

-- ============================================================================
-- Step 4: Verify the fix
-- ============================================================================
SELECT
    COUNT(*) as total_postal_invoices,
    COUNT(CASE WHEN LENGTH(invoice_number) > 16 THEN 1 END) as still_long,
    COUNT(CASE WHEN LENGTH(invoice_number) = 16 THEN 1 END) as correct_length
FROM "Invoice"
WHERE invoice_number LIKE 'POSTAL-%';

-- Expected result:
-- total_postal_invoices | still_long | correct_length
-- ----------------------|------------|---------------
--                    74 |          0 |             74

-- ============================================================================
-- Step 5: Check for any duplicates created by the fix
-- ============================================================================
SELECT
    invoice_number,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id) as invoice_ids
FROM "Invoice"
WHERE invoice_number LIKE 'POSTAL-%'
GROUP BY invoice_number
HAVING COUNT(*) > 1;

-- Expected result: 0 rows (no duplicates)
-- If duplicates exist, they need manual review

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- If you need to rollback, you'll need to restore from backup
-- This is why Step 2 (preview) is important!

-- Alternative: If you have the old values in a backup table:
-- UPDATE "Invoice" i
-- SET invoice_number = b.old_invoice_number
-- FROM invoice_backup b
-- WHERE i.id = b.id
--   AND i.invoice_number LIKE 'POSTAL-%'
--   AND LENGTH(i.invoice_number) = 16;
