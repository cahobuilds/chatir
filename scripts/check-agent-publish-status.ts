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

async function checkAgentPublishStatus(agentId: string) {
  console.log(`Checking publish status for agent: ${agentId}\n`);

  // Get agent from database
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, type, retell_agent_id, tenant_id, is_active, created_at, configuration')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    console.error(`❌ Agent not found:`, agentError?.message || 'Unknown error');
    return;
  }

  console.log('✅ Agent found in database:');
  console.log(`   Name: ${agent.name}`);
  console.log(`   Type: ${agent.type}`);
  console.log(`   Active: ${agent.is_active}`);
  console.log(`   Tenant ID: ${agent.tenant_id}`);
  console.log(`   Created: ${agent.created_at}`);
  console.log(`   Retell Agent ID: ${agent.retell_agent_id || '❌ NOT SET'}\n`);

  if (!agent.retell_agent_id) {
    console.log('⚠️  Agent is NOT linked to Retell AI.');
    console.log('   Cannot check publish status without Retell Agent ID.\n');
    return;
  }

  // Get Retell API key
  const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
  
  if (!retellApiKey) {
    console.error('❌ Retell API key not configured for this tenant or its reseller.');
    return;
  }

  console.log('✅ Retell API key found\n');

  // Check publish status in Retell
  try {
    const retellClient = new Retell({
      apiKey: retellApiKey,
      timeout: 30 * 1000,
      maxRetries: 3,
    });

    console.log(`Retrieving agent details from Retell...`);
    console.log(`   Retell Agent ID: ${agent.retell_agent_id}\n`);

    const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
    
    const agentData = retellAgent as any;
    const isPublished = agentData.is_published || false;
    
    console.log('📊 Retell Agent Details:');
    console.log(`   Agent Name: ${agentData.agent_name || 'N/A'}`);
    console.log(`   Published: ${isPublished ? '✅ YES' : '❌ NO'}`);
    console.log(`   Channel: ${agentData.channel || 'N/A'}`);
    console.log(`   Has voice_id: ${!!agentData.voice_id}`);
    console.log(`   Has response_engine: ${!!agentData.response_engine}`);
    
    if (agentData.response_engine) {
      console.log(`   Response Engine Type: ${agentData.response_engine.type || 'N/A'}`);
      if (agentData.response_engine.llm_id) {
        console.log(`   LLM ID: ${agentData.response_engine.llm_id}`);
      }
    }
    
    console.log('');

    if (isPublished) {
      console.log('✅ Agent is PUBLISHED and ready for chat sessions!\n');
    } else {
      console.log('⚠️  Agent is NOT PUBLISHED.');
      console.log('   Chat sessions will fail with "422 Cannot start a chat session" error.');
      console.log('   Please publish the agent using:');
      console.log(`   - The publish button in the UI, or`);
      console.log(`   - POST /api/retell/agents/${agent.id}/publish\n`);
    }

    // Try to get agent versions
    try {
      const versions = await retellClient.agent.getVersions(agent.retell_agent_id);
      console.log('📋 Agent Versions:');
      const versionsData = versions as any;
      if (versionsData.versions && Array.isArray(versionsData.versions)) {
        versionsData.versions.forEach((version: any, index: number) => {
          console.log(`   Version ${index + 1}:`);
          console.log(`     Version ID: ${version.version_id || 'N/A'}`);
          console.log(`     Published: ${version.is_published ? '✅' : '❌'}`);
          console.log(`     Created: ${version.created_at || 'N/A'}`);
        });
      } else {
        console.log('   (No version details available)');
      }
      console.log('');
    } catch (versionError: any) {
      console.log('⚠️  Could not retrieve agent versions:', versionError.message);
      console.log('');
    }

  } catch (retellError: any) {
    console.error('❌ Error checking Retell agent:', retellError.message);
    if (retellError.response) {
      console.error('   Status:', retellError.response.status);
      console.error('   Data:', JSON.stringify(retellError.response.data, null, 2));
    }
  }
}

const agentId = process.argv[2] || 'a3c2cb9c-28bb-4c74-aad0-67cdcae3d558';
checkAgentPublishStatus(agentId);

