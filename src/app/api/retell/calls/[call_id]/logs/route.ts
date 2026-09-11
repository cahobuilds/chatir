import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/retell/calls/[call_id]/logs - Get call logs/events from Retell API
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
      .select('tenant_id, agent_id, metadata')
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

    // Get call details (includes logs/events)
    console.log(`[Call Logs API] Fetching call logs for ${call_id}...`);
    const call = await retellClient.call.retrieve(call_id);

    // Extract relevant log information (using type assertion since Retell SDK types may be incomplete)
    const callData = call as any;
    const logs = {
      call_id: callData.call_id,
      direction: callData.direction,
      agent_id: callData.agent_id,
      start_timestamp: callData.start_timestamp,
      end_timestamp: callData.end_timestamp,
      duration: callData.duration,
      // Include optional properties if they exist
      ...(callData.status && { status: callData.status }),
      ...(callData.end_reason && { end_reason: callData.end_reason }),
      ...(callData.transcript && { transcript: callData.transcript }),
      ...(callData.recording_url && { recording_url: callData.recording_url }),
      ...(callData.metadata && { metadata: callData.metadata }),
      ...(callData.error && { error: callData.error }),
    };

    // Also check webhook logs from our database
    const { data: webhookLogs } = await supabase
      .from('interactions')
      .select('metadata, created_at, updated_at, status')
      .eq('retell_call_id', call_id)
      .single();

    return NextResponse.json({
      retell_logs: logs,
      database_logs: webhookLogs,
      interaction_metadata: interaction.metadata,
    });
  } catch (error: any) {
    logRetellError(error, 'Call Logs');
    return NextResponse.json(
      { 
        error: formatRetellError(error),
        details: error.message,
      },
      { status: error.status || 500 }
    );
  }
}

