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

async function testRetellChatEndpoints() {
  const agentId = 'a3c2cb9c-28bb-4c74-aad0-67cdcae3d558';
  
  console.log('🧪 Testing Retell Chat Endpoints\n');
  console.log(`Agent ID: ${agentId}\n`);

  // Step 1: Get agent details
  console.log('Step 1: Fetching agent details...');
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    console.error('❌ Agent not found:', agentError);
    return;
  }

  console.log('✅ Agent found:');
  console.log(`   Name: ${agent.name}`);
  console.log(`   Type: ${agent.type}`);
  console.log(`   Retell Agent ID: ${agent.retell_agent_id || 'NOT SET'}`);
  console.log(`   Tenant ID: ${agent.tenant_id}`);
  console.log('');

  if (!agent.retell_agent_id) {
    console.error('❌ Agent is not linked to Retell. Cannot test.');
    return;
  }

  // Step 2: Get Retell API key
  console.log('Step 2: Getting Retell API key...');
  const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

  if (!retellApiKey) {
    console.error('❌ Retell API key not configured');
    return;
  }

  console.log('✅ Retell API key found');
  console.log('');

  // Step 3: Create Retell client and test chat session
  console.log('Step 3: Creating Retell chat session...');
  try {
    const retellClient = new Retell({
      apiKey: retellApiKey,
      timeout: 30 * 1000,
      maxRetries: 2,
    });

    const chatSession = await retellClient.chat.create({
      agent_id: agent.retell_agent_id,
      metadata: {
        test: true,
        test_script: true,
        agent_id: agentId,
        tenant_id: agent.tenant_id,
      },
    });

    console.log('✅ Chat session created!');
    console.log(`   Chat ID: ${chatSession.chat_id}`);
    console.log(`   Chat Status: ${chatSession.chat_status}`);
    console.log('');

    // Step 4: Send a test message
    console.log('Step 4: Sending test message...');
    const testMessage = 'Hello, this is a test message. Can you respond?';
    console.log(`   Message: "${testMessage}"`);

    const completion = await retellClient.chat.createChatCompletion({
      chat_id: chatSession.chat_id,
      content: testMessage,
    });

    console.log('✅ Message sent and completion received!');
    console.log(`   Messages in response: ${completion.messages.length}`);
    console.log('');

    // Step 5: Extract agent response
    console.log('Step 5: Extracting agent response...');
    const agentMessages = completion.messages.filter(
      (msg: any) => msg.role === 'agent' && 'content' in msg && typeof msg.content === 'string'
    );

    if (agentMessages.length === 0) {
      console.warn('⚠️  No agent messages found in completion');
      console.log('   Full completion:', JSON.stringify(completion, null, 2));
    } else {
      const latestAgentMessage = agentMessages[agentMessages.length - 1] as { content: string; role: 'agent' };
      const agentResponse = latestAgentMessage.content;
      
      console.log('✅ Agent response received!');
      console.log(`   Response: "${agentResponse}"`);
      console.log('');
    }

    // Step 6: End chat session
    console.log('Step 6: Ending chat session...');
    await retellClient.chat.end(chatSession.chat_id);
    console.log('✅ Chat session ended');
    console.log('');

    console.log('🎉 All tests passed! The Retell Chat API is working correctly.');
    console.log('');
    console.log('Summary:');
    console.log(`   ✅ Agent found and linked to Retell`);
    console.log(`   ✅ Chat session created successfully`);
    console.log(`   ✅ Message sent and response received`);
    console.log(`   ✅ Chat session cleaned up`);

  } catch (error: any) {
    console.error('❌ Error testing Retell Chat API:', error);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.message) {
      console.error('   Message:', error.message);
    }
  }
}

testRetellChatEndpoints()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

