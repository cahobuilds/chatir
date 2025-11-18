import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAgents() {
  console.log('Checking agents in database...\n');

  // Get all agents
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, name, type, retell_agent_id, tenant_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching agents:', error);
    return;
  }

  if (!agents || agents.length === 0) {
    console.log('No agents found in database.');
    return;
  }

  console.log(`Found ${agents.length} agents:\n`);
  
  agents.forEach((agent, index) => {
    console.log(`${index + 1}. ${agent.name}`);
    console.log(`   ID: ${agent.id}`);
    console.log(`   Type: ${agent.type}`);
    console.log(`   Retell Agent ID: ${agent.retell_agent_id || 'NOT SET'}`);
    console.log(`   Created: ${agent.created_at}`);
    console.log('');
  });

  // Check if the specific ID exists
  const testId = 'agent_f2dde9e9e53c98cac611da2b69';
  const testIdWithoutPrefix = 'f2dde9e9e53c98cac611da2b69';
  
  console.log(`\nChecking for ID: ${testId}`);
  const { data: agent1 } = await supabase
    .from('agents')
    .select('*')
    .eq('id', testId)
    .single();
  
  console.log(`Result: ${agent1 ? 'FOUND' : 'NOT FOUND'}`);

  console.log(`\nChecking for ID (without prefix): ${testIdWithoutPrefix}`);
  const { data: agent2 } = await supabase
    .from('agents')
    .select('*')
    .eq('id', testIdWithoutPrefix)
    .single();
  
  console.log(`Result: ${agent2 ? 'FOUND' : 'NOT FOUND'}`);

  // Check if it's a retell_agent_id
  console.log(`\nChecking if it's a retell_agent_id: ${testId}`);
  const { data: agent3 } = await supabase
    .from('agents')
    .select('*')
    .eq('retell_agent_id', testId)
    .single();
  
  if (agent3) {
    console.log(`FOUND as retell_agent_id!`);
    console.log(`   Database ID: ${agent3.id}`);
    console.log(`   Name: ${agent3.name}`);
  } else {
    console.log(`NOT FOUND as retell_agent_id`);
  }
}

checkAgents()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

