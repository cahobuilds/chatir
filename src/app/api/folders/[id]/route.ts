import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessTenant, hasPlatformPermission } from '@/lib/permissions-server';

// GET /api/folders/[id] - Get folder by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: folder, error: folderError } = await supabase
      .from('agent_folders')
      .select('*')
      .eq('id', id)
      .single();

    if (folderError) {
      return NextResponse.json({ error: folderError.message }, { status: 500 });
    }

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Verify user has access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', folder.tenant_id)
      .eq('status', 'active')
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ folder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/folders/[id] - Update folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get folder to check tenant access
    const { data: folder } = await supabase
      .from('agent_folders')
      .select('tenant_id')
      .eq('id', id)
      .single();

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Verify user is admin for this tenant
    if (!(await canAccessTenant(user.id, folder.tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, parent_id } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (parent_id !== undefined) updateData.parent_id = parent_id;

    const { data: updatedFolder, error: updateError } = await supabase
      .from('agent_folders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ folder: updatedFolder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/folders/[id] - Delete folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get folder to check tenant access
    const { data: folder } = await supabase
      .from('agent_folders')
      .select('tenant_id')
      .eq('id', id)
      .single();

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Verify user is admin for this tenant
    if (!(await canAccessTenant(user.id, folder.tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check if folder has agents
    const { data: agentsInFolder } = await supabase
      .from('agents')
      .select('id')
      .eq('folder_id', id)
      .limit(1);

    if (agentsInFolder && agentsInFolder.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete folder with agents. Please move or delete agents first.' },
        { status: 400 }
      );
    }

    // Delete folder
    const { error: deleteError } = await supabase
      .from('agent_folders')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

