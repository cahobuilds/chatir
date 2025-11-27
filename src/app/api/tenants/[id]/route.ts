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
      userTenantRole = 'system_admin';
    } else {
      const { data: userTenants, error: userTenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('tenant_id', id)
        .limit(1);

      if (userTenantError || !userTenants || userTenants.length === 0) {
        console.error('Access denied - no user_tenants relationship:', {
          userId: user.id,
          tenantId: id,
          error: userTenantError
        });
        return NextResponse.json({ error: 'Forbidden: You do not have access to this organization' }, { status: 403 });
      }
      
      userTenantRole = userTenants[0]?.role || null;
      hasVerifiedAccess = true;
    }

    // Use admin client if user is system admin or has admin role for this tenant
    // This bypasses RLS and ensures the query succeeds after we've verified access
    const adminRoles = ['system_admin', 'organization_admin', 'tenant_admin', 'super_admin'];
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
        console.error('PATCH access denied:', {
          userId: user.id,
          tenantId: id,
          error: userTenantError
        });
        return NextResponse.json({ error: 'Forbidden: Admin access required. You need system_admin, organization_admin, or super_admin role to update organization settings.' }, { status: 403 });
      }
      
      userTenantRole = userTenants[0]?.role || null;
    } else {
      userTenantRole = 'system_admin';
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

    // Use admin client for system admin and other admin roles to bypass RLS
    // This ensures the update succeeds after we've verified access
    const adminRoles = ['system_admin', 'organization_admin', 'tenant_admin', 'super_admin'];
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

