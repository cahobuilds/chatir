-- SQL script to create system admin user
-- Run this in Supabase Dashboard > SQL Editor after running the roles migrations
-- 
-- Prerequisites:
-- 1. Run: supabase/migrations/20251112000000_create_roles_system.sql
-- 2. Run: supabase/migrations/20251112000001_seed_default_role_permissions.sql

-- Step 1: Create auth user (requires Supabase Auth Admin API or Dashboard)
-- Note: You'll need to create this user via Supabase Dashboard > Authentication > Users > Add User
-- Email: systemadmin@tin.info
-- Password: 88888888
-- Auto-confirm: Yes

-- Step 2: Get the user ID (replace with actual user ID from auth.users after creating)
-- You can find this in Supabase Dashboard > Authentication > Users
DO $$
DECLARE
  v_user_id UUID;
  v_role_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'systemadmin@tin.info'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User systemadmin@tin.info not found. Please create the user in Supabase Dashboard > Authentication > Users first.';
  END IF;

  -- Get system_admin role ID
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = 'system_admin'
  LIMIT 1;

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'System admin role not found. Please run the roles migration first.';
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

  RAISE NOTICE 'System admin user configured successfully!';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Role ID: %', v_role_id;
  RAISE NOTICE 'Tenant ID: %', v_tenant_id;
END $$;

