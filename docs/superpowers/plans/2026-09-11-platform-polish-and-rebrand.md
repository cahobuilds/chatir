# Platform Polish, Whitelabel Sweep, and Chat IR Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete dead/duplicate/misleading UI (redundant Retell key manager, 4 non-functional demo settings panels, 3 orphaned test pages), sweep every remaining company-facing "Retell" mention, rename the product to "Chat IR" everywhere, apply a new charcoal/amber visual palette, review (and lightly fix, if warranted) the nav, and add a mock-UI-only Stripe/billing stub (persisted plan tier + illustrative payment method/invoices) for both company-admin and platform-admin. Finish with a full headed-Playwright pass: sign up as a new company, create a voice agent, create a chat agent, attach a knowledge base, and re-verify the whitelabel/rename sweep.

**Architecture:** Each workstream from the spec becomes 1-2 self-contained tasks touching a disjoint set of files, so tasks can mostly run in parallel except where explicitly noted as dependent (the billing DB migration must land before the two billing-UI tasks). The visual rebrand is centralized in `globals.css`'s `--color-brand-*` scale plus a handful of component-level tweaks, reusing Tailwind's existing `dark:` custom-variant mechanism (`@custom-variant dark (&:is(.dark *));`) to force the sidebar permanently dark without touching any of the shared `menu-item-*` utility classes. The billing stub reuses the existing `tenants` table, existing `billing.manage`/`plans.update` permission strings, and the existing `PATCH /api/tenants/[id]` route (extended, not duplicated) — no new backend infrastructure beyond one migration and one new frontend route.

**Tech Stack:** Next.js App Router, React client components (existing `Modal`/`Form`/`Table`/`Badge` primitives), Supabase (Postgres + RLS), Tailwind CSS v4 (CSS custom properties + `@custom-variant`).

## Global Constraints

- No test framework exists in this repo. Verification is `npx tsc --noEmit -p .` + `npx eslint <changed files>` + manual/browser functional checks — there is no `pytest`/`jest` step in any task below.
- The server runs via `next build && next start` (production mode), NOT `next dev`. After ALL code changes for a task are in, rebuild (`npm run build`) and restart the backgrounded server before verifying anything in the browser. Use the Shell tool's `block_until_ms: 0` backgrounding to start it — plain `nohup ... &` has been proven not to survive in this sandboxed environment this session.
- Starting the server requires `required_permissions: ["all"]` (a sandboxed `uv_interface_addresses` syscall otherwise crashes `next start`).
- Every new/changed API route must gate writes through the existing permission helpers (`canAccessTenant`, `hasPlatformPermission` from `src/lib/permissions-server.ts`) — do not weaken or bypass them, and do not invent new ad-hoc role-name string checks (the canonical 6-role model is `company_admin`/`company_editor`/`company_viewer`/`platform_admin`/`platform_operator`/`platform_billing`).
- "Retell" may remain in code-level identifiers, comments, and API paths everywhere (unchanged) — this plan only removes/rewords **user-visible rendered text**. Per the approved spec, `TenantManagement.tsx`'s connect flow at `/tenant-settings` is explicitly allowed to keep it (its visible copy already says "API Key"/"Voice Provider", not "Retell").
- The Stripe stub is mock-UI only: no Stripe SDK import, no outbound HTTP call to any payment processor, anywhere in this plan. Only `plan_tier` is real, persisted state.
- Product rename target is exactly the string **"Chat IR"** (two words, capital C, capital I, capital R) everywhere a literal product name is replaced.

---

## Task 1: Delete dead, duplicate, and orphaned UI (whitelabel + admin cleanup)

**Model:** `composer-2.5-fast` | **Tool:** `generalPurpose` subagent | **Justification:** Pure deletions and one small text edit, all pre-verified safe (usage-checked) during planning. Tier 3 — mechanical, unambiguous.

**Files:**
- Delete: `src/components/RetellIntegrationManagement.tsx`
- Delete: `src/components/SystemConfiguration.tsx`
- Delete: `src/components/NotificationSettings.tsx`
- Delete: `src/components/BackupSettings.tsx`
- Delete: `src/app/test-retell/page.tsx`
- Delete: `src/app/test-widget/page.tsx`
- Delete: `src/app/test-retell-chat/page.tsx`
- Delete: `src/app/api/test-retell-chat/` (entire directory: `create-session/route.ts`, `send-message/route.ts`, `extract-transcript/route.ts`)
- Modify: `src/app/(admin)/settings/page.tsx`
- Modify: `src/components/CreateIRAgentModal.tsx`

**Pre-verified facts (do not re-derive, just act on them):**
- `RetellIntegrationManagement` is imported only by `src/app/(admin)/settings/page.tsx` (one other file, `TenantConfiguration.tsx`, mentions it only in a code *comment*, not an import — leave that comment alone, it is harmless and accurate).
- `SystemConfiguration`, `NotificationSettings`, `BackupSettings` are each imported only by `src/app/(admin)/settings/page.tsx`.
- `SecuritySettings` (the component at `src/components/SecuritySettings.tsx`, imported by `src/app/(admin)/settings/page.tsx`) is **also** imported by `src/app/(admin)/users/page.tsx` — **do NOT delete this file**, only remove its usage from `settings/page.tsx` in Step 1 below. (There is a *different* file, `src/components/profile/SecuritySettings.tsx`, used by `src/app/(admin)/profile/settings/page.tsx` — unrelated, do not touch it either.)
- None of `src/app/test-retell/page.tsx`, `src/app/test-widget/page.tsx`, `src/app/test-retell-chat/page.tsx` are linked from any nav config or any other page.
- `src/app/api/test-retell-chat/create-session/route.ts` and `.../send-message/route.ts` are called only by `src/app/test-retell-chat/page.tsx` (via `fetch('/api/test-retell-chat/...')`). `.../extract-transcript/route.ts` has no callers found anywhere in `src/` either — all three are safe to delete as a set.
- `src/app/test-retell/page.tsx` calls `/api/agents/${agentId}/test/web-call` — this is a real, actively-used production route (also called by `AgentTestModal.tsx`). Do not touch that route file.

- [ ] **Step 1: Rewrite `settings/page.tsx` to render only the real components**

Replace the entire contents of `src/app/(admin)/settings/page.tsx` with:

```tsx
"use client";

import React, { useRef } from "react";
import SettingsHeader from "@/components/SettingsHeader";
import GeneralSettings from "@/components/GeneralSettings";

export default function SettingsPage() {
  const generalSettingsRef = useRef<{ save: () => Promise<void> }>(null);

  const handleSave = async () => {
    if (generalSettingsRef.current) {
      await generalSettingsRef.current.save();
    }
  };

  return (
    <div className="space-y-6">
      <SettingsHeader onSave={handleSave} />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-6">
          <GeneralSettings ref={generalSettingsRef} />
        </div>
      </div>
    </div>
  );
}
```

