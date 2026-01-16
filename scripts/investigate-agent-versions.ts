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

async function investigateAgentVersions() {
  const agentId = 'agent_0098ffcfc061f90ba191896e7a';
  const tenantId = '533109f9-df24-4fca-ae88-05841c6ecf8c';
  
  console.log('Investigating agent versions and publish requirements...\n');
  console.log(`Agent ID: ${agentId}\n`);

  const retellApiKey = await getResellerRetellConfig(tenantId);
  if (!retellApiKey) {
    console.error('❌ Retell API key not configured');
    return;
  }

  const retellClient = new Retell({
    apiKey: retellApiKey,
    timeout: 30 * 1000,
    maxRetries: 2,
  });

  try {
    // Get agent details
    console.log('1. Getting agent details...');
    const agent = await retellClient.agent.retrieve(agentId);
    console.log('   Agent Name:', (agent as any).agent_name);
    console.log('   Published:', (agent as any).is_published);
    console.log('   Full agent:', JSON.stringify(agent, null, 2));
    console.log('');

    // Get agent versions
    console.log('2. Getting agent versions...');
    try {
      const versions = await retellClient.agent.getVersions(agentId);
      console.log('   Versions:', JSON.stringify(versions, null, 2));
      console.log('');
    } catch (versionError: any) {
      console.log('   Error getting versions:', versionError.message);
      console.log('');
    }

    // Try updating the agent first, then publishing
    console.log('3. Attempting to update agent (no-op update)...');
    try {
      const updatedAgent = await retellClient.agent.update(agentId, {
        agent_name: (agent as any).agent_name, // Same name
      });
      console.log('   ✅ Agent updated');
      console.log('   Updated agent:', JSON.stringify(updatedAgent, null, 2));
      console.log('');
    } catch (updateError: any) {
      console.log('   Error updating:', updateError.message);
      console.log('');
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try publishing again
    console.log('4. Publishing agent after update...');
    try {
      await retellClient.agent.publish(agentId);
      console.log('   ✅ Publish request sent');
    } catch (publishError: any) {
      if (publishError.message?.includes('JSON') || publishError.message?.includes('Unexpected end')) {
        console.log('   ✅ Publish request sent (empty response)');
      } else {
        console.log('   Error:', publishError.message);
      }
    }
    console.log('');

    // Wait and check
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('5. Checking final status...');
    const finalAgent = await retellClient.agent.retrieve(agentId);
    console.log('   Published:', (finalAgent as any).is_published ? '✅ YES' : '❌ NO');
    
    if ((finalAgent as any).is_published) {
      console.log('\n🎉 Agent is published!');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

investigateAgentVersions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

