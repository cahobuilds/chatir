import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/interactions/[id] - Get interaction by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant IDs
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ error: 'No access' }, { status: 403 });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);

    // Get interaction
    const { data: interaction, error: interactionError } = await supabase
      .from('interactions')
      .select('*')
      .eq('id', id)
      .in('tenant_id', tenantIds)
      .single();

    if (interactionError) {
      return NextResponse.json({ error: interactionError.message }, { status: 500 });
    }

    if (!interaction) {
      return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
    }

    // Fetch related agent and tenant data
    const agentIds = [interaction.agent_id];
    const tenantIdsToFetch = [interaction.tenant_id];

    let agentsMap: Record<string, { name: string; type: string }> = {};
    let tenantsMap: Record<string, { name: string }> = {};

    if (agentIds.length > 0) {
      const { data: agents } = await supabase
        .from('agents')
        .select('id, name, type')
        .in('id', agentIds);
      
      if (agents) {
        agents.forEach(agent => {
          agentsMap[agent.id] = { name: agent.name, type: agent.type };
        });
      }
    }

    if (tenantIdsToFetch.length > 0) {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name')
        .in('id', tenantIdsToFetch);
      
      if (tenants) {
        tenants.forEach(tenant => {
          tenantsMap[tenant.id] = { name: tenant.name };
        });
      }
    }

    // Fetch call details from Retell if retell_call_id exists
    let retellCallData: any = null;
    if (interaction.retell_call_id) {
      try {
        const { getResellerRetellConfig } = await import('@/lib/reseller');
        const { createRetellClient } = await import('@/lib/retell');
        
        const retellApiKey = await getResellerRetellConfig(interaction.tenant_id);
        if (retellApiKey) {
          const retellClient = createRetellClient(retellApiKey, {
            timeout: 20 * 1000,
            maxRetries: 2,
          });
          
          retellCallData = await retellClient.call.retrieve(interaction.retell_call_id);
        }
      } catch (error: any) {
        console.error('[Interactions API] Error fetching Retell call data:', error);
        // Don't fail the request if Retell fetch fails
      }
    }

    // Fetch chat conversation details from Retell if retell_conversation_id exists
    let retellChatData: any = null;
    if (interaction.retell_conversation_id && interaction.type === 'chat') {
      try {
        const { getResellerRetellConfig } = await import('@/lib/reseller');
        const { createRetellClient } = await import('@/lib/retell');
        
        const retellApiKey = await getResellerRetellConfig(interaction.tenant_id);
        if (retellApiKey) {
          const retellClient = createRetellClient(retellApiKey, {
            timeout: 20 * 1000,
            maxRetries: 2,
          });
          
          // Retell SDK: chat.retrieve(chat_id) - fetch conversation details
          retellChatData = await retellClient.chat.retrieve(interaction.retell_conversation_id);
        }
      } catch (error: any) {
        console.error('[Interactions API] Error fetching Retell chat data:', error);
        // Don't fail the request if Retell fetch fails
      }
    }

    // Enrich interaction with agent and tenant data
    const enrichedInteraction = {
      ...interaction,
      agents: agentsMap[interaction.agent_id] || null,
      tenants: tenantsMap[interaction.tenant_id] || null,
      // Add Retell call data (transcript, recording URLs, etc.)
      retell_call_data: retellCallData ? {
        transcript: retellCallData.transcript,
        transcript_object: retellCallData.transcript_object,
        transcript_with_tool_calls: retellCallData.transcript_with_tool_calls,
        recording_url: retellCallData.recording_url,
        recording_multi_channel_url: retellCallData.recording_multi_channel_url,
        scrubbed_recording_url: retellCallData.scrubbed_recording_url,
        call_analysis: retellCallData.call_analysis,
      } : null,
      // Add Retell chat data (messages, metadata, etc.)
      retell_chat_data: retellChatData ? {
        chat_id: retellChatData.chat_id || interaction.retell_conversation_id,
        messages: retellChatData.message_with_tool_calls || retellChatData.messages || [],
        start_timestamp: retellChatData.start_timestamp,
        end_timestamp: retellChatData.end_timestamp,
        chat_status: retellChatData.chat_status,
        chat_analysis: retellChatData.chat_analysis,
        chat_cost: retellChatData.chat_cost,
        collected_dynamic_variables: retellChatData.collected_dynamic_variables,
        metadata: retellChatData.metadata,
        agent_id: retellChatData.agent_id,
      } : null,
    };

    return NextResponse.json({ interaction: enrichedInteraction });
  } catch (error: any) {
    console.error('[Interactions API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

