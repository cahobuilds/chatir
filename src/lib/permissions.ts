// Permission mapping for different roles
// Note: This file maintains backward compatibility with the old role system
// New roles are managed via the roles table in the database
export type LegacyRole = 'super_admin' | 'tenant_admin' | 'subtenant_admin' | 'agent' | 'viewer';
export type Role = 'system_admin' | 'super_admin' | 'organization_admin' | 'manager' | 'call_manager' | 'agent' | 'analyst' | 'user' | 'viewer';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface RolePermissions {
  role: Role | LegacyRole;
  displayName: string;
  description: string;
  permissions: Permission[];
}

// Define all available permissions
export const ALL_PERMISSIONS: Permission[] = [
  // Tenant/Organization permissions
  { id: 'tenant.view', name: 'tenant.view', description: 'View tenant information', category: 'Tenants' },
  { id: 'tenant.update', name: 'tenant.update', description: 'Update tenant settings', category: 'Tenants' },
  { id: 'tenant.delete', name: 'tenant.delete', description: 'Delete tenant', category: 'Tenants' },
  { id: 'tenant.billing', name: 'tenant.billing', description: 'Manage billing and subscriptions', category: 'Tenants' },
  
  // User management permissions
  { id: 'users.view', name: 'users.view', description: 'View users', category: 'Users' },
  { id: 'users.create', name: 'users.create', description: 'Create new users', category: 'Users' },
  { id: 'users.update', name: 'users.update', description: 'Update user information', category: 'Users' },
  { id: 'users.delete', name: 'users.delete', description: 'Delete users', category: 'Users' },
  { id: 'users.manage_roles', name: 'users.manage_roles', description: 'Manage user roles and permissions', category: 'Users' },
  
  // Agent permissions
  { id: 'agents.view', name: 'agents.view', description: 'View agents', category: 'Agents' },
  { id: 'agents.create', name: 'agents.create', description: 'Create new agents', category: 'Agents' },
  { id: 'agents.update', name: 'agents.update', description: 'Update agent configuration', category: 'Agents' },
  { id: 'agents.delete', name: 'agents.delete', description: 'Delete agents', category: 'Agents' },
  { id: 'agents.manage', name: 'agents.manage', description: 'Full agent management', category: 'Agents' },
  
  // Interaction permissions
  { id: 'interactions.view', name: 'interactions.view', description: 'View interactions', category: 'Interactions' },
  { id: 'interactions.monitor', name: 'interactions.monitor', description: 'Monitor live interactions', category: 'Interactions' },
  { id: 'interactions.export', name: 'interactions.export', description: 'Export interaction data', category: 'Interactions' },
  
  // Analytics permissions
  { id: 'analytics.view', name: 'analytics.view', description: 'View analytics and reports', category: 'Analytics' },
  { id: 'analytics.export', name: 'analytics.export', description: 'Export analytics data', category: 'Analytics' },
  
  // Billing permissions
  { id: 'billing.view', name: 'billing.view', description: 'View billing information', category: 'Billing' },
  { id: 'billing.manage', name: 'billing.manage', description: 'Manage billing and payments', category: 'Billing' },
  
  // API permissions
  { id: 'api.keys.view', name: 'api.keys.view', description: 'View API keys', category: 'API' },
  { id: 'api.keys.create', name: 'api.keys.create', description: 'Create API keys', category: 'API' },
  { id: 'api.keys.delete', name: 'api.keys.delete', description: 'Delete API keys', category: 'API' },
  
  // Settings permissions
  { id: 'settings.view', name: 'settings.view', description: 'View settings', category: 'Settings' },
  { id: 'settings.update', name: 'settings.update', description: 'Update settings', category: 'Settings' },
  { id: 'settings.system', name: 'settings.system', description: 'Manage system-level settings', category: 'Settings' },
  
  // Call management permissions (Retell AI specific)
  { id: 'calls.initiate', name: 'calls.initiate', description: 'Initiate phone calls', category: 'Calls' },
  { id: 'calls.monitor', name: 'calls.monitor', description: 'Monitor live calls', category: 'Calls' },
  { id: 'calls.intervene', name: 'calls.intervene', description: 'Intervene in live calls', category: 'Calls' },
  { id: 'calls.record', name: 'calls.record', description: 'Access call recordings', category: 'Calls' },
  
  // Phone number management (Retell AI specific)
  { id: 'phone_numbers.view', name: 'phone_numbers.view', description: 'View phone numbers', category: 'Phone Numbers' },
  { id: 'phone_numbers.purchase', name: 'phone_numbers.purchase', description: 'Purchase phone numbers', category: 'Phone Numbers' },
  { id: 'phone_numbers.assign', name: 'phone_numbers.assign', description: 'Assign phone numbers to agents', category: 'Phone Numbers' },
  { id: 'phone_numbers.release', name: 'phone_numbers.release', description: 'Release phone numbers', category: 'Phone Numbers' },
  
  // Knowledge base permissions (Retell AI specific)
  { id: 'knowledge.view', name: 'knowledge.view', description: 'View knowledge base', category: 'Knowledge Base' },
  { id: 'knowledge.create', name: 'knowledge.create', description: 'Create knowledge articles', category: 'Knowledge Base' },
  { id: 'knowledge.update', name: 'knowledge.update', description: 'Update knowledge articles', category: 'Knowledge Base' },
  { id: 'knowledge.delete', name: 'knowledge.delete', description: 'Delete knowledge articles', category: 'Knowledge Base' },
  
  // Webhook permissions
  { id: 'webhooks.view', name: 'webhooks.view', description: 'View webhooks', category: 'Webhooks' },
  { id: 'webhooks.create', name: 'webhooks.create', description: 'Create webhooks', category: 'Webhooks' },
  { id: 'webhooks.update', name: 'webhooks.update', description: 'Update webhooks', category: 'Webhooks' },
  { id: 'webhooks.delete', name: 'webhooks.delete', description: 'Delete webhooks', category: 'Webhooks' },
  
  // Additional permissions
  { id: 'interactions.create', name: 'interactions.create', description: 'Create interactions', category: 'Interactions' },
  { id: 'interactions.delete', name: 'interactions.delete', description: 'Delete interactions', category: 'Interactions' },
  { id: 'analytics.custom_reports', name: 'analytics.custom_reports', description: 'Create custom reports', category: 'Analytics' },
  { id: 'api.keys.rotate', name: 'api.keys.rotate', description: 'Rotate API keys', category: 'API' },
  { id: 'tenant.create', name: 'tenant.create', description: 'Create new tenants', category: 'Tenants' },
];

