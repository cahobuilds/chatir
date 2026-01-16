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

// Helper function to get reseller Retell API key (direct database query)
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

async function testRetellAgentDirect(retellAgentId: string) {
  console.log(`Testing Retell Agent: ${retellAgentId}\n`);
  console.log('============================================================\n');

  // First, try to find which tenant this agent belongs to
  console.log('1. Looking up agent in database...');
  const { data: agents, error: agentError } = await supabase
    .from('agents')
    .select('id, name, type, tenant_id, retell_agent_id, is_active, created_at')
    .eq('retell_agent_id', retellAgentId);

  if (agentError) {
    console.error('❌ Error querying database:', agentError.message);
    return;
  }

  if (!agents || agents.length === 0) {
    console.log('⚠️  Agent not found in database.');
    console.log('   This agent may have been created directly in Retell dashboard.\n');
    console.log('   Attempting to test with first available tenant...\n');
    
    // Try to get any tenant with Retell configured
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name, is_reseller, retell_api_key')
      .eq('is_reseller', true)
      .not('retell_api_key', 'is', null)
      .limit(1);

    if (!tenants || tenants.length === 0) {
      console.error('❌ No reseller tenants with Retell API key found.');
      console.log('   Cannot test agent without API key.\n');
      return;
    }

    const tenant = tenants[0];
    console.log(`   Using reseller tenant: ${tenant.name} (${tenant.id})\n`);
    
    const retellApiKey = tenant.retell_api_key;
    if (!retellApiKey) {
      console.error('❌ No Retell API key found for this tenant.');
      return;
    }

    await testAgentWithApiKey(retellAgentId, retellApiKey, null);
    return;
  }

  console.log(`✅ Found ${agents.length} agent(s) in database:\n`);
  agents.forEach((agent, index) => {
    console.log(`   ${index + 1}. ${agent.name}`);
    console.log(`      Database ID: ${agent.id}`);
    console.log(`      Type: ${agent.type}`);
    console.log(`      Active: ${agent.is_active}`);
    console.log(`      Tenant ID: ${agent.tenant_id}`);
    console.log(`      Created: ${agent.created_at}\n`);
  });

  // Test with the first agent's tenant
  const firstAgent = agents[0];
  const retellApiKey = await getResellerRetellConfig(firstAgent.tenant_id);

  if (!retellApiKey) {
    console.error('❌ Retell API key not configured for this tenant or its reseller.');
    return;
  }

  console.log(`✅ Retell API key found for tenant: ${firstAgent.tenant_id}\n`);

  await testAgentWithApiKey(retellAgentId, retellApiKey, firstAgent.tenant_id);
}

