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

async function publishAgent(agentId: string) {
  console.log(`Publishing Retell agent for database agent ${agentId}...\n`);

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
  console.log(`   Retell Agent ID: ${agent.retell_agent_id}`);
  console.log('');

  // Get Retell API key
  const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
  if (!retellApiKey) {
    console.error('❌ Retell API key not configured');
    return;
  }

  // Publish agent
  const retellClient = new Retell({
    apiKey: retellApiKey,
    timeout: 30 * 1000,
    maxRetries: 2,
  });

  try {
    console.log('Publishing agent in Retell...');
    
    // Publish agent - this may return empty response (204 No Content)
    try {
      await retellClient.agent.publish(agent.retell_agent_id);
    } catch (publishError: any) {
      // If it's a JSON parse error but status is 204, that's OK
      if (publishError.message?.includes('JSON') || publishError.message?.includes('Unexpected end')) {
        console.log('✅ Publish request sent (empty response is normal)');
      } else {
        throw publishError;
      }
    }
    
    // Wait a moment for Retell to process
    console.log('Waiting for Retell to process...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify it's published
    const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
    const isPublished = (retellAgent as any).is_published;
    console.log(`   Published status: ${isPublished ? '✅ YES' : '❌ NO'}`);
    
    if (isPublished) {
      console.log('');
      console.log('🎉 Agent is now published and ready for chat sessions!');
    } else {
      console.log('');
      console.warn('⚠️  Agent is still not published. This may require manual publishing in Retell dashboard.');
      console.warn('   Check the Retell dashboard to ensure the agent configuration is complete.');
    }
  } catch (error: any) {
    console.error('❌ Error publishing agent:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

const agentId = process.argv[2];

if (!agentId) {
  console.error('Usage: npx tsx scripts/publish-retell-agent.ts <agent-id>');
  console.error('Example: npx tsx scripts/publish-retell-agent.ts a3c2cb9c-28bb-4c74-aad0-67cdcae3d558');
  process.exit(1);
}

publishAgent(agentId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

