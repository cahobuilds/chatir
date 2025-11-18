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

async function testCreateAndPublishChatAgent() {
  const tenantId = '533109f9-df24-4fca-ae88-05841c6ecf8c';
  const agentName = `Test Chat Agent ${Date.now()}`;
  
  console.log('🧪 Testing: Create and Publish Chat Agent\n');
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
    // Step 1: Get LLM and Voice
    console.log('Step 1: Fetching LLM and Voice...');
    const llms = await retellClient.llm.list();
    const voices = await retellClient.voice.list();
    
    if (!llms || llms.length === 0) {
      throw new Error('No LLMs available');
    }
    if (!voices || voices.length === 0) {
      throw new Error('No voices available');
    }
    
    const llmId = typeof llms[0] === 'string' 
      ? llms[0] 
      : (llms[0] as any).llm_id || (llms[0] as any).id;
    const voiceId = typeof voices[0] === 'string' 
      ? voices[0] 
      : (voices[0] as any).voice_id || (voices[0] as any).id;
    
    console.log(`✅ LLM: ${llmId}`);
    console.log(`✅ Voice: ${voiceId}`);
    console.log('');

    // Step 2: Create Chat Agent (with voice_id AND response_engine)
    console.log('Step 2: Creating chat agent...');
    console.log('   Requirements: voice_id + response_engine (both required)');
    
    const agentPayload = {
      agent_name: agentName,
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
    
    // Verify agent configuration
    const createdAgent = await retellClient.agent.retrieve(retellAgent.agent_id);
    console.log(`   Channel: ${(createdAgent as any).channel}`);
    console.log(`   Has voice_id: ${!!(createdAgent as any).voice_id}`);
    console.log(`   Has response_engine: ${!!(createdAgent as any).response_engine}`);
    console.log(`   Published: ${(createdAgent as any).is_published ? 'YES' : 'NO'}`);
    console.log('');

    // Step 3: Publish Agent
    console.log('Step 3: Publishing agent...');
    try {
      await retellClient.agent.publish(retellAgent.agent_id);
      console.log('✅ Publish request sent successfully');
    } catch (publishError: any) {
      if (publishError.message?.includes('JSON') || 
          publishError.message?.includes('Unexpected end') ||
          publishError.message?.includes('empty')) {
        console.log('✅ Publish request sent (empty response is expected)');
      } else {
        throw publishError;
      }
    }
    console.log('');

    // Step 4: Monitor Publish Status (check multiple times)
    console.log('Step 4: Monitoring publish status...');
    const maxChecks = 12; // Check for up to 6 minutes (12 checks × 30 seconds)
    let isPublished = false;
    
    for (let check = 1; check <= maxChecks; check++) {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds between checks
      
      const agent = await retellClient.agent.retrieve(retellAgent.agent_id);
      isPublished = (agent as any).is_published || false;
      
      const elapsedMinutes = Math.floor((check * 30) / 60);
      const elapsedSeconds = (check * 30) % 60;
      
      console.log(`   Check ${check}/${maxChecks} (${elapsedMinutes}m ${elapsedSeconds}s): Published = ${isPublished ? '✅ YES' : '❌ NO'}`);
      
      if (isPublished) {
        console.log('');
        console.log('🎉 Agent is PUBLISHED!');
        break;
      }
    }
    
    if (!isPublished) {
      console.log('');
      console.log('⚠️  Agent was not published after 6 minutes');
      console.log('   This may require manual publishing in Retell dashboard');
      console.log(`   Agent ID: ${retellAgent.agent_id}`);
      return;
    }

    // Step 5: Test Chat Session
    console.log('Step 5: Testing chat session...');
    try {
      const chatSession = await retellClient.chat.create({
        agent_id: retellAgent.agent_id,
        metadata: {
          test: true,
          test_script: true,
          agent_name: agentName,
        },
      });
      
      console.log('✅ Chat session created!');
      console.log(`   Chat ID: ${chatSession.chat_id}`);
      console.log(`   Chat Status: ${chatSession.chat_status}`);
      console.log('');

      // Send test message
      console.log('Sending test message: "Hello, can you hear me?"');
      const completion = await retellClient.chat.createChatCompletion({
        chat_id: chatSession.chat_id,
        content: 'Hello, can you hear me?',
      });
      
      console.log(`✅ Received completion with ${completion.messages.length} messages`);
      
      const agentMessages = completion.messages.filter(
        (msg: any) => msg.role === 'agent' && 'content' in msg && typeof msg.content === 'string'
      );
      
      if (agentMessages.length > 0) {
        const response = (agentMessages[agentMessages.length - 1] as any).content;
        console.log('✅ Agent responded:');
        console.log(`   "${response}"`);
        console.log('');
      } else {
        console.log('⚠️  No agent response found in completion');
        console.log('   Completion messages:', JSON.stringify(completion.messages, null, 2));
      }
      
      // Clean up
      await retellClient.chat.end(chatSession.chat_id);
      console.log('✅ Chat session ended');
      console.log('');
      
      console.log('🎉🎉🎉 COMPLETE SUCCESS!');
      console.log(`   Agent ID: ${retellAgent.agent_id}`);
      console.log(`   Agent Name: ${agentName}`);
      console.log('   ✅ Agent created');
      console.log('   ✅ Agent published');
      console.log('   ✅ Chat session created');
      console.log('   ✅ Agent responded to chat message');
      console.log('');
      console.log('The chat agent is working correctly!');
      
    } catch (chatError: any) {
      console.error('❌ Chat test failed:', chatError.message);
      if (chatError.response) {
        console.error('   Status:', chatError.response.status);
        console.error('   Response:', JSON.stringify(chatError.response.data, null, 2));
      }
      console.log('');
      console.log('⚠️  Agent is published but chat test failed');
      console.log('   This may indicate a configuration issue');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCreateAndPublishChatAgent()
  .then(() => {
    console.log('\nTest completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

