import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { Retell } from 'retell-sdk';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getResellerRetellConfig(organizationTenantId: string): Promise<string | null> {
  let currentTenantId: string | null = organizationTenantId;
  const visited = new Set<string>();
  
  while (currentTenantId && !visited.has(currentTenantId)) {
    visited.add(currentTenantId);
    
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, parent_id, is_reseller, retell_api_key')
      .eq('id', currentTenantId)
      .single();
    
    if (error || !tenant) {
      break;
    }
    
    const tenantData = tenant as {
      id: string;
      parent_id: string | null;
      is_reseller: boolean | null;
      retell_api_key: string | null;
    };
    
    if (tenantData.is_reseller === true && tenantData.retell_api_key) {
      return tenantData.retell_api_key;
    }
    
    currentTenantId = tenantData.parent_id;
  }
  
  return null;
}

async function testRetellAuth() {
  console.log('Testing Retell API Authentication and Agent Listing\n');
  console.log('============================================================\n');

  // Get reseller Retell API key
  const { data: resellers } = await supabase
    .from('tenants')
    .select('id, retell_api_key')
    .eq('is_reseller', true)
    .not('retell_api_key', 'is', null)
    .limit(1);

  if (!resellers || resellers.length === 0) {
    console.error('❌ No reseller with Retell API key found');
    return;
  }

  const retellApiKey = resellers[0].retell_api_key;
  console.log('✅ Retell API key found');
  console.log(`   API Key (first 15 chars): ${retellApiKey?.substring(0, 15)}...`);
  console.log(`   API Key length: ${retellApiKey?.length} characters\n`);

  try {
    const retellClient = new Retell({
      apiKey: retellApiKey!,
      timeout: 30 * 1000,
      maxRetries: 2,
    });

    console.log('1. Testing authentication by listing agents...\n');
    
    const agents = await retellClient.agent.list();
    
    console.log(`✅ Authentication successful! Found ${agents.length} agent(s)\n`);
    
    if (agents.length === 0) {
      console.log('⚠️  No agents found in Retell account\n');
      return;
    }

    console.log('📋 Available Agents:\n');
    agents.forEach((agent: any, index: number) => {
      const agentData = typeof agent === 'string' ? { agent_id: agent } : agent;
      console.log(`${index + 1}. Agent ID: ${agentData.agent_id || 'N/A'}`);
      if (agentData.agent_name) {
        console.log(`   Name: ${agentData.agent_name}`);
      }
      if (agentData.channel) {
        console.log(`   Channel: ${agentData.channel}`);
      }
      console.log('');
    });

    // Try to retrieve details for each agent
    console.log('2. Retrieving detailed information for each agent...\n');
    
    for (const agent of agents) {
      const agentId = typeof agent === 'string' ? agent : (agent as any).agent_id;
      if (!agentId) continue;

      try {
        console.log(`   Retrieving: ${agentId}...`);
        const agentDetails = await retellClient.agent.retrieve(agentId);
        const details = agentDetails as any;
        
        console.log(`   ✅ Success:`);
        console.log(`      Name: ${details.agent_name || 'N/A'}`);
        console.log(`      Channel: ${details.channel || 'N/A'}`);
        console.log(`      Published: ${details.is_published ? 'Yes' : 'No'}`);
        console.log('');
      } catch (err: any) {
        console.log(`   ❌ Failed: ${err.message}`);
        console.log('');
      }
    }

    // Test the specific agent ID from the error
    const testAgentId = 'agent_f2dde9e9e53c98cac611da2b69';
    console.log(`3. Testing specific agent ID: ${testAgentId}\n`);
    
    const foundAgent = agents.find((a: any) => {
      const id = typeof a === 'string' ? a : (a as any).agent_id;
      return id === testAgentId;
    });

    if (!foundAgent) {
      console.log(`   ❌ Agent ${testAgentId} NOT found in agent list`);
      console.log(`   → This agent ID does not exist in your Retell account`);
      console.log(`   → Verify the agent ID is correct`);
      console.log(`   → The agent may belong to a different Retell account\n`);
    } else {
      console.log(`   ✅ Agent ${testAgentId} found in list`);
      try {
        const agentDetails = await retellClient.agent.retrieve(testAgentId);
        console.log(`   ✅ Successfully retrieved details\n`);
      } catch (err: any) {
        console.log(`   ❌ Failed to retrieve: ${err.message}\n`);
      }
    }

  } catch (error: any) {
    console.error('❌ ERROR:\n');
    console.error(`   Message: ${error.message || 'Unknown error'}`);
    console.error(`   Status: ${error.status || 'N/A'}`);
    
    if (error.status === 401) {
      console.error('\n   → 401 Unauthorized: API key is invalid or expired');
      console.error('   → Check if the Retell API key is correct');
    } else if (error.status === 403) {
      console.error('\n   → 403 Forbidden: API key does not have required permissions');
      console.error('   → Check Retell API key permissions');
    } else {
      console.error('\n   Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
  }

  console.log('============================================================');
  console.log('Test Complete!\n');
}

testRetellAuth()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });

