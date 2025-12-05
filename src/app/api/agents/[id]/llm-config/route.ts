// PATCH /api/agents/[id]/llm-config - Update LLM configuration and sync to Retell
import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

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
    const { model, model_temperature, tool_call_strict_mode, general_prompt } = body;

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

