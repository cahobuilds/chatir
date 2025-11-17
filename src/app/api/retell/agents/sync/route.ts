import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
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
    const { tenant_id, type } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Validate type if provided
    if (type && !['chat', 'voice'].includes(type)) {
      return NextResponse.json({ error: 'type must be "chat" or "voice"' }, { status: 400 });
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

    // Get reseller's Retell API key (organizations inherit from reseller)
    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.' },
        { status: 400 }
      );
    }

    // List agents from Retell AI using reseller's API key
    const retellClient = createRetellClient(retellApiKey);
    const retellAgents = await retellClient.agent.list();

    console.log(`[Sync] Found ${retellAgents.length} total agents from Retell for tenant ${tenant_id}`);
    if (type) {
      console.log(`[Sync] Filtering for type: ${type}`);
    }

    // Get existing agents for this tenant (including type to check for type changes)
    const { data: existingAgents } = await supabase
      .from('agents')
      .select('retell_agent_id, id, type')
      .eq('tenant_id', tenant_id);

    const existingRetellIds = new Set(
      existingAgents?.map(a => a.retell_agent_id).filter(Boolean) || []
    );

    console.log(`[Sync] Found ${existingAgents?.length || 0} existing agents in database for tenant ${tenant_id}`);

    const syncedAgents = [];
    const errors = [];
    let skippedByType = 0;

    // Sync each Retell agent
    for (const retellAgent of retellAgents) {
      try {
        // Determine agent type based on Retell agent configuration
        // Priority: voice_id > response_engine type > default to chat
        let agentType: 'chat' | 'voice' = 'chat'; // Default to chat
        
        // If voice_id exists, it's definitely a voice agent
        if (retellAgent.voice_id) {
          agentType = 'voice';
        } else {
          // No voice_id means it's likely a chat agent
          // But check response_engine to be sure
          if (retellAgent.response_engine) {
            const responseEngine = retellAgent.response_engine;
            
            // If response_engine is an object
            if (typeof responseEngine === 'object' && responseEngine !== null) {
              // Check if it's a string (simple case)
              if (typeof responseEngine === 'string') {
                // String response_engine without voice_id is chat
                agentType = 'chat';
              } else {
                // Object response_engine
                const engine = responseEngine as any;
                
                // Check type property
                if (engine.type === 'custom-llm') {
                  // Custom LLM is typically chat (unless it has voice_id, which we already checked)
                  agentType = 'chat';
                } else if (engine.type === 'retell-llm') {
                  // Retell LLM without voice_id is chat
                  agentType = 'chat';
                }
                
                // If it has llm_websocket_url, it's definitely chat
                if (engine.llm_websocket_url) {
                  agentType = 'chat';
                }
                
                // If it has llm_id but no voice_id, it's chat
                if (engine.llm_id && !retellAgent.voice_id) {
                  agentType = 'chat';
                }
              }
            }
          }
          
          // Final check: if no voice_id and no clear voice indicators, it's chat
          // This catches edge cases where response_engine might be missing or malformed
          if (!retellAgent.voice_id) {
            agentType = 'chat';
          }
        }
        
        // If type filter is provided, skip agents that don't match
        if (type && agentType !== type) {
          skippedByType++;
          console.log(`[Sync] Skipping agent ${retellAgent.agent_id} (${retellAgent.agent_name}): detected type=${agentType}, filter=${type}`);
          continue;
        }
        
        console.log(`[Sync] Processing agent ${retellAgent.agent_id} (${retellAgent.agent_name}): type=${agentType}, voice_id=${retellAgent.voice_id || 'none'}, response_engine=${JSON.stringify(retellAgent.response_engine)}`);

        if (existingRetellIds.has(retellAgent.agent_id)) {
          // Update existing agent (including type in case it changed)
          const existingAgent = existingAgents?.find(a => a.retell_agent_id === retellAgent.agent_id);
          if (existingAgent) {
            // Check if type changed
            const typeChanged = existingAgent.type !== agentType;
            if (typeChanged) {
              console.log(`[Sync] Type changed for agent ${retellAgent.agent_id}: ${existingAgent.type} -> ${agentType}`);
            }
            
            const { data: updatedAgent, error: updateError } = await supabase
              .from('agents')
              .update({
                name: retellAgent.agent_name || `Retell Agent ${retellAgent.agent_id}`,
                type: agentType, // Always update type in case it changed
                configuration: {
                  ...retellAgent,
                  retell_agent_id: retellAgent.agent_id,
                },
                retell_agent_id: retellAgent.agent_id,
              })
              .eq('id', existingAgent.id)
              .select()
              .single();

            if (updateError) {
              console.error(`[Sync] Error updating agent ${retellAgent.agent_id}:`, updateError);
              throw updateError;
            }
            console.log(`[Sync] Updated agent ${retellAgent.agent_id} (${updatedAgent?.name})`);
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

          if (createError) {
            console.error(`[Sync] Error creating agent ${retellAgent.agent_id}:`, createError);
            throw createError;
          }
          console.log(`[Sync] Created new agent ${retellAgent.agent_id} (${newAgent?.name}) as type ${agentType}`);
          syncedAgents.push({ action: 'created', agent: newAgent });
        }
      } catch (error: any) {
        errors.push({
          retell_agent_id: retellAgent.agent_id,
          error: error.message || 'Failed to sync agent',
        });
      }
    }

    const createdCount = syncedAgents.filter(a => a.action === 'created').length;
    const updatedCount = syncedAgents.filter(a => a.action === 'updated').length;
    
    console.log(`[Sync] Summary for tenant ${tenant_id}:`);
    console.log(`  - Total Retell agents: ${retellAgents.length}`);
    console.log(`  - Skipped by type filter: ${skippedByType}`);
    console.log(`  - Created: ${createdCount}`);
    console.log(`  - Updated: ${updatedCount}`);
    console.log(`  - Errors: ${errors.length}`);
    
    return NextResponse.json({
      success: true,
      synced: syncedAgents.length,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedByType,
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

