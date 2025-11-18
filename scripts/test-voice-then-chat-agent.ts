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

async function testVoiceThenChatAgent() {
  const tenantId = '533109f9-df24-4fca-ae88-05841c6ecf8c';
  
  console.log('🧪 Testing: Create Voice Agent First, Then Enable Chat\n');
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
    const llmId = typeof llms[0] === 'string' ? llms[0] : (llms[0] as any).llm_id || (llms[0] as any).id;
    const voiceId = typeof voices[0] === 'string' ? voices[0] : (voices[0] as any).voice_id || (voices[0] as any).id;
    console.log(`✅ LLM: ${llmId}`);
    console.log(`✅ Voice: ${voiceId}\n`);

    // Step 2: Create Agent with BOTH voice_id AND response_engine (Unified Agent)
    // KEY FINDING: response_engine is REQUIRED even for voice agents!
    console.log('Step 2: Creating unified agent with voice_id AND response_engine...');
    console.log('   (Retell requires response_engine for ALL agents)');
    
    const unifiedAgentPayload = {
      agent_name: `Test Unified Agent ${Date.now()}`,
      voice_id: voiceId,
      language: 'en-US',
      response_engine: {
        type: 'retell-llm',
        llm_id: llmId,
      },
      // Try setting channel to 'chat' explicitly
      channel: 'chat',
    };
    
    console.log('Unified agent payload:');
    console.log(JSON.stringify(unifiedAgentPayload, null, 2));
    console.log('');

    const unifiedAgent = await retellClient.agent.create(unifiedAgentPayload);
    console.log('✅ Unified agent created!');
    console.log(`   Agent ID: ${unifiedAgent.agent_id}`);
    
    // Check channel and configuration
    const createdAgent = await retellClient.agent.retrieve(unifiedAgent.agent_id);
    console.log(`   Channel: ${(createdAgent as any).channel}`);
    console.log(`   Has voice_id: ${!!(createdAgent as any).voice_id}`);
    console.log(`   Has response_engine: ${!!(createdAgent as any).response_engine}`);
    console.log('');

    // Step 3: Publish Agent
    console.log('Step 3: Publishing unified agent...');
    try {
      await retellClient.agent.publish(unifiedAgent.agent_id);
      console.log('✅ Publish request sent');
    } catch (e: any) {
      if (e.message?.includes('JSON') || e.message?.includes('Unexpected end')) {
        console.log('✅ Publish request sent (empty response)');
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    const publishedAgent = await retellClient.agent.retrieve(unifiedAgent.agent_id);
    console.log(`   Published: ${(publishedAgent as any).is_published ? 'YES' : 'NO'}`);
    console.log('');

    // Step 4: Test Chat Session
    if ((publishedAgent as any).is_published) {
      console.log('Step 4: Testing chat session...');
      try {
        const chatSession = await retellClient.chat.create({
          agent_id: unifiedAgent.agent_id,
          metadata: { test: true },
        });
        
        console.log('✅ Chat session created!');
        console.log(`   Chat ID: ${chatSession.chat_id}`);
        
        // Send test message
        const completion = await retellClient.chat.createChatCompletion({
          chat_id: chatSession.chat_id,
          content: 'Hello, this is a test.',
        });
        
        const agentMessages = completion.messages.filter(
          (msg: any) => msg.role === 'agent' && 'content' in msg && typeof msg.content === 'string'
        );
        
        if (agentMessages.length > 0) {
          console.log('✅ Agent responded!');
          console.log(`   Response: "${(agentMessages[agentMessages.length - 1] as any).content}"`);
        }
        
        await retellClient.chat.end(chatSession.chat_id);
        console.log('✅ Chat session ended');
        console.log('');
        
        console.log('🎉 SUCCESS! Unified agent (voice_id + response_engine) works for chat!');
        console.log(`   Agent ID: ${unifiedAgent.agent_id}`);
        console.log('   CONCLUSION: Agents need BOTH voice_id AND response_engine');
        console.log('   The agent is unified - same agent works for both voice and chat');
      } catch (chatError: any) {
        console.error('❌ Chat test failed:', chatError.message);
        if (chatError.response) {
          console.error('   Response:', JSON.stringify(chatError.response.data, null, 2));
        }
      }
    } else {
      console.log('⚠️  Agent not published, skipping chat test');
      console.log('   CONCLUSION: Agent needs voice_id + response_engine, but publish may require more time');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testVoiceThenChatAgent()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

