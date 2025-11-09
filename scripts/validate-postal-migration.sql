-- Postal Invoice Migration Validation Queries
-- Run these queries after migration to verify data integrity

-- ============================================================================
-- 1. Count postal invoices
-- ============================================================================
SELECT 
    'Total postal_ocr invoices' AS metric,
    COUNT(*) AS count
FROM invoices
WHERE source = 'postal_ocr';

-- ============================================================================
-- 2. Compare totals
-- ============================================================================
SELECT 
    'Sum of postal_ocr invoice totals' AS metric,
    SUM(total) AS total_amount,
    AVG(total) AS avg_amount,
    MIN(total) AS min_amount,
    MAX(total) AS max_amount
FROM invoices
WHERE source = 'postal_ocr' AND total IS NOT NULL;

-- ============================================================================
-- 3. Data completeness check
-- ============================================================================
SELECT 
    COUNT(*) AS total_rows,
    COUNT(invoice_number) AS has_invoice_number,
    COUNT(supplier_name) AS has_supplier_name,
    COUNT(total) AS has_total,
    COUNT(file_checksum) AS has_file_checksum,
    COUNT(file_url) AS has_file_url,
    COUNT(ocr_confidence) AS has_ocr_confidence
FROM invoices
WHERE source = 'postal_ocr';

-- ============================================================================
-- 4. List invoices without file_checksum (potential issues)
-- ============================================================================
SELECT 
    id,
    invoice_number,
    supplier_name,
    total,
    file_name,
    created_at
FROM invoices
WHERE source = 'postal_ocr' 
    AND file_checksum IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 5. Check for potential duplicates within postal_ocr
-- ============================================================================
SELECT 
    invoice_number,
    COUNT(*) AS duplicate_count,
    ARRAY_AGG(id) AS invoice_ids,
    ARRAY_AGG(file_name) AS file_names
FROM invoices
WHERE source = 'postal_ocr' 
    AND invoice_number IS NOT NULL
GROUP BY invoice_number
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ============================================================================
-- 6. Check for duplicates across all sources (same invoice_number)
-- ============================================================================
SELECT 
    invoice_number,
    COUNT(*) AS total_count,
    ARRAY_AGG(DISTINCT source) AS sources,
    ARRAY_AGG(id) AS invoice_ids
FROM invoices
WHERE invoice_number IN (
    SELECT invoice_number 
    FROM invoices 
    WHERE source = 'postal_ocr' AND invoice_number IS NOT NULL
)
GROUP BY invoice_number
HAVING COUNT(*) > 1
ORDER BY total_count DESC;

-- ============================================================================
-- 7. Check postal_ingest_log statistics
-- ============================================================================
SELECT 
    status,
    COUNT(*) AS count,
    COUNT(DISTINCT file_checksum) AS unique_files
FROM postal_ingest_log
GROUP BY status
ORDER BY count DESC;

-- ============================================================================
-- 8. Recent postal_ingest_log entries
-- ============================================================================
SELECT 
    file_name,
    status,
    reason,
    invoice_number,
    created_at
FROM postal_ingest_log
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- 9. Failed migrations (exceptions)
-- ============================================================================
SELECT 
    file_name,
    reason,
    invoice_number,
    created_at
FROM postal_ingest_log
WHERE status = 'exception'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 10. Invoice date distribution
-- ============================================================================
SELECT 
    DATE_TRUNC('month', invoice_date::date) AS month,
    COUNT(*) AS invoice_count,
    SUM(total) AS total_amount
FROM invoices
WHERE source = 'postal_ocr' 
    AND invoice_date IS NOT NULL
GROUP BY DATE_TRUNC('month', invoice_date::date)
ORDER BY month DESC;

-- ============================================================================
-- 11. Top suppliers by invoice count
-- ============================================================================
SELECT 
    supplier_name,
    COUNT(*) AS invoice_count,
    SUM(total) AS total_amount,
    AVG(total) AS avg_amount
FROM invoices
WHERE source = 'postal_ocr' 
    AND supplier_name IS NOT NULL
GROUP BY supplier_name
ORDER BY invoice_count DESC
LIMIT 10;

-- ============================================================================
-- 12. OCR confidence distribution
-- ============================================================================
SELECT 
    CASE 
        WHEN ocr_confidence >= 0.9 THEN 'High (0.9-1.0)'
        WHEN ocr_confidence >= 0.7 THEN 'Medium (0.7-0.9)'
        WHEN ocr_confidence >= 0.5 THEN 'Low (0.5-0.7)'
        ELSE 'Very Low (<0.5)'
    END AS confidence_range,
    COUNT(*) AS count
FROM invoices
WHERE source = 'postal_ocr' 
    AND ocr_confidence IS NOT NULL
GROUP BY confidence_range
ORDER BY MIN(ocr_confidence) DESC;

-- ============================================================================
-- 13. Compare postal vs other sources
-- ============================================================================
SELECT 
    source,
    COUNT(*) AS invoice_count,
    SUM(total) AS total_amount,
    AVG(total) AS avg_amount,
    MIN(created_at) AS earliest,
    MAX(created_at) AS latest
FROM invoices
WHERE source IS NOT NULL
GROUP BY source
ORDER BY invoice_count DESC;

-- ============================================================================
-- 14. Missing critical fields
-- ============================================================================
SELECT 
    'Missing supplier_name' AS issue,
    COUNT(*) AS count
FROM invoices
WHERE source = 'postal_ocr' AND supplier_name IS NULL

UNION ALL

SELECT 
    'Missing total' AS issue,
    COUNT(*) AS count
FROM invoices
WHERE source = 'postal_ocr' AND (total IS NULL OR total <= 0)

UNION ALL

SELECT 
    'Missing invoice_number' AS issue,
    COUNT(*) AS count
FROM invoices
WHERE source = 'postal_ocr' AND invoice_number IS NULL

UNION ALL

SELECT 
    'Missing file_url' AS issue,
    COUNT(*) AS count
FROM invoices
WHERE source = 'postal_ocr' AND file_url IS NULL;

-- ============================================================================
-- 15. Sample of successfully migrated invoices
-- ============================================================================
SELECT 
    id,
    invoice_number,
    invoice_date,
    supplier_name,
    total,
    file_name,
    ocr_confidence,
    created_at
FROM invoices
WHERE source = 'postal_ocr'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- Validation complete
-- ============================================================================
SELECT 'Postal invoice migration validation queries completed!' AS status;

