import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { canAccessTenant } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/retell/chat-agents/[id] - Get native Retell chat agent details.
// [id] is the LOCAL database agent id (matches the convention used by /api/retell/agents/[id]).
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

    const { data: agent } = await supabase
      .from('agents')
      .select('tenant_id, retell_agent_id')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (!(await canAccessTenant(user.id, agent.tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!agent.retell_agent_id) {
      return NextResponse.json({ error: 'Agent not linked to Retell AI' }, { status: 400 });
    }

    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization. Please connect a Retell workspace in Settings.' },
        { status: 400 }
      );
    }

    const retellClient = createRetellClient(retellApiKey, {
      timeout: 20 * 1000,
      maxRetries: 2,
    });

    const chatAgent = await retellClient.chatAgent.retrieve(agent.retell_agent_id);

    return NextResponse.json({
      chat_agent: chatAgent,
      is_published: chatAgent.is_published || false,
    });
  } catch (error: any) {
    logRetellError(error, 'Chat Agent Retrieval');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to retrieve Retell chat agent: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PATCH /api/retell/chat-agents/[id] - Update a native Retell chat agent's draft version
export async function PATCH(
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

    const { data: agent } = await supabase
      .from('agents')
      .select('tenant_id, retell_agent_id')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (!(await canAccessTenant(user.id, agent.tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (!agent.retell_agent_id) {
      return NextResponse.json({ error: 'Agent not linked to Retell AI' }, { status: 400 });
    }

    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization. Please connect a Retell workspace in Settings.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { llm_id, llm_websocket_url, conversation_flow_id, ...updateFields } = body;

    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000,
      maxRetries: 3,
    });

    const updatePayload: any = { ...updateFields };

    if (!updatePayload.response_engine) {
      if (llm_id !== undefined) {
        updatePayload.response_engine = { type: 'retell-llm', llm_id };
      } else if (llm_websocket_url !== undefined) {
        updatePayload.response_engine = { type: 'custom-llm', llm_websocket_url };
      } else if (conversation_flow_id !== undefined) {
        updatePayload.response_engine = { type: 'conversation-flow', conversation_flow_id };
      }
    }

    const chatAgent = await retellClient.chatAgent.update(agent.retell_agent_id, updatePayload);

    const { data: updatedAgent } = await supabase
      .from('agents')
      .update({
        configuration: {
          ...chatAgent,
          retell_agent_id: chatAgent.agent_id,
        },
      })
      .eq('id', id)
      .select()
      .single();

    return NextResponse.json({
      agent: updatedAgent,
      chat_agent: chatAgent,
    });
  } catch (error: any) {
    logRetellError(error, 'Chat Agent Update');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to update Retell chat agent: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// DELETE /api/retell/chat-agents/[id] - Delete a native Retell chat agent
export async function DELETE(
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

    const { data: agent } = await supabase
      .from('agents')
      .select('tenant_id, retell_agent_id')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (!(await canAccessTenant(user.id, agent.tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (agent.retell_agent_id) {
      const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

      if (retellApiKey) {
        const retellClient = createRetellClient(retellApiKey, {
          timeout: 20 * 1000,
          maxRetries: 2,
        });

        await retellClient.chatAgent.delete(agent.retell_agent_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logRetellError(error, 'Chat Agent Deletion');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to delete Retell chat agent: ${errorMessage}` },
      { status: 500 }
    );
  }
}
