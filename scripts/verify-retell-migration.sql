-- Verification script for Retell tenant connection migration
-- Run this in Supabase SQL Editor to verify the migration was applied

-- Check if columns exist
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND column_name IN (
    'retell_tenant_id',
    'retell_connection_status',
    'retell_connected_at',
    'retell_last_sync_at'
  )
ORDER BY column_name;

-- Check if indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'tenants'
  AND indexname IN (
    'idx_tenants_retell_tenant_id',
    'idx_tenants_retell_connection_status'
  )
ORDER BY indexname;

-- Check constraint on retell_connection_status
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'tenants'::regclass
  AND conname LIKE '%retell_connection_status%';

-- Summary: Expected results
-- Should see 4 columns:
-- 1. retell_tenant_id (TEXT, nullable)
-- 2. retell_connection_status (TEXT, default 'disconnected', with CHECK constraint)
-- 3. retell_connected_at (TIMESTAMPTZ, nullable)
-- 4. retell_last_sync_at (TIMESTAMPTZ, nullable)
-- 
-- Should see 2 indexes:
-- 1. idx_tenants_retell_tenant_id
-- 2. idx_tenants_retell_connection_status
--
-- Should see 1 CHECK constraint on retell_connection_status