(This removes `SystemConfiguration`, `SecuritySettings`, `NotificationSettings`, `BackupSettings`, and `RetellIntegrationManagement` from the page — `GeneralSettings` is the only one that was ever real, per this session's audit.)

- [ ] **Step 2: Delete the five dead component files and three test pages**

```bash
git rm src/components/RetellIntegrationManagement.tsx
git rm src/components/SystemConfiguration.tsx
git rm src/components/NotificationSettings.tsx
git rm src/components/BackupSettings.tsx
git rm src/app/test-retell/page.tsx
git rm src/app/test-widget/page.tsx
git rm src/app/test-retell-chat/page.tsx
git rm src/app/api/test-retell-chat/create-session/route.ts
git rm src/app/api/test-retell-chat/send-message/route.ts
git rm src/app/api/test-retell-chat/extract-transcript/route.ts
```

If any `git rm` fails because the directory still has files after individual removals, run `git rm -r src/app/api/test-retell-chat` instead to remove the whole now-empty directory tree.

- [ ] **Step 3: Fix the company-facing doc-path leak in `CreateIRAgentModal.tsx`**

Find this text (around line 204-208):

```tsx
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Creates a chat agent and/or a matching voice agent pre-configured with a
          restrictive investor-relations prompt, safety guardrails, and knowledge-base
          grounding defaults. See <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">docs/RETELL_IR_AGENT_TEMPLATE.md</code> for details.
        </p>
```

Replace with:

```tsx
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Creates a chat agent and/or a matching voice agent pre-configured with a
          restrictive investor-relations prompt, safety guardrails, and knowledge-base
          grounding defaults.
        </p>
```

(Drop the doc-path citation entirely — simpler copy, and removes the only company-facing "RETELL" text found in this file.)

- [ ] **Step 4: Verify nothing else imports the deleted files**

```bash
grep -rn "RetellIntegrationManagement\|SystemConfiguration\|NotificationSettings\|BackupSettings" src/ --include="*.tsx" --include="*.ts"
```

Expected: zero results (the settings-page imports are gone, and no other file ever referenced them per the pre-verified facts above). If anything unexpected shows up, stop and investigate before proceeding — do not delete a file something else still needs.

```bash
grep -rn "test-retell\|test-widget" src/ --include="*.tsx" --include="*.ts"
```

Expected: zero results.

- [ ] **Step 5: Verify with tsc/lint**

Run: `npx tsc --noEmit -p .` — expect no new errors (and no errors referencing any of the deleted files/paths).
Run: `npx eslint src/app/\(admin\)/settings/page.tsx src/components/CreateIRAgentModal.tsx` — expect no new errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "cleanup: delete redundant/dead/orphaned UI (whitelabel + admin polish)

- RetellIntegrationManagement.tsx: fully redundant with TenantManagement's
  already-gated, already-whitelabeled connect flow at /tenant-settings;
  this one was mounted on the ungated /settings page, reachable by any
  logged-in user regardless of role
- SystemConfiguration/SecuritySettings(settings-page copy only)/
  NotificationSettings/BackupSettings: zero fetch() calls in any of the
  four, pure local-state template leftovers whose 'Save' buttons
  persisted nothing
- test-retell/test-widget/test-retell-chat pages + the 3 API routes
  exclusive to test-retell-chat: unlinked dev scaffolding containing
  literal 'Retell'/'Retell AI' text
- CreateIRAgentModal: removed a company-facing doc-path reference to
  docs/RETELL_IR_AGENT_TEMPLATE.md"
```

---

## Task 2: Rename the product to "Chat IR" everywhere

**Model:** `composer-2.5-fast` | **Tool:** `generalPurpose` subagent | **Justification:** Pure find-and-replace across a pre-enumerated, exact list of files/strings. Tier 3 — zero ambiguity, the mapping is fully specified below.

**Files (17 total) — exact replacement table:**

| File | Old string | New string |
|---|---|---|
| `src/app/layout.tsx` | `title: "AI Knowledge Bots \| Intelligent Knowledge Management",` | `title: "Chat IR",` |
| `src/app/auth/login/page.tsx` (line ~122) | `<h1 className="text-4xl font-bold mb-4">AI Knowledge Bots</h1>` | `<h1 className="text-4xl font-bold mb-4">Chat IR</h1>` |
| `src/app/auth/login/page.tsx` (line ~172) | `<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI Knowledge Bots</h1>` | `<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Chat IR</h1>` |
| `src/app/auth/login/page.tsx` (line ~215) | `: 'Sign in to access your AI Knowledge Bots dashboard'}` | `: 'Sign in to access your Chat IR dashboard'}` |
| `src/app/not-found.tsx` (line ~43) | `&copy; {new Date().getFullYear()} - AI Knowledge Bots` | `&copy; {new Date().getFullYear()} - Chat IR` |
| `src/app/(admin)/tenant-settings/page.tsx` (lines 10-11) | `title:\n    "Organization Management \| AI Knowledge Bots",` | `title: "Organization Management \| Chat IR",` |
| `src/app/(admin)/billing/page.tsx` | `title: "Billing & Usage \| AI Customer Care",` | `title: "Billing & Usage \| Chat IR",` |
| `src/app/(admin)/dashboard/page.tsx` | `title: "Dashboard \| Multi-Tenant AI SaaS Platform",` | `title: "Dashboard \| Chat IR",` |
| `src/app/(admin)/admin/model-compare/page.tsx` | `title: "Model Comparison \| Multi-Tenant AI SaaS Platform",` | `title: "Model Comparison \| Chat IR",` |
| `src/app/(admin)/admin/railway-services/page.tsx` | `title: "Railway Services \| Multi-Tenant AI SaaS Platform",` | `title: "Railway Services \| Chat IR",` |
| `src/app/(admin)/admin/roles/page.tsx` | `title: "Roles Management \| Multi-Tenant AI SaaS Platform",` | `title: "Roles Management \| Chat IR",` |
| `src/app/(admin)/agents/chat/page.tsx` (lines 6-7) | `title:\n    "Chat Agent Management \| TinAdmin - AI Customer Care Dashboard",` | `title: "Chat Agent Management \| Chat IR",` |
| `src/app/(admin)/agents/voice/page.tsx` (lines 6-7) | `title:\n    "Voice Agent Management \| AI Customer Care - TinAdmin",` | `title: "Voice Agent Management \| Chat IR",` |
| `src/app/(admin)/knowledge/page.tsx` (line 23) | `document.title = "Knowledge Base Management \| AI Customer Care - TinAdmin";` | `document.title = "Knowledge Base Management \| Chat IR";` |
| `src/app/(admin)/analytics/page.tsx` (lines 12-13) | `title:\n    "Analytics & Reporting \| AI Customer Care - TinAdmin",` | `title: "Analytics & Reporting \| Chat IR",` |
| `src/app/(admin)/analytics/calls/page.tsx` | `title: "Call Analytics \| Analytics - TinAdmin",` | `title: "Call Analytics \| Chat IR",` |
| `src/app/(admin)/analytics/agents/page.tsx` | `title: "Agent Performance \| Analytics - TinAdmin",` | `title: "Agent Performance \| Chat IR",` |
| `src/app/(admin)/analytics/agents/[id]/page.tsx` | `title: "Agent Performance Details \| Analytics - TinAdmin",` | `title: "Agent Performance Details \| Chat IR",` |
| `src/app/(admin)/analytics/customer-experience/page.tsx` | `title: "Customer Experience \| Analytics - TinAdmin",` | `title: "Customer Experience \| Chat IR",` |

- [ ] **Step 1: Apply every row of the table above**

Read each file, locate the exact old string (adjusting only for the exact surrounding quote/comma punctuation already in that file), and replace it with the new string. Where a title was split across two lines (`title:\n    "..."`), it is fine to collapse it to one line as shown, or keep it split across two lines with the new string — either is acceptable, the rendered `<title>` text is what matters.

- [ ] **Step 2: Final grep sweep for any remaining brand-string leftovers**

```bash
grep -rn "AI Knowledge Bots\|AI Customer Care\|TinAdmin\|Multi-Tenant AI SaaS Platform" src/ --include="*.tsx" --include="*.ts"
```

Expected: zero results. If anything remains, apply the same "Chat IR" replacement to it before moving on (this catches any occurrence this planning pass missed).

- [ ] **Step 3: Verify with tsc/lint**

Run: `npx tsc --noEmit -p .` — expect no new errors.
Run: `npx eslint $(git diff --name-only --cached -- '*.tsx' '*.ts' | tr '\n' ' ')` (or list the 17 files explicitly) — expect no new errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "rebrand: standardize on 'Chat IR' as the product name everywhere

Found and unified 4 inconsistent brand strings across 17 files:
'AI Knowledge Bots', 'AI Customer Care', 'Multi-Tenant AI SaaS
Platform', and 'TinAdmin' (the purchased admin template's own vendor
name, leaking into 8 page's browser tab titles - a real whitelabel
bug, not just inconsistency)."
```

