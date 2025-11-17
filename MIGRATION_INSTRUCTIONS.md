# Migration Instructions

## Apply the RLS Fix Migration

The migration `20251115000000_fix_agent_folders_rls_recursion.sql` fixes the 500 errors on `/api/folders` endpoint.

### Option 1: Apply via Supabase Dashboard (Recommended for Production)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/20251115000000_fix_agent_folders_rls_recursion.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** to execute

### Option 2: Apply via Supabase CLI (If Local DB is Running)

```bash
# Make sure Supabase is running locally
supabase start

# Apply the migration
supabase migration up
```

### Option 3: Apply via Direct SQL Connection

If you have direct database access:

```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20251115000000_fix_agent_folders_rls_recursion.sql
```

## Verify the Migration

After applying, test the folders endpoint:

```bash
# Should return 200 OK instead of 500
curl -X GET "https://your-domain.com/api/folders?tenant_id=YOUR_TENANT_ID" \
  -H "Cookie: your-auth-cookie"
```

Check your browser console - the repeated 500 errors for `/api/folders` should stop.

## What the Migration Does

1. **Drops existing problematic policies** that cause RLS recursion
2. **Updates `get_user_tenant_ids()` function** to include status check
3. **Creates `is_folder_admin()` helper function** for admin checks
4. **Recreates policies** using SECURITY DEFINER functions to prevent recursion

## Rollback (If Needed)

If you need to rollback, you can recreate the original policies, but this is not recommended as they have the recursion issue:

```sql
-- Only if you need to rollback (not recommended)
DROP POLICY IF EXISTS "Users can view folders in their tenant" ON agent_folders;
DROP POLICY IF EXISTS "Admins can manage folders in their tenant" ON agent_folders;

-- Recreate original policies (these have the recursion issue)
CREATE POLICY "Users can view folders in their tenant"
  ON agent_folders FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
```
