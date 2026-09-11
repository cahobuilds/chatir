# Agent Template-Only Creation Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-form "Create Agent" (from-scratch) flow on both the Voice Agents and Chat Agents pages with a mandatory two-step flow: click "Create Agent" → pick a template from an extensible picker → fill in that template's form → the agent is created for real in Retell (chat and/or voice) with the template's guardrails baked in. Also fix a global modal-width CSS bug and the confirmed critical bug where voice-agent creation never actually calls Retell.

**Architecture:** A new `AgentTemplatePicker` modal (Step 1) shows a grid of template cards. Today there is exactly one card, "Investor Relations" — the picker is built data-driven (an array of template definitions) so a second template is just a new array entry later, no structural changes. Selecting a card opens that template's config form (Step 2) — the existing `CreateIRAgentModal.tsx`, generalized to let the caller pick which channel(s) to create (`create_chat` / `create_voice`, at least one required) instead of "chat always + voice optional". The backend route `POST /api/agents/create-ir-template` is generalized to match. Both `VoiceAgentList.tsx` and `ChatAgentList.tsx` are rewired to use the same picker + form, with a `defaultChannel` prop so each page pre-checks the channel it's most relevant to (voice page defaults to voice-only checked, chat page defaults to chat-only checked; the user can still add the other channel from either page since the backend already supports creating a linked chat+voice pair on one shared LLM). All old free-form create code (local-DB-only inserts that never call Retell) is deleted, not just hidden.

**Tech Stack:** Next.js App Router API routes, React client components (existing `Modal`/`Form`/`Select` primitives), Retell TypeScript SDK (`createRetellClient`), Supabase.

## Global Constraints

- No free-form "create from scratch" entry point may remain reachable from either the Voice Agents or Chat Agents page after this plan — every creation path goes through the template picker.
- The IR template form must require at least one of `create_chat` / `create_voice` to be true; if `create_voice` is true, `voice_id` is required. Validate this both client-side (disable submit) and server-side (400 if violated) — client-side alone is not sufficient, per this codebase's existing pattern of double-validating in every route in `src/app/api/agents/`.
- Every new/changed API response and DB write must go through `canAccessTenant(user.id, tenant_id, 'agents.manage')` exactly like the existing route does — do not weaken or bypass this check.
- The picker must be data-driven (array of template definitions), not a hardcoded single-card layout, since a second template is expected later.
- Preserve the existing IR prompt/guardrail content in `src/lib/ir-agent-template.ts` byte-for-byte — this plan only changes which channels get created, not what gets said.
- Run `npx tsc --noEmit -p .` and `npx eslint <changed files>` after every task; zero new errors introduced (pre-existing `catch (error: any)` style errors in touched files are fine to leave, do not scope-creep into fixing unrelated pre-existing lint issues).
- The dev/prod server on `localhost:3000` is a production build (`next build && next start`), NOT `next dev` — after ALL code changes are in, you MUST run `npm run build` and restart the backgrounded server before claiming anything works in the browser. Source edits are invisible to a running `next start` process until rebuilt.

---

## Task 1: Fix the shared Modal component's default width (global CSS bug)

**Model:** `composer-2.5-fast` | **Tool:** `generalPurpose` subagent | **Justification:** Single-file mechanical CSS fix in a shared component with a clear, unambiguous spec (add a sane default max-width, let callers override). Tier 3 — no architectural judgment needed beyond picking reasonable per-caller widths.

