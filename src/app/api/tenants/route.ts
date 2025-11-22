import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tenants - Get current user's tenants (or all tenants for system_admin/super_admin)
export async function GET(request: NextRequest) {
  try {
    // Check environment variables before creating clients
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[Tenants API] Missing Supabase environment variables');
      return NextResponse.json(
        { 
          error: 'Server configuration error: Supabase not configured',
          details: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
        },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Tenants API] Missing Supabase service role key');
      return NextResponse.json(
        { 
          error: 'Server configuration error: Supabase admin not configured',
          details: 'Missing SUPABASE_SERVICE_ROLE_KEY'
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[Tenants API] Auth error:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system_admin or super_admin
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin', 'super_admin'])
      .eq('status', 'active')
      .limit(1);

    const isSystemAdmin = userTenants && userTenants.length > 0;

    if (isSystemAdmin) {
      // For system_admin/super_admin: return ALL tenants with their role info
      const { data: allTenants, error: allTenantsError } = await adminSupabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (allTenantsError) {
        return NextResponse.json({ error: allTenantsError.message }, { status: 500 });
      }

      // Get user's role for each tenant (if they have one)
      const { data: userTenantRoles } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const tenantRoleMap = new Map(
        (userTenantRoles || []).map(ut => [ut.tenant_id, ut.role])
      );

      // Format response to match expected structure
      const adminRole = userTenants && userTenants.length > 0 ? userTenants[0].role : 'system_admin';
      const formattedTenants = (allTenants || []).map((tenant: any) => ({
        tenant_id: tenant.id,
        role: tenantRoleMap.get(tenant.id) || adminRole, // Use system_admin/super_admin role if no specific role
        status: 'active',
        tenants: tenant,
      }));

      return NextResponse.json({ tenants: formattedTenants });
    } else {
      // For regular users: return only their tenants
      const { data: userTenants, error: userTenantsError } = await supabase
        .from('user_tenants')
        .select(`
          tenant_id,
          role,
          status,
          tenants (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (userTenantsError) {
        return NextResponse.json({ error: userTenantsError.message }, { status: 500 });
      }

      return NextResponse.json({ tenants: userTenants || [] });
    }
  } catch (error: any) {
    console.error('[Tenants API] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.stack 
      }, 
      { status: 500 }
    );
  }
}

// POST /api/tenants - Create a new tenant (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, subdomain, tier, settings, branding, domain, billing_email } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if user is system_admin or super_admin (can create tenants)
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin', 'super_admin'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: System admin or super admin access required' }, { status: 403 });
    }

    // Create tenant using admin client
    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .insert({
        name,
        subdomain: subdomain || name.toLowerCase().replace(/\s+/g, '-'),
        domain: domain || null,
        tier: tier || 'standard',
        billing_email: billing_email || null,
        settings: settings || {},
        branding: branding || {},
      })
      .select()
      .single();

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message }, { status: 500 });
    }

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

