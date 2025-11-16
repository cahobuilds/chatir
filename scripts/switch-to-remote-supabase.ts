// Script to switch .env.local to use remote Supabase
// Run with: npx tsx scripts/switch-to-remote-supabase.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as readline from 'readline';

// Load existing .env.local if it exists
const envPath = resolve(process.cwd(), '.env.local');
let existingEnv: Record<string, string> = {};

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      existingEnv[match[1].trim()] = match[2].trim();
    }
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function switchToRemote() {
  console.log('🔧 Switching to Remote Supabase Configuration\n');
  console.log('📋 You need to get your API keys from:');
  console.log('   https://supabase.com/dashboard/project/ystivchlyoijaghwdcjd/settings/api\n');

  const anonKey = await question('Enter your anon/public key (or press Enter to keep existing): ');
  const serviceRoleKey = await question('Enter your service_role key (or press Enter to keep existing): ');

  rl.close();

  // Build new .env.local content
  const envContent = `# Remote Supabase Configuration
# Project: ystivchlyoijaghwdcjd
# Get keys from: https://supabase.com/dashboard/project/ystivchlyoijaghwdcjd/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://ystivchlyoijaghwdcjd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey || existingEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'REPLACE_WITH_YOUR_ANON_KEY'}
SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey || existingEnv.SUPABASE_SERVICE_ROLE_KEY || 'REPLACE_WITH_YOUR_SERVICE_ROLE_KEY'}

# Application URL
NEXT_PUBLIC_APP_URL=${existingEnv.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}

# Optional: Retell AI (can be configured per-tenant in database)
${existingEnv.RETELL_API_KEY ? `RETELL_API_KEY=${existingEnv.RETELL_API_KEY}` : '# RETELL_API_KEY=your-retell-api-key-here'}
`;

  writeFileSync(envPath, envContent);
  console.log('\n✅ Updated .env.local with remote Supabase configuration!');
  console.log('\n📝 Next steps:');
  console.log('   1. Restart your development server: npm run dev');
  console.log('   2. Test the connection: npx tsx scripts/test-supabase-connection.ts');
  console.log('\n⚠️  Make sure you have the correct API keys from the Supabase dashboard!\n');
}

switchToRemote().catch(console.error);


