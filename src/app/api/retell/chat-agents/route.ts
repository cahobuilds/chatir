import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { canAccessTenant } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/retell/chat-agents - List chat agents from Retell AI (native Chat Agent API)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Verify user can manage this tenant's agents (or is platform staff).
    if (!(await canAccessTenant(user.id, tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Voice provider not configured for this organization. Please connect it in Settings.' },
        { status: 400 }
      );
    }

    const retellClient = createRetellClient(retellApiKey, {
      timeout: 20 * 1000,
      maxRetries: 2,
    });

    // Native chat agent list, filtered server-side to channel=chat (list-agents returns both
    // voice and chat agents; this endpoint intentionally only returns chat agents).
    const chatAgentsResponse = await retellClient.chatAgent.list({
      filter_criteria: {
        channel: { type: 'string', op: 'eq', value: 'chat' },
      },
    });

    return NextResponse.json({
      chat_agents: chatAgentsResponse.items || [],
      has_more: chatAgentsResponse.has_more || false,
      pagination_key: chatAgentsResponse.pagination_key,
    });
  } catch (error: any) {
    logRetellError(error, 'Chat Agent List');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to list chat agents from the voice provider: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// POST /api/retell/chat-agents - Create a native Retell chat agent and link it to a local agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      tenant_id,
      agent_id, // local database agent id to link (optional -- can be created after)
      agent_name,
      llm_id,
      llm_websocket_url,
      conversation_flow_id,
      ...chatAgentConfig
    } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // A response_engine is required. Build it from the shorthand fields if not passed directly.
    let response_engine = chatAgentConfig.response_engine;
    if (!response_engine) {
      if (llm_id) {
        response_engine = { type: 'retell-llm', llm_id };
      } else if (llm_websocket_url) {
        response_engine = { type: 'custom-llm', llm_websocket_url };
      } else if (conversation_flow_id) {
        response_engine = { type: 'conversation-flow', conversation_flow_id };
      } else {
        return NextResponse.json(
          { error: 'One of llm_id, llm_websocket_url, conversation_flow_id, or response_engine is required' },
          { status: 400 }
        );
      }
    }
    delete chatAgentConfig.response_engine;

    // Verify user can manage this tenant's agents (or is platform staff).
    if (!(await canAccessTenant(user.id, tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Voice provider not configured for this organization. Please connect it in Settings.' },
        { status: 400 }
      );
    }

    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000,
      maxRetries: 3,
    });

    // Create the native chat agent. This uses Retell's dedicated Chat Agent resource
    // (POST /create-chat-agent) -- no voice_id, no channel-guessing workaround needed.
    const chatAgent = await retellClient.chatAgent.create({
      response_engine,
      agent_name: agent_name || null,
      ...chatAgentConfig,
    });

    // Optionally link to an existing local agent record, or create a new one.
    let localAgent = null;
    if (agent_id) {
      const { data: updatedAgent, error: updateError } = await supabase
        .from('agents')
        .update({
          retell_agent_id: chatAgent.agent_id,
          type: 'chat',
          configuration: {
            ...chatAgent,
            retell_agent_id: chatAgent.agent_id,
          },
        })
        .eq('id', agent_id)
        .eq('tenant_id', tenant_id)
        .select()
        .single();

      if (updateError) {
        logRetellError(updateError, 'Chat Agent Link After Create');
      } else {
        localAgent = updatedAgent;
      }
    } else if (agent_name) {
      const { data: newAgent, error: createError } = await supabase
        .from('agents')
        .insert({
          tenant_id,
          name: agent_name,
          type: 'chat',
          description: 'Created via native Retell Chat Agent API',
          retell_agent_id: chatAgent.agent_id,
          configuration: {
            ...chatAgent,
            retell_agent_id: chatAgent.agent_id,
          },
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        logRetellError(createError, 'Local Agent Create After Chat Agent Create');
      } else {
        localAgent = newAgent;
      }
    }

    return NextResponse.json({
      chat_agent: chatAgent,
      agent: localAgent,
    }, { status: 201 });
  } catch (error: any) {
    logRetellError(error, 'Chat Agent Create');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to create the chat agent with the voice provider: ${errorMessage}` },
      { status: 500 }
    );
  }
}
