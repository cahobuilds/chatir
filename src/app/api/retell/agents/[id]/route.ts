import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/retell/agents/[id] - Get Retell AI agent details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Verify user has access
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

    // Get tenant's Retell API key
    const { data: tenant } = await supabase
      .from('tenants')
      .select('retell_api_key')
      .eq('id', agent.tenant_id)
      .single();

    if (!tenant?.retell_api_key) {
      return NextResponse.json(
        { error: 'Tenant Retell API key not configured' },
        { status: 400 }
      );
    }

    // Get Retell AI agent details
    const retellClient = createRetellClient(tenant.retell_api_key);
    const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);

    return NextResponse.json({ retell_agent: retellAgent });
  } catch (error: any) {
    console.error('Retell AI agent retrieval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve Retell AI agent' },
      { status: 500 }
    );
  }
}

// PATCH /api/retell/agents/[id] - Update Retell AI agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    if (!agent.retell_agent_id) {
      return NextResponse.json({ error: 'Agent not linked to Retell AI' }, { status: 400 });
    }

    // Get tenant's Retell API key
    const { data: tenant } = await supabase
      .from('tenants')
      .select('retell_api_key')
      .eq('id', agent.tenant_id)
      .single();

    if (!tenant?.retell_api_key) {
      return NextResponse.json(
        { error: 'Tenant Retell API key not configured' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { agent_name, voice_id, llm_websocket_url, ...retellConfig } = body;

    // Update Retell AI agent
    const retellClient = createRetellClient(tenant.retell_api_key);
    const retellAgent = await retellClient.agent.update(agent.retell_agent_id, {
      agent_name,
      voice_id,
      llm_websocket_url,
      ...retellConfig,
    });

    // Update local agent configuration
    const { data: updatedAgent } = await supabase
      .from('agents')
      .update({
        configuration: {
          ...retellConfig,
          retell_agent_id: retellAgent.agent_id,
        },
      })
      .eq('id', id)
      .select()
      .single();

    return NextResponse.json({
      agent: updatedAgent,
      retell_agent: retellAgent,
    });
  } catch (error: any) {
    console.error('Retell AI agent update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update Retell AI agent' },
      { status: 500 }
    );
  }
}

// DELETE /api/retell/agents/[id] - Delete Retell AI agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    if (agent.retell_agent_id) {
      // Get tenant's Retell API key
      const { data: tenant } = await supabase
        .from('tenants')
        .select('retell_api_key')
        .eq('id', agent.tenant_id)
        .single();

      if (tenant?.retell_api_key) {
        // Delete Retell AI agent
        const retellClient = createRetellClient(tenant.retell_api_key);
        await retellClient.agent.delete(agent.retell_agent_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Retell AI agent deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete Retell AI agent' },
      { status: 500 }
    );
  }
}

