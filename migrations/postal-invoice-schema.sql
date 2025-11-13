-- Postal Invoice Schema Migration
-- This script adds required columns for postal invoice ingestion
-- and creates the postal_ingest_log table for tracking processing

-- ============================================================================
-- PART 1: Add missing columns to invoices table (if they don't exist)
-- ============================================================================

-- Add source column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'source'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN source TEXT;
        COMMENT ON COLUMN "Invoice".source IS 'Invoice source identifier (e.g., postal_ocr, xero, frank, taxcellent)';
    END IF;
END $$;

-- Add file_checksum column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'file_checksum'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN file_checksum TEXT;
        COMMENT ON COLUMN "Invoice".file_checksum IS 'SHA-256 hash of the source file for deduplication';
    END IF;
END $$;

-- Add file_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'file_name'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN file_name TEXT;
        COMMENT ON COLUMN "Invoice".file_name IS 'Original filename of the invoice document';
    END IF;
END $$;

-- Add file_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'file_url'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN file_url TEXT;
        COMMENT ON COLUMN "Invoice".file_url IS 'OneDrive/SharePoint URL to the archived invoice file';
    END IF;
END $$;

-- Add ocr_confidence column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'ocr_confidence'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN ocr_confidence NUMERIC;
        COMMENT ON COLUMN "Invoice".ocr_confidence IS 'OCR confidence score (0-1) for quality tracking';
    END IF;
END $$;

-- Add ocr_model column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'ocr_model'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN ocr_model TEXT;
        COMMENT ON COLUMN "Invoice".ocr_model IS 'OpenAI model used for OCR extraction (e.g., gpt-4o-mini)';
    END IF;
END $$;

-- Add message_id column if it doesn't exist (for email-based workflows)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'message_id'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN message_id TEXT;
        COMMENT ON COLUMN "Invoice".message_id IS 'Outlook message ID for email-based invoice workflows';
    END IF;
END $$;

-- ============================================================================
-- PART 2: Create indexes for performance and deduplication
-- ============================================================================

-- Index on file_checksum for deduplication
CREATE INDEX IF NOT EXISTS idx_invoices_file_checksum 
ON "Invoice"(file_checksum) 
WHERE file_checksum IS NOT NULL;

-- Composite index on invoice_number + source for deduplication
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number_source 
ON "Invoice"(invoice_number, source) 
WHERE invoice_number IS NOT NULL;

-- Index on source for filtering
CREATE INDEX IF NOT EXISTS idx_invoices_source 
ON "Invoice"(source) 
WHERE source IS NOT NULL;

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_invoices_created_at 
ON "Invoice"(created_at DESC);

-- ============================================================================
-- PART 3: Create postal_ingest_log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS postal_ingest_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_checksum TEXT,
    status TEXT NOT NULL CHECK (status IN ('processed', 'skipped_duplicate', 'exception')),
    reason TEXT,
    invoice_number TEXT,
    supabase_id UUID,
    execution_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE postal_ingest_log IS 'Audit log for postal invoice OCR processing';
COMMENT ON COLUMN postal_ingest_log.file_name IS 'Name of the processed file';
COMMENT ON COLUMN postal_ingest_log.file_checksum IS 'SHA-256 hash of the file';
COMMENT ON COLUMN postal_ingest_log.status IS 'Processing status: processed, skipped_duplicate, or exception';
COMMENT ON COLUMN postal_ingest_log.reason IS 'Reason for exception or skip (if applicable)';
COMMENT ON COLUMN postal_ingest_log.invoice_number IS 'Extracted invoice number (if available)';
COMMENT ON COLUMN postal_ingest_log.supabase_id IS 'Reference to invoices.id (if inserted)';
COMMENT ON COLUMN postal_ingest_log.execution_id IS 'n8n execution ID or script run identifier';

-- Create indexes on postal_ingest_log
CREATE INDEX IF NOT EXISTS idx_postal_ingest_log_file_checksum 
ON postal_ingest_log(file_checksum);

CREATE INDEX IF NOT EXISTS idx_postal_ingest_log_status 
ON postal_ingest_log(status);

CREATE INDEX IF NOT EXISTS idx_postal_ingest_log_created_at 
ON postal_ingest_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_postal_ingest_log_supabase_id 
ON postal_ingest_log(supabase_id) 
WHERE supabase_id IS NOT NULL;

-- ============================================================================
-- PART 4: Enable Row Level Security (RLS) on postal_ingest_log
-- ============================================================================

ALTER TABLE postal_ingest_log ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read postal_ingest_log
DROP POLICY IF EXISTS "Users can read postal_ingest_log" ON postal_ingest_log;
CREATE POLICY "Users can read postal_ingest_log" ON postal_ingest_log
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy to allow service role to insert into postal_ingest_log
DROP POLICY IF EXISTS "Service role can insert postal_ingest_log" ON postal_ingest_log;
CREATE POLICY "Service role can insert postal_ingest_log" ON postal_ingest_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON postal_ingest_log TO authenticated;
GRANT INSERT ON postal_ingest_log TO service_role;

-- ============================================================================
-- PART 5: Validation queries
-- ============================================================================

-- Check that all columns were added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'Invoice'
    AND column_name IN (
        'source', 'file_checksum', 'file_name', 'file_url', 
        'ocr_confidence', 'ocr_model', 'message_id'
    )
ORDER BY column_name;

-- Check postal_ingest_log table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'postal_ingest_log'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('Invoice', 'postal_ingest_log')
    AND (indexname LIKE '%postal%' OR indexname LIKE '%file_checksum%' OR indexname LIKE '%source%')
ORDER BY tablename, indexname;

-- ============================================================================
-- Migration complete
-- ============================================================================

SELECT 'Postal invoice schema migration completed successfully!' AS status;

