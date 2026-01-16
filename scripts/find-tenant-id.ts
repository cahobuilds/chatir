import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findTenantIds(userEmail?: string) {
  console.log('============================================================');
  console.log('Find Tenant ID Script');
  console.log('============================================================\n');

  if (userEmail) {
    console.log(`Looking up tenant IDs for user: ${userEmail}\n`);
    
    // Find user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError.message);
      return;
    }

    const user = users.find(u => u.email === userEmail);
    
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      return;
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})\n`);

    // Get user's tenants
    const { data: userTenants, error: tenantError } = await supabase
      .from('user_tenants')
      .select(`
        tenant_id,
        role,
        status,
        tenants (
          id,
          name,
          subdomain,
          domain,
          tier,
          is_reseller
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (tenantError) {
      console.error('❌ Error fetching tenants:', tenantError.message);
      return;
    }

    if (!userTenants || userTenants.length === 0) {
      console.log('⚠️  No active tenants found for this user.');
      return;
    }

    console.log(`✅ Found ${userTenants.length} tenant(s):\n`);
    
    userTenants.forEach((ut: any, index: number) => {
      const tenant = ut.tenants;
      console.log(`${index + 1}. ${tenant.name || 'Unnamed Tenant'}`);
      console.log(`   Tenant ID: ${ut.tenant_id}`);
      console.log(`   Your Role: ${ut.role}`);
      console.log(`   Tier: ${tenant.tier || 'N/A'}`);
      console.log(`   Is Reseller: ${tenant.is_reseller ? 'Yes' : 'No'}`);
      if (tenant.subdomain) console.log(`   Subdomain: ${tenant.subdomain}`);
      if (tenant.domain) console.log(`   Domain: ${tenant.domain}`);
      console.log('');
    });

  } else {
    // List all tenants
    console.log('Listing all tenants in the system:\n');
    
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, subdomain, domain, tier, is_reseller, created_at')
      .order('created_at', { ascending: false });

    if (tenantsError) {
      console.error('❌ Error fetching tenants:', tenantsError.message);
      return;
    }

    if (!tenants || tenants.length === 0) {
      console.log('⚠️  No tenants found in the system.');
      return;
    }

    console.log(`✅ Found ${tenants.length} tenant(s):\n`);
    
    tenants.forEach((tenant: any, index: number) => {
      console.log(`${index + 1}. ${tenant.name || 'Unnamed Tenant'}`);
      console.log(`   Tenant ID: ${tenant.id}`);
      console.log(`   Tier: ${tenant.tier || 'N/A'}`);
      console.log(`   Is Reseller: ${tenant.is_reseller ? 'Yes' : 'No'}`);
      if (tenant.subdomain) console.log(`   Subdomain: ${tenant.subdomain}`);
      if (tenant.domain) console.log(`   Domain: ${tenant.domain}`);
      console.log(`   Created: ${new Date(tenant.created_at).toISOString()}`);
      console.log('');
    });
  }

  console.log('============================================================');
  console.log('How to use Tenant ID:');
  console.log('============================================================');
  console.log('Copy the Tenant ID from above and use it with:');
  console.log('  npx tsx scripts/reset-and-resync-agents.ts --tenant-id <TENANT_ID>');
  console.log('');
}

// Parse command line arguments
const args = process.argv.slice(2);
const emailIndex = args.findIndex(arg => arg === '--email' || arg === '-e');
const userEmail = emailIndex >= 0 && emailIndex < args.length - 1 
  ? args[emailIndex + 1] 
  : undefined;

findTenantIds(userEmail)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

