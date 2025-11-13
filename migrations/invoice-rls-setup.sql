-- ============================================================================
-- Invoice Table Row Level Security Setup
-- ============================================================================
-- Description: Enable RLS on Invoice table for secure multi-user access
-- Created: 2025-11-13
-- Related Issue: PR #27 - Chat Assistant Security Fixes
-- ============================================================================

-- IMPORTANT: This migration enables RLS for the Invoice table
-- Review policies based on your multi-tenancy requirements before running

-- Step 1: Enable RLS on Invoice table
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;

-- Step 2: Policy for authenticated users
-- NOTE: Current implementation uses service role for all operations
-- This policy allows authenticated users to read all invoices
-- ADJUST THIS if implementing organization-level access control
DROP POLICY IF EXISTS "Authenticated users can read invoices" ON "Invoice";
CREATE POLICY "Authenticated users can read invoices" ON "Invoice"
    FOR SELECT
    TO authenticated
    USING (true);

-- Step 3: Policy for service role (N8N ingestion, admin operations, API routes)
-- Service role must have full access for:
-- - N8N webhook invoice ingestion
-- - API routes that use supabaseAdmin client
-- - Bulk operations and migrations
DROP POLICY IF EXISTS "Service role full access" ON "Invoice";
CREATE POLICY "Service role full access" ON "Invoice"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Step 4: Policy for authenticated users to modify invoices
-- Allow updates/inserts/deletes for authenticated users
-- ADJUST THIS for organization-level access control
DROP POLICY IF EXISTS "Authenticated users can modify invoices" ON "Invoice";
CREATE POLICY "Authenticated users can modify invoices" ON "Invoice"
    FOR INSERT, UPDATE, DELETE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 5: Grant permissions
GRANT SELECT ON "Invoice" TO authenticated;
GRANT INSERT, UPDATE, DELETE ON "Invoice" TO authenticated;
GRANT ALL ON "Invoice" TO service_role;

-- Step 6: Verify RLS is enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'Invoice'
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on Invoice table!';
    END IF;

    RAISE NOTICE '✓ Invoice table RLS enabled successfully';
END $$;

-- ============================================================================
-- Validation Queries
-- ============================================================================

-- Check RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'Invoice';

-- Check policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'Invoice'
ORDER BY policyname;

-- ============================================================================
-- NOTES FOR FUTURE MULTI-TENANCY
-- ============================================================================

-- If you need organization-level isolation, add these columns:
--
-- ALTER TABLE "Invoice" ADD COLUMN organization_id UUID;
-- ALTER TABLE "Invoice" ADD COLUMN created_by_user_id TEXT;
--
-- Then update policies to filter by organization:
--
-- CREATE POLICY "Users view org invoices" ON "Invoice"
--     FOR SELECT
--     TO authenticated
--     USING (
--         organization_id = (
--             current_setting('request.jwt.claims', true)::json->>'organization_id'
--         )::UUID
--     );
