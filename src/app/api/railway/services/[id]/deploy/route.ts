import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasPlatformPermission } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';
import { createDeployment, getServiceDomain } from '@/lib/railway';
import { logger } from '@/lib/logger';

/**
 * POST /api/railway/services/:id/deploy - Trigger deployment (System Admin Only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system admin
    if (!(await hasPlatformPermission(user.id, 'orgs.view'))) {
      return NextResponse.json(
        { error: 'Forbidden: Platform access required' },
        { status: 403 }
      );
    }

    // Get service
    const { data: service, error: fetchError } = await adminSupabase
      .from('notion_mcp_services')
      .select('railway_service_id')
      .eq('id', id)
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
      .eq('id', id);

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
        .eq('id', id);
    }

    logger.info('Deployment triggered', {
      service_id: id,
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

