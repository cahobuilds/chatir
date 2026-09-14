# Stripe Billing (Phase 5) — Design

## Context

Following up on the `docs/superpowers/specs/2026-09-11-platform-polish-and-rebrand-design.md` §8 decision to ship **mock-only** billing UI ("no Stripe SDK integration, no real API calls" — deferred to "Phase 5"). This spec is that Phase 5: wiring the mock billing screens up to a real, working Stripe subscription.

**Trigger:** user is preparing a first Vercel deployment, has real Stripe API keys (test mode) ready, and decided to build real billing now rather than deploy with a non-functional mock.

**Existing groundwork found in the codebase before this design started:**
- `tenants.stripe_customer_id`, `tenants.stripe_subscription_id`, `tenants.plan_id`, `tenants.plan_status` (default `'inactive'`, check `inactive|active|past_due|canceled`) — added by `supabase/migrations/20260908000000_platform_roles_cleanup.sql`, never referenced by any application code until this feature.
- `tenants.plan_tier` (`starter|pro|enterprise`, default `starter`) — added by `supabase/migrations/20260911120000_add_plan_tier_to_tenants.sql`, backing the mock 3-tier picker in `CompanyBilling.tsx`/`TenantBilling.tsx`. Being retired by this design (see "Superseded UI" below) — column and its historical data are left in place, just no longer read/written by new code, consistent with this codebase's established practice of leaving dead-but-compiling data alone rather than migrating it away.
- `tenants.billing_plan` (`pay_as_you_go|monthly|annual`, cadence) — pre-existing, unrelated to plan/tier or Stripe status, untouched by this feature.
- A rough "Phase 5" sketch already existed in `docs/ROLE_PERMISSION_CLEANUP_PLAN.md` (`POST /api/billing/checkout`, `POST /api/billing/portal`, `POST /api/webhooks/stripe`, gated to `billing.manage`) — this design follows and fleshes out that sketch.
- Permission `billing.manage` (company-scoped) already exists in `src/lib/permissions.ts` and is already used to gate `PATCH /api/tenants/[id]`'s plan-tier write and `CompanyBilling.tsx`'s render. Reused as-is for the new checkout/portal routes. (`plans.update`, mentioned as a hypothetical platform-scope permission in the audit doc, does **not** actually exist anywhere in the codebase — the platform-admin override in this design instead reuses the existing `hasPlatformPermission(user.id, 'orgs.view')` pattern already used throughout `src/app/api/tenants/[id]/route.ts` for other platform-only writes, rather than inventing a new permission string.)

## Decisions

### 1. Single plan, no tiers

