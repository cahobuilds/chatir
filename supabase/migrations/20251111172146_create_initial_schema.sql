-- Enable UUID extension (installed into the "extensions" schema on current Supabase
-- projects; explicitly schema-qualify it below so uuid_generate_v4() resolves
-- regardless of the executing role's search_path).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

-- Ensure the extensions schema is resolvable for uuid_generate_v4()/gen_random_uuid()
-- calls in this and later migrations without further qualification.
SET search_path TO public, extensions;

-- Tenants table - represents organizations using the platform
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  subdomain TEXT UNIQUE,
  parent_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Configuration
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'premium', 'enterprise')),
  settings JSONB DEFAULT '{}'::jsonb,
  branding JSONB DEFAULT '{}'::jsonb,
  
  -- Features
  features JSONB DEFAULT '{}'::jsonb,
  
  -- Billing
  billing_email TEXT,
  billing_plan TEXT DEFAULT 'pay_as_you_go' CHECK (billing_plan IN ('pay_as_you_go', 'monthly', 'annual')),
  balance DECIMAL(10, 2) DEFAULT 0,
  
  -- Retell AI Configuration (encrypted)
  retell_api_key TEXT, -- Will be encrypted at application level
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table - represents users within tenants
-- Note: Supabase Auth handles authentication, this table stores additional user data
CREATE TABLE user_tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Role and permissions
  role TEXT DEFAULT 'viewer' CHECK (role IN ('super_admin', 'tenant_admin', 'subtenant_admin', 'agent', 'viewer')),
  permissions JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Timestamps
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, tenant_id)
);

-- Agents table - represents chatbots and voice bots
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('chat', 'voice')),
  description TEXT,
  
  -- Retell AI Configuration
  retell_agent_id TEXT,
  retell_phone_number_id TEXT,
  
  -- Agent Configuration
  configuration JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions table - tracks all chatbot/voice bot interactions
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Interaction details
  type TEXT NOT NULL CHECK (type IN ('chat', 'voice')),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  
  -- Retell AI data
  retell_call_id TEXT,
  retell_conversation_id TEXT,
  
  -- Interaction metadata
  customer_phone TEXT,
  customer_email TEXT,
  duration INTEGER, -- Duration in seconds
  transcript JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Billing
  billed BOOLEAN DEFAULT false,
  billing_record_id UUID,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing records table - tracks charges for interactions
CREATE TABLE billing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Billing details
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  
  -- Billing period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Interaction count
  interaction_count INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  
  -- Payment details
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys table - for tenant API authentication
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL, -- Hashed API key
  key_prefix TEXT NOT NULL, -- First 8 chars for display
  
  -- Permissions
  permissions JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  
  -- Timestamps
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tenants_parent_id ON tenants(parent_id);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant_id ON user_tenants(tenant_id);
CREATE INDEX idx_agents_tenant_id ON agents(tenant_id);
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_retell_agent_id ON agents(retell_agent_id);
CREATE INDEX idx_interactions_tenant_id ON interactions(tenant_id);
CREATE INDEX idx_interactions_agent_id ON interactions(agent_id);
CREATE INDEX idx_interactions_retell_call_id ON interactions(retell_call_id);
CREATE INDEX idx_interactions_started_at ON interactions(started_at);
CREATE INDEX idx_billing_records_tenant_id ON billing_records(tenant_id);
CREATE INDEX idx_billing_records_status ON billing_records(status);
CREATE INDEX idx_billing_records_period ON billing_records(period_start, period_end);
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- Add foreign key constraint for billing_record_id
ALTER TABLE interactions 
  ADD CONSTRAINT fk_interactions_billing_record 
  FOREIGN KEY (billing_record_id) 
  REFERENCES billing_records(id) 
  ON DELETE SET NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tenants_updated_at BEFORE UPDATE ON user_tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_records_updated_at BEFORE UPDATE ON billing_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS policies (must be defined before policies)
-- Function to check if user is tenant admin
-- SECURITY DEFINER bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION is_tenant_admin(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = auth.uid()
      AND tenant_id = check_tenant_id
      AND role IN ('tenant_admin', 'super_admin')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get current user's tenant IDs
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT tenant_id FROM user_tenants
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS Policies

-- Tenants: Users can only see tenants they belong to
CREATE POLICY tenant_isolation_tenants ON tenants
  FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- User Tenants: Users can see their own tenant memberships
-- Split into separate policies to avoid infinite recursion
-- Basic access: users can see their own records
CREATE POLICY user_tenants_own_access ON user_tenants
  FOR SELECT
  USING (user_id = auth.uid());

-- Admin access: tenant admins can see all users in their tenant
-- Uses SECURITY DEFINER function to bypass RLS and prevent recursion
CREATE POLICY user_tenants_admin_access ON user_tenants
  FOR ALL
  USING (
    user_id = auth.uid() 
    OR is_tenant_admin(tenant_id)
  );

-- Agents: Users can only access agents from their tenant
CREATE POLICY tenant_isolation_agents ON agents
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Interactions: Users can only access interactions from their tenant
CREATE POLICY tenant_isolation_interactions ON interactions
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Billing Records: Users can only access billing records from their tenant
CREATE POLICY tenant_isolation_billing_records ON billing_records
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- API Keys: Users can only access API keys from their tenant
CREATE POLICY tenant_isolation_api_keys ON api_keys
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() AND role IN ('tenant_admin', 'super_admin')
    )
  );

