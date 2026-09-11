import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { hasPlatformPermission } from '@/lib/permissions-server';
import {
  createRailwayService,
  updateServiceVariables,
  createDeployment,
  getServiceDomain,
  getDefaultProjectId,
  listRailwayServices,
} from '@/lib/railway';
import { decrypt } from '@/lib/encryption';

/**
 * POST /api/railway/services - Create a new Railway service (System Admin Only)
 */
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { tenant_id, notion_resource_id, service_name, description, source } = body;

    if (!tenant_id || !notion_resource_id || !service_name) {
      return NextResponse.json(
        { error: 'tenant_id, notion_resource_id, and service_name are required' },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get Notion resource and decrypt token
    const { data: notionResource, error: resourceError } = await adminSupabase
      .from('notion_resources')
      .select('id, name, notion_token_encrypted, tenant_id')
      .eq('id', notion_resource_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (resourceError || !notionResource) {
      return NextResponse.json({ error: 'Notion resource not found' }, { status: 404 });
    }

    // Decrypt Notion token
    let notionToken: string;
    try {
      notionToken = decrypt(notionResource.notion_token_encrypted);
    } catch (error) {
      console.error('[Railway Services API] Failed to decrypt Notion token:', error);
      return NextResponse.json(
        { error: 'Failed to decrypt Notion token' },
        { status: 500 }
      );
    }

    // Generate unique service name
    const railwayServiceName = `notion-${tenant_id.substring(0, 8)}-${service_name.toLowerCase().replace(/\s+/g, '-')}`;

    console.log('[Railway Services API] Creating Railway service:', {
      tenant_id,
      notion_resource_id,
      service_name: railwayServiceName,
    });

    // Get Railway project ID
    const projectId = getDefaultProjectId();

    // Create Railway service
    let railwayService;
    try {
      railwayService = await createRailwayService(projectId, railwayServiceName, source);
      console.log('[Railway Services API] Railway service created:', {
        service_id: railwayService.id,
        service_name: railwayService.name,
      });
    } catch (error: any) {
      console.error('[Railway Services API] Failed to create Railway service:', error);
      return NextResponse.json(
        { error: `Failed to create Railway service: ${error.message}` },
        { status: 500 }
      );
    }

    // Set environment variables (NOTION_TOKEN)
    try {
      await updateServiceVariables(railwayService.id, [
        { name: 'NOTION_TOKEN', value: notionToken },
      ]);
      console.log('[Railway Services API] Service environment variables set:', { service_id: railwayService.id });
    } catch (error: any) {
      console.error('[Railway Services API] Failed to set service environment variables:', error);
      // Continue anyway - variables can be set later
    }

    // Create database record
    const { data: mcpService, error: dbError } = await adminSupabase
      .from('notion_mcp_services')
      .insert({
        tenant_id,
        notion_resource_id,
        railway_service_id: railwayService.id,
        railway_service_name: railwayServiceName,
        name: service_name,
        description: description || null,
        status: 'creating',
        created_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Railway Services API] Failed to create database record:', dbError, {
        railway_service_id: railwayService.id,
      });
      // Try to clean up Railway service
      try {
        // Note: Railway API might not have delete immediately, but we'll mark it for cleanup
        console.warn('[Railway Services API] Database insert failed, Railway service may need manual cleanup', {
          railway_service_id: railwayService.id,
        });
      } catch (cleanupError) {
        console.error('[Railway Services API] Failed to cleanup Railway service:', cleanupError);
      }
      return NextResponse.json(
        { error: 'Failed to create database record' },
        { status: 500 }
      );
    }

    // Trigger deployment (async - don't wait)
    createDeployment(railwayService.id)
      .then((deployment) => {
        console.log('[Railway Services API] Deployment triggered:', {
          service_id: railwayService.id,
          deployment_id: deployment.id,
        });
        // Update status to deploying
        adminSupabase
          .from('notion_mcp_services')
          .update({ status: 'deploying', deployment_status: deployment.status })
          .eq('id', mcpService.id)
          .then(() => {
            console.log('[Railway Services API] Service status updated to deploying:', {
              service_id: mcpService.id,
            });
          });
      })
      .catch((error) => {
        console.error('[Railway Services API] Failed to trigger deployment:', error, {
          service_id: railwayService.id,
        });
        // Update status to error
        adminSupabase
          .from('notion_mcp_services')
          .update({ status: 'error', deployment_status: 'failed' })
          .eq('id', mcpService.id);
      });

    // Get service domain (may be null initially)
    const serviceDomain = await getServiceDomain(railwayService.id);
    const serviceUrl = serviceDomain ? `https://${serviceDomain}` : null;
    const healthCheckUrl = serviceDomain ? `https://${serviceDomain}/health` : null;

    // Update with domain if available
    if (serviceUrl) {
      await adminSupabase
        .from('notion_mcp_services')
        .update({ service_url: serviceUrl, health_check_url: healthCheckUrl })
        .eq('id', mcpService.id);
    }

    return NextResponse.json(
      {
        id: mcpService.id,
        railway_service_id: railwayService.id,
        railway_service_name: railwayServiceName,
        service_url: serviceUrl,
        health_check_url: healthCheckUrl,
        status: 'creating',
        tenant_id,
        notion_resource_id,
        name: service_name,
        description,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Railway Services API] Unexpected error creating Railway service:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/railway/services - List Railway services (System Admin or filtered by tenant)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');

    // Check if user is system admin
    const isSystemAdmin = await hasPlatformPermission(user.id, 'orgs.view');

    // Build base query - fetch services first, then relations separately to avoid hanging
    let query = adminSupabase
      .from('notion_mcp_services')
      .select('*');

    if (isSystemAdmin) {
      // System admin can see all services, optionally filtered by tenant
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
    } else {
      // Regular users can only see services in their tenants
      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!userTenants || userTenants.length === 0) {
        return NextResponse.json({ services: [] });
      }

      const userTenantIds = userTenants.map((ut) => ut.tenant_id);
      query = query.in('tenant_id', userTenantIds);

      if (tenantId && !userTenantIds.includes(tenantId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Use a simpler query first - just get services without relations
    const { data: services, error } = await query
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100); // Add limit to prevent large queries

    if (error) {
      console.error('[Railway Services API] Failed to fetch services:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return services without relations for now to avoid timeout
    // Relations can be fetched client-side if needed
    return NextResponse.json({ services: services || [] });
  } catch (error: any) {
    console.error('[Railway Services API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

