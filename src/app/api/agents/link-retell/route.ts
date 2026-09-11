import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { canAccessTenant } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/agents/link-retell - Link a manually created Retell agent to a database agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agent_id, retell_agent_id } = body;

    if (!agent_id || !retell_agent_id) {
      return NextResponse.json(
        { error: 'agent_id and retell_agent_id are required' },
        { status: 400 }
      );
    }

    // Get agent and verify access
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name, type, tenant_id, retell_agent_id, configuration')
      .eq('id', agent_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify user is admin
    if (!(await canAccessTenant(user.id, agent.tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (agent.retell_agent_id && agent.retell_agent_id !== retell_agent_id) {
      return NextResponse.json(
        { error: `Agent is already linked to a different Retell agent: ${agent.retell_agent_id}` },
        { status: 400 }
      );
    }

    // Get reseller's Retell API key
    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not connected for this organization. Please connect a Retell workspace in Settings.' },
        { status: 400 }
      );
    }

    // Verify the Retell agent exists and get its details.
    // Retell now exposes a dedicated Chat Agent resource (chatAgent.retrieve) alongside the
    // Voice Agent resource (agent.retrieve) -- voice and chat agents are retrieved via
    // different endpoints, so we try whichever matches the expected local agent type first,
    // then fall back to the other in case the type was misconfigured locally.
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 20 * 1000,
      maxRetries: 2,
    });

    let retellAgent: any = null;
    let channel: string | null = null;
    let isPublished = false;
    let validationMethod = '';

    const tryRetrieveChat = async () => {
      const chatAgent = await retellClient.chatAgent.retrieve(retell_agent_id);
      retellAgent = chatAgent;
      channel = 'chat';
      isPublished = chatAgent.is_published || false;
      validationMethod = 'chatAgent.retrieve()';
    };

    const tryRetrieveVoice = async () => {
      const voiceAgent = await retellClient.agent.retrieve(retell_agent_id);
      retellAgent = voiceAgent;
      channel = (voiceAgent as any).channel || 'voice';
      isPublished = voiceAgent.is_published || false;
      validationMethod = 'agent.retrieve()';
    };

    const [firstTry, secondTry] = agent.type === 'chat'
      ? [tryRetrieveChat, tryRetrieveVoice]
      : [tryRetrieveVoice, tryRetrieveChat];

    try {
      await firstTry();
    } catch (firstError: any) {
      try {
        await secondTry();
      } catch (secondError: any) {
        const status = secondError?.status || firstError?.status || 500;
        const errorMessage = formatRetellError(secondError);
        logRetellError(secondError, 'Agent Link - Retell Retrieve');

        let message = `Agent ID "${retell_agent_id}" could not be retrieved: ${errorMessage}`;
        if (status === 404) {
          message = `Agent ID "${retell_agent_id}" does not exist in your Retell workspace. Please verify the agent ID is correct.`;
        }

        return NextResponse.json(
          {
            error: message,
            retell_status: status,
            retell_error: secondError?.message,
            validation_method: 'chatAgent.retrieve() / agent.retrieve()',
          },
          { status: status >= 400 && status < 500 ? status : 500 }
        );
      }
    }

    const retellAgentData = retellAgent as any;

    // Check if channel matches agent type
    if (agent.type === 'chat' && channel !== 'chat') {
      return NextResponse.json(
        { 
          error: `Agent type mismatch: Database agent is "chat" but Retell agent channel is "${channel}". Please link to a chat agent or convert the Retell agent to chat.`,
          channel: channel,
          retell_agent_name: retellAgentData.agent_name,
        },
        { status: 400 }
      );
    }

    if (agent.type === 'voice' && channel !== 'voice') {
      return NextResponse.json(
        { 
          error: `Agent type mismatch: Database agent is "voice" but Retell agent channel is "${channel}". Please link to a voice agent.`,
          channel: channel,
          retell_agent_name: retellAgentData.agent_name,
        },
        { status: 400 }
      );
    }

    // Update database agent with Retell agent ID
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({
        retell_agent_id: retell_agent_id,
        configuration: {
          ...(typeof agent.configuration === 'object' ? agent.configuration : {}),
          retell_agent_id: retell_agent_id,
          retell_channel: channel,
        },
      })
      .eq('id', agent_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
      retell_agent: {
        agent_id: retell_agent_id,
        agent_name: retellAgentData?.agent_name || 'Unknown',
        channel: channel,
        is_published: isPublished,
      },
      validation_method: validationMethod || 'agent.retrieve()',
      message: `Agent "${agent.name}" successfully linked to Retell agent "${retellAgentData?.agent_name || retell_agent_id}" (${channel || 'unknown'} channel)`,
    });
  } catch (error: any) {
    logRetellError(error, 'Agent Link');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to link agent: ${errorMessage}` },
      { status: 500 }
    );
  }
}

