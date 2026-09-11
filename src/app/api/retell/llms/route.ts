import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { canAccessTenant } from '@/lib/permissions-server';
import { isModelAllowed } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/retell/llms - List Retell LLM Response Engines for an organization
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

    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Voice provider not connected for this organization. Please connect it in Settings.' },
        { status: 400 }
      );
    }

    const retellClient = createRetellClient(retellApiKey);
    const llmsResponse = await retellClient.llm.list();
    const llms = (llmsResponse.items || []).filter((llm: any) => isModelAllowed(llm.model));

    return NextResponse.json({
      llms,
      has_more: llmsResponse.has_more || false,
      pagination_key: llmsResponse.pagination_key,
    });
  } catch (error: any) {
    logRetellError(error, 'LLM List');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to list language models: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// POST /api/retell/llms - Create a new Retell LLM Response Engine
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id, ...llmConfig } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Verify user can manage this tenant's agents (or is platform staff).
    if (!(await canAccessTenant(user.id, tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    // Only curated models are allowed to be used (when the platform allowlist is set).
    if (!isModelAllowed(llmConfig.model)) {
      return NextResponse.json(
        { error: `Model '${llmConfig.model}' is not approved for use. Please contact support.` },
        { status: 400 }
      );
    }

    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Voice provider not connected for this organization. Please connect it in Settings.' },
        { status: 400 }
      );
    }

    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000,
      maxRetries: 3,
    });

    const llm = await retellClient.llm.create(llmConfig);

    return NextResponse.json({ llm }, { status: 201 });
  } catch (error: any) {
    logRetellError(error, 'LLM Create');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to create the language model: ${errorMessage}` },
      { status: 500 }
    );
  }
}
