-- =============================================================================
-- Phase 1: Platform roles/permission cleanup + security (ADDITIVE)
-- 20260908000000_platform_roles_cleanup.sql
--
-- PURPOSE
--   Establish the canonical two-scope role model (platform | company) as the single
--   source of truth, seed a small fixed role set, add a real `permissions` table, and
--   rewrite RLS to close the user_tenants privilege-escalation hole. Also adds Stripe
--   columns. This migration is ADDITIVE: it keeps the app functioning because the
--   legacy `user_tenants.role` (text) column and `tenants.parent_id`/`is_reseller`
--   are left in place here and dropped only in the Phase-1b migration that ships
--   AFTER the Phase-2 code sweep.
--
--   APPLY ONLY AFTER REVIEW (see docs/ROLE_PERMISSION_CLEANUP_PLAN.md).
-- =============================================================================

SET search_path TO public, extensions;

-- -----------------------------------------------------------------------------
-- 1. permissions table (canonical permission catalog, scope-aware)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,        -- e.g. 'retell_key.manage'
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'standard',
  scope       TEXT NOT NULL CHECK (scope IN ('platform','company')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. roles.scope (platform | company)
-- -----------------------------------------------------------------------------
ALTER TABLE roles ADD COLUMN IF NOT EXISTS scope TEXT;
UPDATE roles SET scope = CASE
  WHEN name IN ('system_admin','super_admin') THEN 'platform'
  ELSE 'company'
END;
ALTER TABLE roles ALTER COLUMN scope SET NOT NULL;
ALTER TABLE roles ADD CONSTRAINT roles_scope_check CHECK (scope IN ('platform','company'));

-- -----------------------------------------------------------------------------
-- 3. Seed the 6 canonical roles; deactivate the legacy role zoo
-- -----------------------------------------------------------------------------
INSERT INTO roles (name, display_name, description, hierarchy_level, category, is_system_role, is_active, scope)
VALUES
  ('platform_admin',   'Platform Admin',   'Full platform access: organizations, plans, payments, Retell key, platform staff.',            100, 'system',       true, true, 'platform'),
  ('platform_operator','Platform Operator', 'Onboard organizations, connect voice-provider key, view payments, manage model allowlist.',     90,  'system',       true, true, 'platform'),
  ('platform_billing', 'Platform Billing',  'View/update plans, view/manage payments.',                                                     85,  'system',       true, true, 'platform'),
  ('company_admin',    'Company Admin',     'Manage agents, knowledge base, users, and plan/billing for this company.',                     80,  'organization', true, true, 'company'),
  ('company_editor',   'Company Editor',    'Manage agents and knowledge base for this company (no users/billing).',                         60,  'organization', true, true, 'company'),
  ('company_viewer',   'Company Viewer',    'Read-only access to analytics, history, and transcripts.',                                      30,  'standard',     true, true, 'company')
ON CONFLICT (name) DO UPDATE
  SET scope = EXCLUDED.scope, is_active = true, is_system_role = true;

-- Deactivate legacy roles (kept for reference, never assigned going forward).
UPDATE roles SET is_active = false, scope = 'platform' WHERE name IN ('system_admin','super_admin');
UPDATE roles SET is_active = false, scope = 'company'  WHERE name IN ('tenant_admin','subtenant_admin','organization_admin','manager','call_manager','agent','analyst','user','viewer');

-- -----------------------------------------------------------------------------
-- 4. Repoint role_permissions.permission_id to the new permissions FK
--    (legacy role_permissions rows target the old role zoo; they are replaced).
-- -----------------------------------------------------------------------------
DELETE FROM role_permissions;

ALTER TABLE role_permissions DROP COLUMN IF EXISTS permission_id;
ALTER TABLE role_permissions ADD COLUMN permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_perm_unique UNIQUE (role_id, permission_id);

-- -----------------------------------------------------------------------------
-- 5. Seed permissions + role->permission mappings
-- -----------------------------------------------------------------------------
INSERT INTO permissions (name, description, category, scope) VALUES
  -- platform namespace
  ('orgs.view',            'View organizations',                    'organizations', 'platform'),
  ('orgs.create',          'Create an organization',                'organizations', 'platform'),
  ('orgs.update',          'Update an organization',                'organizations', 'platform'),
  ('orgs.delete',          'Delete an organization',                'organizations', 'platform'),
  ('plans.view',           'View plans/pricing',                    'billing',       'platform'),
  ('plans.update',         'Change plan/pricing',                   'billing',       'platform'),
  ('payments.view',        'View payment status',                   'billing',       'platform'),
  ('payments.manage',      'Manage payments/refunds',               'billing',       'platform'),
  ('retell_key.manage',    'Add/rotate the voice-provider API key', 'integrations',  'platform'),
  ('platform_users.manage','Manage platform staff and roles',       'admin',         'platform'),
  ('models.manage',        'Manage the LLM model allowlist',        'integrations',  'platform'),
  ('voices.view',          'View curated voices',                   'integrations',  'platform'),
  -- company namespace
  ('agents.manage',        'Create/update/delete agents',           'agents',        'company'),
  ('knowledge.manage',     'Manage knowledge bases and sources',    'knowledge',     'company'),
  ('users.manage',         'Manage company users and roles',        'users',         'company'),
  ('billing.manage',       'Manage company plan and billing',       'billing',       'company'),
  ('analytics.view',       'View analytics dashboards',             'analytics',     'company'),
  ('interactions.view',    'View call/chat history + transcripts',  'analytics',     'company')
ON CONFLICT (name) DO NOTHING;

-- Helper: attach all permissions of a given scope to a role.
CREATE OR REPLACE FUNCTION attach_scope_permissions(role_name TEXT, perm_scope TEXT)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r CROSS JOIN permissions p
  WHERE r.name = role_name AND p.scope = perm_scope
  ON CONFLICT (role_id, permission_id) DO NOTHING;
$$;

SELECT attach_scope_permissions('platform_admin',   'platform');
SELECT attach_scope_permissions('company_admin',    'company');

-- platform_operator
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN
  ('orgs.view','orgs.create','orgs.update','retell_key.manage','payments.view','models.manage','voices.view')
WHERE r.name = 'platform_operator' ON CONFLICT DO NOTHING;

-- platform_billing
-- Includes orgs.view: canAccessTenant()/hasPlatformPermission(userId,'orgs.view') is the
-- app-wide proxy for "is platform staff" (see getCurrentTenant/getUserTenants/tenants[id] route).
-- Without orgs.view, platform_billing could see aggregate payments but not which tenant a
-- payment/invoice belongs to, and would be denied by every "platform staff bypass" check.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN
  ('orgs.view','plans.view','plans.update','payments.view','payments.manage')
WHERE r.name = 'platform_billing' ON CONFLICT DO NOTHING;

-- company_editor
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN
  ('agents.manage','knowledge.manage','analytics.view','interactions.view')
WHERE r.name = 'company_editor' ON CONFLICT DO NOTHING;

-- company_viewer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN
  ('analytics.view','interactions.view')
WHERE r.name = 'company_viewer' ON CONFLICT DO NOTHING;

DROP FUNCTION IF EXISTS attach_scope_permissions(TEXT, TEXT);

-- -----------------------------------------------------------------------------
-- 6. Backfill user_tenants.role_id from the legacy role text column
-- -----------------------------------------------------------------------------
UPDATE user_tenants ut
SET role_id = r.id
FROM roles r
WHERE ut.role_id IS NULL
  AND r.name = CASE
    WHEN ut.role IN ('system_admin','super_admin') THEN 'platform_admin'
    WHEN ut.role IN ('tenant_admin','organization_admin') THEN 'company_admin'
    WHEN ut.role IN ('subtenant_admin','agent','manager','call_manager') THEN 'company_editor'
    WHEN ut.role IN ('analyst','user','viewer') THEN 'company_viewer'
    ELSE 'company_viewer'
  END;

-- -----------------------------------------------------------------------------
-- 7. Stripe columns on tenants
-- -----------------------------------------------------------------------------
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_status TEXT
  DEFAULT 'inactive' CHECK (plan_status IN ('inactive','active','past_due','canceled'));

-- -----------------------------------------------------------------------------
-- 8. Role helpers (SECURITY DEFINER, RLS-bypassing, recursion-free)
-- -----------------------------------------------------------------------------
-- Use CREATE OR REPLACE (not DROP) so existing policies that reference these functions stay valid.
CREATE OR REPLACE FUNCTION is_tenant_admin(check_tenant_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_tenants ut
    JOIN roles r ON r.id = ut.role_id
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = check_tenant_id
      AND ut.status = 'active'
      AND r.name IN ('company_admin','platform_admin')
  );
$$;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_tenants ut
    JOIN roles r ON r.id = ut.role_id
    WHERE ut.user_id = auth.uid()
      AND ut.status = 'active'
      AND r.name = 'platform_admin'
  );
