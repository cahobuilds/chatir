import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';

// Helper function to enrich interaction with related data
async function enrichInteraction(supabase: any, interaction: any) {
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
      agents.forEach((agent: { id: string; name: string; type: string }) => {
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
      tenants.forEach((tenant: { id: string; name: string }) => {
        tenantsMap[tenant.id] = { name: tenant.name };
      });
    }
  }

  // Fetch call data from Retell if retell_call_id exists
  let retellCallData: any = null;
  if (interaction.retell_call_id && interaction.type === 'voice') {
    try {
      const retellApiKey = await getResellerRetellConfig(interaction.tenant_id);
      if (retellApiKey) {
        const retellClient = createRetellClient(retellApiKey);
        const callData = await retellClient.call.retrieve(interaction.retell_call_id);
        
        // Log call_summary availability for debugging
        if (callData.call_analysis) {
          console.log('[Retell API] call_id:', interaction.retell_call_id, 
            '| call_summary:', callData.call_analysis.call_summary ? 'present' : 'missing',
            '| user_sentiment:', callData.call_analysis.user_sentiment || 'N/A');
        }
        
        retellCallData = callData;
      }
    } catch (error: any) {
      console.error('Failed to fetch Retell call data:', error);
      // Don't fail the request if Retell fetch fails
    }
  }

  // Fetch chat conversation details from Retell if retell_conversation_id exists
  let retellChatData: any = null;
  const chatIdToFetch = interaction.retell_conversation_id || 
                        (interaction.metadata as any)?.retell_chat_id ||
                        (interaction.metadata as any)?.chat_id;
  
  if (chatIdToFetch && interaction.type === 'chat') {
    try {
      const retellApiKey = await getResellerRetellConfig(interaction.tenant_id);
      if (retellApiKey) {
        const retellClient = createRetellClient(retellApiKey);
        const chatData = await retellClient.chat.retrieve(chatIdToFetch);
        retellChatData = chatData;
      }
    } catch (error: any) {
      console.error('Failed to fetch Retell chat data:', error);
      // Don't fail the request if Retell fetch fails
    }
  }

  return {
    ...interaction,
    agents: agentsMap[interaction.agent_id] || null,
    tenants: tenantsMap[interaction.tenant_id] || null,
    retell_call_data: retellCallData,
    retell_chat_data: retellChatData,
  };
}

// GET /api/interactions/[id] - Get a specific interaction by ID
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

    if (interactionError || !interaction) {
      return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
    }

    // Enrich interaction with related data
    const enrichedInteraction = await enrichInteraction(supabase, interaction);

    return NextResponse.json({ interaction: enrichedInteraction });
  } catch (error: any) {
    console.error('Error fetching interaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch interaction' },
      { status: 500 }
    );
  }
}
