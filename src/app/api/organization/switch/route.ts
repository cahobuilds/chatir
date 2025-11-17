import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// POST /api/organization/switch - Switch current organization context
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Verify user has access to this organization
    const { data: userTenant, error: userTenantError } = await supabase
      .from('user_tenants')
      .select(`
        tenant_id,
        role,
        status,
        tenants (
          id,
          name,
          subdomain,
          tier
        )
      `)
      .eq('user_id', user.id)
      .eq('tenant_id', organizationId)
      .eq('status', 'active')
      .single();

    if (userTenantError || !userTenant) {
      // Check if user is superadmin/system_admin - they can access all organizations
      const { data: adminCheck } = await supabase
        .from('user_tenants')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['system_admin', 'super_admin'])
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (!adminCheck) {
        return NextResponse.json({ error: 'You do not have access to this organization' }, { status: 403 });
      }

      // Superadmin can access any organization - verify it exists
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, subdomain, tier')
        .eq('id', organizationId)
        .single();

      if (!tenant) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      // Set cookie for superadmin accessing any organization
      const cookieStore = await cookies();
      cookieStore.set('current_organization_id', organizationId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: false, // Allow client-side access
        sameSite: 'lax',
      });

      return NextResponse.json({
        success: true,
        organization: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          tier: tenant.tier,
          role: adminCheck.role,
        },
      });
    }

    // Regular user - set cookie with their organization
    const cookieStore = await cookies();
    cookieStore.set('current_organization_id', organizationId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false, // Allow client-side access
      sameSite: 'lax',
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: userTenant.tenant_id,
        name: (userTenant.tenants as any)?.name,
        subdomain: (userTenant.tenants as any)?.subdomain,
        tier: (userTenant.tenants as any)?.tier,
        role: userTenant.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