The 3-tier model (Starter/Pro/Enterprise) is retired. There is exactly **one plan: $99/month**, billed monthly only (no annual option). Rationale (user's explicit call): "we only have one plan that has everything" — simpler product, simpler code, no tier-comparison UI to build/maintain.

### 2. Signup requires a card, with a 14-day free trial

New tenants must provide a card at signup, but are not charged until a **14-day trial** ends (Stripe's `subscription_data.trial_period_days: 14`, industry-standard default). This filters out non-serious signups (a real card is required) without adding upfront payment friction (nobody is charged during the trial) — Stripe handles the trial→active conversion automatically via webhook, no polling/cron needed.

### 3. Checkout happens at signup (not deferred to a later "upgrade" step)

Flow: fill out the existing signup form (email/password/company name, unchanged) → account created exactly as today (atomic: auth user + `tenants` row + `user_tenants(company_admin)`) → immediately redirected to a Stripe Checkout Session for the subscription → trial starts on successful checkout → land back in the dashboard.

If the user abandons checkout, the account still exists (as before) but is **soft-locked** (see §5) until they complete it — there's a "resume checkout" banner in the dashboard.

### 4. Existing tenants are grandfathered, permanently exempt

Every tenant that already exists in the database (e.g. Caro Holdings) never had to pay before this feature existed and is not retroactively required to. Implemented via a new `billing_exempt` column (see "Data Model" below), not by checking `stripe_customer_id IS NULL` — see the *Grandfathering vs. abandoned-checkout ambiguity* note below for why that distinction matters.

### 5. Payment-failure / incomplete-checkout behavior: soft lock

If a tenant's trial ends without a valid card, a renewal payment fails (`past_due`), or checkout was never completed (`inactive`, not exempt): show a persistent "update payment method" / "start your subscription" banner, and **block creating new agents** (`POST /api/agents` returns 402). Everything else keeps working — existing agents keep taking calls/chats, analytics/history/settings remain viewable, no forced logout, no data deletion. This is a deliberate, low-risk enforcement surface: one clear gate point, not a blanket read-lock.

### 6. Platform-admin manual override

A platform admin (`orgs.view` permission, i.e. platform staff) can, from the existing per-org billing tab (`TenantBilling.tsx`) or the `/billing` list page, directly:
- Toggle a tenant's `billing_exempt` flag (comp an account, mark an enterprise/negotiated deal that's invoiced outside Stripe).
- Force a tenant's `plan_status` to any value directly (unstick a tenant, or reflect an out-of-band payment).

This does not touch `stripe_customer_id`/`stripe_subscription_id` — it's purely a local override layered on top of (and taking priority over) whatever Stripe last reported.

### 7. Self-serve management via Stripe's hosted Customer Portal — no custom card/invoice UI

The mock "Payment Method" card-entry form and mock "Invoices" list in `CompanyBilling.tsx` are deleted entirely, not reimplemented for real. Real card updates, cancellation, and invoice history are all handled by Stripe's own hosted Customer Portal (`POST /api/billing/portal` creates a session, the app just redirects there). This avoids building/maintaining a PCI-relevant custom card form and a redundant invoices table — Stripe already has this data and UI.

### 8. Stripe keys are test-mode; setup is scripted, not manual dashboard clicking

The user has test-mode (`sk_test_...`) keys. A one-time script (`scripts/stripe-setup.ts`) creates the "Chat IR Subscription" Product + $99/month recurring Price via the Stripe API (idempotent — checks for an existing Product with that name first) and prints the resulting Price ID to paste into `.env.local` as `STRIPE_PRICE_ID`. No manual Stripe Dashboard product/price setup required.

## Data Model

New migration (file name TBD by the implementation plan, following the existing `YYYYMMDDHHMMSS_description.sql` convention):

```sql
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS billing_exempt BOOLEAN NOT NULL DEFAULT false;

-- Backfill: every tenant that exists as of this migration is grandfathered.
UPDATE tenants SET billing_exempt = true;

-- Widen plan_status to include Stripe's 'trialing' state.
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_plan_status_check;
ALTER TABLE tenants
  ADD CONSTRAINT tenants_plan_status_check
  CHECK (plan_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled'));
```

After this migration, all new tenant rows get `billing_exempt DEFAULT false` — only pre-existing rows (backfilled above) are `true`.

**`plan_id`** (pre-existing, previously unused `TEXT` column) is repurposed to store the Stripe Price ID the tenant is actually subscribed to, written by the webhook handler.

**Grandfathering vs. abandoned-checkout ambiguity — why `billing_exempt` is a separate column, not `stripe_customer_id IS NULL`:** both a grandfathered legacy tenant and a brand-new tenant who abandoned Stripe Checkout would have `stripe_customer_id IS NULL`. Without a separate flag, the access-check couldn't tell "never had to pay" apart from "supposed to pay, hasn't yet" — both would incorrectly read as exempt. The explicit `billing_exempt` boolean, backfilled once at migration time and defaulting to `false` for everything created afterward, removes that ambiguity outright.

**Access-control helper** (`src/lib/billing.ts`, new file):
```ts
export function hasActiveBilling(tenant: { billing_exempt: boolean; plan_status: string }): boolean {
  return tenant.billing_exempt || ['trialing', 'active'].includes(tenant.plan_status);
}
```

## New Environment Variables

- `STRIPE_SECRET_KEY` — already a placeholder in `.env.local`/`.env.example`; now filled with the real test-mode key.
- `STRIPE_WEBHOOK_SECRET` — already a placeholder; filled with the `whsec_...` printed by `stripe listen` (local) or the Stripe Dashboard webhook endpoint's signing secret (once deployed to Vercel — see "Deployment note" below).
- `STRIPE_PRICE_ID` — **new**, not previously a placeholder; the output of `scripts/stripe-setup.ts`.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — already a placeholder; **not actually required** by this design (pure server-side redirect-based Checkout/Portal, no client-side Stripe.js/Elements). Left as an unused placeholder for a possible future Elements-based flow; harmless either way.

## New/Changed Code

**New:**
- `src/lib/stripe.ts` — Stripe SDK client init (`STRIPE_SECRET_KEY`) + helpers: `createCheckoutSession(tenantId, customerEmail)`, `createPortalSession(stripeCustomerId, returnUrl)`, `mapStripeStatus(status: Stripe.Subscription.Status): 'trialing' | 'active' | 'past_due' | 'canceled'` (collapses Stripe's `incomplete`/`incomplete_expired`/`unpaid` into `'past_due'`).
- `src/lib/billing.ts` — `hasActiveBilling()` (above).
- `scripts/stripe-setup.ts` — one-time idempotent Product/Price creation script.
- `src/app/api/billing/checkout/route.ts` — `POST`, gated by `billing.manage` via `canAccessTenant`, creates and returns a Checkout Session URL (`mode: 'subscription'`, the single `STRIPE_PRICE_ID`, `trial_period_days: 14`, `client_reference_id: tenant_id`, `metadata: { tenant_id }`, `success_url`/`cancel_url`).
- `src/app/api/billing/portal/route.ts` — `POST`, same permission gate, creates and returns a Customer Portal session URL for the tenant's `stripe_customer_id` (errors clearly if none exists yet).
- `src/app/api/webhooks/stripe/route.ts` — `POST`, no auth (Stripe-called), verifies `stripe-signature` against `STRIPE_WEBHOOK_SECRET` using the raw request body. Handles `checkout.session.completed` (writes `stripe_customer_id`/`stripe_subscription_id`/`plan_id`/`plan_status`), `customer.subscription.updated` (re-syncs `plan_id`/`plan_status`), `customer.subscription.deleted` (`plan_status = 'canceled'`). Unhandled event types are logged and ignored; always returns 200 quickly to Stripe once processed.

**Changed:**
- `src/app/api/auth/signup/route.ts` — after the existing atomic user+tenant+membership creation, calls the same checkout-session logic and returns `{ success: true, checkout_url }` instead of a bare success message. Removes the old `// TODO(Phase 5 + email)` comment (this *is* that phase now, minus the email-provider part which stays out of scope). New tenants are created with `plan_status: 'inactive'`, `billing_exempt: false` (the column defaults handle this).
- `src/app/auth/login/page.tsx` (the only caller of `POST /api/auth/signup` — it hosts both login and the "Create Account" tab per the 2026-09-11 design's §1) — on success, `window.location.href = checkout_url` instead of routing to the dashboard directly.
- `src/app/api/agents/route.ts` (`POST`, create agent) — adds a `hasActiveBilling` check after existing auth/permission checks; returns 402 with a clear message if it fails.
- `src/app/api/tenants/[id]/route.ts` (`PATCH`) — adds two new optional platform-admin-only fields (gated by the existing `isSystemAdmin` check already in this file, i.e. `hasPlatformPermission(user.id, 'orgs.view')`): `billing_exempt` (boolean) and a direct `plan_status` override. Kept separate from the existing `plan_tier` handling, which stays wired for backward compatibility but is no longer surfaced in any UI.
- `src/components/CompanyBilling.tsx` — full rewrite. Removes: the `PLAN_TIERS` 3-card picker, the mock card-entry form, `MOCK_INVOICES`. Adds: a single status card (Trialing — N days left / Active / Past Due — update your card / Inactive — start your subscription / Grandfathered — no payment needed) and one action button that calls `/api/billing/checkout` or `/api/billing/portal` depending on state.
- `src/components/TenantBilling.tsx` — same status display (read + platform-admin override controls: the `billing_exempt` toggle and `plan_status` dropdown), replacing its current mock/plan-tier content.
- `src/app/(admin)/billing/page.tsx` (platform-wide list) — the per-org table's plan/tier column becomes a real **Status** column (Trialing/Active/Past Due/Canceled/Grandfathered), sourced from `plan_status`/`billing_exempt` instead of `plan_tier`.

**Superseded UI (removed by this design, not left in place):** the `PLAN_TIERS` array, tier-picker cards, mock card form, and mock invoice list in both billing components — all explicitly called out in the original mock-UI spec (§8 of the 2026-09-11 rebrand design) as illustrative placeholders for this exact follow-up phase.

## Deployment Note (relevant since a Vercel deploy is in progress in parallel)

The Stripe webhook needs a public HTTPS URL, which doesn't exist until after the first Vercel deploy. This design does not block on that — locally, `stripe listen --forward-to localhost:3000/api/webhooks/stripe` provides a local webhook secret for development/testing. Once deployed, a **second** webhook endpoint must be registered in the Stripe Dashboard (test mode) pointing at the live `https://<vercel-url>/api/webhooks/stripe`, and its signing secret set as `STRIPE_WEBHOOK_SECRET` in Vercel's environment variables (different value than the local one). This is called out as a manual post-deploy step in the implementation plan's verification section, not something this spec can pre-populate.

## Testing / Verification Plan

- Standard: `tsc --noEmit`, `eslint` on touched files, `npm run build`.
- `scripts/stripe-setup.ts` run once locally; resulting `STRIPE_PRICE_ID` added to `.env.local`.
- `stripe listen --forward-to localhost:3000/api/webhooks/stripe` running locally during testing; its `whsec_...` added to `.env.local`.
- Playwright, happy path: sign up as a brand-new user → redirected to Stripe test Checkout → pay with `4242 4242 4242 4242` → redirected back to the dashboard → (webhook, forwarded by `stripe listen`) tenant flips to `plan_status: 'trialing'` → dashboard shows "Trialing" status → creating a new agent succeeds.
- Manual/Playwright, soft-lock path: force a test tenant to `plan_status: 'past_due'` (via the new platform-admin override) → confirm the banner appears and `POST /api/agents` returns 402 → use the "update payment" button (Portal) → confirm the block lifts once `plan_status` is back to `active`/`trialing`.
- Confirm grandfathered tenants (pre-existing, `billing_exempt: true`) see no billing banner and can create agents freely with no Stripe interaction at all.

## Out of Scope (explicit non-goals)

- Annual billing / multiple plans — single $99/mo plan only, per decision §1.
- Usage-based billing or metering — flat subscription only.
- Email notifications (trial ending soon, payment failed, etc.) — Stripe's own default emails (if enabled in the Stripe Dashboard) are the only notification mechanism for now; no app-level email provider is being added by this feature.
- Automatically re-triggering a second free trial for a tenant that cancels and resubscribes — `trial_period_days: 14` is passed unconditionally in v1; abuse of this (cancel → resubscribe → new trial) is a known, accepted edge case, not solved here.
- Retroactively charging or requiring checkout from any tenant that exists before this migration runs (see §4).
- Scripting the production Stripe webhook endpoint's creation — documented as a manual post-deploy step (see "Deployment Note"), not automated, since the Vercel URL isn't known ahead of time.

## Success Criteria

- A brand-new signup cannot reach the dashboard without going through Stripe Checkout (or explicitly abandoning it, landing soft-locked).
- A tenant on trial or active subscription can create agents normally; a tenant past-due/inactive/non-exempt cannot, and sees a clear path to fix it.
- All pre-existing tenants are unaffected — no forced checkout, no lockout, `billing_exempt = true` for all of them.
- A platform admin can see real subscription status per org on `/billing` and override it manually.
- `npm run build`, `tsc --noEmit`, and `eslint` (against each touched file's pre-existing baseline) all pass.