// Role-based permission mappings (backward compatibility)
// New roles should use the database roles table
export const ROLE_PERMISSIONS: Record<Role | LegacyRole, RolePermissions> = {
  // New roles
  system_admin: {
    role: 'system_admin',
    displayName: 'System Admin',
    description: 'Full platform access with all permissions across all organizations. Can manage system settings, all tenants, and platform infrastructure.',
    permissions: ALL_PERMISSIONS,
  },
  organization_admin: {
    role: 'organization_admin',
    displayName: 'Organization Admin',
    description: 'Full administrative access to organization settings, user management, agent configuration, and billing.',
    permissions: ALL_PERMISSIONS.filter(p => 
      !p.id.startsWith('settings.system') && // Can't manage system settings
      p.id !== 'tenant.create' && // Can't create tenants
      p.id !== 'tenant.delete' // Can't delete tenants
    ),
  },
  manager: {
    role: 'manager',
    displayName: 'Manager',
    description: 'Manages teams and departments within an organization. Can view analytics, manage assigned agents, and oversee team interactions.',
    permissions: ALL_PERMISSIONS.filter(p => 
      p.id.startsWith('users.view') ||
      p.id.startsWith('users.create') ||
      p.id.startsWith('users.update') ||
      p.id.startsWith('agents.') ||
      p.id.startsWith('interactions.') ||
      p.id.startsWith('analytics.') ||
      p.id.startsWith('calls.') ||
      p.id.startsWith('knowledge.view') ||
      p.id.startsWith('knowledge.create') ||
      p.id.startsWith('knowledge.update') ||
      p.id === 'billing.view'
    ),
  },
  call_manager: {
    role: 'call_manager',
    displayName: 'Call Manager',
    description: 'Manages phone calls, interactions, and call monitoring. Can initiate calls, monitor live conversations, and manage call queues.',
    permissions: ALL_PERMISSIONS.filter(p => 
      p.id.startsWith('agents.view') ||
      p.id.startsWith('interactions.') ||
      p.id.startsWith('calls.') ||
      p.id.startsWith('phone_numbers.view') ||
      p.id.startsWith('phone_numbers.assign') ||
      p.id.startsWith('analytics.view') ||
      p.id.startsWith('analytics.export')
    ),
  },
  analyst: {
    role: 'analyst',
    displayName: 'Analyst',
    description: 'Read-only access to analytics, reports, and interaction data. Can export data and generate insights.',
    permissions: ALL_PERMISSIONS.filter(p => 
      p.id.startsWith('agents.view') ||
      p.id.startsWith('interactions.view') ||
      p.id.startsWith('interactions.export') ||
      p.id.startsWith('analytics.') ||
      p.id === 'billing.view'
    ),
  },
  user: {
    role: 'user',
    displayName: 'User',
    description: 'Standard user access with basic permissions to view agents and interactions within their scope.',
    permissions: ALL_PERMISSIONS.filter(p => 
      p.id === 'agents.view' ||
      p.id === 'interactions.view' ||
      p.id === 'analytics.view'
    ),
  },
  // Legacy roles (maintained for backward compatibility)
  super_admin: {
    role: 'super_admin',
    displayName: 'Super Admin',
    description: 'Full administrative access to tenant settings, user management, agent configuration, and billing. Can manage all aspects of the tenant.',
    permissions: ALL_PERMISSIONS.filter(p => 
      !p.id.startsWith('settings.system') && // Can't manage system settings
      p.id !== 'tenant.create' && // Can't create tenants
      p.id !== 'tenant.delete' // Can't delete tenants
    ),
  },
  tenant_admin: {
    role: 'tenant_admin',
    displayName: 'Tenant Admin',
    description: 'Administrative access to tenant settings, user management, and content oversight',
    permissions: ALL_PERMISSIONS.filter(p => 
      !p.id.startsWith('tenant.delete') && // Can't delete tenant
      p.id !== 'users.manage_roles' // Can't manage roles (only super_admin can)
    ),
  },
  subtenant_admin: {
    role: 'subtenant_admin',
    displayName: 'Subtenant Admin',
    description: 'Administrative access to subtenant settings and user management',
    permissions: ALL_PERMISSIONS.filter(p => 
      p.id.startsWith('agents.') ||
      p.id.startsWith('interactions.') ||
      p.id.startsWith('analytics.') ||
      p.id.startsWith('users.view') ||
      p.id.startsWith('users.create') ||
      p.id.startsWith('users.update') ||
      p.id === 'settings.view' ||
      p.id === 'settings.update'
    ),
  },
  agent: {
    role: 'agent',
    displayName: 'Agent',
    description: 'Access to manage assigned agents and view interactions',
    permissions: ALL_PERMISSIONS.filter(p => 
      p.id.startsWith('agents.view') ||
      p.id.startsWith('agents.update') ||
      p.id.startsWith('interactions.view') ||
      p.id.startsWith('interactions.monitor') ||
      p.id === 'analytics.view'
    ),
  },
  viewer: {
    role: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to view agents, interactions, and analytics',
    permissions: ALL_PERMISSIONS.filter(p => 
      p.id.endsWith('.view') ||
      p.id === 'analytics.view'
    ),
  },
};

// NOTE: Security-critical functions have been moved to permissions-server.ts
// These functions below are for display/UI purposes only and should NOT be used
// for authorization decisions. Always use server-side permission checks via API.

// Helper function to get permissions for a role (DISPLAY ONLY - NOT FOR SECURITY)
// Use /api/permissions/check endpoint for actual permission checks
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role]?.permissions || [];
}

// Helper function to get role info (DISPLAY ONLY - NOT FOR SECURITY)
// Use /api/permissions/check endpoint for actual role info
export function getRoleInfo(role: Role): RolePermissions | null {
  return ROLE_PERMISSIONS[role] || null;
}

// DEPRECATED: This function should NOT be used for authorization
// Use /api/permissions/check endpoint instead for server-side permission checks
// This is kept only for backward compatibility in display components
export function hasPermission(role: Role, permissionId: string): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.some(p => p.id === permissionId);
}

// Group permissions by category
export function groupPermissionsByCategory(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);
}

