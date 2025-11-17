-- Migration: Add Retell tenant connection tracking
-- This allows each organization to connect to their own Retell tenant instance

-- Add fields to track Retell tenant connection
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS retell_tenant_id TEXT,
ADD COLUMN IF NOT EXISTS retell_connection_status TEXT DEFAULT 'disconnected' 
  CHECK (retell_connection_status IN ('disconnected', 'connected', 'error', 'syncing')),
ADD COLUMN IF NOT EXISTS retell_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS retell_last_sync_at TIMESTAMPTZ;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_retell_tenant_id ON tenants(retell_tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_retell_connection_status ON tenants(retell_connection_status);

-- Add comment for documentation
COMMENT ON COLUMN tenants.retell_tenant_id IS 'Retell AI tenant/organization ID for this organization';
COMMENT ON COLUMN tenants.retell_connection_status IS 'Status of Retell connection: disconnected, connected, error, syncing';
COMMENT ON COLUMN tenants.retell_connected_at IS 'Timestamp when Retell connection was established';
COMMENT ON COLUMN tenants.retell_last_sync_at IS 'Timestamp of last billing sync from Retell';

