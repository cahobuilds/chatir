import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const CURRENT_ORG_COOKIE = 'current_organization_id';

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
        tenants (*)
      `)
      .eq('user_id', user.id)
      .eq('tenant_id', currentOrgId)
      .eq('status', 'active')
      .single();

    if (userTenant) {
      return {
        id: userTenant.tenant_id,
        role: userTenant.role,
        ...userTenant.tenants,
      };
    }

    // If user doesn't have access to the cookie's org, check if they're superadmin
    const { data: adminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin', 'super_admin'])
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (adminCheck) {
      // Superadmin can access any organization - verify it exists
      const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', currentOrgId)
        .single();

      if (tenant) {
        return {
          id: tenant.id,
          role: adminCheck.role,
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
    role: userTenant.role,
    ...userTenant.tenants,
  };
}

export async function getUserTenants() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return [];
  }

  // Check if user is superadmin/system_admin - they can see all organizations
  const { data: adminCheck } = await supabase
    .from('user_tenants')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['system_admin', 'super_admin'])
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (adminCheck) {
    // Superadmin can see all organizations
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
        status,
        tenants (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Merge: use actual role if user is a member, otherwise use admin role
    const tenantMap = new Map(
      (userTenants || []).map((ut: any) => [ut.tenant_id, ut.role])
    );

    return (allTenants || []).map((tenant: any) => ({
      tenant_id: tenant.id,
      role: tenantMap.get(tenant.id) || adminCheck.role,
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
      status,
      tenants (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  return userTenants || [];
}

