/**
 * Test script to fetch a specific chat from Retell API
 * Usage: npx tsx scripts/test-fetch-retell-chat.ts <chat_id> [tenant_id]
 * 
 * Example: npx tsx scripts/test-fetch-retell-chat.ts d72fa940-c333-4976-899e-bb325381094f
 */

import Retell from 'retell-sdk';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getRetellApiKey(tenantId: string): Promise<string | null> {
  // Traverse up the tenant hierarchy to find reseller
  let currentTenantId: string | null = tenantId;
  const visited = new Set<string>();

  while (currentTenantId && !visited.has(currentTenantId)) {
    visited.add(currentTenantId);

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, parent_id, is_reseller, retell_api_key')
      .eq('id', currentTenantId)
      .single();

    if (!tenant) break;

    // If this tenant is a reseller and has API key, return it
    if (tenant.is_reseller === true && tenant.retell_api_key) {
      return tenant.retell_api_key;
    }

    currentTenantId = tenant.parent_id;
  }

  return null;
}

async function fetchChatFromRetell(chatId: string, tenantId?: string) {
  try {
    let targetTenantId = tenantId;

    // If tenant_id not provided, find it from interactions table
    if (!targetTenantId) {
      console.log(`Looking up tenant_id for chat ${chatId}...`);
      const { data: interaction } = await supabase
        .from('interactions')
        .select('tenant_id')
        .eq('retell_conversation_id', chatId)
        .single();

      if (interaction) {
        targetTenantId = interaction.tenant_id;
        console.log(`Found tenant_id: ${targetTenantId}`);
      } else {
        console.error(`No interaction found with retell_conversation_id: ${chatId}`);
        console.log('Please provide tenant_id as second argument');
        process.exit(1);
      }
    }

    // Get Retell API key
    console.log(`Getting Retell API key for tenant ${targetTenantId}...`);
    const retellApiKey = await getRetellApiKey(targetTenantId);

    if (!retellApiKey) {
      console.error('Retell API key not found for this tenant');
      process.exit(1);
    }

    console.log('Retell API key found, creating client...');

    // Create Retell client
    const retellClient = new Retell({
      apiKey: retellApiKey,
      timeout: 30 * 1000,
      maxRetries: 2,
    });

    // Fetch chat data
    console.log(`\nFetching chat ${chatId} from Retell...`);
    console.log('=' .repeat(80));

    const chatData = await retellClient.chat.retrieve(chatId);

    console.log('\n✅ Chat data retrieved successfully!\n');
    console.log('=' .repeat(80));
    console.log('\nFULL RESPONSE STRUCTURE:');
    console.log('=' .repeat(80));
    console.log(JSON.stringify(chatData, null, 2));

    console.log('\n' + '=' .repeat(80));
    console.log('\nFIELD ANALYSIS:');
    console.log('=' .repeat(80));
    console.log(`Available fields: ${Object.keys(chatData).join(', ')}`);
    console.log(`\nmessage_with_tool_calls: ${chatData.message_with_tool_calls ? 
      (Array.isArray(chatData.message_with_tool_calls) ? 
        `Array with ${chatData.message_with_tool_calls.length} items` : 
        `Present but not an array: ${typeof chatData.message_with_tool_calls}`) : 
      'NOT PRESENT'}`);
    console.log(`\nmessages: ${chatData.messages ? 
      (Array.isArray(chatData.messages) ? 
        `Array with ${chatData.messages.length} items` : 
        `Present but not an array: ${typeof chatData.messages}`) : 
      'NOT PRESENT'}`);
    console.log(`\ntranscript: ${chatData.transcript ? 
      (Array.isArray(chatData.transcript) ? 
        `Array with ${chatData.transcript.length} items` : 
        `Present but not an array: ${typeof chatData.transcript}`) : 
      'NOT PRESENT'}`);
    console.log(`\ntranscript_object: ${chatData.transcript_object ? 
      (Array.isArray(chatData.transcript_object) ? 
        `Array with ${chatData.transcript_object.length} items` : 
        `Present but not an array: ${typeof chatData.transcript_object}`) : 
      'NOT PRESENT'}`);

    // Try to extract messages
    const messages = chatData.message_with_tool_calls || 
                    chatData.messages || 
                    (Array.isArray(chatData.transcript) ? chatData.transcript : null) ||
                    (Array.isArray(chatData.transcript_object) ? chatData.transcript_object : null);

    if (messages && Array.isArray(messages) && messages.length > 0) {
      console.log('\n' + '=' .repeat(80));
      console.log(`\n✅ FOUND ${messages.length} MESSAGES:`);
      console.log('=' .repeat(80));
      messages.forEach((msg: any, index: number) => {
        console.log(`\nMessage ${index + 1}:`);
        console.log(JSON.stringify(msg, null, 2));
      });
    } else {
      console.log('\n' + '=' .repeat(80));
      console.log('\n⚠️  NO MESSAGES FOUND IN ANY FIELD');
      console.log('=' .repeat(80));
    }

    console.log('\n' + '=' .repeat(80));
    console.log('\nOTHER FIELDS:');
    console.log('=' .repeat(80));
    console.log(`chat_id: ${chatData.chat_id || 'NOT PRESENT'}`);
    console.log(`chat_status: ${chatData.chat_status || 'NOT PRESENT'}`);
    console.log(`start_timestamp: ${chatData.start_timestamp || 'NOT PRESENT'}`);
    console.log(`end_timestamp: ${chatData.end_timestamp || 'NOT PRESENT'}`);
    console.log(`chat_analysis: ${chatData.chat_analysis ? JSON.stringify(chatData.chat_analysis, null, 2) : 'NOT PRESENT'}`);
    console.log(`chat_cost: ${chatData.chat_cost || 'NOT PRESENT'}`);

  } catch (error: any) {
    console.error('\n❌ Error fetching chat:', error);
    console.error('Error message:', error?.message);
    console.error('Error response:', error?.response?.data);
    console.error('Error status:', error?.status || error?.response?.status);
    process.exit(1);
  }
}

// Main execution
const chatId = process.argv[2];
const tenantId = process.argv[3];

if (!chatId) {
  console.error('Usage: npx tsx scripts/test-fetch-retell-chat.ts <chat_id> [tenant_id]');
  console.error('Example: npx tsx scripts/test-fetch-retell-chat.ts d72fa940-c333-4976-899e-bb325381094f');
  process.exit(1);
}

fetchChatFromRetell(chatId, tenantId)
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

