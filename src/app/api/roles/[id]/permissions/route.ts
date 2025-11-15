import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/roles/[id]/permissions - Get permissions for a role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', id)
      .order('permission_id');

    if (permError) {
      return NextResponse.json({ error: permError.message }, { status: 500 });
    }

    return NextResponse.json({
      permissions: permissions?.map(p => p.permission_id) || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/roles/[id]/permissions - Add permissions to role
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system_admin
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (userTenants?.role !== 'system_admin') {
      return NextResponse.json({ error: 'Forbidden: System admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { permission_ids } = body;

    if (!Array.isArray(permission_ids) || permission_ids.length === 0) {
      return NextResponse.json(
        { error: 'permission_ids array is required' },
        { status: 400 }
      );
    }

    const permissionInserts = permission_ids.map((permissionId: string) => ({
      role_id: id,
      permission_id: permissionId,
    }));

    const { error: insertError } = await supabase
      .from('role_permissions')
      .upsert(permissionInserts, { onConflict: 'role_id,permission_id' });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/roles/[id]/permissions - Remove permissions from role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system_admin
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (userTenants?.role !== 'system_admin') {
      return NextResponse.json({ error: 'Forbidden: System admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const permissionIds = searchParams.get('permission_ids');

    if (!permissionIds) {
      return NextResponse.json(
        { error: 'permission_ids query parameter is required' },
        { status: 400 }
      );
    }

    const ids = permissionIds.split(',');

    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', id)
      .in('permission_id', ids);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

