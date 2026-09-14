import { createClient, createAdminClient } from '@/lib/supabase/server';
import { canAccessTenant } from '@/lib/permissions-server';
import { createCheckoutSession } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// POST /api/billing/checkout - Create a Stripe Checkout Session for a tenant's subscription.
// Used by the "Start Subscription" / "resume checkout" button on the billing screen (the
// initial signup-time checkout is created directly by src/app/api/auth/signup/route.ts,
// not via this route, since there is no session yet at that point).
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id } = body;
    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    if (!(await canAccessTenant(user.id, tenant_id, 'billing.manage'))) {
      return NextResponse.json({ error: 'Forbidden: billing.manage permission required' }, { status: 403 });
    }

    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .select('id')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const origin = request.headers.get('origin') || new URL(request.url).origin;
    const checkoutUrl = await createCheckoutSession(tenant.id, user.email || '', origin);

    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (error: unknown) {
    logger.error('Unexpected error creating checkout session', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
