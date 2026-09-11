# Icon Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the leftover generic-admin-template icon set (5 files, including several icons that don't belong to this product) in favor of the Heroicons set already used by 32 other files, and flatten the 36-file pattern of decorative pastel circle-badge icon containers to a single neutral treatment, without touching real status-color semantics.

**Architecture:** Two independent tasks. Task 1 is a precise, fully-specified 1:1 icon swap (mechanical) plus a dead-file cleanup. Task 2 is a systematic sweep with a fixed transformation rule and explicit inclusion/exclusion criteria (judgment required to tell decorative icon badges apart from real status pills). Full design/rationale: `docs/superpowers/specs/2026-09-11-icon-modernization-design.md`.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, `@heroicons/react` v2 (already installed, no new dependency).

## Global Constraints

- No test framework exists in this repo. Verification is `tsc --noEmit` (must be clean) + `eslint` on every touched file (no new findings beyond each file's pre-existing baseline) + grep-based self-checks + a live visual spot-check via rebuild/restart.
- Do not touch real status-color semantics (any `getStatusColor()`-style helper output, or `Badge` usage with a semantic `color` prop like `"success"`/`"warning"`/`"error"`) — those correctly encode real state.
- Do not touch `bg-brand-*`/`text-brand-*` classes (already correct, from the prior rebrand) or chart/graph color-coding.
- Do not touch `src/components/tables/DataTables/TableOne/DataTableOne.tsx` or `src/components/tables/BasicTables/BasicTableFour.tsx` — both are confirmed unreachable from any app route (dead template boilerplate), explicitly out of scope, but they are still type-checked/bundled so their existing icon imports must keep resolving.
- No new npm dependencies.
- Work directly on `main` (established this session — no separate branch/worktree).

---

### Task 1: Retire the custom icon set

**Model:** `composer-2.5-fast` | **Tool:** `generalPurpose` subagent | **Justification:** Every replacement is a fully-specified 1:1 mapping with an exact code diff below — no design judgment required. Tier 3 (mechanical).

**Files:**
- Modify: `src/config/navigation.tsx`
- Modify: `src/layout/AppSidebar.tsx`
- Modify: `src/components/form/Select.tsx`
- Modify: `src/icons/index.tsx`
- Delete: 58 of the 61 `.svg` files under `src/icons/` (exact keep-list below)

**Interfaces:**
- Consumes: nothing from other tasks (independent of Task 2).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Swap `src/config/navigation.tsx`'s icon imports**

Change the top of the file from:
```tsx
import React from "react";
import {
  AiIcon,
  UserCircleIcon,
  BoxIcon,
  CallIcon,
  ChatIcon,
} from "../icons";
import { DocumentTextIcon, ClockIcon, CreditCardIcon, ChartBarIcon, UserGroupIcon, CloudIcon } from "@heroicons/react/24/outline";
```
to:
```tsx
import React from "react";
import {
  Squares2X2Icon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  BuildingOfficeIcon,
  CogIcon,
  DocumentTextIcon,
  ClockIcon,
  CreditCardIcon,
  ChartBarIcon,
  UserGroupIcon,
  CloudIcon,
} from "@heroicons/react/24/outline";
```
(Drop the `../icons` import entirely — nothing in this file needs it anymore. `UserGroupIcon` may currently be imported-but-unused; check with a quick read of the file body before removing it — if it's unused, drop it too so eslint's `no-unused-vars` stays clean.)

- [ ] **Step 2: Replace the 6 icon usages in the same file**

| Find | Replace with |
|---|---|
| `icon: <AiIcon />,` (Dashboard nav item) | `icon: <Squares2X2Icon className="w-5 h-5" />,` |
| `icon: <CallIcon />,` (Voice Agents nav item) | `icon: <PhoneIcon className="w-5 h-5" />,` |
| `icon: <ChatIcon />,` (Chat Agents nav item) | `icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,` |
| `icon: <ChatIcon />,` (Chat History nav item — second occurrence) | `icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,` |
| `icon: <BoxIcon />,` (Platform section icon) | `icon: <BuildingOfficeIcon className="w-5 h-5" />,` |
| `icon: <UserCircleIcon />,` (Settings section icon) | `icon: <CogIcon className="w-5 h-5" />,` |

There are two `icon: <ChatIcon />,` occurrences (Chat Agents and Chat History) — replace both, each with its own `ChatBubbleLeftRightIcon` instance.

- [ ] **Step 3: Swap `src/layout/AppSidebar.tsx`'s icon imports and usages**

Change:
```tsx
import {
  ChevronDownIcon,
  HorizontaLDots,
} from "../icons";
```
to:
```tsx
import {
  ChevronDownIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
```
Then replace every `<HorizontaLDots />` usage in the file body with `<EllipsisHorizontalIcon className="w-5 h-5" />` (there are 5 occurrences, one per nav category label — check each renders the same way visually, i.e. inline within an `<h2>`; keep any existing surrounding markup untouched, only swap the icon element itself). The existing `<ChevronDownIcon .../>` usage needs no prop changes — Heroicons' `ChevronDownIcon` has the same default viewBox/behavior as an `<svg>` component, so the existing `className` prop on that element keeps working unchanged.

- [ ] **Step 4: Swap `src/components/form/Select.tsx`'s icon import and usage**

Change:
```tsx
import { ChevronDownIcon } from "@/icons";
```
to:
```tsx
import { ChevronDownIcon } from "@heroicons/react/24/outline";
```
The existing `<ChevronDownIcon />` usage (inside the `<span className="absolute ...">` wrapper) needs no other changes.

- [ ] **Step 5: Trim `src/icons/index.tsx` down to the 3 exports still needed by out-of-scope dead files**

Two files outside this task's scope (`DataTableOne.tsx`, `BasicTableFour.tsx` — do not modify them) still import `AngleDownIcon`, `AngleUpIcon`, and `MoreDotIcon` from this module. Every other export is now unused. Rewrite `src/icons/index.tsx` to just:
```tsx
import AngleUpIcon from "./angle-up.svg";
import AngleDownIcon from "./angle-down.svg";
import MoreDotIcon from "./MoreDotIcon.svg";

export {
  AngleUpIcon,
  AngleDownIcon,
  MoreDotIcon,
};
```

- [ ] **Step 6: Delete every other `.svg` file under `src/icons/`**

Keep only `angle-up.svg`, `angle-down.svg`, `MoreDotIcon.svg`. Delete all 58 others (the full original list minus those 3 — enumerate via `ls src/icons/*.svg` and delete everything not in the keep-list; do not hand-type the list and risk a typo, script the diff against the keep-list).

- [ ] **Step 7: Verify no dangling imports**

Run:
```bash
grep -rn 'from ["'"'"'](\.\./)*icons["'"'"']\|from ["'"'"']@/icons["'"'"']' src --include="*.tsx" --include="*.ts"
```
Expected: exactly 2 matches remain (`DataTableOne.tsx`, `BasicTableFour.tsx`), both importing only names from the kept set.

- [ ] **Step 8: Type-check and lint**

```bash
npx tsc --noEmit
npx eslint src/config/navigation.tsx src/layout/AppSidebar.tsx src/components/form/Select.tsx src/icons/index.tsx
```
Expected: `tsc` clean; eslint shows no new findings (compare against each file's pre-existing baseline — if a finding already existed before this task's changes on a line you didn't touch, that's fine, don't try to fix unrelated pre-existing lint debt).

- [ ] **Step 9: Build and visually spot-check**

```bash
npm run build
```
Then start the server (background) and load `/dashboard` — confirm the sidebar renders all 5 swapped icons with no missing-icon boxes, no layout shift, and the submenu caret/collapsed-sidebar dots still work. Load any page using a `<Select>` dropdown (e.g. `/tenant-settings`'s plan-tier area, or any form using `src/components/form/Select.tsx`) and confirm its chevron still renders.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "cleanup: retire the leftover template icon set for Heroicons

Swapped the 5 files still using the generic-admin-template SVG icon set
(src/icons/*.svg) for Heroicons equivalents already established elsewhere
in this codebase (PhoneIcon for calls, ChatBubbleLeftRightIcon for chat,
BuildingOfficeIcon for organizations, CogIcon for settings). Deleted 58 of
61 now-fully-unused SVG files, including several that never belonged to
this product (cart-icon, truck-delivery, box-tapped — e-commerce template
leftovers). Kept angle-up/angle-down/MoreDotIcon since two out-of-scope
dead demo-table files still import them.

See docs/superpowers/specs/2026-09-11-icon-modernization-design.md"
```

---

### Task 2: Flatten decorative pastel icon-badge containers

**Model:** `claude-sonnet-5-thinking-high` | **Tool:** `generalPurpose` subagent | **Justification:** Requires distinguishing genuine status-color semantics (must not touch) from purely decorative metric-icon badges (must flatten) across ~36 files — judgment call per instance, not mechanical. Tier 2.

**Depends on:** nothing (independent of Task 1; may run in parallel).

**Files:** ~36 files under `src/components/` and `src/app/` — exact list to be produced by Step 1's discovery grep, not hand-enumerated here (colored-badge class strings vary slightly file to file; see spec's rationale for why).

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Discover candidate instances**

Run:
```bash
grep -rn 'bg-\(blue\|green\|purple\|yellow\|pink\|indigo\|red\)-\(50\|100\) dark:bg-\(blue\|green\|purple\|yellow\|pink\|indigo\|red\)-900' src/components src/app --include="*.tsx"
```
This finds the decorative-badge pattern's container line. For every match, capture: file path, line number, and read 5 lines of surrounding context (the icon element(s) inside that container) to classify it.

- [ ] **Step 2: Classify each match — decorative vs. status**

For each match, apply this test: **is the color chosen because it represents a real, current state of this specific record (active/pending/suspended/error/paid/failed, etc.), or is it just a fixed label for a metric/category that never changes regardless of data?**

- **Decorative (flatten it):** a stat card's icon container where the color is hardcoded per metric-type, e.g. an "Agents" count card that's always blue, a "Calls" count card that's always green, a "Storage" card that's always purple — the color doesn't depend on any runtime value. Example from `src/components/TenantBilling.tsx` (lines ~222-238):
  ```tsx
  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Agents</span>
      ...
  ```
  Flatten to:
  ```tsx
  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Agents</span>
      ...
  ```
  (Also flatten the matching `text-blue-600 dark:text-blue-400` value-text color a few lines below each match, and the corresponding progress-bar-fill color if present in the same card, e.g. `bg-blue-600` → `bg-gray-600`, `bg-blue-200`→`bg-gray-300` — keep the whole card internally consistent in gray rather than flattening only the icon and leaving the rest of the card rainbow-colored.)

- **Status (leave untouched):** any color driven by a variable/function result, e.g.:
  ```tsx
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 ...";
      case "pending": return "bg-yellow-100 text-yellow-800 ...";
      ...
  ```
  or a `<Badge color={someVariable}>` / `<Badge color="success">` call. These are correct and must not change, even though they use the exact same Tailwind class family the discovery grep matches on. **When in doubt, check whether the color string is a literal constant in JSX vs. returned from a function keyed on a `status`/`state` field — literal-in-JSX with no branching = decorative; function-of-state = status.**

- [ ] **Step 3: Apply the flatten transformation to every decorative match**

For each confirmed-decorative instance, replace its color classes with the neutral treatment:
- `bg-{color}-50` or `bg-{color}-100` → `bg-gray-100`
- `dark:bg-{color}-900/20` or `dark:bg-{color}-900` → `dark:bg-gray-800`
- `border-{color}-200` / `dark:border-{color}-800` (if present on the same container) → `border-gray-200` / `dark:border-gray-700`
- `text-{color}-600` / `text-{color}-800` (icon or label text) → `text-gray-600` (light) — use `text-gray-700` specifically for label text that sits directly on the `bg-gray-100` container background, to keep sufficient contrast, and `text-gray-600` for the icon glyph itself
- `dark:text-{color}-200` / `dark:text-{color}-400` → `dark:text-gray-300` (label) / `dark:text-gray-400` (icon)
- Any same-card progress-bar-fill or accent bar in the same color family → matching gray shade (e.g. `bg-{color}-600` fill → `bg-gray-600`, `bg-{color}-200` track → `bg-gray-300`)

Leave shape/spacing classes (`p-*`, `rounded-*`, `w-*`, `h-*`, `flex`, `gap-*`, etc.) exactly as they are — only the color-family classes change.

- [ ] **Step 4: Verify nothing status-related was touched**

Run:
```bash
grep -rn 'getStatusColor\|color="success"\|color="warning"\|color="error"' src/components --include="*.tsx" | wc -l
```
Before and after your changes, this count must be identical — if it changed, you touched something you shouldn't have. Also spot-check 3 files known to have real status logic (`src/components/TenantManagement.tsx`, `src/components/CompanyBilling.tsx`, `src/components/TenantBilling.tsx`'s own `getStatusColor` function for invoice status) and confirm their status-badge code is byte-identical to before your changes (only their *decorative* metric cards, not their status badges, should differ).

- [ ] **Step 5: Type-check and lint**

```bash
npx tsc --noEmit
```
Then run eslint on every file you actually touched (list them explicitly in your report) and confirm no new findings vs. each file's pre-existing baseline.

- [ ] **Step 6: Build and visually spot-check**

```bash
npm run build
```
Start the server and screenshot (or describe precisely) at least 4 representative pages that had decorative badges: `/dashboard`, `/settings/billing` (CompanyBilling), `/billing` (TenantBilling, platform-admin), and one more from your discovery list. Confirm: metric cards now read as neutral gray instead of rainbow, real status pills (e.g. an "active"/"connected" badge somewhere on the same page) are unchanged and still colored, and no layout broke.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "style: flatten decorative pastel icon-badge containers to neutral gray

Metric/label icon containers (Agents=blue, Calls=green, Storage=purple,
etc. with no semantic meaning) across ~<N> files now use a single neutral
bg-gray-100/dark:bg-gray-800 treatment instead of an arbitrary rainbow per
metric. Real status indicators (getStatusColor()-driven pills, Badge
color=\"success\"/\"warning\"/\"error\") are untouched — confirmed via
before/after grep count on status-color call sites.

See docs/superpowers/specs/2026-09-11-icon-modernization-design.md"
```
(Replace `<N>` with the actual count of files you changed.)

---

## Final Step: Report

After both tasks are committed, produce a short combined report: exact list of files changed per task, the two commit SHAs, tsc/eslint results, and the visual spot-check screenshots/observations. No further whole-branch review is required for this plan given its small, mechanical, low-risk nature (2 tasks, no schema/auth/security surface touched) — but each task should still get one fresh-subagent review before being marked complete, per subagent-driven-development's standard task-level gate.
