# Retell Workspace Isolation Model — One Workspace Per Client Company

## Why this exists

This platform serves **public companies for investor relations**. Two different
companies' agents, chat sessions, and — most importantly — **knowledge bases containing
SEC/OTC filings and investor-facing content** must never be able to cross-contaminate.
A bug that let Company A's agent see Company B's filings would be a serious credibility
and potential compliance problem.

Retell AI has **no API to create isolated sub-accounts programmatically** (confirmed
against the current API surface — see "What we checked" below). The only isolation
boundary Retell enforces for you is the **workspace**: every API key belongs to exactly
one workspace, and all resources created with that key (agents, knowledge bases, phone
numbers, calls, chats) live only in that workspace. There is no `tenant_id` parameter on
any Retell endpoint — the API key itself *is* the tenant boundary.

**Decision: every client company gets its own dedicated Retell workspace and API key.**
This makes cross-company leakage a platform-level impossibility (Retell itself blocks
it), instead of relying solely on our own application code (`tenant_id` scoping) to get
every query right, forever, with no exceptions.

## What we checked (so this doesn't need re-litigating later)

- `docs.retellai.com/accounts/workspace` — workspaces are created **manually only**,
  via the dashboard workspace switcher ("Add another workspace"). No `create-workspace`
  API endpoint exists.
- `docs.retellai.com/accounts/access-control` — RBAC (Admin/Developer/Member roles) is
  about *permissions within* a workspace, not a way to create isolated sub-tenants.
- Full API index (`docs.retellai.com/llms.txt` + `api-references/*`) — no
  `create-organization`, `create-sub-account`, or `create-workspace` endpoint anywhere.
- SDK source (`retell-typescript-sdk`) — confirms every resource (`agent`, `chatAgent`,
  `knowledgeBase`, `phoneNumber`, `call`, `chat`, `llm`, ...) is scoped implicitly by the
  API key used to construct the client; none accept an org/tenant id parameter.

If Retell ships a workspace-creation API in the future, this document and the
onboarding steps below should be revisited — but as of the API surface checked, manual
per-workspace provisioning is required.

## How isolation is implemented in this codebase

- `tenants.retell_api_key` (column already existed) stores the Retell API key for
  **any** tenant row — not just resellers.
- `src/lib/reseller.ts` → `getResellerRetellConfig(organizationTenantId)` is the single
  choke point almost every Retell-calling route uses to obtain an API key. As of the
  `refactor(tenants): remove reseller hierarchy; encrypt Retell key at rest` cleanup, it
  simply returns the organization's own `retell_api_key` when
  `retell_connection_status !== 'disconnected'`, or `null` otherwise — there is no
  reseller/parent-tenant fallback anymore. The `parent_id`/`is_reseller` traversal was
  removed entirely; `getResellerTenantId()` is kept only as a null-returning stub for a
  pending column-drop migration.
- `POST /api/tenants/[id]/retell/connect` (existing endpoint, `src/app/api/tenants/[id]/retell/connect/route.ts`)
  validates a Retell API key (via a lightweight `agent.list({ limit: 1 })` call), encrypts
  it, and stores it against **any specific organization tenant id** — this is the only
  way a Retell key gets attached to a tenant today.
- The `TenantManagement` component (`src/components/TenantManagement.tsx`, mounted at
  `/tenant-settings`) is the admin UI for this: platform staff click **Edit** on an
  organization's row, which opens a "Voice Provider" modal; paste in that organization's
  dedicated Retell API key and click **Save Configuration** to call the connect endpoint
  above.

No database migration was required — the schema already supported per-tenant keys.
This was a lookup-order bug, not a missing feature.

## Onboarding runbook: adding a new public-company client

Retell gives no API for this, so these steps are manual. Budget ~10–15 minutes per
new client company.

1. **Create a new Retell workspace** for the company.
   - In the Retell dashboard, click the workspace selector (top-left) → **Add another
     workspace** → enter the company name (e.g. `Acme Corp IR`) → Save.
2. **Generate an API key inside that new workspace.**
   - Switch into the new workspace → Settings → Developer (API Keys) → create a new
     key. Store it in your password manager / secrets vault; it will only be shown once.
3. **(Recommended) Set billing for the workspace** if it isn't inherited automatically,
   so usage is tracked/billed per company rather than pooled.
4. **Create the organization tenant in this app** (if not already created) via the
   normal tenant/organization creation flow.
5. **Connect the workspace key to the tenant**: go to `/tenant-settings` → find the
   organization's row → click **Edit** → in the "Voice Provider" modal, paste the API
   key from step 2 into the **API Key** field → **Save Configuration**. This calls
   `POST /api/tenants/{id}/retell/connect`, whose connection test (`agent.list({ limit: 1 })`)
   must succeed before the key is saved.
6. **Verify isolation**: as that organization, go to Knowledge Base and Agents — both
   lists should be empty (a fresh workspace has nothing in it yet). This is the proof
   the tenant is talking to its own dedicated workspace and not seeing anyone else's data.
7. Proceed with normal setup: create the IR chat + voice agents from the template
   (see `docs/RETELL_CHAT_AGENT_GUIDE.md`), create/populate the knowledge base with the
   company's filings, attach the KB to the agent, publish.

## Operational notes

- **This step does not scale automatically** — at meaningful client volume, manual
  workspace creation becomes a real bottleneck. If/when Retell ships a workspace
  creation API, prioritize automating step 1–2. Until then, this is a required
  checklist item in the sales/onboarding handoff, not an optional nice-to-have.
- **The reseller/shared-key fallback described in earlier revisions of this doc no
  longer exists in code.** The `parent_id`/`is_reseller` hierarchy and the fallback path
  in `getResellerRetellConfig` were removed (see the `refactor(tenants): remove reseller
  hierarchy; encrypt Retell key at rest` commit); every tenant row's Retell connection is
  now fully independent. There is no supported lower-isolation/shared-key tier anymore —
  every organization, including internal test/demo orgs, needs its own workspace + key
  via the onboarding runbook above.
