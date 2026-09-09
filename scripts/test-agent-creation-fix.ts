/**
 * Test script to verify the agent creation fix
 * Tests that response_engine is properly included
 */

import Retell from 'retell-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.RETELL_API_KEY;
if (!apiKey) {
  console.error('❌ RETELL_API_KEY is not set in your environment/.env.local.');
  console.error('   (A hardcoded fallback key was removed here on 2026-09-09 for security reasons.');
  console.error('   If that key was ever used, rotate it in the Retell dashboard.)');
  process.exit(1);
}

const client = new Retell({
  apiKey,
  timeout: 30 * 1000,
  maxRetries: 2,
});

async function testAgentCreation() {
  console.log('🧪 Testing Agent Creation Fix');
  console.log('='.repeat(50));
  console.log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);

  let testAgentId: string | null = null;

  try {
    // Step 1: Get available LLMs
    console.log('\n📋 Step 1: Fetching available LLMs...');
    const llms = await client.llm.list();
    if (!llms || llms.length === 0) {
      throw new Error('No LLMs available');
    }
    const firstLLM = llms[0];
    const llmId = typeof firstLLM === 'string' ? firstLLM : (firstLLM as any).llm_id || (firstLLM as any).id;
    console.log(`✅ Found ${llms.length} LLM(s), using: ${llmId}`);

    // Step 2: Get available voices
    console.log('\n📋 Step 2: Fetching available voices...');
    const voices = await client.voice.list();
    const firstVoice = voices && voices.length > 0 
      ? (typeof voices[0] === 'string' ? voices[0] : (voices[0] as any).voice_id || (voices[0] as any).id)
      : '11labs-Adrian';
    console.log(`✅ Found ${voices?.length || 0} voice(s), using: ${firstVoice}`);

    // Step 3: Test agent creation with response_engine (the fix)
    console.log('\n📋 Step 3: Creating agent with response_engine...');
    const agentPayload = {
      agent_name: 'Test Agent - Fix Verification',
      voice_id: firstVoice,
      response_engine: {
        type: 'retell-llm',
        llm_id: llmId,
      },
      language: 'en-US',
    };

    console.log('Payload:', JSON.stringify(agentPayload, null, 2));
    
    const agent = await client.agent.create(agentPayload);
    testAgentId = agent.agent_id;
    console.log(`✅ Agent created successfully!`);
    console.log(`   Agent ID: ${agent.agent_id}`);
    console.log(`   Agent Name: ${agent.agent_name}`);

    // Step 4: Verify the agent was created correctly
    console.log('\n📋 Step 4: Verifying agent details...');
    const retrievedAgent = await client.agent.retrieve(testAgentId);
    console.log(`✅ Agent retrieved successfully!`);
    console.log(`   Response Engine Type: ${retrievedAgent.response_engine?.type || 'N/A'}`);
    if (retrievedAgent.response_engine?.type === 'retell-llm') {
      console.log(`   LLM ID: ${(retrievedAgent.response_engine as any).llm_id || 'N/A'}`);
    }

    // Step 5: Cleanup - Delete test agent
    console.log('\n📋 Step 5: Cleaning up test agent...');
    await client.agent.delete(testAgentId);
    console.log(`✅ Test agent deleted successfully!`);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests passed! Agent creation fix is working correctly.');
    console.log('='.repeat(50));

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.status) {
      console.error(`   Status: ${error.status}`);
    }
    if (error.body) {
      console.error(`   Body:`, error.body);
    }
    
    // Cleanup on error
    if (testAgentId) {
      try {
        await client.agent.delete(testAgentId);
        console.log('\n🧹 Cleaned up test agent after error');
      } catch (cleanupError) {
        console.error('⚠️  Failed to cleanup test agent:', cleanupError);
      }
    }
    
    process.exit(1);
  }
}

testAgentCreation().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

