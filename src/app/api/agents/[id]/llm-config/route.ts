// GET /api/agents/[id]/llm-config - Get Retell LLM configuration for an agent
// PATCH /api/agents/[id]/llm-config - Update LLM configuration and sync to Retell
import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { isModelAllowed } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

// GET endpoint to fetch Retell LLM configuration
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

    // Get agent and verify access
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('tenant_id, retell_agent_id, configuration')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', agent.tenant_id)
      .in('role', ['tenant_admin', 'super_admin', 'organization_admin', 'system_admin', 'manager'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!agent.retell_agent_id) {
      return NextResponse.json({ error: 'Agent not linked to Retell AI' }, { status: 400 });
    }

    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not connected for this organization.' },
        { status: 400 }
      );
    }

    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000,
      maxRetries: 3,
    });

    const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
    const retellAgentData = retellAgent as any;

    if (retellAgentData.response_engine?.type === 'retell-llm' && 'llm_id' in retellAgentData.response_engine) {
      const llmId = retellAgentData.response_engine.llm_id;
      const llm = await retellClient.llm.retrieve(llmId);
      const llmData = llm as any;
      
      return NextResponse.json({ 
        llm: {
          model: llmData.model,
          model_temperature: llmData.model_temperature,
          tool_call_strict_mode: llmData.tool_call_strict_mode,
          general_prompt: llmData.general_prompt,
          default_dynamic_variables: llmData.default_dynamic_variables || {},
        }
      });
    } else {
      return NextResponse.json({ error: 'Agent uses custom LLM or no LLM configured' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Retell LLM retrieval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve Retell LLM configuration' },
      { status: 500 }
    );
  }
}

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

    // Get agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, tenant_id, retell_agent_id, configuration')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', agent.tenant_id)
      .in('role', ['tenant_admin', 'super_admin', 'organization_admin', 'system_admin', 'manager'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { model, model_temperature, tool_call_strict_mode, general_prompt, default_dynamic_variables } = body;

    // Only curated models are allowed to be used (when the platform allowlist is set).
    // Checked before any local or Retell-side write so an already-linked agent can't be
    // switched to an unapproved model.
    if (!isModelAllowed(model)) {
      return NextResponse.json(
        { error: `Model '${model}' is not approved for use. Please contact support.` },
        { status: 400 }
      );
    }

    // Update local configuration
    const currentConfig = typeof agent.configuration === 'string' 
      ? JSON.parse(agent.configuration) 
      : agent.configuration || {};

    const updatedConfig = {
      ...currentConfig,
      llm: {
        ...currentConfig.llm,
        model: model !== undefined ? model : currentConfig.llm?.model,
        model_temperature: model_temperature !== undefined ? model_temperature : currentConfig.llm?.model_temperature,
        temperature: model_temperature !== undefined ? model_temperature : currentConfig.llm?.temperature, // Keep both for compatibility
        tool_call_strict_mode: tool_call_strict_mode !== undefined ? tool_call_strict_mode : currentConfig.llm?.tool_call_strict_mode,
      },
      prompt: general_prompt !== undefined ? general_prompt : currentConfig.prompt,
      default_dynamic_variables: default_dynamic_variables !== undefined ? default_dynamic_variables : currentConfig.default_dynamic_variables,
    };

    // Update agent in database
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({ configuration: updatedConfig })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Sync to Retell AI if agent is linked
    if (agent.retell_agent_id) {
      try {
        const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
        
        if (retellApiKey) {
          const retellClient = createRetellClient(retellApiKey, {
            timeout: 30 * 1000,
            maxRetries: 3,
          });

          // Get current Retell agent to check LLM type
          const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
          const retellAgentData = retellAgent as any;

          // If agent uses Retell LLM, update the LLM configuration
          if (retellAgentData?.response_engine?.type === 'retell-llm' && retellAgentData?.response_engine?.llm_id) {
            const llmId = retellAgentData.response_engine.llm_id;
            
            // Retrieve current LLM to preserve required fields
            const currentLlm = await retellClient.llm.retrieve(llmId);
            const currentLlmData = currentLlm as any;

            // Build LLM update payload
            const llmUpdatePayload: any = {
              start_speaker: currentLlmData.start_speaker || 'agent', // Required field
            };

            // Add fields that are provided
            if (model !== undefined) {
              llmUpdatePayload.model = model;
            }
            if (model_temperature !== undefined) {
              llmUpdatePayload.model_temperature = model_temperature;
            }
            if (tool_call_strict_mode !== undefined) {
              llmUpdatePayload.tool_call_strict_mode = tool_call_strict_mode;
            }
            if (general_prompt !== undefined) {
              llmUpdatePayload.general_prompt = general_prompt || null;
            }
            if (default_dynamic_variables !== undefined) {
              llmUpdatePayload.default_dynamic_variables = default_dynamic_variables || {};
            }

            // Update Retell LLM
            await retellClient.llm.update(llmId, llmUpdatePayload);

            return NextResponse.json({
              success: true,
              agent: updatedAgent,
              message: 'LLM configuration updated successfully and synced to Retell',
            });
          } else if (retellAgentData?.response_engine?.type === 'custom-llm') {
            // For custom LLM, only update local config
            return NextResponse.json({
              success: true,
              agent: updatedAgent,
              message: 'LLM configuration updated locally (custom LLM - settings managed by websocket endpoint)',
            });
          } else {
            return NextResponse.json({
              success: true,
              agent: updatedAgent,
              message: 'LLM configuration updated locally',
            });
          }
        } else {
          return NextResponse.json({
            success: true,
            agent: updatedAgent,
            warning: 'LLM configuration updated locally but Retell API key not configured',
          });
        }
      } catch (retellError: any) {
        console.error('Failed to sync LLM config to Retell:', retellError);
        // Return success with warning - local update succeeded
        return NextResponse.json({
          success: true,
          agent: updatedAgent,
          warning: `LLM configuration updated locally but failed to sync to Retell: ${retellError.message}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
      message: 'LLM configuration updated locally',
    });
  } catch (error: any) {
    console.error('LLM config update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update LLM configuration' }, { status: 500 });
  }
}

