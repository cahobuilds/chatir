import { createClient } from '@/lib/supabase/server';

type TenantResellerInfo = {
  id: string;
  parent_id: string | null;
  is_reseller: boolean | null;
};

/**
 * Gets the reseller tenant ID for a given organization tenant.
 * Traverses up the parent_id chain to find the reseller (is_reseller=true).
 * 
 * @param organizationTenantId - The organization tenant ID
 * @returns The reseller tenant ID, or null if no reseller is found
 */
export async function getResellerTenantId(organizationTenantId: string): Promise<string | null> {
  const supabase = await createClient();
  
  let currentTenantId: string | null = organizationTenantId;
  const visited = new Set<string>(); // Prevent infinite loops
  
  while (currentTenantId && !visited.has(currentTenantId)) {
    visited.add(currentTenantId);
    
    const result = await supabase
      .from('tenants')
      .select('id, parent_id, is_reseller')
      .eq('id', currentTenantId)
      .single();
    
    if (result.error || !result.data) {
      break;
    }
    
    const tenant: TenantResellerInfo = result.data;
    
    // If this tenant is a reseller, return its ID
    if (tenant.is_reseller === true) {
      return tenant.id;
    }
    
    // Otherwise, check parent
    currentTenantId = tenant.parent_id;
  }
  
  return null;
}

/**
 * Gets the Retell API key from the reseller tenant for a given organization tenant.
 * Organizations inherit the Retell configuration from their parent reseller.
 * 
 * @param organizationTenantId - The organization tenant ID
 * @returns The Retell API key from the reseller, or null if not found
 */
export async function getResellerRetellConfig(organizationTenantId: string): Promise<string | null> {
  const supabase = await createClient();
  
  // First, find the reseller tenant ID
  const resellerTenantId = await getResellerTenantId(organizationTenantId);
  
  if (!resellerTenantId) {
    return null;
  }
  
  // Get the reseller's Retell API key
  const { data: reseller, error } = await supabase
    .from('tenants')
    .select('retell_api_key')
    .eq('id', resellerTenantId)
    .eq('is_reseller', true)
    .single();
  
  if (error || !reseller || !reseller.retell_api_key) {
    return null;
  }
  
  return reseller.retell_api_key;
}

/**
 * Checks if a tenant is a reseller.
 * 
 * @param tenantId - The tenant ID to check
 * @returns True if the tenant is a reseller, false otherwise
 */
export async function isReseller(tenantId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('is_reseller')
    .eq('id', tenantId)
    .single();
  
  if (error || !tenant) {
    return false;
  }
  
  return tenant.is_reseller === true;
}

/**
 * Gets all organizations under a reseller.
 * 
 * @param resellerTenantId - The reseller tenant ID
 * @returns Array of organization tenant IDs
 */
export async function getResellerOrganizations(resellerTenantId: string): Promise<string[]> {
  const supabase = await createClient();
  
  const { data: organizations, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('parent_id', resellerTenantId)
    .eq('is_reseller', false);
  
  if (error || !organizations) {
    return [];
  }
  
  return organizations.map(org => org.id);
}

