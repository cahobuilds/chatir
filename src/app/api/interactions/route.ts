import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/interactions - Get interactions for user's tenants
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');
    const agent_id = searchParams.get('agent_id');
    const status = searchParams.get('status');
    const type = searchParams.get('type'); // Filter by interaction type: 'voice' or 'chat'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's tenant IDs
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ interactions: [], total: 0 });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);

    // Build query - fetch interactions first without joins to avoid RLS issues
    let query = supabase
      .from('interactions')
      .select('*', { count: 'exact' })
      .in('tenant_id', tenantIds)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tenant_id && tenantIds.includes(tenant_id)) {
      query = query.eq('tenant_id', tenant_id);
    }

    if (agent_id) {
      query = query.eq('agent_id', agent_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: interactions, error: interactionsError, count } = await query;

    if (interactionsError) {
      console.error('[Interactions API] Query error:', interactionsError);
      return NextResponse.json({ 
        error: interactionsError.message || 'Failed to fetch interactions',
        details: interactionsError 
      }, { status: 500 });
    }

    // Fetch related agents and tenants separately to avoid RLS join issues
    const agentIds = [...new Set((interactions || []).map(i => i.agent_id))];
    const tenantIdsToFetch = [...new Set((interactions || []).map(i => i.tenant_id))];

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

    // Enrich interactions with agent and tenant data
    const enrichedInteractions = (interactions || []).map(interaction => ({
      ...interaction,
      agents: agentsMap[interaction.agent_id] || null,
      tenants: tenantsMap[interaction.tenant_id] || null,
    }));

    return NextResponse.json({
      interactions: enrichedInteractions,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[Interactions API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

