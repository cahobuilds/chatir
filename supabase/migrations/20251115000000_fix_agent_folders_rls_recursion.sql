-- Fix RLS recursion issue in agent_folders policies
-- The policies were directly querying user_tenants which can cause infinite recursion
-- Use SECURITY DEFINER functions instead

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view folders in their tenant" ON agent_folders;
DROP POLICY IF EXISTS "Admins can manage folders in their tenant" ON agent_folders;

-- Update get_user_tenant_ids function to include status check for consistency
-- This ensures only active tenant memberships are considered
-- Note: This function already exists from initial schema, we're just updating it
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT tenant_id FROM user_tenants
  WHERE user_id = auth.uid()
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user is admin for a tenant (includes all admin roles)
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

-- Recreate policies using helper functions to avoid recursion
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

