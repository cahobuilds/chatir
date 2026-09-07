import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig, getResellerTenantId } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/retell/chats/sync - Sync historical chat conversations from Retell AI
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
    const isAdmin = ['tenant_admin', 'super_admin', 'system_admin', 'organization_admin', 'manager'].includes(userTenant.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get reseller's Retell API key
    const retellApiKey = await getResellerRetellConfig(tenant_id);
    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not connected for this organization.' },
        { status: 400 }
      );
    }

    // Get reseller tenant ID for billing tracking
    const resellerTenantId = await getResellerTenantId(tenant_id);

    // Get chat agents for this tenant to map Retell agent IDs
    const { data: agents } = await supabase
      .from('agents')
      .select('id, retell_agent_id, name')
      .eq('tenant_id', tenant_id)
      .eq('type', 'chat')
      .not('retell_agent_id', 'is', null);

    if (!agents || agents.length === 0) {
      return NextResponse.json({ 
        error: 'No chat agents found with Retell agent IDs for this tenant' 
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

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // Fetch chats from Retell
      // Note: chat.list() doesn't seem to support filtering by agent_id in the SDK
      // We'll fetch all chats and filter client-side
      const chatListResponse = await retellClient.chat.list();
      
      const chats = Array.isArray(chatListResponse) ? chatListResponse : (chatListResponse as any).chats || [];
      console.log(`[Chat Sync] Fetched ${chats.length} chats from Retell`);

      // Filter chats by agent_id and date range
      let filteredChats = chats.filter((chat: any) => {
        // Filter by agent_id
        if (!agentIdsToSync.includes(chat.agent_id)) {
          return false;
        }

        // Filter by date range if provided
        if (start_date || end_date) {
          const chatStart = chat.start_timestamp;
          if (!chatStart) return false;
          
          const startTimestamp = start_date ? new Date(start_date).getTime() : 0;
          const endTimestamp = end_date ? new Date(end_date).getTime() : Date.now();
          
          return chatStart >= startTimestamp && chatStart <= endTimestamp;
        }

        return true;
      });

      // Limit results
      if (limit) {
        filteredChats = filteredChats.slice(0, limit);
      }

      console.log(`[Chat Sync] Filtered to ${filteredChats.length} chats after filtering`);

      // Process each chat and create/update interaction records
      for (const chat of filteredChats) {
        try {
          const retellAgentId = chat.agent_id;
          const localAgentId = retellAgentIdMap[retellAgentId];

          if (!localAgentId) {
            console.warn(`[Chat Sync] No local agent found for Retell agent ${retellAgentId}`);
            skippedCount++;
            continue;
          }

          // Check if interaction already exists
          const { data: existingInteraction } = await supabase
            .from('interactions')
            .select('id')
            .eq('retell_conversation_id', chat.chat_id)
            .single();

          // Calculate message count from transcript
          let messageCount = 0;
          if (chat.message_with_tool_calls && Array.isArray(chat.message_with_tool_calls)) {
            messageCount = chat.message_with_tool_calls.length;
          }

          // Extract customer email/phone from metadata or dynamic variables
          const customerEmail = chat.collected_dynamic_variables?.email || 
                                chat.collected_dynamic_variables?.customer_email ||
                                chat.metadata?.email ||
                                null;
          const customerPhone = chat.collected_dynamic_variables?.phone || 
                               chat.collected_dynamic_variables?.customer_phone ||
                               chat.metadata?.phone ||
                               null;

          // Calculate duration if timestamps are available
          let duration: number | null = null;
          if (chat.start_timestamp && chat.end_timestamp) {
            duration = Math.floor((chat.end_timestamp - chat.start_timestamp) / 1000); // Convert ms to seconds
          }

          if (existingInteraction) {
            // Update existing interaction
            const updateData: any = {
              status: chat.chat_status === 'ended' ? 'completed' : 
                      chat.chat_status === 'error' ? 'failed' : 'in_progress',
              customer_email: customerEmail,
              customer_phone: customerPhone,
              duration: duration,
              transcript: chat.message_with_tool_calls || chat.transcript || null,
              metadata: {
                chat_status: chat.chat_status,
                message_count: messageCount,
                chat_analysis: chat.chat_analysis,
                chat_cost: chat.chat_cost,
                ...chat.metadata,
              },
            };

            if (chat.end_timestamp) {
              updateData.ended_at = new Date(chat.end_timestamp).toISOString();
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
              type: 'chat',
              status: chat.chat_status === 'ended' ? 'completed' : 
                      chat.chat_status === 'error' ? 'failed' : 'in_progress',
              retell_conversation_id: chat.chat_id,
              customer_email: customerEmail,
              customer_phone: customerPhone,
              duration: duration,
              transcript: chat.message_with_tool_calls || chat.transcript || null,
              metadata: {
                chat_status: chat.chat_status,
                message_count: messageCount,
                chat_analysis: chat.chat_analysis,
                chat_cost: chat.chat_cost,
                ...chat.metadata,
              },
              reseller_tenant_id: resellerTenantId,
            };

            if (chat.start_timestamp) {
              insertData.started_at = new Date(chat.start_timestamp).toISOString();
            }

            if (chat.end_timestamp) {
              insertData.ended_at = new Date(chat.end_timestamp).toISOString();
            }

            const { error: insertError } = await supabase
              .from('interactions')
              .insert(insertData);

            if (insertError) {
              console.error(`[Chat Sync] Error creating interaction for chat ${chat.chat_id}:`, insertError);
              errorCount++;
              errors.push(`Chat ${chat.chat_id}: ${insertError.message}`);
            } else {
              syncedCount++;
            }
          }
        } catch (error: any) {
          console.error(`[Chat Sync] Error processing chat ${chat.chat_id}:`, error);
          errorCount++;
          errors.push(`Chat ${chat.chat_id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error('[Chat Sync] Error fetching chats from Retell:', error);
      return NextResponse.json(
        { error: `Failed to fetch chats from Retell: ${error.message}` },
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
    console.error('[Chat Sync] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync chats' },
      { status: 500 }
    );
  }
}

