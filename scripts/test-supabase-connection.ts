// Test Supabase connection
// Run with: npx tsx scripts/test-supabase-connection.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure .env.local exists with:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  try {
    // Test 1: Check if we can connect
    console.log('1. Testing connection...');
    const { data, error } = await supabase.from('tenants').select('count').limit(0);
    
    if (error && (error.code === '42P01' || error.message.includes('Could not find the table'))) {
      console.log('   ⚠️  Tables not found - migrations need to be run');
      console.log('   ✅ Connection successful!\n');
      return { connected: true, migrated: false };
    } else if (error) {
      console.error('   ❌ Connection error:', error.message);
      return { connected: false, migrated: false };
    } else {
      console.log('   ✅ Connection successful!');
      console.log('   ✅ Migrations appear to be applied!\n');
      return { connected: true, migrated: true };
    }
  } catch (err) {
    console.error('   ❌ Unexpected error:', err);
    return { connected: false, migrated: false };
  }
}

testConnection()
  .then((result) => {
    if (result.connected && result.migrated) {
      console.log('✅ All checks passed!');
      console.log('   Your Supabase setup is ready to use.');
    } else if (result.connected && !result.migrated) {
      console.log('⚠️  Connection works but migrations need to be run.');
      console.log('   See MIGRATION_INSTRUCTIONS.md for details.');
    } else {
      console.log('❌ Connection failed.');
      console.log('   Check your credentials in .env.local');
    }
  })
  .catch(console.error);

