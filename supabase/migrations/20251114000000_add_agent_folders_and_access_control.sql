-- Migration: Add agent folders and user-agent access control
-- This enables folder organization and role-based agent visibility

-- 1. Create agent_folders table
CREATE TABLE IF NOT EXISTS agent_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES agent_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure folder names are unique within a tenant
  UNIQUE(tenant_id, name)
);

-- 2. Add folder_id to agents table (only if agents table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agents') THEN
    ALTER TABLE agents
      ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES agent_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Create user_agents table for access control
-- This determines which users can see/manage which agents
CREATE TABLE IF NOT EXISTS user_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Access level: 'view' (can see), 'manage' (can edit), 'full' (can delete)
  access_level TEXT DEFAULT 'view' CHECK (access_level IN ('view', 'manage', 'full')),
  
  -- Optional: specific permissions
  can_test BOOLEAN DEFAULT true,
  can_edit_prompt BOOLEAN DEFAULT false,
  can_edit_config BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- A user can only have one access record per agent
  UNIQUE(user_id, agent_id)
);

-- Add foreign key constraint for agent_id if agents table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agents') THEN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'user_agents_agent_id_fkey'
    ) THEN
      ALTER TABLE user_agents
        ADD CONSTRAINT user_agents_agent_id_fkey 
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_folders_tenant ON agent_folders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_folders_parent ON agent_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_user ON user_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_agent ON user_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_tenant ON user_agents(tenant_id);

-- Create index on agents.folder_id only if agents table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agents') THEN
    CREATE INDEX IF NOT EXISTS idx_agents_folder ON agents(folder_id);
  END IF;
END $$;

-- 5. Enable RLS on new tables
ALTER TABLE agent_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for agent_folders (only if user_tenants table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_tenants') THEN
    -- Users can view folders in their tenant
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_folders' AND policyname = 'Users can view folders in their tenant') THEN
      CREATE POLICY "Users can view folders in their tenant"
        ON agent_folders FOR SELECT
        USING (
          tenant_id IN (
            SELECT tenant_id FROM user_tenants
            WHERE user_id = auth.uid() AND status = 'active'
          )
        );
    END IF;

    -- Admins can manage folders in their tenant
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_folders' AND policyname = 'Admins can manage folders in their tenant') THEN
      CREATE POLICY "Admins can manage folders in their tenant"
        ON agent_folders FOR ALL
        USING (
          tenant_id IN (
            SELECT tenant_id FROM user_tenants
            WHERE user_id = auth.uid() 
              AND status = 'active'
              AND role IN ('tenant_admin', 'super_admin', 'organization_admin', 'system_admin')
          )
        );
    END IF;
  END IF;
END $$;

-- 7. RLS Policies for user_agents
-- Users can view their own agent assignments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_agents' AND policyname = 'Users can view their agent assignments') THEN
    CREATE POLICY "Users can view their agent assignments"
      ON user_agents FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  -- Admins can manage user-agent assignments (only if user_tenants table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_tenants') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_agents' AND policyname = 'Admins can manage user-agent assignments') THEN
      CREATE POLICY "Admins can manage user-agent assignments"
        ON user_agents FOR ALL
        USING (
          tenant_id IN (
            SELECT tenant_id FROM user_tenants
            WHERE user_id = auth.uid() 
              AND status = 'active'
              AND role IN ('tenant_admin', 'super_admin', 'organization_admin', 'system_admin')
          )
        );
    END IF;
  END IF;
END $$;

-- 8. Helper function to get accessible agents for a user (only if agents table exists)
DO $func$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agents') THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION get_accessible_agents(p_user_id UUID, p_tenant_id UUID)
    RETURNS TABLE(agent_id UUID) AS $body$
    BEGIN
      RETURN QUERY
      SELECT DISTINCT a.id
      FROM agents a
      WHERE a.tenant_id = p_tenant_id
        AND (
          EXISTS (
            SELECT 1 FROM user_tenants ut
            WHERE ut.user_id = p_user_id
              AND ut.tenant_id = p_tenant_id
              AND ut.role = ''system_admin''
              AND ut.status = ''active''
          )
          OR EXISTS (
            SELECT 1 FROM user_tenants ut
            WHERE ut.user_id = p_user_id
              AND ut.tenant_id = p_tenant_id
              AND ut.role IN (''tenant_admin'', ''super_admin'', ''organization_admin'')
              AND ut.status = ''active''
          )
          OR EXISTS (
            SELECT 1 FROM user_agents ua
            WHERE ua.user_id = p_user_id
              AND ua.agent_id = a.id
              AND ua.tenant_id = p_tenant_id
          )
        );
    END;
    $body$ LANGUAGE plpgsql SECURITY DEFINER;
    ';
  END IF;
END $func$;

-- 9. Add updated_at trigger for agent_folders
CREATE OR REPLACE FUNCTION update_agent_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_folders_updated_at
  BEFORE UPDATE ON agent_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_folders_updated_at();

-- 10. Add updated_at trigger for user_agents
CREATE OR REPLACE FUNCTION update_user_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_agents_updated_at
  BEFORE UPDATE ON user_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_user_agents_updated_at();

-- 11. Comments
COMMENT ON TABLE agent_folders IS 'Organizational folders for grouping agents within a tenant';
COMMENT ON TABLE user_agents IS 'Access control table determining which users can see/manage which agents';

-- Comment on function only if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'get_accessible_agents') THEN
    EXECUTE 'COMMENT ON FUNCTION get_accessible_agents(UUID, UUID) IS ''Returns list of agent IDs accessible to a user in a tenant based on role and assignments''';
  END IF;
END $$;

