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
          
          // Simple response generation (in production, use Retell's chat API)
          const config = typeof agent.configuration === 'string' 
            ? JSON.parse(agent.configuration) 
            : agent.configuration || {};
          
          const prompt = config.prompt || config.system_instructions || 
                        'You are a helpful assistant.';
          
          // For now, return a placeholder response
          // In production, integrate with Retell's chat API or your LLM service
          const agentResponse = `Thank you for your message: "${message}". I'm processing your request.`;
          
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

