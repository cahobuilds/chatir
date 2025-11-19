# Avatar Storage Setup Guide

This guide will walk you through setting up the Supabase Storage bucket for user avatars.

## Storage Bucket Name

**Bucket Name:** `avatars`

## Step-by-Step Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. **Navigate to Storage**
   - Log in to your Supabase Dashboard
   - Go to **Storage** in the left sidebar
   - Click **"New bucket"** or **"Create bucket"**

2. **Create the Bucket**
   - **Bucket name:** `avatars`
   - **Public bucket:** ✅ **Enable** (check this box)
     - This allows avatars to be accessed via public URLs
   - **File size limit:** `5242880` (5MB)
   - **Allowed MIME types:** 
     - `image/jpeg`
     - `image/png`
     - `image/gif`
     - `image/webp`
   - Click **"Create bucket"**

3. **Set Up Storage Policies**
   - After creating the bucket, click on the `avatars` bucket
   - Go to the **"Policies"** tab
   - Click **"New Policy"** and create the following policies:

#### Policy 1: Users can upload their own avatar
- **Policy name:** `Users can upload their own avatar`
- **Allowed operation:** `INSERT`
- **Target roles:** `authenticated`
- **Policy definition:**
```sql
(bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
```

#### Policy 2: Public can view avatars
- **Policy name:** `Public can view avatars`
- **Allowed operation:** `SELECT`
- **Target roles:** `public`
- **Policy definition:**
```sql
(bucket_id = 'avatars')
```

#### Policy 3: Users can update their own avatar
- **Policy name:** `Users can update their own avatar`
- **Allowed operation:** `UPDATE`
- **Target roles:** `authenticated`
- **Policy definition (USING):**
```sql
(bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
```
- **Policy definition (WITH CHECK):**
```sql
(bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
```

#### Policy 4: Users can delete their own avatar
- **Policy name:** `Users can delete their own avatar`
- **Allowed operation:** `DELETE`
- **Target roles:** `authenticated`
- **Policy definition:**
```sql
(bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
```

#### Policy 5: System admins can manage all avatars (Optional)
- **Policy name:** `System admins can manage all avatars`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **Policy definition (USING):**
```sql
(bucket_id = 'avatars' AND EXISTS (
  SELECT 1 FROM user_tenants
  WHERE user_id = auth.uid()
  AND role IN ('system_admin', 'super_admin')
))
```
- **Policy definition (WITH CHECK):**
```sql
(bucket_id = 'avatars' AND EXISTS (
  SELECT 1 FROM user_tenants
  WHERE user_id = auth.uid()
  AND role IN ('system_admin', 'super_admin')
))
```

### Option 2: Using SQL Script (Alternative)

If you prefer to set everything up via SQL:

1. **Open SQL Editor**
   - In Supabase Dashboard, go to **SQL Editor**
   - Click **"New query"**

2. **Run the Setup Script**
   - Copy and paste the contents of `scripts/setup-avatars-storage.sql`
   - Click **"Run"** to execute the script

The script will:
- Create the `avatars` bucket with proper configuration
- Set up all necessary storage policies
- Configure file size limits and MIME type restrictions

## File Structure

Avatars are stored in the following structure:
```
avatars/
  └── {user_id}/
      └── avatar.{ext}
```

Example:
```
avatars/
  └── 123e4567-e89b-12d3-a456-426614174000/
      └── avatar.jpg
```

## Verification

After setup, verify the bucket is working:

1. **Check Bucket Exists**
   - Go to Storage → `avatars` bucket
   - You should see an empty bucket (or folders as users upload avatars)

2. **Test Upload**
   - Go to `/profile/edit` or `/profile/settings`
   - Click the camera icon on your avatar
   - Upload an image
   - The avatar should update immediately

3. **Check Public URL**
   - After uploading, check the browser console or network tab
   - The avatar URL should be accessible publicly
   - Format: `https://{project-ref}.supabase.co/storage/v1/object/public/avatars/{user_id}/avatar.{ext}`

## Troubleshooting

### Error: "Avatars bucket not found"
- Make sure the bucket name is exactly `avatars` (lowercase)
- Verify the bucket exists in Storage → Buckets

### Error: "Upload failed: new row violates row-level security policy"
- Check that storage policies are correctly set up
- Verify the authenticated user has INSERT permission
- Check that the policy uses `auth.uid()` correctly

### Error: "File size exceeds limit"
- Current limit is 5MB (5242880 bytes)
- To change: Update bucket settings → File size limit

### Avatar not displaying
- Check that the bucket is set to **Public**
- Verify the avatar_url in user metadata is correct
- Check browser console for CORS or image loading errors

### Permission denied errors
- Ensure all policies are created correctly
- Verify the user is authenticated (`auth.uid()` is not null)
- Check that the folder structure matches: `{user_id}/avatar.{ext}`

## Security Notes

- ✅ Users can only upload/update/delete their own avatars
- ✅ Avatars are publicly viewable (required for display)
- ✅ File types are restricted to images only
- ✅ File size is limited to 5MB
- ✅ System admins have full access (optional policy)

## Environment Variables

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key is required for admin operations (uploading files via the API route).

