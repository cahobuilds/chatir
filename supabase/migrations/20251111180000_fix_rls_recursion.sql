-- Fix infinite recursion in user_tenants RLS policy
-- Drop existing policies
DROP POLICY IF EXISTS user_tenants_isolation ON user_tenants;
DROP POLICY IF EXISTS user_tenants_admin_access ON user_tenants;
DROP POLICY IF EXISTS user_tenants_own_access ON user_tenants;

-- Recreate helper function with proper RLS bypass
-- SECURITY DEFINER functions bypass RLS when querying tables
CREATE OR REPLACE FUNCTION is_tenant_admin(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- This function bypasses RLS due to SECURITY DEFINER
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = auth.uid()
      AND tenant_id = check_tenant_id
      AND role IN ('tenant_admin', 'super_admin')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Simple policy: users can see their own records
CREATE POLICY user_tenants_own_access ON user_tenants
  FOR SELECT
  USING (user_id = auth.uid());

-- Admin policy: uses SECURITY DEFINER function to avoid recursion
CREATE POLICY user_tenants_admin_access ON user_tenants
  FOR ALL
  USING (
    user_id = auth.uid() 
    OR is_tenant_admin(tenant_id)
  );

