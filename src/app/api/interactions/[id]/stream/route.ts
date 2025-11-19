import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { logger } from '@/lib/logger';

// Helper function to enrich interaction with related data (shared with regular API)
async function enrichInteraction(supabase: any, interaction: any) {
  logger.info('Enriching interaction', { interactionId: interaction.id, type: interaction.type });

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
        agents.forEach((agent: { id: string; name: string; type: string }) => {
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
        tenants.forEach((tenant: { id: string; name: string }) => {
          tenantsMap[tenant.id] = { name: tenant.name };
        });
      }
    }

  // Fetch chat conversation details from Retell if retell_conversation_id exists
  let retellChatData: any = null;
  const chatIdToFetch = interaction.retell_conversation_id || 
                        (interaction.metadata as any)?.retell_chat_id ||
                        (interaction.metadata as any)?.chat_id;
  
  if (chatIdToFetch && interaction.type === 'chat') {
    try {
      logger.info('Fetching Retell chat data', { chatId: chatIdToFetch, interactionId: interaction.id });
      const retellApiKey = await getResellerRetellConfig(interaction.tenant_id);
      if (retellApiKey) {
        const retellClient = createRetellClient(retellApiKey, {
          timeout: 30 * 1000,
          maxRetries: 2,
        });
        
        // Try chat.retrieve() first (faster if it works)
        try {
          const retrievedChat: any = await retellClient.chat.retrieve(chatIdToFetch);
          
          const hasTranscript = retrievedChat?.transcript || 
                               retrievedChat?.message_with_tool_calls || 
                               (retrievedChat as any)?.messages;
          
          if (hasTranscript) {
            retellChatData = retrievedChat;
            logger.info('Retrieved chat data from Retell', { chatId: chatIdToFetch, hasTranscript: true });
          } else {
            logger.warn('Retrieved chat but no transcript, trying chat.list()', { chatId: chatIdToFetch });
            throw new Error('No transcript in retrieve response');
          }
        } catch (retrieveError: any) {
          logger.info('Using chat.list() to get transcript', { chatId: chatIdToFetch });
          
          const chatListResponse = await retellClient.chat.list();
          const chats = Array.isArray(chatListResponse) ? chatListResponse : (chatListResponse as any).chats || [];
          
          retellChatData = chats.find((chat: any) => chat.chat_id === chatIdToFetch);
          
          if (!retellChatData) {
            retellChatData = chats.find((chat: any) => 
              chat.chat_id?.includes(chatIdToFetch) || 
              chatIdToFetch.includes(chat.chat_id)
            );
          }
          
          if (retellChatData) {
            logger.info('Found chat in list', { 
              chatId: chatIdToFetch,
              hasTranscript: !!retellChatData.transcript,
              hasMessages: !!retellChatData.message_with_tool_calls,
              hasAnalysis: !!retellChatData.chat_analysis
            });
          } else {
            logger.warn('Chat not found in list', { chatId: chatIdToFetch });
          }
        }
      }
    } catch (error: any) {
      logger.error('Error fetching Retell chat data', error, { chatId: chatIdToFetch, interactionId: interaction.id });
    }
  }

  // Extract messages from Retell chat data
  let extractedMessages: any[] = [];
  if (retellChatData) {
    if (Array.isArray(retellChatData.message_with_tool_calls)) {
      extractedMessages = retellChatData.message_with_tool_calls;
    } else if (Array.isArray(retellChatData.transcript)) {
      extractedMessages = retellChatData.transcript;
    } else if (typeof retellChatData.transcript === 'string' && retellChatData.transcript.trim()) {
      const transcriptLines = retellChatData.transcript.split('\n').filter((line: string) => line.trim());
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
    } else if (Array.isArray(retellChatData.messages)) {
      extractedMessages = retellChatData.messages;
    } else if (Array.isArray(retellChatData.transcript_object)) {
      extractedMessages = retellChatData.transcript_object;
    } else if (retellChatData.message_with_tool_calls && typeof retellChatData.message_with_tool_calls === 'object' && !Array.isArray(retellChatData.message_with_tool_calls)) {
      extractedMessages = Object.values(retellChatData.message_with_tool_calls);
    }
  }
  
  // Fallback to database transcript if Retell API doesn't return messages
  if (extractedMessages.length === 0 && interaction.transcript) {
    logger.info('Using database transcript as fallback', { interactionId: interaction.id });
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
    };
  } else if (interaction.transcript) {
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
  return {
    ...interaction,
    agents: agentsMap[interaction.agent_id] || null,
    tenants: tenantsMap[interaction.tenant_id] || null,
    retell_chat_data: retellChatDataObj,
  };
}

