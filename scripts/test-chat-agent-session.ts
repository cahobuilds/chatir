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

async function testChatAgentSession(retellAgentId: string) {
  console.log(`Testing Chat Agent Session: ${retellAgentId}\n`);
  console.log('============================================================\n');

  // Find agent in database
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, type, tenant_id, retell_agent_id')
    .eq('retell_agent_id', retellAgentId)
    .limit(1);

  if (agentError || !agent || agent.length === 0) {
    console.error('❌ Agent not found in database');
    return;
  }

  const agentData = agent[0];
  console.log('✅ Agent found in database:');
  console.log(`   Name: ${agentData.name}`);
  console.log(`   Type: ${agentData.type}`);
  console.log(`   Tenant ID: ${agentData.tenant_id}\n`);

  const retellApiKey = await getResellerRetellConfig(agentData.tenant_id);

  if (!retellApiKey) {
    console.error('❌ Retell API key not configured');
    return;
  }

  console.log('✅ Retell API key found\n');

  try {
    const retellClient = new Retell({
      apiKey: retellApiKey,
      timeout: 30 * 1000,
      maxRetries: 2,
    });

    console.log('1. Attempting to create a chat session...\n');
    
    try {
      const chatSession = await retellClient.chat.create({
        agent_id: retellAgentId,
        metadata: {
          test: true,
          test_script: true,
        },
      });

      console.log('✅ Chat session created successfully!');
      console.log(`   Chat ID: ${chatSession.chat_id}`);
      console.log(`   Agent ID: ${chatSession.agent_id}`);
      console.log(`   Status: ${chatSession.chat_status}\n`);

      console.log('2. Sending a test message...\n');
      
      const completion = await retellClient.chat.createChatCompletion({
        chat_id: chatSession.chat_id,
        content: 'Hello, this is a test message. Can you respond?',
      });

      console.log('✅ Chat completion successful!');
      console.log(`   Messages received: ${completion.messages.length}\n`);

      // Extract agent messages
      const agentMessages = completion.messages.filter(
        (msg: any) => msg.role === 'agent' && 'content' in msg && typeof msg.content === 'string'
      );

      if (agentMessages.length > 0) {
        console.log('📨 Agent Response:');
        agentMessages.forEach((msg: any, index: number) => {
          console.log(`   Message ${index + 1}: ${msg.content}`);
        });
        console.log('');
      } else {
        console.log('⚠️  No agent messages in response\n');
      }

      console.log('3. Ending chat session...\n');
      await retellClient.chat.end(chatSession.chat_id);
      console.log('✅ Chat session ended\n');

      console.log('============================================================');
      console.log('✅ SUCCESS! Agent is working correctly!\n');

    } catch (chatError: any) {
      console.error('❌ Chat session error:\n');
      console.error(`   Message: ${chatError.message || 'Unknown error'}`);
      console.error(`   Status: ${chatError.status || chatError?.response?.status || 'N/A'}`);
      
      if (chatError.response?.data) {
        console.error(`   Response Data:`, JSON.stringify(chatError.response.data, null, 2));
      }

      if (chatError.status === 422 || chatError?.response?.status === 422) {
        console.error('\n🔍 Analysis:');
        console.error('   → 422 Unprocessable Content: Agent may not be published');
        console.error('   → Please publish the agent in Retell dashboard');
        console.error('   → Or the agent may not be configured for chat');
      }
    }

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
  }

  console.log('============================================================');
  console.log('Test Complete!\n');
}

const retellAgentId = process.argv[2] || 'agent_f2dde9e9e53c98cac611da2b69';
testChatAgentSession(retellAgentId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });

