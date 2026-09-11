// POST /api/auth/signup - Self-service signup (server-side, atomic-ish).
// Creates the auth user + a company tenant + a user_tenant(company_admin) in one request via the
// service-role client (RLS-bypassing), so a company + its admin are live immediately. Cleans up
// partially-created records on failure.
//
// NOTE: The full product flow (charge the card, set a "pending/ready in 24h" status, send the
// welcome email once the voice-provider key is connected, then flip to active) is Scaffolded below
// with TODOs — those need STRIPE_* (Phase 5) + an email provider. Until then the account is created
// as active so the self-serve path works.
import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    // TODO(Phase 5 + email): create a Stripe Checkout Session / customer + set status='pending'
    // ("Your account will be ready within 24 hours"), and send a welcome email once the
    // voice-provider key is connected in the admin panel.

    return NextResponse.json({
      success: true,
      user_id: createdUserId,
      tenant_id: createdTenantId,
      message: 'Account created. Your organization is ready.',
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Signup failed' }, { status: 500 });
  }
}
