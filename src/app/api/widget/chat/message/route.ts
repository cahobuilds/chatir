import { createAdminClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { rateLimit } from '@/lib/rate-limit';
import { decrypt, isEncrypted } from '@/lib/encryption';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/widget/chat/message - Public endpoint for chat widget messages
// No authentication required - uses agent_id for authorization

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Best-effort per-IP rate limit (opt-in via WIDGET_RATE_LIMIT_ENABLED=true).
    if (process.env.WIDGET_RATE_LIMIT_ENABLED === 'true') {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';
      const { allowed } = rateLimit(
        `widget:${ip}`,
        Number(process.env.WIDGET_RATE_LIMIT_PER_MINUTE || 30)
      );
      if (!allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    }

    const body = await request.json();
    const { agent_id, message, conversation_id, metadata } = body;

    if (!agent_id || !message) {
      return NextResponse.json(
        { error: 'agent_id and message are required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Get agent and verify it's active and a chat agent
    const { data: agent, error: agentError } = await adminSupabase
      .from('agents')
      .select('id, tenant_id, name, type, is_active, retell_agent_id, configuration')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.type !== 'chat') {
      return NextResponse.json({ error: 'Agent must be a chat agent' }, { status: 400 });
    }

    if (!agent.is_active) {
      return NextResponse.json({ error: 'Agent is not active' }, { status: 400 });
    }

    // Get or create interaction
    let interactionId = conversation_id;
    if (!interactionId) {
      // Create new interaction
      const { data: newInteraction, error: interactionError } = await adminSupabase
        .from('interactions')
        .insert({
          tenant_id: agent.tenant_id,
          agent_id: agent.id,
          type: 'chat',
          status: 'in_progress',
          metadata: metadata || {},
        })
        .select('id')
        .single();

      if (interactionError) {
        return NextResponse.json({ error: 'Failed to create interaction' }, { status: 500 });
      }

      interactionId = newInteraction.id;
    }

    // Get transcript from an existing conversation, but ONLY if it belongs to this agent.
    // Prevents a caller from reading/overwriting another agent's/tenant's transcripts by
    // supplying an arbitrary conversation_id (IDOR).
    let transcript: Array<{ role: string; content: string; timestamp: string }> = [];
    if (conversation_id) {
      const { data: existingInteraction, error: convError } = await adminSupabase
        .from('interactions')
        .select('agent_id, transcript')
        .eq('id', conversation_id)
        .maybeSingle();

      if (convError) {
        return NextResponse.json({ error: 'Invalid conversation' }, { status: 400 });
      }
      if (!existingInteraction || existingInteraction.agent_id !== agent.id) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      if (existingInteraction.transcript) {
        transcript = Array.isArray(existingInteraction.transcript)
          ? existingInteraction.transcript
          : [];
      }
    }

    // Add user message to transcript
    transcript.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // If agent has Retell integration, use Retell for response
    if (agent.retell_agent_id) {
      console.log('[Chat Widget] Agent has Retell integration, agent_id:', agent.retell_agent_id);
      try {
        // Each company has its own voice-provider workspace (per-tenant key).
        const { data: tenant, error: tenantError } = await adminSupabase
          .from('tenants')
          .select('retell_api_key')
          .eq('id', agent.tenant_id)
          .maybeSingle();
        const storedKey = tenant?.retell_api_key || null;
        const retellApiKey = storedKey ? (isEncrypted(storedKey) ? decrypt(storedKey) : storedKey) : null;

        console.log('[Chat Widget] Tenant has voice-provider key:', !!retellApiKey);

        if (!retellApiKey) {
          console.error('[Chat Widget] Voice-provider key not configured for tenant:', agent.tenant_id);
          return NextResponse.json({
            error: 'Voice provider is not configured for this agent. Please contact support.',
          }, { 
            status: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
          });
        } else {
          console.log('[Chat Widget] Retell API key found, proceeding with Retell chat');
          const retellClient = createRetellClient(retellApiKey, {
            timeout: 30 * 1000, // 30 seconds for chat operations
            maxRetries: 2,
          });
          
          // Get or create Retell chat session
          let retellChatId: string;
          
          // Check if we have an existing chat_id in interaction metadata
          const { data: existingInteraction } = await adminSupabase
            .from('interactions')
            .select('metadata')
            .eq('id', interactionId)
            .single();
          
          const interactionMetadata = existingInteraction?.metadata || {};
          retellChatId = (interactionMetadata as any)?.retell_chat_id;
          
          if (!retellChatId) {
            console.log('[Chat Widget] Creating new Retell chat session for agent:', agent.retell_agent_id);
            // Create new chat session in Retell
            const chatSession = await retellClient.chat.create({
              agent_id: agent.retell_agent_id,
              metadata: {
                interaction_id: interactionId,
                tenant_id: agent.tenant_id,
                agent_id: agent.id,
              },
            });
            
            retellChatId = chatSession.chat_id;
            console.log('[Chat Widget] Retell chat session created:', retellChatId);
            
            // Store chat_id in interaction metadata
            await adminSupabase
              .from('interactions')
              .update({
                metadata: {
                  ...interactionMetadata,
                  retell_chat_id: retellChatId,
                },
              })
              .eq('id', interactionId);
          } else {
            console.log('[Chat Widget] Reusing existing Retell chat session:', retellChatId);
          }
          
          // Create chat completion with user message
          console.log('[Chat Widget] Sending message to Retell chat:', retellChatId);
          const completion = await retellClient.chat.createChatCompletion({
            chat_id: retellChatId,
            content: message,
          });
          
          // Extract agent response from completion messages
          // The response will be in messages array with role 'agent'
          // Filter for messages that have 'content' property (Message type, not ToolCallInvocationMessage, etc.)
          const agentMessages = completion.messages.filter(
            (msg: any) => msg.role === 'agent' && 'content' in msg && typeof msg.content === 'string'
          );
          
          if (agentMessages.length === 0) {
            console.error('[Chat Widget] No agent messages in completion:', completion);
            throw new Error('No agent response received from Retell');
          }
          
          // Get the latest agent message (should be the response to our user message)
          const latestAgentMessage = agentMessages[agentMessages.length - 1] as { content: string; role: 'agent' };
          const agentResponse = latestAgentMessage.content || 'I apologize, but I couldn\'t generate a response.';
          
          console.log('[Chat Widget] Received agent response:', agentResponse.substring(0, 100) + '...');
          
          // Add agent response to transcript
          transcript.push({
            role: 'assistant',
            content: agentResponse,
            timestamp: new Date().toISOString(),
          });

          // Update interaction with transcript
          await adminSupabase
            .from('interactions')
            .update({
              transcript,
              updated_at: new Date().toISOString(),
            })
            .eq('id', interactionId);

          return NextResponse.json({
            conversation_id: interactionId,
            response: agentResponse,
            agent_name: agent.name,
          }, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
          });
        }
      } catch (retellError: any) {
        console.error('[Chat Widget] Retell chat error:', retellError);
        console.error('[Chat Widget] Retell error details:', {
          message: retellError?.message,
          stack: retellError?.stack,
          response: retellError?.response ? {
            status: retellError.response.status,
            statusText: retellError.response.statusText,
            data: retellError.response.data,
          } : null,
          agent_id: agent.retell_agent_id,
          tenant_id: agent.tenant_id,
        });
        
        // Log detailed error for debugging
        if (retellError.response) {
          // Provide user-friendly error messages
          const statusCode = retellError.response.status;
          const errorData = retellError.response.data || {};
          const errorMessage = errorData.message || retellError.message || 'Failed to get a response';
          
          // If agent not published or invalid, return helpful error
          if (statusCode === 422 || errorMessage.includes('Cannot start a chat session')) {
            return NextResponse.json({
              error: 'Agent is not published or not available. Please ensure the agent is published.',
              details: errorMessage,
            }, { 
              status: 422,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
              },
            });
          }
          
          // For other errors, return generic error but log details
          return NextResponse.json({
            error: 'Failed to get a response. Please try again.',
            details: errorMessage,
          }, { 
            status: statusCode >= 400 && statusCode < 500 ? statusCode : 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
          });
        }
        
        // If no response object, log and return error (don't fall through silently)
        console.error('[Chat Widget] Retell error without response object, returning error to user');
        return NextResponse.json({
          error: 'Failed to connect to the voice provider. Please try again.',
          details: retellError?.message || 'Unknown error',
        }, { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }
    }

    // Fallback: Simple response without Retell
    console.warn('[Chat Widget] Agent does not have Retell integration, using fallback response. Agent ID:', agent.id, 'Retell Agent ID:', agent.retell_agent_id);
    const agentResponse = `Thank you for your message: "${message}". I'm here to help!`;
    
    transcript.push({
      role: 'assistant',
      content: agentResponse,
      timestamp: new Date().toISOString(),
    });

    // Update interaction with transcript
    await adminSupabase
      .from('interactions')
      .update({
        transcript,
        updated_at: new Date().toISOString(),
      })
      .eq('id', interactionId);

    return NextResponse.json({
      conversation_id: interactionId,
      response: agentResponse,
      agent_name: agent.name,
      warning: 'Agent is not connected to the voice provider. This is a fallback response.',
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    console.error('Chat widget error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
}

