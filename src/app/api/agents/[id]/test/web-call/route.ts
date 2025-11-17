import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/agents/[id]/test/web-call - Create a web call for browser-based audio testing
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

    // Get agent
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.type !== 'voice') {
      return NextResponse.json({ error: 'Web calls are only available for voice agents' }, { status: 400 });
    }

    if (!agent.retell_agent_id) {
      return NextResponse.json({ error: 'Agent not linked to Retell AI' }, { status: 400 });
    }

    // Check if user is system_admin (can test any agent)
    const { data: systemAdminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .single();

    const isSystemAdmin = !!systemAdminCheck;

    // If not system_admin, verify user has access to this tenant
    if (!isSystemAdmin) {
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', agent.tenant_id)
        .single();

      if (!userTenant) {
        return NextResponse.json({ error: 'Forbidden: No access to this agent' }, { status: 403 });
      }
    }

    // Get reseller's Retell API key
    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.' },
        { status: 400 }
      );
    }

    // Create web call via Retell AI
    const retellClient = createRetellClient(retellApiKey);
    
    // First, verify the agent exists and is properly configured in Retell
    try {
      const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
      
      // Validate agent has a response engine configured
      if (!retellAgent.response_engine) {
        return NextResponse.json(
          { 
            error: 'Agent is not properly configured in Retell AI. Please ensure the agent has a response engine (LLM) configured in the Retell dashboard.',
            details: 'The agent exists but has no response engine configured.'
          },
          { status: 400 }
        );
      }
      
      // Validate response engine type
      if (retellAgent.response_engine.type === 'retell-llm') {
        const llmId = (retellAgent.response_engine as any).llm_id;
        if (!llmId) {
          return NextResponse.json(
            { 
              error: 'Agent LLM is not properly configured in Retell AI.',
              details: 'The agent uses Retell LLM but the LLM ID is missing.'
            },
            { status: 400 }
          );
        }
      } else if (retellAgent.response_engine.type === 'custom-llm') {
        const websocketUrl = (retellAgent.response_engine as any).llm_websocket_url;
        if (!websocketUrl) {
          return NextResponse.json(
            { 
              error: 'Agent custom LLM is not properly configured in Retell AI.',
              details: 'The agent uses a custom LLM but the websocket URL is missing.'
            },
            { status: 400 }
          );
        }
      }
      
      console.log(`Agent ${agent.retell_agent_id} validated successfully in Retell`);
    } catch (retellError: any) {
      console.error('Error validating agent in Retell:', retellError);
      if (retellError.status === 404 || retellError.message?.includes('not found')) {
        return NextResponse.json(
          { 
            error: 'Agent not found in Retell AI. Please ensure the agent is properly synced.',
            details: `Agent ID ${agent.retell_agent_id} does not exist in Retell.`
          },
          { status: 404 }
        );
      }
      // Continue anyway - validation might fail but call creation might still work
      console.warn('Agent validation failed, but proceeding with call creation:', retellError.message);
    }
    
    const webCall = await retellClient.call.createWebCall({
      agent_id: agent.retell_agent_id,
      metadata: {
        test: true,
        test_user_id: user.id,
        agent_id: agent.id,
        tenant_id: agent.tenant_id,
      },
    });

    return NextResponse.json({
      access_token: webCall.access_token,
      call_id: webCall.call_id,
      agent_id: agent.retell_agent_id,
    });
  } catch (error: any) {
    console.error('Web call creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create web call' },
      { status: 500 }
    );
  }
}

