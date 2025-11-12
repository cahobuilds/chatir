# Applying Role System Migrations

## Quick Start

The role system migrations need to be applied to your Supabase database. Follow these steps:

## Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/ystivchlyoijaghwdcjd/sql/new

2. **Apply First Migration**
   - Open file: `supabase/migrations/20251112000000_create_roles_system.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)
   - Verify success message

3. **Apply Second Migration**
   - Open file: `supabase/migrations/20251112000001_populate_role_permissions.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**
   - Verify success message

## Option 2: Supabase CLI

If you have Supabase CLI linked:

```bash
# Link project (if not already linked)
supabase link --project-ref ystivchlyoijaghwdcjd

# Apply migrations
supabase db push
```

## Verification

After applying migrations, verify in SQL Editor:

```sql
-- Check roles were created
SELECT name, display_name, hierarchy_level, category 
FROM roles 
ORDER BY hierarchy_level DESC;

-- Should return 9 roles:
-- system_admin, super_admin, organization_admin, manager, 
-- call_manager, agent, analyst, user, viewer

-- Check permissions were assigned
SELECT r.name, COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name
ORDER BY r.hierarchy_level DESC;

-- Check user_tenants has role_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_tenants' 
AND column_name IN ('role', 'role_id');
```

## Expected Results

✅ **9 roles** created in `roles` table  
✅ **Permissions assigned** to each role in `role_permissions` table  
✅ **user_tenants.role_id** column added  
✅ **Existing users** have their `role` values migrated to `role_id`  

## Troubleshooting

### "relation roles already exists"
- Migration was already applied
- Skip to second migration

### "column role_id already exists"
- Column was already added
- Continue with second migration

### "permission denied"
- Make sure you're using the service role key
- Or run migrations as database owner in Supabase Dashboard

### "duplicate key value violates unique constraint"
- Roles already exist
- This is normal if migrations were partially applied
- Continue with second migration

## After Migration

Once migrations are applied:

1. ✅ Roles will be available in the UI at `/admin/roles`
2. ✅ Users can be assigned to roles via the `role_id` column
3. ✅ Permissions are managed through the `role_permissions` table
4. ✅ System roles cannot be deleted or modified

## Next Steps

1. Apply migrations (see above)
2. Access Roles Management: http://localhost:3000/admin/roles
3. View and manage roles and permissions
4. Assign roles to users via User Management
