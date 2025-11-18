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
    const { tenant_id, type, published_only } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Validate type if provided
    if (type && !['chat', 'voice'].includes(type)) {
      return NextResponse.json({ error: 'type must be "chat" or "voice"' }, { status: 400 });
    }

    // Validate published_only if provided
    const filterPublished = published_only === true || published_only === 'true';

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
    if (filterPublished) {
      console.log(`[Sync] Filtering for published agents only`);
    }

    // If filtering by published status, check each agent's published status
    // Note: agent.list() may not include is_published, so we need to retrieve each agent
    let agentsToSync = retellAgents;
    if (filterPublished) {
      console.log(`[Sync] Checking published status for ${retellAgents.length} agents...`);
      const publishedAgents = [];
      let checkedCount = 0;
      
      // Check if list response already includes is_published
      const firstAgent = retellAgents[0] as any;
      const hasPublishedInList = firstAgent && 'is_published' in firstAgent;
      
      if (hasPublishedInList) {
        // List response includes is_published, filter directly
        console.log(`[Sync] List response includes is_published, filtering directly...`);
        agentsToSync = retellAgents.filter((agent: any) => agent.is_published === true);
        console.log(`[Sync] Found ${agentsToSync.length} published agents out of ${retellAgents.length} total`);
      } else {
        // Need to retrieve each agent to check published status
        // Process in batches to avoid overwhelming the API
        const batchSize = 10;
        for (let i = 0; i < retellAgents.length; i += batchSize) {
          const batch = retellAgents.slice(i, i + batchSize);
          const batchPromises = batch.map(async (retellAgent) => {
            try {
              // Retrieve full agent details to check published status
              const agentDetails = await retellClient.agent.retrieve(retellAgent.agent_id);
              const agentData = agentDetails as any;
              const isPublished = agentData.is_published || false;
              
              if (isPublished) {
                return retellAgent;
              } else {
                console.log(`[Sync] Skipping unpublished agent: ${retellAgent.agent_id} (${retellAgent.agent_name})`);
                return null;
              }
            } catch (error: any) {
              // If we can't retrieve the agent (e.g., chat agents return 400), skip it
              console.warn(`[Sync] Could not check published status for agent ${retellAgent.agent_id}:`, error.message);
              // For chat agents created in dashboard, we can't check via API
              // Skip them to be safe - user can link them manually
              return null;
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          publishedAgents.push(...batchResults.filter(Boolean) as typeof retellAgents);
          
          checkedCount += batch.length;
          if (checkedCount % 20 === 0 || checkedCount === retellAgents.length) {
            console.log(`[Sync] Checked ${checkedCount}/${retellAgents.length} agents...`);
          }
        }
        
        agentsToSync = publishedAgents;
        console.log(`[Sync] Found ${publishedAgents.length} published agents out of ${retellAgents.length} total`);
      }
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

    const syncedAgents: Array<{ action: 'created' | 'updated'; agent: any }> = [];
    const errors: Array<{ retell_agent_id: string; error: string }> = [];
    let skippedByType = 0;
    let skippedByPublished = filterPublished ? retellAgents.length - agentsToSync.length : 0;

    // Sync each Retell agent
    for (const retellAgent of agentsToSync) {
      try {
        // Determine agent type based on Retell agent configuration
        // Priority: llm_websocket_url (chat) > voice_id (voice) > response_engine type > default to chat
        let agentType: 'chat' | 'voice' = 'chat'; // Default to chat
        
        const hasVoiceId = !!retellAgent.voice_id;
        const responseEngine = retellAgent.response_engine;
        
        // Check response_engine first - chat agents with llm_websocket_url are chat even if they have voice_id
        if (responseEngine && typeof responseEngine === 'object' && responseEngine !== null) {
          const engine = responseEngine as any;
          
          // If it has llm_websocket_url, it's definitely a chat agent
          if (engine.llm_websocket_url) {
            agentType = 'chat';
          } else if (hasVoiceId) {
            // Has voice_id and no llm_websocket_url = voice agent
            agentType = 'voice';
          } else if (engine.type === 'custom-llm' || engine.type === 'retell-llm') {
            // Custom or Retell LLM without voice_id = chat
            agentType = 'chat';
          } else if (engine.llm_id && !hasVoiceId) {
            // Has llm_id but no voice_id = chat
            agentType = 'chat';
          }
        } else {
          // No response_engine - check voice_id
          if (hasVoiceId) {
            agentType = 'voice';
          } else {
            // No voice_id and no response_engine = chat (default)
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

        // Check for duplicate agent_id (Retell sometimes returns duplicates)
        // Use a combination of agent_id + agent_name to create unique identifier
        const agentUniqueKey = `${retellAgent.agent_id}_${retellAgent.agent_name || 'unnamed'}`;
        
        // Check if we've already processed this exact agent in this sync batch
        const alreadyProcessed = syncedAgents.some((a: any) => 
          a.agent?.retell_agent_id === retellAgent.agent_id && 
          a.agent?.name === (retellAgent.agent_name || `Retell Agent ${retellAgent.agent_id}`)
        );
        
        if (alreadyProcessed) {
          console.log(`[Sync] Skipping duplicate agent ${retellAgent.agent_id} (${retellAgent.agent_name}) - already processed in this sync`);
          skippedByType++;
          continue;
        }

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
    if (filterPublished) {
      console.log(`  - Published agents: ${agentsToSync.length}`);
      console.log(`  - Skipped unpublished: ${skippedByPublished}`);
    }
    console.log(`  - Skipped by type filter: ${skippedByType}`);
    console.log(`  - Created: ${createdCount}`);
    console.log(`  - Updated: ${updatedCount}`);
    console.log(`  - Errors: ${errors.length}`);
    
    return NextResponse.json({
      success: true,
      synced: syncedAgents.length,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedByType + skippedByPublished,
      skipped_by_type: skippedByType,
      skipped_by_published: skippedByPublished,
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