$$;

CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active';
$$;

-- -----------------------------------------------------------------------------
-- 9. RLS rewrite
-- -----------------------------------------------------------------------------
-- 9a. user_tenants: close the privilege-escalation hole.
--     OLD: single FOR ALL policy with no WITH CHECK -> anyone could self-promote.
--     NEW: SELECT-only for authenticated users (own rows + admin-of-tenant). No INSERT /
--          UPDATE / DELETE grants, so no one can self-assign a role or join a tenant from
--          the client. All membership writes happen server-side through service-role API
--          routes (e.g. /api/users, /api/tenants/[id]/users, and the new atomic signup).
DROP POLICY IF EXISTS user_tenants_own_access ON user_tenants;
DROP POLICY IF EXISTS user_tenants_admin_access ON user_tenants;
DROP POLICY IF EXISTS user_tenants_admin_all ON user_tenants;

CREATE POLICY user_tenants_select_own ON user_tenants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_tenants_select_admin ON user_tenants
  FOR SELECT TO authenticated
  USING (is_tenant_admin(tenant_id));

-- 9b. Add status='active' to the core tenant-isolation membership subqueries.
DROP POLICY IF EXISTS tenant_isolation_tenants ON tenants;
CREATE POLICY tenant_isolation_tenants ON tenants
  FOR SELECT TO authenticated
  USING (id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'));

DROP POLICY IF EXISTS tenant_isolation_agents ON agents;
CREATE POLICY tenant_isolation_agents ON agents
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'));

DROP POLICY IF EXISTS tenant_isolation_interactions ON interactions;
CREATE POLICY tenant_isolation_interactions ON interactions
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'));

DROP POLICY IF EXISTS tenant_isolation_billing_records ON billing_records;
CREATE POLICY tenant_isolation_billing_records ON billing_records
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'));

-- 9c. roles / role_permissions: platform staff may manage them; all auth can read active roles.
DROP POLICY IF EXISTS roles_select_all ON roles;
DROP POLICY IF EXISTS role_permissions_select_all ON role_permissions;
CREATE POLICY roles_select_all ON roles FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY role_permissions_select_all ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY roles_admin_all ON roles FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());
CREATE POLICY role_permissions_admin_all ON role_permissions FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;

-- =============================================================================
-- End Phase 1 (additive). Phase 1b (DROP parent_id/is_reseller/role/permissions/
-- reseller_tenant_id) ships after the Phase-2 code sweep.
-- =============================================================================
