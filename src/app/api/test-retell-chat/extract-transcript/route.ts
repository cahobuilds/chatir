import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResellerRetellConfig } from '@/lib/reseller';
import { createRetellClient } from '@/lib/retell';

/**
 * Extract transcript from Retell API and return as markdown
 * POST /api/test-retell-chat/extract-transcript
 * Body: { chat_id: string, interaction_id?: string }
 */

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chat_id, interaction_id } = body;

    if (!chat_id) {
      return NextResponse.json({ error: 'chat_id is required' }, { status: 400 });
    }

    // Find interaction if interaction_id provided
    let interaction: any = null;
    let tenantId: string | null = null;

    if (interaction_id) {
      const { data: foundInteraction } = await supabase
        .from('interactions')
        .select('*')
        .eq('id', interaction_id)
        .single();

      if (foundInteraction) {
        interaction = foundInteraction;
        tenantId = foundInteraction.tenant_id;
      }
    } else {
      // Try to find by chat_id in various fields
      const { data: interactions } = await supabase
        .from('interactions')
        .select('*')
        .or(`retell_conversation_id.eq.${chat_id},retell_call_id.eq.${chat_id}`)
        .limit(5);

      if (interactions && interactions.length > 0) {
        interaction = interactions[0];
        tenantId = interaction.tenant_id;
      }
    }

    // Get tenant_id from user if not found
    if (!tenantId) {
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (userTenant) {
        tenantId = userTenant.tenant_id;
      }
    }

    if (!tenantId) {
      return NextResponse.json({ 
        error: 'Could not determine tenant_id. Please provide interaction_id or ensure you have an active tenant.' 
      }, { status: 400 });
    }

    // Get Retell API key
    const retellApiKey = await getResellerRetellConfig(tenantId);
    if (!retellApiKey) {
      return NextResponse.json({
        error: 'Retell AI not configured for this organization\'s reseller.'
      }, { status: 400 });
    }

    // Create Retell client
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000,
      maxRetries: 2,
    });

    console.log(`[Extract Transcript] Fetching chat ${chat_id} from Retell...`);

    let transcriptData: any = null;
    let methodUsed = '';

    // Method 1: Try chat.retrieve()
    try {
      const retrievedChat: any = await retellClient.chat.retrieve(chat_id);
      
      if (retrievedChat?.transcript || retrievedChat?.message_with_tool_calls || (retrievedChat as any)?.messages) {
        transcriptData = retrievedChat;
        methodUsed = 'chat.retrieve()';
        console.log('[Extract Transcript] Success via chat.retrieve()');
      } else {
        throw new Error('No transcript in retrieve response');
      }
    } catch (retrieveError: any) {
      console.log('[Extract Transcript] chat.retrieve() failed, trying chat.list()');
      
      // Method 2: Try chat.list()
      try {
        const chatListResponse: any = await retellClient.chat.list();
        const chats = Array.isArray(chatListResponse) ? chatListResponse : (chatListResponse.chats || []);
        
        // Try exact match
        transcriptData = chats.find((chat: any) => chat.chat_id === chat_id);
        
        // Try partial match
        if (!transcriptData) {
          transcriptData = chats.find((chat: any) => 
            chat.chat_id?.includes(chat_id) || chat_id.includes(chat.chat_id)
          );
        }
        
        if (transcriptData) {
          methodUsed = 'chat.list()';
          console.log('[Extract Transcript] Success via chat.list()');
        }
      } catch (listError: any) {
        console.error('[Extract Transcript] chat.list() failed:', listError.message);
      }
    }

    if (!transcriptData) {
      return NextResponse.json({
        error: 'Could not fetch chat data from Retell API',
        chat_id,
        tried_methods: ['chat.retrieve()', 'chat.list()'],
      }, { status: 404 });
    }

    // Extract messages
    let messages: any[] = [];
    let transcriptText = '';

    if (Array.isArray(transcriptData.message_with_tool_calls)) {
      messages = transcriptData.message_with_tool_calls;
    } else if (Array.isArray(transcriptData.transcript)) {
      messages = transcriptData.transcript;
    } else if (typeof transcriptData.transcript === 'string') {
      transcriptText = transcriptData.transcript;
      const lines = transcriptText.split('\n').filter((line: string) => line.trim());
      messages = lines.map((line: string, index: number) => {
        const match = line.match(/^(Agent|User|System):\s*(.+)$/);
        if (match) {
          return {
            role: match[1].toLowerCase() === 'agent' ? 'assistant' : match[1].toLowerCase(),
            content: match[2],
            timestamp: transcriptData.start_timestamp ? transcriptData.start_timestamp + (index * 1000) : undefined,
          };
        }
        return {
          role: 'system',
          content: line,
          timestamp: transcriptData.start_timestamp,
        };
      });
    } else if (Array.isArray((transcriptData as any).messages)) {
      messages = (transcriptData as any).messages;
    }

    // Build markdown
    const markdown = `# Chat Transcript

**Chat ID:** ${transcriptData.chat_id || chat_id}
**Method:** ${methodUsed}
**Status:** ${transcriptData.chat_status || 'N/A'}
**Start:** ${transcriptData.start_timestamp ? new Date(transcriptData.start_timestamp).toISOString() : 'N/A'}
**End:** ${transcriptData.end_timestamp ? new Date(transcriptData.end_timestamp).toISOString() : 'N/A'}
**Agent ID:** ${transcriptData.agent_id || 'N/A'}

## Chat Analysis

\`\`\`json
${JSON.stringify(transcriptData.chat_analysis || {}, null, 2)}
\`\`\`

## Messages (${messages.length} total)

${messages.length > 0 ? messages.map((msg, idx) => {
  const role = msg.role || 'unknown';
  const content = msg.content || JSON.stringify(msg);
  const timestamp = msg.timestamp || msg.created_timestamp || msg.created_at;
  const timeStr = timestamp ? new Date(timestamp).toISOString() : '';
  
  return `### Message ${idx + 1} - ${role.toUpperCase()}${timeStr ? ` (${timeStr})` : ''}

${content}

---`;
}).join('\n\n') : '**No messages found**'}

## Raw Transcript String

${transcriptText || 'N/A'}

## Full Raw Data

\`\`\`json
${JSON.stringify(transcriptData, null, 2)}
\`\`\`
`;

    return NextResponse.json({
      success: true,
      chat_id: transcriptData.chat_id || chat_id,
      method_used: methodUsed,
      message_count: messages.length,
      has_chat_analysis: !!transcriptData.chat_analysis,
      chat_status: transcriptData.chat_status,
      markdown,
      messages,
      transcript_text: transcriptText,
      raw_data: transcriptData,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Extract Transcript] Error:', error);
    
    return NextResponse.json({
      error: error?.message || 'Failed to extract transcript',
      details: error?.response?.data || error?.stack,
    }, { status: 500 });
  }
}

