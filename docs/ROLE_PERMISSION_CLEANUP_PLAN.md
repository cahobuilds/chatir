# Role & Permission Cleanup — Implementation Plan

Status: **approved — implementation in progress (Phase 1, additive migration).**
Migrated decisions:
- Voices: **platform-provider only** (`retell-*`, 21 voices) — drop custom/third-party providers.

## 1. Locked decisions

- **No reseller/partner tier.** Drop `tenants.is_reseller`, the `parent_id` hierarchy, and the
  shared-reseller-key fallback. One `tenants` row = one company = one Retell workspace.
- **Small fixed role set — 6 roles** in two scopes (platform / company).
- **Only platform roles can manage the Retell API key** (white-label: clients never see "Retell").
- **Analytics, chat/call history, and transcripts are viewable by all three company roles.**
  Roles differ only in write scope.
- **Voices:** **only the Retell `platform`-provider voices** (the 21 `retell-*` voices, confirmed
  via `voice.list()` against the test workspace). Drop all third-party/custom providers
  (elevenlabs, openai, cartesia, minimax, fish_audio, inworld) and skip voice-cloning. Show
  `voice_name` + audio preview; hide provider and any "Retell" string.
- **LLMs:** platform-curated allowlist, not the full Retell model library. Add a platform-only
  model-comparison screen to validate models before exposing them.
- **Billing:** Stripe; company admins manage their own plan/billing.

## 2. Target role & permission model

### Roles (`roles` table, new `scope` column)

| name | scope | display | purpose |
|---|---|---|---|
| `platform_admin` | platform | Platform Admin | full platform access (orgs, plans, payments, Retell key, platform staff) |
| `platform_operator` | platform | Platform Operator | onboard orgs, connect voice-provider key, view payments, manage model allowlist |
| `platform_billing` | platform | Platform Billing | view/update plans, view/manage payments |
| `company_admin` | company | Company Admin | manage agents + KB + users + plan/billing |
| `company_editor` | company | Company Editor | manage agents + KB only |
| `company_viewer` | company | Company Viewer | read-only analytics/history/transcripts |

### Permissions (new `permissions` table, `scope` column)

Platform namespace:
- `orgs.view`, `orgs.create`, `orgs.update`, `orgs.delete`
- `plans.view`, `plans.update`
- `payments.view`, `payments.manage`
- `retell_key.manage`
- `platform_users.manage`
- `models.manage`
- `voices.view`

Company namespace:
- `agents.manage`
- `knowledge.manage`
- `users.manage`
- `billing.manage`
- `analytics.view`
- `interactions.view`

### Role → permission mapping

| Role | Permissions |
|---|---|
| `platform_admin` | all platform permissions (implicit superuser bypass) |
| `platform_operator` | `orgs.view/create/update`, `retell_key.manage`, `payments.view`, `models.manage`, `voices.view` |
| `platform_billing` | `orgs.view`, `plans.view/update`, `payments.view/manage` (`orgs.view` needed so the "platform staff" bypass used by `canAccessTenant`/`hasPlatformPermission(userId,'orgs.view')` recognizes billing staff) |
| `company_admin` | `agents.manage`, `knowledge.manage`, `users.manage`, `billing.manage`, `analytics.view`, `interactions.view` |
| `company_editor` | `agents.manage`, `knowledge.manage`, `analytics.view`, `interactions.view` |
| `company_viewer` | `analytics.view`, `interactions.view` |

## 3. Phases

### Phase 0 — Prerequisites
- [ ] Confirm this plan.
- [ ] Add `RETELL_API_KEY` + a test workspace id to `.env.local` (for voice/LLM smoke tests).
- [ ] Rotate the committed Retell key in `scripts/test-agent-creation-fix.ts:11` and remove the
      default `systemadmin@tin.info` / `88888888` credentials from tracked scripts/docs.

### Phase 1 — Database migration (single new file in `supabase/migrations/`)
1. **`permissions`** table: `id uuid pk`, `name text unique`, `description`, `category`,
   `scope check(platform|company)`, timestamps.
