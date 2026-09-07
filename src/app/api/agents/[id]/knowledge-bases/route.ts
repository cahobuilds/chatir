import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/agents/[id]/knowledge-bases - List knowledge bases currently attached to an
// agent's Retell LLM (source of truth: Retell itself, via the LLM's knowledge_base_ids).
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
      .select('id, tenant_id, type, retell_agent_id')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', agent.tenant_id)
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!agent.retell_agent_id) {
      return NextResponse.json({ error: 'Agent not linked to Retell AI' }, { status: 400 });
    }

    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not connected for this organization. Please connect a Retell workspace in Settings.' },
        { status: 400 }
      );
    }

    const retellClient = createRetellClient(retellApiKey, {
      timeout: 20 * 1000,
      maxRetries: 2,
    });

    const { llmId, responseEngineType } = await resolveLlmId(retellClient, agent.type, agent.retell_agent_id);

    if (!llmId) {
      return NextResponse.json({
        knowledge_base_ids: [],
        kb_config: null,
        response_engine_type: responseEngineType,
        message: responseEngineType === 'custom-llm'
          ? 'Agent uses a custom LLM (websocket) -- knowledge bases attach to Retell LLMs only.'
          : 'Agent has no Retell LLM configured.',
      });
    }

    const llm = await retellClient.llm.retrieve(llmId);
    const knowledgeBaseIds = llm.knowledge_base_ids || [];

    // Resolve local knowledge_base rows matching these Retell KB ids, for display purposes.
    let localKnowledgeBases: any[] = [];
    if (knowledgeBaseIds.length > 0) {
      const { data: kbs } = await supabase
        .from('knowledge_bases')
        .select('id, name, type, configuration')
        .eq('tenant_id', agent.tenant_id);

      localKnowledgeBases = (kbs || []).filter((kb) =>
        knowledgeBaseIds.includes((kb.configuration as any)?.retell_knowledge_base_id)
      );
    }

    return NextResponse.json({
      knowledge_base_ids: knowledgeBaseIds,
      kb_config: llm.kb_config || null,
      knowledge_bases: localKnowledgeBases,
      llm_id: llmId,
    });
  } catch (error: any) {
    logRetellError(error, 'Agent Knowledge Base List');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to list agent knowledge bases: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[id]/knowledge-bases - Attach/replace the knowledge bases used by an
// agent's Retell LLM. Body: { knowledge_base_ids: string[] (local KB row ids), filter_score?, top_k? }
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
      .select('id, tenant_id, type, retell_agent_id')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', agent.tenant_id)
      .in('role', ['organization_admin', 'tenant_admin', 'super_admin'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (!agent.retell_agent_id) {
      return NextResponse.json({ error: 'Agent not linked to Retell AI' }, { status: 400 });
    }

    const body = await request.json();
    const { knowledge_base_ids: localKbIds, filter_score, top_k } = body;

    if (!Array.isArray(localKbIds)) {
      return NextResponse.json({ error: 'knowledge_base_ids must be an array of local knowledge base ids' }, { status: 400 });
    }

    // Resolve local KB ids -> Retell knowledge_base_id, scoped to this tenant (cross-tenant
    // KB ids are silently ignored, not just rejected, to avoid leaking existence information).
    const { data: kbs, error: kbError } = await supabase
      .from('knowledge_bases')
      .select('id, name, configuration')
      .eq('tenant_id', agent.tenant_id)
      .in('id', localKbIds);

    if (kbError) {
      return NextResponse.json({ error: kbError.message }, { status: 500 });
    }

    const retellKnowledgeBaseIds = (kbs || [])
      .map((kb) => (kb.configuration as any)?.retell_knowledge_base_id)
      .filter(Boolean);

    if (retellKnowledgeBaseIds.length !== localKbIds.length) {
      const resolvedLocalIds = new Set((kbs || []).map((kb) => kb.id));
      const missing = localKbIds.filter((kbId: string) => !resolvedLocalIds.has(kbId));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Some knowledge bases were not found for this organization or are not yet synced to Retell: ${missing.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not connected for this organization. Please connect a Retell workspace in Settings.' },
        { status: 400 }
      );
    }

    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000,
      maxRetries: 3,
    });

    const { llmId, responseEngineType } = await resolveLlmId(retellClient, agent.type, agent.retell_agent_id);

    if (!llmId) {
      return NextResponse.json(
        {
          error: responseEngineType === 'custom-llm'
            ? 'This agent uses a custom LLM (websocket). Knowledge bases only attach to Retell LLMs -- pass knowledge base content to your websocket server directly.'
            : 'Agent has no Retell LLM configured.',
        },
        { status: 400 }
      );
    }

    // Build kb_config -- Retell applies one filter_score/top_k across all attached KBs for
    // this LLM (not per-KB), so we default conservatively (higher filter_score = the agent
    // is more likely to say "I don't know" than retrieve a weak/irrelevant match --
    // deliberately tuned this way for the Investor Relations use case; see
    // docs/RETELL_IR_AGENT_TEMPLATE.md).
    const kbConfig = {
      filter_score: typeof filter_score === 'number' ? filter_score : 0.7,
      top_k: typeof top_k === 'number' ? top_k : 5,
    };

    await retellClient.llm.update(llmId, {
      knowledge_base_ids: retellKnowledgeBaseIds.length > 0 ? retellKnowledgeBaseIds : null,
      kb_config: retellKnowledgeBaseIds.length > 0 ? kbConfig : null,
    });

    // Mirror the link locally for fast display (Retell remains the source of truth for
    // whether retrieval actually happens).
    await supabase.from('agent_knowledge_bases').delete().eq('agent_id', id);

    if (localKbIds.length > 0) {
      const linkRows = localKbIds.map((kbId: string) => ({
        agent_id: id,
        knowledge_base_id: kbId,
        tenant_id: agent.tenant_id,
        similarity_threshold: kbConfig.filter_score,
        top_k: kbConfig.top_k,
      }));

      const { error: linkError } = await supabase.from('agent_knowledge_bases').insert(linkRows);
      if (linkError) {
        logRetellError(linkError, 'Agent Knowledge Base Link Mirror');
        // Don't fail the request -- Retell's state is authoritative and already updated.
      }
    }

    return NextResponse.json({
      success: true,
      knowledge_base_ids: retellKnowledgeBaseIds,
      kb_config: retellKnowledgeBaseIds.length > 0 ? kbConfig : null,
      message: retellKnowledgeBaseIds.length > 0
        ? `Attached ${retellKnowledgeBaseIds.length} knowledge base(s) to the agent.`
        : 'Removed all knowledge bases from the agent.',
    });
  } catch (error: any) {
    logRetellError(error, 'Agent Knowledge Base Update');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to update agent knowledge bases: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * Resolves the Retell LLM id backing an agent's response_engine, handling both the voice
 * `agent` resource and the native `chatAgent` resource (they are retrieved via different
 * endpoints in the current Retell API -- see docs/RETELL_CHAT_AGENT_GUIDE.md).
 */
async function resolveLlmId(
  retellClient: any,
  agentType: string,
  retellAgentId: string
): Promise<{ llmId: string | null; responseEngineType: string | null }> {
  const retellAgent = agentType === 'chat'
    ? await retellClient.chatAgent.retrieve(retellAgentId)
    : await retellClient.agent.retrieve(retellAgentId);

  const responseEngine = retellAgent.response_engine;

  if (responseEngine?.type === 'retell-llm' && 'llm_id' in responseEngine) {
    return { llmId: responseEngine.llm_id, responseEngineType: 'retell-llm' };
  }

  return { llmId: null, responseEngineType: responseEngine?.type || null };
}
