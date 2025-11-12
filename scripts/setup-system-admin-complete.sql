-- Complete setup script for System Admin User
-- Run this AFTER running the roles migrations:
-- 1. supabase/migrations/20251112000000_create_roles_system.sql
-- 2. supabase/migrations/20251112000001_seed_default_role_permissions.sql
--
-- Then run this script in Supabase Dashboard > SQL Editor

-- Step 1: Create auth user via Supabase Admin API
-- This requires using the Supabase Dashboard or Admin API
-- Go to: Authentication > Users > Add User
-- Email: systemadmin@tin.info
-- Password: 88888888
-- Auto-confirm: Yes

-- Step 2: Configure user-tenant relationship and assign system_admin role
DO $$
DECLARE
  v_user_id UUID;
  v_role_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get user ID from auth.users (created in Step 1)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'systemadmin@tin.info'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User systemadmin@tin.info not found. Please create the user first:
1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User" > "Create new user"
3. Email: systemadmin@tin.info
4. Password: 88888888
5. Check "Auto Confirm User"
6. Click "Create User"
Then run this script again.';
  END IF;

  -- Get system_admin role ID
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = 'system_admin'
  LIMIT 1;

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'System admin role not found. Please run the roles migrations first:
1. supabase/migrations/20251112000000_create_roles_system.sql
2. supabase/migrations/20251112000001_seed_default_role_permissions.sql';
  END IF;

  -- Get or create master tenant
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE name = 'Master Platform'
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (name, subdomain, tier)
    VALUES ('Master Platform', 'master', 'enterprise')
    RETURNING id INTO v_tenant_id;
    
    RAISE NOTICE 'Created master tenant: %', v_tenant_id;
  ELSE
    RAISE NOTICE 'Using existing master tenant: %', v_tenant_id;
  END IF;

  -- Create or update user_tenants relationship
  INSERT INTO user_tenants (user_id, tenant_id, role, role_id, status)
  VALUES (v_user_id, v_tenant_id, 'system_admin', v_role_id, 'active')
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET
    role = 'system_admin',
    role_id = v_role_id,
    status = 'active',
    updated_at = NOW();

  RAISE NOTICE '';
  RAISE NOTICE '✅ System admin user configured successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Login Credentials:';
  RAISE NOTICE '  Email: systemadmin@tin.info';
  RAISE NOTICE '  Password: 88888888';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Please change the password after first login!';
  RAISE NOTICE '';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Role ID: %', v_role_id;
  RAISE NOTICE 'Tenant ID: %', v_tenant_id;
END $$;