---

## Task 3: Nav review — group loose top-level items only if warranted

**Model:** `claude-sonnet-5-thinking-high` | **Tool:** `generalPurpose` subagent | **Justification:** Requires judgment ("is this actually a problem, or fine as-is?") rather than a scripted change — Tier 2 per the escalation rules ("fix only if actually broken" is a review task, not mechanical).

**Files:**
- Modify (only if the review concludes a change is warranted): `src/config/navigation.tsx`

**Files:**
- Modify: `src/config/navigation.tsx`

**Interfaces:**
- Consumes: existing `NavItem`/`NavSubItem` types already defined in this file — no signature changes.

- [ ] **Step 1: Read the current nav config in full and make the call**

Read `src/config/navigation.tsx` (already small, ~340 lines). The specific candidate issue identified during planning: "Voice Agents," "Chat Agents," "Call History," "Chat History," and "Knowledge Base" currently sit as five separate top-level `NavItem` entries in the `dashboard` category (each with its own `path`, no `subItems` grouping), while "Platform," "Analytics," and "Settings" are each a single `NavItem` with a `subItems` array that renders as a collapsible section.

Decide: is having 5+1 (Dashboard itself) = 6 always-visible top-level rows before you reach the three collapsible sections actually a usability problem, or is it fine because these are the most-used pages and deliberately kept one click away? There is no wrong answer here as long as it's a real judgment call, not a coin flip — look at how many total top-level rows exist today (6 flat + 3 collapsible-section headers = 9 rows minimum height) and use your own judgment about whether that's excessive for a sidebar.

- [ ] **Step 2a: If you conclude NO change is needed**

Skip to Step 3 (verification) with no file changes. Note in your final report to the user: "Reviewed the nav — the 5 loose top-level items under Dashboard are fine as-is (justification: ...)." This is a valid, complete outcome for this task.

- [ ] **Step 2b: If you conclude a change IS needed**

Group "Voice Agents," "Chat Agents," "Call History," "Chat History," and "Knowledge Base" into one collapsible `NavItem` (working name: "Agents & Content" — pick a better name if one occurs to you, note the name you chose in your final report). Structure it exactly like the existing "Analytics" `NavItem` (see lines ~154-190 of the current file for the pattern: a parent with `subItems`, `defaultOpen: true`). Move each of the 5 current top-level entries (preserving every existing field: `icon`, `path`, `type`, `badge`, `description` unchanged) into the new parent's `subItems` array, keep "Dashboard" itself as the only remaining flat top-level item in the `dashboard` category. Do not change any `path` values — every existing link must keep working at its current URL, this is purely a visual grouping change.

- [ ] **Step 3: Verify with tsc/lint**

Run: `npx tsc --noEmit -p .` — expect no new errors.
Run: `npx eslint src/config/navigation.tsx` — expect no new errors.

- [ ] **Step 4: Browser-verify (whichever outcome)**

Rebuild is not required for this task alone if bundled with Task 4's rebuild later, but if running standalone: confirm in the browser that every nav link that existed before this task still resolves to the same page, and (if Step 2b applied) that the new collapsible section opens/closes and highlights the active item correctly, matching the existing behavior of the "Analytics" section.

- [ ] **Step 5: Commit (skip if Step 2a — no changes to commit)**

```bash
git add src/config/navigation.tsx
git commit -m "chore(nav): group Agents & Content nav items into a collapsible section

Voice Agents, Chat Agents, Call History, Chat History, and Knowledge
Base were 5 separate always-visible top-level rows; grouped them the
same way Analytics/Settings/Platform already are. No path changes."
```

---

## Task 4: Visual rebrand — charcoal/amber palette (Direction C)

**Model:** `claude-sonnet-5-thinking-high` | **Tool:** `generalPurpose` subagent | **Justification:** Touches a shared design-token file plus a load-bearing layout component (sidebar); needs care to avoid contrast/dark-mode regressions across the whole app. Tier 2.

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/layout/AppSidebar.tsx`
- Modify: `src/components/DashboardOverview.tsx`

**Previous Phase Context Review:** This task is independent of Tasks 1-3 (different files) and can run in parallel with them, but must land before Task 8's final browser verification pass. No dependency to review before starting.

- [ ] **Step 1: Replace the brand color scale with an amber ramp**

In `src/app/globals.css`, find (around line 41-52):

```css
  --color-brand-25: #f2f7ff;
  --color-brand-50: #ecf3ff;
  --color-brand-100: #dde9ff;
  --color-brand-200: #c2d6ff;
  --color-brand-300: #9cb9ff;
  --color-brand-400: #7592ff;
  --color-brand-500: #465fff;
  --color-brand-600: #3641f5;
  --color-brand-700: #2a31d8;
  --color-brand-800: #252dae;
  --color-brand-900: #262e89;
  --color-brand-950: #161950;
```

Replace with:

```css
  --color-brand-25: #fffbeb;
  --color-brand-50: #fef3c7;
  --color-brand-100: #fde68a;
  --color-brand-200: #fcd34d;
  --color-brand-300: #fbbf24;
  --color-brand-400: #f59e0b;
  --color-brand-500: #d97706;
  --color-brand-600: #b45309;
  --color-brand-700: #92400e;
  --color-brand-800: #78350f;
  --color-brand-900: #451a03;
  --color-brand-950: #2d0f02;
```

(Every button, active nav state, badge, focus ring, and calendar-event color that already reads from `--color-brand-*` picks up the new amber ramp automatically — this is the single highest-leverage change in this task.)

- [ ] **Step 2: Swap the page background to warm off-white**

In `src/app/globals.css`, find (around line 188):

```css
  body {
    @apply relative font-normal font-outfit z-1 bg-gray-50;
  }
