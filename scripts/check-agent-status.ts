import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAgentStatus(agentName?: string) {
  try {
    let query = supabase
      .from('agents')
      .select('id, name, type, retell_agent_id, is_active, tenant_id, configuration, created_at')
      .eq('type', 'chat')
      .order('created_at', { ascending: false });

    if (agentName) {
      query = query.ilike('name', `%${agentName}%`);
    }

    const { data: agents, error } = await query;

    if (error) {
      console.error('Error fetching agents:', error);
      return;
    }

    if (!agents || agents.length === 0) {
      console.log('No chat agents found.');
      return;
    }

    console.log(`\nFound ${agents.length} chat agent(s):\n`);
    
    for (const agent of agents) {
      console.log(`Agent: ${agent.name}`);
      console.log(`  ID: ${agent.id}`);
      console.log(`  Type: ${agent.type}`);
      console.log(`  Active: ${agent.is_active}`);
      console.log(`  Retell Agent ID: ${agent.retell_agent_id || '❌ NOT SET'}`);
      console.log(`  Created: ${agent.created_at}`);
      
      if (agent.configuration) {
        const config = typeof agent.configuration === 'string' 
          ? JSON.parse(agent.configuration) 
          : agent.configuration;
        console.log(`  Configuration:`, JSON.stringify(config, null, 2));
      }
      
      console.log('');
    }

    // Check which agents are missing Retell agent IDs
    const agentsWithoutRetell = agents.filter(a => !a.retell_agent_id);
    if (agentsWithoutRetell.length > 0) {
      console.log(`\n⚠️  ${agentsWithoutRetell.length} agent(s) without Retell Agent ID:`);
      agentsWithoutRetell.forEach(a => {
        console.log(`  - ${a.name} (${a.id})`);
      });
      console.log('\nThese agents need to be created in Retell or synced from Retell.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

const agentName = process.argv[2];
checkAgentStatus(agentName);

