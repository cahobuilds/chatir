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