// SSE endpoint for real-time chat updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const { id } = await params;
    logger.info('SSE connection initiated', { interactionId: id });
    
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.warn('SSE unauthorized', { interactionId: id, error: authError?.message });
      return new Response('Unauthorized', { status: 401 });
    }

    // Get user's tenant IDs
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      logger.warn('SSE no access', { interactionId: id, userId: user.id });
      return new Response('No access', { status: 403 });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);

    // Get interaction to verify access
    const { data: interaction, error: interactionError } = await supabase
      .from('interactions')
      .select('*')
      .eq('id', id)
      .in('tenant_id', tenantIds)
      .single();

    if (interactionError || !interaction) {
      logger.error('SSE interaction not found', interactionError, { interactionId: id });
      return new Response('Interaction not found', { status: 404 });
    }

    logger.info('SSE interaction found', { 
      interactionId: id, 
      type: interaction.type, 
      status: interaction.status 
    });

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
          logger.sse(event, id, { dataKeys: Object.keys(data) });
        };

        try {
          // Fetch and send initial enriched interaction data
          logger.info('Fetching initial interaction data', { interactionId: id });
          const enrichedInteraction = await enrichInteraction(supabase, interaction);
          sendEvent('initial', { interaction: enrichedInteraction });
          logger.info('Initial interaction data sent', { 
            interactionId: id,
            hasMessages: !!(enrichedInteraction.retell_chat_data?.messages?.length),
            messageCount: enrichedInteraction.retell_chat_data?.messages?.length || 0
          });
        } catch (error: any) {
          logger.error('Error fetching initial interaction data', error, { interactionId: id });
          sendEvent('error', { message: 'Error loading initial data', error: error.message });
        }

        // Send connection confirmation
        sendEvent('connected', { interactionId: id });

        // Poll for updates every 2 seconds
        const pollInterval = setInterval(async () => {
          try {
            // Check for database updates
            const { data: updatedInteraction } = await supabase
              .from('interactions')
              .select('*')
              .eq('id', id)
              .single();

            if (updatedInteraction) {
              // Check if status changed
              if (updatedInteraction.status !== interaction.status) {
                logger.info('Status changed', { 
                  interactionId: id,
                  oldStatus: interaction.status,
                  newStatus: updatedInteraction.status
                });
                sendEvent('status', { 
                  status: updatedInteraction.status,
                  ended_at: updatedInteraction.ended_at 
                });
                interaction.status = updatedInteraction.status;
              }

              // Check if transcript was updated
              if (JSON.stringify(updatedInteraction.transcript) !== JSON.stringify(interaction.transcript)) {
                logger.info('Transcript updated', { interactionId: id });
                sendEvent('transcript', { 
                  transcript: updatedInteraction.transcript 
                });
                interaction.transcript = updatedInteraction.transcript;
              }
            }

            // For chat interactions, also poll Retell API for real-time updates
            if (interaction.type === 'chat') {
              const chatIdToFetch = interaction.retell_conversation_id || 
                                    (interaction.metadata as any)?.retell_chat_id ||
                                    (interaction.metadata as any)?.chat_id;
              
              if (chatIdToFetch) {
                try {
                  const retellApiKey = await getResellerRetellConfig(interaction.tenant_id);
                  if (retellApiKey) {
                    const retellClient = createRetellClient(retellApiKey, {
                      timeout: 10 * 1000,
                      maxRetries: 1,
                    });

                    const retellChat: any = await retellClient.chat.retrieve(chatIdToFetch);
                    
                    // Extract messages
                    let extractedMessages: any[] = [];
                    if (Array.isArray(retellChat.message_with_tool_calls)) {
                      extractedMessages = retellChat.message_with_tool_calls;
                    } else if (Array.isArray(retellChat.transcript)) {
                      extractedMessages = retellChat.transcript;
                    } else if (Array.isArray(retellChat.messages)) {
                      extractedMessages = retellChat.messages;
                    }

                    // Check if new messages arrived
                    const currentMessageCount = Array.isArray(interaction.transcript) 
                      ? interaction.transcript.length 
                      : 0;
                    
                    if (extractedMessages.length > currentMessageCount) {
                      logger.info('New messages detected', { 
                        interactionId: id,
                        oldCount: currentMessageCount,
                        newCount: extractedMessages.length
                      });
                      sendEvent('messages', {
                        messages: extractedMessages,
                        messageCount: extractedMessages.length
                      });
                    }

                    // Check if status changed
                    if (retellChat.chat_status && retellChat.chat_status !== interaction.status) {
                      logger.info('Chat status changed from Retell', { 
                        interactionId: id,
                        oldStatus: interaction.status,
                        newStatus: retellChat.chat_status
                      });
                      sendEvent('status', {
                        status: retellChat.chat_status,
                        chat_status: retellChat.chat_status
                      });
                    }

                    // Check if cost updated
                    if (retellChat.chat_cost !== undefined && 
                        retellChat.chat_cost !== (interaction.metadata as any)?.chat_cost) {
                      logger.info('Chat cost updated', { 
                        interactionId: id,
                        cost: retellChat.chat_cost
                      });
                      sendEvent('cost', {
                        cost: retellChat.chat_cost
                      });
                    }

                    // Check if analysis is available
                    if (retellChat.chat_analysis && 
                        JSON.stringify(retellChat.chat_analysis) !== JSON.stringify((interaction.metadata as any)?.chat_analysis)) {
                      logger.info('Chat analysis updated', { interactionId: id });
                      sendEvent('analysis', {
                        analysis: retellChat.chat_analysis
                      });
                    }
                  }
                } catch (retellError) {
                  // Only log errors occasionally to avoid spam
                  if (Math.random() < 0.1) { // Log 10% of errors
                    logger.error('Error fetching Retell data in poll', retellError, { interactionId: id });
                  }
                }
              }
            }
          } catch (error) {
            logger.error('Error in SSE poll', error, { interactionId: id });
            sendEvent('error', { message: 'Error fetching updates' });
          }
        }, 2000); // Poll every 2 seconds

        // Cleanup on client disconnect
        request.signal.addEventListener('abort', () => {
          logger.info('SSE connection closed', { interactionId: id });
          clearInterval(pollInterval);
          controller.close();
        });
      },
    });

    const duration = Date.now() - startTime;
    logger.api('GET', `/api/interactions/${id}/stream`, 200, duration, { interactionId: id });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('SSE endpoint error', error, { interactionId: (await params).id });
    logger.api('GET', `/api/interactions/${(await params).id}/stream`, 500, duration);
    return new Response('Internal server error', { status: 500 });
  }
}
