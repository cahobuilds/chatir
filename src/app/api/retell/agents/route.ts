import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/retell/agents - List agents from Retell AI
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant_id from query params
    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Verify user has access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .in('role', ['tenant_admin', 'super_admin', 'system_admin', 'organization_admin', 'manager'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    // Get reseller's Retell API key (organizations inherit from reseller)
    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not connected for this organization. Please connect a Retell workspace in Settings.' },
        { status: 400 }
      );
    }

    // Create Retell client with enhanced configuration for listing agents
    // Standard timeout (20s) and default retries (2) for read operations
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 20 * 1000, // 20 seconds for listing operations
      maxRetries: 2, // Default retries for transient failures
    });

    // List agents from Retell AI using reseller's API key.
    // Note: Retell's list response shape is { items, has_more, pagination_key } (not a bare array).
    const retellAgentsResponse = await retellClient.agent.list();

    return NextResponse.json({
      agents: retellAgentsResponse.items || [],
      has_more: retellAgentsResponse.has_more || false,
      pagination_key: retellAgentsResponse.pagination_key,
    });
  } catch (error: any) {
    // Log error with context
    logRetellError(error, 'Agent List');
    
    // Format user-friendly error message
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to list Retell AI agents: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// POST /api/retell/agents - Create Retell AI agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id, agent_id, agent_name, voice_id, llm_websocket_url, ...retellConfig } = body;

    // Validate required fields
    if (!tenant_id || !agent_id || !agent_name) {
      return NextResponse.json(
        { error: 'tenant_id, agent_id, and agent_name are required' },
        { status: 400 }
      );
    }

    // Validate agent type: either voice_id (voice agent) or llm_websocket_url/llm_id (chat agent)
    const hasVoiceId = !!voice_id;
    const hasLLMConfig = !!(llm_websocket_url || retellConfig.llm_id || retellConfig.response_engine);
    
    if (!hasVoiceId && !hasLLMConfig) {
      return NextResponse.json(
        { error: 'Either voice_id (for voice agent) or llm_websocket_url/llm_id (for chat agent) is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .in('role', ['tenant_admin', 'super_admin'])
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    // Get reseller's Retell API key (organizations inherit from reseller)
    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not connected for this organization. Please connect a Retell workspace in Settings.' },
        { status: 400 }
      );
    }

    // Create Retell client with enhanced configuration for agent creation
    // Longer timeout (30s) and more retries (3) for write operations
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000, // 30 seconds for agent creation
      maxRetries: 3, // More retries for critical write operations
    });
    
    // Build agent creation payload with required response_engine
    const agentPayload: any = {
      agent_name,
      ...retellConfig,
    };
    
    // Determine agent type and set channel accordingly
    // Chat agents: have llm_websocket_url or llm_id/response_engine (and may or may not have voice_id)
    // Voice agents: have voice_id but no LLM configuration
    const isChatAgent = hasLLMConfig;
    
    if (isChatAgent) {
      agentPayload.channel = 'chat'; // IMPORTANT: Set channel to 'chat' for chat agents
    } else if (voice_id) {
      agentPayload.channel = 'voice'; // Set channel to 'voice' for voice agents
      agentPayload.voice_id = voice_id;
    }

    // Handle response_engine - Retell API requires this field
    // Priority: 1) Explicit response_engine in retellConfig, 2) llm_websocket_url (custom LLM), 3) llm_id (Retell LLM), 4) Default LLM
    if (retellConfig.response_engine) {
      // Use explicitly provided response_engine
      agentPayload.response_engine = retellConfig.response_engine;
    } else if (llm_websocket_url) {
      // Custom LLM via websocket
      agentPayload.response_engine = {
        type: 'custom-llm',
        llm_websocket_url: llm_websocket_url,
      };
    } else if (retellConfig.llm_id) {
      // Retell LLM via llm_id
      agentPayload.response_engine = {
        type: 'retell-llm',
        llm_id: retellConfig.llm_id,
      };
    } else {
      // Default: Fetch available LLMs and use the first one
      try {
        const llmsResponse = await retellClient.llm.list();
        const llms = llmsResponse.items || [];
        if (llms.length === 0) {
          return NextResponse.json(
            { error: 'No LLMs available. Please configure an LLM or provide llm_id/llm_websocket_url.' },
            { status: 400 }
          );
        }
        const firstLLM = llms[0];
        const llmId = typeof firstLLM === 'string' ? firstLLM : (firstLLM as any).llm_id || (firstLLM as any).id;
        agentPayload.response_engine = {
          type: 'retell-llm',
          llm_id: llmId,
        };
      } catch (llmError: any) {
        logRetellError(llmError, 'LLM List (for default)');
        return NextResponse.json(
          { error: `Failed to fetch available LLMs: ${formatRetellError(llmError)}. Please provide llm_id or llm_websocket_url.` },
          { status: 500 }
        );
      }
    }

    // Remove llm_websocket_url from payload if it's in retellConfig (already handled in response_engine)
    delete agentPayload.llm_websocket_url;
    
    // Create Retell AI agent using reseller's API key
    const retellAgent = await retellClient.agent.create(agentPayload);

    // Publish the agent (required for chat sessions to work)
    // Retell's publish API publishes the latest version and creates a new draft
    let isPublished = false;
    try {
      await retellClient.agent.publish(retellAgent.agent_id, { version: retellAgent.version });
      
      // Wait a moment for Retell to process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify publication
      const publishedAgent = await retellClient.agent.retrieve(retellAgent.agent_id);
      isPublished = (publishedAgent as any).is_published || false;
    } catch (publishError: any) {
      // Handle JSON parse errors (expected for 204 No Content responses)
      if (publishError.message?.includes('JSON') || 
          publishError.message?.includes('Unexpected end') ||
          publishError.message?.includes('empty')) {
        // Publish request was sent, wait and check
        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
          const checkAgent = await retellClient.agent.retrieve(retellAgent.agent_id);
          isPublished = (checkAgent as any).is_published || false;
        } catch (checkError) {
          // Could not verify, but publish was attempted
          console.warn('Could not verify agent publish status:', checkError);
        }
      } else {
        // Real error - log but don't fail the agent creation
        console.warn('Agent created but publish failed:', publishError.message);
        logRetellError(publishError, 'Agent Publish');
      }
    }

    // Update agent record with Retell agent ID
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({
        retell_agent_id: retellAgent.agent_id,
        configuration: {
          ...retellConfig,
          retell_agent_id: retellAgent.agent_id,
        },
      })
      .eq('id', agent_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      agent: updatedAgent,
      retell_agent: retellAgent,
      is_published: isPublished,
      message: isPublished 
        ? 'Agent created, published, and linked successfully' 
        : 'Agent created and linked. Publish may require a few moments to process.',
    }, { status: 201 });
  } catch (error: any) {
    // Log error with context
    logRetellError(error, 'Agent Creation');
    
    // Format user-friendly error message
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to create Retell AI agent: ${errorMessage}` },
      { status: 500 }
    );
  }
}

