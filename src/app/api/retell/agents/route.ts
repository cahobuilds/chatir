import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
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

    // Get tenant's Retell API key
    const { data: tenant } = await supabase
      .from('tenants')
      .select('retell_api_key')
      .eq('id', tenant_id)
      .single();

    if (!tenant?.retell_api_key) {
      return NextResponse.json(
        { error: 'Tenant Retell API key not configured. Please configure it in tenant settings.' },
        { status: 400 }
      );
    }

    // List agents from Retell AI
    const retellClient = createRetellClient(tenant.retell_api_key);
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

    // Get tenant's Retell API key
    const { data: tenant } = await supabase
      .from('tenants')
      .select('retell_api_key')
      .eq('id', tenant_id)
      .single();

    if (!tenant?.retell_api_key) {
      return NextResponse.json(
        { error: 'Tenant Retell API key not configured' },
        { status: 400 }
      );
    }

    // Create Retell AI agent
    const retellClient = createRetellClient(tenant.retell_api_key);
    
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

