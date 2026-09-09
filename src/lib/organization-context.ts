import { createClient } from '@/lib/supabase/server';
import { hasPlatformPermission, nestedRoleName } from '@/lib/permissions-server';
import { cookies } from 'next/headers';

const CURRENT_ORG_COOKIE = 'current_organization_id';

// The canonical role name for a membership row, from `role_id -> roles.name`.
// Falls back to the legacy `user_tenants.role` text column, which is null for rows
// written by paths that only set role_id (e.g. self-serve signup) and stale for rows
// that predate the role_id backfill.
function membershipRole(row: { role?: string | null; roles?: unknown }): string | null {
  return nestedRoleName(row.roles) || row.role || null;
}

/**
 * Get the current organization context from cookie
 * Returns the organization ID that the user is currently viewing/working in
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CURRENT_ORG_COOKIE)?.value || null;
}

/**
 * Get the current organization with user's role in that organization
 * This respects the organization context cookie and verifies user has access
 */
export async function getCurrentOrganizationContext() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }

  const currentOrgId = await getCurrentOrganizationId();

  if (!currentOrgId) {
    return null;
  }

  // Check if user has access to this organization
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select(`
      tenant_id,
      role,
      roles (name),
      status,
      tenants (*)
    `)
    .eq('user_id', user.id)
    .eq('tenant_id', currentOrgId)
    .eq('status', 'active')
    .single();

  if (userTenant) {
    return {
      id: userTenant.tenant_id,
      role: membershipRole(userTenant),
      ...userTenant.tenants,
    };
  }

  // Platform staff can access any organization.
  if (await hasPlatformPermission(user.id, 'orgs.view')) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', currentOrgId)
      .maybeSingle();

    if (tenant) {
      return {
        id: tenant.id,
        role: 'platform_admin',
        ...tenant,
      };
    }
  }

  return null;
}

/**
 * Verify user has access to a specific organization
 * Returns the user's role in that organization, or null if no access
 */
export async function verifyOrganizationAccess(organizationId: string): Promise<{ role: string } | null> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }

  // Check if user has direct access
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('role, roles (name)')
    .eq('user_id', user.id)
    .eq('tenant_id', organizationId)
    .eq('status', 'active')
    .single();

  // A membership row whose role resolves to nothing (neither role_id nor legacy text)
  // grants no permissions anywhere else in the system, so it falls through to the
  // platform-staff check rather than reporting access with a null role.
  const memberRole = userTenant ? membershipRole(userTenant) : null;
  if (memberRole) {
    return { role: memberRole };
  }

  // Platform staff can access any organization.
  if (await hasPlatformPermission(user.id, 'orgs.view')) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', organizationId)
      .maybeSingle();

    if (tenant) {
      return { role: 'platform_admin' };
    }
  }

  return null;
}

