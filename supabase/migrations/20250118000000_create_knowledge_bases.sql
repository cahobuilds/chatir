-- Knowledge Bases table - stores knowledge base configurations
CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('notion', 'web', 'file', 'text')),
  description TEXT,
  
  -- Configuration
  configuration JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status TEXT DEFAULT 'synced' CHECK (status IN ('synced', 'syncing', 'error')),
  
  -- Metadata
  page_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Base Sources table - stores individual sources within a knowledge base
CREATE TABLE knowledge_base_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('notion', 'web', 'file', 'text')),
  source_url TEXT,
  source_data JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status TEXT DEFAULT 'synced' CHECK (status IN ('synced', 'syncing', 'error')),
  last_synced_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_knowledge_bases_tenant_id ON knowledge_bases(tenant_id);
CREATE INDEX idx_knowledge_bases_type ON knowledge_bases(type);
CREATE INDEX idx_knowledge_base_sources_kb_id ON knowledge_base_sources(knowledge_base_id);

-- Enable RLS
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_bases
CREATE POLICY tenant_isolation_knowledge_bases ON knowledge_bases
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- RLS Policies for knowledge_base_sources
CREATE POLICY tenant_isolation_kb_sources ON knowledge_base_sources
  FOR ALL
  USING (
    knowledge_base_id IN (
      SELECT id FROM knowledge_bases WHERE tenant_id IN (
        SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

