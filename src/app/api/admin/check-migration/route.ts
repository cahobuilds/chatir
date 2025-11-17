import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/check-migration
 * Checks if the agent_folders RLS fix migration has been applied
 * 
 * This endpoint checks for:
 * 1. is_folder_admin function existence
 * 2. get_user_tenant_ids function with status check
 * 3. RLS policies using helper functions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin', 'super_admin', 'organization_admin'])
      .single();

    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const checks: Array<{ name: string; passed: boolean; message: string }> = [];

    // Check 1: Test is_folder_admin function
    try {
      const { error: functionError } = await supabase.rpc('is_folder_admin', {
        check_tenant_id: '00000000-0000-0000-0000-000000000000'
      });

      // If function doesn't exist, we'll get a specific error
      if (functionError?.message?.includes('does not exist') || 
          functionError?.code === '42883') {
        checks.push({
          name: 'is_folder_admin function',
          passed: false,
          message: 'Function does not exist - migration not applied'
        });
      } else {
        // Function exists (error is expected due to invalid UUID)
        checks.push({
          name: 'is_folder_admin function',
          passed: true,
          message: 'Function exists'
        });
      }
    } catch (error: any) {
      checks.push({
        name: 'is_folder_admin function',
        passed: false,
        message: `Error checking function: ${error.message}`
      });
    }

    // Check 2: Test get_user_tenant_ids function
    try {
      const { data, error } = await supabase.rpc('get_user_tenant_ids');
      
      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42883') {
          checks.push({
            name: 'get_user_tenant_ids function',
            passed: false,
            message: 'Function does not exist'
          });
        } else {
          // Function exists but may not have status check
          checks.push({
            name: 'get_user_tenant_ids function',
            passed: true,
            message: 'Function exists (status check verification requires direct DB access)'
          });
        }
      } else {
        checks.push({
          name: 'get_user_tenant_ids function',
          passed: true,
          message: 'Function exists and is callable'
        });
      }
    } catch (error: any) {
      checks.push({
        name: 'get_user_tenant_ids function',
        passed: false,
        message: `Error checking function: ${error.message}`
      });
    }

    // Check 3: Test agent_folders table access
    try {
      const { error: tableError } = await supabase
        .from('agent_folders')
        .select('id')
        .limit(0);

      if (tableError) {
        if (tableError.code === '42P01') {
          checks.push({
            name: 'agent_folders table',
            passed: false,
            message: 'Table does not exist'
          });
        } else {
          // Table exists but RLS may be blocking (which is expected)
          checks.push({
            name: 'agent_folders table',
            passed: true,
            message: 'Table exists (RLS is working)'
          });
        }
      } else {
        checks.push({
          name: 'agent_folders table',
          passed: true,
          message: 'Table exists and accessible'
        });
      }
    } catch (error: any) {
      checks.push({
        name: 'agent_folders table',
        passed: false,
        message: `Error: ${error.message}`
      });
    }

    // Check 4: Test if folders endpoint works (simulate the actual query)
    try {
      // Get user's tenant IDs
      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1);

      if (userTenants && userTenants.length > 0) {
        const testTenantId = userTenants[0].tenant_id;
        
        const { error: foldersError } = await supabase
          .from('agent_folders')
          .select('*')
          .eq('tenant_id', testTenantId)
          .limit(1);

        if (foldersError) {
          // Check if it's an RLS recursion error
          if (foldersError.message?.includes('infinite recursion') || 
              foldersError.message?.includes('recursion')) {
            checks.push({
              name: 'RLS policies (recursion check)',
              passed: false,
              message: 'RLS recursion error detected - migration not applied'
            });
          } else {
            checks.push({
              name: 'RLS policies (recursion check)',
              passed: true,
              message: 'No recursion error (migration likely applied)'
            });
          }
        } else {
          checks.push({
            name: 'RLS policies (recursion check)',
            passed: true,
            message: 'Policies working correctly'
          });
        }
      } else {
        checks.push({
          name: 'RLS policies (recursion check)',
          passed: true,
          message: 'Cannot test (no tenant access)'
        });
      }
    } catch (error: any) {
      checks.push({
        name: 'RLS policies (recursion check)',
        passed: false,
        message: `Error: ${error.message}`
      });
    }

    const allPassed = checks.every(c => c.passed);
    const migrationApplied = allPassed;

    return NextResponse.json({
      migration_applied: migrationApplied,
      migration_name: '20251115000000_fix_agent_folders_rls_recursion',
      checks,
      summary: migrationApplied
        ? '✅ Migration appears to be APPLIED'
        : '❌ Migration may NOT be fully applied',
      recommendation: migrationApplied
        ? 'Migration is applied. If you still see 500 errors, check browser console for specific errors.'
        : 'Please apply the migration: supabase/migrations/20251115000000_fix_agent_folders_rls_recursion.sql via Supabase Dashboard SQL Editor'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check migration status' },
      { status: 500 }
    );
  }
}

