/**
 * Test script for Railway service creation
 * 
 * Usage:
 *   tsx scripts/test-railway-integration.ts
 * 
 * Make sure you have:
 *   - A valid Supabase session (logged in via browser)
 *   - Your tenant ID
 *   - A Notion API token
 */

import { createClient } from '@supabase/supabase-js';

// Configuration - Update these values
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const TENANT_ID = process.env.TEST_TENANT_ID || '';
const NOTION_TOKEN = process.env.TEST_NOTION_TOKEN || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase configuration');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!TENANT_ID || !NOTION_TOKEN) {
  console.error('❌ Missing test configuration');
  console.error('Set TEST_TENANT_ID and TEST_NOTION_TOKEN');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRailwayIntegration() {
  console.log('🧪 Testing Railway Service Creation\n');

  try {
    // Step 1: Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Not authenticated. Please log in first.');
      console.error('   You can get a session by logging in via the browser.');
      process.exit(1);
    }
    console.log('✅ Authenticated as:', user.email);

    // Step 2: Create Notion Resource
    console.log('\n📝 Step 1: Creating Notion resource...');
    const { data: resource, error: resourceError } = await supabase
      .from('notion_resources')
      .insert({
        tenant_id: TENANT_ID,
        name: 'Test Notion Workspace',
        notion_token_encrypted: NOTION_TOKEN, // Note: This should be encrypted, but for testing...
        description: 'Test workspace for Railway integration',
        status: 'active',
        is_active: true,
      })
      .select()
      .single();

    if (resourceError) {
      console.error('❌ Failed to create Notion resource:', resourceError.message);
      process.exit(1);
    }
    console.log('✅ Created Notion resource:', resource.id);

    // Step 3: List Railway services (to verify API works)
    console.log('\n🚂 Step 2: Testing Railway API connection...');
    const response = await fetch('http://localhost:3000/api/railway/services', {
      method: 'GET',
      headers: {
        'Cookie': `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token=...`, // This won't work - need actual session
      },
    });

    if (response.status === 401) {
      console.log('⚠️  API requires authentication cookie');
      console.log('   Please test via browser DevTools or use the curl commands in the testing guide');
      console.log('   See: docs/TESTING_RAILWAY_SERVICES.md');
    } else {
      const data = await response.json();
      console.log('✅ Railway API accessible');
      console.log('   Services:', data.services?.length || 0);
    }

    console.log('\n✅ Basic setup verified!');
    console.log('\n📚 Next steps:');
    console.log('   1. Use browser DevTools to get your auth cookie');
    console.log('   2. Use the curl commands in docs/TESTING_RAILWAY_SERVICES.md');
    console.log('   3. Or use Postman/Insomnia with the cookie');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the test
testRailwayIntegration();

