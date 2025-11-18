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

async function checkAgentConfig(retellAgentId: string) {
  console.log(`Checking configuration for Retell Agent: ${retellAgentId}\n`);
  console.log('============================================================\n');

  // Check if agent exists in database
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, name, type, tenant_id, retell_agent_id, is_active, created_at, configuration')
    .eq('retell_agent_id', retellAgentId);

  if (error) {
    console.error('❌ Database error:', error);
    return;
  }

  if (!agents || agents.length === 0) {
    console.log('❌ Agent NOT found in database');
    console.log(`   No agent found with retell_agent_id: ${retellAgentId}\n`);
    console.log('   This means:');
    console.log('   - The agent may not be linked to your database');
    console.log('   - Or the retell_agent_id in the database is different\n');
    
    // Try to find any agents with similar IDs
    console.log('   Searching for similar agent IDs...\n');
    const { data: allAgents } = await supabase
      .from('agents')
      .select('id, name, retell_agent_id')
      .limit(10);
    
    if (allAgents && allAgents.length > 0) {
      console.log('   Found agents in database:');
      allAgents.forEach((a: any) => {
        console.log(`      - ${a.name}: retell_agent_id = ${a.retell_agent_id || 'NOT SET'}`);
      });
    }
    return;
  }

  console.log(`✅ Found ${agents.length} agent(s) in database:\n`);

  agents.forEach((agent: any, index: number) => {
    console.log(`Agent ${index + 1}:`);
    console.log(`   Database ID: ${agent.id}`);
    console.log(`   Name: ${agent.name}`);
    console.log(`   Type: ${agent.type}`);
    console.log(`   Active: ${agent.is_active}`);
    console.log(`   Retell Agent ID: ${agent.retell_agent_id}`);
    console.log(`   Tenant ID: ${agent.tenant_id}`);
    console.log(`   Created: ${agent.created_at}`);
    console.log(`   Configuration: ${JSON.stringify(agent.configuration, null, 2)}`);
    console.log('');
  });

  // Check tenant configuration
  const tenantId = agents[0].tenant_id;
  console.log('Checking tenant configuration...\n');
  
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, is_reseller, retell_api_key, parent_id')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    console.error('❌ Error fetching tenant:', tenantError?.message);
  } else {
    console.log('✅ Tenant found:');
    console.log(`   Name: ${tenant.name}`);
    console.log(`   Is Reseller: ${tenant.is_reseller || false}`);
    console.log(`   Has Retell API Key: ${!!tenant.retell_api_key}`);
    console.log(`   Parent ID: ${tenant.parent_id || 'None'}\n`);

    // Check reseller chain
    if (!tenant.is_reseller && tenant.parent_id) {
      console.log('   Checking parent tenant (reseller)...\n');
      let currentParentId: string | null = tenant.parent_id;
      const visited = new Set<string>();
      
      while (currentParentId && !visited.has(currentParentId)) {
        visited.add(currentParentId);
        
        const { data: parent } = await supabase
          .from('tenants')
          .select('id, name, is_reseller, retell_api_key, parent_id')
          .eq('id', currentParentId)
          .single();
        
        if (!parent) break;
        
        console.log(`   Parent Tenant:`);
        console.log(`      Name: ${parent.name}`);
        console.log(`      Is Reseller: ${parent.is_reseller || false}`);
        console.log(`      Has Retell API Key: ${!!parent.retell_api_key}`);
        console.log(`      Parent ID: ${parent.parent_id || 'None'}\n`);
        
        if (parent.is_reseller && parent.retell_api_key) {
          console.log('   ✅ Found reseller with Retell API key!\n');
          break;
        }
        
        currentParentId = parent.parent_id;
      }
    }
  }

  console.log('============================================================');
  console.log('Configuration Check Complete!\n');
}

const retellAgentId = process.argv[2] || 'agent_f2dde9e9e53c98cac611da2b69';
checkAgentConfig(retellAgentId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });
