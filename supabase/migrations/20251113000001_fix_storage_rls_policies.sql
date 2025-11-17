-- Fix storage RLS policies for tenant logo uploads
-- This migration ensures that upsert operations work correctly

-- Ensure the helper function exists and is correct
CREATE OR REPLACE FUNCTION is_tenant_admin_for_storage(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_id_param
      AND role IN ('tenant_admin', 'super_admin', 'organization_admin')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Ensure the path extraction function exists
CREATE OR REPLACE FUNCTION get_tenant_id_from_path(file_path TEXT)
RETURNS UUID AS $$
DECLARE
  path_parts TEXT[];
BEGIN
  -- Handle both {tenant_id}/logo.{ext} and just {tenant_id} formats
  path_parts := string_to_array(file_path, '/');
  IF array_length(path_parts, 1) > 0 THEN
    RETURN path_parts[1]::uuid;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Tenant admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant admins can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view tenant logos" ON storage.objects;

-- Policy: Allow tenant admins to upload logos to their tenant folder
-- This handles INSERT operations
CREATE POLICY "Tenant admins can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-logos' AND
  is_tenant_admin_for_storage(get_tenant_id_from_path(name))
);

-- Policy: Allow tenant admins to update their tenant's logo
-- This handles UPDATE operations (used by upsert)
CREATE POLICY "Tenant admins can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tenant-logos' AND
  is_tenant_admin_for_storage(get_tenant_id_from_path(name))
)
WITH CHECK (
  bucket_id = 'tenant-logos' AND
  is_tenant_admin_for_storage(get_tenant_id_from_path(name))
);

-- Policy: Allow tenant admins to delete their tenant's logo
CREATE POLICY "Tenant admins can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-logos' AND
  is_tenant_admin_for_storage(get_tenant_id_from_path(name))
);

-- Policy: Allow public read access to logos
CREATE POLICY "Public can view tenant logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tenant-logos');

