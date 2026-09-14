// POST /api/auth/signup - Self-service signup (server-side, atomic-ish).
// Creates the auth user + a company tenant + a user_tenant(company_admin) in one request via the
// service-role client (RLS-bypassing), so a company + its admin are live immediately. Cleans up
// partially-created records on failure.
//
// After the account is created, immediately starts a Stripe Checkout Session for the required
// subscription (14-day trial, card required). The new tenant is created with plan_status:
// 'inactive' and billing_exempt: false (column defaults) - it stays soft-locked (see
// src/lib/billing.ts) until the checkout webhook flips it to 'trialing'. If Checkout Session
// creation itself fails (e.g. misconfigured Stripe keys), the account still exists and
// checkout_url is null - the client falls back to the dashboard, where the same soft-lock
// banner offers a "start subscription" retry.
import { createAdminClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  let createdUserId: string | null = null;
  let createdTenantId: string | null = null;

  try {
    const body = await request.json();
    const { email, password, name, company_name } = body;

    if (!email || !password || !company_name) {
      return NextResponse.json({ error: 'email, password, and company_name are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1) Create the auth user (service role).
    const { data: authUser, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || email },
    });
    if (userError || !authUser.user) {
      return NextResponse.json({ error: userError?.message || 'Failed to create user' }, { status: 500 });
    }
    createdUserId = authUser.user.id;

    // 2) Create the company tenant.
    const subdomain = company_name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') || 'company';
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: company_name, subdomain, tier: 'standard' })
      .select('id')
      .single();
    if (tenantError || !tenant) {
      await supabase.auth.admin.deleteUser(createdUserId).catch(() => {});
      createdUserId = null;
      return NextResponse.json({ error: tenantError?.message || 'Failed to create organization' }, { status: 500 });
    }
    createdTenantId = tenant.id;

    // 3) Assign the user as company_admin (role_id), status active for now.
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'company_admin')
      .maybeSingle();
    if (!role) {
      try { await supabase.from('tenants').delete().eq('id', createdTenantId); } catch { /* cleanup */ }
      await supabase.auth.admin.deleteUser(createdUserId).catch(() => {});
      createdTenantId = null;
      createdUserId = null;
      return NextResponse.json({ error: 'Company admin role is not configured.' }, { status: 500 });
    }

    const { error: utError } = await supabase
      .from('user_tenants')
      .insert({ user_id: createdUserId, tenant_id: createdTenantId, role_id: role.id, status: 'active' });
    if (utError) {
      try { await supabase.from('tenants').delete().eq('id', createdTenantId); } catch { /* cleanup */ }
      await supabase.auth.admin.deleteUser(createdUserId).catch(() => {});
      createdTenantId = null;
      createdUserId = null;
      return NextResponse.json({ error: utError.message || 'Failed to assign role' }, { status: 500 });
    }

    // 4) Start the required subscription checkout. The account already exists at this point
    // regardless of what happens here - a failure here does not roll back signup.
    let checkoutUrl: string | null = null;
    try {
      // Non-null: every failure path above returns before this point and resets
      // createdTenantId to null, so it is guaranteed to be set here.
      checkoutUrl = await createCheckoutSession(createdTenantId!, email, request.nextUrl.origin);
    } catch (checkoutError: unknown) {
      logger.error('Failed to create signup Checkout Session', checkoutError, { tenantId: createdTenantId });
    }

    return NextResponse.json({
      success: true,
      user_id: createdUserId,
      tenant_id: createdTenantId,
      checkout_url: checkoutUrl,
      message: 'Account created.',
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Signup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
