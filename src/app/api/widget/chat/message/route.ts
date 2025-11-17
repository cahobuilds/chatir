import { createAdminClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/widget/chat/message - Public endpoint for chat widget messages
// No authentication required - uses agent_id for authorization
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
          const retellClient = createRetellClient(retellApiKey);
          
          // For chat, we'll use Retell's LLM API if available
          // For now, we'll create a simple response using the agent's configuration
          // In a full implementation, you'd use Retell's chat API or websocket
          
          // Get agent details from Retell
          const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
          
          const config = typeof agent.configuration === 'string' 
            ? JSON.parse(agent.configuration) 
            : agent.configuration || {};
          
          const responseEngine = retellAgent.response_engine;
          const hasWebSocketUrl = responseEngine && 
            typeof responseEngine === 'object' && 
            responseEngine !== null &&
            (responseEngine as any).llm_websocket_url;
          
          // If agent uses custom LLM WebSocket, we need to connect to it
          // For now, use the agent's system prompt to generate a contextual response
          const systemPrompt = config.prompt || 
                              config.system_instructions || 
                              (retellAgent as any).prompt ||
                              'You are a helpful assistant.';
          
          // Build conversation context from transcript
          const conversationContext = transcript
            .slice(-10) // Last 10 messages for context
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');
          
          // Generate a more contextual response based on the agent's prompt
          // Note: This is a temporary solution. For production, integrate with the LLM WebSocket
          let agentResponse: string;
          
          if (hasWebSocketUrl) {
            // Agent uses custom LLM WebSocket - indicate this requires WebSocket connection
            agentResponse = `I received your message: "${message}". This agent is configured to use a custom LLM via WebSocket. For real-time chat, please use the WebSocket connection.`;
          } else {
            // Try to generate a contextual response based on the prompt
            // This is a simplified version - in production, you'd call the actual LLM
            const userMessageLower = message.toLowerCase();
            
            // Check if it's a greeting
            if (userMessageLower.match(/^(hi|hello|hey|greetings)/)) {
              agentResponse = systemPrompt.includes('helpful') 
                ? `Hello! ${systemPrompt.includes('customer') ? 'How can I help you today?' : 'How can I assist you?'}`
                : `Hello! How can I help you?`;
            } else if (userMessageLower.match(/(thank|thanks|appreciate)/)) {
              agentResponse = `You're welcome! Is there anything else I can help you with?`;
            } else {
              // Generic contextual response based on system prompt
              agentResponse = `Based on your message "${message}", I understand you're looking for assistance. ${systemPrompt.includes('support') ? 'I\'m here to help with your support needs.' : 'How can I assist you further?'}`;
            }
          }
          
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
        console.error('Retell error:', retellError);
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
    });
  } catch (error: any) {
    console.error('Chat widget error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

