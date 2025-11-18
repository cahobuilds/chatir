import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/agents/[id]/test - Test an agent (voice or chat)
export async function POST(
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

    const body = await request.json();
    const { test_type, phone_number, message } = body; // test_type: 'voice' | 'chat'

    // Get agent
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if user is system_admin (can test any agent)
    const { data: systemAdminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .single();

    const isSystemAdmin = !!systemAdminCheck;

    // If not system_admin, verify user has access to this tenant
    if (!isSystemAdmin) {
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', agent.tenant_id)
        .single();

      if (!userTenant) {
        return NextResponse.json({ error: 'Forbidden: No access to this agent' }, { status: 403 });
      }
    }

    // Handle voice agent testing
    if (agent.type === 'voice' && test_type === 'voice') {
      // Browser-based voice testing (no phone number required)
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return NextResponse.json({ 
          error: 'message is required for browser-based voice testing and must not be empty' 
        }, { status: 400 });
      }

      // If phone_number is provided, use Retell phone call testing
      if (phone_number) {
        if (!agent.retell_agent_id) {
          return NextResponse.json({ error: 'Agent not linked to Retell AI' }, { status: 400 });
        }

        // Get reseller's Retell API key
        const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

        if (!retellApiKey) {
          return NextResponse.json(
            { error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.' },
            { status: 400 }
          );
        }

        // Create test call via Retell AI
        const retellClient = createRetellClient(retellApiKey);
        const call = await retellClient.call.createPhoneCall({
          from_number: phone_number, // Test number
          to_number: phone_number, // For testing, call yourself
          override_agent_id: agent.retell_agent_id,
          metadata: {
            test: true,
            test_user_id: user.id,
          },
        });

        return NextResponse.json({
          success: true,
          call_id: call.call_id,
          message: 'Test call initiated successfully',
        });
      }

      // Browser-based testing: For voice agents, responses are handled by Retell
      // The browser test interface simulates the conversation, but actual agent responses
      // come from Retell's real-time API during actual calls
      
      // Check if agent is linked to Retell
      if (!agent.retell_agent_id) {
        return NextResponse.json({
          success: true,
          response: `I heard you say: "${message}". This is a test response. To get real agent responses, ensure the agent is linked to Retell AI and use phone-based testing.`,
          message: 'Voice test completed (simulated response - agent not linked to Retell)',
          note: 'For full voice testing with real-time responses, use phone-based testing or ensure the agent is configured with Retell AI.',
        });
      }

      // Get reseller's Retell API key to verify configuration
      const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
      
      if (!retellApiKey) {
        return NextResponse.json({
          success: true,
          response: `I heard you say: "${message}". This is a test response. Retell AI is not configured for this organization's reseller.`,
          message: 'Voice test completed (simulated response - Retell not configured)',
          note: 'Contact your reseller administrator to configure Retell AI for full voice testing capabilities.',
        });
      }

      // For browser-based testing, we return a simulated response
      // Real-time voice interactions require Retell's WebSocket API or phone calls
      // The frontend handles the speech synthesis of this response
      return NextResponse.json({
        success: true,
        response: `I heard you say: "${message}". This is a simulated response for browser testing. For real-time voice interactions, the agent uses Retell AI's real-time API during actual phone calls.`,
        message: 'Voice test completed (simulated response)',
        note: 'Browser-based testing provides transcription and simulated responses. For full voice testing with real-time Retell AI responses, use phone-based testing.',
      });
    }

    // Handle chat agent testing
    if (agent.type === 'chat' && test_type === 'chat') {
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return NextResponse.json({ 
          error: 'message is required for chat testing and must not be empty' 
        }, { status: 400 });
      }

      // Check if agent is linked to Retell
      if (!agent.retell_agent_id) {
        return NextResponse.json({
          success: true,
          message: 'Chat test completed (agent not linked to Retell)',
          response: `I received your message: "${message}". This agent is not yet linked to Retell AI. Please sync agents or create the agent in Retell first.`,
          agent_id: agent.id,
        });
      }

      // Get reseller's Retell API key
      const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

      if (!retellApiKey) {
        return NextResponse.json({
          success: true,
          message: 'Chat test completed (Retell not configured)',
          response: `I received your message: "${message}". Retell AI is not configured for this organization's reseller. Please contact your reseller administrator.`,
          agent_id: agent.id,
        });
      }

      try {
        const retellClient = createRetellClient(retellApiKey, {
          timeout: 30 * 1000, // 30 seconds for chat operations
          maxRetries: 2,
        });

        // Check agent channel and publish status before attempting chat session
        let isPublished = false;
        let channel: string | null = null;
        try {
          const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
          const retellAgentData = retellAgent as any;
          isPublished = retellAgentData.is_published || false;
          channel = retellAgentData.channel || null;
          console.log(`[Agent Test] Agent ${agent.retell_agent_id} - Channel: ${channel}, Published: ${isPublished}`);
        } catch (retrieveError: any) {
          console.error('[Agent Test] Error checking agent status:', retrieveError.message);
        }

        // Check if agent is a chat agent
        if (channel && channel !== 'chat') {
          return NextResponse.json({
            success: false,
            message: 'Agent is not a chat agent',
            response: `Cannot start a chat session: Agent "${agent.name}" is configured as a "${channel}" agent in Retell AI, not a chat agent. Please create or convert the agent to a chat agent in the Retell dashboard.`,
            agent_id: agent.id,
            retell_agent_id: agent.retell_agent_id,
            channel: channel,
            error: 'Agent is not a chat agent',
            requires_chat_channel: true,
          }, { status: 422 });
        }

        if (!isPublished) {
          return NextResponse.json({
            success: false,
            message: 'Agent is not published',
            response: `Cannot start a chat session: Agent "${agent.name}" is not published in Retell AI. Please publish the agent first using the publish button.`,
            agent_id: agent.id,
            retell_agent_id: agent.retell_agent_id,
            channel: channel,
            error: 'Agent not published',
            requires_publish: true,
          }, { status: 422 });
        }

        // Create a new chat session for this test
        console.log(`[Agent Test] Creating chat session for agent ${agent.retell_agent_id}`);
        const chatSession = await retellClient.chat.create({
          agent_id: agent.retell_agent_id,
          metadata: {
            test: true,
            test_user_id: user.id,
            agent_id: agent.id,
            tenant_id: agent.tenant_id,
          },
        });
        console.log(`[Agent Test] Chat session created: ${chatSession.chat_id}`);

        // Create chat completion with user message
        const completion = await retellClient.chat.createChatCompletion({
          chat_id: chatSession.chat_id,
          content: message.trim(),
        });

        // Extract agent response from completion messages
        const agentMessages = completion.messages.filter(
          (msg: any) => msg.role === 'agent' && 'content' in msg && typeof msg.content === 'string'
        );

        if (agentMessages.length === 0) {
          return NextResponse.json({
            success: false,
            message: 'No agent response received from Retell',
            response: 'I apologize, but I couldn\'t generate a response. Please check the agent configuration in Retell AI.',
            agent_id: agent.id,
          });
        }

        // Get the latest agent message
        const latestAgentMessage = agentMessages[agentMessages.length - 1] as { content: string; role: 'agent' };
        const agentResponse = latestAgentMessage.content || 'I apologize, but I couldn\'t generate a response.';

        // End the chat session (cleanup)
        try {
          await retellClient.chat.end(chatSession.chat_id);
        } catch (endError) {
          // Log but don't fail - the response is already generated
          console.warn('Failed to end chat session:', endError);
        }

        return NextResponse.json({
          success: true,
          message: 'Chat test completed successfully',
          response: agentResponse,
          agent_id: agent.id,
        });
      } catch (retellError: any) {
        console.error('[Agent Test] Retell chat test error:', retellError);
        console.error('[Agent Test] Error details:', {
          message: retellError?.message,
          status: retellError?.response?.status,
          statusText: retellError?.response?.statusText,
          data: retellError?.response?.data,
          agent_id: agent.retell_agent_id,
        });
        
        // Check if it's a 422 error (agent not published or invalid)
        const statusCode = retellError?.response?.status || retellError?.status || 500;
        const errorMessage = retellError?.response?.data?.message || 
                           retellError?.message || 
                           'Failed to get response from Retell AI';
        
        // If 422, provide specific guidance about publishing
        if (statusCode === 422 || errorMessage.includes('Cannot start a chat session')) {
          return NextResponse.json({
            success: false,
            message: 'Cannot start chat session',
            response: `Error: ${errorMessage}. The agent may not be published. Please use the publish button to publish the agent first.`,
            agent_id: agent.id,
            retell_agent_id: agent.retell_agent_id,
            error: errorMessage,
            requires_publish: true,
          }, { status: 422 });
        }
        
        return NextResponse.json({
          success: false,
          message: 'Chat test failed',
          response: `Error: ${errorMessage}. Please check the agent configuration in Retell AI.`,
          agent_id: agent.id,
          error: errorMessage,
          status_code: statusCode,
        }, { status: statusCode >= 400 && statusCode < 500 ? statusCode : 500 });
      }
    }

    return NextResponse.json(
      { error: `Invalid test_type for agent type. Agent is ${agent.type}, but test_type is ${test_type}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Agent test error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test agent' },
      { status: 500 }
    );
  }
}

