# Platform Polish, Whitelabel Sweep, and Visual Rebrand — Design

**Date:** 2026-09-11
**Status:** Approved by user, ready for implementation planning

## Context

Following the agent-template-creation-flow work and the RBAC/security hardening commits earlier this session, the user requested a broad end-to-end pass covering:

1. End-to-end system testing (signup → agent creation → knowledge base) via Playwright.
2. A missing/unclear signup flow.
3. A "clunky" admin section.
4. Confirmation that a platform admin can create both a voice agent and a chat agent, and that knowledge bases work.
5. A comprehensive whitelabel sweep (zero "Retell" mentions on any company-facing or, per the final decision below, most platform-facing surface).
6. Small visual/branding changes so the product looks distinct from other clients built on the same underlying admin template ("TinAdmin"/TailAdmin-style), without changing the overall UX/layout structure.

After the first design pass was approved, the user reopened three items that had been marked out of scope, expanding the request to also cover: a full product rename (§6 below), a review of whether the nav needs restructuring (§7), and a mock-UI Stripe/billing stub for both company-admin and platform-admin (§8).

This document captures the design decisions for the parts of this request that required judgment calls (whitelabel scope, admin reorg, visual direction, product name, billing-stub depth). Signup/agent-creation/KB verification is **not** a design problem — the code already exists; it is a testing/bug-fixing pass covered directly by the implementation plan, not by this spec.

## Decisions

### 1. Signup — verification only, no new design

Investigation found a fully wired signup flow already exists:
- `/auth/login?mode=signup` (also reachable via a redirect from `/auth/signup`) shows a "Create Account" tab on the same page as login.
- Submitting calls `POST /api/auth/signup`, which atomically creates the Supabase auth user, the `tenants` row, and the `user_tenants` (company_admin) row, then signs the user in.
- The route has a pre-existing `TODO` deferring Stripe/billing setup to a later phase.

