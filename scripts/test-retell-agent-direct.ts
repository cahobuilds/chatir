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

// Helper function to get reseller Retell API key (direct database query)
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

async function testRetellAgent(retellAgentId: string) {
  console.log(`Testing Retell Agent ID: ${retellAgentId}\n`);
  console.log('============================================================\n');

  // First, find which tenant/agent uses this Retell agent ID
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, name, type, tenant_id, retell_agent_id')
    .eq('retell_agent_id', retellAgentId)
    .limit(1);

  if (agentsError) {
    console.error('Error querying agents:', agentsError);
  }

  let tenantId: string | null = null;
  if (agents && agents.length > 0) {
    tenantId = agents[0].tenant_id;
    console.log('✅ Found agent in database:');
    console.log(`   Name: ${agents[0].name}`);
    console.log(`   Type: ${agents[0].type}`);
    console.log(`   Tenant ID: ${tenantId}\n`);
  } else {
    console.log('⚠️  Agent not found in database. Will try to get Retell API key from first reseller.\n');
    
    // Try to find any reseller with Retell API key
    const { data: resellers } = await supabase
      .from('tenants')
      .select('id, retell_api_key')
      .eq('is_reseller', true)
      .not('retell_api_key', 'is', null)
      .limit(1);
    
    if (resellers && resellers.length > 0) {
      tenantId = resellers[0].id;
      console.log(`Using reseller tenant ID: ${tenantId}\n`);
    }
  }

  if (!tenantId) {
    console.error('❌ Could not determine tenant ID. Cannot test Retell agent.');
    return;
  }

  const retellApiKey = await getResellerRetellConfig(tenantId);

  if (!retellApiKey) {
    console.error('❌ Retell API key not configured for this tenant or its reseller.');
    return;
  }

  console.log('✅ Retell API key found');
  console.log(`   API Key (first 10 chars): ${retellApiKey.substring(0, 10)}...\n`);

  console.log('============================================================');
  console.log('Testing Retell API Agent Retrieve\n');

  try {
    const retellClient = new Retell({
      apiKey: retellApiKey,
      timeout: 30 * 1000,
      maxRetries: 2,
    });

    console.log('1. Attempting to retrieve agent from Retell...');
    console.log(`   Agent ID: ${retellAgentId}\n`);

    const retellAgent = await retellClient.agent.retrieve(retellAgentId);
    const agentData = retellAgent as any;

    console.log('✅ SUCCESS! Agent retrieved successfully\n');
    console.log('📊 Agent Details:');
    console.log(`   Agent Name: ${agentData.agent_name || 'N/A'}`);
    console.log(`   Agent ID: ${agentData.agent_id || 'N/A'}`);
    console.log(`   Channel: ${agentData.channel || 'N/A'}`);
    console.log(`   Published: ${agentData.is_published ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has voice_id: ${!!agentData.voice_id}`);
    console.log(`   Has response_engine: ${!!agentData.response_engine}`);
    
    if (agentData.response_engine) {
      console.log(`   Response Engine Type: ${agentData.response_engine.type || 'N/A'}`);
      if (agentData.response_engine.llm_id) {
        console.log(`   LLM ID: ${agentData.response_engine.llm_id}`);
      }
    }
    
    console.log('\n✅ Agent is accessible and valid!\n');

  } catch (error: any) {
    console.error('❌ ERROR retrieving agent from Retell\n');
    console.error('Error Details:');
    console.error(`   Message: ${error.message || 'Unknown error'}`);
    console.error(`   Status: ${error.response?.status || error.status || 'N/A'}`);
    console.error(`   Status Text: ${error.response?.statusText || 'N/A'}`);
    
    // Log full error object to see structure
    console.error('\n   Full Error Object:');
    console.error(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    if (error.response) {
      console.error('\n   Response Object:');
      console.error(JSON.stringify(error.response, Object.getOwnPropertyNames(error.response), 2));
    }
    
    if (error.response?.data) {
      console.error('\n   Response Data:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.response?.headers) {
      console.error('\n   Response Headers:');
      console.error(JSON.stringify(error.response.headers, null, 2));
    }
    
    // Check for Retell-specific error fields
    if (error.body) {
      console.error('\n   Error Body:');
      console.error(JSON.stringify(error.body, null, 2));
    }
    
    if (error.error_message) {
      console.error(`\n   Error Message: ${error.error_message}`);
    }

    console.error('\n🔍 Analysis:');
    
    if (error.response?.status === 400) {
      console.error('   → 400 Bad Request: The agent ID format may be invalid or the agent has configuration issues');
      if (error.response?.data?.error_message) {
        console.error(`   → Retell Error: ${error.response.data.error_message}`);
      }
    } else if (error.response?.status === 401) {
      console.error('   → 401 Unauthorized: API key authentication failed');
      console.error('   → Check if the Retell API key is valid and has proper permissions');
    } else if (error.response?.status === 404) {
      console.error('   → 404 Not Found: Agent does not exist in Retell');
      console.error('   → Verify the agent ID is correct and exists in your Retell dashboard');
    } else if (error.response?.status === 403) {
      console.error('   → 403 Forbidden: API key does not have access to this agent');
      console.error('   → The agent may belong to a different Retell account');
    } else {
      console.error(`   → ${error.response?.status || 'Unknown'} Error: Unexpected error occurred`);
    }
    
    console.error('');
  }

  console.log('============================================================');
  console.log('Test Complete!\n');
}

const retellAgentId = process.argv[2] || 'agent_f2dde9e9e53c98cac611da2b69';
testRetellAgent(retellAgentId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });

