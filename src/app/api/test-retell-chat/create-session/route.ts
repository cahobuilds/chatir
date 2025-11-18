import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/test-retell-chat/create-session - Create a chat session directly with Retell
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { retell_agent_id, agent_id } = body;

    let retellAgentId = retell_agent_id;
    let tenantId: string | null = null;

    // If agent_id provided, fetch retell_agent_id from database
    if (agent_id && !retell_agent_id) {
      const { data: agent } = await supabase
        .from('agents')
        .select('retell_agent_id, tenant_id')
        .eq('id', agent_id)
        .single();

      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      if (!agent.retell_agent_id) {
        return NextResponse.json({ 
          error: 'Agent is not linked to Retell. Please sync agents or create the agent in Retell first.' 
        }, { status: 400 });
      }

      retellAgentId = agent.retell_agent_id;
      tenantId = agent.tenant_id;
    }

    if (!retellAgentId) {
      return NextResponse.json({ 
        error: 'retell_agent_id is required. Provide either retell_agent_id or agent_id.' 
      }, { status: 400 });
    }

    // Get tenant_id if not provided
    if (!tenantId) {
      // Try to find tenant from any agent with this retell_agent_id
      // Use limit(1) instead of single() since multiple agents can share the same retell_agent_id
      const { data: agents } = await supabase
        .from('agents')
        .select('tenant_id')
        .eq('retell_agent_id', retellAgentId)
        .limit(1);

      if (agents && agents.length > 0) {
        tenantId = agents[0].tenant_id;
      }
    }

    // Get Retell API key
    if (!tenantId) {
      return NextResponse.json({ 
        error: 'Could not determine tenant_id. Please provide agent_id or ensure retell_agent_id exists in database.' 
      }, { status: 400 });
    }

    const retellApiKey = await getResellerRetellConfig(tenantId);

    if (!retellApiKey) {
      return NextResponse.json({
        error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.'
      }, { status: 400 });
    }

    // Create Retell client
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000,
      maxRetries: 2,
    });

    // Create chat session
    const chatSession = await retellClient.chat.create({
      agent_id: retellAgentId,
      metadata: {
        test: true,
        test_user_id: user.id,
        tenant_id: tenantId,
      },
    });

    return NextResponse.json({
      chat_id: chatSession.chat_id,
      agent_id: retellAgentId,
      chat_status: chatSession.chat_status,
    });
  } catch (error: any) {
    console.error('Retell chat session creation error:', error);
    
    const errorMessage = error?.response?.data?.message || 
                        error?.message || 
                        'Failed to create chat session';
    
    return NextResponse.json({
      error: errorMessage,
      details: error?.response?.data || error?.stack,
    }, { status: 500 });
  }
}

