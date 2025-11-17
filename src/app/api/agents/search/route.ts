import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/agents/search - Search for agents by Retell agent ID
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const retell_agent_id = searchParams.get('retell_agent_id');

    if (!retell_agent_id) {
      return NextResponse.json({ error: 'retell_agent_id parameter is required' }, { status: 400 });
    }

    // Check if user is system_admin (can search all agents)
    const { data: systemAdminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .single();

    const isSystemAdmin = !!systemAdminCheck;

    // Use admin client for system admin to bypass RLS, regular client for others
    const clientToUse = isSystemAdmin ? adminSupabase : supabase;

    // Search for agent by retell_agent_id
    let query = clientToUse
      .from('agents')
      .select('*, tenants(name, id)')
      .eq('retell_agent_id', retell_agent_id);

    // If not system admin, filter by user's tenant access
    if (!isSystemAdmin) {
      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!userTenants || userTenants.length === 0) {
        return NextResponse.json({ agents: [] });
      }

      const tenantIds = userTenants.map(ut => ut.tenant_id);
      query = query.in('tenant_id', tenantIds);
    }

    const { data: agents, error: agentsError } = await query;

    if (agentsError) {
      return NextResponse.json({ error: agentsError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      agents: agents || [],
      found: (agents || []).length > 0,
      retell_agent_id 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

