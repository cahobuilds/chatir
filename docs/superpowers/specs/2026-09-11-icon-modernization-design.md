# Icon Modernization: retire the leftover template icon set + flatten pastel icon badges

**Date:** 2026-09-11
**Status:** Approved (user confirmed both parts, "everywhere" scope, "yes_now" for badges)

## Goal

The user described the app's icons as "childish." Investigation found two distinct, separable causes:

1. **An inconsistent icon set.** 32 files already use `@heroicons/react/24/outline` (clean, professional, the de facto standard). Only 5 files use a leftover generic-admin-template custom SVG set (`src/icons/*.svg`), which includes a rounder/bubblier visual style and several icons that don't belong to this product at all (`cart-icon.svg`, `truck-delivery.svg`, `box-tapped.svg` — leftovers from an e-commerce template).
2. **Decorative pastel circle-badge icon containers.** 36 files wrap plain metric/label icons in light-colored circle backgrounds (`bg-blue-100`, `bg-green-100`, `bg-purple-100`, etc.) with no semantic meaning — e.g. "Agents" is blue, "Calls" is green, "Storage" is purple, for no reason beyond "make each one a different color." This reads as generic dashboard-template decoration, not a deliberate design choice.

Both are fixed in this pass. Real status indicators (the green/yellow/red "active"/"pending"/"error" pills produced by each component's own `getStatusColor()`-style helper) are explicitly **not** part of either fix — they encode real state and must be left alone.

## Part 1: Retire the custom icon set

### Exact mapping (sidebar navigation + shared dropdown)

| File | Current (custom, from `src/icons`) | Replacement (`@heroicons/react/24/outline`) | Precedent already in codebase |
|---|---|---|---|
| `src/config/navigation.tsx` — Dashboard nav item | `<AiIcon />` | `<Squares2X2Icon className="w-5 h-5" />` | Standard dashboard/grid convention; no prior clash |
| `src/config/navigation.tsx` — Voice Agents nav item | `<CallIcon />` | `<PhoneIcon className="w-5 h-5" />` | `TenantAnalytics.tsx`, `AgentPerformanceDetail.tsx` already use `PhoneIcon` for calls |
| `src/config/navigation.tsx` — Chat Agents nav item | `<ChatIcon />` | `<ChatBubbleLeftRightIcon className="w-5 h-5" />` | `ChatAgentConfiguration.tsx`, `AgentTestModal.tsx` already use this for chat |
| `src/config/navigation.tsx` — Chat History nav item | `<ChatIcon />` | `<ChatBubbleLeftRightIcon className="w-5 h-5" />` | Same as above (reuse) |
| `src/config/navigation.tsx` — Platform section icon | `<BoxIcon />` | `<BuildingOfficeIcon className="w-5 h-5" />` | `OrganizationSwitcher.tsx` already uses this for organizations |
| `src/config/navigation.tsx` — Settings section icon | `<UserCircleIcon />` | `<CogIcon className="w-5 h-5" />` | `SettingsHeader.tsx`, `TenantConfiguration.tsx`, `ChatAgentConfiguration.tsx`, `UsersHeader.tsx` all already use `CogIcon` for settings/configuration. (A person icon for "Settings" was a pre-existing mismatch, not just a style issue — this is a correctness fix too.) |
| `src/layout/AppSidebar.tsx` — submenu expand caret | custom `ChevronDownIcon` | Heroicons `ChevronDownIcon` | `OrganizationSwitcher.tsx` already imports the exact same name from `@heroicons/react/24/outline` |
| `src/layout/AppSidebar.tsx` — collapsed-sidebar category marker | custom `HorizontaLDots` | `EllipsisHorizontalIcon` | Direct Heroicons equivalent, same visual meaning |
| `src/components/form/Select.tsx` — dropdown chevron | custom `ChevronDownIcon` | Heroicons `ChevronDownIcon` | Same as `AppSidebar.tsx`'s caret; this component is used app-wide for `<select>`-style dropdowns, so it must match the rest of the app |

Import Heroicons additions at the top of each file (mirror the exact style already used by e.g. `navigation.tsx`'s existing `@heroicons/react/24/outline` import line). Remove the now-unused `from "../icons"` / `from "@/icons"` import lines entirely from these 3 files once swapped.

### Dead-file cleanup (bonus finding)

`src/icons/index.tsx` exports 49 icon names. Auditing actual imports (`from "../icons"` / `from "@/icons"`, not the unrelated Heroicons icons that happen to share a name) found only **10 are ever imported anywhere**, and after the swap above, only **3 remain used** — by two already-dead, unreachable-from-any-route demo/template components that this plan is not touching (`src/components/tables/DataTables/TableOne/DataTableOne.tsx` imports `AngleDownIcon`/`AngleUpIcon`; `src/components/tables/BasicTables/BasicTableFour.tsx` imports `MoreDotIcon`). Those two files are out of scope (matching this session's established precedent of leaving unreachable template boilerplate untouched unless asked) — but they still get type-checked/bundled, so their 3 icon imports must keep working.

**Action:** delete every `.svg` file under `src/icons/` and its corresponding export in `src/icons/index.tsx` **except** `angle-down.svg`, `angle-up.svg`, and `MoreDotIcon.svg` (keep those 3 exactly as-is, including their SVG content — do not restyle them, they belong to out-of-scope dead files). This removes 58 of 61 dead SVG files, including all the leftover e-commerce icons (`cart-icon.svg`, `truck-delivery.svg`, `box-tapped.svg`, `box-icon.svg`, `shooting-star.svg`, `dollar-line.svg`, etc.) plus the ones retired by the Part 1 swap above (`ai-icon.svg`, `call-icon.svg`, `chat.svg`, `box.svg`, `user-circle.svg`).

**Verification for this deletion:** after deleting, re-grep the whole `src/` tree for `from ["'](\.\./)*icons["']` and `from ["']@/icons["']` and confirm every remaining import name resolves to one of the 3 kept exports. `tsc --noEmit` must be clean (a stale import would surface as a type error).

## Part 2: Flatten decorative pastel icon-badge containers

### The rule

Find every instance of a plain (non-status) icon wrapped in a colored circle/rounded-square background — the pattern is `<div className="p-{n} bg-{color}-{50|100} dark:bg-{color}-900/20 rounded-{lg|full} ..."><SomeIcon className="... text-{color}-{600|800} dark:text-{color}-{400|200}" /></div>` (colors vary: blue, green, purple, yellow, pink, indigo, red — excluding the cases below). Replace the container's background/text classes with a single neutral treatment:

- Container background: `bg-gray-100 dark:bg-gray-800`
- Icon color: `text-gray-600 dark:text-gray-400`
- Leave the container's shape (rounded-lg vs rounded-full), padding, and size classes untouched — only the color classes change.

### What is explicitly NOT in scope (do not touch)

- **Real status pills/badges** — anything driven by a `getStatusColor(status)`-style function keyed on actual state (`active`/`pending`/`suspended`/`error`/`paid`/`failed`, etc.), including the `Badge` component's semantic `color` prop usage (`color="success"`, `color="warning"`, etc.). These correctly communicate real state and must keep their green/yellow/red coding.
- **The brand accent itself** — anything using `bg-brand-*`/`text-brand-*` classes (already correct, from the Task 4 rebrand).
- **Data-visualization colors** — chart/graph color-coding (e.g. multiple series needing to be visually distinct) is a different problem from decorative icon badges; leave charts alone.
- **The two dead demo-table files** named in Part 1 (already out of scope for this whole task).

### Finding the exact file list

Do not hand-enumerate all 36 files in this spec — the implementing task must re-run the discovery grep itself (colored badge classes shift slightly file to file) and treat every match as a candidate, applying the "what's NOT in scope" filter above before changing anything. A reasonable starting query:

```bash
grep -rln 'bg-\(blue\|green\|purple\|yellow\|pink\|indigo\|red\)-\(50\|100\) dark:bg-\(blue\|green\|purple\|yellow\|pink\|indigo\|red\)-900' src/components src/app --include="*.tsx"
```

Then for each match, manually confirm it's a decorative metric/label icon container (Part 2's target) and not a status pill (excluded) before changing it.

## Testing / Verification

No test framework exists in this repo (established throughout this session). Verification is:
1. `npx tsc --noEmit` clean after both parts.
2. `npx eslint` on every touched file — no new findings beyond each file's pre-existing baseline.
3. Grep-based self-check: zero remaining imports from the deleted icon set (except the 3 kept exports); zero remaining instances of the old pastel badge pattern outside the explicitly-excluded categories.
4. Live visual spot-check (rebuild + restart the dev server, screenshot the sidebar and 3-4 representative stat-card pages: dashboard, billing, tenant-settings, analytics) to confirm nothing visually broke (icon missing, layout shift, wrong size).

## Out of scope / explicitly deferred

- Redesigning the icon set beyond a 1:1 swap to already-established Heroicons equivalents (no new npm dependency, no custom-drawn icons).
- Touching genuine status-color semantics.
- Touching chart/graph color coding.
- The two dead demo-table files (`DataTableOne.tsx`, `BasicTableFour.tsx`) and their 3 remaining icon imports.
