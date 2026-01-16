import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/agents/link-retell - Link a manually created Retell agent to a database agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agent_id, retell_agent_id } = body;

    if (!agent_id || !retell_agent_id) {
      return NextResponse.json(
        { error: 'agent_id and retell_agent_id are required' },
        { status: 400 }
      );
    }

    // Get agent and verify access
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name, type, tenant_id, retell_agent_id, configuration')
      .eq('id', agent_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify user is admin
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

    if (agent.retell_agent_id && agent.retell_agent_id !== retell_agent_id) {
      return NextResponse.json(
        { error: `Agent is already linked to a different Retell agent: ${agent.retell_agent_id}` },
        { status: 400 }
      );
    }

    // Get reseller's Retell API key
    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.' },
        { status: 400 }
      );
    }

    // Verify the Retell agent exists and get its details
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 20 * 1000,
      maxRetries: 2,
    });

    // For chat agents, try to validate by attempting to create a chat session
    // Chat agents created in the dashboard may not be accessible via agent.retrieve()
    // This is a known limitation - chat agents can't be retrieved via standard API
    let retellAgent: any = null;
    let channel: string | null = null;
    let isPublished = false;
    let validationMethod = '';

    // First, try standard agent.retrieve() method
    try {
      retellAgent = await retellClient.agent.retrieve(retell_agent_id);
      const agentData = retellAgent as any;
      channel = agentData.channel || null;
      isPublished = agentData.is_published || false;
      validationMethod = 'agent.retrieve()';
    } catch (retrieveError: any) {
      const retellStatus = retrieveError?.response?.status || retrieveError?.status || 500;
      const retellErrorMessage = formatRetellError(retrieveError);
      
      // If we get "Invalid agent channel" error, it might be a chat agent
      // Chat agents created in dashboard may not be accessible via agent.retrieve()
      if (retellStatus === 400 && retellErrorMessage.includes('Invalid agent channel')) {
        console.log(`[Link Retell] Agent ${retell_agent_id} returned "Invalid agent channel" - attempting chat session validation`);
        
        // Try to validate by creating a test chat session (this will fail if agent doesn't exist)
        try {
          const testChat = await retellClient.chat.create({
            agent_id: retell_agent_id,
            metadata: {
              validation: true,
              test: true,
            },
          });
          
          // If chat session created successfully, agent exists and is a chat agent
          channel = 'chat';
          validationMethod = 'chat.create()';
          
          // Try to get agent details from chat response
          if (testChat.agent_id === retell_agent_id) {
            // End the test chat session
            try {
              await retellClient.chat.end(testChat.chat_id);
            } catch (endError) {
              // Ignore errors ending test chat
            }
            
            // For chat agents, we can't determine published status via API
            // Assume it's published if we can create a chat session
            isPublished = true;
            
            console.log(`[Link Retell] Successfully validated chat agent ${retell_agent_id} via chat session`);
          }
        } catch (chatError: any) {
          const chatStatus = chatError?.response?.status || chatError?.status || 500;
          const chatErrorMessage = formatRetellError(chatError);
          
          // If chat creation also fails, agent doesn't exist or isn't accessible
          logRetellError(chatError, 'Agent Link - Chat Validation');
          
          let errorMessage = `Agent ID "${retell_agent_id}" could not be validated. `;
          
          if (chatStatus === 404) {
            errorMessage += `The agent does not exist in your Retell account. Please verify the agent ID is correct.`;
          } else if (chatStatus === 422) {
            errorMessage += `The agent exists but is not published or not configured for chat. Please publish the agent in Retell dashboard.`;
          } else {
            errorMessage += `Retell API error: ${chatErrorMessage}. Please verify the agent ID is correct and exists in your Retell dashboard.`;
          }
          
          return NextResponse.json(
            { 
              error: errorMessage,
              retell_status: chatStatus,
              retell_error: chatError?.response?.data || chatError?.message,
              validation_method: 'chat.create()',
            },
            { status: chatStatus >= 400 && chatStatus < 500 ? chatStatus : 500 }
          );
        }
      } else {
        // Other errors - agent doesn't exist or different issue
        logRetellError(retrieveError, 'Agent Link - Retell Retrieve');
        
        let errorMessage = `Agent ID "${retell_agent_id}" could not be retrieved: ${retellErrorMessage}`;
        
        if (retellStatus === 404) {
          errorMessage = `Agent ID "${retell_agent_id}" does not exist in your Retell account. Please verify the agent ID is correct.`;
        }
        
        return NextResponse.json(
          { 
            error: errorMessage,
            retell_status: retellStatus,
            retell_error: retrieveError?.response?.data || retrieveError?.message,
            validation_method: 'agent.retrieve()',
          },
          { status: retellStatus >= 400 && retellStatus < 500 ? retellStatus : 500 }
        );
      }
    }

    // If we got agent data from retrieve, use it; otherwise use values from chat validation
    const retellAgentData = retellAgent as any;
    if (retellAgentData && !channel) {
      channel = retellAgentData.channel || null;
    }
    if (retellAgentData && isPublished === false) {
      isPublished = retellAgentData.is_published || false;
    }
    
    // If we still don't have channel info, default to 'chat' if validation was via chat.create()
    if (!channel && validationMethod === 'chat.create()') {
      channel = 'chat';
    }

    // Check if channel matches agent type
    if (agent.type === 'chat' && channel !== 'chat') {
      return NextResponse.json(
        { 
          error: `Agent type mismatch: Database agent is "chat" but Retell agent channel is "${channel}". Please link to a chat agent or convert the Retell agent to chat.`,
          channel: channel,
          retell_agent_name: retellAgentData.agent_name,
        },
        { status: 400 }
      );
    }

    if (agent.type === 'voice' && channel !== 'voice') {
      return NextResponse.json(
        { 
          error: `Agent type mismatch: Database agent is "voice" but Retell agent channel is "${channel}". Please link to a voice agent.`,
          channel: channel,
          retell_agent_name: retellAgentData.agent_name,
        },
        { status: 400 }
      );
    }

    // Update database agent with Retell agent ID
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({
        retell_agent_id: retell_agent_id,
        configuration: {
          ...(typeof agent.configuration === 'object' ? agent.configuration : {}),
          retell_agent_id: retell_agent_id,
          retell_channel: channel,
        },
      })
      .eq('id', agent_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
      retell_agent: {
        agent_id: retell_agent_id,
        agent_name: retellAgentData?.agent_name || 'Unknown',
        channel: channel,
        is_published: isPublished,
      },
      validation_method: validationMethod || 'agent.retrieve()',
      message: `Agent "${agent.name}" successfully linked to Retell agent "${retellAgentData?.agent_name || retell_agent_id}" (${channel || 'unknown'} channel)`,
    });
  } catch (error: any) {
    logRetellError(error, 'Agent Link');
    const errorMessage = formatRetellError(error);
    return NextResponse.json(
      { error: `Failed to link agent: ${errorMessage}` },
      { status: 500 }
    );
  }
}

