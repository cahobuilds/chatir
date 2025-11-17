import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const CURRENT_ORG_COOKIE = 'current_organization_id';

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
      role: userTenant.role,
      ...userTenant.tenants,
    };
  }

  // Check if user is superadmin/system_admin - they can access any organization
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
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', organizationId)
    .eq('status', 'active')
    .single();

  if (userTenant) {
    return { role: userTenant.role };
  }

  // Check if user is superadmin/system_admin
  const { data: adminCheck } = await supabase
    .from('user_tenants')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['system_admin', 'super_admin'])
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (adminCheck) {
    // Verify organization exists
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', organizationId)
      .single();

    if (tenant) {
      return { role: adminCheck.role };
    }
  }

  return null;
}

