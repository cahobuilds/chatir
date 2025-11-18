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

async function inspectAgent(agentId: string) {
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, type, retell_agent_id, tenant_id')
    .eq('id', agentId)
    .single();

  if (!agent || !agent.retell_agent_id) {
    console.error('Agent not found or not linked');
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

  try {
    const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
    console.log('Full Agent Configuration:');
    console.log(JSON.stringify(retellAgent, null, 2));
    
    // Try to get versions
    try {
      const versions = await retellClient.agent.getVersions(agent.retell_agent_id);
      console.log('\nAgent Versions:');
      console.log(JSON.stringify(versions, null, 2));
    } catch (e) {
      console.log('\nCould not get versions:', e);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

const agentId = process.argv[2] || 'a3c2cb9c-28bb-4c74-aad0-67cdcae3d558';
inspectAgent(agentId)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

