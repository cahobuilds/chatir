/**
 * Quick verification script for Phase 2
 * Verifies that reseller-level Retell configuration is working
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🧪 Phase 2 Verification\n');
  console.log('='.repeat(60));

  // 1. Check if migration columns exist
  console.log('\n1️⃣  Checking database schema...');
  // Try to query the columns directly
  const { error: schemaError } = await supabase
    .from('interactions')
    .select('reseller_tenant_id, cost_breakdown')
    .limit(1);

  if (schemaError && (schemaError.message.includes('column') || schemaError.message.includes('does not exist'))) {
    console.log('   ⚠️  Migration columns not found. Run: supabase db push');
  } else {
    console.log('   ✅ Migration columns exist (reseller_tenant_id, cost_breakdown)');
  }

  // 2. Check if PostgreSQL functions exist
  console.log('\n2️⃣  Checking PostgreSQL functions...');
  // Try to call the function with a dummy ID
  const { error: funcError } = await supabase
    .rpc('get_reseller_tenant_id', { org_tenant_id: '00000000-0000-0000-0000-000000000000' });

  if (funcError && funcError.message.includes('function') && funcError.message.includes('does not exist')) {
    console.log('   ⚠️  PostgreSQL functions not found. Run: supabase db push');
  } else {
    console.log('   ✅ PostgreSQL helper functions exist');
  }

  // 3. List tenants and identify resellers
  console.log('\n3️⃣  Analyzing tenant structure...');
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name, is_reseller, parent_id, retell_api_key')
    .order('created_at', { ascending: false });

  if (tenantsError) {
    console.log(`   ❌ Error: ${tenantsError.message}`);
    return;
  }

  if (!tenants || tenants.length === 0) {
    console.log('   ⚠️  No tenants found');
    return;
  }

  const resellers = tenants.filter(t => t.is_reseller === true);
  const organizations = tenants.filter(t => !t.is_reseller);

  console.log(`   📊 Total tenants: ${tenants.length}`);
  console.log(`   🏢 Resellers: ${resellers.length}`);
  console.log(`   🏛️  Organizations: ${organizations.length}`);

  // 4. Test reseller lookup
  if (organizations.length > 0 && resellers.length > 0) {
    console.log('\n4️⃣  Testing reseller lookup...');
    const testOrg = organizations.find(org => org.parent_id) || organizations[0];
    
    if (testOrg.parent_id) {
      const { data: resellerId, error: resellerIdError } = await supabase
        .rpc('get_reseller_tenant_id', { org_tenant_id: testOrg.id });
      
      const resellerIdResult = resellerIdError ? null : resellerId;

      if (resellerIdResult) {
        console.log(`   ✅ Organization "${testOrg.name}" → Reseller ID: ${resellerIdResult}`);
        
        const { data: retellConfig, error: retellConfigError } = await supabase
          .rpc('get_reseller_retell_config', { org_tenant_id: testOrg.id });

        if (!retellConfigError && retellConfig) {
          console.log(`   ✅ Retell config available: ${retellConfig.substring(0, 8)}...`);
        } else {
          console.log(`   ⚠️  Retell config not found (reseller may not have API key configured)`);
        }
      } else {
        console.log(`   ⚠️  Could not find reseller for "${testOrg.name}"`);
      }
    } else {
      console.log(`   ⚠️  Organization "${testOrg.name}" has no parent_id set`);
    }
  }

  // 5. Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 Summary:');
  
  if (resellers.length === 0) {
    console.log('\n⚠️  Setup Required:');
    console.log('   1. Mark a tenant as reseller:');
    console.log('      UPDATE tenants SET is_reseller = true WHERE id = \'<tenant-id>\';');
    console.log('   2. Set parent_id for organizations:');
    console.log('      UPDATE tenants SET parent_id = \'<reseller-id>\' WHERE id = \'<org-id>\';');
    console.log('   3. Configure Retell API key on reseller:');
    console.log('      UPDATE tenants SET retell_api_key = \'<api-key>\' WHERE is_reseller = true;');
  } else if (resellers.filter(r => r.retell_api_key).length === 0) {
    console.log('\n⚠️  Setup Required:');
    console.log('   Configure Retell API key on reseller tenants');
  } else {
    console.log('\n✅ Ready for testing!');
    console.log('\nNext steps:');
    console.log('   1. Log in as reseller admin → Should see Retell settings');
    console.log('   2. Log in as organization admin → Should NOT see Retell settings');
    console.log('   3. Test API routes with organization tenant_id');
  }

  console.log('\n');
}

main().catch(console.error);

