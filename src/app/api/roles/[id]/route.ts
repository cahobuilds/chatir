import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/roles/[id] - Get role by ID with permissions
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

    // Get role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Get permissions for this role
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', id);

    if (permError) {
      return NextResponse.json({ error: permError.message }, { status: 500 });
    }

    // Get user count
    const { count: userCount } = await supabase
      .from('user_tenants')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', id)
      .eq('status', 'active');

    return NextResponse.json({
      role: {
        ...role,
        permissions: permissions?.map(p => p.permission_id) || [],
        user_count: userCount || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/roles/[id] - Update role
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

    // Check if user is system_admin - check both role_id (new) and role (legacy)
    const { data: userTenants, error: userTenantsError } = await supabase
      .from('user_tenants')
      .select('role, role_id, roles(name)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (userTenantsError || !userTenants) {
      return NextResponse.json({ error: 'Forbidden: System admin only' }, { status: 403 });
    }

    // Determine user role - prefer role_id from roles table, fallback to legacy role column
    let userRole: string | null = null;
    if (userTenants.role_id && userTenants.roles) {
      userRole = (userTenants.roles as any)?.name || null;
    } else if (userTenants.role) {
      userRole = userTenants.role;
    }

    if (userRole !== 'system_admin') {
      return NextResponse.json({ error: 'Forbidden: System admin only' }, { status: 403 });
    }

    // System admin can edit all roles, including system roles
    // Only prevent deletion of system roles (handled in DELETE endpoint)

    const body = await request.json();
    const { display_name, description, hierarchy_level, category, is_active, permissions } = body;

    const updateData: any = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (description !== undefined) updateData.description = description;
    if (hierarchy_level !== undefined) updateData.hierarchy_level = hierarchy_level;
    if (category !== undefined) updateData.category = category;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Update role
    const { data: updatedRole, error: updateError } = await supabase
      .from('roles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update permissions if provided
    if (permissions !== undefined && Array.isArray(permissions)) {
      // Delete existing permissions
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', id);

      // Insert new permissions
      if (permissions.length > 0) {
        const permissionInserts = permissions.map((permissionId: string) => ({
          role_id: id,
          permission_id: permissionId,
        }));

        const { error: permError } = await supabase
          .from('role_permissions')
          .insert(permissionInserts);

        if (permError) {
          return NextResponse.json({ error: permError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ role: updatedRole });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/roles/[id] - Delete role
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

    // Check if user is system_admin - check both role_id (new) and role (legacy)
    const { data: userTenants, error: userTenantsError } = await supabase
      .from('user_tenants')
      .select('role, role_id, roles(name)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (userTenantsError || !userTenants) {
      return NextResponse.json({ error: 'Forbidden: System admin only' }, { status: 403 });
    }

    // Determine user role - prefer role_id from roles table, fallback to legacy role column
    let userRole: string | null = null;
    if (userTenants.role_id && userTenants.roles) {
      userRole = (userTenants.roles as any)?.name || null;
    } else if (userTenants.role) {
      userRole = userTenants.role;
    }

    if (userRole !== 'system_admin') {
      return NextResponse.json({ error: 'Forbidden: System admin only' }, { status: 403 });
    }

    // Check if role is system role
    const { data: role } = await supabase
      .from('roles')
      .select('is_system_role')
      .eq('id', id)
      .single();

    if (role?.is_system_role) {
      return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 400 });
    }

    // Check if role is in use
    const { count } = await supabase
      .from('user_tenants')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', id)
      .eq('status', 'active');

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Cannot delete role: ${count} user(s) are assigned to this role` },
        { status: 400 }
      );
    }

    // Delete role (permissions will be cascade deleted)
    const { error: deleteError } = await supabase
      .from('roles')
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

