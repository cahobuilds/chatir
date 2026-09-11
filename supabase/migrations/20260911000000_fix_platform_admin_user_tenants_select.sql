-- Fix a real bug found during UI review: platform staff could not view a company's user list
-- unless they ALSO happened to hold their own user_tenants row scoped to that exact tenant.
--
-- Repro: logged in as a platform_admin whose own membership row is scoped to "Master Platform"
-- (not the target company), opening Organization Management > "View Details" for a different
-- company (e.g. Caro Holdings) showed "Users with Access (0)" even though that company has an
-- active company_admin member. GET /api/tenants/[id]/users passed its own `canAccessTenant()`
-- check (which reads the CALLER's own row and correctly grants platform-wide bypass), but the
-- actual `user_tenants` SELECT is scoped by `tenant_id = <target>`, and RLS silently returned
-- zero rows instead of erroring.
--
-- Root cause: `user_tenants_select_admin` (20260908000000_platform_roles_cleanup.sql, section 9a)
-- uses `is_tenant_admin(tenant_id)`, which requires the CALLING user to have their OWN active
-- row for THAT SPECIFIC tenant_id with role company_admin/platform_admin. A platform_admin whose
-- only membership row is elsewhere fails this check for every other tenant.
--
-- Fix: add a SELECT policy using the existing tenant-agnostic `is_platform_admin()` helper
-- (already relied on for roles/role_permissions policies in the same migration), so platform
-- staff can read every tenant's user_tenants rows regardless of their own membership's tenant
-- scope. This does not change write access: INSERT/UPDATE/DELETE on user_tenants remain
-- unavailable to any authenticated client (all membership writes stay server-side via the
-- service-role admin client, per the original 9a comment).
SET search_path TO public, extensions;

CREATE POLICY user_tenants_select_platform_admin ON user_tenants
  FOR SELECT TO authenticated
  USING (is_platform_admin());
