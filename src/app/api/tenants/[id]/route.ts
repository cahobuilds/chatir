import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasPlatformPermission, canAccessTenant, nestedRoleName } from '@/lib/permissions-server';
import { encrypt } from '@/lib/encryption';
import { NextRequest, NextResponse } from 'next/server';

// Never expose the voice-provider API key to any client (including tenant members).
function sanitizeTenant(t: any): any {
  if (!t) return t;
  const { retell_api_key, ...rest } = t;
  return rest;
}

// The canonical role name for a membership row, from `role_id -> roles.name`.
// Falls back to the legacy `user_tenants.role` text column, which is null for rows
// written by paths that only set role_id (e.g. self-serve signup) and stale for rows
// that predate the role_id backfill.
function membershipRole(row: { role?: string | null; roles?: unknown } | null | undefined): string | null {
  if (!row) return null;
  return nestedRoleName(row.roles) || row.role || null;
}

// GET /api/tenants/[id] - Get tenant by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Platform staff can access any tenant.
    const isSystemAdmin = await hasPlatformPermission(user.id, 'orgs.view');

    // Verify user has access to this tenant and get their role
    let userTenantRole: string | null = null;
    let hasVerifiedAccess = false;
    
    if (isSystemAdmin) {
      hasVerifiedAccess = true;
      userTenantRole = 'system_admin';
    } else {
      const { data: userTenants, error: userTenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id, role, role_id, roles (name)')
        .eq('user_id', user.id)
        .eq('tenant_id', id)
        .eq('status', 'active')
        .limit(1);

      if (userTenantError || !userTenants || userTenants.length === 0) {
        console.error('Access denied - no user_tenants relationship:', {
          userId: user.id,
          tenantId: id,
          error: userTenantError
        });
        return NextResponse.json({ error: 'Forbidden: You do not have access to this organization' }, { status: 403 });
      }
      
      userTenantRole = membershipRole(userTenants[0]);
      hasVerifiedAccess = true;
    }

    // Use admin client if user is system admin or has admin role for this tenant
    // This bypasses RLS and ensures the query succeeds after we've verified access
    const adminRoles = ['platform_admin', 'company_admin'];
    const isAdminRole = isSystemAdmin || (userTenantRole && adminRoles.includes(userTenantRole));
    const clientToUse = isAdminRole ? createAdminClient() : supabase;

    console.log('Tenant fetch attempt:', {
      tenantId: id,
      userId: user.id,
      userRole: userTenantRole,
      isAdminRole,
      usingAdminClient: isAdminRole,
      hasVerifiedAccess
    });
    
    // Get tenant - using admin client for admins ensures access, RLS for others
    let tenant;
    let tenantError;
    
    try {
      const result = await clientToUse
      .from('tenants')
      .select('*')
      .eq('id', id)
        .maybeSingle();

      tenant = result.data;
      tenantError = result.error;
    } catch (err: any) {
      console.error('Exception during tenant fetch:', err);
      tenantError = err;
      tenant = null;
    }

    // Enhanced error logging for debugging
    if (tenantError) {
      console.error('Tenant fetch error details:', {
        error: tenantError,
        errorMessage: tenantError?.message,
        errorCode: tenantError?.code,
        errorDetails: tenantError?.details,
        tenantId: id,
        userId: user.id,
        isSystemAdmin,
        userRole: userTenantRole,
        hasVerifiedAccess,
        isAdminRole,
        usingAdminClient: isAdminRole
      });
      
      // If admin client failed, try fallback with regular client (shouldn't happen, but helps debug)
      if (isAdminRole && tenantError) {
        console.log('Admin client failed, attempting fallback with regular client...');
        try {
          const fallbackResult = await supabase
            .from('tenants')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          
          if (fallbackResult.data && !fallbackResult.error) {
            console.log('Fallback query succeeded - RLS may be allowing access');
            tenant = fallbackResult.data;
            tenantError = null;
          }
        } catch (fallbackErr) {
          console.error('Fallback query also failed:', fallbackErr);
        }
      }
    }

    if (tenantError && !tenant) {
      console.error('Tenant fetch error:', tenantError);
      return NextResponse.json({ 
        error: tenantError.message || 'Failed to fetch organization',
        details: isAdminRole ? 'Admin client query failed' : 'RLS query failed'
      }, { status: 500 });
    }

    if (!tenant) {
      console.error('Tenant not found:', {
        tenantId: id,
        userId: user.id,
        userRole: userTenantRole,
        isAdminRole,
        usingAdminClient: isAdminRole
      });
      return NextResponse.json({ error: 'Organization not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ tenant: sanitizeTenant(tenant) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/tenants/[id] - Update tenant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Platform staff or this tenant's admin can update it.
    const isSystemAdmin = await hasPlatformPermission(user.id, 'orgs.view');
    let userTenantRole: string | null = null;
    if (isSystemAdmin) {
      userTenantRole = 'platform_admin';
    } else {
      if (!(await canAccessTenant(user.id, id, 'users.manage'))) {
        return NextResponse.json({ error: 'Forbidden: Admin access required to update organization settings.' }, { status: 403 });
      }
      const { data: ut } = await supabase
        .from('user_tenants')
        .select('role, role_id, roles (name)')
        .eq('user_id', user.id)
        .eq('tenant_id', id)
        .eq('status', 'active')
        .maybeSingle();
      userTenantRole = membershipRole(ut) || 'tenant_admin';
    }

    const body = await request.json();
    const { name, subdomain, tier, settings, branding, retell_api_key, is_reseller, parent_id, plan_tier } = body;

    // System admins can update is_reseller and parent_id
    // Regular admins cannot
    if ((is_reseller !== undefined || parent_id !== undefined) && !isSystemAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only system admins can configure reseller settings' },
        { status: 403 }
      );
    }

    // Only platform staff with `retell_key.manage` can set the voice-provider API key.
    if (retell_api_key !== undefined && !(await hasPlatformPermission(user.id, 'retell_key.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Platform access required to configure the voice provider key.' }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) {
      // Validate name is not empty or just whitespace
      const trimmedName = name.trim();
      if (!trimmedName) {
        return NextResponse.json({ error: 'Organization name cannot be empty' }, { status: 400 });
      }
      updateData.name = trimmedName;
    }
    if (subdomain !== undefined) updateData.subdomain = subdomain;
    if (tier !== undefined) updateData.tier = tier;
    if (settings !== undefined) updateData.settings = settings;
    if (branding !== undefined) updateData.branding = branding;
    if (plan_tier !== undefined) {
      const allowedTiers = ['starter', 'pro', 'enterprise'];
      if (!allowedTiers.includes(plan_tier)) {
        return NextResponse.json({ error: `plan_tier must be one of: ${allowedTiers.join(', ')}` }, { status: 400 });
      }
      if (!isSystemAdmin && !(await canAccessTenant(user.id, id, 'billing.manage'))) {
        return NextResponse.json({ error: 'Forbidden: billing.manage permission required to change the plan.' }, { status: 403 });
      }
      updateData.plan_tier = plan_tier;
    }
    
    // System admin can update reseller settings (is_reseller/parent_id removed in Phase 1b).
    if (isSystemAdmin) {
      if (is_reseller !== undefined) updateData.is_reseller = is_reseller;
      if (parent_id !== undefined) updateData.parent_id = parent_id || null;
    }
    // retell_api_key was already gated above (`retell_key.manage`); encrypt at rest.
    if (retell_api_key !== undefined) {
      updateData.retell_api_key = encrypt(retell_api_key);
    }

    // Use admin client for system admin and other admin roles to bypass RLS
    // This ensures the update succeeds after we've verified access
    const adminRoles = ['platform_admin', 'company_admin'];
    const isAdminRole = isSystemAdmin || (userTenantRole && adminRoles.includes(userTenantRole));
    const clientToUse = isAdminRole ? createAdminClient() : supabase;
    
    console.log('Tenant update attempt:', {
      tenantId: id,
      userId: user.id,
      userRole: userTenantRole,
      isAdminRole,
      usingAdminClient: isAdminRole
    });

    const { data: tenant, error: tenantError } = await clientToUse
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (tenantError) {
      console.error('Tenant update error:', tenantError);
      return NextResponse.json({ error: tenantError.message || 'Failed to update organization' }, { status: 500 });
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Organization not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ tenant: sanitizeTenant(tenant) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/tenants/[id] - Delete tenant (super_admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only platform staff can delete an organization.
    if (!(await hasPlatformPermission(user.id, 'orgs.delete'))) {
      return NextResponse.json({ error: 'Forbidden: Platform access required' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

