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

    // Enrich interaction with agent and tenant data
    const enrichedInteraction = {
      ...interaction,
      agents: agentsMap[interaction.agent_id] || null,
      tenants: tenantsMap[interaction.tenant_id] || null,
    };

    return NextResponse.json({ interaction: enrichedInteraction });
  } catch (error: any) {
    console.error('[Interactions API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

