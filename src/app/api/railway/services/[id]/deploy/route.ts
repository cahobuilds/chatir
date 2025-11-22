import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createDeployment, getServiceDomain } from '@/lib/railway';
import { logger } from '@/lib/logger';

/**
 * POST /api/railway/services/:id/deploy - Trigger deployment (System Admin Only)
 */
export async function POST(
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

    // Get service
    const { data: service, error: fetchError } = await adminSupabase
      .from('notion_mcp_services')
      .select('railway_service_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    if (!service.railway_service_id) {
      return NextResponse.json(
        { error: 'Service has no Railway service ID' },
        { status: 400 }
      );
    }

    // Trigger deployment
    const deployment = await createDeployment(service.railway_service_id);

    // Update service status
    await adminSupabase
      .from('notion_mcp_services')
      .update({
        status: 'deploying',
        deployment_status: deployment.status,
      })
      .eq('id', params.id);

    // Get service domain (may have changed)
    const serviceDomain = await getServiceDomain(service.railway_service_id);
    const serviceUrl = serviceDomain ? `https://${serviceDomain}` : null;
    const healthCheckUrl = serviceDomain ? `https://${serviceDomain}/health` : null;

    if (serviceUrl) {
      await adminSupabase
        .from('notion_mcp_services')
        .update({
          service_url: serviceUrl,
          health_check_url: healthCheckUrl,
        })
        .eq('id', params.id);
    }

    logger.info('Deployment triggered', {
      service_id: params.id,
      deployment_id: deployment.id,
    });

    return NextResponse.json({
      deployment: {
        id: deployment.id,
        status: deployment.status,
        created_at: deployment.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('Unexpected error triggering deployment', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

