-- Migration: Add tenant logo storage support
-- This migration sets up Supabase Storage for tenant logos and updates RLS policies

-- Create storage bucket for tenant logos (if not exists)
-- Note: This needs to be run manually in Supabase Dashboard or via Supabase CLI
-- The bucket will be created with the name 'tenant-logos'

-- Update tenants table to ensure branding JSONB has logo_url field structure
-- The branding field already exists, we just need to ensure it can store logo_url

-- Create function to check if user is tenant admin (for storage policies)
CREATE OR REPLACE FUNCTION is_tenant_admin_for_storage(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_id_param
      AND role IN ('tenant_admin', 'super_admin')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add RLS policy for tenants UPDATE to allow admins to update branding
-- Only create if it doesn't exist (check by attempting to create and catching error)
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS tenant_admin_update_branding ON tenants;
  
  -- Create the policy
  CREATE POLICY tenant_admin_update_branding ON tenants
    FOR UPDATE
    USING (
      id IN (
        SELECT tenant_id FROM user_tenants
        WHERE user_id = auth.uid()
          AND role IN ('tenant_admin', 'super_admin')
          AND status = 'active'
      )
    )
    WITH CHECK (
      id IN (
        SELECT tenant_id FROM user_tenants
        WHERE user_id = auth.uid()
          AND role IN ('tenant_admin', 'super_admin')
          AND status = 'active'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN
    -- Policy already exists, that's fine
    NULL;
END $$;

-- Note: Storage bucket and policies need to be created via Supabase Dashboard or CLI
-- See the setup script in scripts/setup-tenant-storage.sql

