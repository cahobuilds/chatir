-- Assign permissions to Retell AI roles based on their access model
-- Retell Admin: Full control (all permissions except system settings)
-- Retell Developer: Functional access (no billing/user management)
-- Retell Member: Read-only access

-- Retell Admin permissions (all except system settings and tenant creation/deletion)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN (
  VALUES 
    -- Tenant permissions (view, update, billing - no create/delete)
    ('tenant.view'),
    ('tenant.update'),
    ('tenant.billing'),
    -- User management (all)
    ('users.view'),
    ('users.create'),
    ('users.update'),
    ('users.delete'),
    ('users.manage_roles'),
    -- Agents (all)
    ('agents.view'),
    ('agents.create'),
    ('agents.update'),
    ('agents.delete'),
    ('agents.manage'),
    -- Interactions (all)
    ('interactions.view'),
    ('interactions.create'),
    ('interactions.monitor'),
    ('interactions.export'),
    ('interactions.delete'),
    -- Analytics (all)
    ('analytics.view'),
    ('analytics.export'),
    ('analytics.custom_reports'),
    -- Billing (all)
    ('billing.view'),
    ('billing.manage'),
    -- API keys (all)
    ('api.keys.view'),
    ('api.keys.create'),
    ('api.keys.delete'),
    ('api.keys.rotate'),
    -- Settings (view and update, no system)
    ('settings.view'),
    ('settings.update'),
    -- Calls (all)
    ('calls.initiate'),
    ('calls.monitor'),
    ('calls.intervene'),
    ('calls.record'),
    -- Phone numbers (all)
    ('phone_numbers.view'),
    ('phone_numbers.purchase'),
    ('phone_numbers.assign'),
    ('phone_numbers.release'),
    -- Knowledge base (all)
    ('knowledge.view'),
    ('knowledge.create'),
    ('knowledge.update'),
    ('knowledge.delete'),
    -- Webhooks (all)
    ('webhooks.view'),
    ('webhooks.create'),
    ('webhooks.update'),
    ('webhooks.delete')
) AS p(id)
WHERE r.name = 'retell_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Retell Developer permissions (functional access, no billing/user management)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN (
  VALUES 
    -- Agents (all)
    ('agents.view'),
    ('agents.create'),
    ('agents.update'),
    ('agents.delete'),
    ('agents.manage'),
    -- Interactions (all)
    ('interactions.view'),
    ('interactions.create'),
    ('interactions.monitor'),
    ('interactions.export'),
    ('interactions.delete'),
    -- Analytics (all)
    ('analytics.view'),
    ('analytics.export'),
    ('analytics.custom_reports'),
    -- API keys (all)
    ('api.keys.view'),
    ('api.keys.create'),
    ('api.keys.delete'),
    ('api.keys.rotate'),
    -- Settings (view and update, no system)
    ('settings.view'),
    ('settings.update'),
    -- Calls (all)
    ('calls.initiate'),
    ('calls.monitor'),
    ('calls.intervene'),
    ('calls.record'),
    -- Phone numbers (view and assign, no purchase/release)
    ('phone_numbers.view'),
    ('phone_numbers.assign'),
    -- Knowledge base (all)
    ('knowledge.view'),
    ('knowledge.create'),
    ('knowledge.update'),
    ('knowledge.delete'),
    -- Webhooks (all)
    ('webhooks.view'),
    ('webhooks.create'),
    ('webhooks.update'),
    ('webhooks.delete')
) AS p(id)
WHERE r.name = 'retell_developer'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Retell Member permissions (read-only access)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN (
  VALUES 
    -- Agents (view only)
    ('agents.view'),
    -- Interactions (view and export only)
    ('interactions.view'),
    ('interactions.export'),
    -- Analytics (view and export only)
    ('analytics.view'),
    ('analytics.export'),
    -- API keys (view only)
    ('api.keys.view'),
    -- Settings (view only)
    ('settings.view'),
    -- Calls (view/monitor only, no initiate/intervene)
    ('calls.monitor'),
    ('calls.record'),
    -- Phone numbers (view only)
    ('phone_numbers.view'),
    -- Knowledge base (view only)
    ('knowledge.view'),
    -- Webhooks (view only)
    ('webhooks.view')
) AS p(id)
WHERE r.name = 'retell_member'
ON CONFLICT (role_id, permission_id) DO NOTHING;

