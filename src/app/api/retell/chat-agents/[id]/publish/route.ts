import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/retell/chat-agents/[id]/publish - Publish a native Retell chat agent's draft version
export async function POST(
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

    if (!agent.retell_agent_id) {
      return NextResponse.json({
        error: 'Agent not linked to Retell AI. Please create or link the chat agent first.',
      }, { status: 400 });
    }

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

    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization. Please connect a Retell workspace in Settings.' },
        { status: 400 }
      );
    }

    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000,
      maxRetries: 3,
    });

    // Retell requires an explicit version to publish (unified publish-agent-version endpoint).
    let versionToPublish: number;
    try {
      const currentChatAgent = await retellClient.chatAgent.retrieve(agent.retell_agent_id);
      versionToPublish = currentChatAgent.version ?? 0;
    } catch (retrieveError: any) {
      logRetellError(retrieveError, 'Chat Agent Publish - Retrieve Version');
      const errorMessage = formatRetellError(retrieveError);
      return NextResponse.json(
        { error: `Failed to retrieve chat agent version before publishing: ${errorMessage}` },
        { status: 500 }
      );
    }

    await retellClient.chatAgent.publish(agent.retell_agent_id, { version: versionToPublish });

    // Verify publication status
    let isPublished = false;
    try {
      const publishedAgent = await retellClient.chatAgent.retrieve(agent.retell_agent_id);
      isPublished = publishedAgent.is_published || false;
    } catch (checkError) {
      console.warn('Could not verify chat agent publish status:', checkError);
    }

    return NextResponse.json({
      success: true,
      is_published: isPublished,
      message: isPublished
        ? 'Chat agent published successfully'
        : 'Publish request sent. The agent may take a few moments to be published. Please check again shortly.',
      retell_agent_id: agent.retell_agent_id,
    });
  } catch (error: any) {
    logRetellError(error, 'Chat Agent Publish');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to publish chat agent: ${errorMessage}` },
      { status: 500 }
    );
  }
}
