import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { canAccessTenant, hasPlatformPermission } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/retell/llms/[id] - Get Retell LLM details including prompt
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

    // Get agent_id from query params to verify access
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');

    if (agentId) {
      // Get agent and verify access
      const { data: agent } = await supabase
        .from('agents')
        .select('tenant_id, retell_agent_id')
        .eq('id', agentId)
        .single();

      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      // Verify user has access
      if (!(await canAccessTenant(user.id, agent.tenant_id, 'agents.manage'))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Get reseller's Retell API key
      const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

      if (!retellApiKey) {
        return NextResponse.json(
          { error: 'Retell AI not connected for this organization.' },
          { status: 400 }
        );
      }

      // Get Retell LLM details using reseller's API key
      const retellClient = createRetellClient(retellApiKey);
      const llm = await retellClient.llm.retrieve(id);

      return NextResponse.json({ llm });
    } else {
      // No agent_id provided: only platform staff can fetch a raw LLM.
      // Check if user is platform staff
      const isPlatform = await hasPlatformPermission(user.id, 'orgs.view');

      if (!isPlatform) {
        return NextResponse.json({ error: 'Agent ID required for non-admin users' }, { status: 400 });
      }

      // For platform staff, use the user's first active tenant's key.
      const { data: firstTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      const tenantId = firstTenant?.tenant_id;
      if (!tenantId) {
        return NextResponse.json({ error: 'No tenant available' }, { status: 400 });
      }
      const retellApiKey = await getResellerRetellConfig(tenantId);

      if (!retellApiKey) {
        return NextResponse.json(
          { error: 'Retell AI not configured.' },
          { status: 400 }
        );
      }

      const retellClient = createRetellClient(retellApiKey);
      const llm = await retellClient.llm.retrieve(id);

      return NextResponse.json({ llm });
    }
  } catch (error: any) {
    console.error('Retell LLM retrieval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve Retell LLM' },
      { status: 500 }
    );
  }
}

