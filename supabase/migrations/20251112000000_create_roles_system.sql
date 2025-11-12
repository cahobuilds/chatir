-- Create roles table for comprehensive role management
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Role hierarchy (higher number = more permissions)
  hierarchy_level INTEGER NOT NULL DEFAULT 0,
  
  -- Role category
  category TEXT DEFAULT 'standard' CHECK (category IN ('system', 'platform', 'organization', 'team', 'standard')),
  
  -- Metadata
  is_system_role BOOLEAN DEFAULT false, -- System roles cannot be deleted
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create role_permissions junction table for flexible permission assignment
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL, -- Permission identifier (e.g., 'agents.create', 'users.manage')
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(role_id, permission_id)
);

-- Insert system roles
INSERT INTO roles (name, display_name, description, hierarchy_level, category, is_system_role) VALUES
-- System-level roles
('system_admin', 'System Admin', 'Full platform access with all permissions across all organizations. Can manage system settings, all tenants, and platform infrastructure.', 100, 'system', true),
('super_admin', 'Super Admin', 'Platform-wide administrative access. Can manage multiple organizations, assign roles, and configure platform-level settings.', 90, 'platform', true),

-- Organization-level roles
('organization_admin', 'Organization Admin', 'Full administrative access to organization settings, user management, agent configuration, and billing. Manages all aspects of their organization.', 80, 'organization', true),
('manager', 'Manager', 'Manages teams and departments within an organization. Can view analytics, manage assigned agents, and oversee team interactions.', 60, 'team', true),

-- Operational roles
('call_manager', 'Call Manager', 'Manages phone calls, interactions, and call monitoring. Can initiate calls, monitor live conversations, and manage call queues.', 50, 'team', true),
('agent', 'Agent', 'Can manage assigned agents, view interactions, and monitor agent performance. Limited to assigned resources.', 40, 'standard', true),
('analyst', 'Analyst', 'Read-only access to analytics, reports, and interaction data. Can export data and generate insights.', 30, 'standard', true),

-- Standard roles
('user', 'User', 'Standard user access with basic permissions to view agents and interactions within their scope.', 20, 'standard', true),
('viewer', 'Viewer', 'Read-only access to view agents, interactions, and basic analytics. Cannot modify any data.', 10, 'standard', true);

-- Create indexes
CREATE INDEX idx_roles_category ON roles(category);
CREATE INDEX idx_roles_hierarchy ON roles(hierarchy_level);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Update user_tenants table to reference roles table
ALTER TABLE user_tenants 
  DROP CONSTRAINT IF EXISTS user_tenants_role_check,
  ADD COLUMN role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- Migrate existing role values to role_id
UPDATE user_tenants ut
SET role_id = r.id
FROM roles r
WHERE ut.role = r.name;

-- Create function to get default role
CREATE OR REPLACE FUNCTION get_default_role()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM roles WHERE name = 'viewer' LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE;

-- Set default role_id for user_tenants
ALTER TABLE user_tenants 
  ALTER COLUMN role_id SET DEFAULT get_default_role();

-- Add trigger to update updated_at
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on roles tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can view active roles
CREATE POLICY roles_select_all ON roles
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policy: All authenticated users can view role permissions
CREATE POLICY role_permissions_select_all ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions to authenticated users
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;

