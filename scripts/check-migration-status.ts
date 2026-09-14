#!/usr/bin/env tsx
/**
 * Script to check if the agent_folders RLS fix migration has been applied
 * 
 * Usage: npx tsx scripts/check-migration-status.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMigrationStatus() {
  console.log('🔍 Checking migration status for agent_folders RLS fix...\n');

  const checks: Array<{ name: string; passed: boolean; message: string }> = [];

  try {
    // Check 1: Verify is_folder_admin function exists
    console.log('1. Checking for is_folder_admin function...');
    const { data: functionCheck, error: functionError } = await supabase.rpc('is_folder_admin', {
      check_tenant_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID for check
    });

    if (functionError) {
      // If function doesn't exist, we'll get a specific error
      if (functionError.message?.includes('function') && functionError.message?.includes('does not exist')) {
        checks.push({
          name: 'is_folder_admin function',
          passed: false,
          message: 'Function does not exist - migration not applied'
        });
        console.log('   ❌ Function does not exist');
      } else {
        // Function exists but error is expected (invalid UUID)
        checks.push({
          name: 'is_folder_admin function',
          passed: true,
          message: 'Function exists'
        });
        console.log('   ✅ Function exists');
      }
    } else {
      checks.push({
        name: 'is_folder_admin function',
        passed: true,
        message: 'Function exists'
      });
      console.log('   ✅ Function exists');
    }

    // Check 2: Verify get_user_tenant_ids function has status check
    console.log('\n2. Checking get_user_tenant_ids function definition...');
    const { data: functionDef, error: defError } = await supabase
      .from('pg_proc')
      .select('prosrc')
      .eq('proname', 'get_user_tenant_ids')
      .single();

    if (defError || !functionDef) {
      checks.push({
        name: 'get_user_tenant_ids function',
        passed: false,
        message: 'Could not check function definition'
      });
      console.log('   ⚠️  Could not verify function definition');
    } else {
      // Check if function includes status check
      const hasStatusCheck = functionDef.prosrc?.includes("status = 'active'");
      checks.push({
        name: 'get_user_tenant_ids function',
        passed: hasStatusCheck,
        message: hasStatusCheck 
          ? 'Function includes status check' 
          : 'Function missing status check - migration may not be fully applied'
      });
      console.log(hasStatusCheck 
        ? '   ✅ Function includes status check'
        : '   ⚠️  Function may not have status check');
    }

    // Check 3: Verify policies use helper functions
    console.log('\n3. Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, qual')
      .eq('tablename', 'agent_folders');

    if (policiesError) {
      checks.push({
        name: 'RLS policies',
        passed: false,
        message: 'Could not check policies'
      });
      console.log('   ⚠️  Could not check policies');
    } else if (!policies || policies.length === 0) {
      checks.push({
        name: 'RLS policies',
        passed: false,
        message: 'No policies found'
      });
      console.log('   ❌ No policies found');
    } else {
      // Check if policies use helper functions
      const usesHelperFunctions = policies.some(p => 
        p.qual?.includes('get_user_tenant_ids') || 
        p.qual?.includes('is_folder_admin')
      );
      
      checks.push({
        name: 'RLS policies',
        passed: usesHelperFunctions,
        message: usesHelperFunctions
          ? 'Policies use helper functions (migration applied)'
          : 'Policies may not use helper functions - migration may not be applied'
      });
      console.log(usesHelperFunctions
        ? '   ✅ Policies use helper functions'
        : '   ⚠️  Policies may not use helper functions');
    }

    // Check 4: Test the folders endpoint (if we have a test tenant)
    console.log('\n4. Testing agent_folders table access...');
    const { data: folders, error: foldersError } = await supabase
      .from('agent_folders')
      .select('count')
      .limit(0);

    if (foldersError) {
      if (foldersError.code === '42P01') {
        checks.push({
          name: 'agent_folders table',
          passed: false,
          message: 'Table does not exist'
        });
        console.log('   ❌ Table does not exist');
      } else if (foldersError.message?.includes('permission denied') || foldersError.code === '42501') {
        // This is expected with RLS - table exists but we can't query without proper auth
        checks.push({
          name: 'agent_folders table',
          passed: true,
          message: 'Table exists (RLS is working)'
        });
        console.log('   ✅ Table exists (RLS is working)');
      } else {
        checks.push({
          name: 'agent_folders table',
          passed: false,
          message: `Error: ${foldersError.message}`
        });
        console.log(`   ⚠️  Error: ${foldersError.message}`);
      }
    } else {
      checks.push({
        name: 'agent_folders table',
        passed: true,
        message: 'Table exists and accessible'
      });
      console.log('   ✅ Table exists and accessible');
    }

  } catch (error: any) {
    console.error('❌ Error checking migration status:', error);
    process.exit(1);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Status Summary');
  console.log('='.repeat(60));
  
  const allPassed = checks.every(c => c.passed);
  checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${check.message}`);
  });

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ Migration appears to be APPLIED');
    console.log('   The agent_folders RLS fix should be working.');
  } else {
    console.log('❌ Migration may NOT be fully applied');
    console.log('   Please apply: supabase/migrations/20251115000000_fix_agent_folders_rls_recursion.sql');
    console.log('   Run it via the Supabase dashboard SQL editor, or `supabase db push` — see SUPABASE_SETUP.md.');
  }
  console.log('='.repeat(60));
}

checkMigrationStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

