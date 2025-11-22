import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { encrypt, decrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';

/**
 * GET /api/notion/resources/:id - Get resource details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: resource, error } = await supabase
      .from('notion_resources')
      .select(`
        *,
        tenants (
          id,
          name
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
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

      const hasAccess = userTenants?.some((ut) => ut.tenant_id === resource.tenant_id);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Don't return encrypted token
    const { notion_token_encrypted, ...resourceResponse } = resource;
    return NextResponse.json({ resource: resourceResponse });
  } catch (error: any) {
    logger.error('Unexpected error fetching resource', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notion/resources/:id - Update resource (Tenant Admin)
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

    // Get resource to check tenant
    const { data: resource, error: fetchError } = await supabase
      .from('notion_resources')
      .select('tenant_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Check if user has admin access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', resource.tenant_id)
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
    const { name, notion_token, description, notion_workspace_id, status, is_active } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (notion_workspace_id !== undefined) updates.notion_workspace_id = notion_workspace_id;
    if (status !== undefined) updates.status = status;
    if (is_active !== undefined) updates.is_active = is_active;

    // If token is being updated, encrypt it
    if (notion_token !== undefined) {
      try {
        updates.notion_token_encrypted = encrypt(notion_token);
      } catch (error) {
        logger.error('Failed to encrypt Notion token', error);
        return NextResponse.json(
          { error: 'Failed to encrypt Notion token' },
          { status: 500 }
        );
      }
    }

    const { data: updatedResource, error: updateError } = await adminSupabase
      .from('notion_resources')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update resource', updateError, { resource_id: params.id });
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If token was updated, we may need to update associated Railway services
    if (notion_token !== undefined && updatedResource) {
      // Find all active services using this resource
      const { data: services } = await adminSupabase
        .from('notion_mcp_services')
        .select('id, railway_service_id')
        .eq('notion_resource_id', params.id)
        .eq('status', 'active');

      if (services && services.length > 0) {
        logger.info('Token updated, services may need redeployment', {
          resource_id: params.id,
          service_count: services.length,
        });
        // Note: In a production system, you might want to automatically trigger
        // service updates here, but for now we'll just log it
      }
    }

    // Don't return encrypted token
    const { notion_token_encrypted, ...resourceResponse } = updatedResource;
    return NextResponse.json({ resource: resourceResponse });
  } catch (error: any) {
    logger.error('Unexpected error updating resource', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notion/resources/:id - Delete resource (Tenant Admin)
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

    // Get resource to check tenant
    const { data: resource, error: fetchError } = await supabase
      .from('notion_resources')
      .select('tenant_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Check if user has admin access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', resource.tenant_id)
      .in('role', ['tenant_admin', 'organization_admin', 'super_admin', 'system_admin'])
      .eq('status', 'active')
      .single();

    if (!userTenant) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required for this tenant' },
        { status: 403 }
      );
    }

    // Check if resource is used by any services
    const { data: services, error: serviceError } = await adminSupabase
      .from('notion_mcp_services')
      .select('id')
      .eq('notion_resource_id', params.id)
      .limit(1);

    if (serviceError) {
      logger.error('Failed to check service usage', serviceError);
    }

    if (services && services.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete resource: it is used by one or more services' },
        { status: 400 }
      );
    }

    // Delete resource
    const { error: deleteError } = await adminSupabase
      .from('notion_resources')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      logger.error('Failed to delete resource', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Unexpected error deleting resource', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

