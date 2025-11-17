-- Migration Status Check Script
-- Run this in Supabase SQL Editor to verify if the agent_folders RLS fix migration has been applied
-- Migration: 20251115000000_fix_agent_folders_rls_recursion.sql

-- ============================================================================
-- CHECK 1: Verify is_folder_admin function exists
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'is_folder_admin'
    ) THEN
        RAISE NOTICE '✅ CHECK 1 PASSED: is_folder_admin function exists';
    ELSE
        RAISE WARNING '❌ CHECK 1 FAILED: is_folder_admin function does NOT exist';
    END IF;
END $$;

-- ============================================================================
-- CHECK 2: Verify get_user_tenant_ids function exists and includes status check
-- ============================================================================
DO $$
DECLARE
    func_source TEXT;
BEGIN
    SELECT prosrc INTO func_source
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'get_user_tenant_ids';
    
    IF func_source IS NULL THEN
        RAISE WARNING '❌ CHECK 2 FAILED: get_user_tenant_ids function does NOT exist';
    ELSIF func_source LIKE '%status = ''active''%' OR func_source LIKE '%status = ''active''%' THEN
        RAISE NOTICE '✅ CHECK 2 PASSED: get_user_tenant_ids function exists and includes status check';
    ELSE
        RAISE WARNING '⚠️  CHECK 2 WARNING: get_user_tenant_ids function exists but may not have status check';
        RAISE NOTICE '   Function source: %', LEFT(func_source, 200);
    END IF;
END $$;

-- ============================================================================
-- CHECK 3: Verify agent_folders table exists
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_folders'
    ) THEN
        RAISE NOTICE '✅ CHECK 3 PASSED: agent_folders table exists';
    ELSE
        RAISE WARNING '❌ CHECK 3 FAILED: agent_folders table does NOT exist';
    END IF;
END $$;

-- ============================================================================
-- CHECK 4: Verify RLS is enabled on agent_folders
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public' 
        AND t.tablename = 'agent_folders'
        AND c.relrowsecurity = true
    ) THEN
        RAISE NOTICE '✅ CHECK 4 PASSED: RLS is enabled on agent_folders table';
    ELSE
        RAISE WARNING '❌ CHECK 4 FAILED: RLS is NOT enabled on agent_folders table';
    END IF;
END $$;

-- ============================================================================
-- CHECK 5: Verify policies exist and use helper functions
-- ============================================================================
DO $$
DECLARE
    policy_count INTEGER;
    policies_using_helpers INTEGER;
BEGIN
    -- Count total policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'agent_folders';
    
    -- Count policies using helper functions
    SELECT COUNT(*) INTO policies_using_helpers
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'agent_folders'
    AND (
        qual::text LIKE '%get_user_tenant_ids%' 
        OR qual::text LIKE '%is_folder_admin%'
    );
    
    IF policy_count = 0 THEN
        RAISE WARNING '❌ CHECK 5 FAILED: No RLS policies found on agent_folders';
    ELSIF policies_using_helpers = policy_count THEN
        RAISE NOTICE '✅ CHECK 5 PASSED: All policies use helper functions (migration applied)';
        RAISE NOTICE '   Found % policies, all using helper functions', policy_count;
    ELSIF policies_using_helpers > 0 THEN
        RAISE WARNING '⚠️  CHECK 5 WARNING: Some policies use helper functions, but not all';
        RAISE NOTICE '   Total policies: %, Using helpers: %', policy_count, policies_using_helpers;
    ELSE
        RAISE WARNING '❌ CHECK 5 FAILED: Policies exist but do NOT use helper functions';
        RAISE NOTICE '   This indicates the migration has NOT been applied';
        RAISE NOTICE '   Total policies found: %', policy_count;
    END IF;
END $$;

-- ============================================================================
-- CHECK 6: List all policies for inspection
-- ============================================================================
SELECT 
    'Policy Details' as check_type,
    policyname as policy_name,
    CASE 
        WHEN qual::text LIKE '%get_user_tenant_ids%' THEN '✅ Uses get_user_tenant_ids'
        WHEN qual::text LIKE '%is_folder_admin%' THEN '✅ Uses is_folder_admin'
        WHEN qual::text LIKE '%user_tenants%' AND qual::text NOT LIKE '%get_user_tenant_ids%' THEN '❌ Directly queries user_tenants (recursion risk)'
        ELSE '⚠️  Unknown pattern'
    END as status,
    LEFT(qual::text, 150) as policy_definition
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'agent_folders'
ORDER BY policyname;

-- ============================================================================
-- SUMMARY
-- ============================================================================
DO $$
DECLARE
    func_exists BOOLEAN;
    table_exists BOOLEAN;
    rls_enabled BOOLEAN;
    policies_ok BOOLEAN;
BEGIN
    -- Check function
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'is_folder_admin'
    ) INTO func_exists;
    
    -- Check table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'agent_folders'
    ) INTO table_exists;
    
    -- Check RLS
    SELECT EXISTS (
        SELECT 1 FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public' AND t.tablename = 'agent_folders' AND c.relrowsecurity = true
    ) INTO rls_enabled;
    
    -- Check policies
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'agent_folders'
        AND (qual::text LIKE '%get_user_tenant_ids%' OR qual::text LIKE '%is_folder_admin%')
    ) INTO policies_ok;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'MIGRATION STATUS SUMMARY';
    RAISE NOTICE '============================================================';
    
    IF func_exists AND table_exists AND rls_enabled AND policies_ok THEN
        RAISE NOTICE '✅ MIGRATION APPEARS TO BE APPLIED';
        RAISE NOTICE '';
        RAISE NOTICE 'All checks passed. The agent_folders RLS fix migration';
        RAISE NOTICE 'has been successfully applied.';
    ELSE
        RAISE WARNING '❌ MIGRATION MAY NOT BE FULLY APPLIED';
        RAISE NOTICE '';
        RAISE NOTICE 'Some checks failed. Please apply the migration:';
        RAISE NOTICE 'supabase/migrations/20251115000000_fix_agent_folders_rls_recursion.sql';
        RAISE NOTICE '';
        RAISE NOTICE 'Check results:';
        RAISE NOTICE '  is_folder_admin function: %', CASE WHEN func_exists THEN '✅' ELSE '❌' END;
        RAISE NOTICE '  agent_folders table: %', CASE WHEN table_exists THEN '✅' ELSE '❌' END;
        RAISE NOTICE '  RLS enabled: %', CASE WHEN rls_enabled THEN '✅' ELSE '❌' END;
        RAISE NOTICE '  Policies using helpers: %', CASE WHEN policies_ok THEN '✅' ELSE '❌' END;
    END IF;
    
    RAISE NOTICE '============================================================';
END $$;

