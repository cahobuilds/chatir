import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/user-agents - Get user-agent assignments
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const agentId = searchParams.get('agent_id');
    const tenantId = searchParams.get('tenant_id');

    // Check if user is admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['tenant_admin', 'super_admin', 'organization_admin', 'system_admin'])
      .single();

    const isAdmin = !!userTenant;

    let query = supabase
      .from('user_agents')
      .select('*, agents(id, name, type), users:user_id(id, email)');

    // Non-admins can only see their own assignments
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: assignments, error: assignmentsError } = await query;

    if (assignmentsError) {
      return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
    }

    return NextResponse.json({ assignments: assignments || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/user-agents - Assign agent to user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id, agent_id, tenant_id, access_level, can_test, can_edit_prompt, can_edit_config } = body;

    if (!user_id || !agent_id || !tenant_id) {
      return NextResponse.json(
        { error: 'user_id, agent_id, and tenant_id are required' },
        { status: 400 }
      );
    }

    // Verify current user is admin for this tenant
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

    // Create or update assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('user_agents')
      .upsert({
        user_id,
        agent_id,
        tenant_id,
        access_level: access_level || 'view',
        can_test: can_test !== undefined ? can_test : true,
        can_edit_prompt: can_edit_prompt !== undefined ? can_edit_prompt : false,
        can_edit_config: can_edit_config !== undefined ? can_edit_config : false,
      }, {
        onConflict: 'user_id,agent_id'
      })
      .select()
      .single();

    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    }

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

