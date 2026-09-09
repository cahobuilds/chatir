// Script to create a system admin user
// Run with: npx tsx scripts/create-system-admin.ts

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

// This script creates a privileged system_admin account using a password documented in
// docs/LOCAL_CREDENTIALS.md. It must never run against a hosted/production project by accident.
const isLocalSupabase = supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost');
if (!isLocalSupabase && process.env.ALLOW_REMOTE_SYSTEM_ADMIN_SEED !== 'true') {
  console.error('❌ Refusing to run: NEXT_PUBLIC_SUPABASE_URL does not look like a local Supabase instance.');
  console.error(`   URL: ${supabaseUrl}`);
  console.error('   This script creates a system_admin account with a publicly documented default password.');
  console.error('   If you really need to seed a remote/staging project, set ALLOW_REMOTE_SYSTEM_ADMIN_SEED=true');
  console.error('   and change the password immediately after creation.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createSystemAdmin() {
  console.log('🔧 Creating system admin user...\n');

  try {
    // Step 1: Check if roles table exists and get system_admin role
    console.log('1. Checking roles table...');
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', 'system_admin')
      .single();

    if (rolesError) {
      if (rolesError.code === '42P01' || rolesError.message?.includes('does not exist')) {
        console.error('   ❌ Roles table not found.');
        console.error('\n   Please run the roles migrations first:');
        console.error('   1. supabase/migrations/20251112000000_create_roles_system.sql');
        console.error('   2. supabase/migrations/20251112000001_seed_default_role_permissions.sql');
        console.error('\n   You can run them via:');
        console.error('   - Supabase Dashboard > SQL Editor');
        console.error('   - Or: supabase db push\n');
        process.exit(1);
      }
      throw rolesError;
    }

    if (!roles) {
      console.error('   ❌ System admin role not found in roles table.');
      console.error('   Please run the roles migration first.');
      process.exit(1);
    }

    const systemAdminRoleId = roles.id;
    console.log(`   ✅ Found system_admin role: ${systemAdminRoleId}\n`);

    // Step 2: Check if user already exists
    console.log('2. Checking if user exists...');
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === 'systemadmin@tin.info'
    );

    let userId: string;

    if (existingUser) {
      console.log('   ⚠️  User already exists, updating...');
      userId = existingUser.id;

      // Update user metadata
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          name: 'System Administrator',
        },
      });
    } else {
      // Step 3: Create auth user
      console.log('3. Creating auth user...');
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'systemadmin@tin.info',
        password: '88888888',
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: 'System Administrator',
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      userId = authData.user.id;
      console.log(`   ✅ Created user: ${userId}\n`);
    }

    // Step 4: Get or create a master tenant
    console.log('4. Setting up tenant...');
    let { data: masterTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('name', 'Master Platform')
      .single();

    if (!masterTenant) {
      // Create master tenant
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

    // Step 5: Create or update user_tenants relationship
    console.log('5. Creating user-tenant relationship...');
    if (!masterTenant) {
      throw new Error('Master tenant not found or created');
    }
    const { data: existingUserTenant } = await supabase
      .from('user_tenants')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', masterTenant.id)
      .single();

    if (existingUserTenant) {
      // Update existing relationship
      const { error: updateError } = await supabase
        .from('user_tenants')
        .update({
          role: 'system_admin',
          role_id: systemAdminRoleId,
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
          tenant_id: masterTenant.id,
          role: 'system_admin',
          role_id: systemAdminRoleId,
          status: 'active',
        });

      if (insertError) {
        throw insertError;
      }
      console.log('   ✅ Created user-tenant relationship');
    }

    console.log('\n✅ System admin user created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Email: systemadmin@tin.info');
    console.log('   Password: 88888888');
    console.log('\n⚠️  Please change the password after first login!\n');
  } catch (error: any) {
    console.error('\n❌ Error creating system admin:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

createSystemAdmin();

