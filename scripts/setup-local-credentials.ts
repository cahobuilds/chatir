// Script to create test credentials for local development
// Run with: npx tsx scripts/setup-local-credentials.ts

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

async function setupLocalCredentials() {
  console.log('🔧 Setting up local development credentials...\n');

  try {
    // Step 1: Get default role (viewer)
    console.log('1. Getting default role...');
    const { data: defaultRole } = await supabase.rpc('get_default_role');
    
    if (!defaultRole) {
      console.log('   ⚠️  No default role found, will use viewer role');
    }

    // Step 2: Check if user already exists
    console.log('2. Checking if test user exists...');
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === 'admin@test.com'
    );

    let userId: string;

    if (existingUser) {
      console.log('   ⚠️  User already exists, will update if needed...');
      userId = existingUser.id;
    } else {
      // Step 3: Create auth user
      console.log('3. Creating test user...');
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'admin@test.com',
        password: 'test123456',
        email_confirm: true, // Auto-confirm for local dev
        user_metadata: {
          name: 'Test Admin',
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      userId = authData.user.id;
      console.log(`   ✅ Created user: ${userId}`);
    }

    // Step 4: Get or create a test tenant
    console.log('4. Setting up test tenant...');
    let { data: testTenant } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('name', 'Test Company')
      .single();

    if (!testTenant) {
      // Create test tenant
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'Test Company',
          subdomain: 'test',
          tier: 'standard',
        })
        .select()
        .single();

      if (tenantError) {
        throw tenantError;
      }

      testTenant = newTenant;
      console.log(`   ✅ Created test tenant: ${testTenant.name}`);
    } else {
      console.log(`   ✅ Using existing tenant: ${testTenant.name}`);
    }

    // Step 5: Get tenant_admin role
    console.log('5. Getting tenant_admin role...');
    const { data: tenantAdminRole } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'tenant_admin')
      .single();

    const roleId = tenantAdminRole?.id || defaultRole;

    // Step 6: Create or update user_tenants relationship
    console.log('6. Creating user-tenant relationship...');
    if (!testTenant) {
      throw new Error('Test tenant not found or created');
    }

    const { data: existingUserTenant } = await supabase
      .from('user_tenants')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', testTenant.id)
      .single();

    if (existingUserTenant) {
      // Update existing relationship
      const { error: updateError } = await supabase
        .from('user_tenants')
        .update({
          role: 'tenant_admin',
          role_id: roleId,
          status: 'active',
        })
        .eq('id', existingUserTenant.id);

      if (updateError) {
        throw updateError;
      }
      console.log('   ✅ Updated user-tenant relationship');
    } else {
      // Create new relationship
      const { error: insertError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: userId,
          tenant_id: testTenant.id,
          role: 'tenant_admin',
          role_id: roleId,
          status: 'active',
        });

      if (insertError) {
        throw insertError;
      }
      console.log('   ✅ Created user-tenant relationship');
    }

    console.log('\n✅ Local development credentials created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Email: admin@test.com');
    console.log('   Password: test123456');
    console.log('\n🌐 Access your app at: http://localhost:3000');
    console.log('   Login page: http://localhost:3000/auth/login\n');
  } catch (error: any) {
    console.error('\n❌ Error setting up credentials:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

setupLocalCredentials();


