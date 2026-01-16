import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAgentId() {
  const agentId = 'a3c2cb9c-28bb-4c74-aad0-67cdcae3d558';
  
  console.log(`Testing agent ID: ${agentId}\n`);

  // Check if agent exists
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (error) {
    console.error('❌ Error fetching agent:', error);
    return;
  }

  if (!agent) {
    console.error('❌ Agent not found');
    return;
  }

  console.log('✅ Agent found!');
  console.log(`   Name: ${agent.name}`);
  console.log(`   Type: ${agent.type}`);
  console.log(`   Active: ${agent.is_active}`);
  console.log(`   Retell Agent ID: ${agent.retell_agent_id || '❌ NOT SET'}`);
  console.log(`   Tenant ID: ${agent.tenant_id}`);
  console.log(`   Created: ${agent.created_at}`);
  console.log('');

  if (!agent.retell_agent_id) {
    console.log('⚠️  WARNING: This agent is NOT linked to Retell AI.');
    console.log('   The test endpoint will work, but it will return an error');
    console.log('   saying the agent is not linked to Retell.');
    console.log('');
    console.log('   To fix this:');
    console.log('   1. Go to the agents page');
    console.log('   2. Click "Sync Agents" to sync with Retell');
    console.log('   3. Or create the agent in Retell first, then sync');
  } else {
    console.log('✅ Agent is linked to Retell AI');
    console.log(`   Retell Agent ID: ${agent.retell_agent_id}`);
  }

  // Check tenant Retell configuration
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, retell_api_key')
    .eq('id', agent.tenant_id)
    .single();

  if (tenant) {
    console.log('');
    console.log(`Tenant: ${tenant.name}`);
    console.log(`Retell API Key configured: ${tenant.retell_api_key ? '✅ YES' : '❌ NO'}`);
    
    if (!tenant.retell_api_key) {
      console.log('⚠️  WARNING: Tenant does not have Retell API key configured.');
      console.log('   Even if agent is linked, it won\'t be able to connect.');
    }
  }
}

testAgentId()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

