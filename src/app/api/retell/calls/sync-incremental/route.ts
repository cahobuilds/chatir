import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig, getResellerTenantId } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/retell/calls/sync-incremental - Incremental sync: only fetch new calls since last sync
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id, since_timestamp } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Verify user has access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .eq('status', 'active')
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    // Get the last sync timestamp from tenant settings or use provided timestamp
    let lastSyncTimestamp: number;
    
    if (since_timestamp) {
      lastSyncTimestamp = new Date(since_timestamp).getTime();
    } else {
      // Get last synced call timestamp from database
      const { data: lastInteraction } = await supabase
        .from('interactions')
        .select('started_at')
        .eq('tenant_id', tenant_id)
        .eq('type', 'voice')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      // Default to 1 hour ago if no previous calls
      lastSyncTimestamp = lastInteraction?.started_at 
        ? new Date(lastInteraction.started_at).getTime()
        : Date.now() - (60 * 60 * 1000);
    }

    // Get reseller's Retell API key
    const retellApiKey = await getResellerRetellConfig(tenant_id);
    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Voice provider not connected for this organization.' },
        { status: 400 }
      );
    }

    // Get reseller tenant ID for billing tracking
    const resellerTenantId = await getResellerTenantId(tenant_id);

    // Get agents for this tenant to map Retell agent IDs
    const { data: agents } = await supabase
      .from('agents')
      .select('id, retell_agent_id, name')
      .eq('tenant_id', tenant_id)
      .eq('type', 'voice')
      .not('retell_agent_id', 'is', null);

    if (!agents || agents.length === 0) {
      return NextResponse.json({ 
        synced: 0,
        skipped: 0,
        message: 'No voice agents configured'
      });
    }

    // Create Retell client
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000,
      maxRetries: 2,
    });

    // Create a map of Retell agent IDs to local agent IDs
    const retellAgentIdMap: Record<string, string> = {};
    agents.forEach(agent => {
      if (agent.retell_agent_id) {
        retellAgentIdMap[agent.retell_agent_id] = agent.id;
      }
    });

    const agentIdsToSync = agents.map(a => a.retell_agent_id).filter(Boolean);

    let syncedCount = 0;
    let skippedCount = 0;
    let newCalls: string[] = [];

    try {
      // Fetch only recent calls (limit to 50 for incremental sync)
      const callListResponse = await retellClient.call.list({
        filter_criteria: {
          agent: agentIdsToSync.map((agent_id) => ({ agent_id: agent_id as string })),
          call_status: { op: 'in', type: 'enum', value: ['ended'] },
        },
        limit: 50,
        sort_order: 'descending',
      });

      const calls = callListResponse.items || [];
      
      console.log(`[Incremental Sync] Fetched ${calls.length} recent calls, filtering since ${new Date(lastSyncTimestamp).toISOString()}`);

      // Filter to only new calls since last sync.
      // Note: list items are a union of V3WebCallResponse | V3PhoneCallResponse; this sync
      // only handles phone calls (direction/from_number/to_number are phone-call fields), so
      // we widen to `any` here rather than narrow the union per-field below.
      const newCallsToSync: any[] = calls.filter((call: any) => {
        const callTimestamp = call.start_timestamp || call.end_timestamp;
        return callTimestamp > lastSyncTimestamp;
      });

      console.log(`[Incremental Sync] Found ${newCallsToSync.length} new calls to sync`);

      for (const call of newCallsToSync) {
        const retellAgentId = call.agent_id;
        const localAgentId = retellAgentIdMap[retellAgentId];

        if (!localAgentId) {
          skippedCount++;
          continue;
        }

        // Check if interaction already exists
        const { data: existingInteraction } = await supabase
          .from('interactions')
          .select('id')
          .eq('retell_call_id', call.call_id)
          .single();

        if (existingInteraction) {
          // Update existing interaction with latest data
          const updateData: any = {
            status: call.call_status === 'ended' ? 'completed' : 
                    call.call_status === 'error' ? 'failed' : 'in_progress',
            customer_phone: call.direction === 'inbound' ? call.from_number : call.to_number,
            duration: call.duration_ms ? Math.floor(call.duration_ms / 1000) : null,
            metadata: {
              direction: call.direction,
              call_type: call.call_type,
              disconnection_reason: call.disconnection_reason,
              synced_at: new Date().toISOString(),
              ...call.metadata,
            },
          };

          if (call.end_timestamp) {
            updateData.ended_at = new Date(call.end_timestamp).toISOString();
          }

          await supabase
            .from('interactions')
            .update(updateData)
            .eq('id', existingInteraction.id);

          syncedCount++;
        } else {
          // Create new interaction
          const { error: insertError } = await supabase
            .from('interactions')
            .insert({
              tenant_id,
              agent_id: localAgentId,
              type: 'voice',
              status: call.call_status === 'ended' ? 'completed' : 
                      call.call_status === 'error' ? 'failed' : 'in_progress',
              retell_call_id: call.call_id,
              customer_phone: call.direction === 'inbound' ? call.from_number : call.to_number,
              duration: call.duration_ms ? Math.floor(call.duration_ms / 1000) : null,
              started_at: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : null,
              ended_at: call.end_timestamp ? new Date(call.end_timestamp).toISOString() : null,
              metadata: {
                direction: call.direction,
                call_type: call.call_type,
                disconnection_reason: call.disconnection_reason,
                synced_at: new Date().toISOString(),
                ...call.metadata,
              },
              reseller_tenant_id: resellerTenantId,
            });

          if (!insertError) {
            syncedCount++;
            newCalls.push(call.call_id);
          }
        }
      }
    } catch (error: any) {
      console.error('[Incremental Sync] Error fetching calls from Retell:', error);
      return NextResponse.json(
        { error: `Failed to fetch calls: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      skipped: skippedCount,
      new_calls: newCalls,
      last_sync: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Incremental Sync] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync calls' },
      { status: 500 }
    );
  }
}

// GET /api/retell/calls/sync-incremental - Get sync status and latest calls count
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Get count of interactions in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count: recentCount } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .eq('type', 'voice')
      .gte('started_at', oneHourAgo);

    // Get latest interaction timestamp
    const { data: latestInteraction } = await supabase
      .from('interactions')
      .select('started_at, retell_call_id')
      .eq('tenant_id', tenant_id)
      .eq('type', 'voice')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      recent_calls_count: recentCount || 0,
      latest_call_at: latestInteraction?.started_at || null,
      latest_call_id: latestInteraction?.retell_call_id || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

