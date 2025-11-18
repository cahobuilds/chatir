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

async function testPublishWithRetry() {
  const agentId = 'agent_0098ffcfc061f90ba191896e7a'; // The agent we just created
  const tenantId = '533109f9-df24-4fca-ae88-05841c6ecf8c';
  
  console.log('Testing publish with multiple retries and longer waits...\n');
  console.log(`Agent ID: ${agentId}\n`);

  const retellApiKey = await getResellerRetellConfig(tenantId);
  if (!retellApiKey) {
    console.error('❌ Retell API key not configured');
    return;
  }

  const retellClient = new Retell({
    apiKey: retellApiKey,
    timeout: 30 * 1000,
    maxRetries: 0, // Disable retries for testing
  });

  // Check initial status
  console.log('Checking initial agent status...');
  let agent = await retellClient.agent.retrieve(agentId);
  console.log(`   Published: ${(agent as any).is_published ? 'YES' : 'NO'}`);
  console.log('');

  // Try publishing multiple times with waits
  for (let attempt = 1; attempt <= 5; attempt++) {
    console.log(`Publish attempt ${attempt}...`);
    
    try {
      // Call publish - handle empty response
      try {
        await retellClient.agent.publish(agentId);
        console.log(`   ✅ Publish request sent (attempt ${attempt})`);
      } catch (publishError: any) {
        // Check if it's a JSON parse error (expected for 204)
        if (publishError.message?.includes('JSON') || 
            publishError.message?.includes('Unexpected end') ||
            publishError.message?.includes('empty')) {
          console.log(`   ✅ Publish request sent (empty response, attempt ${attempt})`);
        } else {
          console.error(`   ❌ Publish error: ${publishError.message}`);
          if (publishError.response) {
            console.error(`   Status: ${publishError.response.status}`);
            console.error(`   Data: ${JSON.stringify(publishError.response.data)}`);
          }
          break;
        }
      }

      // Wait progressively longer each time
      const waitTime = attempt * 3; // 3s, 6s, 9s, 12s, 15s
      console.log(`   Waiting ${waitTime} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));

      // Check if published
      agent = await retellClient.agent.retrieve(agentId);
      const isPublished = (agent as any).is_published;
      
      if (isPublished) {
        console.log(`   ✅ Agent is NOW PUBLISHED after attempt ${attempt}!`);
        console.log('');
        
        // Test chat session
        console.log('Testing chat session...');
        try {
          const chatSession = await retellClient.chat.create({
            agent_id: agentId,
            metadata: { test: true },
          });
          
          console.log('✅ Chat session created!');
          console.log(`   Chat ID: ${chatSession.chat_id}`);
          
          // Clean up
          await retellClient.chat.end(chatSession.chat_id);
          console.log('✅ Chat session ended');
          
          console.log('\n🎉 SUCCESS! Agent is published and working!');
          return;
        } catch (chatError: any) {
          console.error('❌ Chat test failed:', chatError.message);
        }
      } else {
        console.log(`   ⏳ Still not published after attempt ${attempt}`);
      }
      console.log('');
      
    } catch (error: any) {
      console.error(`   ❌ Error on attempt ${attempt}:`, error.message);
    }
  }

  console.log('⚠️  Agent was not published after all attempts');
  console.log('   This suggests the publish API may require manual intervention');
  console.log('   or there may be a configuration issue with the agent');
}

testPublishWithRetry()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

