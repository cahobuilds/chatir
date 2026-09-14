import { createClient, createAdminClient } from '@/lib/supabase/server';
import { canAccessTenant } from '@/lib/permissions-server';
import { createPortalSession } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// POST /api/billing/portal - Create a Stripe Billing Portal session for a tenant that
// already has a subscription (card updates, cancellation, real invoice history - all
// handled by Stripe's own hosted UI, nothing custom-built here).
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
      .select('id, stripe_customer_id')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!tenant.stripe_customer_id) {
      return NextResponse.json(
        { error: 'This organization has no active subscription yet. Start a subscription first.' },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') || new URL(request.url).origin;
    const portalUrl = await createPortalSession(tenant.stripe_customer_id, origin);

    return NextResponse.json({ portal_url: portalUrl });
  } catch (error: unknown) {
    logger.error('Unexpected error creating portal session', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
