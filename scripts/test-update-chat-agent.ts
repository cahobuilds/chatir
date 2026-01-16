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

async function testUpdateChatAgent() {
  console.log('Testing if we can update a chat agent via API\n');
  console.log('='.repeat(70));
  console.log('NOTE: This test assumes you have a chat agent created in Retell dashboard');
  console.log('Please provide the Retell agent_id of a chat agent to test with\n');
  
  const retellAgentId = process.argv[2];
  
  if (!retellAgentId) {
    console.log('Usage: npx tsx scripts/test-update-chat-agent.ts <retell_agent_id>');
    console.log('\nExample: npx tsx scripts/test-update-chat-agent.ts agent_61e0863a6f6a118daf0da48586');
    console.log('\nOr test with existing agent from database:');
    
    const { data: agent } = await supabase
      .from('agents')
      .select('tenant_id, retell_agent_id')
      .eq('id', 'a3c2cb9c-28bb-4c74-aad0-67cdcae3d558')
      .single();
    
    if (agent && agent.retell_agent_id) {
      console.log(`\nFound agent in database: ${agent.retell_agent_id}`);
      console.log('(This agent is currently voice, but we can test update patterns)');
    }
    
    return;
  }
  
  const { data: agent } = await supabase
    .from('agents')
    .select('tenant_id')
    .eq('id', 'a3c2cb9c-28bb-4c74-aad0-67cdcae3d558')
    .single();
  
  if (!agent) {
    console.error('Agent not found');
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
  
  // Get current agent details
  console.log(`\n1. Retrieving current agent details...`);
  try {
    const currentAgent = await retellClient.agent.retrieve(retellAgentId);
    const currentData = currentAgent as any;
    
    console.log(`   Agent Name: ${currentData.agent_name}`);
    console.log(`   Channel: ${currentData.channel}`);
    console.log(`   Has voice_id: ${!!currentData.voice_id}`);
    console.log(`   Has response_engine: ${!!currentData.response_engine}`);
    console.log(`   Published: ${currentData.is_published ? 'YES' : 'NO'}`);
    console.log('');
    
    if (currentData.channel !== 'chat') {
      console.log('⚠️  WARNING: This agent is not a chat agent (channel != "chat")');
      console.log('   Testing update patterns anyway...\n');
    }
    
    // Test 1: Update agent_name only
    console.log('2. Test 1: Updating agent_name only...');
    try {
      const updatedAgent1 = await retellClient.agent.update(retellAgentId, {
        agent_name: `${currentData.agent_name} (Updated ${Date.now()})`,
      });
      const updatedData1 = updatedAgent1 as any;
      console.log(`   ✅ Updated successfully`);
      console.log(`   New name: ${updatedData1.agent_name}`);
      console.log(`   Channel: ${updatedData1.channel} ${updatedData1.channel === currentData.channel ? '✅ (unchanged)' : '❌ (CHANGED!)'}`);
      console.log('');
      
      // Restore original name
      await retellClient.agent.update(retellAgentId, {
        agent_name: currentData.agent_name,
      });
      console.log('   ✅ Restored original name');
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    // Test 2: Update response_engine
    console.log('3. Test 2: Updating response_engine...');
    try {
      if (currentData.response_engine) {
        const updatedAgent2 = await retellClient.agent.update(retellAgentId, {
          response_engine: currentData.response_engine, // Same response_engine
        });
        const updatedData2 = updatedAgent2 as any;
        console.log(`   ✅ Updated successfully`);
        console.log(`   Channel: ${updatedData2.channel} ${updatedData2.channel === currentData.channel ? '✅ (unchanged)' : '❌ (CHANGED!)'}`);
        console.log('');
      }
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    // Test 3: Update voice_id
    console.log('4. Test 3: Updating voice_id...');
    try {
      const voices = await retellClient.voice.list();
      if (voices.length > 1) {
        const differentVoice = voices.find((v: any) => {
          const vid = typeof v === 'string' ? v : v.voice_id || v.id;
          return vid !== currentData.voice_id;
        });
        
        if (differentVoice) {
          const newVoiceId = typeof differentVoice === 'string' ? differentVoice : (differentVoice as any).voice_id || (differentVoice as any).id;
          const updatedAgent3 = await retellClient.agent.update(retellAgentId, {
            voice_id: newVoiceId,
          });
          const updatedData3 = updatedAgent3 as any;
          console.log(`   ✅ Updated successfully`);
          console.log(`   New voice_id: ${updatedData3.voice_id}`);
          console.log(`   Channel: ${updatedData3.channel} ${updatedData3.channel === currentData.channel ? '✅ (unchanged)' : '❌ (CHANGED!)'}`);
          console.log('');
          
          // Restore original voice
          await retellClient.agent.update(retellAgentId, {
            voice_id: currentData.voice_id,
          });
          console.log('   ✅ Restored original voice_id');
        }
      }
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    // Test 4: Try to explicitly set channel (should be ignored)
    console.log('5. Test 4: Attempting to set channel explicitly...');
    try {
      const updatedAgent4 = await retellClient.agent.update(retellAgentId, {
        agent_name: currentData.agent_name,
        // @ts-ignore - channel is not in types but let's test if it's accepted
        channel: currentData.channel === 'chat' ? 'voice' : 'chat',
      } as any);
      const updatedData4 = updatedAgent4 as any;
      console.log(`   ✅ Update succeeded (channel param may have been ignored)`);
      console.log(`   Channel: ${updatedData4.channel} ${updatedData4.channel === currentData.channel ? '✅ (unchanged - param ignored)' : '❌ (CHANGED!)'}`);
      console.log('');
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    
    // Test 5: Update multiple fields at once
    console.log('6. Test 5: Updating multiple fields (name + response_engine)...');
    try {
      const updatedAgent5 = await retellClient.agent.update(retellAgentId, {
        agent_name: `${currentData.agent_name} (Multi-update test)`,
        response_engine: currentData.response_engine,
        language: currentData.language || 'en-US',
      });
      const updatedData5 = updatedAgent5 as any;
      console.log(`   ✅ Updated successfully`);
      console.log(`   Channel: ${updatedData5.channel} ${updatedData5.channel === currentData.channel ? '✅ (unchanged)' : '❌ (CHANGED!)'}`);
      console.log('');
      
      // Restore
      await retellClient.agent.update(retellAgentId, {
        agent_name: currentData.agent_name,
      });
      console.log('   ✅ Restored original name');
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    // Final check
    console.log('7. Final verification...');
    const finalAgent = await retellClient.agent.retrieve(retellAgentId);
    const finalData = finalAgent as any;
    console.log(`   Channel: ${finalData.channel}`);
    console.log(`   Agent Name: ${finalData.agent_name}`);
    console.log(`   Published: ${finalData.is_published ? 'YES' : 'NO'}`);
    
    if (finalData.channel === currentData.channel) {
      console.log('\n✅ SUCCESS: Channel remained unchanged after all updates!');
      console.log('   → You CAN update chat agents via API without changing channel');
    } else {
      console.log('\n❌ WARNING: Channel changed during updates!');
      console.log('   → Some update operations may change the channel');
    }
    
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('Test Complete!');
}

testUpdateChatAgent()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

