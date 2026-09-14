# Stripe Billing (Phase 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock-only billing screens with a real, working Stripe subscription: one $99/mo plan, a required card + 14-day trial at signup, self-serve management via Stripe's hosted Customer Portal, a soft-lock on unpaid tenants, and a platform-admin manual override.

**Architecture:** Stripe Checkout (hosted, redirect-based) for the initial subscription and Stripe's hosted Customer Portal for ongoing self-serve management — no custom card form, no client-side Stripe.js/Elements. A single webhook endpoint keeps `tenants.plan_status`/`plan_id`/`stripe_customer_id`/`stripe_subscription_id` in sync. A new `billing_exempt` column grandfathers every tenant that exists before this migration runs.

**Tech Stack:** Next.js 15 App Router API routes, Supabase (Postgres + `@supabase/supabase-js` admin client), Stripe Node SDK (`stripe` package, added by this plan), `tsx` for one-off scripts (already a devDependency).

## Global Constraints

- Single plan, $99/month, monthly billing only — no tiers, no annual option (spec §1).
- 14-day trial (`trial_period_days: 14`) on every new Checkout Session — a card is required at signup, nobody is charged until the trial ends (spec §2).
- Every tenant that exists before the migration in Task 1 runs must end up with `billing_exempt = true` (spec §4).
- Soft lock only: blocking creating new agents (`POST /api/agents`) is the *only* enforcement point. Nothing else is gated (spec §5).
- No custom card-entry form and no custom invoices list are being rebuilt — Stripe's hosted Portal replaces both (spec §7).
- `plan_tier` and `billing_plan` columns are left untouched (existing data, existing CHECK constraints) — this plan does not read or write them in any new code, and does not migrate or drop them.
- `npm run build`, `npx tsc --noEmit`, and `npx eslint <touched files>` (compared against each file's pre-existing baseline, not an absolute zero) must pass after every task.
- Stripe keys in use are **test-mode** (`sk_test_...`) — safe to run real Checkout flows with Stripe's test card `4242 4242 4242 4242`.

## Model + Tool Routing Summary

| Task | Model | Tool | Justification |
|---|---|---|---|
| 1. DB migration | `composer-2.5-fast` | `shell` | Single SQL file, mechanical, exact spec given |
| 2. `stripe.ts` + `billing.ts` lib | `claude-sonnet-5-thinking-high` | `generalPurpose` | Status-mapping logic needs correctness judgment; multi-file |
| 3. Setup script (`stripe-setup.ts`) | *(orchestrator, direct — see note)* | `shell` | Requires live secret-key handoff from the user; not autonomously delegable |
| 4. `POST /api/billing/checkout` | `claude-sonnet-5-thinking-high` | `generalPurpose` | Permission-gated route, business logic |
| 5. `POST /api/billing/portal` | `composer-2.5-fast` | `generalPurpose` | Mechanical once Task 2's helper exists, mirrors Task 4's shape exactly |
| 6. `POST /api/webhooks/stripe` | `claude-sonnet-5-thinking-high` | `generalPurpose` | Signature verification + multi-event handling, highest correctness risk |
| 7. Signup flow rewrite | `claude-sonnet-5-thinking-high` | `generalPurpose` | Touches auth flow across 2 files, needs judgment |
| 8. Soft-lock in `POST /api/agents` | `composer-2.5-fast` | `generalPurpose` | Single mechanical check added to an existing route, exact spec given |
| 9. Platform-admin override in `PATCH /api/tenants/[id]` | `composer-2.5-fast` | `generalPurpose` | Mechanical addition following the exact pattern already in the file |
| 10. `CompanyBilling.tsx` rewrite | `claude-sonnet-5-thinking-high` | `generalPurpose` | Full component rewrite, multiple UI states, judgment on empty/error states |
| 11. `TenantBilling.tsx` rewrite | `claude-sonnet-5-thinking-high` | `generalPurpose` | Full component rewrite, override controls, judgment |
| 12. End-to-end verification | `claude-sonnet-5-thinking-high` | `generalPurpose` + `shell` | Cross-cutting verification across every prior task |

**Note on Task 3:** subagents in this environment run autonomously to completion and cannot pause to ask the user for a live secret value mid-task. The orchestrator (not a dispatched subagent) must first ask the user for their Stripe test-mode secret key and write it into `.env.local` directly — *before* dispatching Task 3's subagent, which only writes and runs the setup script (it never needs to see the raw key value itself, only that `.env.local` already contains it).

---

### Task 1: Database migration — `billing_exempt` column + widen `plan_status`

**Files:**
- Create: `supabase/migrations/20260914130000_add_stripe_billing_fields_to_tenants.sql`

**Interfaces:**
- Produces: `tenants.billing_exempt BOOLEAN NOT NULL DEFAULT false` (new column, `true` for every pre-existing row); `tenants.plan_status` CHECK constraint widened to `('inactive', 'trialing', 'active', 'past_due', 'canceled')`. Every later task that reads/writes `billing_exempt` or sets `plan_status = 'trialing'` depends on this migration having been applied.

- [ ] **Step 1: Write the migration file**

```sql
-- Real Stripe billing (Phase 5): add billing_exempt for grandfathering pre-existing tenants,
-- and widen plan_status to include Stripe's 'trialing' state.
-- stripe_customer_id/stripe_subscription_id/plan_id/plan_status already exist
-- (supabase/migrations/20260908000000_platform_roles_cleanup.sql) but were never used until now.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS billing_exempt BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenants.billing_exempt IS
  'True for tenants exempt from billing checks (pre-existing tenants grandfathered in when this feature launched, or platform-admin-comped accounts). See src/lib/billing.ts hasActiveBilling().';

-- Grandfather every tenant that exists as of this migration - none of them ever had to pay
-- before this feature existed.
UPDATE tenants SET billing_exempt = true;

-- Widen plan_status to include Stripe's 'trialing' subscription state. The existing CHECK
-- constraint's real name isn't assumed - it's looked up dynamically so this migration is
-- correct regardless of what Postgres auto-named it.
DO $$
DECLARE
  existing_constraint_name text;
BEGIN
  SELECT con.conname INTO existing_constraint_name
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
  WHERE con.contype = 'c'
    AND con.conrelid = 'public.tenants'::regclass
    AND att.attname = 'plan_status';

  IF existing_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE tenants DROP CONSTRAINT %I', existing_constraint_name);
  END IF;
END $$;

ALTER TABLE tenants
  ADD CONSTRAINT tenants_plan_status_check
  CHECK (plan_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled'));
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push`
Expected: prompts to confirm, then reports the new migration applied successfully (matches this session's established process for every prior migration in this repo).

- [ ] **Step 3: Verify**

Run: `npx supabase migration list`
Expected: `20260914130000` appears in both the `local` and `remote` columns.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260914130000_add_stripe_billing_fields_to_tenants.sql
git commit -m "feat(billing): add billing_exempt column, widen plan_status for Stripe trialing state"
```

---

### Task 2: Stripe client + billing-access helper libraries

**Files:**
- Create: `src/lib/stripe.ts`
- Create: `src/lib/billing.ts`
- Modify: `package.json` (add `stripe` dependency)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (used by Tasks 4, 5, 6, 7, 8, 10, 11): `stripe` (the initialized Stripe client, exported from `src/lib/stripe.ts`), `mapStripeStatus(status: Stripe.Subscription.Status): 'trialing' | 'active' | 'past_due' | 'canceled'`, `createCheckoutSession(tenantId: string, customerEmail: string, origin: string): Promise<string>`, `createPortalSession(stripeCustomerId: string, origin: string): Promise<string>`, `hasActiveBilling(tenant: { billing_exempt: boolean; plan_status: string }): boolean` (from `src/lib/billing.ts`).

- [ ] **Step 1: Install the Stripe SDK**

Run: `npm install stripe`
Expected: `stripe` (currently resolves to `^22.6.2`) added to `package.json` `dependencies` and `package-lock.json` updated.

- [ ] **Step 2: Write `src/lib/stripe.ts`**

```ts
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
```

- [ ] **Step 3: Write `src/lib/billing.ts`**

```ts
export interface TenantBillingFields {
  billing_exempt: boolean;
  plan_status: string;
}

/**
 * True if this tenant is allowed to use billing-gated features (currently: creating new
 * agents). A tenant is either explicitly grandfathered/comped (`billing_exempt`), or has
 * an active or trialing Stripe subscription.
 */
export function hasActiveBilling(tenant: TenantBillingFields): boolean {
  if (tenant.billing_exempt) return true;
  return tenant.plan_status === 'trialing' || tenant.plan_status === 'active';
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no new errors (the two new files type-check cleanly; `STRIPE_PRICE_ID`/`STRIPE_SECRET_KEY` being empty at this point is a runtime concern, not a type error).

Run: `npx eslint src/lib/stripe.ts src/lib/billing.ts`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/stripe.ts src/lib/billing.ts
git commit -m "feat(billing): add Stripe client, status-mapping, and billing-access helpers"
```

---

### Task 3: One-time Stripe Product/Price setup script

**Pre-requisite (orchestrator does this directly, not the dispatched subagent):** ask the user for their Stripe test-mode secret key, write it into `.env.local` as `STRIPE_SECRET_KEY=sk_test_...`. The subagent for this task does not need to see the key value — it only needs `.env.local` to already contain it before running the script.

**Files:**
- Create: `scripts/stripe-setup.ts`
- Modify: `.env.local` (add `STRIPE_PRICE_ID=<value>` after running the script)
- Modify: `.env.example` (add `STRIPE_PRICE_ID=` placeholder, align `STRIPE_PUBLISHABLE_KEY` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to match `.env.local`'s actual variable name, update the "Phase 5 - not yet wired" comment since it now is wired)

**Interfaces:**
- Consumes: `STRIPE_SECRET_KEY` (must already be in `.env.local` per the pre-requisite above).
- Produces: `STRIPE_PRICE_ID` value in `.env.local`, consumed by Task 2's `createCheckoutSession` (already written, reads `process.env.STRIPE_PRICE_ID` at call time — no code changes needed elsewhere once this env var exists).

- [ ] **Step 1: Write `scripts/stripe-setup.ts`**

```ts
// One-time script: creates the Stripe Product + Price for the single Chat IR subscription
// plan, if they don't already exist. Idempotent - safe to re-run.
// Run with: npx tsx scripts/stripe-setup.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import Stripe from 'stripe';

config({ path: resolve(process.cwd(), '.env.local') });

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error('❌ STRIPE_SECRET_KEY is not set in .env.local');
  process.exit(1);
}

const stripe = new Stripe(secretKey, { typescript: true });

const PRODUCT_NAME = 'Chat IR Subscription';
const PRICE_AMOUNT_CENTS = 9900; // $99.00
const PRICE_CURRENCY = 'usd';

async function main() {
  const existingProducts = await stripe.products.list({ active: true, limit: 100 });
  let product = existingProducts.data.find((p) => p.name === PRODUCT_NAME);

  if (product) {
    console.log(`✅ Found existing product: ${product.id}`);
  } else {
    product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: 'Chat IR — all-inclusive monthly subscription (voice + chat agents, unlimited usage).',
    });
    console.log(`✅ Created product: ${product.id}`);
  }

  const existingPrices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = existingPrices.data.find(
    (p) =>
      p.recurring?.interval === 'month' &&
      p.unit_amount === PRICE_AMOUNT_CENTS &&
      p.currency === PRICE_CURRENCY
  );

  if (price) {
    console.log(`✅ Found existing price: ${price.id}`);
  } else {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: PRICE_AMOUNT_CENTS,
      currency: PRICE_CURRENCY,
      recurring: { interval: 'month' },
    });
    console.log(`✅ Created price: ${price.id}`);
  }

  console.log('\n--- Add this to .env.local ---');
  console.log(`STRIPE_PRICE_ID=${price.id}`);
}

