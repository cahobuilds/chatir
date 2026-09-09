// Server-side permission checking utilities.
// MUST only be used in API routes and server components (never client components).
//
// Uses the canonical roles/permissions model via `user_tenants.role_id` (the migration is
// applied; every membership row has role_id). No legacy `role`-text fallback remains.

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface RolePermissions {
  role: string;
  scope: 'platform' | 'company';
  displayName: string;
  description: string;
  permissions: Permission[];
}

interface TenantRole {
  role_id: string | null;
  role_name: string;
}

// postgREST types a many-to-one embed as an array; normalize to a single name.
function nestedRoleName(roles: unknown): string | undefined {
  if (Array.isArray(roles)) return (roles[0] as { name?: string } | undefined)?.name;
  return (roles as { name?: string } | undefined)?.name;
}

// Resolve the authenticated-or-passed user's role for a specific tenant (active only).
// Uses maybeSingle() so a user with multiple memberships never throws PGRST116.
async function resolveTenantRole(
  userId: string,
  tenantId: string
): Promise<TenantRole | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_tenants')
    .select('role_id, roles(name)')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle();

  if (!data) return null;
  return {
    role_id: data.role_id ?? null,
    // New model: role name comes from the roles table; legacy fallback = text column.
    role_name: nestedRoleName(data.roles) ?? '',
  };
}

// All permission names granted to a role (post-migration, permission_id is a UUID FK).
async function rolePermissionNames(roleId: string | null): Promise<string[]> {
  if (!roleId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('role_permissions')
    .select('permissions(name)')
    .eq('role_id', roleId);
  return (data || [])
    .map((rp: any) => rp.permissions?.name)
    .filter(Boolean) as string[];
}

// True if `userId` holds the platform_admin role anywhere (tenant-agnostic superuser check).
// Mirrors the SQL is_platform_admin() RLS helper so the app layer and the DB layer agree on
// what "platform_admin" means: a platform_admin is not guaranteed to hold a user_tenants row
// for every tenant, so this must never be scoped to a single tenant_id.
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_tenants')
    .select('roles(name)')
    .eq('user_id', userId)
    .eq('status', 'active');
  return (data || []).some((row: any) => nestedRoleName(row.roles) === 'platform_admin');
}

/**
 * True if `userId` holds `permissionId` within `tenantId` (company scope).
 * `platform_admin` is treated as a superuser (implicit grant of every permission).
 */
export async function hasPermission(
  userId: string,
  tenantId: string,
  permissionId: string
): Promise<boolean> {
  // Checked before resolving a tenant-scoped role: a platform_admin may have no membership
  // row in this tenant at all, and must still be granted access.
  if (await isPlatformAdmin(userId)) return true;

  const role = await resolveTenantRole(userId, tenantId);
  if (!role) return false;
  if (role.role_id) {
    return (await rolePermissionNames(role.role_id)).includes(permissionId);
  }
  return false;
}

/** Convenience alias for route-level readability: hasPermission(...). */
export function can(userId: string, tenantId: string, permissionId: string): Promise<boolean> {
  return hasPermission(userId, tenantId, permissionId);
}

/**
 * True if `userId` holds `permissionId` at the PLATFORM scope (no tenant context).
 * platform_admin is a superuser.
 */
export async function hasPlatformPermission(
  userId: string,
  permissionId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_tenants')
    .select('role_id, roles(name)')
    .eq('user_id', userId)
    .eq('status', 'active');

  const rows = data || [];
  for (const row of rows) {
    const roleName: string = nestedRoleName(row.roles) ?? '';
    if (roleName === 'platform_admin') return true;
    if (roleName === 'platform_operator' || roleName === 'platform_billing') {
      if (row.role_id && (await rolePermissionNames(row.role_id)).includes(permissionId)) return true;
    }
  }
  return false;
}

// True if the user can act within a tenant: either they hold the permission in that
// tenant, or they are platform staff (platform roles operate across all tenants).
export async function canAccessTenant(
  userId: string,
  tenantId: string,
  permissionId: string
): Promise<boolean> {
  if (await hasPlatformPermission(userId, 'orgs.view')) return true;
  return hasPermission(userId, tenantId, permissionId);
}

// All permissions for a user in a tenant (for UI/menus).
export async function getUserPermissions(
  userId: string,
  tenantId: string
): Promise<Permission[]> {
  const role = await resolveTenantRole(userId, tenantId);
  if (!role) {
    // Tenant-agnostic platform_admin: every permission, rather than an empty list.
    if (await isPlatformAdmin(userId)) {
      const supabase = await createClient();
      const { data } = await supabase.from('permissions').select('id, name, description, category');
      return (data || []) as Permission[];
    }
    return [];
  }
  if (role.role_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('role_permissions')
      .select('permissions(id, name, description, category)')
      .eq('role_id', role.role_id);
    return (data || [])
      .map((rp: any) => rp.permissions)
      .filter(Boolean) as Permission[];
  }
  return [];
}

