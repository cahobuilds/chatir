import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasPlatformPermission, resolveRoleId } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/users/[id] - Get user details with tenant relationships
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await hasPlatformPermission(user.id, 'platform_users.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Platform access required' }, { status: 403 });
    }

    // Get user details
    const { data: authUser, error: userError } = await adminSupabase.auth.admin.getUserById(id);
    
    if (userError || !authUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user-tenant relationships
    const { data: userTenants, error: userTenantsError } = await adminSupabase
      .from('user_tenants')
      .select('id, tenant_id, role, status, last_login, created_at, tenants(id, name)')
      .eq('user_id', id);

    if (userTenantsError) {
      return NextResponse.json({ error: userTenantsError.message }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        name: authUser.user.user_metadata?.name || authUser.user.email,
        created_at: authUser.user.created_at,
        email_confirmed: !!authUser.user.email_confirmed_at,
        last_login: authUser.user.last_sign_in_at,
        tenants: userTenants?.map(ut => ({
          id: ut.id,
          tenant_id: ut.tenant_id,
          tenant_name: (ut.tenants as any)?.name,
          role: ut.role,
          status: ut.status,
          last_login: ut.last_login,
          created_at: ut.created_at,
        })) || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/users/[id] - Update user and tenant relationships
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await hasPlatformPermission(user.id, 'platform_users.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Platform access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, tenant_assignments } = body;

    // Resolve every requested role to its canonical role_id up front, before any write:
    // permission checks read user_tenants.role_id, so a membership row written without it
    // silently strips the user of all access. Failing here keeps the update all-or-nothing.
    const resolvedAssignments = new Map<string, { role: string; roleId: string }>();
    if (tenant_assignments && Array.isArray(tenant_assignments)) {
      for (const assignment of tenant_assignments) {
        const requestedRole = assignment.role || 'viewer';
        // organization_admin/workspace_admin are UI aliases of the legacy database names.
        const normalizedRole = requestedRole === 'organization_admin' ? 'tenant_admin' :
                               requestedRole === 'workspace_admin' ? 'subtenant_admin' : requestedRole;
        const roleId = await resolveRoleId(normalizedRole, adminSupabase);
        if (!roleId) {
          return NextResponse.json(
            { error: `Role '${requestedRole}' does not map to an active role. No changes were made.` },
            { status: 400 }
          );
        }
        resolvedAssignments.set(assignment.tenant_id, { role: normalizedRole, roleId });
      }
    }

    // Update user metadata if name is provided
    if (name !== undefined) {
      const { error: updateError } = await adminSupabase.auth.admin.updateUserById(id, {
        user_metadata: { name },
      });
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    // Update email if provided
    if (email !== undefined && email !== '') {
      const { error: emailError } = await adminSupabase.auth.admin.updateUserById(id, {
        email,
      });
      if (emailError) {
        return NextResponse.json({ error: emailError.message }, { status: 500 });
      }
    }

    // Update tenant assignments if provided
    if (tenant_assignments && Array.isArray(tenant_assignments)) {
      // Get existing tenant relationships
      const { data: existingTenants } = await adminSupabase
        .from('user_tenants')
        .select('id, tenant_id')
        .eq('user_id', id);

      const existingTenantIds = new Set(existingTenants?.map(et => et.tenant_id) || []);
      const newTenantIds = new Set(tenant_assignments.map((ta: any) => ta.tenant_id));

      // Update existing relationships
      for (const assignment of tenant_assignments) {
        // Always present: the map was populated from this same array above.
        const resolved = resolvedAssignments.get(assignment.tenant_id)!;

        if (existingTenantIds.has(assignment.tenant_id)) {
          // Update existing relationship
          const existing = existingTenants?.find(et => et.tenant_id === assignment.tenant_id);
          if (existing) {
            await adminSupabase
              .from('user_tenants')
              .update({
                role: resolved.role,
                role_id: resolved.roleId,
                status: assignment.status || 'active',
              })
              .eq('id', existing.id);
          }
        } else {
          // Create new relationship
          await adminSupabase
            .from('user_tenants')
            .insert({
              user_id: id,
              tenant_id: assignment.tenant_id,
              role: resolved.role,
              role_id: resolved.roleId,
              status: assignment.status || 'active',
            });
        }
      }

      // Remove relationships that are no longer in the list
      const tenantsToRemove = existingTenants?.filter(
        et => !newTenantIds.has(et.tenant_id)
      ) || [];

      for (const toRemove of tenantsToRemove) {
        await adminSupabase
          .from('user_tenants')
          .delete()
          .eq('id', toRemove.id);
      }
    }

    // Fetch updated user data
    const { data: updatedUser, error: fetchUserError } = await adminSupabase.auth.admin.getUserById(id);
    
    if (fetchUserError || !updatedUser?.user) {
      return NextResponse.json({ error: 'Failed to fetch updated user data' }, { status: 500 });
    }
    
    const { data: updatedTenants } = await adminSupabase
      .from('user_tenants')
      .select('id, tenant_id, role, status, last_login, created_at, tenants(id, name)')
      .eq('user_id', id);

    return NextResponse.json({
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        name: updatedUser.user.user_metadata?.name || updatedUser.user.email,
        tenants: updatedTenants?.map(ut => ({
          id: ut.id,
          tenant_id: ut.tenant_id,
          tenant_name: (ut.tenants as any)?.name,
          role: ut.role,
          status: ut.status,
        })) || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await hasPlatformPermission(user.id, 'platform_users.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Platform access required' }, { status: 403 });
    }

    // Prevent deleting yourself
    if (id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Delete user (this will cascade delete user_tenants relationships)
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(id);
    
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

