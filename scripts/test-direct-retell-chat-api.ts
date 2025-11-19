/**
 * Direct API call to Retell to fetch chat transcript
 * Usage: npx tsx scripts/test-direct-retell-chat-api.ts <chat_id>
 * 
 * This script makes a direct HTTP call to Retell's API to see the exact response structure
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const RETELL_API_KEY = process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY;

async function fetchChatDirectly(chatId: string) {
  if (!RETELL_API_KEY) {
    console.error('❌ RETELL_API_KEY not found in environment variables');
    console.log('Please set RETELL_API_KEY in .env.local');
    process.exit(1);
  }

  const retellApiUrl = 'https://api.retellai.com';
  const chatIdToTest = chatId || 'd72fa940-c333-4976-899e-bb325381094f';

  console.log('='.repeat(80));
  console.log('Testing Direct Retell API Call');
  console.log('='.repeat(80));
  console.log(`Chat ID: ${chatIdToTest}`);
  console.log(`API URL: ${retellApiUrl}`);
  console.log('');

  try {
    // Method 1: Try chat.retrieve endpoint
    console.log('Method 1: GET /chat/{chat_id} (chat.retrieve)');
    console.log('-'.repeat(80));
    try {
      const retrieveResponse = await fetch(`${retellApiUrl}/get-chat/${chatIdToTest}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!retrieveResponse.ok) {
        const errorText = await retrieveResponse.text();
        console.log(`❌ Status: ${retrieveResponse.status} ${retrieveResponse.statusText}`);
        console.log(`Error: ${errorText}`);
      } else {
        const retrieveData = await retrieveResponse.json();
        console.log('✅ Success!');
        console.log('Response structure:');
        console.log(JSON.stringify(retrieveData, null, 2));
        console.log('');
        console.log('Available fields:', Object.keys(retrieveData));
        console.log('Has transcript:', !!retrieveData.transcript);
        console.log('Has message_with_tool_calls:', !!retrieveData.message_with_tool_calls);
        console.log('Has messages:', !!(retrieveData as any).messages);
        console.log('Has chat_analysis:', !!retrieveData.chat_analysis);
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('Method 2: GET /list-chat (chat.list)');
    console.log('-'.repeat(80));

    // Method 2: Try chat.list endpoint and filter
    try {
      const listResponse = await fetch(`${retellApiUrl}/list-chat`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        console.log(`❌ Status: ${listResponse.status} ${listResponse.statusText}`);
        console.log(`Error: ${errorText}`);
      } else {
        const listData = await listResponse.json();
        const chats = Array.isArray(listData) ? listData : (listData as any).chats || [];
        
        console.log(`✅ Success! Found ${chats.length} chats`);
        
        // Find the specific chat
        const targetChat = chats.find((chat: any) => chat.chat_id === chatIdToTest);
        
        if (targetChat) {
          console.log('');
          console.log('✅ Found target chat!');
          console.log('Chat structure:');
          console.log(JSON.stringify(targetChat, null, 2));
          console.log('');
          console.log('Available fields:', Object.keys(targetChat));
          console.log('Has transcript:', !!targetChat.transcript);
          console.log('Has message_with_tool_calls:', !!targetChat.message_with_tool_calls);
          console.log('Has messages:', !!(targetChat as any).messages);
          console.log('Has chat_analysis:', !!targetChat.chat_analysis);
          
          if (targetChat.transcript) {
            console.log('');
            console.log('Transcript type:', typeof targetChat.transcript);
            console.log('Transcript is array:', Array.isArray(targetChat.transcript));
            if (Array.isArray(targetChat.transcript)) {
              console.log(`Transcript has ${targetChat.transcript.length} messages`);
              console.log('First message:', JSON.stringify(targetChat.transcript[0], null, 2));
            }
          }
          
          if (targetChat.message_with_tool_calls) {
            console.log('');
            console.log('message_with_tool_calls type:', typeof targetChat.message_with_tool_calls);
            console.log('message_with_tool_calls is array:', Array.isArray(targetChat.message_with_tool_calls));
            if (Array.isArray(targetChat.message_with_tool_calls)) {
              console.log(`message_with_tool_calls has ${targetChat.message_with_tool_calls.length} messages`);
              console.log('First message:', JSON.stringify(targetChat.message_with_tool_calls[0], null, 2));
            }
          }
        } else {
          console.log(`❌ Chat ${chatIdToTest} not found in list`);
          console.log('Available chat IDs:', chats.slice(0, 5).map((c: any) => c.chat_id));
        }
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }

  } catch (error: any) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Main execution
const chatId = process.argv[2];
fetchChatDirectly(chatId)
  .then(() => {
    console.log('');
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

