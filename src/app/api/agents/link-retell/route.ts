import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
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
      .select('id, name, type, tenant_id, retell_agent_id')
      .eq('id', agent_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify user is admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', agent.tenant_id)
      .in('role', ['tenant_admin', 'super_admin'])
      .single();

    if (!userTenant) {
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
        { error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.' },
        { status: 400 }
      );
    }

    // Verify the Retell agent exists and get its details
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 20 * 1000,
      maxRetries: 2,
    });

    let retellAgent;
    try {
      retellAgent = await retellClient.agent.retrieve(retell_agent_id);
    } catch (retellError: any) {
      logRetellError(retellError, 'Agent Link - Retell Retrieve');
      return NextResponse.json(
        { error: `Retell agent not found or inaccessible: ${formatRetellError(retellError)}` },
        { status: 404 }
      );
    }

    const retellAgentData = retellAgent as any;
    const channel = retellAgentData.channel || null;
    const isPublished = retellAgentData.is_published || false;

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
        agent_name: retellAgentData.agent_name,
        channel: channel,
        is_published: isPublished,
      },
      message: `Agent "${agent.name}" successfully linked to Retell agent "${retellAgentData.agent_name}" (${channel} channel)`,
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

