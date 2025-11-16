import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/users - Get all users (system_admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system_admin or super_admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin', 'super_admin'])
      .single();

    if (!userTenant || !['system_admin', 'super_admin'].includes(userTenant.role)) {
      return NextResponse.json({ error: 'Forbidden: System admin or super admin access required' }, { status: 403 });
    }

    // Get all users with their tenant relationships
    const { data: allUsers, error: usersError } = await adminSupabase.auth.admin.listUsers();
    
    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // Get user-tenant relationships
    const { data: userTenants, error: userTenantsError } = await adminSupabase
      .from('user_tenants')
      .select('user_id, tenant_id, role, status, tenants(id, name)');

    if (userTenantsError) {
      return NextResponse.json({ error: userTenantsError.message }, { status: 500 });
    }

    // Map users with their tenant relationships
    const usersWithTenants = allUsers.users.map((authUser) => {
      const tenantRelationships = userTenants?.filter(ut => ut.user_id === authUser.id) || [];
      return {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email,
        created_at: authUser.created_at,
        email_confirmed: !!authUser.email_confirmed_at,
        tenants: tenantRelationships.map(ut => ({
          tenant_id: ut.tenant_id,
          tenant_name: (ut.tenants as any)?.name,
          role: ut.role,
          status: ut.status,
        })),
      };
    });

    return NextResponse.json({ users: usersWithTenants });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/users - Create a new user and assign to tenant(s) (system_admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system_admin or super_admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin', 'super_admin'])
      .single();

    if (!userTenant || !['system_admin', 'super_admin'].includes(userTenant.role)) {
      return NextResponse.json({ error: 'Forbidden: System admin or super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, name, tenant_ids, role = 'viewer' } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (!tenant_ids || !Array.isArray(tenant_ids) || tenant_ids.length === 0) {
      return NextResponse.json({ error: 'At least one tenant_id is required' }, { status: 400 });
    }

    // Validate role
    // Support both tenant_admin (legacy) and organization_admin (new) - they map to the same role
    const validRoles = ['system_admin', 'super_admin', 'tenant_admin', 'organization_admin', 'subtenant_admin', 'workspace_admin', 'agent', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
    }
    
    // Normalize role names: organization_admin -> tenant_admin (database uses tenant_admin)
    const normalizedRole = role === 'organization_admin' ? 'tenant_admin' : 
                          role === 'workspace_admin' ? 'subtenant_admin' : role;

    // Step 1: Create auth user
    const { data: authData, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name || email,
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Step 2: Verify tenant IDs exist
    const { data: tenants, error: tenantsError } = await adminSupabase
      .from('tenants')
      .select('id, name')
      .in('id', tenant_ids);

    if (tenantsError) {
      return NextResponse.json({ error: tenantsError.message }, { status: 500 });
    }

    if (!tenants || tenants.length !== tenant_ids.length) {
      return NextResponse.json({ error: 'One or more tenant IDs are invalid' }, { status: 400 });
    }

    // Step 3: Create user-tenant relationships
    const userTenantInserts = tenant_ids.map((tenantId: string) => ({
      user_id: authData.user.id,
      tenant_id: tenantId,
      role: normalizedRole, // Use normalized role for database
      status: 'active',
    }));

    const { error: insertError } = await adminSupabase
      .from('user_tenants')
      .insert(userTenantInserts);

    if (insertError) {
      // If user-tenant insert fails, delete the auth user
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.name || authData.user.email,
        tenants: tenants.map(t => ({
          tenant_id: t.id,
          tenant_name: t.name,
          role,
        })),
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

