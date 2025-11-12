-- Populate role_permissions table with comprehensive permissions based on Retell AI capabilities

-- System Admin - All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.permission_id
FROM roles r
CROSS JOIN (
  VALUES
    -- Tenant/Organization permissions
    ('tenant.view'), ('tenant.create'), ('tenant.update'), ('tenant.delete'), ('tenant.billing'),
    -- User management
    ('users.view'), ('users.create'), ('users.update'), ('users.delete'), ('users.manage_roles'),
    -- Agent management
    ('agents.view'), ('agents.create'), ('agents.update'), ('agents.delete'), ('agents.manage'),
    -- Interaction/Call management
    ('interactions.view'), ('interactions.create'), ('interactions.monitor'), ('interactions.export'), ('interactions.delete'),
    ('calls.initiate'), ('calls.monitor'), ('calls.intervene'), ('calls.record'),
    -- Phone number management
    ('phone_numbers.view'), ('phone_numbers.purchase'), ('phone_numbers.assign'), ('phone_numbers.release'),
    -- Analytics
    ('analytics.view'), ('analytics.export'), ('analytics.custom_reports'),
    -- Billing
    ('billing.view'), ('billing.manage'), ('billing.export'),
    -- API management
    ('api.keys.view'), ('api.keys.create'), ('api.keys.delete'), ('api.keys.rotate'),
    -- Settings
    ('settings.view'), ('settings.update'), ('settings.system'),
    -- Knowledge base (for Retell AI)
    ('knowledge.view'), ('knowledge.create'), ('knowledge.update'), ('knowledge.delete'),
    -- Webhooks
    ('webhooks.view'), ('webhooks.create'), ('webhooks.update'), ('webhooks.delete')
) AS p(permission_id)
WHERE r.name = 'system_admin';

-- Super Admin - All except system settings
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.permission_id
FROM roles r
CROSS JOIN (
  VALUES
    ('tenant.view'), ('tenant.create'), ('tenant.update'), ('tenant.billing'),
    ('users.view'), ('users.create'), ('users.update'), ('users.delete'), ('users.manage_roles'),
    ('agents.view'), ('agents.create'), ('agents.update'), ('agents.delete'), ('agents.manage'),
    ('interactions.view'), ('interactions.create'), ('interactions.monitor'), ('interactions.export'), ('interactions.delete'),
    ('calls.initiate'), ('calls.monitor'), ('calls.intervene'), ('calls.record'),
    ('phone_numbers.view'), ('phone_numbers.purchase'), ('phone_numbers.assign'), ('phone_numbers.release'),
    ('analytics.view'), ('analytics.export'), ('analytics.custom_reports'),
    ('billing.view'), ('billing.manage'), ('billing.export'),
    ('api.keys.view'), ('api.keys.create'), ('api.keys.delete'), ('api.keys.rotate'),
    ('settings.view'), ('settings.update'),
    ('knowledge.view'), ('knowledge.create'), ('knowledge.update'), ('knowledge.delete'),
    ('webhooks.view'), ('webhooks.create'), ('webhooks.update'), ('webhooks.delete')
) AS p(permission_id)
WHERE r.name = 'super_admin';

-- Organization Admin - Full organization access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.permission_id
FROM roles r
CROSS JOIN (
  VALUES
    ('tenant.view'), ('tenant.update'), ('tenant.billing'),
    ('users.view'), ('users.create'), ('users.update'), ('users.delete'),
    ('agents.view'), ('agents.create'), ('agents.update'), ('agents.delete'), ('agents.manage'),
    ('interactions.view'), ('interactions.monitor'), ('interactions.export'),
    ('calls.initiate'), ('calls.monitor'), ('calls.intervene'), ('calls.record'),
    ('phone_numbers.view'), ('phone_numbers.purchase'), ('phone_numbers.assign'), ('phone_numbers.release'),
    ('analytics.view'), ('analytics.export'), ('analytics.custom_reports'),
    ('billing.view'), ('billing.manage'),
    ('api.keys.view'), ('api.keys.create'), ('api.keys.delete'),
    ('settings.view'), ('settings.update'),
    ('knowledge.view'), ('knowledge.create'), ('knowledge.update'), ('knowledge.delete'),
    ('webhooks.view'), ('webhooks.create'), ('webhooks.update'), ('webhooks.delete')
) AS p(permission_id)
WHERE r.name = 'organization_admin';

-- Manager - Team management and oversight
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.permission_id
FROM roles r
CROSS JOIN (
  VALUES
    ('users.view'), ('users.create'), ('users.update'),
    ('agents.view'), ('agents.create'), ('agents.update'),
    ('interactions.view'), ('interactions.monitor'), ('interactions.export'),
    ('calls.initiate'), ('calls.monitor'),
    ('phone_numbers.view'),
    ('analytics.view'), ('analytics.export'), ('analytics.custom_reports'),
    ('billing.view'),
    ('knowledge.view'), ('knowledge.create'), ('knowledge.update')
) AS p(permission_id)
WHERE r.name = 'manager';

-- Call Manager - Call and interaction management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.permission_id
FROM roles r
CROSS JOIN (
  VALUES
    ('agents.view'),
    ('interactions.view'), ('interactions.create'), ('interactions.monitor'), ('interactions.export'),
    ('calls.initiate'), ('calls.monitor'), ('calls.intervene'), ('calls.record'),
    ('phone_numbers.view'), ('phone_numbers.assign'),
    ('analytics.view'), ('analytics.export')
) AS p(permission_id)
WHERE r.name = 'call_manager';

-- Agent - Manage assigned agents
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.permission_id
FROM roles r
CROSS JOIN (
  VALUES
    ('agents.view'), ('agents.update'),
    ('interactions.view'), ('interactions.monitor'),
    ('calls.monitor'),
    ('analytics.view')
) AS p(permission_id)
WHERE r.name = 'agent';

-- Analyst - Analytics and reporting
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.permission_id
FROM roles r
CROSS JOIN (
  VALUES
    ('agents.view'),
    ('interactions.view'), ('interactions.export'),
    ('analytics.view'), ('analytics.export'), ('analytics.custom_reports'),
    ('billing.view')
) AS p(permission_id)
WHERE r.name = 'analyst';

-- User - Standard access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.permission_id
FROM roles r
CROSS JOIN (
  VALUES
    ('agents.view'),
    ('interactions.view'),
    ('analytics.view')
) AS p(permission_id)
WHERE r.name = 'user';

-- Viewer - Read-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.permission_id
FROM roles r
CROSS JOIN (
  VALUES
    ('agents.view'),
    ('interactions.view'),
    ('analytics.view')
) AS p(permission_id)
WHERE r.name = 'viewer';

