import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/retell/agents/sync - Sync agents from Retell AI to local database
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Verify user has access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .in('role', ['tenant_admin', 'super_admin', 'system_admin'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    // Get tenant's Retell API key
    const { data: tenant } = await supabase
      .from('tenants')
      .select('retell_api_key')
      .eq('id', tenant_id)
      .single();

    if (!tenant?.retell_api_key) {
      return NextResponse.json(
        { error: 'Tenant Retell API key not configured. Please configure it in tenant settings.' },
        { status: 400 }
      );
    }

    // List agents from Retell AI
    const retellClient = createRetellClient(tenant.retell_api_key);
    const retellAgents = await retellClient.agent.list();

    // Get existing agents for this tenant
    const { data: existingAgents } = await supabase
      .from('agents')
      .select('retell_agent_id, id')
      .eq('tenant_id', tenant_id);

    const existingRetellIds = new Set(
      existingAgents?.map(a => a.retell_agent_id).filter(Boolean) || []
    );

    const syncedAgents = [];
    const errors = [];

    // Sync each Retell agent
    for (const retellAgent of retellAgents) {
      try {
        // Determine agent type based on Retell agent configuration
        // Voice agents typically have voice_id, chat agents might have different config
        const agentType = retellAgent.voice_id ? 'voice' : 'chat';

        if (existingRetellIds.has(retellAgent.agent_id)) {
          // Update existing agent
          const existingAgent = existingAgents?.find(a => a.retell_agent_id === retellAgent.agent_id);
          if (existingAgent) {
            const { data: updatedAgent, error: updateError } = await supabase
              .from('agents')
              .update({
                name: retellAgent.agent_name || `Retell Agent ${retellAgent.agent_id}`,
                type: agentType,
                configuration: {
                  ...retellAgent,
                  retell_agent_id: retellAgent.agent_id,
                },
                retell_agent_id: retellAgent.agent_id,
              })
              .eq('id', existingAgent.id)
              .select()
              .single();

            if (updateError) throw updateError;
            syncedAgents.push({ action: 'updated', agent: updatedAgent });
          }
        } else {
          // Create new agent
          const { data: newAgent, error: createError } = await supabase
            .from('agents')
            .insert({
              tenant_id,
              name: retellAgent.agent_name || `Retell Agent ${retellAgent.agent_id}`,
              type: agentType,
              description: `Synced from Retell AI on ${new Date().toISOString()}`,
              configuration: {
                ...retellAgent,
                retell_agent_id: retellAgent.agent_id,
              },
              retell_agent_id: retellAgent.agent_id,
              is_active: true,
            })
            .select()
            .single();

          if (createError) throw createError;
          syncedAgents.push({ action: 'created', agent: newAgent });
        }
      } catch (error: any) {
        errors.push({
          retell_agent_id: retellAgent.agent_id,
          error: error.message || 'Failed to sync agent',
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedAgents.length,
      errors: errors.length,
      agents: syncedAgents,
      errors_list: errors,
    });
  } catch (error: any) {
    console.error('Retell AI agent sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync Retell AI agents' },
      { status: 500 }
    );
  }
}

