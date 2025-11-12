-- Add Retell AI default roles
-- These roles align with Retell AI's access control model:
-- Admin: Full control over workspace resources and members
-- Developer: Full functional access (no billing/user management)
-- Member: Read-only access

INSERT INTO roles (name, display_name, description, hierarchy_level, category, is_system_role) VALUES
-- Retell AI Admin (maps to organization_admin with Retell AI context)
('retell_admin', 'Retell Admin', 'Full control over workspace resources and members, including access to all features such as billing, user management, and organization settings. Equivalent to Retell AI Admin role.', 85, 'organization', true),

-- Retell AI Developer (maps to manager/agent with Retell AI context)
('retell_developer', 'Retell Developer', 'Full functional access to build and test agents, view raw data, manage analytics, and settings. Cannot manage billing or organization users. Equivalent to Retell AI Developer role.', 55, 'team', true),

-- Retell AI Member (maps to viewer/analyst with Retell AI context)
('retell_member', 'Retell Member', 'Read-only access to agents, testing, scrubbed history, and analytics. Cannot make changes or view sensitive data. Equivalent to Retell AI Member role.', 25, 'standard', true)
ON CONFLICT (name) DO NOTHING;

-- Note: These roles will be assigned permissions via the role_permissions table
-- The permissions will be assigned based on Retell AI's access control model

