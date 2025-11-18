import { createAdminClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
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

    // Get transcript from existing interaction or initialize
    let transcript: Array<{ role: string; content: string; timestamp: string }> = [];
    if (conversation_id) {
      const { data: existingInteraction } = await adminSupabase
        .from('interactions')
        .select('transcript')
        .eq('id', conversation_id)
        .single();

      if (existingInteraction?.transcript) {
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
      try {
        const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
        
        if (retellApiKey) {
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
          }
          
          // Create chat completion with user message
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
            throw new Error('No agent response received from Retell');
          }
          
          // Get the latest agent message (should be the response to our user message)
          const latestAgentMessage = agentMessages[agentMessages.length - 1] as { content: string; role: 'agent' };
          const agentResponse = latestAgentMessage.content || 'I apologize, but I couldn\'t generate a response.';
          
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
          });
        }
      } catch (retellError: any) {
        console.error('Retell chat error:', retellError);
        // Log detailed error for debugging
        if (retellError.response) {
          console.error('Retell API error response:', {
            status: retellError.response.status,
            data: retellError.response.data,
          });
        }
        // Fall through to simple response
      }
    }

    // Fallback: Simple response without Retell
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

