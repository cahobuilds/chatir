import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tenants - Get current user's tenants
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenants through user_tenants table
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

    return NextResponse.json({ tenants: userTenants });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    const { name, subdomain, tier, settings, branding } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if user is super_admin (can create tenants)
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Create tenant using admin client
    const adminSupabase = createAdminClient();
    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .insert({
        name,
        subdomain: subdomain || name.toLowerCase().replace(/\s+/g, '-'),
        tier: tier || 'standard',
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

