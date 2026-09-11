import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/retell/calls/[call_id] - Get call details from Retell API
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ call_id: string }> }
) {
  try {
    const { call_id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find interaction to get tenant_id
    const { data: interaction } = await supabase
      .from('interactions')
      .select('tenant_id, agent_id')
      .eq('retell_call_id', call_id)
      .single();

    if (!interaction) {
      return NextResponse.json(
        { error: 'Call not found in database' },
        { status: 404 }
      );
    }

    // Verify user has access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', interaction.tenant_id)
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get reseller's Retell API key
    const retellApiKey = await getResellerRetellConfig(interaction.tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Voice provider not connected for this organization.' },
        { status: 400 }
      );
    }

    // Create Retell client
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 20 * 1000,
      maxRetries: 2,
    });

    // Get call details from Retell
    console.log(`[Call Status API] Fetching call details for ${call_id}...`);
    const call = await retellClient.call.retrieve(call_id);

    // Log available call properties (using type assertion since Retell SDK types may be incomplete)
    const callData = call as any;
    console.log(`[Call Status API] Call details retrieved:`, {
      call_id: callData.call_id,
      direction: callData.direction,
      from_number: callData.from_number,
      to_number: callData.to_number,
      agent_id: callData.agent_id,
      start_timestamp: callData.start_timestamp,
      end_timestamp: callData.end_timestamp,
      duration: callData.duration,
      // Include any other properties that might exist
      ...(callData.status && { status: callData.status }),
      ...(callData.end_reason && { end_reason: callData.end_reason }),
    });

    return NextResponse.json({
      call: callData,
      interaction,
    });
  } catch (error: any) {
    logRetellError(error, 'Call Status');
    return NextResponse.json(
      { 
        error: formatRetellError(error),
        details: error.message,
      },
      { status: error.status || 500 }
    );
  }
}

