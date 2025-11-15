-- Migration to add system_admin role to user_tenants table
-- This allows system_admin role in addition to the legacy roles

-- Drop the existing constraint
ALTER TABLE user_tenants 
DROP CONSTRAINT IF EXISTS user_tenants_role_check;

-- Add new constraint that includes system_admin
ALTER TABLE user_tenants 
ADD CONSTRAINT user_tenants_role_check 
CHECK (role IN ('system_admin', 'super_admin', 'tenant_admin', 'subtenant_admin', 'agent', 'viewer'));

-- Add comment
COMMENT ON COLUMN user_tenants.role IS 'User role: system_admin (full platform access), super_admin (tenant admin), tenant_admin, subtenant_admin, agent, or viewer';

