import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { hasPlatformPermission, canAccessTenant } from '@/lib/permissions-server';
import { isModelAllowed } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

// Pulls the LLM model out of an incoming agent `configuration` payload, which may arrive as a
// JSON string and may nest the LLM settings under either `llm_config` or `llm` - the same
// lookup the Retell sync below uses when it builds the LLM update payload.
function configuredModel(configuration: unknown): string | undefined {
  let parsed = configuration;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return undefined;
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined;
  const { llm_config, llm } = parsed as {
    llm_config?: { model?: string };
    llm?: { model?: string };
  };
  return (llm_config || llm || {}).model;
}

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

    // Platform staff can access any agent.
    const isSystemAdmin = await hasPlatformPermission(user.id, 'orgs.view');

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

    // Verify user can manage this tenant's agents (or is platform staff).
    if (!(await canAccessTenant(user.id, agent.tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: No access to this agent' }, { status: 403 });
    }

    const body = await request.json();
    const { name, type, description, configuration, retell_agent_id, retell_phone_number_id, is_active } = body;

    // Only curated models are allowed to be used (when the platform allowlist is set).
    // Checked before any local or Retell-side write so an already-linked agent can't be
    // switched to an unapproved model.
    const requestedModel = configuredModel(configuration);
    if (!isModelAllowed(requestedModel)) {
      return NextResponse.json(
        { error: `Model '${requestedModel}' is not approved for use. Please contact support.` },
        { status: 400 }
      );
    }

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
          
          // Update voice configuration - check both nested and top-level locations
          const voiceIdToSync = voiceConfig.voice_id || config.voice_id;
          if (voiceIdToSync) {
            retellUpdatePayload.voice_id = voiceIdToSync;
          }
          
          // Update voice-specific settings (if present in configuration)
          // Check both nested (config.voice.*) and top-level (config.*) locations for backward compatibility
          if (voiceConfig.voice_temperature !== undefined || config.voice_temperature !== undefined) {
            retellUpdatePayload.voice_temperature = voiceConfig.voice_temperature ?? config.voice_temperature;
          }
          if (voiceConfig.voice_speed !== undefined || config.voice_speed !== undefined) {
            retellUpdatePayload.voice_speed = voiceConfig.voice_speed ?? config.voice_speed;
          }
          if (voiceConfig.volume !== undefined || config.volume !== undefined) {
            // Handle volume conversion: UI stores as 0-100 (percentage), Retell expects 0-2 scale
            // Retell: 0-2 scale (2 = 100%), UI: 0-100% scale
            // Conversion: percentage / 50 = Retell value (100% / 50 = 2.0)
            const volumeValue = voiceConfig.volume ?? config.volume;
            retellUpdatePayload.volume = volumeValue > 2 ? volumeValue / 50 : volumeValue;
          }
          if (voiceConfig.responsiveness !== undefined || config.responsiveness !== undefined) {
            retellUpdatePayload.responsiveness = voiceConfig.responsiveness ?? config.responsiveness;
          }
          if (voiceConfig.interruption_sensitivity !== undefined || config.interruption_sensitivity !== undefined) {
            retellUpdatePayload.interruption_sensitivity = voiceConfig.interruption_sensitivity ?? config.interruption_sensitivity;
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
          
          // Handle LLM configuration sync (prompt, model, temperature, tool_call_strict_mode)
          // For Retell LLM: Update the LLM's configuration
          // For Custom LLM: Config is handled by the websocket endpoint (can't update directly)
          // Only sync if configuration was updated
          if (configuration !== undefined) {
            const prompt = config.prompt || 
                          config.system_instructions || 
                          config.systemPrompt ||
                          llmConfig.system_instructions ||
                          llmConfig.prompt;
            
            const model = llmConfig.model;
            const modelTemperature = llmConfig.model_temperature ?? llmConfig.temperature;
            const toolCallStrictMode = llmConfig.tool_call_strict_mode;
            
            // Only sync if we have LLM config changes
            if (prompt !== undefined || model !== undefined || modelTemperature !== undefined || toolCallStrictMode !== undefined) {
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
                  
                  // Build LLM update payload
                  const llmUpdatePayload: any = {
                    start_speaker: currentLlm.start_speaker || 'agent', // Required field
                  };
                  
                  // Add fields that are provided
                  if (prompt !== undefined) {
                    llmUpdatePayload.general_prompt = prompt || null; // null clears the prompt in Retell
                  }
                  if (model !== undefined) {
                    llmUpdatePayload.model = model;
                  }
                  if (modelTemperature !== undefined) {
                    llmUpdatePayload.model_temperature = modelTemperature;
                  }
                  if (toolCallStrictMode !== undefined) {
                    llmUpdatePayload.tool_call_strict_mode = toolCallStrictMode;
                  }
                  
                  // Update the LLM configuration
                  await retellClient.llm.update(llmId, llmUpdatePayload);
                  
                  console.log(`Successfully synced LLM config to Retell LLM ${llmId} for agent ${id}:`, Object.keys(llmUpdatePayload));
                } else if (retellAgent.response_engine?.type === 'custom-llm') {
                  console.log(`Agent ${id} uses custom LLM - LLM config updates must be handled by the LLM websocket endpoint`);
                }
              } catch (llmError: any) {
                console.error(`Failed to sync LLM config to Retell LLM for agent ${id}:`, llmError);
                // Don't fail the entire update if LLM sync fails
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

    // Verify user can manage this tenant's agents (or is platform staff).
    if (!(await canAccessTenant(user.id, agent.tenant_id, 'agents.manage'))) {
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

