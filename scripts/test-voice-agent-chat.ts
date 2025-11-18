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

async function testVoiceAgentChat() {
  console.log('Testing if voice agents can support chat sessions\n');
  console.log('='.repeat(60));
  
  const retellAgentId = 'agent_61e0863a6f6a118daf0da48586'; // Existing agent
  
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
  
  // Check if version 6 (published) can support chat
  console.log('1. Checking published version 6...');
  const versions = await retellClient.agent.getVersions(retellAgentId);
  const versionsArray = versions as any[];
  const version6 = versionsArray.find(v => v.version === 6 && v.is_published);
  
  if (version6) {
    console.log(`   Version 6 is published`);
    console.log(`   Channel: ${version6.channel}`);
    console.log(`   Has response_engine: ${!!version6.response_engine}`);
    console.log('');
    
    // Try to create chat session with published version
    // Note: We can't directly use a specific version, but we can test if the agent supports chat
    console.log('2. Testing chat session with current agent (should use published version)...');
    try {
      const chatSession = await retellClient.chat.create({
        agent_id: retellAgentId,
        metadata: { test: true },
      });
      console.log(`   ✅ Chat session created: ${chatSession.chat_id}`);
      console.log('   → Voice agents WITH response_engine CAN support chat sessions!');
      
      // Test sending a message
      console.log('3. Testing chat completion...');
      const completion = await retellClient.chat.createChatCompletion({
        chat_id: chatSession.chat_id,
        content: 'Hello, this is a test message',
      });
      
      const agentMessages = completion.messages.filter(
        (msg: any) => msg.role === 'agent' && 'content' in msg && typeof msg.content === 'string'
      );
      
      if (agentMessages.length > 0) {
        const latestMessage = agentMessages[agentMessages.length - 1] as { content: string };
        console.log(`   ✅ Agent responded: ${latestMessage.content.substring(0, 100)}...`);
      }
      
      // Clean up
      await retellClient.chat.end(chatSession.chat_id);
      console.log('   ✅ Chat session ended');
      
    } catch (chatError: any) {
      console.log(`   ❌ Chat session failed: ${chatError.message}`);
      if (chatError.response) {
        console.log(`   Status: ${chatError.response.status}`);
        console.log(`   Data: ${JSON.stringify(chatError.response.data, null, 2)}`);
      }
      console.log('   → Voice agents CANNOT support chat sessions (or agent not published)');
    }
  } else {
    console.log('   Version 6 not found or not published');
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Test Complete!');
}

testVoiceAgentChat()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

