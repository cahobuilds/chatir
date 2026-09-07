import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResellerRetellConfig } from '@/lib/reseller';
import { createRetellClient } from '@/lib/retell';

// Test endpoint to fetch chat data directly from Retell
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chat_id, tenant_id } = body;

    if (!chat_id) {
      return NextResponse.json({ error: 'chat_id is required' }, { status: 400 });
    }

    // Get tenant_id from interaction if not provided
    let targetTenantId = tenant_id;
    if (!targetTenantId) {
      // Try to find the interaction with this chat_id
      const { data: interaction } = await supabase
        .from('interactions')
        .select('tenant_id')
        .eq('retell_conversation_id', chat_id)
        .single();

      if (interaction) {
        targetTenantId = interaction.tenant_id;
      } else {
        // Get user's tenant as fallback
        const { data: userTenant } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1)
          .single();

        if (userTenant) {
          targetTenantId = userTenant.tenant_id;
        }
      }
    }

    if (!targetTenantId) {
      return NextResponse.json({ 
        error: 'Could not determine tenant_id. Please provide tenant_id or ensure the chat exists in interactions table.' 
      }, { status: 400 });
    }

    // Get Retell API key
    const retellApiKey = await getResellerRetellConfig(targetTenantId);

    if (!retellApiKey) {
      return NextResponse.json({
        error: 'Retell AI not connected for this organization.'
      }, { status: 400 });
    }

    // Create Retell client
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000,
      maxRetries: 2,
    });

    console.log(`[Test Fetch Chat] Fetching chat ${chat_id} from Retell...`);

    // Fetch chat data from Retell
    // Use type assertion since Retell SDK types may be incomplete
    const chatData: any = await retellClient.chat.retrieve(chat_id);

    // Log the full response structure
    console.log('[Test Fetch Chat] Full Retell chat response:');
    console.log(JSON.stringify(chatData, null, 2));

    // Extract all possible message fields
    const response = {
      chat_id: chatData.chat_id || chat_id,
      raw_data: chatData,
      available_fields: Object.keys(chatData),
      messages_in_message_with_tool_calls: chatData.message_with_tool_calls ? 
        (Array.isArray(chatData.message_with_tool_calls) ? chatData.message_with_tool_calls.length : 'not an array') : 
        'field not present',
      messages_in_messages: chatData.messages ? 
        (Array.isArray(chatData.messages) ? chatData.messages.length : 'not an array') : 
        'field not present',
      messages_in_transcript: chatData.transcript ? 
        (Array.isArray(chatData.transcript) ? chatData.transcript.length : typeof chatData.transcript) : 
        'field not present',
      messages_in_transcript_object: chatData.transcript_object ? 
        (Array.isArray(chatData.transcript_object) ? chatData.transcript_object.length : typeof chatData.transcript_object) : 
        'field not present',
      // Try to extract messages from various possible fields
      extracted_messages: chatData.message_with_tool_calls || 
                          chatData.messages || 
                          (Array.isArray(chatData.transcript) ? chatData.transcript : null) ||
                          (Array.isArray(chatData.transcript_object) ? chatData.transcript_object : null) ||
                          [],
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('[Test Fetch Chat] Error:', error);
    
    return NextResponse.json({
      error: error?.message || 'Failed to fetch chat',
      details: error?.response?.data || error?.stack,
      error_type: error?.constructor?.name,
    }, { status: 500 });
  }
}

