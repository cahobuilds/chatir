import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';

// SSE endpoint for real-time chat updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get user's tenant IDs
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
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
      return new Response('Interaction not found', { status: 404 });
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Send initial connection message
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Send initial data
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
                sendEvent('status', { 
                  status: updatedInteraction.status,
                  ended_at: updatedInteraction.ended_at 
                });
                interaction.status = updatedInteraction.status;
              }

              // Check if transcript was updated
              if (JSON.stringify(updatedInteraction.transcript) !== JSON.stringify(interaction.transcript)) {
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

                    // Fetch latest chat data from Retell
                    const retellChat = await retellClient.chat.retrieve(chatIdToFetch);
                    
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
                      sendEvent('messages', {
                        messages: extractedMessages,
                        messageCount: extractedMessages.length
                      });
                    }

                    // Check if status changed
                    if (retellChat.chat_status && retellChat.chat_status !== interaction.status) {
                      sendEvent('status', {
                        status: retellChat.chat_status,
                        chat_status: retellChat.chat_status
                      });
                    }

                    // Check if cost updated
                    if (retellChat.chat_cost !== undefined && 
                        retellChat.chat_cost !== (interaction.metadata as any)?.chat_cost) {
                      sendEvent('cost', {
                        cost: retellChat.chat_cost
                      });
                    }

                    // Check if analysis is available
                    if (retellChat.chat_analysis && 
                        JSON.stringify(retellChat.chat_analysis) !== JSON.stringify((interaction.metadata as any)?.chat_analysis)) {
                      sendEvent('analysis', {
                        analysis: retellChat.chat_analysis
                      });
                    }
                  }
                } catch (retellError) {
                  // Silently fail - don't spam errors for every poll
                  console.error('[SSE] Error fetching Retell data:', retellError);
                }
              }
            }
          } catch (error) {
            console.error('[SSE] Error in poll:', error);
            sendEvent('error', { message: 'Error fetching updates' });
          }
        }, 2000); // Poll every 2 seconds

        // Cleanup on client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(pollInterval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error: any) {
    console.error('[SSE] Error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

