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

export async function getCurrentTenant() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }

  // Get current organization from cookie
  const cookieStore = await cookies();
  const currentOrgId = cookieStore.get(CURRENT_ORG_COOKIE)?.value;

  // If we have a current organization ID, use it
  if (currentOrgId) {
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select(`
        tenant_id,
        role,
        roles (name),
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

    // If user doesn't have access via membership, platform staff can access any org.
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
  }

  // Fallback: Get user's primary tenant (first active tenant)
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select(`
      tenant_id,
      role,
      roles (name),
      tenants (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!userTenant) {
    return null;
  }

  // Set cookie for future requests
  cookieStore.set(CURRENT_ORG_COOKIE, userTenant.tenant_id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: false,
    sameSite: 'lax',
  });

  return {
    id: userTenant.tenant_id,
    role: membershipRole(userTenant),
    ...userTenant.tenants,
  };
}

export async function getUserTenants() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return [];
  }

  // Platform staff can see all organizations.
  if (await hasPlatformPermission(user.id, 'orgs.view')) {
    const { data: allTenants } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    // Get user's actual memberships for role info
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select(`
        tenant_id,
        role,
        roles (name),
        status,
        tenants (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Merge: use actual role if user is a member, otherwise use the platform role
    const tenantMap = new Map(
      (userTenants || []).map((ut: any) => [ut.tenant_id, membershipRole(ut)])
    );

    return (allTenants || []).map((tenant: any) => ({
      tenant_id: tenant.id,
      role: tenantMap.get(tenant.id) || 'platform_admin',
      status: 'active',
      tenants: tenant,
    }));
  }

  // Regular user - only their organizations
  const { data: userTenants } = await supabase
    .from('user_tenants')
    .select(`
      tenant_id,
      role,
      roles (name),
      status,
      tenants (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  // Re-projected rather than returned raw so the `roles` embed used to resolve the
  // canonical name does not leak into the row shape callers already depend on.
  return (userTenants || []).map((ut) => ({
    tenant_id: ut.tenant_id,
    role: membershipRole(ut),
    status: ut.status,
    tenants: ut.tenants,
  }));
}