main().catch((err) => {
  console.error('❌ Setup failed:', err.message || err);
  process.exit(1);
});
```

- [ ] **Step 2: Run it**

Run: `npx tsx scripts/stripe-setup.ts`
Expected: prints `✅ Created product: prod_...`, `✅ Created price: price_...`, then the `STRIPE_PRICE_ID=price_...` line to copy.

- [ ] **Step 3: Add the price ID to `.env.local`**

Add the printed line under the existing `# Stripe (Phase 5)` section:

```
# Stripe (Phase 5)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_ID=price_...
```

- [ ] **Step 4: Update `.env.example`**

Replace:
```
# Stripe (Phase 5 - real payment processor integration, not yet wired to any code path).
# The current billing screens (/settings/billing, /billing) are mock UI only.
# STRIPE_SECRET_KEY=
# STRIPE_PUBLISHABLE_KEY=
# STRIPE_WEBHOOK_SECRET=
```
With:
```
# Stripe (Phase 5 - real subscription billing, see docs/superpowers/specs/2026-09-14-stripe-billing-design.md)
# STRIPE_SECRET_KEY=
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# STRIPE_WEBHOOK_SECRET=
# STRIPE_PRICE_ID=
```

- [ ] **Step 5: Re-run to confirm idempotency**

Run: `npx tsx scripts/stripe-setup.ts`
Expected: this time prints `✅ Found existing product: prod_...` and `✅ Found existing price: price_...` (same IDs as Step 2) — confirms it won't create duplicates on re-run.

