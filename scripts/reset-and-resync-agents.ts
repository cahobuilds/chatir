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

async function resetAndResyncAgents(tenantId: string, agentType?: 'chat' | 'voice', dryRun: boolean = false) {
  console.log('============================================================');
  console.log('Agent Reset and Resync Script');
  console.log('============================================================\n');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  // 1. Get all agents for the tenant
  console.log('1. Fetching agents from database...');
  let query = supabase
    .from('agents')
    .select('id, name, type, retell_agent_id, tenant_id, created_at')
    .eq('tenant_id', tenantId);

  if (agentType) {
    query = query.eq('type', agentType);
  }

  const { data: agents, error: agentsError } = await query;

  if (agentsError) {
    console.error('❌ Error fetching agents:', agentsError.message);
    return;
  }

  if (!agents || agents.length === 0) {
    console.log('✅ No agents found for this tenant.');
    return;
  }

  console.log(`✅ Found ${agents.length} agent(s) in database\n`);

  // 2. Filter agents that have retell_agent_id (synced from Retell)
  const syncedAgents = agents.filter(agent => agent.retell_agent_id);
  const manualAgents = agents.filter(agent => !agent.retell_agent_id);

  console.log('2. Analyzing agents...');
  console.log(`   - Agents synced from Retell: ${syncedAgents.length}`);
  console.log(`   - Manually created agents (no retell_agent_id): ${manualAgents.length}\n`);

  if (syncedAgents.length === 0) {
    console.log('✅ No synced agents to delete. You can proceed with sync.');
    return;
  }

  // 3. Display agents that will be deleted
  console.log('3. Agents that will be deleted (synced from Retell):');
  syncedAgents.forEach((agent, index) => {
    console.log(`   ${index + 1}. ${agent.name} (${agent.type})`);
    console.log(`      ID: ${agent.id}`);
    console.log(`      Retell Agent ID: ${agent.retell_agent_id}`);
    console.log(`      Created: ${new Date(agent.created_at).toISOString()}\n`);
  });

  if (manualAgents.length > 0) {
    console.log('4. Agents that will be preserved (manually created):');
    manualAgents.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.name} (${agent.type})`);
      console.log(`      ID: ${agent.id}\n`);
    });
  }

  // 4. Confirm deletion
  if (dryRun) {
    console.log('============================================================');
    console.log('DRY RUN COMPLETE');
    console.log('============================================================');
    console.log(`Would delete ${syncedAgents.length} agent(s) synced from Retell.`);
    console.log(`Would preserve ${manualAgents.length} manually created agent(s).`);
    console.log('\nTo actually delete, run without --dry-run flag.');
    return;
  }

  // 5. Delete synced agents
  console.log('5. Deleting synced agents...');
  const agentIdsToDelete = syncedAgents.map(agent => agent.id);
  
  // Delete in batches to avoid overwhelming the database
  const batchSize = 10;
  let deletedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < agentIdsToDelete.length; i += batchSize) {
    const batch = agentIdsToDelete.slice(i, i + batchSize);
    
    for (const agentId of batch) {
      const { error: deleteError } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId);

      if (deleteError) {
        console.error(`   ❌ Failed to delete agent ${agentId}:`, deleteError.message);
        errorCount++;
      } else {
        deletedCount++;
        console.log(`   ✅ Deleted agent ${agentId}`);
      }
    }

    if (i + batchSize < agentIdsToDelete.length) {
      console.log(`   Progress: ${Math.min(i + batchSize, agentIdsToDelete.length)}/${agentIdsToDelete.length}...`);
    }
  }

  console.log(`\n✅ Deletion complete: ${deletedCount} deleted, ${errorCount} errors\n`);

  // 6. Summary
  console.log('============================================================');
  console.log('RESET COMPLETE');
  console.log('============================================================');
  console.log(`Deleted ${deletedCount} agent(s) synced from Retell.`);
  console.log(`Preserved ${manualAgents.length} manually created agent(s).`);
  console.log('\nNext steps:');
  console.log('1. Go to the Chat Agents or Voice Agents page in the UI');
  console.log('2. Click "Sync Agents" button');
  console.log('3. Only published agents will be synced from Retell');
  console.log('============================================================\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const tenantIdIndex = args.findIndex(arg => arg === '--tenant-id' || arg === '-t');
const typeIndex = args.findIndex(arg => arg === '--type' || arg === '-T');
const dryRunIndex = args.findIndex(arg => arg === '--dry-run' || arg === '-d');

const tenantId = tenantIdIndex >= 0 && tenantIdIndex < args.length - 1 
  ? args[tenantIdIndex + 1] 
  : null;

const agentType = typeIndex >= 0 && typeIndex < args.length - 1
  ? (args[typeIndex + 1] as 'chat' | 'voice')
  : undefined;

const dryRun = dryRunIndex >= 0;

if (!tenantId) {
  console.error('Usage: npx tsx scripts/reset-and-resync-agents.ts --tenant-id <tenant_id> [--type chat|voice] [--dry-run]');
  console.error('\nOptions:');
  console.error('  --tenant-id, -t    Tenant ID (required)');
  console.error('  --type, -T         Agent type: "chat" or "voice" (optional, defaults to all)');
  console.error('  --dry-run, -d      Preview changes without deleting (optional)');
  console.error('\nExample:');
  console.error('  npx tsx scripts/reset-and-resync-agents.ts --tenant-id <uuid> --type chat');
  console.error('  npx tsx scripts/reset-and-resync-agents.ts --tenant-id <uuid> --dry-run');
  process.exit(1);
}

if (agentType && !['chat', 'voice'].includes(agentType)) {
  console.error('Error: --type must be either "chat" or "voice"');
  process.exit(1);
}

resetAndResyncAgents(tenantId, agentType, dryRun)
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

