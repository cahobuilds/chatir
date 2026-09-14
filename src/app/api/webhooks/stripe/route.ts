import { createAdminClient } from '@/lib/supabase/server';
import { stripe, mapStripeStatus } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import type Stripe from 'stripe';

// POST /api/webhooks/stripe - Stripe calls this directly; no user auth, signature-verified
// instead. Handles the three events this feature needs: initial checkout completion, and
// any later subscription status change (renewal, payment failure, cancellation).
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    logger.error('Stripe webhook missing signature or STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    logger.error('Stripe webhook signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.client_reference_id || session.metadata?.tenant_id;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

        if (!tenantId || !customerId || !subscriptionId) {
          logger.error('checkout.session.completed missing tenant_id/customer/subscription', undefined, {
            tenantId,
            customerId,
            subscriptionId,
          });
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id || null;

        const { error } = await adminSupabase
          .from('tenants')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan_id: priceId,
            plan_status: mapStripeStatus(subscription.status),
          })
          .eq('id', tenantId);

        if (error) {
          logger.error('Failed to update tenant after checkout.session.completed', error, { tenantId });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id || null;

        const { error } = await adminSupabase
          .from('tenants')
          .update({
            plan_id: priceId,
            plan_status: mapStripeStatus(subscription.status),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          logger.error('Failed to update tenant after customer.subscription.updated', error, {
            subscriptionId: subscription.id,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await adminSupabase
          .from('tenants')
          .update({ plan_status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          logger.error('Failed to update tenant after customer.subscription.deleted', error, {
            subscriptionId: subscription.id,
          });
        }
        break;
      }

      default:
        // Unhandled event type - ignore.
        break;
    }
  } catch (error: unknown) {
    logger.error('Unexpected error handling Stripe webhook', error, { eventType: event.type });
    // Still return 200 - Stripe would otherwise retry an event we've already logged and can
    // investigate manually; avoids infinite retry storms caused by our own bugs.
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
