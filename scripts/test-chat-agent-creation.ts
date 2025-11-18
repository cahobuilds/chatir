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

async function testChatAgentCreation() {
  console.log('Testing Chat Agent Creation Strategies\n');
  console.log('='.repeat(60));
  
  // Get tenant ID from existing agent
  const { data: agent } = await supabase
    .from('agents')
    .select('tenant_id')
    .eq('id', 'a3c2cb9c-28bb-4c74-aad0-67cdcae3d558')
    .single();
  
  if (!agent) {
    console.error('Could not find test agent');
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
  
  // Get LLM
  console.log('\n1. Fetching available LLMs...');
  const llms = await retellClient.llm.list();
  const firstLLM = llms[0];
  const llmId = typeof firstLLM === 'string' ? firstLLM : (firstLLM as any).llm_id || (firstLLM as any).id;
  console.log(`   Using LLM: ${llmId}\n`);
  
  // Strategy 1: Create agent WITHOUT voice_id (chat-only)
  console.log('Strategy 1: Creating chat agent WITHOUT voice_id');
  console.log('-'.repeat(60));
  try {
    const chatOnlyAgent = await retellClient.agent.create({
      agent_name: `Test Chat Only Agent ${Date.now()}`,
      channel: 'chat',
      response_engine: {
        type: 'retell-llm',
        llm_id: llmId,
      },
      language: 'en-US',
    });
    
    const chatOnlyDetails = await retellClient.agent.retrieve(chatOnlyAgent.agent_id);
    const chatOnlyData = chatOnlyDetails as any;
    
    console.log(`✅ Created: ${chatOnlyAgent.agent_id}`);
    console.log(`   Channel: ${chatOnlyData.channel}`);
    console.log(`   Has voice_id: ${!!chatOnlyData.voice_id}`);
    console.log(`   Has response_engine: ${!!chatOnlyData.response_engine}`);
    
    // Try to publish
    console.log('   Publishing...');
    await retellClient.agent.publish(chatOnlyAgent.agent_id);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const publishedChatOnly = await retellClient.agent.retrieve(chatOnlyAgent.agent_id);
    const publishedChatOnlyData = publishedChatOnly as any;
    console.log(`   Published: ${publishedChatOnlyData.is_published ? '✅ YES' : '❌ NO'}`);
    
    // Try to create chat session
    if (publishedChatOnlyData.is_published) {
      console.log('   Testing chat session...');
      try {
        const chatSession = await retellClient.chat.create({
          agent_id: chatOnlyAgent.agent_id,
          metadata: { test: true },
        });
        console.log(`   ✅ Chat session created: ${chatSession.chat_id}`);
        
        // Clean up
        await retellClient.chat.end(chatSession.chat_id);
        console.log('   ✅ Chat session ended');
      } catch (chatError: any) {
        console.log(`   ❌ Chat session failed: ${chatError.message}`);
      }
    }
    
    console.log('');
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    console.log('');
  }
  
  // Strategy 2: Create agent WITH voice_id but channel='chat'
  console.log('Strategy 2: Creating agent WITH voice_id but channel="chat"');
  console.log('-'.repeat(60));
  try {
    // Get a voice
    const voices = await retellClient.voice.list();
    const firstVoice = voices[0];
    const voiceId = typeof firstVoice === 'string' ? firstVoice : (firstVoice as any).voice_id || (firstVoice as any).id;
    
    const voiceWithChatAgent = await retellClient.agent.create({
      agent_name: `Test Voice+Chat Agent ${Date.now()}`,
      channel: 'chat',
      voice_id: voiceId,
      response_engine: {
        type: 'retell-llm',
        llm_id: llmId,
      },
      language: 'en-US',
    });
    
    const voiceWithChatDetails = await retellClient.agent.retrieve(voiceWithChatAgent.agent_id);
    const voiceWithChatData = voiceWithChatDetails as any;
    
    console.log(`✅ Created: ${voiceWithChatAgent.agent_id}`);
    console.log(`   Channel: ${voiceWithChatData.channel}`);
    console.log(`   Has voice_id: ${!!voiceWithChatData.voice_id}`);
    console.log(`   Has response_engine: ${!!voiceWithChatData.response_engine}`);
    
    // Try to publish
    console.log('   Publishing...');
    await retellClient.agent.publish(voiceWithChatAgent.agent_id);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const publishedVoiceWithChat = await retellClient.agent.retrieve(voiceWithChatAgent.agent_id);
    const publishedVoiceWithChatData = publishedVoiceWithChat as any;
    console.log(`   Published: ${publishedVoiceWithChatData.is_published ? '✅ YES' : '❌ NO'}`);
    
    // Try to create chat session
    if (publishedVoiceWithChatData.is_published) {
      console.log('   Testing chat session...');
      try {
        const chatSession = await retellClient.chat.create({
          agent_id: voiceWithChatAgent.agent_id,
          metadata: { test: true },
        });
        console.log(`   ✅ Chat session created: ${chatSession.chat_id}`);
        
        // Clean up
        await retellClient.chat.end(chatSession.chat_id);
        console.log('   ✅ Chat session ended');
      } catch (chatError: any) {
        console.log(`   ❌ Chat session failed: ${chatError.message}`);
      }
    }
    
    console.log('');
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    console.log('');
  }
  
  // Strategy 3: Create voice agent first, then update to add chat capability
  console.log('Strategy 3: Create voice agent, publish, then update for chat');
  console.log('-'.repeat(60));
  try {
    const voices = await retellClient.voice.list();
    const firstVoice = voices[0];
    const voiceId = typeof firstVoice === 'string' ? firstVoice : (firstVoice as any).voice_id || (firstVoice as any).id;
    
    // Step 1: Create voice agent
    console.log('   Step 1: Creating voice agent...');
    const voiceAgent = await retellClient.agent.create({
      agent_name: `Test Voice First Agent ${Date.now()}`,
      channel: 'voice',
      voice_id: voiceId,
      response_engine: {
        type: 'retell-llm',
        llm_id: llmId,
      },
      language: 'en-US',
    });
    
    const voiceAgentDetails = await retellClient.agent.retrieve(voiceAgent.agent_id);
    const voiceAgentData = voiceAgentDetails as any;
    console.log(`   ✅ Created: ${voiceAgent.agent_id}`);
    console.log(`      Channel: ${voiceAgentData.channel}`);
    
    // Step 2: Publish voice agent
    console.log('   Step 2: Publishing voice agent...');
    await retellClient.agent.publish(voiceAgent.agent_id);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const publishedVoice = await retellClient.agent.retrieve(voiceAgent.agent_id);
    const publishedVoiceData = publishedVoice as any;
    console.log(`   ✅ Published: ${publishedVoiceData.is_published ? 'YES' : 'NO'}`);
    
    // Step 3: Try to create chat session with voice agent
    console.log('   Step 3: Testing chat session with voice agent...');
    try {
      const chatSession = await retellClient.chat.create({
        agent_id: voiceAgent.agent_id,
        metadata: { test: true },
      });
      console.log(`   ✅ Chat session created: ${chatSession.chat_id}`);
      await retellClient.chat.end(chatSession.chat_id);
      console.log('   ✅ Voice agent CAN support chat sessions!');
    } catch (chatError: any) {
      console.log(`   ❌ Chat session failed: ${chatError.message}`);
      console.log('   → Voice agent cannot support chat sessions');
    }
    
    // Step 4: Try updating channel to 'chat'
    console.log('   Step 4: Updating channel to "chat"...');
    try {
      const updatedAgent = await retellClient.agent.update(voiceAgent.agent_id, {
        agent_name: voiceAgentData.agent_name,
        channel: 'chat',
        voice_id: voiceAgentData.voice_id,
        response_engine: voiceAgentData.response_engine,
        language: voiceAgentData.language,
      });
      
      const updatedDetails = await retellClient.agent.retrieve(voiceAgent.agent_id);
      const updatedData = updatedDetails as any;
      console.log(`   ✅ Updated - Channel: ${updatedData.channel}`);
      
      // Publish updated version
      console.log('   Step 5: Publishing updated agent...');
      await retellClient.agent.publish(voiceAgent.agent_id);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const finalAgent = await retellClient.agent.retrieve(voiceAgent.agent_id);
      const finalData = finalAgent as any;
      console.log(`   ✅ Published: ${finalData.is_published ? 'YES' : 'NO'}`);
      
      // Test chat session again
      if (finalData.is_published) {
        console.log('   Step 6: Testing chat session after update...');
        try {
          const chatSession2 = await retellClient.chat.create({
            agent_id: voiceAgent.agent_id,
            metadata: { test: true },
          });
          console.log(`   ✅ Chat session created: ${chatSession2.chat_id}`);
          await retellClient.chat.end(chatSession2.chat_id);
          console.log('   ✅ Updated agent CAN support chat sessions!');
        } catch (chatError2: any) {
          console.log(`   ❌ Chat session still failed: ${chatError2.message}`);
        }
      }
    } catch (updateError: any) {
      console.log(`   ❌ Update failed: ${updateError.message}`);
    }
    
    console.log('');
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log('Test Complete!');
}

testChatAgentCreation()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