// Role info for a user in a tenant (for UI).
export async function getUserRoleInfo(
  userId: string,
  tenantId: string
): Promise<RolePermissions | null> {
  const role = await resolveTenantRole(userId, tenantId);
  if (!role) {
    // No membership row for this specific tenant -- still recognize a tenant-agnostic
    // platform_admin instead of returning null (see isPlatformAdmin's doc comment).
    if (await isPlatformAdmin(userId)) {
      return {
        role: 'platform_admin',
        scope: 'platform',
        displayName: 'Platform Admin',
        description: 'Full platform access: organizations, plans, payments, Retell key, platform staff.',
        permissions: [],
      };
    }
    return null;
  }

  if (role.role_id) {
    const supabase = await createClient();
    const { data: roleRow } = await supabase
      .from('roles')
      .select('name, display_name, description, scope')
      .eq('id', role.role_id)
      .maybeSingle();
    if (roleRow) {
      const permissions = await getUserPermissions(userId, tenantId);
      return {
        role: roleRow.name,
        scope: roleRow.scope === 'platform' ? 'platform' : 'company',
        displayName: roleRow.display_name,
        description: roleRow.description || '',
        permissions,
      };
    }
  }
  return null;
}

// True if the user has any of the given role names (by name, not permission).
export async function hasAnyRole(
  userId: string,
  tenantId: string,
  roles: string[]
): Promise<boolean> {
  const role = await resolveTenantRole(userId, tenantId);
  if (!role) return false;
  return roles.includes(role.role_name);
}

// ---------------------------------------------------------------------------
// Write-path helpers: resolving a role name to the canonical roles.id
// ---------------------------------------------------------------------------

/** The 6 canonical roles seeded by 20260908000000_platform_roles_cleanup.sql. */
export const CANONICAL_ROLE_NAMES = [
  'platform_admin',
  'platform_operator',
  'platform_billing',
  'company_admin',
  'company_editor',
  'company_viewer',
] as const;

export type CanonicalRoleName = (typeof CANONICAL_ROLE_NAMES)[number];

// Legacy `user_tenants.role` text -> canonical role. Mirrors the DB backfill in
// 20260908000001_fix_role_backfill.sql, including the later correction in
// 20260908000002_fix_super_admin_scope.sql: `super_admin` was tenant-scoped (a single
// company's top admin), so it lands on company_admin, NOT platform_admin.
// organization_admin/workspace_admin are UI aliases of tenant_admin/subtenant_admin.
const LEGACY_ROLE_TO_CANONICAL: Record<string, CanonicalRoleName> = {
  system_admin: 'platform_admin',
  super_admin: 'company_admin',
  tenant_admin: 'company_admin',
  organization_admin: 'company_admin',
  subtenant_admin: 'company_editor',
  workspace_admin: 'company_editor',
  agent: 'company_editor',
  manager: 'company_editor',
  call_manager: 'company_editor',
  analyst: 'company_viewer',
  user: 'company_viewer',
  viewer: 'company_viewer',
};

/**
 * Map a legacy or canonical role name onto one of the 6 canonical roles.
 * Canonical names pass through unchanged; unrecognized names return null.
 */
export function toCanonicalRoleName(role: string | null | undefined): CanonicalRoleName | null {
  if (!role) return null;
  const name = role.trim();
  if ((CANONICAL_ROLE_NAMES as readonly string[]).includes(name)) return name as CanonicalRoleName;
  return LEGACY_ROLE_TO_CANONICAL[name] ?? null;
}

/**
 * Resolve a legacy or canonical role name to the active `roles.id` it maps to,
 * or null if it maps to nothing. Every permission check reads `user_tenants.role_id`,
 * so any code writing a membership row must set it via this helper.
 *
 * Pass `client` (e.g. the service-role admin client) when the caller is acting on
 * behalf of another user; otherwise the request-scoped RLS client is used.
 */
export async function resolveRoleId(
  role: string | null | undefined,
  client?: SupabaseClient
): Promise<string | null> {
  const canonical = toCanonicalRoleName(role);
  if (!canonical) return null;

  const supabase = client ?? (await createClient());
  const { data } = await supabase
    .from('roles')
    .select('id')
    .eq('name', canonical)
    .eq('is_active', true)
    .maybeSingle();

  return data?.id ?? null;
}
