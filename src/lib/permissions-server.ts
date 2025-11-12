// Server-side permission checking utilities
// These functions MUST only be used in API routes and server components
// Never import this file in client components

import { createClient } from '@/lib/supabase/server';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface RolePermissions {
  role: string;
  displayName: string;
  description: string;
  permissions: Permission[];
}

// Check if a user has a specific permission
// This queries the database and should only be used server-side
export async function hasPermission(
  userId: string,
  tenantId: string,
  permissionId: string
): Promise<boolean> {
  const supabase = await createClient();
  
  // Get user's role for this tenant
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('role_id, role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();

  if (!userTenant) {
    return false;
  }

  // If using new role system (role_id exists), check role_permissions table
  if (userTenant.role_id) {
    const { data } = await supabase
      .from('role_permissions')
      .select('id')
      .eq('role_id', userTenant.role_id)
      .eq('permission_id', permissionId)
      .single();

    return !!data;
  }

  // Fallback to legacy role-based permission check
  // This uses hardcoded mappings but is still server-side
  return hasPermissionForLegacyRole(userTenant.role, permissionId);
}

// Check if a role has a specific permission (legacy role system)
// This is a fallback for backward compatibility
function hasPermissionForLegacyRole(role: string, permissionId: string): boolean {
  // Import permission mappings (these are constants, not security logic)
  // Using dynamic import to avoid circular dependencies
  const permissionsModule = require('./permissions');
  const rolePerms = permissionsModule.ROLE_PERMISSIONS?.[role];
  
  if (!rolePerms) {
    return false;
  }

  return rolePerms.permissions?.some((p: Permission) => p.id === permissionId) || false;
}

// Get all permissions for a user in a tenant
export async function getUserPermissions(
  userId: string,
  tenantId: string
): Promise<Permission[]> {
  const supabase = await createClient();
  
  // Get user's role for this tenant
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('role_id, role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();

  if (!userTenant) {
    return [];
  }

  // If using new role system (role_id exists), get permissions from database
  if (userTenant.role_id) {
    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select(`
        permission_id,
        permissions (*)
      `)
      .eq('role_id', userTenant.role_id);

    if (rolePerms) {
      return rolePerms
        .map((rp: any) => rp.permissions)
        .filter((p: Permission | null) => p !== null);
    }
  }

  // Fallback to legacy role-based permissions
  const permissionsModule = require('./permissions');
  const rolePerms = permissionsModule.ROLE_PERMISSIONS?.[userTenant.role];
  
  return rolePerms?.permissions || [];
}

// Get role info for a user in a tenant (server-side)
export async function getUserRoleInfo(
  userId: string,
  tenantId: string
): Promise<RolePermissions | null> {
  const supabase = await createClient();
  
  // Get user's role for this tenant
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('role_id, role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();

  if (!userTenant) {
    return null;
  }

  // If using new role system (role_id exists), get role from database
  if (userTenant.role_id) {
    const { data: role } = await supabase
      .from('roles')
      .select('*')
      .eq('id', userTenant.role_id)
      .single();

    if (role) {
      const permissions = await getUserPermissions(userId, tenantId);
      return {
        role: role.name,
        displayName: role.display_name,
        description: role.description || '',
        permissions,
      };
    }
  }

  // Fallback to legacy role system
  const permissionsModule = require('./permissions');
  return permissionsModule.ROLE_PERMISSIONS?.[userTenant.role] || null;
}

// Check if user has any of the specified roles
export async function hasAnyRole(
  userId: string,
  tenantId: string,
  roles: string[]
): Promise<boolean> {
  const supabase = await createClient();
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('role_id, role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();

  if (!userTenant) {
    return false;
  }

  // Check legacy role first
  if (roles.includes(userTenant.role)) {
    return true;
  }

  // If using new role system, check role name
  if (userTenant.role_id) {
    const { data: role } = await supabase
      .from('roles')
      .select('name')
      .eq('id', userTenant.role_id)
      .single();

    if (role && roles.includes(role.name)) {
      return true;
    }
  }

  return false;
}

