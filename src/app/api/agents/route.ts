import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasPlatformPermission, canAccessTenant } from '@/lib/permissions-server';
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

    // Platform staff can access all agents.
    const isSystemAdmin = await hasPlatformPermission(user.id, 'orgs.view');

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

    // For regular users, get their tenant IDs and check roles.
    // Select both the canonical role name (via role_id -> roles.name) and the legacy `role`
    // text column, since not every row is guaranteed to be backfilled yet (Phase 1b pending).
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id, role, role_id, roles(name)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      console.log(`[Agents API] User ${user.id} has no active tenant access`);
      return NextResponse.json({ agents: [] });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);
    const userRoles = userTenants.map((ut: any) => {
      const nested = Array.isArray(ut.roles) ? ut.roles[0] : ut.roles;
      return nested?.name ?? ut.role;
    });

    console.log(`[Agents API] User ${user.id} has access to tenants:`, tenantIds, 'with roles:', userRoles);

    // Admin = holds a role with agents.manage in the canonical model (company_admin/editor) or a
    // platform role, OR (transition period only) an un-backfilled legacy admin-equivalent role.
    const ADMIN_ROLE_NAMES = [
      'company_admin', 'company_editor',
      'platform_admin', 'platform_operator',
      // Legacy text values -- only matter for rows not yet backfilled to role_id:
      'tenant_admin', 'super_admin', 'organization_admin', 'manager',
    ];
    const isAdmin = userRoles.some(role => role && ADMIN_ROLE_NAMES.includes(role));

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

    // Verify user can manage this tenant's agents (or is platform staff).
    if (!(await canAccessTenant(user.id, tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    // Use admin client for the write (access verified above).
    const clientToUse = createAdminClient();

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

