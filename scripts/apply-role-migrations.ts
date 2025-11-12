// Script to apply role system migrations
// Run with: npx tsx scripts/apply-role-migrations.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

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

async function applyMigration(filePath: string, description: string) {
  console.log(`\n📝 Applying: ${description}`);
  try {
    const sql = readFileSync(filePath, 'utf-8');
    
    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          // Try direct query execution
          const { error: queryError } = await supabase.from('_migrations').select('*').limit(0);
          if (queryError) {
            console.log(`   ⚠️  Note: Some statements may need to be run manually in Supabase SQL Editor`);
          }
        }
      }
    }
    
    console.log(`   ✅ ${description} applied`);
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    console.log(`   📋 Please apply this migration manually in Supabase SQL Editor`);
    return false;
  }
  return true;
}

async function main() {
  console.log('🚀 Applying Role System Migrations...\n');

  // Note: Direct SQL execution via Supabase JS client is limited
  // These migrations should be applied via Supabase Dashboard SQL Editor
  console.log('⚠️  Note: Supabase JS client has limited SQL execution capabilities.');
  console.log('📋 Please apply these migrations manually in the Supabase Dashboard:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new');
  console.log('2. Copy and paste the contents of: supabase/migrations/20251112000000_create_roles_system.sql');
  console.log('3. Run the SQL');
  console.log('4. Then copy and paste: supabase/migrations/20251112000001_populate_role_permissions.sql');
  console.log('5. Run the SQL\n');

  // Check if roles table exists
  const { data, error } = await supabase.from('roles').select('count').limit(1);
  
  if (error && error.code === '42P01') {
    console.log('📊 Status: Roles table does not exist yet - migrations need to be applied');
  } else if (error) {
    console.log(`📊 Status: ${error.message}`);
  } else {
    console.log('✅ Roles table already exists!');
    const { count } = await supabase.from('roles').select('*', { count: 'exact', head: true });
    console.log(`   Found ${count} roles`);
  }
}

main().catch(console.error);

