import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/retell/agents/[id]/publish - Publish a Retell AI agent
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

    // Get agent and verify access
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
        error: 'Agent not linked to Retell AI. Please sync or create the agent in Retell first.' 
      }, { status: 400 });
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

    // Get reseller's Retell API key
    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.' },
        { status: 400 }
      );
    }

    // Create Retell client
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000,
      maxRetries: 3,
    });

    // Publish the agent
    try {
      await retellClient.agent.publish(agent.retell_agent_id);
    } catch (publishError: any) {
      // Handle JSON parse errors (expected for 204 No Content responses)
      if (publishError.message?.includes('JSON') || 
          publishError.message?.includes('Unexpected end') ||
          publishError.message?.includes('empty')) {
        // Publish request was sent successfully, continue
      } else {
        // Real error
        logRetellError(publishError, 'Agent Publish');
        const errorMessage = formatRetellError(publishError);
        return NextResponse.json(
          { error: `Failed to publish agent: ${errorMessage}` },
          { status: 500 }
        );
      }
    }

    // Wait a moment for Retell to process
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify publication status
    let isPublished = false;
    try {
      const publishedAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
      isPublished = (publishedAgent as any).is_published || false;
    } catch (checkError) {
      // Could not verify, but publish was attempted
      console.warn('Could not verify agent publish status:', checkError);
    }

    return NextResponse.json({
      success: true,
      is_published: isPublished,
      message: isPublished 
        ? 'Agent published successfully' 
        : 'Publish request sent. The agent may take a few moments to be published. Please check again shortly.',
      retell_agent_id: agent.retell_agent_id,
    });
  } catch (error: any) {
    logRetellError(error, 'Agent Publish');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to publish agent: ${errorMessage}` },
      { status: 500 }
    );
  }
}

