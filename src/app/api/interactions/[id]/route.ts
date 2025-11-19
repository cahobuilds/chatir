import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/interactions/[id] - Get interaction by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant IDs
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ error: 'No access' }, { status: 403 });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);

    // Get interaction
    const { data: interaction, error: interactionError } = await supabase
      .from('interactions')
      .select('*')
      .eq('id', id)
      .in('tenant_id', tenantIds)
      .single();

    // Debug: Log transcript data from database
    if (interaction && interaction.transcript) {
      console.log('[Interactions API] Database transcript type:', typeof interaction.transcript);
      console.log('[Interactions API] Database transcript is array:', Array.isArray(interaction.transcript));
      if (Array.isArray(interaction.transcript)) {
        console.log(`[Interactions API] Database transcript has ${interaction.transcript.length} items`);
      } else if (typeof interaction.transcript === 'object') {
        console.log('[Interactions API] Database transcript keys:', Object.keys(interaction.transcript));
      }
    }

    if (interactionError) {
      return NextResponse.json({ error: interactionError.message }, { status: 500 });
    }

    if (!interaction) {
      return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
    }

    // Fetch related agent and tenant data
    const agentIds = [interaction.agent_id];
    const tenantIdsToFetch = [interaction.tenant_id];

    let agentsMap: Record<string, { name: string; type: string }> = {};
    let tenantsMap: Record<string, { name: string }> = {};

    if (agentIds.length > 0) {
      const { data: agents } = await supabase
        .from('agents')
        .select('id, name, type')
        .in('id', agentIds);
      
      if (agents) {
        agents.forEach(agent => {
          agentsMap[agent.id] = { name: agent.name, type: agent.type };
        });
      }
    }

    if (tenantIdsToFetch.length > 0) {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name')
        .in('id', tenantIdsToFetch);
      
      if (tenants) {
        tenants.forEach(tenant => {
          tenantsMap[tenant.id] = { name: tenant.name };
        });
      }
    }

    // Fetch call details from Retell if retell_call_id exists
    let retellCallData: any = null;
    if (interaction.retell_call_id) {
      try {
        const { getResellerRetellConfig } = await import('@/lib/reseller');
        const { createRetellClient } = await import('@/lib/retell');
        
        const retellApiKey = await getResellerRetellConfig(interaction.tenant_id);
        if (retellApiKey) {
          const retellClient = createRetellClient(retellApiKey, {
            timeout: 20 * 1000,
            maxRetries: 2,
          });
          
          retellCallData = await retellClient.call.retrieve(interaction.retell_call_id);
        }
      } catch (error: any) {
        console.error('[Interactions API] Error fetching Retell call data:', error);
        // Don't fail the request if Retell fetch fails
      }
    }

    // Fetch chat conversation details from Retell if retell_conversation_id exists
    // According to Retell API docs: chat.list() includes transcript and chat_analysis fields
    // chat.retrieve() may not include transcript, so we use chat.list() and filter by chat_id
    let retellChatData: any = null;
    if (interaction.retell_conversation_id && interaction.type === 'chat') {
      try {
        const { getResellerRetellConfig } = await import('@/lib/reseller');
        const { createRetellClient } = await import('@/lib/retell');
        
        const retellApiKey = await getResellerRetellConfig(interaction.tenant_id);
        if (retellApiKey) {
          const retellClient = createRetellClient(retellApiKey, {
            timeout: 30 * 1000, // Increased timeout for list operation
            maxRetries: 2,
          });
          
          console.log(`[Interactions API] Fetching Retell chat data for chat_id: ${interaction.retell_conversation_id}`);
          
          // Try chat.retrieve() first (faster if it works)
          try {
            const retrievedChat: any = await retellClient.chat.retrieve(interaction.retell_conversation_id);
            
            // Check if retrieve() returned transcript/messages
            // Use type assertion since Retell SDK types may be incomplete
            const hasTranscript = retrievedChat?.transcript || 
                                 retrievedChat?.message_with_tool_calls || 
                                 (retrievedChat as any)?.messages;
            
            if (hasTranscript) {
              retellChatData = retrievedChat;
              console.log('[Interactions API] chat.retrieve() succeeded with transcript');
            } else {
              console.log('[Interactions API] chat.retrieve() succeeded but no transcript, trying chat.list()');
              // Fall through to chat.list() approach
              throw new Error('No transcript in retrieve response');
            }
          } catch (retrieveError: any) {
            console.log('[Interactions API] Using chat.list() to get transcript and analysis');
            
            // Use chat.list() which includes transcript and chat_analysis fields (per Retell API docs)
            const chatListResponse = await retellClient.chat.list();
            const chats = Array.isArray(chatListResponse) ? chatListResponse : (chatListResponse as any).chats || [];
            
            // Find the specific chat by chat_id
            retellChatData = chats.find((chat: any) => chat.chat_id === interaction.retell_conversation_id);
            
            if (retellChatData) {
              console.log(`[Interactions API] Found chat in list`);
              console.log(`  - Has transcript: ${!!retellChatData.transcript}`);
              console.log(`  - Has message_with_tool_calls: ${!!retellChatData.message_with_tool_calls}`);
              console.log(`  - Has chat_analysis: ${!!retellChatData.chat_analysis}`);
            } else {
              console.log('[Interactions API] Chat not found in list, chat may not be ended yet or not synced');
            }
          }
          
          // Log the full response structure for debugging
          if (retellChatData) {
            console.log('[Interactions API] Retell chat response:');
            console.log('Available fields:', Object.keys(retellChatData || {}));
            console.log('message_with_tool_calls:', retellChatData?.message_with_tool_calls ? 
              (Array.isArray(retellChatData.message_with_tool_calls) ? 
                `Array[${retellChatData.message_with_tool_calls.length}]` : 
                typeof retellChatData.message_with_tool_calls) : 'NOT PRESENT');
            console.log('transcript:', retellChatData?.transcript ? 
              (Array.isArray(retellChatData.transcript) ? 
                `Array[${retellChatData.transcript.length}]` : 
                typeof retellChatData.transcript) : 'NOT PRESENT');
            console.log('chat_analysis:', retellChatData?.chat_analysis ? 'PRESENT' : 'NOT PRESENT');
          }
        }
      } catch (error: any) {
        console.error('[Interactions API] Error fetching Retell chat data:', error);
        console.error('[Interactions API] Error details:', error?.response?.data || error?.message);
        // Don't fail the request if Retell fetch fails
      }
    }

    // Extract messages from Retell chat data
    // According to Retell API docs: 
    // - chat.retrieve() returns transcript as a STRING (full conversation text)
    // - chat.list() includes 'transcript' field (can be string or array) and 'message_with_tool_calls' (array)
    // Priority: message_with_tool_calls (structured) > transcript array > transcript string > messages
    let extractedMessages: any[] = [];
    if (retellChatData) {
      // Priority 1: message_with_tool_calls (structured array with role, content, timestamps)
      if (Array.isArray(retellChatData.message_with_tool_calls)) {
        extractedMessages = retellChatData.message_with_tool_calls;
        console.log(`[Interactions API] Using message_with_tool_calls field: ${extractedMessages.length} messages`);
      } 
      // Priority 2: transcript as array (from chat.list())
      else if (Array.isArray(retellChatData.transcript)) {
        extractedMessages = retellChatData.transcript;
        console.log(`[Interactions API] Using transcript array field: ${extractedMessages.length} messages`);
      } 
      // Priority 3: transcript as string (from chat.retrieve()) - parse into messages
      else if (typeof retellChatData.transcript === 'string' && retellChatData.transcript.trim()) {
        // Parse string transcript into message objects
        // Format: "Agent: message\nUser: message\n..."
        const transcriptLines = retellChatData.transcript.split('\n').filter(line => line.trim());
        extractedMessages = transcriptLines.map((line: string, index: number) => {
          const match = line.match(/^(Agent|User|System):\s*(.+)$/);
          if (match) {
            return {
              role: match[1].toLowerCase() === 'agent' ? 'assistant' : match[1].toLowerCase(),
              content: match[2],
              timestamp: retellChatData.start_timestamp ? retellChatData.start_timestamp + (index * 1000) : undefined,
            };
          }
          return {
            role: 'system',
            content: line,
            timestamp: retellChatData.start_timestamp,
          };
        });
        console.log(`[Interactions API] Parsed transcript string into ${extractedMessages.length} messages`);
      }
      // Priority 4: messages field (fallback)
      else if (Array.isArray(retellChatData.messages)) {
        extractedMessages = retellChatData.messages;
        console.log(`[Interactions API] Using messages field: ${extractedMessages.length} messages`);
      } 
      // Priority 5: transcript_object (alternative format)
      else if (Array.isArray(retellChatData.transcript_object)) {
        extractedMessages = retellChatData.transcript_object;
        console.log(`[Interactions API] Using transcript_object field: ${extractedMessages.length} messages`);
      } 
      // Priority 6: message_with_tool_calls as object (convert to array)
      else if (retellChatData.message_with_tool_calls && typeof retellChatData.message_with_tool_calls === 'object' && !Array.isArray(retellChatData.message_with_tool_calls)) {
        extractedMessages = Object.values(retellChatData.message_with_tool_calls);
        console.log(`[Interactions API] Converted message_with_tool_calls object to array: ${extractedMessages.length} messages`);
      } 
      else {
        console.log('[Interactions API] No messages found in Retell response');
        console.log('[Interactions API] Available fields:', Object.keys(retellChatData));
        console.log('[Interactions API] transcript type:', typeof retellChatData.transcript);
        console.log('[Interactions API] transcript value:', retellChatData.transcript ? String(retellChatData.transcript).substring(0, 200) : 'null/undefined');
      }
    }
    
    // Fallback to database transcript if Retell API doesn't return messages
    if (extractedMessages.length === 0 && interaction.transcript) {
      console.log('[Interactions API] No messages from Retell API, using database transcript');
      if (Array.isArray(interaction.transcript)) {
        extractedMessages = interaction.transcript;
      } else if (typeof interaction.transcript === 'object') {
        extractedMessages = Object.values(interaction.transcript);
      }
    }

    // Build retell_chat_data object
    let retellChatDataObj: any = null;
    if (retellChatData) {
      retellChatDataObj = {
        chat_id: retellChatData.chat_id || interaction.retell_conversation_id,
        messages: extractedMessages,
        start_timestamp: retellChatData.start_timestamp,
        end_timestamp: retellChatData.end_timestamp,
        chat_status: retellChatData.chat_status,
        chat_analysis: retellChatData.chat_analysis,
        chat_cost: retellChatData.chat_cost,
        collected_dynamic_variables: retellChatData.collected_dynamic_variables,
        metadata: retellChatData.metadata,
        agent_id: retellChatData.agent_id,
        // Include raw data for debugging
        _raw_retell_data: process.env.NODE_ENV === 'development' ? retellChatData : undefined,
      };
    } else if (interaction.transcript) {
      // If Retell API call failed but we have transcript in DB, still return it
      retellChatDataObj = {
        chat_id: interaction.retell_conversation_id,
        messages: Array.isArray(interaction.transcript) ? interaction.transcript : 
                 typeof interaction.transcript === 'object' ? Object.values(interaction.transcript) : [],
        chat_status: interaction.metadata?.chat_status,
        chat_analysis: interaction.metadata?.chat_analysis,
        chat_cost: interaction.metadata?.chat_cost,
      };
    }

    // Enrich interaction with agent and tenant data
    const enrichedInteraction = {
      ...interaction,
      agents: agentsMap[interaction.agent_id] || null,
      tenants: tenantsMap[interaction.tenant_id] || null,
      // Add Retell call data (transcript, recording URLs, etc.)
      retell_call_data: retellCallData ? {
        transcript: retellCallData.transcript,
        transcript_object: retellCallData.transcript_object,
        transcript_with_tool_calls: retellCallData.transcript_with_tool_calls,
        recording_url: retellCallData.recording_url,
        recording_multi_channel_url: retellCallData.recording_multi_channel_url,
        scrubbed_recording_url: retellCallData.scrubbed_recording_url,
        call_analysis: retellCallData.call_analysis,
      } : null,
      // Add Retell chat data (messages, metadata, etc.)
      retell_chat_data: retellChatDataObj,
    };

    return NextResponse.json({ interaction: enrichedInteraction });
  } catch (error: any) {
    console.error('[Interactions API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

