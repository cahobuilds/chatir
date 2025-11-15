-- Setup script for tenant logo storage
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Create storage bucket for tenant logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-logos',
  'tenant-logos',
  true, -- Public bucket so logos can be accessed via URL
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create storage policies for tenant logos

-- Helper function to extract tenant_id from file path
-- File path format: {tenant_id}/logo.{ext}
CREATE OR REPLACE FUNCTION get_tenant_id_from_path(file_path TEXT)
RETURNS UUID AS $$
BEGIN
  RETURN (string_to_array(file_path, '/'))[1]::uuid;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Policy: Allow tenant admins to upload logos to their tenant folder
CREATE POLICY "Tenant admins can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-logos' AND
  is_tenant_admin_for_storage(get_tenant_id_from_path(name))
);

-- Policy: Allow public read access to logos
CREATE POLICY "Public can view tenant logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tenant-logos');

-- Policy: Allow tenant admins to update their tenant's logo
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

-- Note: The folder structure will be: tenant-logos/{tenant_id}/logo.{ext}

