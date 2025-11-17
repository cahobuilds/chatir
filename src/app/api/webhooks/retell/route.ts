import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/webhooks/retell - Handle Retell AI webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    // Enhanced logging for debugging
    console.log(`[Retell Webhook] Received event: ${event}`, {
      call_id: data?.call_id,
      timestamp: new Date().toISOString(),
      data: JSON.stringify(data, null, 2),
    });

    // Verify webhook signature (optional but recommended)
    // const signature = request.headers.get('x-retell-signature');
    // verifySignature(signature, body);

    const supabase = createAdminClient();

    // Handle different webhook events
    switch (event) {
      case 'call.ended':
        await handleCallEnded(supabase, data);
        break;
      
      case 'call.connected':
        await handleCallConnected(supabase, data);
        break;
      
      case 'call.failed':
        await handleCallFailed(supabase, data);
        break;
      
      default:
        console.log(`[Retell Webhook] Unhandled webhook event: ${event}`, data);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Retell Webhook] Webhook processing error:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function handleCallEnded(supabase: any, data: any) {
  const { call_id, duration, transcript, end_reason } = data;

  console.log(`[Retell Webhook] Call ended: ${call_id}`, {
    duration,
    end_reason,
    has_transcript: !!transcript,
  });

  // Find interaction by Retell call ID
  const { data: interaction } = await supabase
    .from('interactions')
    .select('id, tenant_id, agent_id')
    .eq('retell_call_id', call_id)
    .single();

  if (interaction) {
    console.log(`[Retell Webhook] Found interaction ${interaction.id} for call ${call_id}`);
    
    // Update interaction record
    await supabase
      .from('interactions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration: duration || null,
        transcript: transcript || null,
        metadata: {
          end_reason,
          ...interaction.metadata,
        },
      })
      .eq('id', interaction.id);

    // Mark interaction for billing
    await supabase
      .from('interactions')
      .update({ billed: false }) // Will be billed in next billing cycle
      .eq('id', interaction.id);
  } else {
    console.warn(`[Retell Webhook] No interaction found for call ${call_id}`);
  }
}

async function handleCallConnected(supabase: any, data: any) {
  const { call_id } = data;

  console.log(`[Retell Webhook] Call connected: ${call_id}`, data);

  // Update interaction status
  const { error } = await supabase
    .from('interactions')
    .update({
      status: 'in_progress',
    })
    .eq('retell_call_id', call_id);

  if (error) {
    console.error(`[Retell Webhook] Error updating interaction for call ${call_id}:`, error);
  } else {
    console.log(`[Retell Webhook] Updated interaction status to 'in_progress' for call ${call_id}`);
  }
}

async function handleCallFailed(supabase: any, data: any) {
  const { call_id, error_message } = data;

  console.error(`[Retell Webhook] Call failed: ${call_id}`, {
    error_message,
    full_data: JSON.stringify(data, null, 2),
  });

  // Update interaction status
  const { error } = await supabase
    .from('interactions')
    .update({
      status: 'failed',
      ended_at: new Date().toISOString(),
      metadata: {
        error_message,
        failed_at: new Date().toISOString(),
        ...data,
      },
    })
    .eq('retell_call_id', call_id);

  if (error) {
    console.error(`[Retell Webhook] Error updating failed interaction for call ${call_id}:`, error);
  } else {
    console.log(`[Retell Webhook] Updated interaction status to 'failed' for call ${call_id}`);
  }
}

