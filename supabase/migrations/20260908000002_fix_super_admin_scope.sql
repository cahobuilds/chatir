-- Fix a real mapping bug found during manual testing: the Phase-1 backfill mapped the legacy
-- `super_admin` role to platform_admin, but in the ORIGINAL schema `super_admin` was a
-- TENANT-scoped role (the top admin of a single company), not a platform-wide role -- only
-- `system_admin` was ever meant to be global. This caused company-level admins (e.g. a company's
-- own super_admin) to incorrectly land on the platform_admin role and see the whole platform
-- admin menu instead of being scoped to their own organization.
--
-- Fix: any user_tenants row whose legacy `role` text is 'super_admin' is remapped to
-- company_admin. Rows whose legacy role is 'system_admin' are untouched (those are genuinely
-- platform-wide) and are not affected by this migration.
SET search_path TO public, extensions;

UPDATE user_tenants ut
SET role_id = r.id
FROM roles r
WHERE ut.role = 'super_admin'
  AND r.name = 'company_admin';
