import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { buildIRAgentConfig } from '@/lib/ir-agent-template';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/agents/create-ir-template - One-click creation of the Investor Relations
// agent template: one Retell LLM (shared prompt/guardrail-appropriate settings), a chat
// agent, and optionally a voice agent, both backed by that LLM, both pre-configured with
// the IR guardrail_config/handbook_config/kb_config defaults from
// docs/RETELL_IR_AGENT_TEMPLATE.md. See src/lib/ir-agent-template.ts for the prompt and
// config builder this route wraps.
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
      company_name,
      ticker_symbol,
      exchange,
      human_contact,
      include_voice,
      voice_id, // required if include_voice is true
      knowledge_base_ids, // optional: local KB row ids to attach immediately
    } = body;

    if (!tenant_id || !company_name) {
      return NextResponse.json({ error: 'tenant_id and company_name are required' }, { status: 400 });
    }

    if (include_voice && !voice_id) {
      return NextResponse.json({ error: 'voice_id is required when include_voice is true' }, { status: 400 });
    }

    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .in('role', ['tenant_admin', 'super_admin'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    const retellApiKey = await getResellerRetellConfig(tenant_id);
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

    // Resolve knowledge base ids -> Retell knowledge_base_id, if any were provided up front.
    let retellKnowledgeBaseIds: string[] = [];
    if (Array.isArray(knowledge_base_ids) && knowledge_base_ids.length > 0) {
      const { data: kbs } = await supabase
        .from('knowledge_bases')
        .select('id, configuration')
        .eq('tenant_id', tenant_id)
        .in('id', knowledge_base_ids);

      retellKnowledgeBaseIds = (kbs || [])
        .map((kb) => (kb.configuration as any)?.retell_knowledge_base_id)
        .filter(Boolean);
    }

    // Build the chat-channel prompt/config (used for the shared LLM's general_prompt too --
    // the chat phrasing is the more general/detailed one; the voice agent gets its own
    // separate LLM below with voice-appropriate phrasing, since Retell applies one
    // general_prompt per LLM and the two channels genuinely need different phrasing).
    const chatConfig = buildIRAgentConfig({
      companyName: company_name,
      tickerSymbol: ticker_symbol,
      exchange,
      humanContact: human_contact,
      channel: 'chat',
    });

    const chatLlm = await retellClient.llm.create({
      general_prompt: chatConfig.systemPrompt,
      model_temperature: chatConfig.modelTemperature,
      knowledge_base_ids: retellKnowledgeBaseIds.length > 0 ? retellKnowledgeBaseIds : null,
      kb_config: retellKnowledgeBaseIds.length > 0 ? chatConfig.kbConfig : null,
    });

    const chatAgentName = `${company_name} Investor Relations Chat`;
    const chatAgent = await retellClient.chatAgent.create({
      response_engine: { type: 'retell-llm', llm_id: chatLlm.llm_id },
      agent_name: chatAgentName,
      guardrail_config: chatConfig.guardrailConfig,
      handbook_config: chatConfig.handbookConfig,
    });

    const { data: localChatAgent, error: chatAgentDbError } = await supabase
      .from('agents')
      .insert({
        tenant_id,
        name: chatAgentName,
        type: 'chat',
        description: `Investor Relations chat agent for ${company_name}, created from the IR template.`,
        retell_agent_id: chatAgent.agent_id,
        configuration: {
          ...chatAgent,
          retell_agent_id: chatAgent.agent_id,
          ir_template: true,
        },
        is_active: true,
      })
      .select()
      .single();

    if (chatAgentDbError) {
      logRetellError(chatAgentDbError, 'IR Template - Chat Agent DB Insert');
    }

    // Mirror KB links locally for the chat agent, if any were attached up front.
    if (localChatAgent && Array.isArray(knowledge_base_ids) && knowledge_base_ids.length > 0 && retellKnowledgeBaseIds.length > 0) {
      await supabase.from('agent_knowledge_bases').insert(
        knowledge_base_ids.map((kbId: string) => ({
          agent_id: localChatAgent.id,
          knowledge_base_id: kbId,
          tenant_id,
          similarity_threshold: chatConfig.kbConfig.filter_score,
          top_k: chatConfig.kbConfig.top_k,
        }))
      );
    }

    let voiceAgent: any = null;
    let localVoiceAgent: any = null;

    if (include_voice) {
      const voiceConfig = buildIRAgentConfig({
        companyName: company_name,
        tickerSymbol: ticker_symbol,
        exchange,
        humanContact: human_contact,
        channel: 'voice',
      });

      const voiceLlm = await retellClient.llm.create({
        general_prompt: voiceConfig.systemPrompt,
        model_temperature: voiceConfig.modelTemperature,
        knowledge_base_ids: retellKnowledgeBaseIds.length > 0 ? retellKnowledgeBaseIds : null,
        kb_config: retellKnowledgeBaseIds.length > 0 ? voiceConfig.kbConfig : null,
      });

      const voiceAgentName = `${company_name} Investor Relations Voice`;
      voiceAgent = await retellClient.agent.create({
        response_engine: { type: 'retell-llm', llm_id: voiceLlm.llm_id },
        voice_id,
        agent_name: voiceAgentName,
        guardrail_config: voiceConfig.guardrailConfig,
        handbook_config: voiceConfig.handbookConfig,
      });

      const { data: insertedVoiceAgent, error: voiceAgentDbError } = await supabase
        .from('agents')
        .insert({
          tenant_id,
          name: voiceAgentName,
          type: 'voice',
          description: `Investor Relations voice agent for ${company_name}, created from the IR template.`,
          retell_agent_id: voiceAgent.agent_id,
          configuration: {
            ...voiceAgent,
            retell_agent_id: voiceAgent.agent_id,
            ir_template: true,
          },
          is_active: true,
        })
        .select()
        .single();

      if (voiceAgentDbError) {
        logRetellError(voiceAgentDbError, 'IR Template - Voice Agent DB Insert');
      } else {
        localVoiceAgent = insertedVoiceAgent;
      }

      if (localVoiceAgent && Array.isArray(knowledge_base_ids) && knowledge_base_ids.length > 0 && retellKnowledgeBaseIds.length > 0) {
        await supabase.from('agent_knowledge_bases').insert(
          knowledge_base_ids.map((kbId: string) => ({
            agent_id: localVoiceAgent.id,
            knowledge_base_id: kbId,
            tenant_id,
            similarity_threshold: voiceConfig.kbConfig.filter_score,
            top_k: voiceConfig.kbConfig.top_k,
          }))
        );
      }
    }

    return NextResponse.json({
      success: true,
      chat_agent: { agent: localChatAgent, retell_agent: chatAgent },
      voice_agent: include_voice ? { agent: localVoiceAgent, retell_agent: voiceAgent } : null,
      message: include_voice
        ? `Created Investor Relations chat and voice agents for ${company_name}. Publish each when ready to go live.`
        : `Created Investor Relations chat agent for ${company_name}. Publish it when ready to go live.`,
    }, { status: 201 });
  } catch (error: any) {
    logRetellError(error, 'IR Template Create');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to create Investor Relations agent template: ${errorMessage}` },
      { status: 500 }
    );
  }
}
