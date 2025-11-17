import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/retell/agents - List agents from Retell AI
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant_id from query params
    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Verify user has access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .in('role', ['tenant_admin', 'super_admin', 'system_admin'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    // Get reseller's Retell API key (organizations inherit from reseller)
    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.' },
        { status: 400 }
      );
    }

    // List agents from Retell AI using reseller's API key
    const retellClient = createRetellClient(retellApiKey);
    const retellAgents = await retellClient.agent.list();

    return NextResponse.json({ agents: retellAgents });
  } catch (error: any) {
    console.error('Retell AI agent list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list Retell AI agents' },
      { status: 500 }
    );
  }
}

// POST /api/retell/agents - Create Retell AI agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id, agent_id, agent_name, voice_id, llm_websocket_url, ...retellConfig } = body;

    if (!tenant_id || !agent_id || !agent_name || !voice_id) {
      return NextResponse.json(
        { error: 'tenant_id, agent_id, agent_name, and voice_id are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this tenant
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

    // Get reseller's Retell API key (organizations inherit from reseller)
    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.' },
        { status: 400 }
      );
    }

    // Create Retell AI agent using reseller's API key
    const retellClient = createRetellClient(retellApiKey);
    
    const retellAgent = await retellClient.agent.create({
      agent_name,
      voice_id,
      llm_websocket_url: llm_websocket_url || undefined,
      ...retellConfig,
    });

    // Update agent record with Retell agent ID
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({
        retell_agent_id: retellAgent.agent_id,
        configuration: {
          ...retellConfig,
          retell_agent_id: retellAgent.agent_id,
        },
      })
      .eq('id', agent_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      agent: updatedAgent,
      retell_agent: retellAgent,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Retell AI agent creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create Retell AI agent' },
      { status: 500 }
    );
  }
}

