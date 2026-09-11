import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { hasPlatformPermission } from '@/lib/permissions-server';
import { logger } from '@/lib/logger';

/**
 * GET /api/railway/services/:id/health - Check service health
 */
export async function GET(
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

    // Get service
    const { data: service, error: fetchError } = await supabase
      .from('notion_mcp_services')
      .select('health_check_url, tenant_id')
      .eq('id', id)
      .single();

    if (fetchError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Check access
    const isSystemAdmin = await hasPlatformPermission(user.id, 'orgs.view');

    if (!isSystemAdmin) {
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

    if (!service.health_check_url) {
      return NextResponse.json({
        status: 'unknown',
        message: 'Health check URL not available',
      });
    }

    // Perform health check
    const startTime = Date.now();
    let healthStatus: 'healthy' | 'unhealthy' | 'unknown' = 'unknown';
    let responseTime: number | null = null;

    try {
      const response = await fetch(service.health_check_url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      responseTime = Date.now() - startTime;
      healthStatus = response.ok ? 'healthy' : 'unhealthy';
    } catch (error: any) {
      responseTime = Date.now() - startTime;
      healthStatus = 'unhealthy';
      logger.error('Health check failed', error, {
        service_id: id,
        health_check_url: service.health_check_url,
      });
    }

    // Update database with health check result
    await adminSupabase
      .from('notion_mcp_services')
      .update({
        last_health_check: new Date().toISOString(),
        health_check_status: healthStatus,
      })
      .eq('id', id);

    return NextResponse.json({
      status: healthStatus,
      last_check: new Date().toISOString(),
      response_time_ms: responseTime,
    });
  } catch (error: any) {
    logger.error('Unexpected error checking health', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

