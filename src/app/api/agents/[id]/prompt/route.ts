import { createClient } from '@/lib/supabase/server';
import { createRetellClient, retrieveAgent } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { canAccessTenant } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/agents/[id]/prompt - Update agent prompt and sync to Retell
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

    // Get agent and verify access
    const { data: agent } = await supabase
      .from('agents')
      .select('tenant_id, retell_agent_id, configuration, type')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify user can manage this tenant's agents (or is platform staff).
    if (!(await canAccessTenant(user.id, agent.tenant_id, 'agents.manage'))) {
      return NextResponse.json({ 
        error: 'Forbidden: You need agent management access to update prompts.' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required and must be a string' }, { status: 400 });
    }

    // Update local database configuration
    let currentConfig: any = {};
    if (agent.configuration) {
      currentConfig = typeof agent.configuration === 'string' 
        ? JSON.parse(agent.configuration) 
        : agent.configuration;
    }

    // Update prompt in configuration
    const updatedConfig = {
      ...currentConfig,
      prompt: prompt,
      system_instructions: prompt, // Also update common field names
      systemPrompt: prompt,
      llm_config: {
        ...currentConfig.llm_config,
        system_instructions: prompt,
        prompt: prompt,
      },
    };

    // Update local agent configuration
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({
        configuration: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update agent configuration:', updateError);
      return NextResponse.json({ error: 'Failed to update agent configuration' }, { status: 500 });
    }

    // If agent has Retell agent ID, sync prompt to Retell
    if (agent.retell_agent_id) {
      try {
        // Get reseller's Retell API key
        const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

        if (!retellApiKey) {
          console.warn('Retell API key not configured - prompt updated locally but not synced to Retell');
          return NextResponse.json({
            success: true,
            agent: updatedAgent,
            warning: 'Prompt updated locally but voice provider API key not configured - prompt not synced to the voice provider',
          });
        }

        // Create Retell client
        const retellClient = createRetellClient(retellApiKey, {
          timeout: 30 * 1000,
          maxRetries: 3,
        });

        // Get current Retell agent details to check LLM type
        const retellAgent = await retrieveAgent(retellClient, agent.retell_agent_id, agent.type);
        const retellAgentData = retellAgent as any;

        // If agent uses Retell LLM, update the LLM prompt
        if (retellAgentData?.response_engine?.type === 'retell-llm' && retellAgentData?.response_engine?.llm_id) {
          const llmId = retellAgentData.response_engine.llm_id;
          
          // Update Retell LLM prompt
          await retellClient.llm.update(llmId, {
            general_prompt: prompt,
          });

          return NextResponse.json({
            success: true,
            agent: updatedAgent,
            message: 'Prompt updated successfully and synced to the voice provider',
          });
        } else {
          // For custom LLM or other types, the prompt is managed by the websocket endpoint
          // Still return success since local config is updated
          return NextResponse.json({
            success: true,
            agent: updatedAgent,
            message: 'Prompt updated successfully (custom LLM - prompt managed by websocket endpoint)',
          });
        }
      } catch (retellError: any) {
        // Log error but don't fail - local update was successful
        logRetellError(retellError, 'Prompt Sync to Retell');
        console.error('Failed to sync prompt to Retell:', retellError);
        
        return NextResponse.json({
          success: true,
          agent: updatedAgent,
          warning: 'Prompt updated locally but failed to sync to the voice provider: ' + formatRetellError(retellError),
        });
      }
    }

    // If no Retell agent ID, just return success for local update
    return NextResponse.json({
      success: true,
      agent: updatedAgent,
      message: 'Prompt updated successfully',
    });

  } catch (error: any) {
    console.error('Prompt update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update prompt' },
      { status: 500 }
    );
  }
}