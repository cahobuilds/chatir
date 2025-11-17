import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/agents/[id] - Get agent by ID
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

    // Check if user is system_admin (can access any agent)
    const { data: systemAdminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .single();

    const isSystemAdmin = !!systemAdminCheck;

    // Use admin client for system admin to bypass RLS, regular client for others
    const clientToUse = isSystemAdmin ? createAdminClient() : supabase;

    // Get agent (RLS will ensure user can only access agents from their tenant, unless system_admin)
    const { data: agent, error: agentError } = await clientToUse
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (agentError) {
      return NextResponse.json({ error: agentError.message }, { status: 500 });
    }

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/agents/[id] - Update agent
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

    // First, get the agent to check tenant access and get current retell_agent_id
    const { data: agent } = await supabase
      .from('agents')
      .select('tenant_id, retell_agent_id, name, type, configuration')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify user has access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', agent.tenant_id)
      .in('role', ['tenant_admin', 'super_admin', 'agent'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: No access to this agent' }, { status: 403 });
    }

    const body = await request.json();
    const { name, type, description, configuration, retell_agent_id, retell_phone_number_id, is_active } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (configuration !== undefined) updateData.configuration = configuration;
    if (retell_agent_id !== undefined) updateData.retell_agent_id = retell_agent_id;
    if (retell_phone_number_id !== undefined) updateData.retell_phone_number_id = retell_phone_number_id;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Sync to Retell AI if agent is linked to Retell
    const retellAgentId = updatedAgent.retell_agent_id || agent.retell_agent_id;
    if (retellAgentId && updatedAgent.type === 'voice') {
      try {
        // Get reseller's Retell API key
        const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
        
        if (retellApiKey) {
          const retellClient = createRetellClient(retellApiKey);
          
          // Prepare Retell update payload
          // Map local configuration to Retell format
          const config = typeof updatedAgent.configuration === 'string' 
            ? JSON.parse(updatedAgent.configuration) 
            : updatedAgent.configuration || {};
          
          const voiceConfig = config.voice || {};
          const llmConfig = config.llm_config || config.llm || {};
          
          // Build Retell update payload - sync all relevant fields
          const retellUpdatePayload: any = {};
          
          // Always update agent name (use updated name or keep current)
          retellUpdatePayload.agent_name = name !== undefined ? name : updatedAgent.name;
          
          // Update voice configuration if present
          if (voiceConfig.voice_id) {
            retellUpdatePayload.voice_id = voiceConfig.voice_id;
          }
          
          // Update LLM websocket URL if present (for custom LLM)
          if (llmConfig.llm_websocket_url) {
            retellUpdatePayload.llm_websocket_url = llmConfig.llm_websocket_url;
          }
          
          // Update other Retell-specific fields from configuration
          if (config.language) retellUpdatePayload.language = config.language;
          if (config.enable_transcription !== undefined) retellUpdatePayload.enable_transcription = config.enable_transcription;
          if (config.enable_recording !== undefined) retellUpdatePayload.enable_recording = config.enable_recording;
          if (config.enable_voicemail_detection !== undefined) retellUpdatePayload.enable_voicemail_detection = config.enable_voicemail_detection;
          if (config.voicemail_message) retellUpdatePayload.voicemail_message = config.voicemail_message;
          if (config.enable_end_call_function_enabled !== undefined) retellUpdatePayload.enable_end_call_function_enabled = config.enable_end_call_function_enabled;
          if (config.end_call_function_id) retellUpdatePayload.end_call_function_id = config.end_call_function_id;
          if (config.enable_transfer_call !== undefined) retellUpdatePayload.enable_transfer_call = config.enable_transfer_call;
          if (config.transfer_call_function_id) retellUpdatePayload.transfer_call_function_id = config.transfer_call_function_id;
          if (config.enable_language_detection !== undefined) retellUpdatePayload.enable_language_detection = config.enable_language_detection;
          
          // Always sync to Retell when agent is linked (even if only name changed)
          // This ensures 2-way sync is maintained
          await retellClient.agent.update(retellAgentId, retellUpdatePayload);
          console.log(`Successfully synced agent ${id} (${retellAgentId}) to Retell AI with fields:`, Object.keys(retellUpdatePayload));
          
          // Handle prompt/system instructions sync
          // For Retell LLM: Update the LLM's general_prompt
          // For Custom LLM: Prompt is handled by the websocket endpoint (can't update directly)
          // Only sync prompt if configuration was updated
          if (configuration !== undefined) {
            const prompt = config.prompt || 
                          config.system_instructions || 
                          config.systemPrompt ||
                          llmConfig.system_instructions ||
                          llmConfig.prompt;
            
            // Only sync if we have a prompt value (empty string means clear it)
            if (prompt !== undefined && prompt !== null) {
              try {
                // Get the agent from Retell to find the LLM ID
                const retellAgent = await retellClient.agent.retrieve(retellAgentId);
                
                // Check if agent uses Retell LLM (not custom LLM)
                if (retellAgent.response_engine && 
                    retellAgent.response_engine.type === 'retell-llm' &&
                    'llm_id' in retellAgent.response_engine) {
                  const llmId = retellAgent.response_engine.llm_id;
                  
                  // Retrieve current LLM configuration to preserve required fields
                  const currentLlm = await retellClient.llm.retrieve(llmId);
                  
                  // Update the LLM's general_prompt (empty string clears it)
                  // Must include start_speaker as it's required
                  await retellClient.llm.update(llmId, {
                    start_speaker: currentLlm.start_speaker || 'agent', // Preserve existing or default to 'agent'
                    general_prompt: prompt || null, // null clears the prompt in Retell
                  });
                  
                  console.log(`Successfully synced prompt to Retell LLM ${llmId} for agent ${id}`);
                } else if (retellAgent.response_engine?.type === 'custom-llm') {
                  console.log(`Agent ${id} uses custom LLM - prompt updates must be handled by the LLM websocket endpoint`);
                }
              } catch (promptError: any) {
                console.error(`Failed to sync prompt to Retell LLM for agent ${id}:`, promptError);
                // Don't fail the entire update if prompt sync fails
              }
            }
          }
          
          // Note: Description field cannot be synced to Retell as it doesn't exist in Retell's agent model
          // The description is only stored in our local database and is used for internal reference only
        } else {
          console.warn(`Retell API key not configured for tenant ${agent.tenant_id}, skipping Retell sync`);
        }
      } catch (retellError: any) {
        // Log error but don't fail the update - database update succeeded
        console.error('Failed to sync agent to Retell AI:', retellError);
        // Return success with a warning about Retell sync failure
        return NextResponse.json({ 
          agent: updatedAgent,
          warning: `Agent updated in database but failed to sync to Retell AI: ${retellError.message}`
        });
      }
    }

    return NextResponse.json({ agent: updatedAgent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/agents/[id] - Delete agent
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

    // First, get the agent to check tenant access
    const { data: agent } = await supabase
      .from('agents')
      .select('tenant_id')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify user is tenant_admin or super_admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', agent.tenant_id)
      .in('role', ['tenant_admin', 'super_admin'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('agents')
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

