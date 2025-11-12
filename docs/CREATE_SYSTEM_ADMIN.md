# Creating System Admin User

This guide will help you create a system admin user with full access to all platform functions.

## Quick Start (Recommended)

### Step 1: Run Roles Migrations

First, ensure the roles migrations are applied:

1. Go to **Supabase Dashboard** > **SQL Editor**
2. Run these migrations in order:
   - Copy and run: `supabase/migrations/20251112000000_create_roles_system.sql`
   - Copy and run: `supabase/migrations/20251112000001_seed_default_role_permissions.sql`

   Or via CLI:
   ```bash
   supabase db push
   ```

### Step 2: Create Auth User

1. Go to **Supabase Dashboard** > **Authentication** > **Users**
2. Click **Add User** > **Create new user**
3. Fill in:
   - **Email**: `systemadmin@tin.info`
   - **Password**: `88888888`
   - **Auto Confirm User**: ✅ (checked)
4. Click **Create User**

### Step 3: Run Setup Script

1. Go to **Supabase Dashboard** > **SQL Editor**
2. Copy and paste the contents of `scripts/setup-system-admin-complete.sql`
3. Click **Run**

Done! You can now login with:
- **Email**: `systemadmin@tin.info`
- **Password**: `88888888`

⚠️ **Important**: Change the password after first login!

## Method 1: Using TypeScript Script (Recommended)

1. Ensure your `.env.local` has the required variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. Run the script:
   ```bash
   npx tsx scripts/create-system-admin.ts
   ```

   The script will:
   - Check if roles table exists
   - Create the auth user (systemadmin@tin.info)
   - Create/update the user-tenant relationship
   - Assign system_admin role

## Method 2: Using Supabase Dashboard

### Step 1: Create Auth User

1. Go to **Supabase Dashboard** > **Authentication** > **Users**
2. Click **Add User** > **Create new user**
3. Fill in:
   - **Email**: `systemadmin@tin.info`
   - **Password**: `88888888`
   - **Auto Confirm User**: ✅ (checked)
4. Click **Create User**

### Step 2: Run SQL Script

1. Go to **Supabase Dashboard** > **SQL Editor**
2. Copy and paste the contents of `scripts/create-system-admin.sql`
3. Click **Run**

   This will:
   - Find the user you just created
   - Get the system_admin role
   - Create/update the user-tenant relationship
   - Assign the system_admin role

## Method 3: Manual SQL (Alternative)

If you prefer to do it manually:

```sql
-- 1. Get the user ID (replace with actual ID from auth.users)
-- Find this in Authentication > Users after creating the user
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID_HERE'; -- Replace with actual user ID
  v_role_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get system_admin role ID
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = 'system_admin'
  LIMIT 1;

  -- Get or create master tenant
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE name = 'Master Platform'
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (name, subdomain, tier)
    VALUES ('Master Platform', 'master', 'enterprise')
    RETURNING id INTO v_tenant_id;
  END IF;

  -- Create user-tenant relationship
  INSERT INTO user_tenants (user_id, tenant_id, role, role_id, status)
  VALUES (v_user_id, v_tenant_id, 'system_admin', v_role_id, 'active')
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET
    role = 'system_admin',
    role_id = v_role_id,
    status = 'active',
    updated_at = NOW();
END $$;
```

## Verification

After creating the user, verify it works:

1. **Login** at `http://localhost:3000/auth/login`
   - Email: `systemadmin@tin.info`
   - Password: `88888888`

2. **Check Roles Page**: You should be able to access `/admin/roles` and see all roles

3. **Check Permissions**: You should have access to all functions

## Security Note

⚠️ **Important**: Change the password after first login!

The default password `88888888` is insecure and should be changed immediately.

## Troubleshooting

### "Roles table not found"
- Run the roles migrations first (see Prerequisites)

### "User already exists"
- The script will update the existing user's role
- Or manually update the `user_tenants` table

### "Permission denied"
- Ensure you're using the service role key (not the anon key)
- Check that RLS policies allow the operation