- [ ] **Step 6: Commit**

```bash
git add scripts/stripe-setup.ts .env.example
git commit -m "feat(billing): add one-time Stripe Product/Price setup script"
```

(`.env.local` is git-ignored — it is not part of this commit.)

---

### Task 4: `POST /api/billing/checkout`

**Files:**
- Create: `src/app/api/billing/checkout/route.ts`

**Interfaces:**
- Consumes: `createCheckoutSession` from `src/lib/stripe.ts` (Task 2), `canAccessTenant` from `src/lib/permissions-server.ts` (pre-existing).
- Produces: `POST /api/billing/checkout` — body `{ tenant_id: string }`, returns `{ checkout_url: string }` on success. Consumed by Task 10's "Start Subscription" button.

- [ ] **Step 1: Write the route**

```ts
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
  } catch (error: any) {
    logger.error('Unexpected error creating checkout session', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint src/app/api/billing/checkout/route.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/billing/checkout/route.ts
git commit -m "feat(billing): add POST /api/billing/checkout"
```

---

### Task 5: `POST /api/billing/portal`

**Files:**
- Create: `src/app/api/billing/portal/route.ts`

**Interfaces:**
- Consumes: `createPortalSession` from `src/lib/stripe.ts` (Task 2), `canAccessTenant` (pre-existing).
- Produces: `POST /api/billing/portal` — body `{ tenant_id: string }`, returns `{ portal_url: string }` on success, or a 400 with a clear message if the tenant has no `stripe_customer_id` yet. Consumed by Task 10's "Manage Billing" button.

