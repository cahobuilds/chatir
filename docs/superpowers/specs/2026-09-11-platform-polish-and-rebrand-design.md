# Platform Polish, Whitelabel Sweep, and Visual Rebrand — Design

**Date:** 2026-09-11
**Status:** Approved by user, ready for implementation planning

## Context

Following the agent-template-creation-flow work and the RBAC/security hardening commits earlier this session, the user requested a broad end-to-end pass covering five areas:

1. End-to-end system testing (signup → agent creation → knowledge base) via Playwright.
2. A missing/unclear signup flow.
3. A "clunky" admin section.
4. Confirmation that a platform admin can create both a voice agent and a chat agent, and that knowledge bases work.
5. A comprehensive whitelabel sweep (zero "Retell" mentions on any company-facing or, per the final decision below, most platform-facing surface).
6. Small visual/branding changes so the product looks distinct from other clients built on the same underlying admin template ("TinAdmin"/TailAdmin-style), without changing the overall UX/layout structure.

This document captures the design decisions for the parts of this request that required judgment calls (whitelabel scope, admin reorg, visual direction). Signup/agent-creation/KB verification is **not** a design problem — the code already exists; it is a testing/bug-fixing pass covered directly by the implementation plan, not by this spec.

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

**Also part of this workstream:** update the visible product name/branding text (e.g., "AI Knowledge Bots" shown on the login page, and any other literal product-name strings) is explicitly **not** part of this rebrand — the user asked for color/layout differentiation, not a renaming exercise. Only visual styling changes; no copy/naming changes beyond what's already covered in the whitelabel section above.

### 5. Testing pass (drives the implementation plan's verification, not a design decision)

Using the `cursor-ide-browser` MCP tools (headed), after the above fixes are implemented:
1. Sign up as a brand-new company (fresh email) end-to-end; confirm redirect to dashboard works and the new org/user/role rows are correct.
2. As that new company's admin, create a voice agent via the template picker.
3. Create a chat agent via the template picker.
4. Attach/create a knowledge base and confirm it's usable by an agent (upload or link content, verify it shows as attached).
5. Spot-check the rebranded admin pages for visual regressions (broken contrast, unreadable text, etc.) introduced by the palette swap.
6. Do the final whitelabel grep re-sweep described in §2.

Any real bugs found during this pass are fixed as part of executing the plan, following the same root-cause-first debugging discipline used earlier this session (reproduce → read code → fix → re-verify live).

## Out of Scope (explicit non-goals)

- Stripe/billing integration of any kind (deferred, per user decision).
- Renaming the product / changing marketing copy beyond the whitelabel fixes in §2.
- Rebuilding the navigation information architecture (it's already reasonably organized from earlier work).
- Building real backend functionality for the four deleted demo settings components.
- Any reseller-hierarchy or `parent_id`/`is_reseller` schema changes (locked decision from `docs/RETELL_WORKSPACE_ISOLATION.md`, unrelated to this work).

## Success Criteria

- A brand-new user can sign up, land on their dashboard, create a voice agent, create a chat agent, and attach a knowledge base — all working live, verified via headed Playwright.
- `/settings` renders only real, working, correctly-scoped content.
- Zero "Retell"/"Retell AI" text visible to any company-role user anywhere in the product; internal platform-staff-only screens keep only already-whitelabeled visible copy.
- The admin UI reads as visually distinct (charcoal/amber/warm-off-white) from the original blue/indigo template theme, with identical navigation and page structure to before.
- `npm run type-check` and `npm run lint` pass after all changes.
