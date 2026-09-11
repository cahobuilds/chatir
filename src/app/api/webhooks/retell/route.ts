import { createAdminClient } from '@/lib/supabase/server';
import { verifyRetellSignature } from '@/lib/retell-webhook';
import { decrypt, isEncrypted } from '@/lib/encryption';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/webhooks/retell - Handle voice-provider webhooks
export async function POST(request: NextRequest) {
  try {
    // Read the RAW body first (the signature is computed over the raw bytes + timestamp).
    const rawBody = await request.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { event, data } = body;

    const supabase = createAdminClient();

    // Signature verification is OPT-IN via RETELL_WEBHOOK_VERIFY=true so enabling it can't
    // silently break an existing not-yet-signed webhook flow. The secret is the tenant's
    // voice-provider API key (Retell signs with the workspace API key that has the webhook
    // badge); we resolve it from the payload's agent id, falling back to a shared env secret.
    if (process.env.RETELL_WEBHOOK_VERIFY === 'true') {
      const signature = request.headers.get('x-retell-signature');
      const secret = await resolveWebhookSecret(supabase, data);
      if (!verifyRetellSignature(rawBody, signature, secret)) {
        console.warn('[Retell Webhook] Signature verification failed; rejecting');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Enhanced logging for debugging
    console.log(`[Retell Webhook] Received event: ${event}`, {
      call_id: data?.call_id,
      timestamp: new Date().toISOString(),
      data: JSON.stringify(data, null, 2),
    });

    // Handle different webhook events
    switch (event) {
      case 'call.started':
      case 'call.connected':
        await handleCallStarted(supabase, data);
        break;
      
      case 'call.ended':
        await handleCallEnded(supabase, data);
        break;
      
      case 'call.failed':
        await handleCallFailed(supabase, data);
        break;
      
      case 'call.analyzed':
        await handleCallAnalyzed(supabase, data);
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

/**
 * Find or create an interaction for a Retell call
 * This handles both outbound calls (interaction already exists) and inbound calls (need to create)
 */
async function findOrCreateInteraction(supabase: any, data: any) {
  const { call_id, agent_id: retellAgentId, from_number, to_number, direction, call_type, start_timestamp, metadata } = data;

  // First, try to find existing interaction
  const { data: existingInteraction } = await supabase
    .from('interactions')
    .select('id, tenant_id, agent_id, metadata')
    .eq('retell_call_id', call_id)
    .single();

  if (existingInteraction) {
    return existingInteraction;
  }

  // No existing interaction - this is likely an inbound call
  // Find our local agent by Retell agent ID
  const { data: agent } = await supabase
    .from('agents')
    .select('id, tenant_id, name')
    .eq('retell_agent_id', retellAgentId)
    .single();

  if (!agent) {
    console.warn(`[Retell Webhook] No local agent found for Retell agent ${retellAgentId}`);
    return null;
  }

  // Get reseller tenant ID for billing
  const { data: tenant } = await supabase
    .from('tenants')
    .select('parent_id')
    .eq('id', agent.tenant_id)
    .single();

  // Create new interaction for inbound call
  const customerPhone = direction === 'inbound' ? from_number : to_number;
  const startedAt = start_timestamp ? new Date(start_timestamp).toISOString() : new Date().toISOString();

  const { data: newInteraction, error: insertError } = await supabase
    .from('interactions')
    .insert({
      tenant_id: agent.tenant_id,
      agent_id: agent.id,
      type: 'voice',
      status: 'in_progress',
      retell_call_id: call_id,
      customer_phone: customerPhone,
      started_at: startedAt,
      metadata: {
        direction: direction || 'inbound',
        call_type: call_type || 'phone_call',
        source: 'webhook',
        ...metadata,
      },
      reseller_tenant_id: tenant?.parent_id || null,
    })
    .select('id, tenant_id, agent_id, metadata')
    .single();

  if (insertError) {
    console.error(`[Retell Webhook] Error creating interaction for call ${call_id}:`, insertError);
    return null;
  }

  console.log(`[Retell Webhook] Created new interaction ${newInteraction.id} for inbound call ${call_id}`);
  return newInteraction;
}

async function handleCallStarted(supabase: any, data: any) {
  const { call_id } = data;

  console.log(`[Retell Webhook] Call started/connected: ${call_id}`, {
    agent_id: data.agent_id,
    direction: data.direction,
    from: data.from_number,
    to: data.to_number,
  });

  // Find or create interaction
  const interaction = await findOrCreateInteraction(supabase, data);
  
  if (interaction) {
    // Update status to in_progress
    await supabase
      .from('interactions')
      .update({ status: 'in_progress' })
      .eq('id', interaction.id);
    
    console.log(`[Retell Webhook] Updated interaction ${interaction.id} to 'in_progress'`);
  }
}

async function handleCallEnded(supabase: any, data: any) {
  const { 
    call_id, 
    duration_ms, 
    duration,
    transcript, 
    transcript_object,
    end_reason, 
    disconnection_reason,
    call_analysis,
    recording_url,
    from_number,
    to_number,
  } = data;

  const durationValue = duration_ms ? Math.floor(duration_ms / 1000) : duration || null;

  console.log(`[Retell Webhook] Call ended: ${call_id}`, {
    duration: durationValue,
    end_reason: end_reason || disconnection_reason,
    has_transcript: !!transcript || !!transcript_object,
    has_analysis: !!call_analysis,
  });

  // Find or create interaction
  const interaction = await findOrCreateInteraction(supabase, data);

  if (interaction) {
    // Build update data
    const updateData: any = {
      status: 'completed',
      ended_at: new Date().toISOString(),
      duration: durationValue,
      transcript: transcript || transcript_object || null,
      customer_phone: interaction.customer_phone || (data.direction === 'inbound' ? from_number : to_number),
      metadata: {
        ...interaction.metadata,
        disconnection_reason: disconnection_reason || end_reason,
        recording_url,
        call_analysis,
        updated_via_webhook: true,
        webhook_received_at: new Date().toISOString(),
      },
    };

    const { error } = await supabase
      .from('interactions')
      .update(updateData)
      .eq('id', interaction.id);

    if (error) {
      console.error(`[Retell Webhook] Error updating interaction ${interaction.id}:`, error);
    } else {
      console.log(`[Retell Webhook] Updated interaction ${interaction.id} to 'completed'`);
    }
  }
}

async function handleCallFailed(supabase: any, data: any) {
  const { call_id, error_message, disconnection_reason } = data;

  console.error(`[Retell Webhook] Call failed: ${call_id}`, {
    error_message,
    disconnection_reason,
  });

  // Find or create interaction
  const interaction = await findOrCreateInteraction(supabase, data);

  if (interaction) {
    const { error } = await supabase
      .from('interactions')
      .update({
        status: 'failed',
        ended_at: new Date().toISOString(),
        metadata: {
          ...interaction.metadata,
          error_message,
          disconnection_reason,
          failed_at: new Date().toISOString(),
          updated_via_webhook: true,
        },
      })
      .eq('id', interaction.id);

    if (error) {
      console.error(`[Retell Webhook] Error updating failed interaction ${interaction.id}:`, error);
    } else {
      console.log(`[Retell Webhook] Updated interaction ${interaction.id} to 'failed'`);
    }
  }
}

async function handleCallAnalyzed(supabase: any, data: any) {
  const { call_id, call_analysis } = data;

  console.log(`[Retell Webhook] Call analyzed: ${call_id}`, {
    has_summary: !!call_analysis?.call_summary,
    sentiment: call_analysis?.user_sentiment,
  });

  // Find existing interaction
  const { data: interaction } = await supabase
    .from('interactions')
    .select('id, metadata')
    .eq('retell_call_id', call_id)
    .single();

  if (interaction) {
    // Update with analysis data
    const { error } = await supabase
      .from('interactions')
      .update({
        metadata: {
          ...interaction.metadata,
          call_analysis,
          analyzed_at: new Date().toISOString(),
        },
      })
      .eq('id', interaction.id);

    if (error) {
      console.error(`[Retell Webhook] Error updating analyzed interaction ${interaction.id}:`, error);
    } else {
      console.log(`[Retell Webhook] Updated interaction ${interaction.id} with analysis`);
    }
  } else {
    console.warn(`[Retell Webhook] No interaction found for analyzed call ${call_id}`);
  }
}

// Resolve the voice-provider secret used to sign this webhook. Prefer a shared env secret,
// then the tenant's own API key (resolved from the payload's agent id); the key may be
// encrypted at rest so decrypt it first.
async function resolveWebhookSecret(supabase: any, data: any): Promise<string> {
  const shared = process.env.RETELL_WEBHOOK_SECRET || process.env.RETELL_API_KEY;
  if (shared) return shared;

  const agentId = data?.agent_id ?? data?.call?.agent_id ?? data?.agent?.agent_id;
  if (agentId) {
    const { data: agent } = await supabase
      .from('agents')
      .select('tenant_id')
      .eq('retell_agent_id', agentId)
      .maybeSingle();
    if (agent?.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('retell_api_key')
        .eq('id', agent.tenant_id)
        .maybeSingle();
      if (tenant?.retell_api_key) {
        return isEncrypted(tenant.retell_api_key)
          ? decrypt(tenant.retell_api_key)
          : tenant.retell_api_key;
      }
    }
  }
  return '';
}