2. **`roles.scope`**: `check(platform|company)`; seed/upsert the 6 canonical roles.
   Deactivate legacy roles (`system_admin`, `super_admin`, `tenant_admin`, `subtenant_admin`,
   `manager`, `call_manager`, `analyst`, `user`, `agent`, `viewer`) with `is_active = false`
   (kept for reference, not assigned).
3. **`role_permissions`**: add FK `permission_id → permissions.id` (replacing free text);
   seed the mapping above.
4. **`user_tenants`**:
   - Backfill `role_id` by mapping legacy `role` → new role:
     `system_admin|super_admin → platform_admin`, `tenant_admin → company_admin`,
     `subtenant_admin|agent → company_editor`, `viewer → company_viewer`.
   - Then drop legacy `role` (text) and `permissions` (jsonb).
5. **`tenants`**:
   - Drop `parent_id`, `is_reseller` (after Phase 2 code sweep removes references).
   - Add `stripe_customer_id text`, `stripe_subscription_id text`, `plan_status text
     default 'inactive' check(inactive|active|past_due|canceled)`, `plan_id text`.
   - Keep `retell_api_key` (now encrypted), `retell_tenant_id`, `retell_connection_status`,
     `retell_connected_at`, `retell_last_sync_at`.
6. **`interactions`/`billing_records`**: drop `reseller_tenant_id` columns (and their indexes).
7. **RLS rewrite** (the security fixes are entangled here — do together):
   - `user_tenants`: split SELECT vs write policies; add `WITH CHECK`; prevent anon from
     changing `role_id`/`status`/`tenant_id`; require admin role + `status='active'` to write
     others' rows. (Kills the privilege-escalation bug.)
   - Add `status = 'active'` to every tenant-membership subquery across all tables.
   - Grant INSERT/UPDATE/DELETE on `roles`/`role_permissions` to platform roles only (fixes the
     currently-broken role-management write endpoints).

### Phase 2 — Code sweep: one permission helper, no more `.in('role', …)`
- Rewrite `src/lib/permissions-server.ts`: fix the broken `permissions (*)` join; add
  `hasPermission(userId, tenantId, perm)` (company scope) and
  `hasPlatformPermission(userId, perm)` (platform scope), with `platform_admin` superuser bypass.
- Replace `src/lib/reseller.ts` with `getTenantRetellKey(tenantId)` — reads **only** the
  tenant's own (decrypted) key; delete the reseller traversal and the shared-key fallback.
- Sweep every route that currently does `.in('role', […])` to use the helper:
  `src/app/api/{retell/*, tenants/*, users/*, agents/*, knowledge-bases/*, roles/*, permissions/*}`
  and `src/lib/tenant.ts`, `organization-context.ts`, `permissions.ts`.
- **Signup**: move to a single server-side route (service role + transaction) creating the
  auth user + tenant + `user_tenants(company_admin)` atomically; add `status`/email-confirmation
  handling (pending → active flow per the 24h/Stripe plan).

### Phase 3 — Retell key: gating + encryption + white-label
- Encrypt `retell_api_key` at rest using `src/lib/encryption.ts` (already exists).
- `POST /api/tenants/[id]/retell/connect` → require `retell_key.manage`; store encrypted;
  validate with `agent.list({ limit: 1 })`.
- Remove `retell_api_key` from all `GET /api/tenants[/*]` responses (select explicit columns,
  never `*`).
- Rename company-facing "Retell" labels → "Voice Provider" / "AI Engine".

### Phase 4 — Voices + LLM allowlists
- **Voices**: delete hardcoded lists in `VoiceAgentList.tsx:341`, `AgentConfiguration.tsx:15`,
  and the `sarah-neural` fallback in `AgentEditModal.tsx:326`; all paths read
  `/api/retell/voices`. Render `voice_name` + `<audio src={preview_audio_url}>`; omit provider.
- **LLM allowlist**: platform config (e.g. `platform_settings` table or env) of approved
  `model` ids; company agent UI renders only those.
- **Model-comparison screen** (platform-only): run a fixed IR QA set against each candidate
  model, score grounded-accuracy / citation / refusal / latency / cost.

