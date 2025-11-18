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
    
    if (error || !tenant) break;
    
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

async function testChatAgentPatterns() {
  console.log('Testing Different API Patterns for Creating Chat Agents\n');
  console.log('='.repeat(70));
  
  const { data: agent } = await supabase
    .from('agents')
    .select('tenant_id')
    .eq('id', 'a3c2cb9c-28bb-4c74-aad0-67cdcae3d558')
    .single();
  
  if (!agent) {
    console.error('Agent not found');
    return;
  }
  
  const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
  if (!retellApiKey) {
    console.error('No Retell API key');
    return;
  }
  
  const retellClient = new Retell({
    apiKey: retellApiKey,
    timeout: 30 * 1000,
    maxRetries: 3,
  });
  
  // Get LLM and voice
  console.log('Fetching available LLMs and voices...');
  const llms = await retellClient.llm.list();
  const voices = await retellClient.voice.list();
  const firstLLM = llms[0];
  const firstVoice = voices[0];
  const llmId = typeof firstLLM === 'string' ? firstLLM : (firstLLM as any).llm_id || (firstLLM as any).id;
  const voiceId = typeof firstVoice === 'string' ? firstVoice : (firstVoice as any).voice_id || (firstVoice as any).id;
  console.log(`   LLM: ${llmId}`);
  console.log(`   Voice: ${voiceId}\n`);
  
  const testAgents: Array<{ name: string; payload: any; description: string }> = [];
  
  // Pattern 1: Minimal chat agent (response_engine + voice_id, no channel)
  testAgents.push({
    name: 'Pattern 1: Minimal (response_engine + voice_id, no channel)',
    description: 'Basic payload with only required fields',
    payload: {
      agent_name: `Test Chat Pattern 1 ${Date.now()}`,
      voice_id: voiceId,
      response_engine: {
        type: 'retell-llm',
        llm_id: llmId,
      },
      language: 'en-US',
    },
  });
  
  // Pattern 2: Explicit channel="chat"
  testAgents.push({
    name: 'Pattern 2: Explicit channel="chat"',
    description: 'Setting channel explicitly to "chat"',
    payload: {
      agent_name: `Test Chat Pattern 2 ${Date.now()}`,
      channel: 'chat',
      voice_id: voiceId,
      response_engine: {
        type: 'retell-llm',
        llm_id: llmId,
      },
      language: 'en-US',
    },
  });
  
  // Pattern 3: No voice-specific configs (minimal voice settings)
  testAgents.push({
    name: 'Pattern 3: Minimal voice configs',
    description: 'Avoiding voice-specific settings like enable_backchannel',
    payload: {
      agent_name: `Test Chat Pattern 3 ${Date.now()}`,
      voice_id: voiceId,
      response_engine: {
        type: 'retell-llm',
        llm_id: llmId,
      },
      language: 'en-US',
      // Explicitly avoid voice-specific settings
      enable_backchannel: false,
      allow_user_dtmf: false,
    },
  });
  
  // Pattern 4: Custom LLM (websocket) instead of retell-llm
  testAgents.push({
    name: 'Pattern 4: Custom LLM (websocket)',
    description: 'Using custom-llm type instead of retell-llm',
    payload: {
      agent_name: `Test Chat Pattern 4 ${Date.now()}`,
      voice_id: voiceId,
      response_engine: {
        type: 'custom-llm',
        llm_websocket_url: 'wss://example.com/llm', // This will fail, but let's see the error
      },
      language: 'en-US',
    },
  });
  
  // Pattern 5: Response engine only, no voice_id (we know this fails, but let's confirm)
  testAgents.push({
    name: 'Pattern 5: No voice_id (should fail)',
    description: 'Testing if voice_id is truly required',
    payload: {
      agent_name: `Test Chat Pattern 5 ${Date.now()}`,
      response_engine: {
        type: 'retell-llm',
        llm_id: llmId,
      },
      language: 'en-US',
    },
  });
  
  // Pattern 6: Channel="chat" with minimal config
  testAgents.push({
    name: 'Pattern 6: channel="chat" minimal',
    description: 'Only channel, voice_id, response_engine',
    payload: {
      agent_name: `Test Chat Pattern 6 ${Date.now()}`,
      channel: 'chat',
      voice_id: voiceId,
      response_engine: {
        type: 'retell-llm',
        llm_id: llmId,
      },
    },
  });
  
  // Pattern 7: Check if order matters - response_engine before voice_id
  testAgents.push({
    name: 'Pattern 7: response_engine first',
    description: 'Ordering: response_engine before voice_id',
    payload: {
      agent_name: `Test Chat Pattern 7 ${Date.now()}`,
      response_engine: {
        type: 'retell-llm',
        llm_id: llmId,
      },
      voice_id: voiceId,
      language: 'en-US',
    },
  });
  
  for (const test of testAgents) {
    console.log(`\n${test.name}`);
    console.log(`Description: ${test.description}`);
    console.log('-'.repeat(70));
    console.log('Payload:', JSON.stringify(test.payload, null, 2));
    
    try {
      const createdAgent = await retellClient.agent.create(test.payload);
      const agentDetails = await retellClient.agent.retrieve(createdAgent.agent_id);
      const agentData = agentDetails as any;
      
      console.log(`✅ Created: ${createdAgent.agent_id}`);
      console.log(`   Channel: ${agentData.channel} ${agentData.channel === 'chat' ? '✅ CHAT!' : '❌ voice'}`);
      console.log(`   Has voice_id: ${!!agentData.voice_id}`);
      console.log(`   Has response_engine: ${!!agentData.response_engine}`);
      
      // If it's chat, try to publish and test chat session
      if (agentData.channel === 'chat') {
        console.log('   🎉 FOUND CHAT AGENT PATTERN!');
        console.log('   Publishing...');
        try {
          await retellClient.agent.publish(createdAgent.agent_id);
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const published = await retellClient.agent.retrieve(createdAgent.agent_id);
          const publishedData = published as any;
          
          if (publishedData.is_published) {
            console.log('   ✅ Published! Testing chat session...');
            try {
              const chatSession = await retellClient.chat.create({
                agent_id: createdAgent.agent_id,
                metadata: { test: true },
              });
              console.log(`   ✅ Chat session created: ${chatSession.chat_id}`);
              await retellClient.chat.end(chatSession.chat_id);
              console.log('   ✅✅✅ SUCCESS! This pattern works for chat agents!');
            } catch (chatError: any) {
              console.log(`   ❌ Chat session failed: ${chatError.message}`);
            }
          }
        } catch (publishError: any) {
          if (publishError.message?.includes('JSON') || publishError.message?.includes('Unexpected end')) {
            // Expected 204
            await new Promise(resolve => setTimeout(resolve, 3000));
            const check = await retellClient.agent.retrieve(createdAgent.agent_id);
            const checkData = check as any;
            console.log(`   Published: ${checkData.is_published ? 'YES' : 'NO'}`);
          }
        }
      }
      
      // Clean up - delete test agent
      try {
        await retellClient.agent.delete(createdAgent.agent_id);
        console.log('   🗑️  Test agent deleted');
      } catch (deleteError) {
        console.log('   ⚠️  Could not delete test agent');
      }
      
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('Testing Complete!');
}

testChatAgentPatterns()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

