-- Storage Policies Setup (Step 2 only - bucket already created)
-- Run this in Supabase Dashboard > SQL Editor

-- Helper function to extract tenant_id from file path
-- File path format: {tenant_id}/logo.{ext}
CREATE OR REPLACE FUNCTION get_tenant_id_from_path(file_path TEXT)
RETURNS UUID AS $$
BEGIN
  RETURN (string_to_array(file_path, '/'))[1]::uuid;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Policy: Allow tenant admins to upload logos to their tenant folder
DROP POLICY IF EXISTS "Tenant admins can upload logos" ON storage.objects;
CREATE POLICY "Tenant admins can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-logos' AND
  is_tenant_admin_for_storage(get_tenant_id_from_path(name))
);

-- Policy: Allow public read access to logos
DROP POLICY IF EXISTS "Public can view tenant logos" ON storage.objects;
CREATE POLICY "Public can view tenant logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tenant-logos');

-- Policy: Allow tenant admins to update their tenant's logo
DROP POLICY IF EXISTS "Tenant admins can update logos" ON storage.objects;
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
DROP POLICY IF EXISTS "Tenant admins can delete logos" ON storage.objects;
CREATE POLICY "Tenant admins can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-logos' AND
  is_tenant_admin_for_storage(get_tenant_id_from_path(name))
);

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE '✅ Storage policies created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '  - Tenant admins can upload logos';
  RAISE NOTICE '  - Public can view tenant logos';
  RAISE NOTICE '  - Tenant admins can update logos';
  RAISE NOTICE '  - Tenant admins can delete logos';
END $$;

