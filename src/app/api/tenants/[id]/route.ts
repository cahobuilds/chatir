import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isReseller } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

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

    // Check if user is system_admin (can access any tenant)
    // Don't use .single() as user might have multiple tenant relationships
    const { data: systemAdminCheck, error: systemAdminError } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .limit(1);

    const isSystemAdmin = systemAdminCheck && systemAdminCheck.length > 0;

    // Verify user has access to this tenant and get their role
    let userTenantRole: string | null = null;
    let hasVerifiedAccess = false;
    
    if (isSystemAdmin) {
      hasVerifiedAccess = true;
    } else {
      const { data: userTenants, error: userTenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('tenant_id', id)
        .limit(1);

      if (userTenantError || !userTenants || userTenants.length === 0) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this organization' }, { status: 403 });
      }
      
      userTenantRole = userTenants[0]?.role || null;
      hasVerifiedAccess = true;
    }

    // Use appropriate client based on access level
    // System admins use admin client to bypass RLS
    // For admin roles (organization_admin, tenant_admin, super_admin), we've verified access
    // so we can use admin client to ensure the query succeeds
    // This is secure because we've already verified the user has a valid relationship
    const isAdminRole = isSystemAdmin || (userTenantRole && ['organization_admin', 'tenant_admin', 'super_admin'].includes(userTenantRole));
    const clientToUse = isAdminRole ? createAdminClient() : supabase;
    
    // Get tenant - using admin client for admins ensures access, RLS for others
    const { data: tenant, error: tenantError } = await clientToUse
      .from('tenants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // Enhanced error logging for debugging
    if (tenantError) {
      console.error('Tenant fetch error details:', {
        error: tenantError,
        tenantId: id,
        userId: user.id,
        isSystemAdmin,
        userRole: userTenantRole,
        hasVerifiedAccess,
        isAdminRole,
        usingAdminClient: isAdminRole
      });
    }

    if (tenantError) {
      console.error('Tenant fetch error:', tenantError);
      return NextResponse.json({ error: tenantError.message || 'Failed to fetch organization' }, { status: 500 });
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Organization not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ tenant });
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

    // Check if user is system_admin (can update any tenant)
    // Don't use .single() as user might have multiple tenant relationships
    const { data: systemAdminCheck, error: systemAdminError } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .limit(1);

    const isSystemAdmin = systemAdminCheck && systemAdminCheck.length > 0;

    // If not system_admin, verify user is organization_admin, tenant_admin, or super_admin for this specific tenant
    let userTenantRole: string | null = null;
    if (!isSystemAdmin) {
      const { data: userTenants, error: userTenantError } = await supabase
        .from('user_tenants')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', id)
        .in('role', ['organization_admin', 'tenant_admin', 'super_admin'])
        .limit(1);

      if (userTenantError || !userTenants || userTenants.length === 0) {
        return NextResponse.json({ error: 'Forbidden: Admin access required. You need system_admin, organization_admin, or super_admin role to update organization settings.' }, { status: 403 });
      }
      
      userTenantRole = userTenants[0]?.role || null;
    }

    const body = await request.json();
    const { name, subdomain, tier, settings, branding, retell_api_key, is_reseller, parent_id } = body;

    // System admins can update is_reseller and parent_id
    // Regular admins cannot
    if ((is_reseller !== undefined || parent_id !== undefined) && !isSystemAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only system admins can configure reseller settings' },
        { status: 403 }
      );
    }

    // Check if this tenant is a reseller (only resellers can update retell_api_key)
    const tenantIsReseller = await isReseller(id);
    
    // If trying to update retell_api_key:
    // - System admins can update it for any tenant (to configure resellers)
    // - Regular admins can only update it if tenant is already a reseller
    if (retell_api_key !== undefined) {
      if (!isSystemAdmin && !tenantIsReseller) {
        return NextResponse.json(
          { error: 'Only resellers can configure Retell API keys. Organizations inherit Retell configuration from their reseller.' },
          { status: 403 }
        );
      }
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
    
    // System admin can update reseller settings
    if (isSystemAdmin) {
      if (is_reseller !== undefined) updateData.is_reseller = is_reseller;
      if (parent_id !== undefined) updateData.parent_id = parent_id || null;
      if (retell_api_key !== undefined) updateData.retell_api_key = retell_api_key;
    } else {
      // Regular admins can only update retell_api_key if tenant is already a reseller
      if (retell_api_key !== undefined && tenantIsReseller) {
        updateData.retell_api_key = retell_api_key;
      }
    }

    // Use admin client for system admin operations to bypass RLS
    const clientToUse = isSystemAdmin ? createAdminClient() : supabase;

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

    return NextResponse.json({ tenant });
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

    // Verify user is super_admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', id)
      .eq('role', 'super_admin')
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
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

