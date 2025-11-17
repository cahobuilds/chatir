import { createClient } from '@/lib/supabase/server';
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
    const { data: systemAdminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .single();

    const isSystemAdmin = !!systemAdminCheck;

    // If not system_admin, verify user has access to this tenant
    if (!isSystemAdmin) {
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('tenant_id', id)
        .single();

      if (!userTenant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get tenant (RLS will ensure user can only access their tenant)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message }, { status: 500 });
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
    const { data: systemAdminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .single();

    const isSystemAdmin = !!systemAdminCheck;

    // If not system_admin, verify user is tenant_admin or super_admin for this specific tenant
    if (!isSystemAdmin) {
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', id)
        .in('role', ['tenant_admin', 'super_admin'])
        .single();

      if (!userTenant) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
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
    if (name !== undefined) updateData.name = name;
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

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message }, { status: 500 });
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