```

Replace with:

```css
  body {
    @apply relative font-normal font-outfit z-1 bg-[#fdfbf7];
  }
```

- [ ] **Step 3: Make the sidebar permanently charcoal, independent of the app's light/dark toggle**

This codebase's dark-mode variant is defined as `@custom-variant dark (&:is(.dark *));` (top of `globals.css`) — meaning any element inside an ancestor with the literal class `dark` gets its `dark:*` utilities activated, regardless of what class is on `<html>`. Use this to force the sidebar's children (nav items, icons, badges) into their already-correct dark-mode styling permanently, without touching any shared `menu-item-*` utility class.

In `src/layout/AppSidebar.tsx`, find the `<aside>` opening tag (around line 396-399):

```tsx
    <aside
      className={`fixed flex flex-col xl:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-full transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
```

Replace with:

```tsx
    <aside
      // "dark" is added as a literal class (not a dark: variant) so this subtree always
      // renders in its dark-mode colors regardless of the app-wide light/dark toggle -
      // this is the permanent charcoal sidebar from the Chat IR visual rebrand. bg/text/
      // border below are deliberately NOT gated behind dark: since they must never change.
      className={`dark fixed flex flex-col xl:mt-0 top-0 px-5 left-0 bg-stone-900 text-gray-100 border-stone-800 h-full transition-all duration-300 ease-in-out z-50 border-r 
        ${
```

- [ ] **Step 4: Give the active nav item a left-border accent instead of a filled pill**

In `src/app/globals.css`, find (around line 196-198):

```css
@utility menu-item-active {
  @apply bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400;
}
```

Replace with:

```css
@utility menu-item-active {
  @apply bg-brand-50 text-brand-500 border-l-2 border-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400 dark:border-brand-400;
}
```

(Since the sidebar is now permanently in its `dark:` styling per Step 3, this renders as a subtle amber-tinted fill plus a solid amber left border inside the sidebar. This utility is also used by non-sidebar dropdown/menu contexts elsewhere in the app — the added left border is subtle enough to look intentional there too, not broken; if a live check in Task 8 finds it looks wrong in a specific non-sidebar spot, that's an acceptable minor follow-up fix, not a blocker.)

- [ ] **Step 5: Add the one inverted "signature" stat card on the dashboard**

In `src/components/DashboardOverview.tsx`, find the metric-card rendering (around line 268-276):

```tsx
      <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 ${canViewOrganizations ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
        {metricCards.map((metric, index) => (
          <div
            key={index}
            className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800 border border-gray-200 dark:border-white/[0.05]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`rounded-lg p-3 ${metric.color}`}>
                <span className="text-white text-xl">{metric.icon}</span>
```

Replace the card's `className` with an index-0-special-case:

```tsx
      <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 ${canViewOrganizations ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
        {metricCards.map((metric, index) => (
          <div
            key={index}
            className={
              index === 0
                ? "rounded-lg bg-stone-900 text-white p-6 shadow-sm border border-stone-800"
                : "rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800 border border-gray-200 dark:border-white/[0.05]"
            }
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`rounded-lg p-3 ${metric.color}`}>
                <span className="text-white text-xl">{metric.icon}</span>
```

Below that, the card's title/value text currently reads `text-gray-500 dark:text-gray-400` (label) and `text-gray-900 dark:text-white` (value) — read the ~15 lines directly following this block in the actual file and add the same `index === 0 ? "text-gray-300" : "text-gray-500 dark:text-gray-400"` (and equivalent for the value, using `"text-white"` unconditionally there since white-on-dark and white-on-light-via-dark: both already resolve correctly) ternary pattern so the first card's text stays legible against its new dark background regardless of the rest of the grid's light styling.

- [ ] **Step 6: Verify with tsc/lint**

Run: `npx tsc --noEmit -p .` — expect no new errors.
Run: `npx eslint src/layout/AppSidebar.tsx src/components/DashboardOverview.tsx` — expect no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/layout/AppSidebar.tsx src/components/DashboardOverview.tsx
git commit -m "style: apply Chat IR visual rebrand (charcoal sidebar + amber accent)

- --color-brand-* scale swapped from TailAdmin default blue (#465fff)
  to an amber ramp (#d97706 base) - recolors every button, active nav
  state, badge, and focus ring app-wide from one place
- Page background swapped to warm off-white (#fdfbf7)
- Sidebar forced permanently dark (charcoal) via the literal 'dark'
  class, independent of the app-wide light/dark toggle, reusing the
  existing @custom-variant dark (&:is(.dark *)) mechanism instead of
  touching the shared menu-item-* utilities
- Active nav item gets a left-border accent instead of a filled pill
- First dashboard stat card inverted to a dark signature card"
```

---

## Task 5: Add the `plan_tier` column to `tenants`

**Model:** `claude-sonnet-5-thinking-high` | **Tool:** `generalPurpose` subagent | **Justification:** Schema change on a security/tenant-scoped table — start at Tier 2 minimum per the escalation rules ("RLS policies, tenant isolation... always start at Tier 1 minimum" for design, but this is a single additive column with no RLS-policy change, matching existing patterns exactly, so Tier 2 implementation is appropriate here).

**Files:**
- Create: `supabase/migrations/20260911120000_add_plan_tier_to_tenants.sql`

**Interfaces:**
- Produces: `tenants.plan_tier` column, type `text`, `CHECK (plan_tier IN ('starter', 'pro', 'enterprise'))`, `DEFAULT 'starter'`, `NOT NULL`. Tasks 6 and 7 read/write this exact column name and these exact three values.

**Depends on:** nothing (independent of Tasks 1-4). Tasks 6 and 7 depend on this task.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260911120000_add_plan_tier_to_tenants.sql`:

```sql
-- Add plan_tier to tenants: the one piece of billing state worth persisting for the
-- mock-UI Stripe stub (see docs/superpowers/specs/2026-09-11-platform-polish-and-rebrand-design.md
-- section 8). This is independent of the existing billing_plan column, which tracks
-- billing *cadence* (pay_as_you_go/monthly/annual), not plan *tier*.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'starter'
  CHECK (plan_tier IN ('starter', 'pro', 'enterprise'));

COMMENT ON COLUMN tenants.plan_tier IS
  'Nominal plan tier shown in the mock-UI billing stub (starter/pro/enterprise). Not yet wired to a real payment processor - see Phase 5 in docs/superpowers/specs/2026-09-11-platform-polish-and-rebrand-design.md.';
```

- [ ] **Step 2: Apply the migration locally**

Run whichever command this project already uses to apply Supabase migrations locally (check `package.json` scripts for a `db:migrate`/`supabase:push`-style script first, e.g. `npm run db:migrate` or `npx supabase db push`; if none exists, use `npx supabase migration up` or the project's documented local Postgres connection with `psql -f supabase/migrations/20260911120000_add_plan_tier_to_tenants.sql`). Confirm success by querying the column exists:

```sql
SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'plan_tier';
```

Expected: one row, `plan_tier | text | 'starter'::text`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260911120000_add_plan_tier_to_tenants.sql
git commit -m "feat(db): add tenants.plan_tier for the mock-UI billing stub

starter/pro/enterprise, defaults to starter. Independent of the
existing billing_plan (cadence) column. Not yet read by any real
payment processor - Phase 5 work per the design spec."
```

---

## Task 6: Company-admin billing screen (mock UI + real plan tier)

**Model:** `claude-sonnet-5-thinking-high` | **Tool:** `generalPurpose` subagent | **Justification:** New page with real judgment calls (mock-vs-real data boundaries, permission gating, form UX) touching both frontend and one backend route extension. Tier 2.

**Depends on:** Task 5 (needs `tenants.plan_tier` to exist).

**Previous Phase Context Review:** Read `src/app/api/tenants/[id]/route.ts`'s `PATCH` handler in full (already inspected during planning — it destructures `{ name, subdomain, tier, settings, branding, retell_api_key, is_reseller, parent_id }` from the body, builds an `updateData` object field-by-field with its own permission check per field, then writes via `clientToUse.from('tenants').update(updateData)`). This task adds one more field to that same destructure/update pattern — follow the existing style exactly, don't introduce a different validation idiom.

**Files:**
- Modify: `src/app/api/tenants/[id]/route.ts`
- Create: `src/components/CompanyBilling.tsx`
- Create: `src/app/(admin)/settings/billing/page.tsx`
- Modify: `src/config/navigation.tsx`

**Interfaces:**
- Produces: `PATCH /api/tenants/[id]` now also accepts `{ plan_tier: "starter" | "pro" | "enterprise" }` in its body, gated by `billing.manage` (company-scope, already exists in the permission catalog) for non-platform-staff callers.

- [ ] **Step 1: Extend the PATCH route to accept `plan_tier`**

In `src/app/api/tenants/[id]/route.ts`, find the destructure line (around line 197):

```ts
    const { name, subdomain, tier, settings, branding, retell_api_key, is_reseller, parent_id } = body;
```

Replace with:

```ts
    const { name, subdomain, tier, settings, branding, retell_api_key, is_reseller, parent_id, plan_tier } = body;
```

Find the block that builds `updateData` for `branding` (around line 224-225):

```ts
    if (branding !== undefined) updateData.branding = branding;
```

Immediately after it, add:

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

- [ ] **Step 2: Create the company-admin billing component**

Create `src/components/CompanyBilling.tsx`:

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { CreditCardIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useOrganization } from "@/context/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import Button from "./ui/button/Button";
import Alert from "./ui/alert/Alert";

interface PlanTierOption {
  id: "starter" | "pro" | "enterprise";
  name: string;
  price: string;
  features: string[];
}

const PLAN_TIERS: PlanTierOption[] = [
  { id: "starter", name: "Starter", price: "$99/mo", features: ["1 voice agent", "1 chat agent", "5,000 msgs/mo"] },
  { id: "pro", name: "Pro", price: "$299/mo", features: ["5 voice agents", "5 chat agents", "50,000 msgs/mo", "Priority support"] },
  { id: "enterprise", name: "Enterprise", price: "Contact us", features: ["Unlimited agents", "Unlimited usage", "Dedicated support"] },
];

// Illustrative-only mock data - never sent anywhere, no real payment processor is
// wired up yet. See docs/superpowers/specs/2026-09-11-platform-polish-and-rebrand-design.md
// section 8 for the Phase 5 real-Stripe follow-up.
const MOCK_INVOICES = [
  { id: "INV-0003", date: "2026-08-01", amount: 299, status: "paid" },
  { id: "INV-0002", date: "2026-07-01", amount: 299, status: "paid" },
  { id: "INV-0001", date: "2026-06-01", amount: 99, status: "paid" },
];

export default function CompanyBilling() {
  const { currentOrganization } = useOrganization();
  const { hasPermission } = usePermissions(currentOrganization?.id || null);
  const canManageBilling = hasPermission("billing.manage");

  const [currentTier, setCurrentTier] = useState<PlanTierOption["id"]>("starter");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardSaved, setCardSaved] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      if (!currentOrganization?.id) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/tenants/${currentOrganization.id}`);
        if (res.ok) {
          const data = await res.json();
          const tier = data.tenant?.plan_tier;
          if (tier === "starter" || tier === "pro" || tier === "enterprise") {
            setCurrentTier(tier);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, [currentOrganization?.id]);

  const handleSelectTier = async (tierId: PlanTierOption["id"]) => {
    if (!currentOrganization?.id || tierId === currentTier) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/tenants/${currentOrganization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: tierId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update plan");
      setCurrentTier(tierId);
      setSuccess(`Plan updated to ${tierId}.`);
    } catch (err: any) {
      setError(err.message || "Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock only - never sent anywhere. Real Stripe Elements integration is Phase 5.
    const last4 = cardNumber.replace(/\D/g, "").slice(-4) || "4242";
    setCardSaved(last4);
    setCardNumber("");
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

  return (
    <div className="space-y-6">
      {error && <Alert variant="error" title="Error" message={error} />}
      {success && <Alert variant="success" title="Success" message={success} />}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_TIERS.map((tier) => (
            <button
              key={tier.id}
              type="button"
              disabled={saving}
              onClick={() => handleSelectTier(tier.id)}
              className={`text-left rounded-xl border p-4 transition-colors ${
                tier.id === currentTier
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                  : "border-gray-200 dark:border-gray-700 hover:border-brand-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900 dark:text-white">{tier.name}</span>
                {tier.id === currentTier && (
                  <span className="text-xs font-medium text-brand-600 dark:text-brand-400">Current</span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{tier.price}</p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {tier.features.map((f) => <li key={f}>• {f}</li>)}
              </ul>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <CreditCardIcon className="w-5 h-5" /> Payment Method
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Illustrative only for now — no real card is stored or charged.
        </p>
        {cardSaved ? (
          <p className="text-sm text-gray-700 dark:text-gray-300">Visa •••• {cardSaved} saved.</p>
        ) : (
          <form onSubmit={handleSaveCard} className="flex flex-wrap gap-2 items-end">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Card number"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
              maxLength={19}
              required
            />
            <Button size="sm" type="submit">Save</Button>
          </form>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5" /> Invoices
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Illustrative example invoices.</p>
        <div className="space-y-2">
          {MOCK_INVOICES.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm">
              <span className="text-gray-900 dark:text-white">{inv.id}</span>
              <span className="text-gray-500 dark:text-gray-400">{inv.date}</span>
              <span className="text-gray-900 dark:text-white">${inv.amount}.00</span>
              <span className="text-green-600 dark:text-green-400 capitalize">{inv.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the page and wire it into nav**

Create `src/app/(admin)/settings/billing/page.tsx`:

```tsx
import type { Metadata } from "next";
import React from "react";
import CompanyBilling from "@/components/CompanyBilling";

export const metadata: Metadata = {
  title: "Billing | Chat IR",
  description: "Manage your organization's plan and billing.",
};

export default function CompanyBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your plan, payment method, and invoices</p>
      </div>
      <CompanyBilling />
    </div>
  );
}
```

In `src/config/navigation.tsx`, find the commented-out future item (in the "Settings" section's `subItems`, near the end):

```tsx
      // Future settings items
      // {
      //   name: "API Keys",
      //   path: "/settings/api-keys",
      //   type: "functional",
      //   description: "Manage API keys",
      // },
      // {
      //   name: "Billing",
      //   path: "/settings/billing",
      //   type: "functional",
      //   description: "Billing and subscription",
      // },
```

Replace it with (uncommenting just the Billing entry, leaving the API Keys one commented since it's unrelated to this plan):

```tsx
      {
        name: "Billing",
        path: "/settings/billing",
        type: "functional",
        description: "Manage your plan, payment method, and invoices",
      },
      // Future settings items
      // {
      //   name: "API Keys",
      //   path: "/settings/api-keys",
      //   type: "functional",
      //   description: "Manage API keys",
      // },
```

- [ ] **Step 4: Add the Stripe env placeholders**

Create `.env.example` (does not exist yet in this repo) with:

```bash
# Stripe (Phase 5 - real payment processor integration, not yet wired to any code path).
# The current billing screens (/settings/billing, /billing) are mock UI only.
# STRIPE_SECRET_KEY=
# STRIPE_PUBLISHABLE_KEY=
# STRIPE_WEBHOOK_SECRET=
```

Append the same three commented lines to the end of `.env.local` (do not commit `.env.local` — it's gitignored — this just keeps the two files consistent for local dev).

- [ ] **Step 5: Verify with tsc/lint**

Run: `npx tsc --noEmit -p .` — expect no new errors.
Run: `npx eslint src/app/api/tenants/\[id\]/route.ts src/components/CompanyBilling.tsx "src/app/(admin)/settings/billing/page.tsx" src/config/navigation.tsx` — expect no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/tenants/\[id\]/route.ts src/components/CompanyBilling.tsx "src/app/(admin)/settings/billing/page.tsx" src/config/navigation.tsx .env.example
git commit -m "feat(billing): company-admin billing screen (mock UI, real plan tier)

Plan-tier selection persists for real via PATCH /api/tenants/[id]
(gated by billing.manage). Payment method and invoices are explicitly
illustrative mock data only - no Stripe SDK, no outbound calls to any
payment processor. Adds .env.example with commented Stripe placeholders
for the real Phase 5 integration."
```

---

## Task 7: Platform-admin `/billing` page — per-organization plan tier

**Model:** `claude-sonnet-5-thinking-high` | **Tool:** `generalPurpose` subagent | **Justification:** Reworks an existing platform-only page to reflect real per-org data instead of one hardcoded fake plan; needs judgment on how to integrate an org-selector into existing markup. Tier 2.

**Depends on:** Task 5 (needs `tenants.plan_tier`). Independent of Task 6 (different files) — can run in parallel with it.

**Previous Phase Context Review:** Read `src/components/TenantBilling.tsx` in full (already inspected during planning — it is 100% hardcoded mock state today: fake "Enterprise $299/mo" plan, fake usage bars, fake invoices, fake payment method, with zero `fetch()` calls anywhere in the file, despite the page's nav description claiming "Plans and usage across all organizations"). This task adds a real org selector and wires the "Current Plan" section to each org's real `plan_tier`; the usage/payment-method/invoices sections stay mock, per the design spec's explicit "illustrative, not real" treatment for those three.

**Files:**
- Modify: `src/components/TenantBilling.tsx`

- [ ] **Step 1: Add an organization selector and real plan-tier fetch/update**

Read the full current file first. Add these imports at the top (alongside the existing ones):

```tsx
import { useEffect } from "react";
```

Add this state near the top of the component, replacing nothing yet (the existing `billingData` state stays, for the mock usage/payment/invoices sections):

```tsx
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedTenantPlanTier, setSelectedTenantPlanTier] = useState<"starter" | "pro" | "enterprise">("starter");
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [updatingTier, setUpdatingTier] = useState(false);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await fetch("/api/tenants");
        if (res.ok) {
          const data = await res.json();
          setTenants(data.tenants || []);
          if (data.tenants?.length > 0) {
            setSelectedTenantId(data.tenants[0].id);
          }
        }
      } finally {
        setTenantsLoading(false);
      }
    };
    fetchTenants();
  }, []);

  useEffect(() => {
    const fetchSelectedTenant = async () => {
      if (!selectedTenantId) return;
      const res = await fetch(`/api/tenants/${selectedTenantId}`);
      if (res.ok) {
        const data = await res.json();
        const tier = data.tenant?.plan_tier;
        setSelectedTenantPlanTier(tier === "pro" || tier === "enterprise" ? tier : "starter");
      }
    };
    fetchSelectedTenant();
  }, [selectedTenantId]);

  const handleChangeTier = async (tier: "starter" | "pro" | "enterprise") => {
    if (!selectedTenantId) return;
    setUpdatingTier(true);
    try {
      const res = await fetch(`/api/tenants/${selectedTenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: tier }),
      });
      if (res.ok) setSelectedTenantPlanTier(tier);
    } finally {
      setUpdatingTier(false);
    }
  };
```

- [ ] **Step 2: Render the org selector and real plan-tier cards above the existing (mock) sections**

Find the component's opening render block (around line 69-77):

```tsx
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <CreditCardIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Billing & Usage
          </h3>
        </div>
      </div>
```

Insert an organization selector immediately after that closing `</div>` for the header block, before the `<div className="p-6 space-y-6">` that follows it:

```tsx
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

      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Plan Tier (real, persisted)</h4>
        <div className="flex gap-2">
          {(["starter", "pro", "enterprise"] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              disabled={updatingTier}
              onClick={() => handleChangeTier(tier)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize border ${
                tier === selectedTenantPlanTier
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>
```

Leave every section below this (Current Plan, Usage Statistics, Payment Method, Recent Invoices, Billing Alerts) exactly as-is — those stay the existing illustrative mock data, per the design spec's decision that only the plan tier is real for now. Optionally (not required) add a one-line `<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Illustrative example data</p>` under the existing "Current Plan"/"Recent Invoices" headings if you want to make the mock-vs-real boundary explicit to a platform admin looking at this page — use your judgment, this is a nice-to-have, not a hard requirement.

- [ ] **Step 3: Verify with tsc/lint**

Run: `npx tsc --noEmit -p .` — expect no new errors.
Run: `npx eslint src/components/TenantBilling.tsx` — expect no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/TenantBilling.tsx
git commit -m "feat(billing): platform-admin /billing gets a real per-org plan tier

Adds an organization selector and wires plan-tier selection to the
real, persisted tenants.plan_tier column via PATCH /api/tenants/[id].
Usage/payment-method/invoices sections remain illustrative mock data,
matching the company-admin billing screen's same mock-vs-real split."
```

---

## Task 8: Rebuild and full end-to-end verification

**Model:** `claude-opus-5-thinking-high` | **Tool:** `shell` + direct browser verification (orchestrator, not a dispatched subagent) | **Justification:** Cross-workstream verification touching all 7 prior tasks' output together for the first time - orchestrator-level per the escalation rules ("cross-workstream coordination always Tier 1").

**Depends on:** Tasks 1-7 all merged.

**Previous Phase Context Review:** Before starting, run `git log --oneline -8` and confirm all 7 prior task commits are present (Task 3 may have produced zero commits if it concluded no nav change was warranted — that's fine, don't block on it). Re-read this plan's Global Constraints about `next start` needing an explicit rebuild before any browser check is meaningful.

- [ ] **Step 1: Full type-check and lint**

Run: `npx tsc --noEmit -p .` — zero errors.
Run: `npx eslint src/` (full repo, or at minimum every file touched across Tasks 1-7) — no new errors introduced by this plan (pre-existing errors from before this plan started are out of scope to fix).

- [ ] **Step 2: Final whitelabel + rename grep sweep**

```bash
grep -rln "retell" src/components src/app --include="*.tsx" -i
```

For every file returned, manually confirm each hit is either (a) an internal identifier/comment/API-path with no user-visible rendered text containing "Retell", or (b) inside `TenantManagement.tsx`'s connect flow specifically (the one explicitly-allowed exception). If any other file has literal rendered "Retell" text, fix it now before proceeding (reword to generic language, following the same style as the fixes already made in Task 1).

```bash
grep -rn "AI Knowledge Bots\|AI Customer Care\|TinAdmin\|Multi-Tenant AI SaaS Platform" src/ --include="*.tsx" --include="*.ts"
```

Expected: zero results (Task 2 already swept this, this just re-confirms nothing regressed).

- [ ] **Step 3: Rebuild and restart the backgrounded production server**

```bash
npm run build
```

Then find and kill the currently-listening `next-server` process (`lsof -iTCP:3000 -sTCP:LISTEN -P`, `kill <pid>`), then start a new one with the Shell tool's `block_until_ms: 0` backgrounding and `required_permissions: ["all"]`:

```bash
npm run start -- -p 3000
```

- [ ] **Step 4: Browser-verify signup end-to-end (headed, `cursor-ide-browser` MCP)**

Navigate to `/auth/login`, click the "Create Account" tab, fill in a fresh test email/password/name/company name, submit. Confirm: no error, redirect to `/dashboard`, the new organization's name appears in the org switcher, and the page chrome shows "Chat IR" branding with the new charcoal/amber visual style (not the old blue). If anything fails, apply the systematic-debugging discipline (reproduce → read the relevant code → fix → re-verify live) before moving on — this is exactly the "verify signup, fix real bugs if found" task from the design spec.

- [ ] **Step 5: Browser-verify voice agent creation**

As the new company's admin, navigate to the Voice Agents page (path may have moved if Task 3 grouped nav items — check the sidebar), click "Create Agent" → Template Picker → "Investor Relations" → fill in a company name and pick a voice → submit → confirm the resulting row shows a real Retell-style `agent_...` ID (not a raw local UUID) → delete the test agent afterward.

- [ ] **Step 6: Browser-verify chat agent creation**

Same flow on the Chat Agents page, defaulting to chat-only → confirm a real agent ID → delete the test agent afterward.

- [ ] **Step 7: Browser-verify the knowledge base flow**

Navigate to the Knowledge Base page, create or open a knowledge base, add/upload some content, confirm it shows as attached/available, and confirm (from either the KB page or the agent edit modal) that a knowledge base can actually be linked to one of the agents created in Steps 5/6.

- [ ] **Step 8: Visual spot-check**

Screenshot the dashboard, an agent list page, and the new `/settings/billing` page. Confirm: charcoal sidebar with amber active-item accent, warm off-white content background, no unreadable text (dark-on-dark or light-on-light), the one inverted dashboard stat card renders legibly. Screenshot `/billing` (platform-admin view) and confirm the org selector and plan-tier buttons work and persist across a page refresh.

- [ ] **Step 9: Admin-pages consistency spot-check (the spec's "secondary pass")**

Open each of `/tenant-settings` (`TenantManagement`), `/users` (`UserManagement`), `/admin/roles` (`RolesManagement`), and `/admin/railway-services` (`RailwayServicesManagement`). For each: click every button that should open a modal or perform an action and confirm it actually does something (no dead `onClick`-less buttons); open at least one modal per page and confirm it isn't edge-to-edge/broken-looking (the shared `Modal` default-width fix from the earlier `2026-09-11-agent-template-creation-flow.md` plan should already cover this — this step is confirming no regression, not re-fixing it); check that each page's header follows the same basic pattern (title + description, consistent spacing) as the others. This is a **review-and-fix-only-if-broken** step, not a mandate to change anything — if all four pages look and work fine, note that in your final report and make no changes. If you find something genuinely broken or misleading, fix it with the smallest change that resolves it and note exactly what you found/fixed in your final report.

- [ ] **Step 10: Final commit (only if Steps 4-9 required any fix-up changes)**

If everything passed with no fix-ups needed, no commit is needed for this task — it's verification-only. If any fix was required, commit it with a message describing exactly what broke and why, following the same commit-message style used in Tasks 1-7.

---

## Task 9: Fix knowledge-base creation lifecycle (Bug 4, found during Task 8)

**Model:** `claude-sonnet-5-thinking-high` | **Tool:** `generalPurpose` subagent | **Justification:** Multi-file (4 routes), changes a create/delete lifecycle contract, needs judgment on request shape. Tier 2.

**Depends on:** nothing new — independent of all other tasks; added after Task 8 discovered KB creation has been completely broken since commit `212543e` (2025-11-27, pre-dating this plan). Zero knowledge bases exist anywhere in the live project as a result.

**Previous Phase Context Review:** `POST /api/knowledge-bases` (`src/app/api/knowledge-bases/route.ts`) calls `retellClient.knowledgeBase.create({ knowledge_base_name, enable_auto_refresh: false })` with **no sources**, which the provider rejects with `400 no knowledge base sources provided` — so the local row is never inserted and creation always fails. `POST /api/knowledge-bases/[id]/sources` (`.../[id]/sources/route.ts`) already builds a fully-formed `addSourcesParams` object (`knowledge_base_urls`/`knowledge_base_texts`/`knowledge_base_files`) from the request, but currently *requires* `configuration.retell_knowledge_base_id` to already exist (returns 400 "Please sync from the voice provider first" otherwise) — it never creates the provider KB itself. `DELETE /api/knowledge-bases/[id]` only deletes the local row, never calls the provider's delete, so removed KBs silently orphan provider-side and reappear on the next Sync. Confirmed during investigation: `create-ir-template`'s KB lookup (`.filter(Boolean)` on `retell_knowledge_base_id`) and `PATCH /api/agents/[id]/knowledge-bases`'s local-KB-id resolution both already gracefully exclude/reject a KB with no `retell_knowledge_base_id` — **no changes needed in either of those two files**, they already handle a "pending" KB correctly. The Sync route (`/api/retell/knowledge-bases/sync/route.ts`) only pulls FROM the provider into local rows by name-match — a local pending row with no provider counterpart is simply never touched by it, which is correct, so **no change needed there either**.

**Files:**
- Modify: `src/app/api/knowledge-bases/route.ts` (POST)
- Modify: `src/app/api/knowledge-bases/[id]/sources/route.ts` (POST)
- Modify: `src/app/api/knowledge-bases/[id]/route.ts` (DELETE)

**Interfaces:**
- `knowledge_bases.status` has a DB `CHECK` constraint allowing only `'synced' | 'syncing' | 'error'` (`supabase/migrations/20251119000000_create_knowledge_bases.sql:13`) — no migration in this task; use the existing `'syncing'` value for the new "created locally, not yet in the provider" state (semantically: not yet synced).

- [ ] **Step 1: `POST /api/knowledge-bases` — stop calling the provider at create time**

Remove the entire `getResellerRetellConfig` + `retellClient.knowledgeBase.create(...)` block (currently ~lines 126-160, the whole "REQUIRED for knowledge base creation" section including its try/catch). Insert the local row directly instead, with no provider precondition check and no `retell_knowledge_base_id` in `configuration`:

```ts
const clientToUse = createAdminClient(); // access already verified via canAccessTenant above

const { data: knowledgeBase, error: kbError } = await clientToUse
  .from('knowledge_bases')
  .insert({
    tenant_id,
    name,
    type,
    description: description || null,
    configuration: configuration || {},
    status: 'syncing', // not yet created in the voice provider -- first source add will create it there
    page_count: 0,
  })
  .select()
  .single();

if (kbError) {
  return NextResponse.json({ error: kbError.message }, { status: 500 });
}
```

Keep the existing directory-creation try/catch block after this (it's unrelated, still fine). Keep the existing `tenant_id`/`name`/`type` validation and the `canAccessTenant(user.id, tenant_id, 'knowledge.manage')` check exactly as they are — only the provider-creation block is removed.

- [ ] **Step 2: `POST /api/knowledge-bases/[id]/sources` — create the provider KB on first source, add to it on subsequent sources**

Read the current file in full first (it already builds `urls`/`texts`/`files` arrays and an `addSourcesParams` object from the request `formData` — keep all of that parsing exactly as-is). Find the block that currently requires `retellKBId` to already exist and errors if not (around lines 111-118):

```ts
    // Get Retell knowledge base ID from configuration
    const retellKBId = knowledgeBase.configuration?.retell_knowledge_base_id;
    if (!retellKBId) {
      return NextResponse.json(
        { error: 'Knowledge base not linked to the voice provider. Please sync from the voice provider first.' },
        { status: 400 }
      );
    }
```

Replace it with logic that creates the provider KB on first use instead of erroring:

```ts
    let retellKBId: string | undefined = knowledgeBase.configuration?.retell_knowledge_base_id;
```

Then, AFTER the `addSourcesParams` object is fully built (after the existing "No sources provided" 400 check, so an empty request still 400s exactly as today), branch on whether `retellKBId` already exists:

```ts
    let retellResponse: any;
    if (!retellKBId) {
      // First source(s) for this KB -- the provider requires sources at creation time, so create
      // it now instead of erroring (see docs/superpowers/plans/2026-09-11-platform-polish-and-rebrand.md Task 9).
      const created = await retellClient.knowledgeBase.create({
        knowledge_base_name: knowledgeBase.name,
        enable_auto_refresh: false,
        ...addSourcesParams,
      });
      retellKBId = created.knowledge_base_id;
      retellResponse = created;

      await supabase
        .from('knowledge_bases')
        .update({
          configuration: { ...(knowledgeBase.configuration || {}), retell_knowledge_base_id: retellKBId },
          status: 'synced',
        })
        .eq('id', id);
    } else {
      retellResponse = await retellClient.knowledgeBase.addSources(retellKBId, addSourcesParams);
    }
```

Remove the old standalone `const retellResponse = await retellClient.knowledgeBase.addSources(retellKBId, addSourcesParams);` line (now folded into the `else` branch above). Everything below this (the "Sync sources back to database" block reading `retellResponse.knowledge_base_sources`, the page_count update, the success response) stays exactly as-is — both `create()` and `addSources()` return the same `knowledge_base_sources` shape, per the existing Sync route's own handling of `create`-shaped responses.

- [ ] **Step 3: `DELETE /api/knowledge-bases/[id]` — also delete the provider-side KB**

Find the delete handler's current body (after the existing `canAccessTenant` check, before the `supabase.from('knowledge_bases').delete()` call). Fetch the full row (not just `tenant_id`) so `configuration` is available, and delete provider-side first if a `retell_knowledge_base_id` exists, tolerating provider failure (log, don't block the local delete — matching this codebase's existing lenient pattern for non-critical side effects):

```ts
    const { data: knowledgeBase } = await supabase
      .from('knowledge_bases')
      .select('tenant_id, configuration')
      .eq('id', id)
      .single();

    // ... existing canAccessTenant check stays, using knowledgeBase.tenant_id ...

    const retellKBId = (knowledgeBase.configuration as any)?.retell_knowledge_base_id;
    if (retellKBId) {
      try {
        const retellApiKey = await getResellerRetellConfig(knowledgeBase.tenant_id);
        if (retellApiKey) {
          const { createRetellClient } = await import('@/lib/retell');
          const retellClient = createRetellClient(retellApiKey);
          await retellClient.knowledgeBase.delete(retellKBId);
        }
      } catch (retellError: any) {
        console.error(`[KB API] Failed to delete voice-provider knowledge base ${retellKBId} (continuing with local delete):`, retellError?.message);
      }
    }
```

Add the needed imports at the top of the file: `getResellerRetellConfig` from `@/lib/reseller` (the dynamic `createRetellClient` import matches the existing pattern already used in the POST handler of `route.ts`).

- [ ] **Step 4: Verify with tsc/lint**

Run: `npx tsc --noEmit -p .` — expect no new errors.
Run: `npx eslint src/app/api/knowledge-bases/route.ts "src/app/api/knowledge-bases/[id]/route.ts" "src/app/api/knowledge-bases/[id]/sources/route.ts"` — expect no new errors.

- [ ] **Step 5: Rebuild, restart, and live-verify**

Rebuild (`npm run build`), restart the `next start` server (Shell tool `block_until_ms: 0` + `required_permissions: ["all"]`), then live-verify against a real connected org (Master Platform or Caro Holdings, per Task 8's findings — do not connect the E2E test org's provider key):
1. Create a new KB with just a name (no sources yet) → confirm the local row is created (`status: 'syncing'`, no `retell_knowledge_base_id`) and does NOT error.
2. Add a text source to it → confirm success, confirm `configuration.retell_knowledge_base_id` is now set, confirm `status` is `'synced'`, confirm the source shows in the UI.
3. Add a second source to the same KB → confirm it uses `addSources` (not `create` again) and both sources are now present.
4. Delete the KB → confirm the local row is gone AND the provider-side KB is gone (check via the provider's own list/retrieve, or via the app's own Sync afterward returning it as no-longer-present).
5. Clean up: leave no test KBs behind in either the DB or the provider.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/knowledge-bases/route.ts "src/app/api/knowledge-bases/[id]/route.ts" "src/app/api/knowledge-bases/[id]/sources/route.ts"
git commit -m "fix(knowledge-bases): defer provider creation until the first source is added

The voice provider requires at least one source at knowledge-base
creation time; the app's create endpoint called it with none, so every
creation attempt 500'd and zero knowledge bases could ever exist
(pre-existing since 212543e, found during Task 8's E2E verification).

Now: POST /api/knowledge-bases inserts a local row only (status
'syncing', no provider id yet). POST .../sources creates the provider
KB on the first source (passing the sources at create time, exactly as
the provider requires) and uses addSources for subsequent additions.
DELETE now also deletes the provider-side KB instead of orphaning it."
```

---

## Task 10: Wire up or remove two dead admin buttons (found during Task 8)

**Model:** `claude-sonnet-5-thinking-high` | **Tool:** `generalPurpose` subagent | **Justification:** Requires reading existing state/save patterns to wire one button correctly and judgment on the other; small scope but not purely mechanical. Tier 2.

**Depends on:** nothing — independent of all other tasks.

**Previous Phase Context Review:** Task 8's platform-admin pass found 14 buttons with no `onClick` handler across the four admin pages; 12 sit inside components already flagged as hardcoded-mock demo panels (`TenantSecurity.tsx`, `TenantAnalytics.tsx`, `SecuritySettings.tsx` — out of scope, consistent with their fake data, not touched here). Two are real, working pages' buttons that look functional but do nothing: `TenantConfiguration.tsx`'s "Save Configuration" (the panel just above it, "Save Name", already persists for real via `PATCH /api/tenants/[id]`) and `UsersHeader.tsx`'s "Settings" (a prominent top-right header button on `/users` with no defined destination or handler at all).

**Files:**
- Modify: `src/components/TenantConfiguration.tsx`
- Modify: `src/components/UsersHeader.tsx`

- [ ] **Step 1: Wire up `TenantConfiguration.tsx`'s "Save Configuration" button**

This component already has `config`/`setConfig` local state (initialized from `tenant.settings.{features,limits,security}`, read via a `currentConfig` fallback) that backs the "Feature Toggles", "Usage Limits", and "Security Settings" sections directly above the "Save Configuration" button — none of those three sections currently persist anywhere. `PATCH /api/tenants/[id]` already accepts a `settings` field (see `src/app/api/tenants/[id]/route.ts`) and writes it through `canAccessTenant`/`isSystemAdmin`-gated `updateData.settings = settings`. Follow the exact same pattern as this file's existing `handleSaveName` (loading state, try/catch, success/error state set via whatever alert/message mechanism `handleSaveName` already uses):

```ts
const [savingConfig, setSavingConfig] = useState(false);

const handleSaveConfiguration = async () => {
  if (!tenant) return;
  try {
    setSavingConfig(true);
    setError(null);
    setSuccess(null);
    const response = await fetch(`/api/tenants/${tenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          features: currentConfig?.features,
          limits: currentConfig?.limits,
          security: currentConfig?.security,
        },
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to save configuration');
    setSuccess('Configuration saved.');
  } catch (err: any) {
    setError(err.message || 'Failed to save configuration');
  } finally {
    setSavingConfig(false);
  }
};
```

(Match the exact names of this file's existing `error`/`success` state setters and `tenant` variable — read the file first, the brief's names above are illustrative of the pattern, not necessarily byte-exact identifiers already in scope.) Wire the button:

```tsx
<button
  onClick={handleSaveConfiguration}
  disabled={savingConfig}
  className="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
>
  <CogIcon className="w-4 h-4 mr-2" />
  {savingConfig ? 'Saving...' : 'Save Configuration'}
</button>
```

- [ ] **Step 2: Remove `UsersHeader.tsx`'s dead "Settings" button**

No destination or intended behavior for this button exists anywhere (checked: no `/settings`-adjacent route is specific to user management, no TODO/comment nearby indicating planned behavior). Follow this plan's Task 1 precedent for dead UI with no defined purpose: remove it rather than inventing new functionality. Delete just the "Settings" `<button>` element (lines ~93-96) — keep the sibling button next to it (the one with a real `onClick`) untouched.

- [ ] **Step 3: Verify with tsc/lint**

Run: `npx tsc --noEmit -p .` — expect no new errors.
Run: `npx eslint src/components/TenantConfiguration.tsx src/components/UsersHeader.tsx` — expect no new errors.

- [ ] **Step 4: Rebuild, restart, and live-verify**

Rebuild + restart, then live-verify: on `/tenant-settings`, change a feature toggle or the session timeout, click "Save Configuration", confirm a success message and that a page reload shows the change persisted (re-fetch `GET /api/tenants/[id]` and confirm `settings` reflects it). On `/users`, confirm the "Settings" button is gone and the remaining header button still works.

- [ ] **Step 5: Commit**

```bash
git add src/components/TenantConfiguration.tsx src/components/UsersHeader.tsx
git commit -m "fix(admin): wire up Save Configuration, remove dead Settings button

TenantConfiguration's Save Configuration button had no onClick handler
despite sitting below three sections of real, editable state (feature
toggles, usage limits, security settings) -- now persists via PATCH
/api/tenants/[id]'s existing settings field, matching the adjacent
Save Name button's pattern. UsersHeader's Settings button had no
handler and no defined destination -- removed per the same dead-UI
precedent as Task 1. Both found during Task 8's platform-admin pass."
```
