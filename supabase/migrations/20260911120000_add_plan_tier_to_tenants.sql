-- Add plan_tier to tenants: the one piece of billing state worth persisting for the
-- mock-UI Stripe stub (see docs/superpowers/specs/2026-09-11-platform-polish-and-rebrand-design.md
-- section 8). This is independent of the existing billing_plan column, which tracks
-- billing *cadence* (pay_as_you_go/monthly/annual), not plan *tier*.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'starter'
  CHECK (plan_tier IN ('starter', 'pro', 'enterprise'));

COMMENT ON COLUMN tenants.plan_tier IS
  'Nominal plan tier shown in the mock-UI billing stub (starter/pro/enterprise). Not yet wired to a real payment processor - see Phase 5 in docs/superpowers/specs/2026-09-11-platform-polish-and-rebrand-design.md.';
