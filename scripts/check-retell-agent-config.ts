import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import Retell from 'retell-sdk';

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

async function checkAgentConfig() {
  const agentId = 'a3c2cb9c-28bb-4c74-aad0-67cdcae3d558';
  
  console.log('🔍 Checking Retell Agent Configuration\n');
  console.log(`Agent ID: ${agentId}\n`);

  // Get agent from database
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (!agent || !agent.retell_agent_id) {
    console.error('❌ Agent not found or not linked to Retell');
    return;
  }

  console.log('✅ Agent found in database:');
  console.log(`   Name: ${agent.name}`);
  console.log(`   Retell Agent ID: ${agent.retell_agent_id}`);
  console.log('');

  // Get Retell API key
  const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
  if (!retellApiKey) {
    console.error('❌ Retell API key not configured');
    return;
  }

  // Get agent from Retell
  console.log('Fetching agent configuration from Retell...');
  const retellClient = new Retell({
    apiKey: retellApiKey,
    timeout: 30 * 1000,
    maxRetries: 2,
  });

  try {
    const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
    
    console.log('✅ Agent retrieved from Retell:');
    console.log(`   Agent Name: ${retellAgent.agent_name}`);
    console.log(`   Agent ID: ${retellAgent.agent_id}`);
    console.log(`   Voice ID: ${(retellAgent as any).voice_id || 'NOT SET'}`);
    console.log(`   Language: ${(retellAgent as any).language || 'NOT SET'}`);
    console.log(`   Is Published: ${(retellAgent as any).is_published ? 'YES' : 'NO'}`);
    console.log('');
    
    // Check response_engine
    const responseEngine = (retellAgent as any).response_engine;
    console.log('Response Engine Configuration:');
    if (responseEngine) {
      console.log(JSON.stringify(responseEngine, null, 2));
    } else {
      console.log('   ❌ NOT SET - This is required for chat agents!');
    }
    console.log('');

    // Check if agent is configured for chat
    const hasResponseEngine = !!responseEngine;
    const hasLLMWebSocket = responseEngine?.llm_websocket_url;
    const hasLLMId = responseEngine?.llm_id;
    const hasVoiceId = !!(retellAgent as any).voice_id;

    console.log('Configuration Analysis:');
    console.log(`   Has Response Engine: ${hasResponseEngine ? '✅' : '❌'}`);
    console.log(`   Has LLM WebSocket URL: ${hasLLMWebSocket ? '✅' : '❌'}`);
    console.log(`   Has LLM ID: ${hasLLMId ? '✅' : '❌'}`);
    console.log(`   Has Voice ID: ${hasVoiceId ? '✅' : '❌'}`);
    console.log('');

    if (!hasResponseEngine) {
      console.error('❌ PROBLEM: Agent does not have response_engine configured!');
      console.error('   Chat agents require response_engine with either:');
      console.error('   - llm_websocket_url (custom LLM)');
      console.error('   - llm_id (Retell LLM)');
    } else if (!hasLLMWebSocket && !hasLLMId) {
      console.error('❌ PROBLEM: Response engine does not have llm_websocket_url or llm_id!');
    } else {
      console.log('✅ Agent appears to be configured correctly for chat');
    }

    // Try to list available LLMs to see what's available
    console.log('\nChecking available LLMs...');
    try {
      const llms = await retellClient.llm.list();
      console.log(`✅ Found ${llms.length} available LLMs`);
      if (llms.length > 0) {
        console.log('   First few LLMs:');
        llms.slice(0, 3).forEach((llm: any, idx: number) => {
          const llmId = typeof llm === 'string' ? llm : (llm as any).llm_id || (llm as any).id;
          const model = (llm as any).model || 'unknown';
          console.log(`   ${idx + 1}. ${llmId} (${model})`);
        });
      }
    } catch (llmError: any) {
      console.error('❌ Error fetching LLMs:', llmError.message);
    }

  } catch (error: any) {
    console.error('❌ Error retrieving agent from Retell:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkAgentConfig()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

