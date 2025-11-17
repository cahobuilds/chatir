/**
 * Test script to verify reseller-level Retell configuration
 * 
 * This script tests:
 * 1. Reseller lookup functionality
 * 2. Retell config retrieval from reseller
 * 3. Organization vs Reseller detection
 * 
 * Run with: npx tsx scripts/test-reseller-config.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to get reseller tenant ID (mirrors the TypeScript helper)
async function getResellerTenantId(organizationTenantId: string): Promise<string | null> {
  let currentTenantId: string | null = organizationTenantId;
  const visited = new Set<string>();
  
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
    
    const tenant: { id: string; parent_id: string | null; is_reseller: boolean | null } = result.data;
    
    if (tenant.is_reseller === true) {
      return tenant.id;
    }
    
    currentTenantId = tenant.parent_id;
  }
  
  return null;
}

// Helper function to get reseller Retell config
async function getResellerRetellConfig(organizationTenantId: string): Promise<string | null> {
  const resellerTenantId = await getResellerTenantId(organizationTenantId);
  
  if (!resellerTenantId) {
    return null;
  }
  
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

async function main() {
  console.log('🧪 Testing Reseller-Level Retell Configuration\n');
  console.log('=' .repeat(60));
  
  // 1. List all tenants
  console.log('\n1. Fetching all tenants...');
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name, is_reseller, parent_id, retell_api_key')
    .order('created_at', { ascending: false });
  
  if (tenantsError) {
    console.error('❌ Error fetching tenants:', tenantsError);
    process.exit(1);
  }
  
  if (!tenants || tenants.length === 0) {
    console.log('⚠️  No tenants found. Please create at least one tenant.');
    process.exit(0);
  }
  
  console.log(`✅ Found ${tenants.length} tenant(s)\n`);
  
  // 2. Identify resellers and organizations
  const resellers = tenants.filter(t => t.is_reseller === true);
  const organizations = tenants.filter(t => t.is_reseller !== true);
  
  console.log('📊 Tenant Breakdown:');
  console.log(`   Resellers: ${resellers.length}`);
  console.log(`   Organizations: ${organizations.length}\n`);
  
  // 3. Display resellers
  if (resellers.length > 0) {
    console.log('🏢 Resellers:');
    resellers.forEach(reseller => {
      const hasApiKey = !!reseller.retell_api_key;
      const apiKeyPreview = reseller.retell_api_key 
        ? `${reseller.retell_api_key.substring(0, 8)}...` 
        : 'Not configured';
      console.log(`   - ${reseller.name} (${reseller.id})`);
      console.log(`     Retell API Key: ${hasApiKey ? '✅ ' + apiKeyPreview : '❌ Not set'}`);
      
      // Find organizations under this reseller
      const childOrgs = organizations.filter(org => org.parent_id === reseller.id);
      if (childOrgs.length > 0) {
        console.log(`     Child Organizations: ${childOrgs.length}`);
        childOrgs.forEach(org => {
          console.log(`       • ${org.name} (${org.id})`);
        });
      }
      console.log('');
    });
  } else {
    console.log('⚠️  No resellers found. To test reseller functionality:');
    console.log('   1. Mark a tenant as reseller: UPDATE tenants SET is_reseller = true WHERE id = <tenant_id>');
    console.log('   2. Set parent_id for organizations: UPDATE tenants SET parent_id = <reseller_id> WHERE id = <org_id>\n');
  }
  
  // 4. Test reseller lookup for organizations
  if (organizations.length > 0 && resellers.length > 0) {
    console.log('🔍 Testing Reseller Lookup for Organizations:');
    for (const org of organizations.slice(0, 3)) { // Test first 3 organizations
      const resellerId = await getResellerTenantId(org.id);
      const retellConfig = await getResellerRetellConfig(org.id);
      
      console.log(`\n   Organization: ${org.name} (${org.id})`);
      if (resellerId) {
        const { data: reseller } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', resellerId)
          .single();
        console.log(`   ✅ Reseller found: ${reseller?.name || resellerId}`);
        console.log(`   ${retellConfig ? '✅' : '❌'} Retell Config: ${retellConfig ? 'Available' : 'Not configured'}`);
      } else {
        console.log(`   ⚠️  No reseller found (parent_id: ${org.parent_id || 'null'})`);
      }
    }
  }
  
  // 5. Test PostgreSQL functions
  console.log('\n\n🔧 Testing PostgreSQL Helper Functions:');
  if (organizations.length > 0) {
    const testOrg = organizations[0];
    console.log(`   Testing with organization: ${testOrg.name} (${testOrg.id})`);
    
    // Test get_reseller_tenant_id function
    const { data: resellerIdResult, error: resellerIdError } = await supabase
      .rpc('get_reseller_tenant_id', { org_tenant_id: testOrg.id });
    
    if (resellerIdError) {
      console.log(`   ❌ get_reseller_tenant_id error:`, resellerIdError.message);
    } else {
      console.log(`   ✅ get_reseller_tenant_id returned: ${resellerIdResult || 'NULL'}`);
    }
    
    // Test get_reseller_retell_config function
    const { data: retellConfigResult, error: retellConfigError } = await supabase
      .rpc('get_reseller_retell_config', { org_tenant_id: testOrg.id });
    
    if (retellConfigError) {
      console.log(`   ❌ get_reseller_retell_config error:`, retellConfigError.message);
    } else {
      const hasConfig = !!retellConfigResult;
      const preview = retellConfigResult ? `${retellConfigResult.substring(0, 8)}...` : 'NULL';
      console.log(`   ✅ get_reseller_retell_config returned: ${hasConfig ? preview : 'NULL'}`);
    }
  }
  
  // 6. Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📋 Test Summary:');
  console.log(`   Total Tenants: ${tenants.length}`);
  console.log(`   Resellers: ${resellers.length}`);
  console.log(`   Organizations: ${organizations.length}`);
  console.log(`   Resellers with Retell API Key: ${resellers.filter(r => r.retell_api_key).length}`);
  
  if (resellers.length === 0) {
    console.log('\n⚠️  Setup Required:');
    console.log('   1. Mark at least one tenant as reseller (is_reseller = true)');
    console.log('   2. Set parent_id for organizations to point to their reseller');
    console.log('   3. Configure Retell API key on reseller tenants');
  } else if (resellers.filter(r => r.retell_api_key).length === 0) {
    console.log('\n⚠️  Setup Required:');
    console.log('   Configure Retell API key on reseller tenants');
  } else {
    console.log('\n✅ Ready for testing!');
  }
  
  console.log('\n');
}

main().catch(console.error);

