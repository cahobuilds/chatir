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

async function testCreateChatAgentWithChannel() {
  const tenantId = '533109f9-df24-4fca-ae88-05841c6ecf8c';
  const agentName = `Test Chat Agent with Channel ${Date.now()}`;
  
  console.log('🧪 Testing Chat Agent Creation with channel="chat"\n');
  console.log(`Agent Name: ${agentName}`);
  console.log(`Tenant ID: ${tenantId}\n`);

  const retellApiKey = await getResellerRetellConfig(tenantId);
  if (!retellApiKey) {
    console.error('❌ Retell API key not configured');
    return;
  }

  const retellClient = new Retell({
    apiKey: retellApiKey,
    timeout: 30 * 1000,
    maxRetries: 3,
  });

  try {
    // Step 1: Get LLM
    console.log('Step 1: Fetching available LLMs...');
    const llms = await retellClient.llm.list();
    if (!llms || llms.length === 0) {
      throw new Error('No LLMs available');
    }
    const firstLLM = llms[0];
    const llmId = typeof firstLLM === 'string' 
      ? firstLLM 
      : (firstLLM as any).llm_id || (firstLLM as any).id;
    console.log(`✅ Using LLM: ${llmId}\n`);

    // Step 2: Get voice
    console.log('Step 2: Fetching available voices...');
    const voices = await retellClient.voice.list();
    const firstVoice = voices[0];
    const voiceId = typeof firstVoice === 'string' 
      ? firstVoice 
      : (firstVoice as any).voice_id || (firstVoice as any).id;
    console.log(`✅ Using voice: ${voiceId}\n`);

    // Step 3: Create agent WITH channel='chat'
    console.log('Step 3: Creating chat agent with channel="chat"...');
    const agentPayload = {
      agent_name: agentName,
      channel: 'chat', // KEY: Set channel to 'chat' as per Retell API docs
      voice_id: voiceId,
      language: 'en-US',
      response_engine: {
        type: 'retell-llm',
        llm_id: llmId,
      },
    };
    
    console.log('Agent payload:');
    console.log(JSON.stringify(agentPayload, null, 2));
    console.log('');

    const retellAgent = await retellClient.agent.create(agentPayload);
    console.log('✅ Agent created!');
    console.log(`   Agent ID: ${retellAgent.agent_id}`);
    console.log('');

    // Step 4: Verify agent channel
    console.log('Step 4: Verifying agent channel...');
    const createdAgent = await retellClient.agent.retrieve(retellAgent.agent_id);
    const channel = (createdAgent as any).channel;
    console.log(`   Channel: ${channel}`);
    if (channel === 'chat') {
      console.log('   ✅ Channel is correctly set to "chat"');
    } else {
      console.log(`   ⚠️  Channel is "${channel}", expected "chat"`);
    }
    console.log('');

    // Step 5: Publish agent
    console.log('Step 5: Publishing agent...');
    try {
      await retellClient.agent.publish(retellAgent.agent_id);
      console.log('✅ Publish request sent');
    } catch (publishError: any) {
      if (publishError.message?.includes('JSON') || publishError.message?.includes('Unexpected end')) {
        console.log('✅ Publish request sent (empty response expected)');
      } else {
        throw publishError;
      }
    }
    console.log('');

    // Step 6: Wait and verify publish
    console.log('Step 6: Waiting for publish to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const publishedAgent = await retellClient.agent.retrieve(retellAgent.agent_id);
    const isPublished = (publishedAgent as any).is_published;
    console.log(`   Published: ${isPublished ? '✅ YES' : '❌ NO'}`);
    console.log('');

    if (isPublished) {
      console.log('🎉 SUCCESS! Agent created with channel="chat" and published successfully!');
      console.log(`   Agent ID: ${retellAgent.agent_id}`);
      console.log('');
      
      // Test chat session
      console.log('Step 7: Testing chat session...');
      const chatSession = await retellClient.chat.create({
        agent_id: retellAgent.agent_id,
        metadata: { test: true },
      });
      
      console.log('✅ Chat session created!');
      console.log(`   Chat ID: ${chatSession.chat_id}`);
      
      // Clean up
      await retellClient.chat.end(chatSession.chat_id);
      console.log('✅ Chat session ended');
      console.log('');
      
      console.log('🎉🎉🎉 COMPLETE SUCCESS! Agent is working correctly!');
    } else {
      console.log('⚠️  Agent created but not yet published');
      console.log('   This may require additional time or manual publishing');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCreateChatAgentWithChannel()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