async function testAgentWithApiKey(retellAgentId: string, retellApiKey: string, tenantId: string | null) {
  console.log('============================================================');
  console.log('2. Testing agent with Retell API...\n');

  try {
    const retellClient = new Retell({
      apiKey: retellApiKey,
      timeout: 30 * 1000,
      maxRetries: 3,
    });

    console.log(`   Retrieving agent: ${retellAgentId}...\n`);

    // Try to retrieve agent details
    let agentData: any = null;
    let canRetrieveAgent = true;
    
    try {
      const retellAgent = await retellClient.agent.retrieve(retellAgentId);
      agentData = retellAgent as any;

      console.log('✅ Agent retrieved successfully!\n');
      console.log('📊 Agent Details:');
      console.log(`   Agent Name: ${agentData.agent_name || 'N/A'}`);
      console.log(`   Agent ID: ${agentData.agent_id || retellAgentId}`);
      console.log(`   Published: ${agentData.is_published ? '✅ YES' : '❌ NO'}`);
      console.log(`   Channel: ${agentData.channel || 'N/A'}`);
      console.log(`   Has voice_id: ${!!agentData.voice_id}`);
      console.log(`   Has response_engine: ${!!agentData.response_engine}`);
      if (agentData.response_engine) {
        console.log(`   Response Engine Type: ${agentData.response_engine.type}`);
        if (agentData.response_engine.llm_id) {
          console.log(`   LLM ID: ${agentData.response_engine.llm_id}`);
        }
      }
      console.log('');
    } catch (retrieveError: any) {
      const errorStatus = retrieveError?.response?.status || retrieveError?.status || 500;
      const errorMessage = retrieveError?.message || 'Unknown error';
      
      if (errorStatus === 400 && errorMessage.includes('Invalid agent channel')) {
        console.log('⚠️  Agent cannot be retrieved via API (likely created in dashboard as chat agent)');
        console.log('   Error: "Invalid agent channel"');
        console.log('   This is expected for chat agents created in Retell dashboard.\n');
        console.log('   Proceeding to test chat session creation directly...\n');
        canRetrieveAgent = false;
        agentData = { channel: 'chat' }; // Assume it's a chat agent
      } else {
        throw retrieveError; // Re-throw other errors
      }
    }

    // Test creating a chat session
    // For dashboard-created chat agents, we can't check publish status via API
    // but we can try to create a chat session directly
    if (agentData?.channel === 'chat' || !canRetrieveAgent) {
      console.log('============================================================');
      console.log('3. Testing chat session creation...\n');

      try {
        const chatSession = await retellClient.chat.create({
          agent_id: retellAgentId,
          metadata: {
            test: true,
            test_script: 'test-retell-agent-direct',
            tenant_id: tenantId || 'unknown',
          },
        });

        console.log('✅ Chat session created successfully!\n');
        console.log('📊 Chat Session Details:');
        console.log(`   Chat ID: ${chatSession.chat_id}`);
        console.log(`   Chat Status: ${chatSession.chat_status || 'N/A'}`);
        console.log('');

        // Test sending a message
        console.log('============================================================');
        console.log('4. Testing message sending...\n');

        try {
          const completion = await retellClient.chat.createChatCompletion({
            chat_id: chatSession.chat_id,
            content: 'Hello, this is a test message',
          });

          console.log('✅ Message sent successfully!\n');
          console.log('📊 Completion Details:');
          console.log(`   Messages received: ${completion.messages?.length || 0}`);

          const agentMessages = completion.messages?.filter(
            (msg: any) => msg.role === 'agent' && 'content' in msg && typeof msg.content === 'string'
          ) || [];

          if (agentMessages.length > 0) {
            const latestMessage = agentMessages[agentMessages.length - 1] as { content: string };
            console.log(`   Agent Response: "${latestMessage.content}"\n`);
          } else {
            console.log('   ⚠️  No agent response content found\n');
          }

          // End the chat session
          try {
            await retellClient.chat.end(chatSession.chat_id);
            console.log('✅ Chat session ended successfully\n');
          } catch (endError: any) {
            console.warn('⚠️  Could not end chat session:', endError.message);
          }

        } catch (msgError: any) {
          console.error('❌ Error sending message:', msgError.message);
          if (msgError.response) {
            console.error('   Status:', msgError.response.status);
            console.error('   Data:', JSON.stringify(msgError.response.data, null, 2));
          }
        }

      } catch (chatError: any) {
        console.error('❌ Error creating chat session:', chatError.message);
        if (chatError.response) {
          console.error('   Status:', chatError.response.status);
          console.error('   Data:', JSON.stringify(chatError.response.data, null, 2));
        }
        console.log('\n   Possible reasons:');
        console.log('   - Agent is not published');
        console.log('   - Agent channel is not "chat"');
        console.log('   - Agent configuration is invalid');
      }
    } else {
      console.log('⚠️  Agent channel is not "chat", skipping chat session test');
      console.log(`   Channel: ${agentData.channel}`);
    }

    // List agent versions
    console.log('============================================================');
    console.log('5. Agent Versions:\n');
    try {
      const versions = await retellClient.agent.getVersions(retellAgentId);
      if (versions && versions.length > 0) {
        versions.forEach((v: any) => {
          console.log(`   Version ${v.version}:`);
          console.log(`      Published: ${v.is_published ? '✅' : '❌'}`);
          console.log(`      Channel: ${v.channel || 'N/A'}`);
          console.log(`      Last Modified: ${new Date(v.last_modification_timestamp).toISOString()}`);
          console.log('');
        });
      } else {
        console.log('   (No version details available)\n');
      }
    } catch (versionError: any) {
      console.warn('   ⚠️  Could not retrieve versions:', versionError.message);
    }

  } catch (error: any) {
    console.error('❌ Error testing agent:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    console.log('\n   Possible reasons:');
    console.log('   - Invalid agent ID');
    console.log('   - Agent does not exist');
    console.log('   - API key does not have access to this agent');
    console.log('   - Network error');
  }

  console.log('============================================================');
  console.log('Test Complete!\n');
}

const retellAgentId = process.argv[2] || 'agent_f2dde9e9e53c98cac611da2b69';
testRetellAgentDirect(retellAgentId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });
