// POST /api/admin/model-compare - Platform-only: compare candidate models on an IR question.
// Runs the same question through a temporary Retell chat agent per candidate model and returns
// the responses so the platform can validate which models are the most accurate/effective before
// adding them to the curated allowlist (ALLOWED_LLM_MODELS). Temporary resources are always cleaned up.
import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { hasPlatformPermission } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';

// Compact IR-style prompt used for the comparison. Real deployments can use buildIRAgentConfig.
const IR_PROMPT =
  'You are the Investor Relations assistant for a public company. ' +
  'Answer ONLY from the provided public filing/website context. ' +
  'If an answer is not in the context, say plainly "I do not have that information." ' +
  'Never give investment, legal, or tax advice, and never speculate about future performance. ' +
  'Always stay within the company public information.';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Model curation is a platform concern.
    if (!(await hasPlatformPermission(user.id, 'models.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Platform access required' }, { status: 403 });
    }

    const body = await request.json();
    const { question, models, tenant_id } = body;

    if (!question || !models || !Array.isArray(models) || models.length === 0) {
      return NextResponse.json({ error: 'question and a non-empty models array are required' }, { status: 400 });
    }
    if (models.length > 5) {
      return NextResponse.json({ error: 'Limit comparison to 5 models at a time' }, { status: 400 });
    }
    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    const retellApiKey = await getResellerRetellConfig(tenant_id);
    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Voice provider not connected for this organization. Please connect it in Settings.' },
        { status: 400 }
      );
    }

    const retellClient = createRetellClient(retellApiKey, { timeout: 30 * 1000, maxRetries: 2 });
    const results = [];

    for (const model of models) {
      let llmId: string | null = null;
      let agentId: string | null = null;
      try {
        const llm = await retellClient.llm.create({
          model,
          general_prompt: IR_PROMPT,
          model_temperature: 0.2,
        });
        llmId = llm.llm_id;

        const agent = await retellClient.chatAgent.create({
          response_engine: { type: 'retell-llm', llm_id: llmId },
          agent_name: `model-compare-${model}`,
        });
        agentId = agent.agent_id;

        const chat = await retellClient.chat.create({ agent_id: agentId });
        const completion = await retellClient.chat.createChatCompletion({
          chat_id: chat.chat_id,
          content: question,
        });

        const agentMessages = (completion.messages || []).filter(
          (m: any) => m.role === 'agent' && typeof m.content === 'string'
        );
        const response = agentMessages.length
          ? String((agentMessages[agentMessages.length - 1] as { content: string }).content)
          : '(no agent response)';

        results.push({ model, response });
      } catch (err: any) {
        results.push({ model, error: err.message || 'Failed' });
      } finally {
        try { if (agentId) await retellClient.chatAgent.delete(agentId); } catch { /* cleanup best-effort */ }
        try { if (llmId) await retellClient.llm.delete(llmId); } catch { /* cleanup best-effort */ }
      }
    }

    return NextResponse.json({ results, prompt: IR_PROMPT });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Model comparison failed' }, { status: 500 });
  }
}
