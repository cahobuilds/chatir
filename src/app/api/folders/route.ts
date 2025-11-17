import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/folders - Get folders for current user's tenant(s)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Verify user has access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    // Get folders for the tenant
    // Check if agent_folders table exists first
    const { data: folders, error: foldersError } = await supabase
      .from('agent_folders')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    if (foldersError) {
      // If table doesn't exist or schema cache is stale (PGRST205), return empty array
      if (
        foldersError.message?.includes('does not exist') || 
        foldersError.code === '42P01' ||
        foldersError.code === 'PGRST205' ||
        foldersError.message?.includes('schema cache')
      ) {
        console.warn('agent_folders table not available (may be schema cache issue), returning empty array:', foldersError.code);
        return NextResponse.json({ folders: [] });
      }
      console.error('Folders API error:', foldersError);
      return NextResponse.json({ error: foldersError.message }, { status: 500 });
    }

    return NextResponse.json({ folders: folders || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/folders - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id, name, description, parent_id } = body;

    if (!tenant_id || !name) {
      return NextResponse.json(
        { error: 'tenant_id and name are required' },
        { status: 400 }
      );
    }

    // Verify user is admin for this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .in('role', ['tenant_admin', 'super_admin', 'organization_admin', 'system_admin'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Create folder
    const { data: folder, error: folderError } = await supabase
      .from('agent_folders')
      .insert({
        tenant_id,
        name,
        description: description || null,
        parent_id: parent_id || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (folderError) {
      return NextResponse.json({ error: folderError.message }, { status: 500 });
    }

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

