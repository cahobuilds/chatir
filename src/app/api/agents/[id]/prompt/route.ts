import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/agents/[id]/prompt - Update only the prompt in agent configuration (admin only)
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

    // First, get the agent to check tenant access
    const { data: agent } = await supabase
      .from('agents')
      .select('tenant_id, configuration')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if user is system_admin (can update any agent)
    const { data: systemAdminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .single();

    const isSystemAdmin = !!systemAdminCheck;

    // If not system_admin, verify user is admin for this tenant
    if (!isSystemAdmin) {
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', agent.tenant_id)
        .in('role', ['tenant_admin', 'super_admin', 'organization_admin'])
        .single();

      if (!userTenant) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { prompt } = body;

    if (prompt === undefined) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // Get current configuration and update only the prompt
    const currentConfig = (agent.configuration as any) || {};
    const updatedConfig = {
      ...currentConfig,
      prompt: prompt,
    };

    // Use admin client for system admin to bypass RLS, regular client for others
    const clientToUse = isSystemAdmin ? createAdminClient() : supabase;

    const { data: updatedAgent, error: updateError } = await clientToUse
      .from('agents')
      .update({ configuration: updatedConfig })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ agent: updatedAgent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

