-- Migration: Create Notion MCP Integration Tables
-- This migration creates tables for managing Notion resources, Railway services, and agent assignments

-- Ensure uuid_generate_v4() resolves regardless of the executing role's search_path
-- (uuid-ossp is installed into the "extensions" schema on current Supabase projects).
SET search_path TO public, extensions;

-- 1. notion_resources table - Stores Notion account/token information per tenant
CREATE TABLE notion_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Notion Account Information
  name TEXT NOT NULL, -- e.g., "Company Notion Workspace"
  notion_token_encrypted TEXT NOT NULL, -- Encrypted Notion API token
  notion_workspace_id TEXT, -- Optional: Notion workspace identifier
  
  -- Metadata
  description TEXT,
  accessible_pages JSONB DEFAULT '[]'::jsonb, -- Cached list of accessible pages/databases
  last_synced_at TIMESTAMPTZ, -- When accessible pages were last fetched
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  error_message TEXT, -- If status is 'error'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, name) -- One unique name per tenant
);

-- 2. notion_mcp_services table - Stores Railway service information for Notion MCP servers
CREATE TABLE notion_mcp_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notion_resource_id UUID NOT NULL REFERENCES notion_resources(id) ON DELETE CASCADE,
  
  -- Railway Service Information
  railway_service_id TEXT NOT NULL UNIQUE, -- Railway service UUID
  railway_service_name TEXT NOT NULL, -- e.g., "notion-tenant-abc"
  service_url TEXT, -- https://notion-tenant-abc.railway.app
  health_check_url TEXT, -- https://notion-tenant-abc.railway.app/health
  
  -- Service Configuration
  name TEXT NOT NULL, -- User-friendly name, e.g., "Main Knowledge Base"
  description TEXT,
  
  -- Status Tracking
  status TEXT DEFAULT 'creating' CHECK (status IN ('creating', 'deploying', 'active', 'inactive', 'error')),
  deployment_status TEXT, -- Railway deployment status
  last_health_check TIMESTAMPTZ,
  health_check_status TEXT CHECK (health_check_status IN ('healthy', 'unhealthy', 'unknown')),
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id), -- System admin who created it
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, railway_service_id)
);

-- 3. agent_notion_services table - Junction table for many-to-many agent-to-service assignment
CREATE TABLE agent_notion_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  notion_mcp_service_id UUID NOT NULL REFERENCES notion_mcp_services(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Assignment Metadata
  priority INTEGER DEFAULT 0, -- Order of precedence if multiple services
  is_active BOOLEAN DEFAULT true,
  
  -- Configuration
  configuration JSONB DEFAULT '{}'::jsonb, -- Agent-specific MCP config
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(agent_id, notion_mcp_service_id) -- One assignment per agent-service pair
  -- Note: Tenant matching is enforced via application logic and RLS policies
  -- A trigger could be added if needed, but CHECK constraints with subqueries are not supported
);

-- Create indexes for performance
CREATE INDEX idx_notion_resources_tenant_id ON notion_resources(tenant_id);
CREATE INDEX idx_notion_resources_status ON notion_resources(status);
CREATE INDEX idx_notion_mcp_services_tenant_id ON notion_mcp_services(tenant_id);
CREATE INDEX idx_notion_mcp_services_notion_resource_id ON notion_mcp_services(notion_resource_id);
CREATE INDEX idx_notion_mcp_services_status ON notion_mcp_services(status);
CREATE INDEX idx_notion_mcp_services_railway_service_id ON notion_mcp_services(railway_service_id);
CREATE INDEX idx_agent_notion_services_agent_id ON agent_notion_services(agent_id);
CREATE INDEX idx_agent_notion_services_service_id ON agent_notion_services(notion_mcp_service_id);
CREATE INDEX idx_agent_notion_services_tenant_id ON agent_notion_services(tenant_id);

-- Enable Row Level Security
ALTER TABLE notion_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_mcp_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_notion_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notion_resources
-- Users can view notion resources in their tenants
CREATE POLICY "Users can view notion resources in their tenant"
  ON notion_resources FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Tenant admins and system admins can manage notion resources
CREATE POLICY "Admins can manage notion resources in their tenant"
  ON notion_resources FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND role IN ('tenant_admin', 'organization_admin', 'super_admin', 'system_admin')
    )
  );

-- RLS Policies for notion_mcp_services
-- Users can view services in their tenants
CREATE POLICY "Users can view notion services in their tenant"
  ON notion_mcp_services FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- System admins can manage all services
CREATE POLICY "System admins can manage all notion services"
  ON notion_mcp_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('system_admin', 'super_admin')
    )
  );

-- RLS Policies for agent_notion_services
-- Users can view assignments in their tenants
CREATE POLICY "Users can view agent service assignments in their tenant"
  ON agent_notion_services FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Tenant admins can manage assignments in their tenant
CREATE POLICY "Admins can manage agent service assignments in their tenant"
  ON agent_notion_services FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND role IN ('tenant_admin', 'organization_admin', 'super_admin', 'system_admin')
    )
  );

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_notion_resources_updated_at
  BEFORE UPDATE ON notion_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notion_mcp_services_updated_at
  BEFORE UPDATE ON notion_mcp_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_notion_services_updated_at
  BEFORE UPDATE ON agent_notion_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

