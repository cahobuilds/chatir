/**
 * Direct script to pull chat transcript from Retell API
 * Usage: npx tsx scripts/pull-chat-transcript.ts <chat_id>
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Retell } from 'retell-sdk';

// Try multiple env file locations
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please ensure .env.local exists with these variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to get reseller Retell API key
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

async function pullChatTranscript(chatId: string) {
  console.log('='.repeat(80));
  console.log('Pulling Chat Transcript from Retell API');
  console.log('='.repeat(80));
  console.log(`Chat ID: ${chatId}\n`);

  try {
    // Find the interaction to get tenant_id
    const { data: interaction, error: interactionError } = await supabase
      .from('interactions')
      .select('id, tenant_id, retell_conversation_id, type')
      .eq('retell_conversation_id', chatId)
      .single();

    if (interactionError || !interaction) {
      console.log('⚠️  Chat not found in interactions table');
      console.log('Attempting to fetch directly from Retell...\n');
      
      // Try to get tenant_id from first available tenant
      const { data: firstTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('is_reseller', true)
        .limit(1)
        .single();
      
      if (!firstTenant) {
        console.error('❌ No reseller tenant found');
        process.exit(1);
      }
      
      const retellApiKey = await getResellerRetellConfig(firstTenant.id);
      if (!retellApiKey) {
        console.error('❌ No Retell API key found');
        process.exit(1);
      }
      
      await fetchChatFromRetell(chatId, retellApiKey);
      return;
    }

    console.log(`✅ Found interaction: ${interaction.id}`);
    console.log(`   Tenant ID: ${interaction.tenant_id}`);
    console.log(`   Type: ${interaction.type}\n`);

    // Get Retell API key
    const retellApiKey = await getResellerRetellConfig(interaction.tenant_id);
    if (!retellApiKey) {
      console.error('❌ Retell API key not found for this tenant');
      process.exit(1);
    }

    await fetchChatFromRetell(chatId, retellApiKey);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function fetchChatFromRetell(chatId: string, retellApiKey: string) {
  console.log('Fetching from Retell API...\n');

  try {
    // Create Retell client
    const retellClient = new Retell({
      apiKey: retellApiKey,
    });

    // Fetch chat data
    console.log('Calling retellClient.chat.retrieve()...');
    const chatData: any = await retellClient.chat.retrieve(chatId);

    console.log('='.repeat(80));
    console.log('RAW RESPONSE FROM RETELL API');
    console.log('='.repeat(80));
    console.log(JSON.stringify(chatData, null, 2));
    console.log('');

    console.log('='.repeat(80));
    console.log('RESPONSE ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Available fields: ${Object.keys(chatData).join(', ')}\n`);

    // Check transcript field
    if (chatData.transcript) {
      console.log('✅ TRANSCRIPT FIELD FOUND');
      console.log(`   Type: ${typeof chatData.transcript}`);
      if (typeof chatData.transcript === 'string') {
        console.log(`   Length: ${chatData.transcript.length} characters`);
        console.log(`   Preview: ${chatData.transcript.substring(0, 200)}...`);
        console.log('\n' + '='.repeat(80));
        console.log('FULL TRANSCRIPT:');
        console.log('='.repeat(80));
        console.log(chatData.transcript);
      } else if (Array.isArray(chatData.transcript)) {
        console.log(`   Array length: ${chatData.transcript.length} messages`);
        console.log('\n' + '='.repeat(80));
        console.log('TRANSCRIPT MESSAGES:');
        console.log('='.repeat(80));
        chatData.transcript.forEach((msg: any, idx: number) => {
          console.log(`\nMessage ${idx + 1}:`);
          console.log(JSON.stringify(msg, null, 2));
        });
      }
    } else {
      console.log('❌ transcript field NOT found');
    }

    console.log('');

    // Check message_with_tool_calls field
    if (chatData.message_with_tool_calls) {
      console.log('✅ message_with_tool_calls FIELD FOUND');
      console.log(`   Type: ${typeof chatData.message_with_tool_calls}`);
      if (Array.isArray(chatData.message_with_tool_calls)) {
        console.log(`   Array length: ${chatData.message_with_tool_calls.length} messages`);
        console.log('\n' + '='.repeat(80));
        console.log('MESSAGES WITH TOOL CALLS:');
        console.log('='.repeat(80));
        chatData.message_with_tool_calls.forEach((msg: any, idx: number) => {
          console.log(`\nMessage ${idx + 1}:`);
          console.log(JSON.stringify(msg, null, 2));
        });
      }
    } else {
      console.log('❌ message_with_tool_calls field NOT found');
    }

    console.log('');

    // Check messages field
    if ((chatData as any).messages) {
      console.log('✅ messages FIELD FOUND');
      console.log(`   Type: ${typeof (chatData as any).messages}`);
      if (Array.isArray((chatData as any).messages)) {
        console.log(`   Array length: ${(chatData as any).messages.length} messages`);
      }
    } else {
      console.log('❌ messages field NOT found');
    }

    console.log('');

    // Check chat_analysis field
    if (chatData.chat_analysis) {
      console.log('✅ chat_analysis FIELD FOUND');
      console.log('\n' + '='.repeat(80));
      console.log('CHAT ANALYSIS:');
      console.log('='.repeat(80));
      console.log(JSON.stringify(chatData.chat_analysis, null, 2));
    } else {
      console.log('❌ chat_analysis field NOT found');
    }

    console.log('');

    // Summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Chat ID: ${chatData.chat_id || chatId}`);
    console.log(`Agent ID: ${chatData.agent_id || 'N/A'}`);
    console.log(`Status: ${chatData.chat_status || 'N/A'}`);
    console.log(`Start: ${chatData.start_timestamp ? new Date(chatData.start_timestamp).toISOString() : 'N/A'}`);
    console.log(`End: ${chatData.end_timestamp ? new Date(chatData.end_timestamp).toISOString() : 'N/A'}`);
    console.log(`Cost: ${chatData.chat_cost ? JSON.stringify(chatData.chat_cost) : 'N/A'}`);
    console.log(`Has transcript: ${!!chatData.transcript}`);
    console.log(`Has message_with_tool_calls: ${!!chatData.message_with_tool_calls}`);
    console.log(`Has messages: ${!!(chatData as any).messages}`);
    console.log(`Has chat_analysis: ${!!chatData.chat_analysis}`);

  } catch (error: any) {
    console.error('❌ Error fetching from Retell API:');
    console.error(`   Message: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

// Main execution
const chatId = process.argv[2] || 'd72fa940-c333-4976-899e-bb325381094f';
pullChatTranscript(chatId)
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

