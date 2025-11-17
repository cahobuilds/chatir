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
      if (!message) {
        return NextResponse.json({ error: 'message is required for browser-based voice testing' }, { status: 400 });
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

      // Browser-based testing: Get agent response using LLM
      const config = typeof agent.configuration === 'string' 
        ? JSON.parse(agent.configuration) 
        : agent.configuration || {};

      // Get the prompt/system instructions
      const systemPrompt = config.prompt || 
                          config.system_instructions || 
                          config.systemPrompt ||
                          config.llm_config?.system_instructions ||
                          `You are ${agent.name}, a helpful AI assistant.`;

      // Get LLM configuration
      const llmConfig = config.llm_config || config.llm || {};
      const llmProvider = llmConfig.provider || 'openai';
      const llmModel = llmConfig.model || 'gpt-4';
      const temperature = llmConfig.temperature ?? 0.7;

      // For now, we'll use OpenAI API (you can extend this to support other providers)
      if (llmProvider === 'openai') {
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          return NextResponse.json(
            { error: 'OpenAI API key not configured' },
            { status: 500 }
          );
        }

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: llmModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
            temperature: temperature,
            max_tokens: llmConfig.max_tokens || 1000,
          }),
        });

        if (!openaiResponse.ok) {
          const errorData = await openaiResponse.json();
          return NextResponse.json(
            { error: errorData.error?.message || 'Failed to get LLM response' },
            { status: 500 }
          );
        }

        const openaiData = await openaiResponse.json();
        const agentResponse = openaiData.choices[0]?.message?.content || "I'm sorry, I didn't understand that.";

        return NextResponse.json({
          success: true,
          response: agentResponse,
          message: 'Voice test completed successfully',
        });
      }

      // Fallback: return a simple response
      return NextResponse.json({
        success: true,
        response: `I heard you say: "${message}". How can I help you further?`,
        message: 'Voice test completed (using fallback response)',
      });
    }

    // Handle chat agent testing
    if (agent.type === 'chat' && test_type === 'chat') {
      // For chat testing, we'll return a mock response
      // In a real implementation, you'd integrate with your chat API
      return NextResponse.json({
        success: true,
        message: 'Chat test initiated',
        response: `Test response from ${agent.name}. This is a placeholder response.`,
        agent_id: agent.id,
      });
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

