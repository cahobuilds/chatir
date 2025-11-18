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

async function testAgentPublishStatus(agentId: string, maxWaitMinutes: number = 10) {
  console.log('🔍 Testing Agent Publish Status\n');
  console.log(`Agent ID: ${agentId}`);
  console.log(`Max wait time: ${maxWaitMinutes} minutes\n`);

  // Get agent from database
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (!agent || !agent.retell_agent_id) {
    console.error('❌ Agent not found or not linked to Retell');
    return;
  }

  console.log('✅ Agent found:');
  console.log(`   Name: ${agent.name}`);
  console.log(`   Type: ${agent.type}`);
  console.log(`   Retell Agent ID: ${agent.retell_agent_id}`);
  console.log('');

  const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
  if (!retellApiKey) {
    console.error('❌ Retell API key not configured');
    return;
  }

  const retellClient = new Retell({
    apiKey: retellApiKey,
    timeout: 30 * 1000,
    maxRetries: 2,
  });

  const startTime = Date.now();
  const maxWaitMs = maxWaitMinutes * 60 * 1000;
  let checkCount = 0;
  const checkInterval = 30000; // Check every 30 seconds

  while (Date.now() - startTime < maxWaitMs) {
    checkCount++;
    console.log(`\n--- Check #${checkCount} (${new Date().toLocaleTimeString()}) ---`);
    
    try {
      // Get agent status
      const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
      const isPublished = (retellAgent as any).is_published;
      const version = (retellAgent as any).version;
      
      console.log(`   Published: ${isPublished ? '✅ YES' : '❌ NO'}`);
      console.log(`   Version: ${version}`);
      
      if (isPublished) {
        console.log('\n🎉 Agent is PUBLISHED! Testing chat session...\n');
        
        try {
          // Test creating a chat session
          const chatSession = await retellClient.chat.create({
            agent_id: agent.retell_agent_id,
            metadata: {
              test: true,
              test_script: true,
              agent_id: agentId,
            },
          });
          
          console.log('✅ Chat session created successfully!');
          console.log(`   Chat ID: ${chatSession.chat_id}`);
          console.log(`   Chat Status: ${chatSession.chat_status}`);
          console.log('');
          
          // Send a test message
          console.log('Sending test message: "Hello, this is a test message."');
          const completion = await retellClient.chat.createChatCompletion({
            chat_id: chatSession.chat_id,
            content: 'Hello, this is a test message.',
          });
          
          const agentMessages = completion.messages.filter(
            (msg: any) => msg.role === 'agent' && 'content' in msg && typeof msg.content === 'string'
          );
          
          if (agentMessages.length > 0) {
            const response = (agentMessages[agentMessages.length - 1] as any).content;
            console.log('✅ Agent responded:');
            console.log(`   "${response}"`);
            console.log('');
          } else {
            console.log('⚠️  No agent response received');
          }
          
          // Clean up
          await retellClient.chat.end(chatSession.chat_id);
          console.log('✅ Chat session ended');
          console.log('');
          
          console.log('🎉 SUCCESS! Agent is published and working correctly!');
          console.log(`   Agent ID: ${agent.retell_agent_id}`);
          console.log(`   Agent Name: ${agent.name}`);
          return;
          
        } catch (chatError: any) {
          console.error('❌ Chat session test failed:', chatError.message);
          if (chatError.response) {
            console.error('   Status:', chatError.response.status);
            console.error('   Response:', JSON.stringify(chatError.response.data, null, 2));
          }
          console.log('\n⚠️  Agent is published but chat test failed. This may indicate a configuration issue.');
          return;
        }
      } else {
        const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
        const remainingMinutes = maxWaitMinutes - elapsedMinutes;
        console.log(`   ⏳ Still not published. Waiting... (${remainingMinutes} minutes remaining)`);
        
        if (remainingMinutes > 0) {
          console.log(`   Next check in 30 seconds...`);
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
      }
    } catch (error: any) {
      console.error('❌ Error checking agent:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Response:', JSON.stringify(error.response.data, null, 2));
      }
      return;
    }
  }

  console.log('\n⏰ Time limit reached. Agent is still not published.');
  console.log('   This may require manual publishing in the Retell dashboard.');
}

const agentId = process.argv[2] || 'a3c2cb9c-28bb-4c74-aad0-67cdcae3d558';
const maxWaitMinutes = parseInt(process.argv[3] || '10', 10);

testAgentPublishStatus(agentId, maxWaitMinutes)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

