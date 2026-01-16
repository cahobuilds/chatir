import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { encrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';

/**
 * POST /api/notion/resources - Create a Notion resource (Tenant Admin)
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

    const body = await request.json();
    const { tenant_id, name, notion_token, description, notion_workspace_id } = body;

    if (!tenant_id || !name || !notion_token) {
      return NextResponse.json(
        { error: 'tenant_id, name, and notion_token are required' },
        { status: 400 }
      );
    }

    // Check if user has admin access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .in('role', ['tenant_admin', 'organization_admin', 'super_admin', 'system_admin'])
      .eq('status', 'active')
      .single();

    if (!userTenant) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required for this tenant' },
        { status: 403 }
      );
    }

    // Encrypt Notion token
    let encryptedToken: string;
    try {
      encryptedToken = encrypt(notion_token);
    } catch (error) {
      logger.error('Failed to encrypt Notion token', error);
      return NextResponse.json(
        { error: 'Failed to encrypt Notion token' },
        { status: 500 }
      );
    }

    // Create Notion resource
    const { data: resource, error: createError } = await adminSupabase
      .from('notion_resources')
      .insert({
        tenant_id,
        name,
        notion_token_encrypted: encryptedToken,
        notion_workspace_id: notion_workspace_id || null,
        description: description || null,
        status: 'active',
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      logger.error('Failed to create Notion resource', createError, { tenant_id, name });
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    logger.info('Notion resource created', {
      resource_id: resource.id,
      tenant_id,
      name,
    });

    // Return resource without encrypted token
    const { notion_token_encrypted, ...resourceResponse } = resource;
    return NextResponse.json({ resource: resourceResponse }, { status: 201 });
  } catch (error: any) {
    logger.error('Unexpected error creating Notion resource', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notion/resources - List Notion resources (filtered by tenant)
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
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin', 'super_admin'])
      .eq('status', 'active')
      .single();

    const isSystemAdmin = !!userTenant;

    let query = supabase.from('notion_resources').select(`
      id,
      tenant_id,
      name,
      description,
      notion_workspace_id,
      accessible_pages,
      last_synced_at,
      is_active,
      status,
      error_message,
      created_at,
      updated_at,
      tenants (
        id,
        name
      )
    `);

    if (isSystemAdmin) {
      // System admin can see all resources, optionally filtered by tenant
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
    } else {
      // Regular users can only see resources in their tenants
      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!userTenants || userTenants.length === 0) {
        return NextResponse.json({ resources: [] });
      }

      const tenantIds = userTenants.map((ut) => ut.tenant_id);
      query = query.in('tenant_id', tenantIds);

      if (tenantId && !tenantIds.includes(tenantId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data: resources, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch Notion resources', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ resources: resources || [] });
  } catch (error: any) {
    logger.error('Unexpected error fetching Notion resources', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

