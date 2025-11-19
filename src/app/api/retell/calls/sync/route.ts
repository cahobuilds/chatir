import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig, getResellerTenantId } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/retell/calls/sync - Sync historical calls from Retell AI
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id, agent_id, start_date, end_date, limit = 100 } = body;

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

    // Check if user has admin role
    const isAdmin = ['tenant_admin', 'super_admin', 'system_admin'].includes(userTenant.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get reseller's Retell API key
    const retellApiKey = await getResellerRetellConfig(tenant_id);
    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller.' },
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
        error: 'No voice agents found with Retell agent IDs for this tenant' 
      }, { status: 400 });
    }

    // Create Retell client
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 60 * 1000, // 60 seconds for sync operations
      maxRetries: 2,
    });

    // Create a map of Retell agent IDs to local agent IDs
    const retellAgentIdMap: Record<string, string> = {};
    agents.forEach(agent => {
      if (agent.retell_agent_id) {
        retellAgentIdMap[agent.retell_agent_id] = agent.id;
      }
    });

    // Filter agents if specific agent_id provided
    const agentIdsToSync = agent_id 
      ? agents.filter(a => a.id === agent_id).map(a => a.retell_agent_id).filter(Boolean)
      : agents.map(a => a.retell_agent_id).filter(Boolean);

    if (agentIdsToSync.length === 0) {
      return NextResponse.json({ 
        error: 'No agents found to sync' 
      }, { status: 400 });
    }

    // Note: Retell SDK may not have a direct list() method for calls
    // We'll need to retrieve calls by agent_id and date range
    // For now, we'll try to use the SDK's call methods
    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Build filter criteria for Retell API
    const filterCriteria: any = {
      agent_id: agentIdsToSync,
      call_status: ['ended'], // Only sync completed calls
    };

    // Add date range if provided
    if (start_date || end_date) {
      // Retell API uses timestamp filters, but we'll filter by call_status='ended' 
      // and then filter results by date range
      // Note: Retell SDK doesn't seem to have direct date filters in filter_criteria
      // We'll fetch all ended calls and filter client-side if needed
    }

    // Fetch calls from Retell
    let allCalls: any[] = [];
    let paginationKey: string | undefined;
    const maxCalls = Math.min(limit, 1000); // Retell max is 1000 per request

    try {
      // Fetch calls with pagination
      do {
        const callListResponse = await retellClient.call.list({
          filter_criteria: filterCriteria,
          limit: maxCalls,
          pagination_key: paginationKey,
          sort_order: 'descending', // Most recent first
        });

        const calls = Array.isArray(callListResponse) ? callListResponse : (callListResponse as any).calls || [];
        allCalls = allCalls.concat(calls);

        // Check if there are more pages
        if (calls.length < maxCalls) {
          break; // No more pages
        }

        // Set pagination key for next page (use last call_id)
        paginationKey = calls[calls.length - 1]?.call_id;
      } while (allCalls.length < limit && paginationKey);

      console.log(`[Call Sync] Fetched ${allCalls.length} calls from Retell`);

      // Filter by date range if provided (client-side filtering)
      if (start_date || end_date) {
        const startTimestamp = start_date ? new Date(start_date).getTime() : 0;
        const endTimestamp = end_date ? new Date(end_date).getTime() : Date.now();

        allCalls = allCalls.filter((call: any) => {
          const callStart = call.start_timestamp;
          return callStart >= startTimestamp && callStart <= endTimestamp;
        });
      }

      // Process each call and create/update interaction records
      for (const call of allCalls) {
        try {
          const retellAgentId = call.agent_id;
          const localAgentId = retellAgentIdMap[retellAgentId];

          if (!localAgentId) {
            console.warn(`[Call Sync] No local agent found for Retell agent ${retellAgentId}`);
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
            // Update existing interaction
            const updateData: any = {
              status: call.call_status === 'ended' ? 'completed' : 
                      call.call_status === 'error' ? 'failed' : 'in_progress',
              customer_phone: call.direction === 'inbound' ? call.from_number : call.to_number,
              duration: call.duration_ms ? Math.floor(call.duration_ms / 1000) : null, // Convert ms to seconds
              metadata: {
                direction: call.direction,
                call_type: call.call_type,
                disconnection_reason: call.disconnection_reason,
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
            const insertData: any = {
              tenant_id,
              agent_id: localAgentId,
              type: 'voice',
              status: call.call_status === 'ended' ? 'completed' : 
                      call.call_status === 'error' ? 'failed' : 'in_progress',
              retell_call_id: call.call_id,
              customer_phone: call.direction === 'inbound' ? call.from_number : call.to_number,
              duration: call.duration_ms ? Math.floor(call.duration_ms / 1000) : null,
              metadata: {
                direction: call.direction,
                call_type: call.call_type,
                disconnection_reason: call.disconnection_reason,
                ...call.metadata,
              },
              reseller_tenant_id: resellerTenantId,
            };

            if (call.start_timestamp) {
              insertData.started_at = new Date(call.start_timestamp).toISOString();
            }

            if (call.end_timestamp) {
              insertData.ended_at = new Date(call.end_timestamp).toISOString();
            }

            const { error: insertError } = await supabase
              .from('interactions')
              .insert(insertData);

            if (insertError) {
              console.error(`[Call Sync] Error creating interaction for call ${call.call_id}:`, insertError);
              errorCount++;
              errors.push(`Call ${call.call_id}: ${insertError.message}`);
            } else {
              syncedCount++;
            }
          }
        } catch (error: any) {
          console.error(`[Call Sync] Error processing call ${call.call_id}:`, error);
          errorCount++;
          errors.push(`Call ${call.call_id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error('[Call Sync] Error fetching calls from Retell:', error);
      return NextResponse.json(
        { error: `Failed to fetch calls from Retell: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      skipped: skippedCount,
      errors: errorCount,
      error_details: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Call Sync] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync calls' },
      { status: 500 }
    );
  }
}

