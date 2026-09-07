-- Agent <-> Knowledge Base linking table.
--
-- This tracks which knowledge bases are attached to which agents' Retell LLM
-- (response_engine.knowledge_base_ids / kb_config), so the UI can show and manage links
-- without an extra Retell API round-trip on every page load. Retell itself is the source
-- of truth for whether the KB actually informs the agent's responses (see
-- src/app/api/agents/[id]/knowledge-bases/route.ts); this table mirrors that state locally.
CREATE TABLE agent_knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Mirrors Retell's kb_config on the agent's response_engine (per-agent, not per-KB, since
  -- Retell applies one similarity_threshold/top_k across all attached KBs for that LLM).
  similarity_threshold NUMERIC(3, 2) DEFAULT 0.7 CHECK (similarity_threshold >= 0 AND similarity_threshold <= 1),
  top_k INTEGER DEFAULT 5 CHECK (top_k > 0),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (agent_id, knowledge_base_id)
);

CREATE INDEX idx_agent_knowledge_bases_agent_id ON agent_knowledge_bases(agent_id);
CREATE INDEX idx_agent_knowledge_bases_kb_id ON agent_knowledge_bases(knowledge_base_id);
CREATE INDEX idx_agent_knowledge_bases_tenant_id ON agent_knowledge_bases(tenant_id);

ALTER TABLE agent_knowledge_bases ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_agent_knowledge_bases ON agent_knowledge_bases
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'
    )
  );

COMMENT ON TABLE agent_knowledge_bases IS 'Local mirror of which knowledge bases are attached to which agent''s Retell LLM (response_engine.knowledge_base_ids). Retell is the source of truth for whether retrieval actually happens; this table is for fast UI display and management.';
