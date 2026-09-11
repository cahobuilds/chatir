import { createClient } from '@/lib/supabase/server';
import { decrypt, isEncrypted } from '@/lib/encryption';

// API keys are encrypted at rest; return the plaintext only when consumed.
function resolveApiKey(value: string | null | undefined): string | null {
  if (!value) return null;
  return isEncrypted(value) ? decrypt(value) : value;
}

/**
 * Reseller hierarchy is removed: each organization uses its OWN voice-provider workspace + key
 * ("one workspace per company", per docs/RETELL_WORKSPACE_ISOLATION.md). Returns the tenant's own
 * key (decrypted), or null when not connected.
 */
export async function getResellerRetellConfig(organizationTenantId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('retell_api_key, retell_connection_status')
    .eq('id', organizationTenantId)
    .maybeSingle();

  if (tenant?.retell_api_key && tenant.retell_connection_status !== 'disconnected') {
    return resolveApiKey(tenant.retell_api_key);
  }
  return null;
}

/**
 * No resellers exist; the parent-chain traversal is removed. Kept as a return-null stub for callers
 * that referenced `reseller_tenant_id` (the column is dropped in Phase 1b).
 */
export async function getResellerTenantId(_organizationTenantId: string): Promise<string | null> {
  return null;
}