### Phase 5 — Stripe
- Add `stripe` dependency; env `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Routes: `POST /api/billing/checkout`, `POST /api/billing/portal`, `POST /api/webhooks/stripe`
  (verify signature); write `stripe_customer_id`/`stripe_subscription_id`/`plan_status`.
- Gate to `company_admin` (`billing.manage`).

### Phase 6 — Security hardening (from the code review)
- Verify Retell webhook signature (`src/app/api/webhooks/retell/route.ts` — currently commented
  out) and add auth.
- Add auth + ownership checks + rate limiting to `src/app/api/widget/chat/message`.
- Scope `POST /api/retell/agents` local-agent link by `tenant_id` (parity with chat route).
- Fix chat-agent `prompt`/`llm-config` routes to use `chatAgent.retrieve`.

## 4. Testing & validation
- Smoke-test `voice.list()` and `llm.list()` against the provided test workspace; confirm the
  `voice_name` + `preview_audio_url` shape and the exact model list (drives the allowlist).
- Migrate on a staging branch/DB first; verify backfill counts.
- Manual checks: signup succeeds atomically; `company_viewer` cannot see the Retell key or write
  agents; `company_admin` cannot see the key; `platform_admin` can connect a key; suspended users
  lose access; no cross-tenant reads.

## 5. Rollback
- Keep legacy `role` column until backfill is verified, then drop in a follow-up migration.
- New tables/columns are additive; RLS rewrite is reversible by re-running prior policy DDL.

## 6. Open items / blockers
- Retell API key + test workspace for Phase 4 (to be added to `.env.local`).
- Confirm the canonical model allowlist seed (initial guess: `gpt-4.1`, `claude-4.5-sonnet`).
- Confirm whether `company_admin` also needs a separate `company_billing` split (currently not).

---

## Implementation status (in-progress notes)

### Code sweep (Phase 2) — ~66 route handlers moved to the permission model
Swept: tenants `[/*]`, `[id]/retell/connect`, `[id]/users`, `[id]/logo`, `[id]/wordmark`,
`[id]/retell/billing`; retell `agents`(`[id]`,`sync`,`[id]/publish`), `chat-agents`(`[id]`,
`[id]/publish`), `llms`(`[id]`), `phone-numbers`(`[id]`), `voices`; knowledge-bases
(`[id]`, `[id]/sources` treated via `[id]`); agents `route`,`search`,`[id]`,`[id]/test`
(+`web-call`),`[id]/llm-config`,`[id]/prompt`,`[id]/knowledge-bases`,`[id]/notion-services`
(+`[serviceId]`),`create-ir-template`,`link-retell`; users, users/[id], roles, permissions/check;
analytics `overview`/`calls`/`timeseries`/`agents`/`realtime`/`customer-experience`;
organization/switch, folders(+[id]), user-agents(+[id]), notion/resources(+[id]),
check-migration. New helpers: `hasPermission`, `hasPlatformPermission`, `canAccessTenant`.

**DEFERRED to the Phase-1b pass** (need the migration applied + a testing pass; they still work
on the legacy `role` text column until Phase 1b): `railway/*`, the legacy-role-fallback logic in
`tenants/[id]`, `tenants/route`, `agents/[id]` (isSystemAdmin/role-fallback), and the two context
libs `lib/tenant.ts`, `lib/organization-context.ts`.

### Other phases
- Phase 1: migration written (`20260908000000_platform_roles_cleanup.sql`), **awaiting apply**.
- Phase 3: key-leak fix + `retell_key.manage` gating done; **encryption at rest is actually implemented** (not pending — corrected 2026-09-09, see audit below), but inconsistent; white-label UI is **not** fully done.
- Phase 4: voices allowlist claim is **false** — 3 components still hardcode voices; LLM allowlist is enforced on create but **not** on update.
- Phase 5: Stripe — **pending** (needs Stripe keys). Confirmed genuinely untouched.
- Phase 6: webhook signature + widget IDOR + widget key + chat-agent `retrieve` done; widget rate-limit implemented but **off by default**; `retell/agents` tenant-scoping parity gap **not fixed** (real IDOR).

### Added this phase
- `src/lib/permissions-server.ts` (rewritten: hasPermission/hasPlatformPermission/canAccessTenant).
- `src/lib/models.ts` (LLM allowlist), `src/lib/rate-limit.ts`, `src/lib/retell-webhook.ts`.
- `POST /api/admin/model-compare` (platform-only model comparison; Retell mechanism verified).
- Migration `20260908000000_platform_roles_cleanup.sql` (awaiting apply; `platform_billing` now also granted `orgs.view` so it's recognized by the platform-staff bypass used across the sweep).

### Blockers (need the user)
- Apply the migration: requires a Supabase access token (`sbp_…`) or the DB password for `supabase db push` (no CLI/local DB/no token in this environment).
- Phase 5 Stripe: requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- Downstream of the migration: Phase 1b legacy-column drops + deferred route sweep, atomic server-side signup.
- Rotate the committed Retell key in `scripts/test-agent-creation-fix.ts` — requires Retell dashboard access.

---

## 7. 2026-09-09 audit — plan status vs. actual code (full re-verification)

A full pass was made comparing every checklist item's claimed status against the code, file-by-file. The plan's self-reported status was stale in **both directions** (some "done" items are broken; some "pending"/"deferred" items are actually done). Findings below are grouped by severity; each was independently confirmed with file:line evidence.

### Critical — exploitable now
1. **Cross-tenant agent overwrite (IDOR).** `src/app/api/retell/agents/route.ts` POST checks `canAccessTenant(user.id, tenant_id, 'agents.manage')` against the **client-supplied** `tenant_id`, then updates `.from('agents').update(...).eq('id', agent_id)` with no `.eq('tenant_id', tenant_id)` filter and no check that `agent_id` belongs to that tenant. A user with `agents.manage` on their own tenant can overwrite another tenant's agent row. `src/app/api/agents/link-retell/route.ts` has the correct pattern (derives `tenant_id` from the agent row itself) — this route needs parity.
2. **Live committed secret.** `scripts/test-agent-creation-fix.ts:11` has a hardcoded fallback Retell API key (`key_2111b0be36b992beec8fd18b689b`). Needs rotation in the Retell dashboard, not just deletion from the file.
3. **Default admin credentials still tracked.** `systemadmin@tin.info` / `88888888` appear in ~9 tracked scripts/docs (`scripts/create-system-admin.*`, `scripts/verify-system-admin-setup.ts`, `scripts/grant-system-admin-access.ts`, `scripts/setup-system-admin-complete.sql`, `docs/CREATE_SYSTEM_ADMIN.md`, `docs/SYSTEM_ADMIN_USER_CREATION.md`, `docs/LOCAL_CREDENTIALS.md`).
4. **Ciphertext shipped to the browser.** `src/components/TenantConfiguration.tsx:70-71` queries Supabase directly from client-side JS (`select('tenant_id, role, tenants(*)')`), bypassing the API layer's `sanitizeTenant()` entirely. The encrypted `retell_api_key` (not plaintext, but still a boundary violation) reaches the browser.
5. **Access-control regression.** `src/app/api/agents/route.ts` GET authorizes via a hardcoded legacy-role array (`tenant_admin`, `super_admin`, `organization_admin`, `manager`) that doesn't match any of the new 6 canonical roles — none of the new role names will ever match, silently changing who gets treated as an admin for result filtering.

### High — functional bugs / overstated "done" claims
6. New self-serve signups get `role: null` from `getCurrentTenant()`/`getUserTenants()`/`verifyOrganizationAccess()` (all three still read the legacy `role` text column exclusively), even though `/api/auth/signup` correctly assigns `role_id` for `company_admin`. Any code branching on that returned role string treats a fresh signup as a non-admin.
7. `hasPermission()`/`getUserPermissions()`/`getUserRoleInfo()` require `platform_admin` to hold an explicit `user_tenants` row scoped to the *specific* tenant being checked, while `hasPlatformPermission()` and the SQL `is_platform_admin()` are correctly tenant-agnostic. `/api/permissions/check` calls the former directly — a platform admin with no membership row in a given tenant gets `Forbidden`/empty permissions there, even though `canAccessTenant` (used elsewhere) would correctly grant access.
8. LLM allowlist (`isModelAllowed`) is enforced on **creating** a new Retell LLM (`retell/llms/route.ts`) but not on **updating** an existing agent's model (`agents/[id]/llm-config/route.ts`, `agents/[id]/route.ts` PATCH) — a company can bypass the platform's curated model list by editing an already-linked agent instead of creating a new one.
9. `retell/billing/route.ts` uses `tenant.retell_api_key` **without** decrypting it — will break against any encrypted key.
10. Voice sweep claim is false in 3 places, not 2: in addition to `AgentEditModal.tsx:326` and `AgentConfiguration.tsx:16` (`sarah-neural` hardcoded), `VoiceAgentList.tsx:341-347` hardcodes an unrelated OpenAI-style voice list (`alloy`, `echo`, `fable`...) and never calls `/api/retell/voices`. `CreateIRAgentModal.tsx` has the correct pattern already.
11. `tenants/[id]/route.ts` GET's access check and both handlers' admin-client-selection logic still branch on the legacy `role` text column (not `canAccessTenant`), despite the route being listed as swept — this is the source of the plan's own "listed as both swept and deferred" contradiction.
12. White-label is incomplete: `ChatAgentList.tsx`, `AgentTestModal.tsx`, `AgentInteractionModal.tsx`, `AgentEditModal.tsx` still show literal "Retell" in user-visible error/success/instruction text; `TenantManagement.tsx` shows "Voice Provider (Retell AI)" in a platform-only modal title. Only `RetellIntegrationManagement.tsx` was actually white-labeled.

### Medium
13. `src/lib/permissions.ts` (client-side) is untouched — a full parallel legacy permission-ID vocabulary (`tenant.view`, `users.view`...) that doesn't match the new `permissions` table names (`orgs.view`, `users.manage`...).
14. `api/webhooks/retell/route.ts`'s `findOrCreateInteraction` still reads `tenants.parent_id` and writes `reseller_tenant_id` — resurrects the reseller model being deleted; wasn't on the Phase-2 sweep list.
15. `RETELL_WEBHOOK_VERIFY` and `WIDGET_RATE_LIMIT_ENABLED` are both implemented but confirmed off by default everywhere (`.env.local` explicitly `false`; no `.env.example`, `railway.json`, or CI config overrides them) — today, in whatever this deploys to, unsigned webhooks are accepted and the widget endpoint is unlimited.
16. Signup subdomain generation (`auth/signup/route.ts`) has no collision handling — two similarly-named orgs will hit a raw DB constraint error surfaced as a generic 500.
17. `/admin/model-compare` page has no page-level platform-role gate (only the sidebar nav item is hidden); the mutating API route is correctly gated, but a company user navigating directly to the URL sees the full UI before submitting.
18. Several routes correctly gate *authorization* through the new helpers but still read/write the legacy `role` text column for **display** or **data-layer role assignment**: `tenants/route.ts` (list response), `users/route.ts`/`users/[id]/route.ts` (writes legacy `role` text, never `role_id`), `roles/route.ts` (vestigial unused variable), `folders/route.ts` GET, `organization/switch/route.ts`. Not access-control bugs, but Phase 1b will need to touch all of them regardless.

### Doc-accuracy only (no code issue, plan bookkeeping was wrong)
- `railway/*` routes (4 files) are listed "deferred" but are actually **fully swept** — someone did this work and never updated the status notes.
- Phase 3 encryption-at-rest and Phase 4 model-comparison screen were marked "pending" but are actually implemented (see corrected status above).

---

## 8. Remediation tracking (13-task plan, executed subagent-driven, in place on `main`)

| Task | Finding(s) addressed | Status | Commit |
|---|---|---|---|
| 1 | Critical #1 — cross-tenant agent IDOR in `retell/agents/route.ts` | Done | `<see git log>` |
| 2 | Critical #2 — committed Retell key fallback in test script | Done | `<see git log>` |
| 3 | Critical #3 — prod guard on system-admin seed scripts/docs | Done | `<see git log>` |
| 4 | Critical #4 — `TenantConfiguration.tsx` ciphertext leak + reseller UI removal | Done | `<see git log>` |
| 5 | Critical #5 — legacy-role regression in `agents/route.ts` GET | Done | `<see git log>` |
| 6 | High #7 — `platform_admin` bypass tenant-agnostic in `permissions-server.ts` | Done | `b166b86` |
| 13 | High #18 (upgraded to **Critical** on review) — `users/route.ts` + `users/[id]/route.ts` wrote only legacy `role`, never `role_id`, making role promotion/demotion through the admin UI a no-op or a zero-permission trap | Done | `d97f83d` — deliberately maps `super_admin → company_admin` (not `platform_admin`) per the later `20260908000002_fix_super_admin_scope.sql` correction; also had to widen `POST`'s `validRoles` to accept canonical names since user creation was fully broken (dropdown submits canonical names, handler only accepted legacy ones) |
| 7 | High #6 — `role: null` in `tenant.ts` + `organization-context.ts` | Done | `a17dfc5` — added `membershipRole()` helper preferring `role_id -> roles.name`, falling back to legacy `role` text; `nestedRoleName` exported from `permissions-server.ts` for reuse |
| 8 | High #8 — LLM allowlist not enforced on agent-update paths (`agents/[id]/llm-config/route.ts`, `agents/[id]/route.ts` PATCH) | Done | `69f95ba` — `isModelAllowed()` check added before any local/Retell write in both PATCH handlers; verified self-consistent in an isolated worktree (independent of other in-progress uncommitted files) |
| 9 | High #9 — missing decrypt in `retell/billing/route.ts` | Done | `0a0e7c0` — resolves `tenant.retell_api_key` via the same `isEncrypted()?decrypt():value` idiom already used in `webhooks/retell/route.ts`/`widget/chat/message/route.ts`/`lib/reseller.ts` |
| 10 | High #10 — hardcoded voice list in `VoiceAgentList.tsx` (plus `AgentEditModal.tsx`, `AgentConfiguration.tsx`) | Done | `89b1265` — all 3 now source voices from `GET /api/retell/voices`; `AgentEditModal.tsx`'s `"sarah-neural"` fallback removed. Note: `AgentConfiguration.tsx` is imported by `agents/voice/page.tsx` but never actually rendered there (pre-existing dead code, out of scope to fix here) |
| 11 | High #11 — legacy-role logic in `tenants/[id]/route.ts` GET+PATCH | Done | `6564db0` (pre-existing pending refactor to canonical permission gates, committed separately/transparently rather than silently bundled) + `3434485` (the actual fix: `membershipRole()` resolves `role_id -> roles.name` with legacy fallback; GET also gained the missing `status='active'` filter) |
| 12 | High #12 — white-label sweep (`ChatAgentList.tsx`, `AgentTestModal.tsx`, `AgentInteractionModal.tsx`, `AgentEditModal.tsx`, `TenantManagement.tsx`) | Done | `28cf2ad` (pre-existing `TenantManagement.tsx` reseller-removal/connect-flow refactor, committed separately/transparently) + `f1c0abc` (all remaining user-facing "Retell" text → "voice provider"/"AI Agent"/"the agent"; fixed a stray "a AI Agent ID" grammar bug; internal identifiers/API routes/comments/console output intentionally left alone) |

Medium-severity items (#13–#17) and the doc-accuracy notes above are intentionally out of scope for this 13-task pass; revisit in Phase 1b.

**All 13 tasks complete as of 2026-09-09.** Every commit above was independently reviewed (diff read, `npm run type-check`/`npm run lint` re-run against the real working tree, and — for Task 8 — an isolated git-worktree build check) before being marked Done.

### Known minor follow-up (not blocking, not part of this pass)
- Task 12 surfaced a small terminology inconsistency: some pre-existing pending edits in `ChatAgentList.tsx`/`AgentTestModal.tsx`/`AgentEditModal.tsx` introduced **"AI Assistant"** as a third white-label term alongside the established "voice provider" (`RetellIntegrationManagement.tsx`) and "AI Agent". None of these leak the vendor name, so finding #12 is satisfied, but a future pass should standardize on one term for consistency.
- Several tasks (11, 12, and to a lesser extent others) discovered that touched files already had large *pre-existing* uncommitted changes from an in-flight refactor unrelated to the specific finding being fixed. Where that pre-existing work was substantively different in scope (e.g. `TenantManagement.tsx`'s reseller-UI-to-connect-flow rework), it was committed separately and labeled "not authored by Task N" rather than silently bundled — see `6564db0` and `28cf2ad`. These separately-committed refactors were reviewed only for compile/lint cleanliness, not line-by-line audited against a spec, since they predate this remediation pass.
