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

async function createAndPublishChatAgent() {
  const agentName = `Test Chat Agent ${Date.now()}`;
  const tenantId = '533109f9-df24-4fca-ae88-05841c6ecf8c'; // Use the same tenant as the test agent
  
  console.log('🚀 Creating and Publishing Chat Agent\n');
  console.log(`Agent Name: ${agentName}`);
  console.log(`Tenant ID: ${tenantId}\n`);

  // Get Retell API key
  const retellApiKey = await getResellerRetellConfig(tenantId);
  if (!retellApiKey) {
    console.error('❌ Retell API key not configured');
    return;
  }
  console.log('✅ Retell API key found\n');

  const retellClient = new Retell({
    apiKey: retellApiKey,
    timeout: 30 * 1000,
    maxRetries: 3,
  });

  try {
    // Step 1: Fetch available LLMs
    console.log('Step 1: Fetching available LLMs...');
    const llms = await retellClient.llm.list();
    if (!llms || llms.length === 0) {
      throw new Error('No LLMs available in Retell');
    }
    
    const firstLLM = llms[0];
    const llmId = typeof firstLLM === 'string' 
      ? firstLLM 
      : (firstLLM as any).llm_id || (firstLLM as any).id || (firstLLM as any).llmId;
    
    if (!llmId) {
      throw new Error(`Could not extract LLM ID from: ${JSON.stringify(firstLLM)}`);
    }
    console.log(`✅ Using LLM: ${llmId}\n`);

    // Step 2: Fetch available voices
    console.log('Step 2: Fetching available voices...');
    let voiceId: string;
    try {
      const voices = await retellClient.voice.list();
      if (voices && voices.length > 0) {
        const firstVoice = voices[0];
        voiceId = typeof firstVoice === 'string' 
          ? firstVoice 
          : (firstVoice as any).voice_id || (firstVoice as any).id;
        console.log(`✅ Using voice: ${voiceId}\n`);
      } else {
        voiceId = 'sarah'; // Fallback
        console.log(`⚠️  No voices found, using default: ${voiceId}\n`);
      }
    } catch (voiceError) {
      voiceId = 'sarah';
      console.log(`⚠️  Could not fetch voices, using default: ${voiceId}\n`);
    }

    // Step 3: Create agent payload
    console.log('Step 3: Creating agent configuration...');
    const agentPayload: any = {
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

    // Step 4: Create agent in Retell
    console.log('Step 4: Creating agent in Retell...');
    const retellAgent = await retellClient.agent.create(agentPayload);
    console.log('✅ Agent created!');
    console.log(`   Agent ID: ${retellAgent.agent_id}`);
    console.log('');

    // Step 5: Wait a moment for Retell to process
    console.log('Step 5: Waiting for Retell to process agent creation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Wait complete\n');

    // Step 6: Verify agent exists and get its details
    console.log('Step 6: Verifying agent configuration...');
    const retrievedAgent = await retellClient.agent.retrieve(retellAgent.agent_id);
    console.log('✅ Agent retrieved:');
    console.log(`   Name: ${(retrievedAgent as any).agent_name}`);
    console.log(`   Published: ${(retrievedAgent as any).is_published ? 'YES' : 'NO'}`);
    console.log(`   Response Engine: ${JSON.stringify((retrievedAgent as any).response_engine, null, 2)}`);
    console.log('');

    // Step 7: Publish the agent
    console.log('Step 7: Publishing agent...');
    try {
      // The publish endpoint returns void, so we need to handle it carefully
      await retellClient.agent.publish(retellAgent.agent_id);
      console.log('✅ Publish request sent successfully');
    } catch (publishError: any) {
      // Check if it's just a JSON parse error (empty response is OK)
      if (publishError.message?.includes('JSON') || 
          publishError.message?.includes('Unexpected end') ||
          publishError.message?.includes('empty')) {
        console.log('✅ Publish request sent (empty response is expected)');
      } else {
        // Re-throw if it's a real error
        throw publishError;
      }
    }
    console.log('');

    // Step 8: Wait for publish to process
    console.log('Step 8: Waiting for publish to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('✅ Wait complete\n');

    // Step 9: Verify agent is published
    console.log('Step 9: Verifying agent is published...');
    const publishedAgent = await retellClient.agent.retrieve(retellAgent.agent_id);
    const isPublished = (publishedAgent as any).is_published;
    
    if (isPublished) {
      console.log('✅ Agent is PUBLISHED!');
      console.log('');
    } else {
      console.log('❌ Agent is still NOT published');
      console.log('   This may indicate:');
      console.log('   - The publish API requires additional time');
      console.log('   - The agent configuration needs manual review');
      console.log('   - There may be a Retell API limitation');
      console.log('');
    }

    // Step 10: Test chat session if published
    if (isPublished) {
      console.log('Step 10: Testing chat session...');
      try {
        const chatSession = await retellClient.chat.create({
          agent_id: retellAgent.agent_id,
          metadata: {
            test: true,
            test_script: true,
          },
        });
        
        console.log('✅ Chat session created successfully!');
        console.log(`   Chat ID: ${chatSession.chat_id}`);
        console.log('');
        
        // Send a test message
        console.log('Sending test message...');
        const completion = await retellClient.chat.createChatCompletion({
          chat_id: chatSession.chat_id,
          content: 'Hello, this is a test message.',
        });
        
        const agentMessages = completion.messages.filter(
          (msg: any) => msg.role === 'agent' && 'content' in msg && typeof msg.content === 'string'
        );
        
        if (agentMessages.length > 0) {
          const response = (agentMessages[agentMessages.length - 1] as any).content;
          console.log('✅ Received agent response:');
          console.log(`   "${response}"`);
          console.log('');
        }
        
        // Clean up
        await retellClient.chat.end(chatSession.chat_id);
        console.log('✅ Chat session ended');
        console.log('');
        
        console.log('🎉 SUCCESS! Agent created, published, and tested successfully!');
        console.log(`   Agent ID: ${retellAgent.agent_id}`);
        console.log(`   Agent Name: ${agentName}`);
        
      } catch (chatError: any) {
        console.error('❌ Chat session test failed:', chatError.message);
        if (chatError.response) {
          console.error('   Response:', JSON.stringify(chatError.response.data, null, 2));
        }
      }
    } else {
      console.log('⚠️  Skipping chat test - agent is not published');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('   Stack:', error.stack);
  }
}

createAndPublishChatAgent()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

