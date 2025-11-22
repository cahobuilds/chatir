import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * PATCH /api/agents/:agentId/notion-services/:serviceId - Update assignment (Tenant Admin)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { agentId: string; serviceId: string } }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get assignment
    const { data: assignment, error: assignError } = await supabase
      .from('agent_notion_services')
      .select('tenant_id')
      .eq('agent_id', params.agentId)
      .eq('notion_mcp_service_id', params.serviceId)
      .single();

    if (assignError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if user has admin access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', assignment.tenant_id)
      .in('role', ['tenant_admin', 'organization_admin', 'super_admin', 'system_admin'])
      .eq('status', 'active')
      .single();

    if (!userTenant) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required for this tenant' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { priority, configuration, is_active } = body;

    const updates: any = {};
    if (priority !== undefined) updates.priority = priority;
    if (configuration !== undefined) updates.configuration = configuration;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data: updatedAssignment, error: updateError } = await adminSupabase
      .from('agent_notion_services')
      .update(updates)
      .eq('agent_id', params.agentId)
      .eq('notion_mcp_service_id', params.serviceId)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update assignment', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ assignment: updatedAssignment });
  } catch (error: any) {
    logger.error('Unexpected error updating assignment', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/:agentId/notion-services/:serviceId - Remove assignment (Tenant Admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { agentId: string; serviceId: string } }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get assignment
    const { data: assignment, error: assignError } = await supabase
      .from('agent_notion_services')
      .select('tenant_id')
      .eq('agent_id', params.agentId)
      .eq('notion_mcp_service_id', params.serviceId)
      .single();

    if (assignError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if user has admin access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', assignment.tenant_id)
      .in('role', ['tenant_admin', 'organization_admin', 'super_admin', 'system_admin'])
      .eq('status', 'active')
      .single();

    if (!userTenant) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required for this tenant' },
        { status: 403 }
      );
    }

    // Remove from agent configuration
    const { data: agent } = await adminSupabase
      .from('agents')
      .select('configuration')
      .eq('id', params.agentId)
      .single();

    if (agent && agent.configuration?.mcp_services) {
      const mcpServices = agent.configuration.mcp_services.filter(
        (s: any) => s.id !== params.serviceId
      );

      await adminSupabase
        .from('agents')
        .update({
          configuration: {
            ...agent.configuration,
            mcp_services: mcpServices,
          },
        })
        .eq('id', params.agentId);
    }

    // Delete assignment
    const { error: deleteError } = await adminSupabase
      .from('agent_notion_services')
      .delete()
      .eq('agent_id', params.agentId)
      .eq('notion_mcp_service_id', params.serviceId);

    if (deleteError) {
      logger.error('Failed to delete assignment', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    logger.info('Service assignment removed', {
      agent_id: params.agentId,
      service_id: params.serviceId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Unexpected error deleting assignment', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

