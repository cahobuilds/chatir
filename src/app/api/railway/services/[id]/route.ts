import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  getRailwayService,
  deleteRailwayService,
  getServiceDomain,
  updateServiceVariables,
  createDeployment,
} from '@/lib/railway';
import { logger } from '@/lib/logger';

/**
 * GET /api/railway/services/:id - Get service details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: service, error } = await supabase
      .from('notion_mcp_services')
      .select(`
        *,
        notion_resources (
          id,
          name,
          status
        ),
        tenants (
          id,
          name
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
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
      // Check if user has access to this tenant
      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const hasAccess = userTenants?.some((ut) => ut.tenant_id === service.tenant_id);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ service });
  } catch (error: any) {
    logger.error('Unexpected error fetching service', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/railway/services/:id - Update service (System Admin Only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin', 'super_admin'])
      .eq('status', 'active')
      .single();

    if (!userTenant) {
      return NextResponse.json(
        { error: 'Forbidden: System admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, status } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;

    const { data: service, error } = await adminSupabase
      .from('notion_mcp_services')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update service', error, { service_id: params.id });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({ service });
  } catch (error: any) {
    logger.error('Unexpected error updating service', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/railway/services/:id - Delete service (System Admin Only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin', 'super_admin'])
      .eq('status', 'active')
      .single();

    if (!userTenant) {
      return NextResponse.json(
        { error: 'Forbidden: System admin access required' },
        { status: 403 }
      );
    }

    // Get service details
    const { data: service, error: fetchError } = await adminSupabase
      .from('notion_mcp_services')
      .select('railway_service_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Check if service is assigned to any agents
    const { data: assignments, error: assignmentError } = await adminSupabase
      .from('agent_notion_services')
      .select('id')
      .eq('notion_mcp_service_id', params.id)
      .eq('is_active', true)
      .limit(1);

    if (assignmentError) {
      logger.error('Failed to check service assignments', assignmentError);
    }

    if (assignments && assignments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete service: it is assigned to one or more agents' },
        { status: 400 }
      );
    }

    // Delete Railway service
    if (service.railway_service_id) {
      try {
        await deleteRailwayService(service.railway_service_id);
        logger.info('Railway service deleted', {
          railway_service_id: service.railway_service_id,
        });
      } catch (error: any) {
        logger.error('Failed to delete Railway service', error, {
          railway_service_id: service.railway_service_id,
        });
        // Continue with database deletion anyway
      }
    }

    // Delete database record
    const { error: deleteError } = await adminSupabase
      .from('notion_mcp_services')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      logger.error('Failed to delete service record', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Unexpected error deleting service', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

