-- Seed default role permissions based on Retell AI and platform requirements
-- This migration assigns permissions to the default system roles

-- System Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN (
  SELECT unnest(ARRAY[
    'tenant.view', 'tenant.update', 'tenant.delete', 'tenant.billing', 'tenant.create',
    'users.view', 'users.create', 'users.update', 'users.delete', 'users.manage_roles',
    'agents.view', 'agents.create', 'agents.update', 'agents.delete', 'agents.manage',
    'interactions.view', 'interactions.monitor', 'interactions.export', 'interactions.create', 'interactions.delete',
    'analytics.view', 'analytics.export', 'analytics.custom_reports',
    'billing.view', 'billing.manage',
    'api.keys.view', 'api.keys.create', 'api.keys.delete', 'api.keys.rotate',
    'settings.view', 'settings.update', 'settings.system',
    'calls.initiate', 'calls.monitor', 'calls.intervene', 'calls.record',
    'phone_numbers.view', 'phone_numbers.purchase', 'phone_numbers.assign', 'phone_numbers.release',
    'knowledge.view', 'knowledge.create', 'knowledge.update', 'knowledge.delete',
    'webhooks.view', 'webhooks.create', 'webhooks.update', 'webhooks.delete'
  ]) AS id
) p
WHERE r.name = 'system_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Super Admin: All permissions except system settings
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN (
  SELECT unnest(ARRAY[
    'tenant.view', 'tenant.update', 'tenant.billing', 'tenant.create',
    'users.view', 'users.create', 'users.update', 'users.delete', 'users.manage_roles',
    'agents.view', 'agents.create', 'agents.update', 'agents.delete', 'agents.manage',
    'interactions.view', 'interactions.monitor', 'interactions.export', 'interactions.create', 'interactions.delete',
    'analytics.view', 'analytics.export', 'analytics.custom_reports',
    'billing.view', 'billing.manage',
    'api.keys.view', 'api.keys.create', 'api.keys.delete', 'api.keys.rotate',
    'settings.view', 'settings.update',
    'calls.initiate', 'calls.monitor', 'calls.intervene', 'calls.record',
    'phone_numbers.view', 'phone_numbers.purchase', 'phone_numbers.assign', 'phone_numbers.release',
    'knowledge.view', 'knowledge.create', 'knowledge.update', 'knowledge.delete',
    'webhooks.view', 'webhooks.create', 'webhooks.update', 'webhooks.delete'
  ]) AS id
) p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Organization Admin: Full organization access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN (
  SELECT unnest(ARRAY[
    'tenant.view', 'tenant.update', 'tenant.billing',
    'users.view', 'users.create', 'users.update', 'users.delete',
    'agents.view', 'agents.create', 'agents.update', 'agents.delete', 'agents.manage',
    'interactions.view', 'interactions.monitor', 'interactions.export', 'interactions.create', 'interactions.delete',
    'analytics.view', 'analytics.export', 'analytics.custom_reports',
    'billing.view', 'billing.manage',
    'api.keys.view', 'api.keys.create', 'api.keys.delete', 'api.keys.rotate',
    'settings.view', 'settings.update',
    'calls.initiate', 'calls.monitor', 'calls.intervene', 'calls.record',
    'phone_numbers.view', 'phone_numbers.purchase', 'phone_numbers.assign', 'phone_numbers.release',
    'knowledge.view', 'knowledge.create', 'knowledge.update', 'knowledge.delete',
    'webhooks.view', 'webhooks.create', 'webhooks.update', 'webhooks.delete'
  ]) AS id
) p
WHERE r.name = 'organization_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: Team management permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN (
  SELECT unnest(ARRAY[
    'users.view', 'users.create', 'users.update',
    'agents.view', 'agents.create', 'agents.update', 'agents.delete', 'agents.manage',
    'interactions.view', 'interactions.monitor', 'interactions.export', 'interactions.create',
    'analytics.view', 'analytics.export', 'analytics.custom_reports',
    'calls.initiate', 'calls.monitor', 'calls.intervene', 'calls.record',
    'knowledge.view', 'knowledge.create', 'knowledge.update',
    'billing.view'
  ]) AS id
) p
WHERE r.name = 'manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Call Manager: Call and interaction management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN (
  SELECT unnest(ARRAY[
    'agents.view',
    'interactions.view', 'interactions.monitor', 'interactions.export',
    'calls.initiate', 'calls.monitor', 'calls.intervene', 'calls.record',
    'phone_numbers.view', 'phone_numbers.assign',
    'analytics.view', 'analytics.export'
  ]) AS id
) p
WHERE r.name = 'call_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Agent: Agent management and monitoring
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN (
  SELECT unnest(ARRAY[
    'agents.view', 'agents.update',
    'interactions.view', 'interactions.monitor',
    'calls.monitor',
    'analytics.view'
  ]) AS id
) p
WHERE r.name = 'agent'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Analyst: Read-only analytics access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN (
  SELECT unnest(ARRAY[
    'agents.view',
    'interactions.view', 'interactions.export',
    'analytics.view', 'analytics.export', 'analytics.custom_reports',
    'billing.view'
  ]) AS id
) p
WHERE r.name = 'analyst'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User: Basic view access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN (
  SELECT unnest(ARRAY[
    'agents.view',
    'interactions.view',
    'analytics.view'
  ]) AS id
) p
WHERE r.name = 'user'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Viewer: Read-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN (
  SELECT unnest(ARRAY[
    'agents.view',
    'interactions.view',
    'analytics.view'
  ]) AS id
) p
WHERE r.name = 'viewer'
ON CONFLICT (role_id, permission_id) DO NOTHING;

