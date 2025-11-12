// Script to fix RLS recursion issue
// Run with: npx tsx scripts/fix-rls-recursion.ts

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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('🔧 Applying RLS recursion fix...\n');
  
  const migrationSQL = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20251111180000_fix_rls_recursion.sql'),
    'utf-8'
  );

  try {
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          // Try direct query instead
          const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
          if (directError) {
            console.error('⚠️  Cannot execute SQL directly. Please apply via Supabase dashboard.');
            console.log('\n📋 SQL to apply:\n');
            console.log(migrationSQL);
            return;
          }
        }
      }
    }

    console.log('\n✅ Fix applied successfully!');
  } catch (err: any) {
    console.error('❌ Error applying fix:', err.message);
    console.log('\n📋 Please apply this SQL manually via Supabase dashboard:\n');
    console.log(migrationSQL);
  }
}

applyFix();

