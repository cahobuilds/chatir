import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig, getResellerTenantId } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/retell/calls - Create a phone call
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agent_id, from_number, to_number, metadata } = body;

    if (!agent_id || !from_number || !to_number) {
      return NextResponse.json(
        { error: 'agent_id, from_number, and to_number are required' },
        { status: 400 }
      );
    }

    // Get agent and verify access
    const { data: agent } = await supabase
      .from('agents')
      .select('tenant_id, retell_agent_id, type')
      .eq('id', agent_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.type !== 'voice') {
      return NextResponse.json({ error: 'Agent must be a voice agent' }, { status: 400 });
    }

    if (!agent.retell_agent_id) {
      return NextResponse.json({ error: 'Agent not linked to Retell AI' }, { status: 400 });
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

    // Get reseller's Retell API key (organizations inherit from reseller)
    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.' },
        { status: 400 }
      );
    }

    // Get reseller tenant ID for billing tracking
    const resellerTenantId = await getResellerTenantId(agent.tenant_id);

    // Create phone call via Retell AI using reseller's API key
    const retellClient = createRetellClient(retellApiKey);
    const call = await retellClient.call.createPhoneCall({
      from_number,
      to_number,
      override_agent_id: agent.retell_agent_id,
      metadata: metadata || {},
    });

    // Create interaction record with reseller tracking
    const { data: interaction, error: interactionError } = await supabase
      .from('interactions')
      .insert({
        tenant_id: agent.tenant_id,
        agent_id: agent_id,
        type: 'voice',
        status: 'in_progress',
        retell_call_id: call.call_id,
        customer_phone: to_number,
        metadata: metadata || {},
        reseller_tenant_id: resellerTenantId,
      })
      .select()
      .single();

    if (interactionError) {
      console.error('Failed to create interaction:', interactionError);
      // Don't fail the call creation, just log the error
    }

    return NextResponse.json({
      call,
      interaction,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Retell AI call creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create phone call' },
      { status: 500 }
    );
  }
}