- [ ] **Step 1: Write the route**

```ts
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
  } catch (error: any) {
    logger.error('Unexpected error creating portal session', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint src/app/api/billing/portal/route.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/billing/portal/route.ts
git commit -m "feat(billing): add POST /api/billing/portal"
```

---

### Task 6: `POST /api/webhooks/stripe`

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`

**Interfaces:**
- Consumes: `stripe`, `mapStripeStatus` from `src/lib/stripe.ts` (Task 2).
- Produces: the single source of truth that writes `stripe_customer_id`/`stripe_subscription_id`/`plan_id`/`plan_status` onto `tenants` in response to real Stripe events. Nothing later in this plan calls this route directly — it's Stripe-invoked — but Task 12's verification depends on it being correct.

- [ ] **Step 1: Write the route**

```ts
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
  } catch (err: any) {
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
  } catch (error: any) {
    logger.error('Unexpected error handling Stripe webhook', error, { eventType: event.type });
    // Still return 200 - Stripe would otherwise retry an event we've already logged and can
    // investigate manually; avoids infinite retry storms caused by our own bugs.
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint src/app/api/webhooks/stripe/route.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat(billing): add POST /api/webhooks/stripe"
```

---

### Task 7: Signup flow — require checkout after account creation

**Files:**
- Modify: `src/app/api/auth/signup/route.ts`
- Modify: `src/app/auth/login/page.tsx`

**Interfaces:**
- Consumes: `createCheckoutSession` from `src/lib/stripe.ts` (Task 2).
- Produces: `POST /api/auth/signup` now returns `{ success, user_id, tenant_id, checkout_url: string | null, message }` (added `checkout_url` field) instead of just `{ success, user_id, tenant_id, message }`.

- [ ] **Step 1: Rewrite `src/app/api/auth/signup/route.ts`**

```ts
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
      checkoutUrl = await createCheckoutSession(createdTenantId, email, request.nextUrl.origin);
    } catch (checkoutError: any) {
      logger.error('Failed to create signup Checkout Session', checkoutError, { tenantId: createdTenantId });
    }

    return NextResponse.json({
      success: true,
      user_id: createdUserId,
      tenant_id: createdTenantId,
      checkout_url: checkoutUrl,
      message: 'Account created.',
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Signup failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update the signup success handler in `src/app/auth/login/page.tsx`**

Find (inside `handleSubmit`, the `isSignup` branch, after the sign-in call):

```tsx
        // Sign the user in (the route created the auth user; get a session cookie).
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (signInError) throw signInError;

        // Success - redirect to dashboard
        router.push('/dashboard');
        router.refresh();
```

Replace with:

```tsx
        // Sign the user in (the route created the auth user; get a session cookie).
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (signInError) throw signInError;

        // Success - a subscription is required, so go straight to Stripe Checkout if we got
        // a URL back. If Checkout Session creation failed server-side, fall back to the
        // dashboard - the billing screen there offers a "start subscription" retry.
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          router.push('/dashboard');
          router.refresh();
        }
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npx eslint src/app/api/auth/signup/route.ts src/app/auth/login/page.tsx`
Expected: no errors (excluding any pre-existing baseline issues already present in `login/page.tsx` before this change — compare against `git stash`'d output if any appear, same process used throughout this session).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/signup/route.ts src/app/auth/login/page.tsx
git commit -m "feat(billing): require Stripe Checkout after signup"
```

---

### Task 8: Soft-lock — block creating new agents when unpaid

**Files:**
- Modify: `src/app/api/agents/route.ts`

**Interfaces:**
- Consumes: `hasActiveBilling` from `src/lib/billing.ts` (Task 2).
- Produces: `POST /api/agents` now returns `402 { error: "..." }` when the tenant's billing isn't active/exempt, instead of always attempting to create the agent.

- [ ] **Step 1: Add the import**

Find (top of file):

```ts
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasPlatformPermission, canAccessTenant } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';
```

Replace with:

```ts
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasPlatformPermission, canAccessTenant } from '@/lib/permissions-server';
import { hasActiveBilling } from '@/lib/billing';
import { NextRequest, NextResponse } from 'next/server';
```

- [ ] **Step 2: Add the billing check in `POST`**

Find (in the `POST` handler, right after the permission check):

```ts
    // Verify user can manage this tenant's agents (or is platform staff).
    if (!(await canAccessTenant(user.id, tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    // Use admin client for the write (access verified above).
    const clientToUse = createAdminClient();

    // Create agent
```

Replace with:

```ts
    // Verify user can manage this tenant's agents (or is platform staff).
    if (!(await canAccessTenant(user.id, tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    // Use admin client for the write (access verified above).
    const clientToUse = createAdminClient();

    // Soft-lock: block creating new agents if this tenant's subscription isn't active/trialing
    // and it isn't grandfathered/comped. Everything else (existing agents, calls, chats,
    // analytics) keeps working regardless - this is the one deliberate enforcement point.
    const { data: billingTenant, error: billingTenantError } = await clientToUse
      .from('tenants')
      .select('billing_exempt, plan_status')
      .eq('id', tenant_id)
      .single();

    if (billingTenantError || !billingTenant) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!hasActiveBilling(billingTenant)) {
      return NextResponse.json(
        { error: 'Your subscription is not active. Please update your payment method or start your subscription to create new agents.' },
        { status: 402 }
      );
    }

    // Create agent
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npx eslint src/app/api/agents/route.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/agents/route.ts
git commit -m "feat(billing): soft-lock agent creation for unpaid/non-exempt tenants"
```

---

### Task 9: Platform-admin manual override — `billing_exempt` + `plan_status`

**Files:**
- Modify: `src/app/api/tenants/[id]/route.ts`

**Interfaces:**
- Produces: `PATCH /api/tenants/[id]` now also accepts optional `billing_exempt: boolean` and `plan_status: 'inactive'|'trialing'|'active'|'past_due'|'canceled'` fields, both gated to platform staff (`isSystemAdmin`, i.e. `hasPlatformPermission(user.id, 'orgs.view')` — already computed earlier in this same handler). Consumed by Task 11's override controls.

- [ ] **Step 1: Add the two fields to the destructure**

Find:

```ts
    const body = await request.json();
    const { name, subdomain, tier, settings, branding, retell_api_key, is_reseller, parent_id, plan_tier } = body;
```

Replace with:

```ts
    const body = await request.json();
    const { name, subdomain, tier, settings, branding, retell_api_key, is_reseller, parent_id, plan_tier, billing_exempt, plan_status } = body;
```

- [ ] **Step 2: Add the override handling after the existing `plan_tier` block**

Find:

```ts
    if (plan_tier !== undefined) {
      const allowedTiers = ['starter', 'pro', 'enterprise'];
      if (!allowedTiers.includes(plan_tier)) {
        return NextResponse.json({ error: `plan_tier must be one of: ${allowedTiers.join(', ')}` }, { status: 400 });
      }
      if (!isSystemAdmin && !(await canAccessTenant(user.id, id, 'billing.manage'))) {
        return NextResponse.json({ error: 'Forbidden: billing.manage permission required to change the plan.' }, { status: 403 });
      }
      updateData.plan_tier = plan_tier;
    }
```

Replace with:

```ts
    if (plan_tier !== undefined) {
      const allowedTiers = ['starter', 'pro', 'enterprise'];
      if (!allowedTiers.includes(plan_tier)) {
        return NextResponse.json({ error: `plan_tier must be one of: ${allowedTiers.join(', ')}` }, { status: 400 });
      }
      if (!isSystemAdmin && !(await canAccessTenant(user.id, id, 'billing.manage'))) {
        return NextResponse.json({ error: 'Forbidden: billing.manage permission required to change the plan.' }, { status: 403 });
      }
      updateData.plan_tier = plan_tier;
    }

    // Platform-admin-only manual billing override: comp/exempt a tenant, or force its Stripe
    // sync status directly (e.g. an out-of-band/invoiced enterprise deal). Does not touch
    // stripe_customer_id/stripe_subscription_id - purely a local override layered on top of
    // whatever Stripe last reported.
    if (billing_exempt !== undefined) {
      if (!isSystemAdmin) {
        return NextResponse.json({ error: 'Forbidden: Platform access required to change billing exemption.' }, { status: 403 });
      }
      updateData.billing_exempt = Boolean(billing_exempt);
    }
    if (plan_status !== undefined) {
      if (!isSystemAdmin) {
        return NextResponse.json({ error: 'Forbidden: Platform access required to override plan status.' }, { status: 403 });
      }
      const allowedStatuses = ['inactive', 'trialing', 'active', 'past_due', 'canceled'];
      if (!allowedStatuses.includes(plan_status)) {
        return NextResponse.json({ error: `plan_status must be one of: ${allowedStatuses.join(', ')}` }, { status: 400 });
      }
      updateData.plan_status = plan_status;
    }
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npx eslint src/app/api/tenants/[id]/route.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/tenants/[id]/route.ts"
git commit -m "feat(billing): platform-admin manual override for billing_exempt/plan_status"
```

---

### Task 10: `CompanyBilling.tsx` rewrite — real self-serve billing UI

**Files:**
- Modify: `src/components/CompanyBilling.tsx` (full rewrite — replaces the entire file's contents)

**Interfaces:**
- Consumes: `GET /api/tenants/[id]` (pre-existing, already returns `billing_exempt`/`plan_status`/`stripe_customer_id` since it does `select('*')`), `POST /api/billing/checkout` (Task 4), `POST /api/billing/portal` (Task 5).
- Produces: nothing consumed by later tasks — this is a leaf component.

**Implementation note (scope-tightening decision, made during planning, not a silent drop):** the design spec's UI wording ("Trial ends in X days") implied a countdown. No trial-end date is persisted anywhere in `tenants` (only `plan_status`/`plan_id`/the two Stripe IDs), and adding one would mean either a new column populated by the webhook or an extra live Stripe API call on every page load — both out of scope for this plan. This task shows the status word ("Trialing") plus static explanatory text instead of a computed day-count. This does not change any of the spec's success criteria (a company-admin can see their status and take action).

- [ ] **Step 1: Replace the entire contents of `src/components/CompanyBilling.tsx`**

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { CreditCardIcon } from "@heroicons/react/24/outline";
import { useOrganization } from "@/context/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import Button from "./ui/button/Button";
import Alert from "./ui/alert/Alert";

type PlanStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled";

interface TenantBillingInfo {
  billing_exempt: boolean;
  plan_status: PlanStatus;
  stripe_customer_id: string | null;
}

const STATUS_LABELS: Record<PlanStatus, string> = {
  inactive: "No subscription yet",
  trialing: "Trialing",
  active: "Active",
  past_due: "Payment failed",
  canceled: "Canceled",
};

const STATUS_DESCRIPTIONS: Record<PlanStatus, string> = {
  inactive: "You haven't completed your subscription setup yet. Start it below to create agents.",
  trialing: "You're in your 14-day free trial. Your card will be charged automatically when it ends.",
  active: "Your subscription is active. $99/month.",
  past_due: "We couldn't charge your card. Update your payment method to keep creating agents.",
  canceled: "Your subscription was canceled. Start a new one to keep creating agents.",
};

export default function CompanyBilling() {
  const { currentOrganization } = useOrganization();
  const { hasPermission } = usePermissions(currentOrganization?.id || null);
  const canManageBilling = hasPermission("billing.manage");

  const [info, setInfo] = useState<TenantBillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      if (!currentOrganization?.id) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/tenants/${currentOrganization.id}`);
        if (res.ok) {
          const data = await res.json();
          setInfo({
            billing_exempt: Boolean(data.tenant?.billing_exempt),
            plan_status: (data.tenant?.plan_status || "inactive") as PlanStatus,
            stripe_customer_id: data.tenant?.stripe_customer_id || null,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, [currentOrganization?.id]);

  const handleAction = async () => {
    if (!currentOrganization?.id || !info) return;
    setRedirecting(true);
    setError(null);
    try {
      const endpoint = info.stripe_customer_id ? "/api/billing/portal" : "/api/billing/checkout";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: currentOrganization.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start billing session");
      window.location.href = data.checkout_url || data.portal_url;
    } catch (err: any) {
      setError(err.message || "Failed to start billing session");
      setRedirecting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading billing…</div>;
  }

  if (!canManageBilling) {
    return (
      <div className="p-6">
        <Alert variant="info" title="No access" message="You don't have permission to manage billing for this organization." />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="p-6">
        <Alert variant="error" title="Error" message="Could not load billing information." />
      </div>
    );
  }

  const buttonLabel = info.stripe_customer_id ? "Manage Billing" : "Start Subscription";

  return (
    <div className="space-y-6">
      {error && <Alert variant="error" title="Error" message={error} />}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CreditCardIcon className="w-5 h-5" /> Subscription
        </h3>

        {info.billing_exempt ? (
          <>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Grandfathered</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This organization is exempt from billing — no payment needed.
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {STATUS_LABELS[info.plan_status]}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {STATUS_DESCRIPTIONS[info.plan_status]}
            </p>
            <Button size="sm" onClick={handleAction} disabled={redirecting}>
              {redirecting ? "Redirecting…" : buttonLabel}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint src/components/CompanyBilling.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/CompanyBilling.tsx
git commit -m "feat(billing): rewrite CompanyBilling with real Stripe status + Checkout/Portal"
```

---

### Task 11: `TenantBilling.tsx` rewrite — platform-admin view + override

**Files:**
- Modify: `src/components/TenantBilling.tsx` (full rewrite — replaces the entire file's contents; this is the component rendered by `src/app/(admin)/billing/page.tsx`, a single page with an organization selector, not a per-org tab/list)

**Interfaces:**
- Consumes: `GET /api/tenants` and `GET /api/tenants/[id]` (pre-existing), `PATCH /api/tenants/[id]` with the new `billing_exempt`/`plan_status` fields (Task 9).
- Produces: nothing consumed by later tasks — leaf component.

- [ ] **Step 1: Replace the entire contents of `src/components/TenantBilling.tsx`**

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { CreditCardIcon } from "@heroicons/react/24/outline";
import Alert from "./ui/alert/Alert";
import Button from "./ui/button/Button";

type PlanStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled";

const STATUS_OPTIONS: PlanStatus[] = ["inactive", "trialing", "active", "past_due", "canceled"];

interface TenantBillingInfo {
  billing_exempt: boolean;
  plan_status: PlanStatus;
  stripe_customer_id: string | null;
}

export default function TenantBilling() {
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [info, setInfo] = useState<TenantBillingInfo | null>(null);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await fetch("/api/tenants");
        if (res.ok) {
          const data = await res.json();
          const tenantsList: { tenant_id?: string; name?: string; tenants?: { id?: string; name?: string } }[] = data.tenants || [];
          const formattedTenants = tenantsList
            .map((t) => ({ id: t.tenant_id || t.tenants?.id, name: t.tenants?.name || t.name }))
            .filter((t): t is { id: string; name: string } => Boolean(t.id && t.name));
          setTenants(formattedTenants);
          if (formattedTenants.length > 0) {
            setSelectedTenantId(formattedTenants[0].id);
          }
        }
      } catch (err) {
        console.error("[TenantBilling] Failed to fetch tenants:", err);
      } finally {
        setTenantsLoading(false);
      }
    };
    fetchTenants();
  }, []);

  useEffect(() => {
    const fetchSelectedTenant = async () => {
      if (!selectedTenantId) return;
      try {
        const res = await fetch(`/api/tenants/${selectedTenantId}`);
        if (res.ok) {
          const data = await res.json();
          setInfo({
            billing_exempt: Boolean(data.tenant?.billing_exempt),
            plan_status: (data.tenant?.plan_status || "inactive") as PlanStatus,
            stripe_customer_id: data.tenant?.stripe_customer_id || null,
          });
        }
      } catch (err) {
        console.error("[TenantBilling] Failed to fetch selected tenant:", err);
      }
    };
    fetchSelectedTenant();
  }, [selectedTenantId]);

  const handleToggleExempt = async () => {
    if (!selectedTenantId || !info) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/tenants/${selectedTenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing_exempt: !info.billing_exempt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update billing exemption");
      setInfo({ ...info, billing_exempt: !info.billing_exempt });
      setSuccess("Billing exemption updated.");
    } catch (err: any) {
      setError(err.message || "Failed to update billing exemption");
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async (status: PlanStatus) => {
    if (!selectedTenantId || !info) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/tenants/${selectedTenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_status: status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update plan status");
      setInfo({ ...info, plan_status: status });
      setSuccess(`Plan status updated to ${status}.`);
    } catch (err: any) {
      setError(err.message || "Failed to update plan status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <CreditCardIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Billing & Subscription
          </h3>
        </div>
      </div>

      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Organization
        </label>
        {tenantsLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading organizations…</p>
        ) : (
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="w-full max-w-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {info && (
        <div className="p-6 space-y-6">
          {error && <Alert variant="error" title="Error" message={error} />}
          {success && <Alert variant="success" title="Success" message={success} />}

          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Status</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
              {info.billing_exempt ? "Grandfathered" : info.plan_status.replace("_", " ")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {info.stripe_customer_id ? `Stripe customer: ${info.stripe_customer_id}` : "No Stripe subscription on file."}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Manual Override</h4>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Button size="sm" variant={info.billing_exempt ? "outline" : "primary"} disabled={saving} onClick={handleToggleExempt}>
                {info.billing_exempt ? "Remove exemption" : "Grant exemption (comp this org)"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={saving}
                  onClick={() => handleChangeStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize border ${
                    status === info.plan_status
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint src/components/TenantBilling.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TenantBilling.tsx
git commit -m "feat(billing): rewrite TenantBilling with real status + platform-admin override"
```

---

### Task 12: End-to-end verification

**Files:** none created/modified — this task only runs and observes.

**Interfaces:** consumes everything from Tasks 1–11.

**Pre-requisite (orchestrator does this directly):** start `stripe listen --forward-to localhost:3000/api/webhooks/stripe` in a background shell; copy the printed `whsec_...` into `.env.local` as `STRIPE_WEBHOOK_SECRET`. Restart the dev/prod server so it picks up the new env vars (`STRIPE_PRICE_ID` from Task 3, `STRIPE_WEBHOOK_SECRET` from this step).

- [ ] **Step 1: Full build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 2: Grandfathering check**

Run a query (via the Supabase admin client in a throwaway `npx tsx` one-liner, or the Supabase dashboard SQL editor) confirming every tenant that existed before Task 1's migration has `billing_exempt = true`, and confirm one of those tenants (e.g. Caro Holdings) can create a new agent in the UI with no billing banner shown at all.

- [ ] **Step 3: Happy-path signup → trial**

Manually (or via the browser tool): go to `/auth/login?mode=signup`, fill out a brand-new email/company name, submit. Expected: browser redirects to a Stripe-hosted Checkout page showing the $99/mo plan and a 14-day free trial. Complete it with card `4242 4242 4242 4242`, any future expiry, any CVC. Expected: redirected back to `/dashboard?billing=success`.

- [ ] **Step 4: Confirm the webhook synced the new tenant**

Check the `stripe listen` terminal output for a forwarded `checkout.session.completed` event with a `200` response. Then confirm (via the admin client/dashboard SQL editor) that the new tenant's row now has a non-null `stripe_customer_id`/`stripe_subscription_id`, `plan_id` set to the Task 3 price ID, and `plan_status = 'trialing'`.

- [ ] **Step 5: Confirm trialing tenants can create agents**

As the new signup's user, create a new voice or chat agent from the dashboard. Expected: succeeds (no 402).

- [ ] **Step 6: Soft-lock check**

Using the platform-admin override (Task 9/11, via `/billing`), set that same new tenant's `plan_status` to `past_due`. As that tenant's user, attempt to create another agent. Expected: `POST /api/agents` returns `402` with the "subscription is not active" message, and `CompanyBilling.tsx` (Task 10) shows the "Payment failed" status with an active "Manage Billing" button (since `stripe_customer_id` is now set).

- [ ] **Step 7: Un-stick via override**

Using the same platform-admin override, set the tenant back to `plan_status: 'active'`. Confirm agent creation succeeds again.

- [ ] **Step 8: Record results**

No code changes result from this task unless a real bug is found (in which case, fix it within the relevant task's file, re-run that task's Step 2 verify command, and amend that task's commit). Report a summary of all 7 checks (pass/fail) as this task's completion report.

---

## Deployment Note (post-plan, not a task in this plan)

Once this plan is executed and the app is deployed to Vercel, register a **second** Stripe webhook endpoint (test mode) in the Stripe Dashboard pointing at `https://<vercel-url>/api/webhooks/stripe`, and set its signing secret as `STRIPE_WEBHOOK_SECRET` in Vercel's environment variables (this will be a different value than the local `stripe listen` secret used in Task 12). This can't be done as part of this plan since the Vercel URL doesn't exist until after deployment.
