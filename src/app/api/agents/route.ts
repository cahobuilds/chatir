import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/agents - Get agents for current user's tenant(s)
export async function GET(request: NextRequest) {
  try {
    // Check environment variables before creating clients
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[Agents API] Missing Supabase environment variables');
      return NextResponse.json(
        { 
          error: 'Server configuration error: Supabase not configured',
          details: 'Please check server environment variables'
        },
        { status: 500 }
      );
    }
    
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[Agents API] Auth error:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system_admin (can access all agents)
    const { data: systemAdminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .single();

    const isSystemAdmin = !!systemAdminCheck;

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type'); // 'voice' or 'chat'

    // If system admin, get all agents using admin client to bypass RLS
    if (isSystemAdmin) {
      let agentsQuery = adminSupabase
        .from('agents')
        .select('*');

      // Apply type filter if provided
      if (typeFilter && ['voice', 'chat'].includes(typeFilter)) {
        agentsQuery = agentsQuery.eq('type', typeFilter);
      }

      const { data: agents, error: agentsError } = await agentsQuery
        .order('created_at', { ascending: false });

      if (agentsError) {
        console.error(`[Agents API] Error fetching agents (system admin):`, agentsError);
        return NextResponse.json({ error: agentsError.message }, { status: 500 });
      }

      console.log(`[Agents API] System admin found ${agents?.length || 0} agents (type: ${typeFilter || 'all'})`);

      return NextResponse.json({ agents: agents || [] });
    }

    // For regular users, get their tenant IDs and check roles
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      console.log(`[Agents API] User ${user.id} has no active tenant access`);
      return NextResponse.json({ agents: [] });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);
    const userRoles = userTenants.map(ut => ut.role);
    
    console.log(`[Agents API] User ${user.id} has access to tenants:`, tenantIds, 'with roles:', userRoles);
    
    // Check if user is admin (tenant_admin, super_admin, organization_admin, manager)
    const isAdmin = userRoles.some(role => 
      ['tenant_admin', 'super_admin', 'organization_admin', 'manager'].includes(role)
    );

    let agentsQuery = supabase
      .from('agents')
      .select('*');

    // Apply tenant filter
    agentsQuery = agentsQuery.in('tenant_id', tenantIds);

    // Apply type filter if provided
    if (typeFilter && ['voice', 'chat'].includes(typeFilter)) {
      agentsQuery = agentsQuery.eq('type', typeFilter);
    }

    // For non-admin users, filter by user_agents assignments
    if (!isAdmin) {
      // Get agent IDs the user has access to
      const { data: userAgentAssignments } = await supabase
        .from('user_agents')
        .select('agent_id')
        .eq('user_id', user.id)
        .in('tenant_id', tenantIds);

      const accessibleAgentIds = userAgentAssignments?.map(ua => ua.agent_id) || [];
      
      if (accessibleAgentIds.length === 0) {
        return NextResponse.json({ agents: [] });
      }

      agentsQuery = agentsQuery.in('id', accessibleAgentIds);
    }

    // Execute query
    const { data: agents, error: agentsError } = await agentsQuery
      .order('created_at', { ascending: false });

    if (agentsError) {
      console.error(`[Agents API] Error fetching agents:`, agentsError);
      return NextResponse.json({ error: agentsError.message }, { status: 500 });
    }

    console.log(`[Agents API] Found ${agents?.length || 0} agents for user ${user.id} (type: ${typeFilter || 'all'})`);

    return NextResponse.json({ agents: agents || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id, name, type, description, configuration, retell_agent_id, retell_phone_number_id } = body;

    if (!tenant_id || !name || !type) {
      return NextResponse.json(
        { error: 'tenant_id, name, and type are required' },
        { status: 400 }
      );
    }

    if (!['chat', 'voice'].includes(type)) {
      return NextResponse.json({ error: 'type must be "chat" or "voice"' }, { status: 400 });
    }

    // Check if user is system_admin (can create agents for any tenant)
    const { data: systemAdminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .single();

    const isSystemAdmin = !!systemAdminCheck;

    // If not system_admin, verify user has access to this tenant
    if (!isSystemAdmin) {
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenant_id)
        .in('role', ['tenant_admin', 'super_admin', 'organization_admin', 'manager', 'agent'])
        .single();

      if (!userTenant) {
        return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
      }
    }

    // Use admin client for system admin to bypass RLS, regular client for others
    const clientToUse = isSystemAdmin ? createAdminClient() : supabase;

    // Create agent
    const { data: agent, error: agentError } = await clientToUse
      .from('agents')
      .insert({
        tenant_id,
        name,
        type,
        description: description || null,
        configuration: configuration || {},
        retell_agent_id: retell_agent_id || null,
        retell_phone_number_id: retell_phone_number_id || null,
        is_active: true,
      })
      .select()
      .single();

    if (agentError) {
      return NextResponse.json({ error: agentError.message }, { status: 500 });
    }

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

