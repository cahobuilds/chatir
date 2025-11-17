-- Combined Migration: Create agent_folders table with correct RLS policies
-- This combines both migrations to create the table with the fixed policies from the start
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. Create agent_folders table
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES agent_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure folder names are unique within a tenant
  UNIQUE(tenant_id, name)
);

-- ============================================================================
-- 2. Add folder_id to agents table (if it doesn't exist)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agents') THEN
    ALTER TABLE agents
      ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES agent_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 3. Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_agent_folders_tenant ON agent_folders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_folders_parent ON agent_folders(parent_id);

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agents') THEN
    CREATE INDEX IF NOT EXISTS idx_agents_folder ON agents(folder_id);
  END IF;
END $$;

-- ============================================================================
-- 4. Enable RLS on agent_folders
-- ============================================================================
ALTER TABLE agent_folders ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Update get_user_tenant_ids function to include status check
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT tenant_id FROM user_tenants
  WHERE user_id = auth.uid()
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 6. Create is_folder_admin helper function
-- ============================================================================
CREATE OR REPLACE FUNCTION is_folder_admin(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = auth.uid()
      AND tenant_id = check_tenant_id
      AND role IN ('tenant_admin', 'super_admin', 'organization_admin', 'system_admin')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 7. Drop existing policies if they exist (to avoid conflicts)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view folders in their tenant" ON agent_folders;
DROP POLICY IF EXISTS "Admins can manage folders in their tenant" ON agent_folders;

-- ============================================================================
-- 8. Create RLS policies using helper functions (NO RECURSION)
-- ============================================================================
-- Users can view folders in their tenant
CREATE POLICY "Users can view folders in their tenant"
  ON agent_folders FOR SELECT
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Admins can manage folders in their tenant
CREATE POLICY "Admins can manage folders in their tenant"
  ON agent_folders FOR ALL
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    AND is_folder_admin(tenant_id)
  );

-- ============================================================================
-- 9. Add updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_agent_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_agent_folders_updated_at ON agent_folders;
CREATE TRIGGER update_agent_folders_updated_at
  BEFORE UPDATE ON agent_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_folders_updated_at();

-- ============================================================================
-- 10. Add table comment
-- ============================================================================
COMMENT ON TABLE agent_folders IS 'Organizational folders for grouping agents within a tenant';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '   - agent_folders table created';
  RAISE NOTICE '   - RLS policies created with helper functions (no recursion)';
  RAISE NOTICE '   - Indexes created';
  RAISE NOTICE '';
  RAISE NOTICE 'The /api/folders endpoint should now work without 500 errors.';
END $$;

