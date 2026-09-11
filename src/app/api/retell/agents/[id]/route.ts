import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { canAccessTenant } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/retell/agents/[id] - Get Retell AI agent details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check environment variables before creating client
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[Retell Agent API] Missing Supabase environment variables');
      return NextResponse.json(
        { 
          error: 'Server configuration error: Supabase not configured',
          details: 'Please check server environment variables'
        },
        { status: 500 }
      );
    }
    
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[Retell Agent API] Auth error:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agent and verify access
    const { data: agent } = await supabase
      .from('agents')
      .select('tenant_id, retell_agent_id')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify user has access
    if (!(await canAccessTenant(user.id, agent.tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!agent.retell_agent_id) {
      return NextResponse.json({ error: 'Agent not linked to the voice provider' }, { status: 400 });
    }

    // Get reseller's Retell API key (organizations inherit from reseller)
    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Voice provider not connected for this organization. Please connect it in Settings.' },
        { status: 400 }
      );
    }

    // Create Retell client with enhanced configuration for retrieving agent
    // Standard timeout (20s) and default retries (2) for read operations
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 20 * 1000, // 20 seconds for retrieval operations
      maxRetries: 2, // Default retries for transient failures
    });

    // Get Retell AI agent details using reseller's API key
    const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
    const retellAgentData = retellAgent as any;

    // Extract channel information for chat agent detection
    const channel = retellAgentData.channel || null;
    const isPublished = retellAgentData.is_published || false;

    return NextResponse.json({ 
      retell_agent: retellAgent,
      channel: channel, // 'chat' or 'voice'
      is_published: isPublished,
      is_chat_agent: channel === 'chat',
    });
  } catch (error: any) {
    // Log error with context
    logRetellError(error, 'Agent Retrieval');
    
    // Format user-friendly error message
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to retrieve the agent from the voice provider: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PATCH /api/retell/agents/[id] - Update Retell AI agent
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
      .select('tenant_id, retell_agent_id')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (!(await canAccessTenant(user.id, agent.tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (!agent.retell_agent_id) {
      return NextResponse.json({ error: 'Agent not linked to the voice provider' }, { status: 400 });
    }

    // Get reseller's Retell API key (organizations inherit from reseller)
    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Voice provider not connected for this organization. Please connect it in Settings.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { agent_name, voice_id, llm_websocket_url, ...retellConfig } = body;

    // Create Retell client with enhanced configuration for updating agent
    // Longer timeout (30s) and more retries (3) for write operations
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000, // 30 seconds for update operations
      maxRetries: 3, // More retries for critical write operations
    });

    // Build update payload - only include fields that are provided
    const updatePayload: any = {};
    if (agent_name !== undefined) updatePayload.agent_name = agent_name;
    if (voice_id !== undefined) updatePayload.voice_id = voice_id;
    
    // Handle response_engine updates if provided
    if (retellConfig.response_engine) {
      updatePayload.response_engine = retellConfig.response_engine;
    } else if (llm_websocket_url !== undefined) {
      // Update to custom LLM via websocket
      updatePayload.response_engine = {
        type: 'custom-llm',
        llm_websocket_url: llm_websocket_url,
      };
    } else if (retellConfig.llm_id !== undefined) {
      // Update to Retell LLM via llm_id
      updatePayload.response_engine = {
        type: 'retell-llm',
        llm_id: retellConfig.llm_id,
      };
    }
    
    // Add other retellConfig fields (excluding response_engine, llm_id, llm_websocket_url which are handled above)
    Object.keys(retellConfig).forEach(key => {
      if (key !== 'response_engine' && key !== 'llm_id' && key !== 'llm_websocket_url') {
        updatePayload[key] = retellConfig[key];
      }
    });

    // Update Retell AI agent using reseller's API key
    const retellAgent = await retellClient.agent.update(agent.retell_agent_id, updatePayload);

    // Update local agent configuration
    const { data: updatedAgent } = await supabase
      .from('agents')
      .update({
        configuration: {
          ...retellConfig,
          retell_agent_id: retellAgent.agent_id,
        },
      })
      .eq('id', id)
      .select()
      .single();

    return NextResponse.json({
      agent: updatedAgent,
      retell_agent: retellAgent,
    });
  } catch (error: any) {
    // Log error with context
    logRetellError(error, 'Agent Update');
    
    // Format user-friendly error message
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to update the agent with the voice provider: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// DELETE /api/retell/agents/[id] - Delete Retell AI agent
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

    // Get agent and verify access
    const { data: agent } = await supabase
      .from('agents')
      .select('tenant_id, retell_agent_id')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (!(await canAccessTenant(user.id, agent.tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (agent.retell_agent_id) {
      // Get reseller's Retell API key (organizations inherit from reseller)
      const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

      if (retellApiKey) {
        // Create Retell client with enhanced configuration for deleting agent
        // Standard timeout (20s) and default retries (2) for delete operations
        const retellClient = createRetellClient(retellApiKey, {
          timeout: 20 * 1000, // 20 seconds for delete operations
          maxRetries: 2, // Default retries for transient failures
        });

        // Delete Retell AI agent using reseller's API key
        await retellClient.agent.delete(agent.retell_agent_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Log error with context
    logRetellError(error, 'Agent Deletion');
    
    // Format user-friendly error message
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to delete the agent from the voice provider: ${errorMessage}` },
      { status: 500 }
    );
  }
}

