import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/webhooks/retell - Handle Retell AI webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

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
        console.log(`Unhandled webhook event: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function handleCallEnded(supabase: any, data: any) {
  const { call_id, duration, transcript, end_reason } = data;

  // Find interaction by Retell call ID
  const { data: interaction } = await supabase
    .from('interactions')
    .select('id, tenant_id, agent_id')
    .eq('retell_call_id', call_id)
    .single();

  if (interaction) {
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
  }
}

async function handleCallConnected(supabase: any, data: any) {
  const { call_id } = data;

  // Update interaction status
  await supabase
    .from('interactions')
    .update({
      status: 'in_progress',
    })
    .eq('retell_call_id', call_id);
}

async function handleCallFailed(supabase: any, data: any) {
  const { call_id, error_message } = data;

  // Update interaction status
  await supabase
    .from('interactions')
    .update({
      status: 'failed',
      ended_at: new Date().toISOString(),
      metadata: {
        error_message,
      },
    })
    .eq('retell_call_id', call_id);
}

