import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/test-retell-chat/send-message - Send a message to a Retell chat session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chat_id, message } = body;

    if (!chat_id) {
      return NextResponse.json({ error: 'chat_id is required' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'message is required and must not be empty' }, { status: 400 });
    }

    // Try to find tenant_id from chat session metadata or any agent
    // For test purposes, we'll try to get it from the chat session or use a fallback
    let tenantId: string | null = null;
    
    // Try to get tenant_id from agents table by checking if any agent has this chat_id in metadata
    // Since we can't query Retell directly, we'll need to get it from the request or find it another way
    // For now, we'll try to get it from the first available tenant with Retell configured
    
    // Alternative: Get tenant_id from user's tenants
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (userTenants) {
      tenantId = userTenants.tenant_id;
    }

    if (!tenantId) {
      return NextResponse.json({ 
        error: 'Could not determine tenant_id. Please ensure you have access to a tenant.' 
      }, { status: 400 });
    }

    const retellApiKey = await getResellerRetellConfig(tenantId);

    if (!retellApiKey) {
      return NextResponse.json({
        error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.'
      }, { status: 400 });
    }

    // Create Retell client
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000,
      maxRetries: 2,
    });

    // Create chat completion
    const completion = await retellClient.chat.createChatCompletion({
      chat_id: chat_id,
      content: message.trim(),
    });

    // Extract agent response
    const agentMessages = completion.messages.filter(
      (msg: any) => msg.role === 'agent' && 'content' in msg && typeof msg.content === 'string'
    );

    if (agentMessages.length === 0) {
      return NextResponse.json({
        response: 'No agent response received. The agent may not have generated a response.',
        completion: completion,
      });
    }

    // Get the latest agent message
    const latestAgentMessage = agentMessages[agentMessages.length - 1] as { content: string; role: 'agent' };
    const agentResponse = latestAgentMessage.content || 'I apologize, but I couldn\'t generate a response.';

    return NextResponse.json({
      response: agentResponse,
      completion: completion,
      chat_id: chat_id,
    });
  } catch (error: any) {
    console.error('Retell chat message error:', error);
    
    const errorMessage = error?.response?.data?.message || 
                        error?.message || 
                        'Failed to send message';
    
    return NextResponse.json({
      error: errorMessage,
      details: error?.response?.data || error?.stack,
    }, { status: 500 });
  }
}

