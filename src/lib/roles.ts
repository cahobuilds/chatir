// Server-side role management system with comprehensive roles for AI infrastructure management
// IMPORTANT: This file contains server-side functions only. Never import this in client components.
// Use roles-client.ts for client-side display utilities.
import { createClient } from '@/lib/supabase/server';

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  hierarchy_level: number;
  category: 'system' | 'platform' | 'organization' | 'team' | 'standard';
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

// Note: Client-side utilities moved to roles-client.ts to avoid server/client mixing

// Get all roles
export async function getAllRoles(): Promise<Role[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('is_active', true)
    .order('hierarchy_level', { ascending: false });

  if (error) {
    console.error('Error fetching roles:', error);
    return [];
  }

  return data || [];
}

// Get role by ID
export async function getRoleById(roleId: string): Promise<Role | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (error) {
    console.error('Error fetching role:', error);
    return null;
  }

  return data;
}

// Get role by name
export async function getRoleByName(name: string): Promise<Role | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('name', name)
    .single();

  if (error) {
    console.error('Error fetching role:', error);
    return null;
  }

  return data;
}

// Get permissions for a role
export async function getRolePermissions(roleId: string): Promise<string[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', roleId);

  if (error) {
    console.error('Error fetching role permissions:', error);
    return [];
  }

  return data?.map(rp => rp.permission_id) || [];
}

// Check if role has permission
export async function roleHasPermission(roleId: string, permissionId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('role_permissions')
    .select('id')
    .eq('role_id', roleId)
    .eq('permission_id', permissionId)
    .single();

  if (error) {
    return false;
  }

  return !!data;
}

// Note: Client-side utility functions moved to roles-client.ts

