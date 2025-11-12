// Client-side role utilities (presentation only - no server dependencies)
// IMPORTANT: These functions are for UI display purposes only.
// For actual permission checks and authorization, use server-side functions via API endpoints.

// Role type definition (matches server-side Role interface)
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

// Get role display name
export function getRoleDisplayName(roleName: string): string {
  const roleMap: Record<string, string> = {
    'system_admin': 'System Admin',
    'super_admin': 'Super Admin',
    'organization_admin': 'Organization Admin',
    'manager': 'Manager',
    'call_manager': 'Call Manager',
    'agent': 'Agent',
    'analyst': 'Analyst',
    'user': 'User',
    'viewer': 'Viewer',
  };

  return roleMap[roleName] || roleName;
}

// Get role category color for badges
export function getRoleCategoryColor(category: Role['category']): "primary" | "success" | "info" | "warning" | "error" | "light" | "dark" {
  const colorMap: Record<Role['category'], "primary" | "success" | "info" | "warning" | "error" | "light" | "dark"> = {
    'system': 'error',
    'platform': 'error',
    'organization': 'primary',
    'team': 'info',
    'standard': 'success',
  };

  return colorMap[category] || 'light';
}

// Compare role hierarchy (returns true if role1 >= role2)
export function compareRoleHierarchy(role1: Role, role2: Role): boolean {
  return role1.hierarchy_level >= role2.hierarchy_level;
}

// Role hierarchy constants
export const ROLE_HIERARCHY = {
  SYSTEM_ADMIN: 100,
  SUPER_ADMIN: 90,
  ORGANIZATION_ADMIN: 80,
  MANAGER: 60,
  CALL_MANAGER: 50,
  AGENT: 40,
  ANALYST: 30,
  USER: 20,
  VIEWER: 10,
} as const;

// Role categories
export const ROLE_CATEGORIES = {
  SYSTEM: 'system',
  PLATFORM: 'platform',
  ORGANIZATION: 'organization',
  TEAM: 'team',
  STANDARD: 'standard',
} as const;

