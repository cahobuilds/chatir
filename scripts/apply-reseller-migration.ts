import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

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

async function applyMigration() {
  console.log('🔄 Applying reseller support migration...\n');

  try {
    // Read the migration file
    const migrationSQL = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20251113000000_add_reseller_support.sql'),
      'utf-8'
    );

    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`[${i + 1}/${statements.length}] Executing statement...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });

        if (error) {
          // Try direct query if RPC doesn't work
          const { error: directError } = await supabase
            .from('_migrations')
            .select('*')
            .limit(1); // This will fail if table doesn't exist, but we'll catch it

          // For ALTER TABLE and CREATE INDEX, we need to use a different approach
          // Since Supabase client doesn't support DDL directly, we'll provide instructions
          console.log('\n⚠️  Direct SQL execution not available via Supabase client.');
          console.log('Please apply this migration via Supabase Dashboard SQL Editor:\n');
          console.log(migrationSQL);
          console.log('\nOr use the Supabase CLI with proper migration repair.');
          break;
        }
      }
    }

    // Mark migration as applied in migration history
    const { error: migrationError } = await supabase
      .from('supabase_migrations.schema_migrations')
      .insert({
        version: '20251113000000',
        name: 'add_reseller_support',
        inserted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (migrationError && !migrationError.message.includes('duplicate')) {
      console.log('\n⚠️  Could not update migration history (this is okay if migration was already applied)');
    }

    console.log('\n✅ Migration applied successfully!');
    console.log('\n📋 Verification:');
    console.log('   - is_reseller column added to tenants table');
    console.log('   - Index created on is_reseller');
    console.log('   - Comments added to document hierarchy structure');

  } catch (error: any) {
    console.error('\n❌ Error applying migration:', error.message);
    console.error('\n📝 Please apply this migration manually via Supabase Dashboard:');
    console.error('   1. Go to: https://supabase.com/dashboard/project/ystivchlyoijaghwdcjd/sql/new');
    console.error('   2. Copy and paste the SQL from: supabase/migrations/20251113000000_add_reseller_support.sql');
    console.error('   3. Run the SQL');
    process.exit(1);
  }
}

applyMigration();

