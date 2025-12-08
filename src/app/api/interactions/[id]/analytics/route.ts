import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/interactions/[id]/analytics - Get analytics for a specific interaction
export async function GET(
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

    // Get user's tenant IDs
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ error: 'No access' }, { status: 403 });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);

    // Get interaction to verify access
    const { data: interaction, error: interactionError } = await supabase
      .from('interactions')
      .select('*')
      .eq('id', id)
      .in('tenant_id', tenantIds)
      .single();

    if (interactionError || !interaction) {
      return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
    }

    // Build analytics from available data
    const analytics: any = {
      // Basic metrics from interaction
      duration: interaction.duration || null,
      status: interaction.status,
      startedAt: interaction.started_at,
      endedAt: interaction.ended_at,
      type: interaction.type,
      
      // Calculate metrics
      responseTime: null, // Time from start to first response
      talkTime: null, // Total talk time
      holdTime: null, // Hold time if applicable
      silenceTime: null, // Silence time
      
      // Call quality metrics (if available)
      quality: {
        score: null,
        sentiment: null,
        sentimentScore: null,
      },
      
      // Performance metrics
      performance: {
        firstResponseTime: null,
        averageResponseTime: null,
        resolutionRate: null,
      },
      
      // Cost metrics
      cost: {
        total: null,
        perMinute: null,
        currency: 'USD',
      },
    };

    // Try to fetch enhanced analytics from Retell AI if available
    if (interaction.retell_call_id && interaction.type === 'voice') {
      try {
        const retellApiKey = await getResellerRetellConfig(interaction.tenant_id);
        if (retellApiKey) {
          const retellClient = createRetellClient(retellApiKey, {
            timeout: 30 * 1000,
            maxRetries: 2,
          });

          // Fetch call details from Retell AI
          const callData: any = await retellClient.call.retrieve(interaction.retell_call_id);
          
          // Extract analytics from Retell call data
          if (callData) {
            // Duration
            if (callData.duration) {
              analytics.duration = callData.duration;
            }
            
            // Call analysis (sentiment, quality scores, etc.)
            if (callData.call_analysis) {
              analytics.quality = {
                score: callData.call_analysis.quality_score || null,
                sentiment: callData.call_analysis.user_sentiment || null,
                sentimentScore: callData.call_analysis.sentiment_score || null,
                // Retell API uses 'call_summary' not 'summary'
                summary: callData.call_analysis.call_summary || callData.call_analysis.summary || null,
                callSuccessful: callData.call_analysis.call_successful || null,
              };
            }
            
            // Call cost - ensure it's a number
            if (callData.call_cost !== undefined && callData.call_cost !== null) {
              const costValue = typeof callData.call_cost === 'number' 
                ? callData.call_cost 
                : parseFloat(callData.call_cost) || 0;
              
              analytics.cost = {
                total: costValue,
                perMinute: callData.duration && callData.duration > 0 
                  ? (costValue / (callData.duration / 60)) 
                  : null,
                currency: callData.currency || 'USD',
              };
            }
            
            // Response times from transcript
            if (callData.transcript && Array.isArray(callData.transcript)) {
              const firstAgentResponse = callData.transcript.find((t: any) => t.role === 'agent');
              if (firstAgentResponse && firstAgentResponse.start) {
                analytics.performance.firstResponseTime = firstAgentResponse.start;
              }
              
              // Calculate average response time
              const agentResponses = callData.transcript.filter((t: any) => t.role === 'agent');
              if (agentResponses.length > 0) {
                const totalResponseTime = agentResponses.reduce((sum: number, t: any) => sum + (t.end - t.start), 0);
                analytics.performance.averageResponseTime = totalResponseTime / agentResponses.length;
              }
            }
            
            // Talk time calculation
            if (callData.transcript && Array.isArray(callData.transcript)) {
              const totalTalkTime = callData.transcript.reduce((sum: number, t: any) => {
                if (t.end && t.start) {
                  return sum + (t.end - t.start);
                }
                return sum;
              }, 0);
              analytics.talkTime = totalTalkTime;
              
              // Silence time = total duration - talk time
              if (analytics.duration && totalTalkTime) {
                analytics.silenceTime = analytics.duration - totalTalkTime;
              }
            }
            
            // Store raw Retell data for reference
            analytics.retellData = {
              callId: callData.call_id,
              endReason: callData.end_reason,
              direction: callData.direction,
              fromNumber: callData.from_number,
              toNumber: callData.to_number,
              agentId: callData.agent_id,
            };
          }
        }
      } catch (retellError: any) {
        console.error('Error fetching Retell call data:', retellError);
        // Don't fail the request, just log the error and continue with basic analytics
      }
    }

    // For chat interactions, try to get chat analytics
    if (interaction.retell_conversation_id && interaction.type === 'chat') {
      try {
        const retellApiKey = await getResellerRetellConfig(interaction.tenant_id);
        if (retellApiKey) {
          const retellClient = createRetellClient(retellApiKey, {
            timeout: 30 * 1000,
            maxRetries: 2,
          });

          const chatData: any = await retellClient.chat.retrieve(interaction.retell_conversation_id);
          
          if (chatData) {
            // Chat analysis
            if (chatData.chat_analysis) {
              analytics.quality = {
                score: chatData.chat_analysis.quality_score || null,
                sentiment: chatData.chat_analysis.sentiment || null,
                sentimentScore: chatData.chat_analysis.sentiment_score || null,
                summary: chatData.chat_analysis.summary || null,
              };
            }
            
            // Chat cost
            if (chatData.chat_cost) {
              analytics.cost = {
                total: chatData.chat_cost || null,
                perMinute: null,
                currency: 'USD',
              };
            }
            
            // Message count and response times
            if (chatData.message_with_tool_calls || chatData.messages) {
              const messages = chatData.message_with_tool_calls || chatData.messages || [];
              const agentMessages = messages.filter((m: any) => m.role === 'assistant' || m.role === 'agent');
              
              if (agentMessages.length > 0 && agentMessages[0].timestamp) {
                analytics.performance.firstResponseTime = agentMessages[0].timestamp - (chatData.start_timestamp || 0);
              }
              
              analytics.messageCount = {
                total: messages.length,
                agent: agentMessages.length,
                user: messages.length - agentMessages.length,
              };
            }
          }
        }
      } catch (retellError: any) {
        console.error('Error fetching Retell chat data:', retellError);
        // Don't fail the request
      }
    }

    // Calculate resolution rate (completed / total interactions)
    if (interaction.status === 'completed') {
      analytics.performance.resolutionRate = 100;
    } else if (interaction.status === 'failed') {
      analytics.performance.resolutionRate = 0;
    }

    return NextResponse.json({ analytics });
  } catch (error: any) {
    console.error('Error fetching interaction analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
