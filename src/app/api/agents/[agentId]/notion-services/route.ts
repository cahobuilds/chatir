import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/agents/:agentId/notion-services - Assign service to agent (Tenant Admin)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notion_mcp_service_id, priority, configuration } = body;

    if (!notion_mcp_service_id) {
      return NextResponse.json(
        { error: 'notion_mcp_service_id is required' },
        { status: 400 }
      );
    }

    // Get agent and verify tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, tenant_id')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get service and verify tenant
    const { data: service, error: serviceError } = await supabase
      .from('notion_mcp_services')
      .select('id, tenant_id, status, service_url')
      .eq('id', notion_mcp_service_id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Verify tenant match
    if (agent.tenant_id !== service.tenant_id) {
      return NextResponse.json(
        { error: 'Agent and service must belong to the same tenant' },
        { status: 400 }
      );
    }

    // Verify service is active
    if (service.status !== 'active') {
      return NextResponse.json(
        { error: 'Service is not active' },
        { status: 400 }
      );
    }

    // Check if user has admin access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', agent.tenant_id)
      .in('role', ['tenant_admin', 'organization_admin', 'super_admin', 'system_admin'])
      .eq('status', 'active')
      .single();

    if (!userTenant) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required for this tenant' },
        { status: 403 }
      );
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('agent_notion_services')
      .select('id')
      .eq('agent_id', agentId)
      .eq('notion_mcp_service_id', notion_mcp_service_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Service is already assigned to this agent' },
        { status: 400 }
      );
    }

    // Create assignment
    const { data: assignment, error: assignError } = await adminSupabase
      .from('agent_notion_services')
      .insert({
        agent_id: agentId,
        notion_mcp_service_id,
        tenant_id: agent.tenant_id,
        priority: priority || 0,
        configuration: configuration || {},
        is_active: true,
      })
      .select()
      .single();

    if (assignError) {
      logger.error('Failed to create assignment', assignError, {
        agent_id: agentId,
        service_id: notion_mcp_service_id,
      });
      return NextResponse.json({ error: assignError.message }, { status: 500 });
    }

    // Update agent configuration to include MCP service URL
    const { data: currentAgent } = await adminSupabase
      .from('agents')
      .select('configuration')
      .eq('id', agentId)
      .single();

    if (currentAgent && service.service_url) {
      const currentConfig = currentAgent.configuration || {};
      const mcpServices = currentConfig.mcp_services || [];
      
      // Add service if not already present
      if (!mcpServices.some((s: any) => s.id === notion_mcp_service_id)) {
        mcpServices.push({
          id: notion_mcp_service_id,
          url: service.service_url,
          priority: priority || 0,
        });

        await adminSupabase
          .from('agents')
          .update({
            configuration: {
              ...currentConfig,
              mcp_services: mcpServices,
            },
          })
          .eq('id', agentId);
      }
    }

    logger.info('Service assigned to agent', {
      agent_id: agentId,
      service_id: notion_mcp_service_id,
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error: any) {
    logger.error('Unexpected error assigning service', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/:agentId/notion-services - Get agent's assigned services
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, tenant_id')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check access
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin', 'super_admin'])
      .eq('status', 'active')
      .single();

    const isSystemAdmin = !!userTenant;

    if (!isSystemAdmin) {
      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const hasAccess = userTenants?.some((ut) => ut.tenant_id === agent.tenant_id);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get assignments
    const { data: assignments, error: assignError } = await supabase
      .from('agent_notion_services')
      .select(`
        *,
        notion_mcp_services (
          id,
          name,
          description,
          service_url,
          status,
          health_check_status
        )
      `)
      .eq('agent_id', agentId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (assignError) {
      logger.error('Failed to fetch assignments', assignError);
      return NextResponse.json({ error: assignError.message }, { status: 500 });
    }

    return NextResponse.json({ services: assignments || [] });
  } catch (error: any) {
    logger.error('Unexpected error fetching assignments', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

