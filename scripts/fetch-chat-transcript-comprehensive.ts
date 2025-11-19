/**
 * Comprehensive script to fetch chat transcript from Retell API
 * Handles both chat_id and retell_conversation_id lookups
 * Usage: npx tsx scripts/fetch-chat-transcript-comprehensive.ts <chat_id>
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Retell } from 'retell-sdk';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
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

async function findInteractionByChatId(chatId: string) {
  console.log(`\n🔍 Searching for interaction with chat ID: ${chatId}\n`);
  
  // Try multiple fields
  const queries = [
    { field: 'retell_conversation_id', value: chatId },
    { field: 'retell_call_id', value: chatId },
    { field: 'id', value: chatId },
  ];

  for (const query of queries) {
    const { data, error } = await supabase
      .from('interactions')
      .select('*')
      .eq(query.field, query.value)
      .limit(5);

    if (!error && data && data.length > 0) {
      console.log(`✅ Found ${data.length} interaction(s) matching ${query.field} = ${query.value}`);
      return data;
    }
  }

  // Try partial match on retell_conversation_id
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .ilike('retell_conversation_id', `%${chatId}%`)
    .limit(10);

  if (!error && data && data.length > 0) {
    console.log(`✅ Found ${data.length} interaction(s) with partial match`);
    return data;
  }

  console.log('❌ No interactions found in database');
  return null;
}

async function fetchChatFromRetell(chatId: string, retellApiKey: string, outputFile?: string) {
  console.log('\n' + '='.repeat(80));
  console.log('FETCHING FROM RETELL API');
  console.log('='.repeat(80));
  console.log(`Chat ID: ${chatId}\n`);

  const retellClient = new Retell({
    apiKey: retellApiKey,
  });

  let transcriptData: any = null;
  let methodUsed = '';

  // Method 1: Try chat.retrieve()
  console.log('Method 1: chat.retrieve()');
  console.log('-'.repeat(80));
  try {
    const chatData: any = await retellClient.chat.retrieve(chatId);
    console.log('✅ chat.retrieve() succeeded');
    console.log(`Available fields: ${Object.keys(chatData).join(', ')}`);
    
    if (chatData.transcript || chatData.message_with_tool_calls || (chatData as any).messages) {
      transcriptData = chatData;
      methodUsed = 'chat.retrieve()';
      console.log('✅ Transcript data found via chat.retrieve()\n');
    } else {
      console.log('⚠️  No transcript in chat.retrieve() response, trying chat.list()\n');
    }
  } catch (error: any) {
    console.log(`❌ chat.retrieve() failed: ${error.message}\n`);
  }

  // Method 2: Try chat.list() and filter
  if (!transcriptData) {
    console.log('Method 2: chat.list()');
    console.log('-'.repeat(80));
    try {
      const chatListResponse: any = await retellClient.chat.list();
      const chats = Array.isArray(chatListResponse) ? chatListResponse : (chatListResponse.chats || []);
      
      console.log(`✅ Retrieved ${chats.length} chats from list`);
      
      // Try exact match
      let targetChat = chats.find((chat: any) => chat.chat_id === chatId);
      
      // Try partial match
      if (!targetChat) {
        targetChat = chats.find((chat: any) => 
          chat.chat_id?.includes(chatId) || chatId.includes(chat.chat_id)
        );
      }
      
      if (targetChat) {
        transcriptData = targetChat;
        methodUsed = 'chat.list()';
        console.log(`✅ Found chat in list (chat_id: ${targetChat.chat_id})\n`);
      } else {
        console.log(`❌ Chat not found in list`);
        console.log(`Sample chat IDs: ${chats.slice(0, 5).map((c: any) => c.chat_id).join(', ')}\n`);
      }
    } catch (error: any) {
      console.log(`❌ chat.list() failed: ${error.message}\n`);
    }
  }

  // Method 3: Try call.retrieve() if chat ID might be a call ID
  if (!transcriptData) {
    console.log('Method 3: call.retrieve() (in case chat_id is actually a call_id)');
    console.log('-'.repeat(80));
    try {
      const callData: any = await retellClient.call.retrieve(chatId);
      console.log('✅ call.retrieve() succeeded');
      console.log(`Call ID: ${callData.call_id}`);
      console.log(`Call type: ${callData.call_type}`);
      
      // Check if call has associated chat
      if (callData.chat_id) {
        console.log(`Associated chat_id: ${callData.chat_id}`);
        // Try to fetch the chat using the associated chat_id
        try {
          const associatedChat: any = await retellClient.chat.retrieve(callData.chat_id);
          if (associatedChat.transcript || associatedChat.message_with_tool_calls) {
            transcriptData = associatedChat;
            methodUsed = `call.retrieve() -> chat.retrieve(${callData.chat_id})`;
            console.log('✅ Found transcript via associated chat\n');
          }
        } catch (e) {
          console.log('❌ Could not fetch associated chat\n');
        }
      }
    } catch (error: any) {
      console.log(`❌ call.retrieve() failed: ${error.message}\n`);
    }
  }

  if (!transcriptData) {
    console.log('❌ Could not fetch transcript using any method');
    return null;
  }

  // Extract transcript
  console.log('='.repeat(80));
  console.log('TRANSCRIPT EXTRACTION');
  console.log('='.repeat(80));
  console.log(`Method used: ${methodUsed}\n`);

  let messages: any[] = [];
  let transcriptText = '';

  // Extract from message_with_tool_calls (structured)
  if (Array.isArray(transcriptData.message_with_tool_calls)) {
    messages = transcriptData.message_with_tool_calls;
    console.log(`✅ Extracted ${messages.length} messages from message_with_tool_calls`);
  }
  // Extract from transcript array
  else if (Array.isArray(transcriptData.transcript)) {
    messages = transcriptData.transcript;
    console.log(`✅ Extracted ${messages.length} messages from transcript array`);
  }
  // Extract from transcript string
  else if (typeof transcriptData.transcript === 'string') {
    transcriptText = transcriptData.transcript;
    console.log(`✅ Found transcript string (${transcriptText.length} chars)`);
    
    // Parse string into messages
    const lines = transcriptText.split('\n').filter((line: string) => line.trim());
    messages = lines.map((line: string, index: number) => {
      const match = line.match(/^(Agent|User|System):\s*(.+)$/);
      if (match) {
        return {
          role: match[1].toLowerCase() === 'agent' ? 'assistant' : match[1].toLowerCase(),
          content: match[2],
          timestamp: transcriptData.start_timestamp ? transcriptData.start_timestamp + (index * 1000) : undefined,
        };
      }
      return {
        role: 'system',
        content: line,
        timestamp: transcriptData.start_timestamp,
      };
    });
    console.log(`✅ Parsed into ${messages.length} messages`);
  }
  // Extract from messages field
  else if (Array.isArray((transcriptData as any).messages)) {
    messages = (transcriptData as any).messages;
    console.log(`✅ Extracted ${messages.length} messages from messages field`);
  }

  // Build markdown content
  const mdContent = `# Chat Transcript

**Chat ID:** ${transcriptData.chat_id || chatId}
**Method:** ${methodUsed}
**Status:** ${transcriptData.chat_status || 'N/A'}
**Start:** ${transcriptData.start_timestamp ? new Date(transcriptData.start_timestamp).toISOString() : 'N/A'}
**End:** ${transcriptData.end_timestamp ? new Date(transcriptData.end_timestamp).toISOString() : 'N/A'}
**Agent ID:** ${transcriptData.agent_id || 'N/A'}

## Chat Analysis

\`\`\`json
${JSON.stringify(transcriptData.chat_analysis || {}, null, 2)}
\`\`\`

## Messages

${messages.length > 0 ? messages.map((msg, idx) => {
  const role = msg.role || 'unknown';
  const content = msg.content || JSON.stringify(msg);
  const timestamp = msg.timestamp || msg.created_timestamp || msg.created_at;
  const timeStr = timestamp ? new Date(timestamp).toISOString() : '';
  
  return `### Message ${idx + 1} - ${role.toUpperCase()}${timeStr ? ` (${timeStr})` : ''}

${content}

---`;
}).join('\n\n') : '**No messages found**'}

## Raw Transcript String

${transcriptText || 'N/A'}

## Full Raw Data

\`\`\`json
${JSON.stringify(transcriptData, null, 2)}
\`\`\`
`;

  // Save to file
  if (outputFile) {
    const filePath = path.resolve(process.cwd(), outputFile);
    fs.writeFileSync(filePath, mdContent, 'utf-8');
    console.log(`\n✅ Transcript saved to: ${filePath}`);
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `chat-transcript-${chatId.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.md`;
    const filePath = path.resolve(process.cwd(), fileName);
    fs.writeFileSync(filePath, mdContent, 'utf-8');
    console.log(`\n✅ Transcript saved to: ${fileName}`);
  }

  // Also print summary to console
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Chat ID: ${transcriptData.chat_id || chatId}`);
  console.log(`Messages found: ${messages.length}`);
  console.log(`Has chat_analysis: ${!!transcriptData.chat_analysis}`);
  console.log(`Status: ${transcriptData.chat_status || 'N/A'}`);

  return { transcriptData, messages, transcriptText };
}

async function main() {
  const chatId = process.argv[2] || 'chat_b5c4e0ec5a3930223b824357450';
  
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE CHAT TRANSCRIPT FETCHER');
  console.log('='.repeat(80));
  console.log(`Target Chat ID: ${chatId}\n`);

  // Step 1: Find interaction in database
  const interactions = await findInteractionByChatId(chatId);
  
  let tenantId: string | null = null;
  let retellApiKey: string | null = null;

  if (interactions && interactions.length > 0) {
    const interaction = interactions[0];
    tenantId = interaction.tenant_id;
    console.log(`\n📊 Interaction Details:`);
    console.log(`   ID: ${interaction.id}`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Type: ${interaction.type}`);
    console.log(`   retell_conversation_id: ${interaction.retell_conversation_id || 'N/A'}`);
    console.log(`   retell_call_id: ${interaction.retell_call_id || 'N/A'}`);
    console.log(`   Status: ${interaction.status || 'N/A'}`);
    
    // Get Retell API key
    retellApiKey = await getResellerRetellConfig(tenantId);
    if (retellApiKey) {
      console.log(`✅ Retell API key found\n`);
    } else {
      console.log(`❌ Retell API key not found for tenant ${tenantId}\n`);
    }
  } else {
    console.log('\n⚠️  No interaction found in database, trying to fetch directly from Retell...\n');
    
    // Try to get API key from first reseller tenant
    const { data: resellerTenant } = await supabase
      .from('tenants')
      .select('id, retell_api_key')
      .eq('is_reseller', true)
      .limit(1)
      .single();
    
    if (resellerTenant?.retell_api_key) {
      retellApiKey = resellerTenant.retell_api_key;
      console.log(`✅ Using API key from reseller tenant: ${resellerTenant.id}\n`);
    }
  }

  if (!retellApiKey) {
    console.error('❌ Cannot proceed without Retell API key');
    process.exit(1);
  }

  // Step 2: Try multiple chat IDs
  const chatIdsToTry = [
    chatId,
    ...(interactions && interactions.length > 0 ? [
      interactions[0].retell_conversation_id,
      interactions[0].retell_call_id,
    ].filter(Boolean) : []),
  ].filter((id): id is string => !!id);

  console.log(`\n🔍 Trying ${chatIdsToTry.length} chat ID(s): ${chatIdsToTry.join(', ')}\n`);

  for (const idToTry of chatIdsToTry) {
    const result = await fetchChatFromRetell(idToTry, retellApiKey);
    if (result && result.messages.length > 0) {
      console.log(`\n✅ Successfully fetched transcript for: ${idToTry}`);
      break;
    }
  }
}

main()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

