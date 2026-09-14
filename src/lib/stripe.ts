// Server-side Stripe client and helpers. Never import this from a client component.
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(STRIPE_SECRET_KEY || '', {
  typescript: true,
});

/**
 * Collapse Stripe's full subscription status vocabulary down to the four values
 * tenants.plan_status actually stores. incomplete/incomplete_expired/unpaid are all
 * "not currently paying" states for our purposes, same as past_due. paused is treated
 * the same as canceled (no plan we offer today uses pause_collection).
 */
export function mapStripeStatus(
  status: Stripe.Subscription.Status
): 'trialing' | 'active' | 'past_due' | 'canceled' {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
    case 'incomplete':
    case 'incomplete_expired':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'paused':
      return 'canceled';
    default:
      return 'past_due';
  }
}

/**
 * Create a Checkout Session for the single subscription plan, with a 14-day trial.
 * `tenantId` is stamped onto client_reference_id and metadata so the webhook handler
 * can find the tenant row without any other lookup.
 */
export async function createCheckoutSession(
  tenantId: string,
  customerEmail: string,
  origin: string
): Promise<string> {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID is not configured');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { tenant_id: tenantId },
    },
    client_reference_id: tenantId,
    metadata: { tenant_id: tenantId },
    customer_email: customerEmail,
    success_url: `${origin}/dashboard?billing=success`,
    cancel_url: `${origin}/dashboard?billing=setup_required`,
  });

  if (!session.url) {
    throw new Error('Stripe did not return a Checkout Session URL');
  }

  return session.url;
}

/**
 * Create a Billing Portal session for a tenant that already has a Stripe customer.
 */
export async function createPortalSession(
  stripeCustomerId: string,
  origin: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${origin}/settings/billing`,
  });

  return session.url;
}
