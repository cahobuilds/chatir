-- Add reseller-level billing tracking
-- This migration adds columns to track which reseller an organization belongs to
-- and store cost breakdowns for accurate billing per organization

-- Add reseller tracking to interactions table
ALTER TABLE interactions 
  ADD COLUMN IF NOT EXISTS reseller_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining cost_breakdown structure
COMMENT ON COLUMN interactions.cost_breakdown IS 'JSONB object storing cost breakdown per interaction. Structure: {"voice_engine": {"cost": 0.05, "minutes": 2.5}, "llm": {"cost": 0.02, "tokens": 1500}, "telephony": {"cost": 0.01, "minutes": 2.5}, "total": 0.08}';

COMMENT ON COLUMN interactions.reseller_tenant_id IS 'References the reseller tenant (is_reseller=true) that this organization belongs to. Used for billing aggregation and provider configuration lookup.';

-- Add reseller tracking to billing_records table
ALTER TABLE billing_records
  ADD COLUMN IF NOT EXISTS reseller_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN billing_records.cost_breakdown IS 'JSONB object storing aggregated cost breakdown for the billing period. Structure: {"voice_engine": {"cost": 50.00, "minutes": 2500}, "llm": {"cost": 20.00, "tokens": 150000}, "telephony": {"cost": 10.00, "minutes": 2500}, "total": 80.00}';

COMMENT ON COLUMN billing_records.reseller_tenant_id IS 'References the reseller tenant (is_reseller=true) that this organization belongs to. Used for reseller-level billing aggregation.';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_interactions_reseller_tenant 
  ON interactions(reseller_tenant_id, started_at);

CREATE INDEX IF NOT EXISTS idx_billing_records_reseller_tenant 
  ON billing_records(reseller_tenant_id, period_start);

-- Helper function to get reseller tenant ID for an organization
-- This function traverses up the parent_id chain to find the reseller
CREATE OR REPLACE FUNCTION get_reseller_tenant_id(org_tenant_id UUID)
RETURNS UUID AS $$
DECLARE
  reseller_id UUID;
  current_id UUID;
BEGIN
  current_id := org_tenant_id;
  
  -- Traverse up the parent_id chain until we find a reseller
  WHILE current_id IS NOT NULL LOOP
    SELECT parent_id, id INTO current_id, reseller_id
    FROM tenants
    WHERE id = current_id
      AND is_reseller = true
    LIMIT 1;
    
    -- If we found a reseller, return it
    IF reseller_id IS NOT NULL THEN
      RETURN reseller_id;
    END IF;
    
    -- Otherwise, get the parent_id and continue
    SELECT parent_id INTO current_id
    FROM tenants
    WHERE id = current_id
    LIMIT 1;
  END LOOP;
  
  -- No reseller found
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to get reseller's Retell API key for an organization
CREATE OR REPLACE FUNCTION get_reseller_retell_config(org_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  reseller_id UUID;
  retell_key TEXT;
BEGIN
  -- Get the reseller tenant ID
  reseller_id := get_reseller_tenant_id(org_tenant_id);
  
  IF reseller_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get the reseller's Retell API key
  SELECT retell_api_key INTO retell_key
  FROM tenants
  WHERE id = reseller_id
    AND is_reseller = true;
  
  RETURN retell_key;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comments to functions
COMMENT ON FUNCTION get_reseller_tenant_id(UUID) IS 'Traverses up the tenant hierarchy to find the reseller (is_reseller=true) for a given organization tenant. Returns NULL if no reseller is found.';
COMMENT ON FUNCTION get_reseller_retell_config(UUID) IS 'Gets the Retell API key from the reseller tenant for a given organization tenant. Returns NULL if no reseller or API key is found.';

