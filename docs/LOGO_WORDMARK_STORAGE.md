# Logo and Wordmark Storage Architecture

## Overview

**Logos and wordmarks are NOT stored in a database table.** They are stored in **Supabase Storage** (object storage), and the URLs are stored in the `tenants.branding` JSONB field.

## Storage Structure

### 1. Database Table: `tenants`

The `tenants` table has a `branding` JSONB column that stores logo metadata:

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  branding JSONB DEFAULT '{}'::jsonb,  -- Stores logo_url and other branding
  ...
);
```

**Current branding structure:**
```json
{
  "logo_url": "https://xxxxx.supabase.co/storage/v1/object/public/tenant-logos/{tenant-id}/logo.png",
  "logo_updated_at": "2025-01-20T10:30:00Z",
  "primaryColor": "#3B82F6",
  "secondaryColor": "#8B5CF6",
  "favicon": "..."
}
```

### 2. Storage Bucket: `tenant-logos`

Logos are stored in a Supabase Storage bucket called `tenant-logos`:

- **Bucket Name**: `tenant-logos`
- **Public Access**: Yes (logos need to be publicly accessible)
- **File Size Limit**: 5MB
- **Allowed MIME Types**: 
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`
  - `image/svg+xml`

**File Path Structure:**
```
tenant-logos/
  └── {tenant-id}/
      └── logo.{ext}
```

Example:
```
tenant-logos/
  └── 550e8400-e29b-41d4-a716-446655440000/
      └── logo.png
```

## Migrations

### Main Logo Storage Migration
**File**: `supabase/migrations/20251112000005_add_tenant_logo_storage.sql`

This migration:
- Creates helper function `is_tenant_admin_for_storage()` for RLS policies
- Adds RLS policy `tenant_admin_update_branding` to allow admins to update branding

### Storage Policies Migration
**File**: `supabase/migrations/20251112000006_setup_storage_policies.sql`

This migration:
- Creates helper function `get_tenant_id_from_path()` to extract tenant ID from file path
- Creates RLS policies for storage bucket:
  - `Tenant admins can upload logos`
  - `Tenant admins can update logos`
  - `Tenant admins can delete logos`
  - `Public can view tenant logos`

### Storage Bucket Setup
**File**: `scripts/setup-tenant-storage.sql`

This script creates the storage bucket (run manually in Supabase Dashboard or via CLI):

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-logos',
  'tenant-logos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;
```

## API Endpoints

### Upload Logo
**POST** `/api/tenants/[id]/logo`

- Accepts multipart/form-data with `file` field
- Validates file type and size
- Uploads to `tenant-logos/{tenant-id}/logo.{ext}`
- Updates `tenants.branding.logo_url` with public URL

### Delete Logo
**DELETE** `/api/tenants/[id]/logo`

- Deletes all logo files for the tenant
- Removes `logo_url` from `tenants.branding`

## Adding Wordmark Support

Currently, **wordmarks are not implemented**, but they can be added using the same pattern:

### Option 1: Same Storage Bucket (Recommended)

Store wordmarks in the same `tenant-logos` bucket with a different path:

```
tenant-logos/
  └── {tenant-id}/
      ├── logo.{ext}
      └── wordmark.{ext}
```

**Update branding structure:**
```json
{
  "logo_url": "...",
  "wordmark_url": "...",
  "logo_updated_at": "...",
  "wordmark_updated_at": "..."
}
```

### Option 2: Separate Storage Bucket

Create a new bucket `tenant-wordmarks` (same structure as `tenant-logos`).

### Implementation Steps for Wordmarks

1. **Create API endpoint**: `/api/tenants/[id]/wordmark`
   - Similar to `/api/tenants/[id]/logo`
   - Upload to `tenant-logos/{tenant-id}/wordmark.{ext}`

2. **Update UI component**: `TenantConfiguration.tsx`
   - Add wordmark upload section
   - Display wordmark preview

3. **Update storage policies** (if needed):
   - Current policies already allow any file in `tenant-logos/{tenant-id}/`
   - No changes needed if using same bucket

4. **Update TypeScript types**:
   ```typescript
   interface TenantBranding {
     logo_url?: string;
     wordmark_url?: string;  // Add this
     logo_updated_at?: string;
     wordmark_updated_at?: string;  // Add this
     primaryColor?: string;
     secondaryColor?: string;
   }
   ```

## Querying Logo/Wordmark Data

### Get Logo URL for a Tenant

```sql
SELECT 
  id,
  name,
  branding->>'logo_url' as logo_url,
  branding->>'wordmark_url' as wordmark_url
FROM tenants
WHERE id = '<tenant-id>';
```

### List All Tenants with Logos

```sql
SELECT 
  id,
  name,
  branding->>'logo_url' as logo_url,
  CASE 
    WHEN branding->>'logo_url' IS NOT NULL THEN true 
    ELSE false 
  END as has_logo
FROM tenants
WHERE branding->>'logo_url' IS NOT NULL;
```

### Check Storage Files

```sql
-- List all files in tenant-logos bucket (requires admin access)
SELECT name, bucket_id, created_at, metadata
FROM storage.objects
WHERE bucket_id = 'tenant-logos'
ORDER BY created_at DESC;
```

## Current Implementation Status

✅ **Logo Support**: Fully implemented
- Storage bucket: `tenant-logos`
- API endpoints: Upload/Delete
- UI component: `TenantConfiguration.tsx`
- Storage policies: Configured

❌ **Wordmark Support**: Not implemented
- Can be added using same pattern as logos
- Would use same storage bucket or separate bucket
- Would need new API endpoint and UI updates

## Related Files

- **Migrations**:
  - `supabase/migrations/20251112000005_add_tenant_logo_storage.sql`
  - `supabase/migrations/20251112000006_setup_storage_policies.sql`
  - `supabase/migrations/20251113000001_fix_storage_rls_policies.sql`

- **API Routes**:
  - `src/app/api/tenants/[id]/logo/route.ts`

- **UI Components**:
  - `src/components/TenantConfiguration.tsx`

- **Setup Scripts**:
  - `scripts/setup-tenant-storage.sql`

## Summary

- **No separate table** for logos/wordmarks
- **Storage**: Supabase Storage bucket `tenant-logos`
- **Metadata**: Stored in `tenants.branding` JSONB field
- **File Path**: `{tenant-id}/logo.{ext}` or `{tenant-id}/wordmark.{ext}`
- **Public Access**: Yes (for displaying in UI)

