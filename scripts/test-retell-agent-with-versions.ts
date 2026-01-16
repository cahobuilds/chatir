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

async function testAgentWithVersions(retellAgentId: string) {
  console.log(`Testing Retell Agent ID: ${retellAgentId}\n`);
  console.log('============================================================\n');

  const { data: resellers } = await supabase
    .from('tenants')
    .select('id, retell_api_key')
    .eq('is_reseller', true)
    .not('retell_api_key', 'is', null)
    .limit(1);

  if (!resellers || resellers.length === 0) {
    console.error('❌ No reseller with Retell API key found');
    return;
  }

  const retellApiKey = resellers[0].retell_api_key;
  console.log('✅ Retell API key found\n');

  try {
    const retellClient = new Retell({
      apiKey: retellApiKey!,
      timeout: 30 * 1000,
      maxRetries: 2,
    });

    console.log('1. Attempting to retrieve agent directly...\n');
    try {
      const agent = await retellClient.agent.retrieve(retellAgentId);
      const agentData = agent as any;
      console.log('✅ SUCCESS! Agent retrieved directly');
      console.log(`   Name: ${agentData.agent_name}`);
      console.log(`   Channel: ${agentData.channel}`);
      console.log(`   Published: ${agentData.is_published}`);
      console.log('');
      return;
    } catch (retrieveError: any) {
      console.log(`   ❌ Direct retrieve failed: ${retrieveError.message}`);
      console.log(`   Status: ${retrieveError.status || 'N/A'}\n`);
    }

    console.log('2. Attempting to get agent versions...\n');
    try {
      const versions = await retellClient.agent.getVersions(retellAgentId);
      console.log(`✅ Found ${versions.length} version(s)\n`);
      
      versions.forEach((v: any, index: number) => {
        console.log(`   Version ${index + 1}:`);
        console.log(`      Version Number: ${v.version || 'N/A'}`);
        console.log(`      Channel: ${v.channel || 'N/A'}`);
        console.log(`      Published: ${v.is_published ? 'Yes' : 'No'}`);
        console.log(`      Last Modified: ${v.last_modification_timestamp ? new Date(v.last_modification_timestamp).toISOString() : 'N/A'}`);
        console.log('');
      });

      // Try retrieving a specific published version
      const publishedVersion = versions.find((v: any) => v.is_published);
      if (publishedVersion && publishedVersion.version !== undefined) {
        console.log(`3. Attempting to retrieve published version ${publishedVersion.version}...\n`);
        try {
          const agent = await retellClient.agent.retrieve(retellAgentId, { version: publishedVersion.version });
          const agentData = agent as any;
          console.log('✅ SUCCESS! Retrieved published version');
          console.log(`   Name: ${agentData.agent_name}`);
          console.log(`   Channel: ${agentData.channel}`);
          console.log(`   Published: ${agentData.is_published}`);
          console.log('');
        } catch (versionError: any) {
          console.log(`   ❌ Version retrieve failed: ${versionError.message}\n`);
        }
      }

    } catch (versionsError: any) {
      console.log(`   ❌ Get versions failed: ${versionsError.message}`);
      console.log(`   Status: ${versionsError.status || 'N/A'}\n`);
    }

    console.log('4. Checking if agent is in list (with pagination check)...\n');
    try {
      const agentList = await retellClient.agent.list();
      console.log(`   Total agents in list: ${agentList.length}`);
      
      const found = agentList.some((a: any) => {
        const id = typeof a === 'string' ? a : (a as any).agent_id;
        return id === retellAgentId;
      });
      
      if (found) {
        console.log(`   ✅ Agent found in list\n`);
      } else {
        console.log(`   ❌ Agent NOT found in list`);
        console.log(`   → This suggests the agent may be filtered or in a special state\n`);
      }
    } catch (listError: any) {
      console.log(`   ❌ List failed: ${listError.message}\n`);
    }

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    console.error('   Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
  }

  console.log('============================================================');
  console.log('Test Complete!\n');
}

const retellAgentId = process.argv[2] || 'agent_f2dde9e9e53c98cac611da2b69';
testAgentWithVersions(retellAgentId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });

