import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testChatWidget(agentId: string) {
  console.log('============================================================');
  console.log('Testing Chat Widget Message Endpoint');
  console.log('============================================================\n');

  // 1. Check agent configuration
  console.log('1. Checking agent configuration...');
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, tenant_id, name, type, is_active, retell_agent_id, configuration')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    console.error('❌ Agent not found:', agentError?.message || 'Unknown error');
    return;
  }

  console.log('✅ Agent found:');
  console.log(`   Name: ${agent.name}`);
  console.log(`   Type: ${agent.type}`);
  console.log(`   Active: ${agent.is_active}`);
  console.log(`   Retell Agent ID: ${agent.retell_agent_id || 'NOT SET'}`);
  console.log(`   Tenant ID: ${agent.tenant_id}\n`);

  if (!agent.retell_agent_id) {
    console.error('❌ Agent does not have a Retell agent ID linked!');
    console.log('   This means the agent will use fallback responses, not the LLM.');
    return;
  }

  if (agent.type !== 'chat') {
    console.error('❌ Agent is not a chat agent!');
    return;
  }

  if (!agent.is_active) {
    console.error('❌ Agent is not active!');
    return;
  }

  // 2. Check tenant Retell configuration
  console.log('2. Checking tenant Retell configuration...');
  
  // Get reseller Retell API key
  let currentTenantId: string | null = agent.tenant_id;
  const visited = new Set<string>();
  let retellApiKey: string | null = null;
  
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
      retellApiKey = tenantData.retell_api_key;
      console.log(`✅ Retell API key found for reseller tenant: ${currentTenantId}`);
      break;
    }
    
    currentTenantId = tenantData.parent_id;
  }

  if (!retellApiKey) {
    console.error('❌ Retell API key not configured for this tenant or its reseller!');
    console.log('   This means the agent will use fallback responses, not the LLM.');
    return;
  }

  // 3. Test the message endpoint
  console.log('\n3. Testing message endpoint...');
  const testMessage = 'Hello, can you help me?';
  
  // Use deployed URL for testing
  const apiUrl = process.env.TEST_API_URL || 'https://ai-multi-tenant-saas-git-obfuscation-tindeveloper.vercel.app';
  
  console.log(`   API URL: ${apiUrl}/api/widget/chat/message`);
  console.log(`   Agent ID: ${agentId}`);
  console.log(`   Message: "${testMessage}"\n`);

  try {
    const response = await fetch(`${apiUrl}/api/widget/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        message: testMessage,
      }),
    });

    const responseData = await response.json();
    
    console.log(`   HTTP Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(responseData, null, 2));

    if (response.status === 200) {
      if (responseData.response && !responseData.response.includes('Thank you for your message')) {
        console.log('\n✅ SUCCESS: Received LLM response from Retell!');
        console.log(`   Response preview: "${responseData.response.substring(0, 100)}..."`);
      } else if (responseData.warning) {
        console.log('\n⚠️  WARNING: Using fallback response (not from LLM)');
        console.log(`   Warning: ${responseData.warning}`);
      } else {
        console.log('\n⚠️  WARNING: Response looks like fallback (contains "Thank you for your message")');
        console.log('   This suggests the Retell integration is not working.');
      }
    } else {
      console.error(`\n❌ ERROR: Request failed with status ${response.status}`);
      if (responseData.error) {
        console.error(`   Error: ${responseData.error}`);
      }
      if (responseData.details) {
        console.error(`   Details: ${responseData.details}`);
      }
    }
  } catch (error: any) {
    console.error('\n❌ ERROR: Failed to call message endpoint');
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
  }

  console.log('\n============================================================');
  console.log('Test Complete!');
  console.log('============================================================\n');
}

const agentId = process.argv[2] || '3f75ab81-4244-4b6c-960d-5c9632c846a0';

console.log(`Testing agent: ${agentId}\n`);

testChatWidget(agentId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });

