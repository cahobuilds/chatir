# Tenant Branding Setup Guide

This guide explains how to set up multi-tenant branding where each organization can upload their own logo and update their name.

## Overview

The system allows:
- Each tenant/organization to upload and manage their own logo
- Organization admins to update their organization name
- Logos stored in Supabase Storage
- Admin-only access control (tenant_admin and super_admin roles)

## Setup Steps

### 1. Run Database Migration

```bash
# Apply the migration
supabase db push
```

Or manually run the migration file:
- `supabase/migrations/20251112000005_add_tenant_logo_storage.sql`

### 2. Set Up Supabase Storage

Run the storage setup script in Supabase Dashboard:

1. Go to your Supabase project's SQL Editor (Dashboard → SQL Editor → New query)
2. Open: `scripts/setup-tenant-storage.sql`
3. Copy and paste the entire contents
4. Click "Run"

This will:
- Create the `tenant-logos` storage bucket
- Set up RLS policies for secure access
- Allow only tenant admins to upload/update/delete logos
- Make logos publicly readable

### 3. Verify Setup

After setup, verify:

1. **Storage Bucket Created**:
   - Go to Storage → Buckets
   - You should see `tenant-logos` bucket

2. **Policies Active**:
   - Go to Storage → Policies
   - You should see 4 policies for `tenant-logos`:
     - Tenant admins can upload logos
     - Public can view tenant logos
     - Tenant admins can update logos
     - Tenant admins can delete logos

3. **Database Function**:
   - Go to Database → Functions
   - Verify `is_tenant_admin_for_storage` function exists

## Usage

### For Organization Admins

1. Navigate to **Tenant Settings** page (`/tenant-settings`)
2. In the **Tenant Configuration** section:
   - **Update Organization Name**: Enter new name and click "Save Name"
   - **Upload Logo**: Click "Upload Logo" and select an image file
   - **Change Logo**: Click "Change Logo" to replace existing logo
   - **Delete Logo**: Click the X button on the logo preview

### File Requirements

- **Supported formats**: JPEG, PNG, GIF, WebP, SVG
- **Maximum size**: 5MB
- **Recommended dimensions**: 200x200px to 500x500px (square)

## API Endpoints

### Upload Logo
```
POST /api/tenants/[id]/logo
Content-Type: multipart/form-data
Body: { file: File }
```

### Delete Logo
```
DELETE /api/tenants/[id]/logo
```

### Update Tenant Name
```
PATCH /api/tenants/[id]
Content-Type: application/json
Body: { name: string }
```

## Security

- Only users with the `users.manage` permission can (held by `company_admin` for their
  own organization, or any platform-scope role for any organization — see
  `src/lib/permissions-server.ts`):
  - Upload logos
  - Update tenant name
  - Delete logos
- Logos are stored in tenant-specific folders: `tenant-logos/{tenant_id}/logo.{ext}`
- RLS policies ensure users can only modify their own tenant's branding

## Storage Structure

```
tenant-logos/
  ├── {tenant-id-1}/
  │   └── logo.png
  ├── {tenant-id-2}/
  │   └── logo.jpg
  └── {tenant-id-3}/
      └── logo.svg
```

## Troubleshooting

### "Admin access required" error
- Verify user has `tenant_admin` or `super_admin` role in `user_tenants` table
- Check user's status is `active`

### Upload fails
- Verify storage bucket exists
- Check file size (must be < 5MB)
- Verify file type is supported
- Check browser console for detailed error

### Logo not displaying
- Verify storage bucket is public
- Check logo URL in tenant's `branding.logo_url` field
- Verify RLS policy allows public read access

## Database Schema

The tenant branding is stored in the `tenants` table:

```sql
branding JSONB DEFAULT '{}'::jsonb
```

Example structure:
```json
{
  "logo_url": "https://...supabase.co/storage/v1/object/public/tenant-logos/{tenant-id}/logo.png",
  "logo_updated_at": "2025-01-20T10:30:00Z",
  "primaryColor": "#4F46E5",
  "secondaryColor": "#06B6D4"
}
```

## See also

Wordmark support uses this exact same pattern (same bucket, same permission model) — see
`docs/LOGO_WORDMARK_STORAGE.md` for the wordmark-specific endpoint
(`/api/tenants/[id]/wordmark`).

