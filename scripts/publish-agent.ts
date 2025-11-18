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

async function publishAgent(agentId: string) {
  console.log(`Publishing agent: ${agentId}\n`);

  // Get agent from database
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, type, retell_agent_id, tenant_id')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    console.error(`❌ Agent not found:`, agentError?.message || 'Unknown error');
    return;
  }

  console.log('✅ Agent found:');
  console.log(`   Name: ${agent.name}`);
  console.log(`   Type: ${agent.type}`);
  console.log(`   Retell Agent ID: ${agent.retell_agent_id || 'NOT SET'}\n`);

  if (!agent.retell_agent_id) {
    console.error('❌ Agent is not linked to Retell AI. Cannot publish.');
    return;
  }

  // Get Retell API key
  const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
  
  if (!retellApiKey) {
    console.error('❌ Retell API key not configured for this tenant or its reseller.');
    return;
  }

  console.log('✅ Retell API key found\n');

  // Create Retell client
  const retellClient = new Retell({
    apiKey: retellApiKey,
    timeout: 30 * 1000,
    maxRetries: 3,
  });

  // Publish agent
  try {
    console.log(`Publishing agent ${agent.retell_agent_id}...`);
    
    // Publish the agent
    await retellClient.agent.publish(agent.retell_agent_id);
    
    console.log('✅ Publish request sent successfully');
    console.log('   Waiting for Retell to process...\n');
    
    // Wait for Retell to process
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check publish status
    console.log('Checking publish status...');
    const publishedAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
    const agentData = publishedAgent as any;
    const isPublished = agentData.is_published || false;
    
    if (isPublished) {
      console.log('✅ Agent is now PUBLISHED and ready for chat sessions!\n');
    } else {
      console.log('⚠️  Publish request sent, but agent is not yet showing as published.');
      console.log('   This may require a few more moments to process.');
      console.log('   Retrying status check in 5 seconds...\n');
      
      // Wait and check again
      await new Promise(resolve => setTimeout(resolve, 5000));
      const checkAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
      const checkData = checkAgent as any;
      const checkPublished = checkData.is_published || false;
      
      if (checkPublished) {
        console.log('✅ Agent is now PUBLISHED!\n');
      } else {
        console.log('⚠️  Agent may need more time to publish, or manual intervention.');
        console.log('   Please check the Retell dashboard or try again in a few moments.\n');
      }
    }
    
    // Show final agent details
    const finalAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
    const finalData = finalAgent as any;
    console.log('📊 Final Agent Status:');
    console.log(`   Agent Name: ${finalData.agent_name || 'N/A'}`);
    console.log(`   Published: ${finalData.is_published ? '✅ YES' : '❌ NO'}`);
    console.log(`   Channel: ${finalData.channel || 'N/A'}`);
    console.log('');

  } catch (publishError: any) {
    // Handle JSON parse errors (expected for 204 No Content responses)
    if (publishError.message?.includes('JSON') || 
        publishError.message?.includes('Unexpected end') ||
        publishError.message?.includes('empty')) {
      console.log('✅ Publish request sent (empty response is expected for 204)');
      console.log('   Waiting for Retell to process...\n');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        const checkAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
        const checkData = checkAgent as any;
        const isPublished = checkData.is_published || false;
        
        if (isPublished) {
          console.log('✅ Agent is now PUBLISHED!\n');
        } else {
          console.log('⚠️  Publish request sent, but agent is not yet showing as published.');
          console.log('   Please check again in a few moments.\n');
        }
        
        // Show final status
        console.log('📊 Current Agent Status:');
        console.log(`   Agent Name: ${checkData.agent_name || 'N/A'}`);
        console.log(`   Published: ${checkData.is_published ? '✅ YES' : '❌ NO'}`);
        console.log(`   Channel: ${checkData.channel || 'N/A'}`);
        console.log('');
      } catch (checkError) {
        console.warn('⚠️  Could not verify publish status:', checkError);
      }
    } else {
      console.error('❌ Error publishing agent:', publishError.message);
      if (publishError.response) {
        console.error('   Status:', publishError.response.status);
        console.error('   Data:', JSON.stringify(publishError.response.data, null, 2));
      }
    }
  }
}

const agentId = process.argv[2] || 'a3c2cb9c-28bb-4c74-aad0-67cdcae3d558';
publishAgent(agentId)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

