-- Add reseller support to tenants table
-- This field marks tenants that can act as resellers/partners
-- Resellers can create child organizations (via parent_id relationship)
-- This is future-proofing for reseller/partner program

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS is_reseller BOOLEAN DEFAULT false;

-- Add index for efficient reseller queries
CREATE INDEX IF NOT EXISTS idx_tenants_is_reseller ON tenants(is_reseller);

-- Add comment explaining the hierarchy structure
COMMENT ON COLUMN tenants.parent_id IS 'References parent tenant. NULL for top-level tenants. Used for reseller hierarchy: resellers have NULL parent_id, organizations under resellers reference their reseller_id. Also supports organizational hierarchies (departments, teams, etc.)';

COMMENT ON COLUMN tenants.is_reseller IS 'Marks this tenant as a reseller/partner account. Resellers can create and manage child organizations. When true, this tenant can act as a reseller for other organizations.';

-- Add helpful comment to the table itself
COMMENT ON TABLE tenants IS 'Tenants represent organizations using the platform. The parent_id field enables hierarchical structures: (1) Reseller model: resellers (is_reseller=true, parent_id=NULL) can have child organizations (is_reseller=false, parent_id=reseller_id). (2) Organizational hierarchy: departments/teams can be nested under parent organizations. All data is isolated by tenant_id across all tables.';

