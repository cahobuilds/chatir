/**
 * Test Script: Verify which fields Retell LLM update API accepts
 * 
 * This script tests the Retell AI LLM update endpoint to determine:
 * 1. Which fields can be updated via llm.update()
 * 2. What the TypeScript types define for LLMUpdateParams
 * 3. What fields are returned from llm.retrieve()
 * 
 * Usage:
 *   tsx scripts/test-retell-llm-update-fields.ts <agent_id>
 * 
 * Or set environment variables:
 *   RETELL_API_KEY=your_key
 *   AGENT_ID=your_agent_id
 */

import Retell from 'retell-sdk';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

// Helper function to get Retell API key from reseller config (matches existing pattern)
async function getResellerRetellConfig(organizationTenantId: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
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
    
    // If this tenant is a reseller and has API key, return it
    if (tenantData.is_reseller === true && tenantData.retell_api_key) {
      return tenantData.retell_api_key;
    }
    
    // Otherwise, check parent
    currentTenantId = tenantData.parent_id;
  }
  
  return null;
}

async function testRetellLLMUpdateFields() {
  try {
    // Get agent ID from command line or env
    const agentId = process.argv[2] || process.env.AGENT_ID;
    
    if (!agentId) {
      console.error('❌ Error: Agent ID required');
      console.log('Usage: tsx scripts/test-retell-llm-update-fields.ts <agent_id>');
      console.log('   Or set AGENT_ID environment variable');
      process.exit(1);
    }

    console.log('🔍 Testing Retell LLM Update Fields');
    console.log('=====================================\n');

    // Get Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get agent from database
    console.log(`📋 Fetching agent ${agentId} from database...`);
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, tenant_id, retell_agent_id, configuration')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error(`Agent not found: ${agentError?.message}`);
    }

    console.log(`✅ Found agent: ${agent.name}`);
    console.log(`   Tenant ID: ${agent.tenant_id}`);
    console.log(`   Retell Agent ID: ${agent.retell_agent_id || 'None'}\n`);

    if (!agent.retell_agent_id) {
      throw new Error('Agent is not linked to Retell. Please sync the agent first.');
    }

    // Get Retell API key
    console.log('🔑 Getting Retell API key from reseller config...');
    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

    if (!retellApiKey) {
      throw new Error('Retell API key not configured for this tenant\'s reseller');
    }

    console.log('✅ Retell API key retrieved\n');

    // Create Retell client
    const retellClient = new Retell({
      apiKey: retellApiKey,
      timeout: 30 * 1000,
      maxRetries: 3,
    });

    // Step 1: Retrieve agent from Retell to get LLM ID
    console.log('📥 Retrieving agent from Retell...');
    const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
    const retellAgentData = retellAgent as any;

    console.log('✅ Agent retrieved from Retell');
    console.log(`   Agent Name: ${retellAgentData.agent_name}`);
    console.log(`   Response Engine Type: ${retellAgentData.response_engine?.type || 'None'}`);

    if (retellAgentData.response_engine?.type !== 'retell-llm') {
      throw new Error(`Agent uses ${retellAgentData.response_engine?.type || 'unknown'} LLM. This test only works with retell-llm type.`);
    }

    const llmId = retellAgentData.response_engine.llm_id;
    if (!llmId) {
      throw new Error('Agent has no LLM ID');
    }

    console.log(`   LLM ID: ${llmId}\n`);

    // Step 2: Retrieve current LLM configuration
    console.log('📥 Retrieving current LLM configuration...');
    const currentLlm = await retellClient.llm.retrieve(llmId);
    const currentLlmData = currentLlm as any;

    console.log('✅ LLM retrieved');
    console.log('\n📊 Current LLM Fields:');
    console.log('====================');
    console.log(JSON.stringify(currentLlmData, null, 2));
    console.log('\n');

    // Step 3: Check TypeScript types (if available)
    console.log('🔍 Checking TypeScript Types...');
    console.log('================================');
    
    try {
      // Try to import types from retell-sdk
      const retellSDK = await import('retell-sdk');
      console.log('✅ Retell SDK imported');
      
      // Check if we can access type definitions
      console.log('\n📦 Available exports from retell-sdk:');
      const exports = Object.keys(retellSDK).filter(key => 
        key.toLowerCase().includes('llm') || 
        key.toLowerCase().includes('update') ||
        key.toLowerCase().includes('type')
      );
      console.log(exports.length > 0 ? exports.join(', ') : 'No LLM-related exports found');
    } catch (typeError) {
      console.log('⚠️  Could not inspect TypeScript types:', (typeError as Error).message);
    }

    // Step 4: Test updating different fields
    console.log('\n🧪 Testing LLM Update with Different Fields');
    console.log('===========================================\n');

    const fieldsToTest = [
      { name: 'general_prompt', value: 'Test prompt update' },
      { name: 'model', value: 'gpt-4.1' },
      { name: 'temperature', value: 0.7 },
      { name: 'max_tokens', value: 1000 },
      { name: 'max_output_tokens', value: 1000 },
      { name: 'tools', value: [] },
      { name: 'tool_call_strict_mode', value: false },
    ];

    const testResults: Array<{ field: string; success: boolean; error?: string; response?: any }> = [];

    for (const field of fieldsToTest) {
      console.log(`\n🧪 Testing field: ${field.name} = ${JSON.stringify(field.value)}`);
      
      try {
        // Prepare update payload - preserve required fields
        const updatePayload: any = {
          start_speaker: currentLlmData.start_speaker || 'agent',
          general_prompt: currentLlmData.general_prompt || '',
        };

        // Add the field we're testing
        updatePayload[field.name] = field.value;

        console.log(`   Payload: ${JSON.stringify(updatePayload)}`);

        // Attempt update
        const updatedLlm = await retellClient.llm.update(llmId, updatePayload);
        
        console.log(`   ✅ SUCCESS - Field ${field.name} accepted`);
        testResults.push({ 
          field: field.name, 
          success: true,
          response: updatedLlm 
        });

        // Verify the update by retrieving again
        const verifyLlm = await retellClient.llm.retrieve(llmId);
        const verifyData = verifyLlm as any;
        console.log(`   📊 Updated value: ${JSON.stringify(verifyData[field.name])}`);

        // Restore original value
        const restorePayload: any = {
          start_speaker: currentLlmData.start_speaker || 'agent',
          general_prompt: currentLlmData.general_prompt || '',
        };
        restorePayload[field.name] = currentLlmData[field.name];
        
        await retellClient.llm.update(llmId, restorePayload);
        console.log(`   🔄 Restored original value`);

      } catch (error: any) {
        console.log(`   ❌ FAILED - Field ${field.name} rejected`);
        console.log(`   Error: ${error.message}`);
        testResults.push({ 
          field: field.name, 
          success: false, 
          error: error.message 
        });
      }
    }

    // Step 5: Summary
    console.log('\n\n📊 Test Results Summary');
    console.log('======================\n');

    const successfulFields = testResults.filter(r => r.success);
    const failedFields = testResults.filter(r => !r.success);

    console.log('✅ Successfully Updated Fields:');
    successfulFields.forEach(r => {
      console.log(`   - ${r.field}`);
    });

    console.log('\n❌ Failed Fields:');
    failedFields.forEach(r => {
      console.log(`   - ${r.field}: ${r.error}`);
    });

    console.log('\n\n💡 Recommendations:');
    console.log('==================');
    
    if (successfulFields.length > 0) {
      console.log('✅ These fields CAN be updated via llm.update():');
      successfulFields.forEach(r => console.log(`   - ${r.field}`));
    }

    if (failedFields.length > 0) {
      console.log('\n❌ These fields CANNOT be updated via llm.update():');
      failedFields.forEach(r => console.log(`   - ${r.field}`));
    }

    console.log('\n✅ Test completed!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testRetellLLMUpdateFields();

