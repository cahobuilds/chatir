// Script to grant system admin user full access
// Run with: npx tsx scripts/grant-system-admin-access.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure .env.local exists with:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function grantSystemAdminAccess() {
  console.log('🔧 Granting system admin access to systemadmin@tin.info...\n');

  try {
    // Step 1: Find the user
    console.log('1. Finding user...');
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const user = usersData?.users?.find(
      (u) => u.email === 'systemadmin@tin.info'
    );

    if (!user) {
      console.error('   ❌ User systemadmin@tin.info not found.');
      console.error('   Please create the user first in Supabase Dashboard > Authentication > Users');
      process.exit(1);
    }

    console.log(`   ✅ Found user: ${user.email} (ID: ${user.id})\n`);

    // Step 2: Get or create master tenant
    console.log('2. Setting up master tenant...');
    let { data: masterTenant } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('name', 'Master Platform')
      .single();

    if (!masterTenant) {
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'Master Platform',
          subdomain: 'master',
          tier: 'enterprise',
        })
        .select()
        .single();

      if (tenantError) {
        throw tenantError;
      }

      masterTenant = newTenant;
      console.log('   ✅ Created master tenant');
    } else {
      console.log('   ✅ Using existing master tenant');
    }

    // Step 3: Get system_admin role from roles table (if it exists)
    console.log('3. Checking for system_admin role...');
    let systemAdminRoleId: string | null = null;
    
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'system_admin')
      .single();

    if (roleData) {
      systemAdminRoleId = roleData.id;
      console.log(`   ✅ Found system_admin role: ${systemAdminRoleId}`);
    } else {
      console.log('   ⚠️  Roles table not found or system_admin role not present (using legacy role)');
    }

    // Step 4: Update or create user_tenants relationship
    console.log('4. Updating user-tenant relationship...');
    if (!masterTenant) {
      throw new Error('Master tenant not found or created');
    }

    const { data: existingUserTenant } = await supabase
      .from('user_tenants')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', masterTenant.id)
      .single();

    const userTenantData: any = {
      role: 'system_admin',
      status: 'active',
    };

    if (systemAdminRoleId) {
      userTenantData.role_id = systemAdminRoleId;
    }

    if (existingUserTenant) {
      // Update existing relationship
      const { error: updateError } = await supabase
        .from('user_tenants')
        .update(userTenantData)
        .eq('id', existingUserTenant.id);

      if (updateError) {
        throw updateError;
      }
      console.log('   ✅ Updated user-tenant relationship with system_admin role');
    } else {
      // Create new relationship
      const { error: insertError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: user.id,
          tenant_id: masterTenant.id,
          ...userTenantData,
        });

      if (insertError) {
        throw insertError;
      }
      console.log('   ✅ Created user-tenant relationship with system_admin role');
    }

    // Step 5: Grant access to all tenants (optional - for full platform access)
    console.log('5. Granting access to all existing tenants...');
    const { data: allTenants } = await supabase
      .from('tenants')
      .select('id, name');

    if (allTenants && allTenants.length > 0) {
      for (const tenant of allTenants) {
        if (tenant.id === masterTenant.id) continue; // Skip master tenant (already done)

        const { data: existing } = await supabase
          .from('user_tenants')
          .select('id')
          .eq('user_id', user.id)
          .eq('tenant_id', tenant.id)
          .single();

        if (!existing) {
          const tenantData: any = {
            user_id: user.id,
            tenant_id: tenant.id,
            role: 'system_admin',
            status: 'active',
          };

          if (systemAdminRoleId) {
            tenantData.role_id = systemAdminRoleId;
          }

          await supabase
            .from('user_tenants')
            .insert(tenantData);
        }
      }
      console.log(`   ✅ Granted access to ${allTenants.length} tenant(s)`);
    }

    console.log('\n✅ System admin access granted successfully!');
    console.log('\n📋 User Details:');
    console.log(`   Email: systemadmin@tin.info`);
    console.log(`   Role: system_admin`);
    console.log(`   Access: Full platform access (100/100 permissions)`);
    console.log(`   Can create users: Yes`);
    console.log(`   Can manage all tenants: Yes\n`);
  } catch (error: any) {
    console.error('\n❌ Error granting system admin access:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

grantSystemAdminAccess();