**Decision:** Do not add a Stripe/payment step now (user's explicit choice: "skip_entirely"). Treat "sign up is missing" as a hypothesis to verify, not a confirmed gap — the implementation plan's job is to drive this flow live with Playwright as a brand-new user and fix whatever is actually broken (if anything), not to build new UI.

### 2. Whitelabel sweep — scope and concrete findings

**Scope decision:** "Retell" must not appear anywhere a **company user** (any of `company_admin`/`company_editor`/`company_viewer`) could see it. Screens that are strictly platform-staff-only (`platform_admin`/`platform_operator`/`platform_billing`) may keep internal references to "Retell" where they already exist and are not misleading (e.g., `TenantManagement.tsx`'s connect flow, which already labels the field "API Key" / "Voice Provider" in its user-visible copy and only uses "retell" in code-level names/comments). This is a narrowing of an earlier "zero mentions anywhere" answer, made after the user reviewed the specific screen in question.

**Concrete findings from this session's audit** (grep across `src/components` and `src/app` for case-insensitive "retell", ~22 files, manually categorized into user-visible text vs. internal-only names):

| Finding | Location | Disposition |
|---|---|---|
| Duplicate, ungated Retell key management UI | `src/components/RetellIntegrationManagement.tsx`, mounted on `src/app/(admin)/settings/page.tsx` | **Delete component + remove from `/settings`.** Fully redundant: `TenantManagement.tsx` at `/tenant-settings` (Platform-only, already gated, already says "API Key"/"Voice Provider" in its visible copy) already does the same thing, correctly. |
| Orphaned dev/test pages with literal "Retell"/"Retell AI" text | `src/app/test-retell/page.tsx`, `src/app/test-widget/page.tsx`, `src/app/test-retell-chat/page.tsx` | **Delete all three.** Not linked from navigation, not part of the product; pure leftover scaffolding. |
| Company-facing doc-path leak | `src/components/CreateIRAgentModal.tsx` (shown during agent creation, reachable by whoever can create agents) — references `docs/RETELL_IR_AGENT_TEMPLATE.md` in visible copy | **Remove the doc-path citation from the UI string.** Keep the plain-English description; drop the filename reference entirely (simpler UX regardless of whitelabeling). |
| Internal variable/comment names (`retellClient`, `retell_api_key`, `retellAgentId`, etc.) across API routes and components | Many files | **No change** — these are not company-facing; renaming them is unrelated churn with no user-visible benefit and higher regression risk. |
| `TenantManagement.tsx` connect flow | `/tenant-settings` (Platform-only) | **No change** — user-visible copy already whitelabeled; internal names may keep "Retell" per the narrowed scope decision above. |

**Verification step:** after the deletions/fixes above, re-run the grep sweep and manually confirm every remaining hit is either (a) inside a platform-staff-only screen with already-whitelabeled visible copy, or (b) a non-visible internal identifier/comment/API-path. Zero remaining hits in company-facing rendered text is the bar.

### 3. Admin reorganization

**Root cause identified:** `src/app/(admin)/settings/page.tsx` ("General Settings" in nav) renders six components with **no permission gating at all** — visible to any authenticated user regardless of role:

- `GeneralSettings` — real, calls `/api/tenants/[id]` — **keep**.
- `RetellIntegrationManagement` — real but redundant — **delete** (see §2).
- `SystemConfiguration`, `SecuritySettings`, `NotificationSettings`, `BackupSettings` — **no `fetch()` calls anywhere in any of the four**; pure template-leftover forms with local-only state. Their "Save" buttons give the user a false impression that something persisted. **Delete all four from this page** (component files may be deleted too if unused elsewhere — verify with a repo-wide usage grep before deleting the files themselves, not just the import).

After this change, `/settings` renders only the one real, working component it always should have. No nav restructuring is needed for this specific page — the fix is subtractive (removing dead/duplicate/misleading UI), not a new information architecture.

**Secondary pass:** while implementing, do a lightweight visual/UX consistency check (not a redesign) across `TenantManagement`, `UserManagement`, `RolesManagement`, and `RailwayServicesManagement` — the other pages under the already-reasonably-organized "Platform" nav section — looking specifically for: dead buttons (no `onClick`/handler), obviously broken modal sizing (the shared `Modal` default-width bug was already fixed this session, but verify no page overrides it back to something broken), and inconsistent page-header patterns. Fix only what's actually broken or misleading; do not restructure working pages for its own sake.

**Explicitly out of scope:** rebuilding the nav tree (`src/config/navigation.tsx` already groups platform-only items under one "Platform" section with a `platformOnly` flag from earlier work this session — that structure is sound and is not being redone), and building real backend-backed replacements for the four deleted demo components (that would be new feature work, not "less clunky").

### 4. Visual rebrand — Direction C ("Warm Charcoal & Amber")

Confirmed via the visual companion mockup comparison. Applies a new palette and a few small structural tweaks on top of the *existing* layout (sidebar + topbar + card-based content) — the user was explicit that only the visual language should change, not the UX/information architecture.

**Palette:**
- Sidebar background: charcoal `#292524` (was near-white with a blue active state)
- Accent (buttons, active states, badges, links): amber `#f59e0b`, with a darker `#d97706` for hover/emphasis
- Page background: warm off-white `#fdfbf7` (was cool gray/white `#f8fafc`-ish)
- Signature touch: one inverted dark stat-card on the dashboard, breaking the all-light-card monotony

**Structural tweaks:**
- Active sidebar nav item: subtle fill + amber left border, replacing the current solid-filled blue "pill" style
- No changes to sidebar width, collapse behavior, breakpoints, routing, or component structure

**Implementation approach:** Because nearly every themed surface in the app (buttons, active nav states, badges, form-focus rings, calendar events, etc.) already derives its color from the centralized `--color-brand-*` CSS custom property scale defined once in `src/app/globals.css` (currently the TailAdmin default blue, `--color-brand-500: #465fff`), the palette swap is primarily: (a) replace the `--color-brand-*` scale with an amber ramp, (b) change the sidebar's own background color (which is likely hardcoded separately from the brand scale, since it needs to stay dark while brand-500 stays a mid-tone accent — verify during implementation and adjust the specific sidebar background classes/variables), (c) swap the page background token, and (d) adjust the active-nav-item and stat-card component styles for the two structural tweaks above. This keeps the change centralized and low-risk rather than touching every component file individually.

**Relationship to the product rename (§6):** this section is colors/layout only. The literal product-name text (e.g., "AI Knowledge Bots" on the login page) is handled separately in §6 as its own rename-to-"Chat IR" task — listed there rather than here so the two concerns (visual palette vs. brand text) stay independently trackable in the implementation plan.

### 5. Testing pass (drives the implementation plan's verification, not a design decision)

Using the `cursor-ide-browser` MCP tools (headed), after the above fixes are implemented:
1. Sign up as a brand-new company (fresh email) end-to-end; confirm redirect to dashboard works and the new org/user/role rows are correct.
2. As that new company's admin, create a voice agent via the template picker.
3. Create a chat agent via the template picker.
4. Attach/create a knowledge base and confirm it's usable by an agent (upload or link content, verify it shows as attached).
5. Spot-check the rebranded admin pages for visual regressions (broken contrast, unreadable text, etc.) introduced by the palette swap.
6. Do the final whitelabel grep re-sweep described in §2.

Any real bugs found during this pass are fixed as part of executing the plan, following the same root-cause-first debugging discipline used earlier this session (reproduce → read code → fix → re-verify live).

### 6. Product rename — "Chat IR"

Audit of literal product-name/brand strings across the app found three inconsistent names in active use, one of which is a real whitelabel bug:

| String | Where | Count |
|---|---|---|
| "AI Knowledge Bots" | `src/app/layout.tsx` (root `<title>` metadata), `src/app/auth/login/page.tsx` (two `<h1>`s) | 4 files |
| "AI Customer Care" | `src/app/(admin)/billing/page.tsx` and 4 siblings (page metadata `title`/`description`) | 5 files |
| **"TinAdmin"** | 8 pages under `(admin)/analytics/*`, `(admin)/agents/*`, `(admin)/knowledge` — literally the purchased template vendor's own brand name leaking into the browser tab `<title>` | 8 files |

**Decision:** standardize every one of these on **"Chat IR"** — the login page headings, the root layout metadata title/description, every page-level metadata `title`, and any other literal product-name string found during a final grep pass. This does not touch favicon/logo image assets (out of scope — no new assets requested) unless a trivial text-only swap is possible.

### 7. Navigation — minor review, not a rebuild

Per the user's clarification, this is "probably minor" — not a redesign. During implementation, review the current top-level nav (`src/config/navigation.tsx`) for the one concrete candidate issue already spotted: "Voice Agents," "Chat Agents," "Call History," "Chat History," and "Knowledge Base" currently sit as five separate loose items directly under the `dashboard` category, ungrouped, while "Platform," "Analytics," and "Settings" are properly grouped into collapsible sections. If confirmed to be a real usability issue, group those five into one collapsible section (working name: "Agents & Content" — subject to a quick sanity check with the user if a better name presents itself during implementation). If, on review, the current flat structure is actually fine (e.g., because these are the most-used items and deliberately kept one click away), make no change and note that in the plan's verification step. This is explicitly a "fix only if actually broken" task, not a mandate to change something regardless.

### 8. Stripe stub — mock UI, billing screens only

**Depth decision:** mock UI only. No Stripe SDK integration, no real API calls, no requirement for real Stripe keys right now. Screens must look and feel real; nothing behind them talks to an external payment processor yet.

**Existing groundwork found in the schema** (from the earlier RBAC hardening work this session): `tenants.billing_plan` column already exists (values: `pay_as_you_go` / `monthly` / `annual` — a billing *cadence*, not a plan *tier*), and permission strings `billing.manage` (company-scoped) and `plans.update` (platform-scoped) already exist in the role/permission catalog. Reuse the permission strings as-is; they already fit this feature.

**New persisted state:** add a `plan_tier` column to `tenants` (`starter` / `pro` / `enterprise`, default `starter`) via a new Supabase migration — this is the one piece of billing state worth actually saving, since it's meaningful today (which tier an org is nominally on) and will be the real anchor point when Stripe is wired for real in Phase 5. `billing_plan` (cadence) is left untouched/unrelated.

**Company-admin screen** (new — a tab/section reachable from their Settings area, gated by `billing.manage`):
- Current plan tier + a usage summary (reuse whatever usage data is already surfaced elsewhere, e.g., call/chat counts — no new analytics pipeework)
- A "Payment Method" section: a styled card-entry form (card number / expiry / CVC-shaped inputs) that, on submit, only updates local/component state with a fake "•••• 4242 saved" confirmation — never sent anywhere, no real validation beyond basic format checks
- An "Invoices" section: a short static/illustrative list (e.g., 3 mock rows with plausible dates/amounts/statuses) clearly presentational, not backed by a real invoices table
- Plan-tier selection UI (Starter/Pro/Enterprise cards) that, unlike the payment method and invoices, **does** persist for real via a small API route updating `tenants.plan_tier` (since that's real, useful state)

**Platform-admin screen** (enhance the existing `/billing` page, not a new page):
- Add a per-organization plan/tier column to whatever list/table already renders there
- Add a stubbed cross-org invoice/payment history view (same "illustrative, not real" treatment as the company-admin invoices section)

**Environment placeholders:** add commented-out, empty placeholder entries to `.env.local` and `.env.example` for `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET`, with a one-line comment referencing this as future Phase 5 work. No code path reads these yet — they exist purely so the real integration later has an obvious place to drop keys in.

## Out of Scope (explicit non-goals)

- Any **real** Stripe/payment-processor integration (SDK calls, Checkout, webhooks, real charges) — still deferred to Phase 5. Only the mock UI described in §8 is in scope now.
- New logo/favicon assets (product rename in §6 is text-only).
- Building real backend functionality for the four deleted demo settings components (§3).
- Any reseller-hierarchy or `parent_id`/`is_reseller` schema changes (locked decision from `docs/RETELL_WORKSPACE_ISOLATION.md`, unrelated to this work).

## Success Criteria

- A brand-new user can sign up, land on their dashboard, create a voice agent, create a chat agent, and attach a knowledge base — all working live, verified via headed Playwright.
- `/settings` renders only real, working, correctly-scoped content.
- Zero "Retell"/"Retell AI" text visible to any company-role user anywhere in the product; internal platform-staff-only screens keep only already-whitelabeled visible copy.
- The admin UI reads as visually distinct (charcoal/amber/warm-off-white) from the original blue/indigo template theme, with identical navigation and page structure to before (aside from the one minor nav grouping fix in §7, if warranted).
- Every literal product-name string in the app reads "Chat IR" — zero remaining "AI Knowledge Bots," "AI Customer Care," or "TinAdmin" occurrences.
- A company-admin can view their plan tier, change it, see a stubbed payment-method section and invoice list; a platform-admin can see plan/tier per organization on `/billing`. None of it calls a real payment processor.
- `npm run type-check` and `npm run lint` pass after all changes.