**Files:**
- Modify: `src/components/ui/modal/index.tsx`
- Modify (add `className` overrides where the default is too narrow for existing content): `src/components/AgentEditModal.tsx`, `src/components/AgentInteractionModal.tsx`, `src/components/AgentTestModal.tsx`, `src/components/admin/RolesManagement.tsx` (2 call sites), `src/components/UserManagement.tsx` (2 call sites), `src/components/RailwayServicesManagement.tsx` (3 call sites), `src/components/TenantManagement.tsx` (3 call sites), `src/components/ChatAgentList.tsx` (embed + link modals, NOT the create modal — that's replaced in Task 4)

**Root cause (confirmed):** `contentClasses` for non-fullscreen modals is `"relative w-full max-h-[90vh] rounded-3xl bg-white dark:bg-gray-900 flex flex-col"` with no `max-w-*`, inside a `fixed inset-0 flex items-center justify-center` wrapper that has no horizontal padding. Every modal that doesn't pass its own `className` fills 100% of the viewport width. Only `src/components/common/NavigationSearch.tsx` (`className="max-w-2xl"`) currently overrides this.

- [ ] **Step 1: Add a default max-width to the shared Modal**

In `src/components/ui/modal/index.tsx`, change:

```tsx
  const contentClasses = isFullscreen
    ? "w-full h-full"
    : "relative w-full max-h-[90vh] rounded-3xl bg-white dark:bg-gray-900 flex flex-col";
```

to:

```tsx
  // Default to a sane dialog width for simple forms; callers with content-heavy
  // modals (tabs, side-by-side panels, wide tables) should pass a wider max-w-*
  // via `className` — see e.g. AgentEditModal, AgentInteractionModal.
  const contentClasses = isFullscreen
    ? "w-full h-full"
    : "relative w-full max-w-lg max-h-[90vh] mx-4 rounded-3xl bg-white dark:bg-gray-900 flex flex-col";
```

(`mx-4` guarantees a minimum gutter on very narrow viewports even before `max-w-lg` kicks in.)

- [ ] **Step 2: Widen the modals whose existing content needs more than `max-w-lg`**

Add a `className` prop to each `<Modal ...>` call below (append to existing props, don't remove any):

- `src/components/AgentEditModal.tsx` line ~616 (`<Modal isOpen={isOpen} onClose={onClose} title={...}>`) → add `className="max-w-2xl"` (has tabs + many fields).
- `src/components/AgentInteractionModal.tsx` line ~900 (`<Modal ... title={...}>`) → add `className="max-w-4xl"` (two side-by-side panels per its own inner `flex h-[80vh]`).
- `src/components/AgentTestModal.tsx` line ~869 → add `className="max-w-2xl"`.
- `src/components/admin/RolesManagement.tsx` line ~404 (Create/Edit Role) → add `className="max-w-xl"`. Line ~594 (Permissions view) → add `className="max-w-2xl"`.
- `src/components/UserManagement.tsx` line ~759 (New User) and line ~979 (Edit User) → add `className="max-w-xl"` to both (these have multi-tenant role-assignment lists that need more than `max-w-lg`).
- `src/components/RailwayServicesManagement.tsx` line ~521 (Create) → add `className="max-w-xl"`. Line ~691 (Delete confirm) → leave at default `max-w-lg` (short confirm dialog, no className needed). Line ~726 (Create Notion Resource) → add `className="max-w-xl"`.
- `src/components/TenantManagement.tsx` line ~612 (Create), ~880 (View Details), ~1046 (Edit) → add `className="max-w-2xl"` to all three (these render large config sections, per the `docs/superpowers/plans/2026-09-09-role-permission-critical-fixes.md` UI review notes).
- `src/components/ChatAgentList.tsx` line ~900 (Embed code modal) and line ~1110 (Link existing agent modal) → add `className="max-w-lg"` explicitly is optional (it's already the new default) — only add `className="max-w-xl"` to the embed modal since it shows a code block that benefits from more width.

- [ ] **Step 3: Verify no new type/lint errors**

Run: `npx tsc --noEmit -p .` — expect no new errors in any touched file.
Run: `npx eslint src/components/ui/modal/index.tsx src/components/AgentEditModal.tsx src/components/AgentInteractionModal.tsx src/components/AgentTestModal.tsx src/components/admin/RolesManagement.tsx src/components/UserManagement.tsx src/components/RailwayServicesManagement.tsx src/components/TenantManagement.tsx src/components/ChatAgentList.tsx` — expect only pre-existing errors (same count/lines as `git show HEAD:<file>` had before your change; do not fix pre-existing `no-explicit-any` errors, that's out of scope).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/modal/index.tsx src/components/AgentEditModal.tsx src/components/AgentInteractionModal.tsx src/components/AgentTestModal.tsx src/components/admin/RolesManagement.tsx src/components/UserManagement.tsx src/components/RailwayServicesManagement.tsx src/components/TenantManagement.tsx src/components/ChatAgentList.tsx
git commit -m "fix(ui): give the shared Modal a sane default max-width

Every modal using the shared <Modal> component without an explicit
className stretched edge-to-edge across the full viewport (w-full,
no max-w, inside a padding-less fixed inset-0 wrapper) - confirmed via
live screenshot on the Create Voice Agent modal. Add a max-w-lg
default plus mx-4 gutter, and widen the handful of call sites whose
existing content (tabs, side-by-side panels, config sections) needs
more than that."
```

---

## Task 2: Generalize the IR template backend route to accept explicit channel selection

**Model:** `claude-4.6-sonnet-medium-thinking` | **Tool:** `generalPurpose` subagent | **Justification:** API contract change touching validation, Retell SDK calls, and DB writes for a security/business-logic-relevant path (agent creation, tenant-scoped). Tier 2 — needs judgment on validation ordering and backward-safe response shape.

**Files:**
- Modify: `src/app/api/agents/create-ir-template/route.ts`

**Interfaces:**
- Consumes: nothing new (existing `retellClient`, `buildIRAgentConfig`, `canAccessTenant`, `getResellerRetellConfig` — no changes to their signatures).
- Produces: new request body shape `{ tenant_id, company_name, ticker_symbol, exchange, human_contact, create_chat: boolean, create_voice: boolean, voice_id?, knowledge_base_ids? }` and response shape `{ success, chat_agent: {...} | null, voice_agent: {...} | null, message }` — Task 3 (the frontend form) sends exactly this shape and reads exactly this response shape. `chat_agent`/`voice_agent` keep the same inner shape as today (`{ agent: <local row>, retell_agent: <retell response> }`) when present, `null` when that channel wasn't requested.

**Current behavior (read the full existing file first — it's short, ~215 lines):** always creates a chat LLM + chat agent (unconditional), and *additionally* creates a voice LLM + voice agent only if `include_voice` is truthy (requiring `voice_id`).

**New behavior:** replace the `include_voice` flag with two independent flags, `create_chat` and `create_voice`. At least one must be true. Chat-agent creation (and its LLM) only happens if `create_chat` is true. Voice-agent creation (and its LLM) only happens if `create_voice` is true (still requires `voice_id` when true). This means a caller can now request voice-only, chat-only, or both — today's code effectively only supported chat-only or chat+voice.

- [ ] **Step 1: Update request validation**

Replace:

```ts
    const {
      tenant_id,
      company_name,
      ticker_symbol,
      exchange,
      human_contact,
      include_voice,
      voice_id, // required if include_voice is true
      knowledge_base_ids, // optional: local KB row ids to attach immediately
    } = body;

    if (!tenant_id || !company_name) {
      return NextResponse.json({ error: 'tenant_id and company_name are required' }, { status: 400 });
    }

    if (include_voice && !voice_id) {
      return NextResponse.json({ error: 'voice_id is required when include_voice is true' }, { status: 400 });
    }
```

with:

```ts
    const {
      tenant_id,
      company_name,
      ticker_symbol,
      exchange,
      human_contact,
      create_chat,
      create_voice,
      voice_id, // required if create_voice is true
      knowledge_base_ids, // optional: local KB row ids to attach immediately
    } = body;

    if (!tenant_id || !company_name) {
      return NextResponse.json({ error: 'tenant_id and company_name are required' }, { status: 400 });
    }

    if (!create_chat && !create_voice) {
      return NextResponse.json(
        { error: 'At least one of create_chat or create_voice must be true' },
        { status: 400 }
      );
    }

    if (create_voice && !voice_id) {
      return NextResponse.json({ error: 'voice_id is required when create_voice is true' }, { status: 400 });
    }
```

- [ ] **Step 2: Make chat-agent creation conditional**

The existing code creates `chatLlm`, `chatAgent`, and `localChatAgent` unconditionally (right after the `retellClient` is constructed, before the `if (include_voice)` block). Wrap that entire existing block (the `chatConfig`/`chatLlm`/`chatAgentName`/`chatAgent`/`localChatAgent`/KB-mirroring-for-chat section) in `if (create_chat) { ... }`, declaring the result variables above it so they're in scope for the final response:

```ts
    let chatAgent: any = null;
    let localChatAgent: any = null;

    if (create_chat) {
      // ... existing chatConfig / chatLlm / chatAgentName / chatAgent / localChatAgent /
      // KB-mirroring-for-chat code goes here, unchanged, just re-indented one level ...
    }
```

- [ ] **Step 3: Rename the voice condition**

Change `if (include_voice) {` to `if (create_voice) {` (the voice block's internals — `voiceConfig`/`voiceLlm`/`voiceAgentName`/`voiceAgent`/`localVoiceAgent`/KB mirroring — are unchanged).

- [ ] **Step 4: Update the final response and its message**

Replace:

```ts
    return NextResponse.json({
      success: true,
      chat_agent: { agent: localChatAgent, retell_agent: chatAgent },
      voice_agent: include_voice ? { agent: localVoiceAgent, retell_agent: voiceAgent } : null,
      message: include_voice
        ? `Created Investor Relations chat and voice agents for ${company_name}. Publish each when ready to go live.`
        : `Created Investor Relations chat agent for ${company_name}. Publish it when ready to go live.`,
    }, { status: 201 });
```

with:

```ts
    const createdChannels = [create_chat && 'chat', create_voice && 'voice'].filter(Boolean).join(' and ');
    return NextResponse.json({
      success: true,
      chat_agent: create_chat ? { agent: localChatAgent, retell_agent: chatAgent } : null,
      voice_agent: create_voice ? { agent: localVoiceAgent, retell_agent: voiceAgent } : null,
      message: `Created Investor Relations ${createdChannels} agent${create_chat && create_voice ? 's' : ''} for ${company_name}. Publish ${create_chat && create_voice ? 'each' : 'it'} when ready to go live.`,
    }, { status: 201 });
```

- [ ] **Step 5: Verify with tsc/lint**

Run: `npx tsc --noEmit -p .` — expect no new errors.
Run: `npx eslint src/app/api/agents/create-ir-template/route.ts` — expect only pre-existing errors.

- [ ] **Step 6: Manual verification via curl (once Task 3's frontend isn't done yet, verify the contract directly)**

This requires a valid session cookie — skip live curl if not convenient; the full end-to-end browser verification happens in Task 6. At minimum confirm the file still exports valid TypeScript and the logic reads correctly on review: chat-only request → `chat_agent` populated, `voice_agent: null`; voice-only request → the reverse; both → both populated; neither → 400.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/agents/create-ir-template/route.ts
git commit -m "feat(agents): let the IR template route create chat-only, voice-only, or both

Replaces the old 'chat always + voice optional' contract with two
independent create_chat/create_voice flags (at least one required),
so the Voice Agents page can request a voice-only IR agent instead of
always getting an unwanted chat agent bundled in."
```

---

## Task 3: Build the extensible Template Picker + generalize the IR agent form

**Model:** `claude-4.6-sonnet-medium-thinking` | **Tool:** `generalPurpose` subagent | **Justification:** New reusable component with real design decisions (data-driven picker architecture, channel-toggle UX, integrating with Task 2's new contract). Tier 2.

**Depends on:** Task 2's request/response contract (already specified above — this task can start in parallel with Task 2 and integrate against the documented contract; Task 2's implementer and this task's implementer must not diverge from the interface block above).

**Files:**
- Create: `src/components/AgentTemplatePicker.tsx`
- Modify: `src/components/CreateIRAgentModal.tsx`

**Interfaces:**
- Produces (for Task 4 and Task 5 to consume):
  ```ts
  // AgentTemplatePicker.tsx
  export type TemplateId = "investor-relations"; // add more ids here as templates are added

  interface AgentTemplatePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (templateId: TemplateId) => void;
  }
  export default function AgentTemplatePicker(props: AgentTemplatePickerProps): JSX.Element;
  ```
  ```ts
  // CreateIRAgentModal.tsx (generalized)
  interface CreateIRAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultChannel: "chat" | "voice"; // which checkbox starts checked
  }
  export default function CreateIRAgentModal(props: CreateIRAgentModalProps): JSX.Element;
  ```

- [ ] **Step 1: Create the data-driven template picker**

Create `src/components/AgentTemplatePicker.tsx`:

```tsx
"use client";

import React from "react";
import { Modal } from "./ui/modal";

export type TemplateId = "investor-relations";

interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  badge: string;
}

// Add new templates here as they're built - each one just needs a card definition
// plus a case in the caller's switch statement for which form component to render.
const TEMPLATES: TemplateDefinition[] = [
  {
    id: "investor-relations",
    name: "Investor Relations",
    description:
      "For public companies. Answers investor questions using only your public filings and IR website content - never fabricates, never gives investment advice, always cites sources, and hands off anything sensitive to a human.",
    badge: "Public Companies",
  },
];

interface AgentTemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: TemplateId) => void;
}

export default function AgentTemplatePicker({
  isOpen,
  onClose,
  onSelect,
}: AgentTemplatePickerProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose a Template" className="max-w-2xl">
      <div className="px-6 py-4">
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Every agent starts from a pre-configured template with the right guardrails and
          prompt for its use case. More templates will be added over time.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className="flex flex-col rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:border-gray-700 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20"
            >
              <span className="mb-2 inline-block w-fit rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {template.badge}
              </span>
              <span className="mb-1 font-semibold text-gray-900 dark:text-white">
                {template.name}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {template.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Generalize `CreateIRAgentModal` to a channel-toggle form**

Read the full current file first (`src/components/CreateIRAgentModal.tsx`, ~270 lines) to see the exact current `includeVoice` state, form JSX, and `handleSubmit`. Make these changes:

1. Add a `defaultChannel: "chat" | "voice"` prop to `CreateIRAgentModalProps`.
2. Replace the single `const [includeVoice, setIncludeVoice] = useState(true);` with two independent booleans, seeded from the prop:
   ```ts
   const [createChat, setCreateChat] = useState(defaultChannel === "chat");
   const [createVoice, setCreateVoice] = useState(defaultChannel === "voice");
   ```
3. In the JSX, replace whatever single "Include voice agent" checkbox exists today with two checkboxes: "Create chat agent" (bound to `createChat`/`setCreateChat`) and "Create voice agent" (bound to `createVoice`/`setCreateVoice`) — keep the existing voice_id `<Select>` but only render/require it when `createVoice` is true (mirror the existing conditional pattern already used for `includeVoice` today).
4. Add a client-side guard: disable the submit button (in addition to existing `isSubmitting`/`companyName` checks) when `!createChat && !createVoice`, and when `createVoice && !voiceId`.
5. In `handleSubmit`, change the POST body from `{ ..., include_voice: includeVoice, voice_id, ... }` to `{ ..., create_chat: createChat, create_voice: createVoice, voice_id, ... }` (matches Task 2's new contract exactly).
6. Update any success-message text that references "voice agent" conditionally to read from the response's `chat_agent`/`voice_agent` presence (both may now be non-null, either may be null) rather than the old `include_voice` local variable.
7. Reset `createChat`/`createVoice` back to `defaultChannel === "chat"` / `defaultChannel === "voice"` (not always `true`/`false`) in whatever reset-on-close logic already exists.

- [ ] **Step 3: Verify with tsc/lint**

Run: `npx tsc --noEmit -p .` — expect no new errors.
Run: `npx eslint src/components/AgentTemplatePicker.tsx src/components/CreateIRAgentModal.tsx` — expect zero errors in the new file, only pre-existing-style errors (if any) in the modified one.

- [ ] **Step 4: Commit**

```bash
git add src/components/AgentTemplatePicker.tsx src/components/CreateIRAgentModal.tsx
git commit -m "feat(agents): add extensible template picker, generalize IR form to pick channels

AgentTemplatePicker is step 1 of the new mandatory creation flow - a
data-driven grid (today: just 'Investor Relations') that will grow as
more templates are added. CreateIRAgentModal is step 2, generalized
from a single always-chat+optional-voice flow to two independent
create_chat/create_voice checkboxes (at least one required), matching
the create-ir-template route's new contract, and taking a
defaultChannel prop so each entry point can pre-check the channel
that's most relevant to where the user clicked 'Create Agent'."
```

---

## Task 4: Wire the new flow into the Voice Agents page, delete the dead from-scratch code

**Model:** `claude-4.6-sonnet-medium-thinking` | **Tool:** `generalPurpose` subagent | **Justification:** Multi-step removal (deleting the confirmed-broken local-only creation code) plus new wiring with real UX judgment (two-step modal state machine). Tier 2.

**Depends on:** Task 3 (needs `AgentTemplatePicker` and the generalized `CreateIRAgentModal` to exist with the props documented in Task 3's Interfaces block).

**Previous Phase Context Review (do this before writing any code):** Read `src/components/VoiceAgentList.tsx` in full as it exists after Task 1's Modal-width fix has landed (Task 1 does not touch this file's create modal, only shared `Modal` defaults — confirm that by checking `git log --oneline -- src/components/ui/modal/index.tsx` shows Task 1's commit already applied). Confirm the exact current state of: `isCreateModalOpen`, `formData` (`name`, `type`, `is_active`, `voice_id`, `language`), `handleCreate`, `handleSubmit`, `voiceOptions`/`voicesLoading` fetch effect, and the `<Modal>` JSX block (~line 680-820) before deleting anything — this task deletes all of it except the `voiceOptions` fetch effect is also dead once the create modal is gone (the new `CreateIRAgentModal` fetches its own voices internally per Task 3, confirmed by reading `CreateIRAgentModal.tsx`'s existing `fetchOptions` effect), so the voice-fetching `useEffect` in `VoiceAgentList.tsx` (currently used only by the old create modal) should also be deleted as dead code, not left orphaned.

**Files:**
- Modify: `src/components/VoiceAgentList.tsx`

- [ ] **Step 1: Add the two-step modal state and import the new components**

Add imports:
```ts
import AgentTemplatePicker, { TemplateId } from "./AgentTemplatePicker";
import CreateIRAgentModal from "./CreateIRAgentModal";
```

Replace the old create-related state:
```ts
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
```
(and the `formData`/`isSubmitting`/`error`/`success` state that was ONLY used by the old from-scratch form — check each remaining usage of `error`/`success`/`isSubmitting` first; they're also used elsewhere in this file for delete/sync actions, so only remove `formData` and any create-specific `error`/`success` setters that have no other caller left after Step 3 deletes the old modal JSX)

with:
```ts
const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId | null>(null);
```

- [ ] **Step 2: Replace `handleCreate` and add the picker-selection handler**

Replace:
```ts
const handleCreate = () => {
  setEditingAgent(null);
  setFormData({
    name: "",
    type: "voice",
    is_active: true,
    voice_id: "",
    language: "en-US",
  });
  setIsCreateModalOpen(true);
};
```

with:
```ts
const handleCreate = () => {
  setIsTemplatePickerOpen(true);
};

const handleTemplateSelect = (templateId: TemplateId) => {
  setSelectedTemplateId(templateId);
  setIsTemplatePickerOpen(false);
};
```

- [ ] **Step 3: Delete the old from-scratch `handleSubmit` and the old `<Modal>` JSX block, replace with the two new modals**

Delete the entire old `handleSubmit` function (the one that does `fetch("/api/agents", { method: "POST", ... })` with `formData.name`/`formData.voice_id`/etc — confirmed dead, this is the exact code with the critical bug this plan fixes by removal). Delete the voice-fetching `useEffect` that populated `voiceOptions`/`voicesLoading` for the old form (confirmed dead per this task's Context Review above — the new `CreateIRAgentModal` fetches its own voices). Delete the `voiceOptions`/`voicesLoading` state declarations, the `languageOptions` array (only used by the old form), and the entire `{/* Create Agent Modal */}` `<Modal>` JSX block at the end of the component (~lines 680-820).

Replace it with:
```tsx
{/* Step 1: Template Picker */}
<AgentTemplatePicker
  isOpen={isTemplatePickerOpen}
  onClose={() => setIsTemplatePickerOpen(false)}
  onSelect={handleTemplateSelect}
/>

{/* Step 2: Investor Relations template form (voice-first: this page defaults to
    creating a voice agent, but the user can add a chat agent on the same LLM too) */}
<CreateIRAgentModal
  isOpen={selectedTemplateId === "investor-relations"}
  onClose={() => setSelectedTemplateId(null)}
  onSuccess={() => {
    setSelectedTemplateId(null);
    fetchAgents();
  }}
  defaultChannel="voice"
/>
```

- [ ] **Step 4: Confirm the "No voice agents found" empty-state button still works**

The empty-state "Create New Agent" button (~line 584, inside the `filteredAndSortedAgents.length === 0` branch) already calls the same `handleCreate` — no change needed there, just confirm after Step 2/3 that it still compiles (it references `handleCreate`, which still exists with its new body).

- [ ] **Step 5: Verify with tsc/lint**

Run: `npx tsc --noEmit -p .` — expect zero errors referencing `VoiceAgentList.tsx` (in particular, no leftover references to deleted `formData`/`isCreateModalOpen`/`voiceOptions`/`languageOptions`).
Run: `npx eslint src/components/VoiceAgentList.tsx` — expect no new errors, and note the pre-existing `console.log` statements in this file are out of scope to remove.

- [ ] **Step 6: Commit**

```bash
git add src/components/VoiceAgentList.tsx
git commit -m "feat(voice-agents): replace broken from-scratch create with template picker

Deletes the old 'Create Voice Agent' modal and its handleSubmit, which
only ever inserted a local DB row and never called Retell at all -
confirmed via live repro (new agents showed their local UUID instead
of a real Retell agent_id). Clicking 'Create Agent' now opens the
template picker; selecting Investor Relations opens the generalized
form defaulting to voice-only (the user can add a linked chat agent
too), which actually creates the agent in Retell."
```

---

## Task 5: Wire the new flow into the Chat Agents page, delete the dead from-scratch code and the old standalone IR button

**Model:** `claude-4.6-sonnet-medium-thinking` | **Tool:** `generalPurpose` subagent | **Justification:** Same category as Task 4 - deletion of confirmed-dead/duplicate code plus new wiring, but with one extra wrinkle (merging two existing buttons into one). Tier 2.

**Depends on:** Task 3 (same as Task 4). Independent of Task 4 (different file) — these two can run in parallel once Task 3 is done.

**Previous Phase Context Review (do this before writing any code):** Read `src/components/ChatAgentList.tsx` in full as it exists after Task 1's Modal-width fix (which added `className="max-w-xl"` to this file's embed-code modal only — confirm that's already applied and don't revert it). Note this file's from-scratch "Create Agent" flow is *not* fully broken the way Voice's was — it does correctly call `/api/retell/llms` then `/api/retell/chat-agents` to create a real Retell chat agent (see `handleSubmit`, ~lines 372-485) — but it still bypasses the IR guardrails/prompt entirely, which is exactly what this plan's global constraint ("no free-form create from scratch may remain") forbids. Also note the existing `isCreateIRModalOpen` state and `<CreateIRAgentModal isOpen={isCreateIRModalOpen} ... />` usage (~line 891) already wires the *old* single-channel-toggle version of that component — this task must update that usage to the new `defaultChannel` prop from Task 3, not just leave it as-is.

**Files:**
- Modify: `src/components/ChatAgentList.tsx`

- [ ] **Step 1: Add the two-step modal state and import the picker**

Add import: `import AgentTemplatePicker, { TemplateId } from "./AgentTemplatePicker";`

Replace:
```ts
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
```
and
```ts
const [isCreateIRModalOpen, setIsCreateIRModalOpen] = useState(false);
```
(check both exist today, per the earlier grep results showing `isCreateIRModalOpen` referenced at the "Create Investor Relations Agent" button and at the `<CreateIRAgentModal>` usage)

with:
```ts
const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId | null>(null);
```

- [ ] **Step 2: Merge the two "Create" buttons into one, opening the picker**

Replace both buttons:
```tsx
<Button onClick={handleCreate} size="sm">
  Create Agent
</Button>
<Button
  onClick={() => setIsCreateIRModalOpen(true)}
  size="sm"
  variant="outline"
  className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
  title="Create a chat + voice agent pair pre-configured for investor relations"
>
  Create Investor Relations Agent
</Button>
```
with a single button:
```tsx
<Button onClick={() => setIsTemplatePickerOpen(true)} size="sm">
  Create Agent
</Button>
```

Do the same for the second occurrence of the "Create Agent"/"Create New Agent" button in the empty-state block (~line 727) — replace its `onClick={handleCreate}` with `onClick={() => setIsTemplatePickerOpen(true)}`.

- [ ] **Step 3: Delete the old from-scratch `handleCreate`/`handleSubmit`/`formData` and the old create `<Modal>` JSX block**

Delete `handleCreate`, the from-scratch `handleSubmit` (the one calling `/api/agents` then `/api/retell/llms` then `/api/retell/chat-agents` sequentially, ~lines 372-485), the `formData` state it used, and the entire old `{/* Create Agent Modal */}` `<Modal>` JSX block (~line 966 onward, title `"Create Chat Agent"`). Leave the Embed modal (~line 900) and Link modal (~line 1110) untouched — those are unrelated features, not part of this plan.

- [ ] **Step 4: Add the picker and update the `CreateIRAgentModal` usage**

Add the picker JSX near the existing `<CreateIRAgentModal>` usage:
```tsx
{/* Step 1: Template Picker */}
<AgentTemplatePicker
  isOpen={isTemplatePickerOpen}
  onClose={() => setIsTemplatePickerOpen(false)}
  onSelect={(templateId: TemplateId) => {
    setSelectedTemplateId(templateId);
    setIsTemplatePickerOpen(false);
  }}
/>
```

Update the existing `<CreateIRAgentModal>` usage (~line 891) to use the new `isOpen`/`defaultChannel` wiring instead of the old `isCreateIRModalOpen` boolean:
```tsx
{/* Step 2: Investor Relations template form (chat-first: this page defaults to
    creating a chat agent, but the user can add a linked voice agent too) */}
<CreateIRAgentModal
  isOpen={selectedTemplateId === "investor-relations"}
  onClose={() => setSelectedTemplateId(null)}
  onSuccess={() => {
    setSelectedTemplateId(null);
    fetchAgents();
  }}
  defaultChannel="chat"
/>
```
(Keep whatever the existing `onSuccess` body already does beyond `fetchAgents()` — e.g. a success-toast setter — just fold it into this new callback rather than dropping it.)

- [ ] **Step 5: Verify with tsc/lint**

Run: `npx tsc --noEmit -p .` — expect zero errors referencing `ChatAgentList.tsx`.
Run: `npx eslint src/components/ChatAgentList.tsx` — expect no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ChatAgentList.tsx
git commit -m "feat(chat-agents): merge free-form + IR-only create buttons into one template flow

The old 'Create Agent' button did correctly call Retell but bypassed
the IR guardrails/prompt entirely, and duplicated a separate
'Create Investor Relations Agent' button right next to it. Both are
replaced by the same template picker used on the Voice Agents page;
selecting Investor Relations here defaults to chat-only (the user can
add a linked voice agent too)."
```

---

## Task 6: Rebuild, restart, and verify both flows end-to-end in the browser

**Model:** `claude-4.6-opus-high-thinking` | **Tool:** `shell` + direct browser verification (orchestrator, not a dispatched subagent) | **Justification:** Cross-workstream verification touching all 5 prior tasks' output together for the first time — orchestrator-level per the escalation rules ("cross-workstream coordination always Tier 1").

**Depends on:** Tasks 1-5 all merged.

**Previous Phase Context Review:** Confirm via `git log --oneline -6` that all 5 prior task commits are present before rebuilding. Re-read this plan's Global Constraints section's note about `next start` needing an explicit rebuild — every "fix isn't showing up" symptom earlier in this project's history traced back to skipping this step.

- [ ] **Step 1: Type-check and lint the whole repo one more time**

Run: `npx tsc --noEmit -p .` — zero errors.
Run: `npx eslint src/components/VoiceAgentList.tsx src/components/ChatAgentList.tsx src/components/AgentTemplatePicker.tsx src/components/CreateIRAgentModal.tsx src/app/api/agents/create-ir-template/route.ts src/components/ui/modal/index.tsx` — no new errors vs. the pre-plan baseline.

- [ ] **Step 2: Rebuild and restart the backgrounded production server**

```bash
npm run build
```
Then find and kill the currently-listening `next-server` process (`lsof -iTCP:3000 -sTCP:LISTEN -P`, `kill <pid>`), then start a new one with the Shell tool's `block_until_ms: 0` backgrounding (NOT `nohup ... & disown`, which was already proven not to survive in this sandboxed environment):
```bash
npm run start -- -p 3000
```

- [ ] **Step 3: Browser-verify the Voice Agents flow**

Navigate to `/agents/voice`, click "Create Agent" → confirm the Template Picker modal appears sized reasonably (not edge-to-edge) → select "Investor Relations" → confirm the form defaults to "Create voice agent" checked / "Create chat agent" unchecked → fill in a company name and pick a voice → submit → confirm the resulting row's ID column shows a real Retell `agent_...`-style ID (not a raw local UUID) → delete the test agent afterward to leave the DB clean.

- [ ] **Step 4: Browser-verify the Chat Agents flow**

Navigate to `/agents/chat`, confirm there is now exactly one "Create Agent" button (the old separate "Create Investor Relations Agent" button is gone) → click it → Template Picker → select "Investor Relations" → confirm the form defaults to "Create chat agent" checked → submit → confirm a real Retell agent ID → delete the test agent afterward.

- [ ] **Step 5: Spot-check two other modals for the width fix**

Open the Edit Agent modal and one of Roles/Users/Tenant modals; screenshot both, confirm neither spans edge-to-edge anymore and neither looks clipped/too-narrow for its content.

- [ ] **Step 6: Final commit (if Step 2-5 required any fix-up changes)**

If everything passed with no fix-ups needed, no commit is needed for this task — it's verification-only. If any fix was required, commit it with a message describing exactly what broke and why, per this plan's established commit-message style (see Tasks 1-5 above).
