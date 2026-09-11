-- Fix whitelabel leak: platform_admin role description still said "Retell key" (provider name),
-- which rendered on a platform admin's own profile page. See docs/superpowers/plans/2026-09-11-platform-polish-and-rebrand.md.
UPDATE roles
SET description = 'Full platform access: organizations, plans, payments, voice provider connection, platform staff.'
WHERE name = 'platform_admin';
