import { createClient } from '@supabase/supabase-js';
import { Retell } from 'retell-sdk';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to get reseller Retell API key
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

async function updateAgentChannel(agentId: string) {
  console.log(`Updating agent channel: ${agentId}\n`);

  // Get agent from database
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, type, retell_agent_id, tenant_id')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    console.error(`❌ Agent not found:`, agentError?.message || 'Unknown error');
    return;
  }

  if (!agent.retell_agent_id) {
    console.error('❌ Agent is not linked to Retell AI.');
    return;
  }

  const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
  
  if (!retellApiKey) {
    console.error('❌ Retell API key not configured.');
    return;
  }

  const retellClient = new Retell({
    apiKey: retellApiKey,
    timeout: 30 * 1000,
    maxRetries: 3,
  });

  try {
    // Get current agent details
    console.log('Retrieving current agent configuration...');
    const currentAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
    const agentData = currentAgent as any;
    
    console.log('Current configuration:');
    console.log(`   Channel: ${agentData.channel}`);
    console.log(`   Has voice_id: ${!!agentData.voice_id}`);
    console.log(`   Has response_engine: ${!!agentData.response_engine}`);
    console.log('');

    // Try to update the agent with channel explicitly set to 'chat'
    console.log('Attempting to update agent with channel="chat"...');
    
    const updatePayload: any = {
      agent_name: agentData.agent_name,
      channel: 'chat', // Explicitly set channel to chat
    };
    
    // Preserve existing configuration
    if (agentData.voice_id) {
      updatePayload.voice_id = agentData.voice_id;
    }
    if (agentData.response_engine) {
      updatePayload.response_engine = agentData.response_engine;
    }
    if (agentData.language) {
      updatePayload.language = agentData.language;
    }

    console.log('Update payload:', JSON.stringify(updatePayload, null, 2));
    console.log('');

    const updatedAgent = await retellClient.agent.update(agent.retell_agent_id, updatePayload);
    const updatedData = updatedAgent as any;
    
    console.log('✅ Agent updated!');
    console.log(`   Channel: ${updatedData.channel}`);
    console.log('');

    // Now try to publish again
    console.log('Publishing updated agent...');
    await retellClient.agent.publish(agent.retell_agent_id);
    console.log('✅ Publish request sent');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const publishedAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
    const publishedData = publishedAgent as any;
    
    console.log('📊 Final Status:');
    console.log(`   Channel: ${publishedData.channel}`);
    console.log(`   Published: ${publishedData.is_published ? '✅ YES' : '❌ NO'}`);
    console.log('');

  } catch (error: any) {
    console.error('❌ Error updating agent:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

const agentId = process.argv[2] || 'a3c2cb9c-28bb-4c74-aad0-67cdcae3d558';
updateAgentChannel(agentId)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

