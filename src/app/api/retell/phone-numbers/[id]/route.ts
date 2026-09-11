import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { canAccessTenant } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/retell/phone-numbers/[id] - Bind/rebind an agent to an existing phone number.
// [id] is the phone number itself (E.164, e.g. +14155551234), matching Retell's own
// update-phone-number/{phone_number} path convention.
//
// Note: single-agent binding fields (agent_id) were removed from the phone number API in
// favor of weighted inbound/outbound/SMS agent lists -- see
// https://docs.retellai.com/deprecation-notice/2026/03-31_phone_number_agent_fields.md
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: phoneNumber } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id, agent_id } = body;

    if (!tenant_id || !agent_id) {
      return NextResponse.json({ error: 'tenant_id and agent_id are required' }, { status: 400 });
    }

    if (!(await canAccessTenant(user.id, tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Verify the agent belongs to this tenant and is a voice agent (phone numbers route
    // inbound calls to voice agents only).
    const { data: agent } = await supabase
      .from('agents')
      .select('id, type, retell_agent_id')
      .eq('id', agent_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found for this organization' }, { status: 404 });
    }

    if (agent.type !== 'voice') {
      return NextResponse.json(
        { error: 'Only voice agents can be bound to a phone number for inbound calls. Select a voice agent.' },
        { status: 400 }
      );
    }

    if (!agent.retell_agent_id) {
      return NextResponse.json({ error: 'Agent is not yet linked to the voice provider.' }, { status: 400 });
    }

    const retellApiKey = await getResellerRetellConfig(tenant_id);
    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Voice provider not connected for this organization. Please connect it in Settings.' },
        { status: 400 }
      );
    }

    const retellClient = createRetellClient(retellApiKey, {
      timeout: 20 * 1000,
      maxRetries: 2,
    });

    const updatedPhoneNumber = await retellClient.phoneNumber.update(phoneNumber, {
      inbound_agents: [{ agent_id: agent.retell_agent_id, weight: 1 }],
    });

    // Mirror the binding locally for display (matches the existing agents.retell_phone_number_id column).
    await supabase
      .from('agents')
      .update({ retell_phone_number_id: phoneNumber })
      .eq('id', agent_id);

    return NextResponse.json({
      success: true,
      phone_number: updatedPhoneNumber,
      message: `Bound ${phoneNumber} to agent for inbound calls.`,
    });
  } catch (error: any) {
    logRetellError(error, 'Phone Number Update');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to update phone number: ${errorMessage}` },
      { status: 500 }
    );
  }
}
