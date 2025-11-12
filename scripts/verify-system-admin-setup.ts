// Script to verify system admin setup
// Run with: npx tsx scripts/verify-system-admin-setup.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface VerificationResult {
  check: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
  details?: any;
}

async function verifySetup() {
  console.log('🔍 Verifying System Admin Setup...\n');
  const results: VerificationResult[] = [];

  try {
    // Check 1: Roles table exists
    console.log('1. Checking roles table...');
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name, display_name, is_system_role')
      .order('hierarchy_level', { ascending: false });

    if (rolesError) {
      results.push({
        check: 'Roles Table',
        status: '❌',
        message: `Roles table not found: ${rolesError.message}`,
        details: rolesError,
      });
    } else {
      const systemAdminRole = roles?.find((r) => r.name === 'system_admin');
      if (systemAdminRole) {
        results.push({
          check: 'Roles Table',
          status: '✅',
          message: `Found ${roles?.length || 0} roles, including system_admin`,
          details: { totalRoles: roles?.length, systemAdminRole },
        });
      } else {
        results.push({
          check: 'Roles Table',
          status: '❌',
          message: 'Roles table exists but system_admin role not found',
          details: { availableRoles: roles?.map((r) => r.name) },
        });
      }
    }

    // Check 2: System admin role exists
    console.log('2. Checking system_admin role...');
    const { data: systemAdminRole, error: roleError } = await supabase
      .from('roles')
      .select('id, name, display_name, hierarchy_level, category, is_system_role')
      .eq('name', 'system_admin')
      .single();

    if (roleError || !systemAdminRole) {
      results.push({
        check: 'System Admin Role',
        status: '❌',
        message: 'System admin role not found',
        details: roleError,
      });
    } else {
      results.push({
        check: 'System Admin Role',
        status: '✅',
        message: `Found system_admin role (ID: ${systemAdminRole.id})`,
        details: systemAdminRole,
      });
    }

    // Check 3: Role permissions seeded
    console.log('3. Checking role permissions...');
    if (systemAdminRole) {
      const { count: permCount, error: permError } = await supabase
        .from('role_permissions')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', systemAdminRole.id);

      if (permError) {
        results.push({
          check: 'Role Permissions',
          status: '❌',
          message: `Error checking permissions: ${permError.message}`,
        });
      } else {
        results.push({
          check: 'Role Permissions',
          status: permCount && permCount > 0 ? '✅' : '⚠️',
          message: `System admin has ${permCount || 0} permissions assigned`,
          details: { permissionCount: permCount },
        });
      }
    }

    // Check 4: Auth user exists
    console.log('4. Checking auth user...');
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    const systemAdminUser = usersData?.users?.find(
      (u) => u.email === 'systemadmin@tin.info'
    );

    if (usersError) {
      results.push({
        check: 'Auth User',
        status: '❌',
        message: `Error fetching users: ${usersError.message}`,
      });
    } else if (!systemAdminUser) {
      results.push({
        check: 'Auth User',
        status: '❌',
        message: 'User systemadmin@tin.info not found in auth.users',
      });
    } else {
      results.push({
        check: 'Auth User',
        status: '✅',
        message: `Found user: ${systemAdminUser.email} (ID: ${systemAdminUser.id})`,
        details: {
          id: systemAdminUser.id,
          email: systemAdminUser.email,
          emailConfirmed: systemAdminUser.email_confirmed_at !== null,
          createdAt: systemAdminUser.created_at,
        },
      });
    }

    // Check 5: User-tenant relationship
    console.log('5. Checking user-tenant relationship...');
    if (systemAdminUser) {
      const { data: userTenants, error: utError } = await supabase
        .from('user_tenants')
        .select('id, user_id, tenant_id, role, role_id, status, tenants(name), roles(name, display_name)')
        .eq('user_id', systemAdminUser.id);

      if (utError) {
        results.push({
          check: 'User-Tenant Relationship',
          status: '❌',
          message: `Error fetching user_tenants: ${utError.message}`,
        });
      } else if (!userTenants || userTenants.length === 0) {
        results.push({
          check: 'User-Tenant Relationship',
          status: '❌',
          message: 'No user-tenant relationship found',
        });
      } else {
        const relationship = userTenants[0];
        const hasSystemAdminRole =
          relationship.role === 'system_admin' &&
          relationship.role_id === systemAdminRole?.id;

        results.push({
          check: 'User-Tenant Relationship',
          status: hasSystemAdminRole ? '✅' : '⚠️',
          message: hasSystemAdminRole
            ? `Properly configured with system_admin role`
            : `Found relationship but role mismatch (role: ${relationship.role}, role_id: ${relationship.role_id})`,
          details: {
            tenant: (relationship.tenants as any)?.name,
            role: relationship.role,
            roleId: relationship.role_id,
            expectedRoleId: systemAdminRole?.id,
            status: relationship.status,
            roleName: (relationship.roles as any)?.name,
          },
        });
      }
    }

    // Check 6: Test API endpoint
    console.log('6. Testing API endpoint...');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const testResponse = await fetch(`${apiUrl}/api/roles?simple=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (testResponse.ok) {
        const data = await testResponse.json();
        results.push({
          check: 'API Endpoint',
          status: '✅',
          message: `API endpoint accessible, found ${data.roles?.length || 0} roles`,
        });
      } else {
        const errorData = await testResponse.json();
        results.push({
          check: 'API Endpoint',
          status: '⚠️',
          message: `API returned ${testResponse.status}: ${errorData.error || 'Unknown error'}`,
          details: errorData,
        });
      }
    } catch (error: any) {
      results.push({
        check: 'API Endpoint',
        status: '⚠️',
        message: `Could not test API (server may not be running): ${error.message}`,
      });
    }

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION RESULTS');
    console.log('='.repeat(60) + '\n');

    results.forEach((result) => {
      console.log(`${result.status} ${result.check}`);
      console.log(`   ${result.message}`);
      if (result.details && Object.keys(result.details).length > 0) {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      }
      console.log('');
    });

    // Summary
    const passed = results.filter((r) => r.status === '✅').length;
    const failed = results.filter((r) => r.status === '❌').length;
    const warnings = results.filter((r) => r.status === '⚠️').length;

    console.log('='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('='.repeat(60) + '\n');

    if (failed === 0 && warnings === 0) {
      console.log('🎉 All checks passed! System admin is properly configured.\n');
      console.log('📋 Login Credentials:');
      console.log('   Email: systemadmin@tin.info');
      console.log('   Password: 88888888\n');
      console.log('⚠️  Remember to change the password after first login!\n');
      return true;
    } else if (failed === 0) {
      console.log('✅ Setup is functional but has some warnings.\n');
      return true;
    } else {
      console.log('❌ Setup has issues that need to be fixed.\n');
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('Details:', error);
    return false;
  }
}

verifySetup().then((success) => {
  process.exit(success ? 0 : 1);
});

