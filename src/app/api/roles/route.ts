import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasPlatformPermission } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/roles - Get all roles
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if roles table exists by trying to query it
    const { error: rolesTableError } = await supabase
      .from('roles')
      .select('id')
      .limit(1);

    // If roles table doesn't exist, return error
    if (rolesTableError) {
      // Check if it's a "table doesn't exist" error
      if (rolesTableError.code === '42P01' || rolesTableError.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Roles table not found. Please run the roles migration first.',
          code: 'MIGRATION_REQUIRED',
          details: rolesTableError.message
        }, { status: 503 });
      }
      // Other errors might be permission-related, continue to check user permissions
    }

    // Get user's role - check both role_id (new) and role (legacy)
    const { data: userTenants, error: userTenantsError } = await supabase
      .from('user_tenants')
      .select('role, role_id, roles(name)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (userTenantsError) {
      return NextResponse.json({ error: userTenantsError.message }, { status: 500 });
    }

    // Determine user role - prefer role_id from roles table, fallback to legacy role column
    let userRole: string | null = null;
    if (userTenants?.role_id && userTenants?.roles) {
      userRole = (userTenants.roles as any)?.name || null;
    } else if (userTenants?.role) {
      userRole = userTenants.role;
    }

    // Check query parameter for simple list (used in dropdowns)
    const { searchParams } = new URL(request.url);
    const simple = searchParams.get('simple') === 'true';
    
    if (simple) {
      // Simple list for dropdowns - allow any authenticated user to see roles
      // This is needed for user assignment dropdowns
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('id, name, display_name, category, hierarchy_level')
        .eq('is_active', true)
        .order('hierarchy_level', { ascending: false });

      if (rolesError) {
        return NextResponse.json({ 
          error: rolesError.message,
          code: rolesError.code,
          details: 'Failed to fetch roles list'
        }, { status: 500 });
      }

      return NextResponse.json({ roles: roles || [] });
    }
    
    // Full role management - platform staff only.
    if (!(await hasPlatformPermission(user.id, 'platform_users.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Platform access required.' }, { status: 403 });
    }

    // Get all roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('hierarchy_level', { ascending: false });

    if (rolesError) {
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    // Get permission counts for each role
    const rolesWithCounts = await Promise.all(
      (roles || []).map(async (role) => {
        const { count } = await supabase
          .from('role_permissions')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', role.id);

        const { count: userCount } = await supabase
          .from('user_tenants')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', role.id)
          .eq('status', 'active');

        return {
          ...role,
          permission_count: count || 0,
          user_count: userCount || 0,
        };
      })
    );

    return NextResponse.json({ roles: rolesWithCounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/roles - Create a new role (system_admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await hasPlatformPermission(user.id, 'platform_users.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Platform access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, display_name, description, hierarchy_level, category, permissions } = body;

    if (!name || !display_name || hierarchy_level === undefined) {
      return NextResponse.json(
        { error: 'name, display_name, and hierarchy_level are required' },
        { status: 400 }
      );
    }

    // Create role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        name,
        display_name,
        description: description || null,
        hierarchy_level,
        category: category || 'standard',
        is_system_role: false,
        is_active: true,
      })
      .select()
      .single();

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    // Add permissions if provided
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const permissionInserts = permissions.map((permissionId: string) => ({
        role_id: role.id,
        permission_id: permissionId,
      }));

      const { error: permError } = await supabase
        .from('role_permissions')
        .insert(permissionInserts);

      if (permError) {
        // Rollback role creation
        await supabase.from('roles').delete().eq('id', role.id);
        return NextResponse.json({ error: permError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ role }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

