# Platform Admin Runbook: Onboarding a New Client Organization

**Audience:** platform admins (`platform_admin` / `platform_operator` role, e.g.
`systemadmin@tin.info`) who need to bring a brand-new client company onto Chat IR,
end to end — from creating its organization record through to a live, callable agent.

**Scope:** this doc covers the full chain across three separate systems that a platform
admin has to bridge by hand: **Chat IR** (this app), **Retell AI** (the voice/chat
provider, external), and **Stripe** (billing, mentioned briefly where it intersects).

---

## The mental model

```
1 client company
   └── 1 organization (tenant) in Chat IR         ← created by platform admin, in-app
   └── 1 dedicated workspace in Retell             ← created by platform admin, on retellai.com (manual, no API)
         └── 1 API key                             ← generated in that workspace
               └── pasted into the organization's Retell connection in Chat IR
                     └── N agents (chat and/or voice) created per organization
                           each agent lives inside that org's own Retell workspace,
                           never a shared one
```

**Why one Retell workspace per company, not one shared workspace for everyone:**
Retell has no API to create isolated sub-accounts — the API key itself *is* the
isolation boundary (no resource in Retell's API takes a `tenant_id` parameter). Two
different client companies' agents, calls, chats, and knowledge bases (which may
contain non-public filings/investor content) must never be able to cross-contaminate.
Giving each company its own workspace + key makes that impossible at the provider
level, instead of relying entirely on our own `tenant_id` scoping to never have a bug.
See `docs/RETELL_WORKSPACE_ISOLATION.md` for the full rationale and the API surface
that was checked to confirm no programmatic alternative exists.

---

## Roles and permissions involved

| Action | Required permission | Who normally has it |
|---|---|---|
| Create an organization | `orgs.create` | `platform_admin`, `platform_operator` |
| View all organizations | `orgs.view` | `platform_admin`, `platform_operator`, `platform_billing` |
| Connect/view/disconnect a Retell API key for an org | `retell_key.manage` | `platform_admin` (typically not delegated to company-level roles) |
| Create an agent for an org | `agents.manage` | `platform_admin`/`platform_operator` (any org) **or** `company_admin`/`company_editor` (their own org, once connected) |
| Publish an agent, attach knowledge base, bind a phone number | `agents.manage` | same as above |
| Override an org's billing status/exemption | platform-admin-only (`orgs.view`-gated `isSystemAdmin` check) | `platform_admin` only |

`platform_admin` is a superuser — every permission check above passes automatically for
that role (see `src/lib/permissions-server.ts`, `isPlatformAdmin()` /
`hasPlatformPermission()`). Everyday onboarding is normally done by a `platform_admin`
or `platform_operator` account.

---

## Step 1 — Create the organization in Chat IR

1. Log in as a platform admin and go to **`/tenant-settings`**.
2. In the **Organizations** panel, click **"+ Create Organization"**.
3. Fill in: name, subdomain (auto-derived from the name if left blank), tier, and
   optionally contact email/phone/website/address.
4. Submit. This calls `POST /api/tenants` (gated by `orgs.create`), which inserts a new
   row into the `tenants` table.

At this point the organization exists but has **no voice/chat provider connected** and
**no agents**. New tenants default to `plan_status: 'inactive'` and
`billing_exempt: false` — see the Billing note near the end of this doc before this
organization tries to create its first agent.

---

## Step 2 — Create a dedicated Retell workspace (external, manual)

This step happens **entirely outside Chat IR**, on Retell's own dashboard
(`app.retellai.com`). There is no API for it — it has to be done by hand every time.

1. In the Retell dashboard, click the workspace selector (top-left) → **"Add another
   workspace"** → name it after the company (e.g. `Acme Corp IR`) → Save.
2. Switch into the new workspace → **Settings → Developer (API Keys)** → create a new
   API key. **It is shown once** — store it in your password manager / secrets vault
   immediately.
3. *(Recommended)* Configure billing for the new workspace if it isn't inherited
   automatically, so Retell-side usage is tracked per company rather than pooled.

Budget ~10–15 minutes per new client company for this step — it is the one part of
onboarding that cannot be automated today (see "Known limitations" below).

---

## Step 3 — Link the workspace to the organization via its API key

1. Back in Chat IR, on **`/tenant-settings`**, select the organization created in Step 1
   → open its **edit / "Voice Provider"** panel (the **API Key** field in
   `TenantManagement.tsx`'s connect flow).
2. Paste the API key generated in Step 2 → Save/Connect.
3. This calls `POST /api/tenants/{id}/retell/connect` (gated by `retell_key.manage`),
   which:
   - Validates the key with a lightweight `agent.list({ limit: 1 })` call against
     Retell's API.
   - On success: encrypts the key (`src/lib/encryption.ts`) and stores it on
     `tenants.retell_api_key`, sets `retell_connection_status = 'connected'` and
     `retell_connected_at = now()`.
   - On failure: sets `retell_connection_status = 'error'` and returns a descriptive
     error (invalid key, network issue, etc.) — nothing is saved.

From this point on, **every Retell call made on behalf of this organization
automatically uses its own stored key** (`getResellerRetellConfig()` in
`src/lib/reseller.ts` is the single choke point almost every Retell-calling route uses
to resolve which key to use). Nobody has to paste the key again.

**Verify isolation before moving on:** as this organization, check that Knowledge Base
and Agents are both empty — a fresh workspace has nothing in it yet. If either list is
non-empty, the key may be pointing at an existing/shared workspace by mistake.

---

## Step 4 — Create an agent for the organization

Once connected, any user with `agents.manage` on this organization (platform staff, or
the organization's own `company_admin`/`company_editor`) can create agents from the UI:
**Voice Agents** or **Chat Agents** → **"Create Agent"** → choose a template (currently:
**Investor Relations**).

Submitting the form calls `POST /api/agents/create-ir-template` with the tenant id,
company details, and which channel(s) to create (`create_chat`, `create_voice` +
`voice_id`). That route:

1. Resolves the organization's own Retell API key via `getResellerRetellConfig()`
   (fails with a clear 400 if the organization isn't connected yet — this is the
   guardrail that enforces Steps 2–3 happened first).
2. Builds the IR-specific system prompt/guardrails per channel
   (`src/lib/ir-agent-template.ts`) — chat and voice get separately-tuned prompts even
   though they share the same underlying template, since Retell needs one distinct
   `general_prompt` per LLM.
3. Calls Retell's API (`llm.create` → `chatAgent.create` and/or `agent.create`) **using
   that organization's own key**, so the new agent is created inside *its* dedicated
   workspace.
4. Inserts a local row into `agents` (`type: 'chat'` or `'voice'`) with
   `retell_agent_id` set to the ID Retell returned — this is the permanent link between
   our record and the live Retell agent.
5. Optionally attaches knowledge base(s) passed in up front (`knowledge_base_ids`),
   mirroring the link into the local `agent_knowledge_bases` table.

This has to be repeated **per organization** — agents are never shared across
organizations, by design (Step 2's isolation model).

### Publishing (required before it's live)

A newly-created agent is a draft. Before it can actually take calls/chats:

```
POST /api/retell/agents/[id]/publish
```

Review the prompt and attach the knowledge base first if you didn't do so at creation
time — publishing locks in whatever configuration exists at that moment.

### Binding a phone number (voice agents only)

A voice agent with no phone number can be tested via web call, but can't receive real
inbound calls until a number is bound to it:

```
POST /api/retell/phone-numbers
{ "tenant_id": "...", "area_code": "415", "agent_id": "<local agent id>" }
```

This purchases a Retell-managed number and binds the new agent as the sole inbound
handler. To repoint an existing number at a different agent instead:

```
PATCH /api/retell/phone-numbers/{phone_number}
{ "tenant_id": "...", "agent_id": "<local agent id>" }
```

See `docs/RETELL_IR_VOICE_INBOUND_SETUP.md` for the full inbound setup flow, including a
real breaking-change note about Retell's phone-number API (single `agent_id` binding was
removed in favor of weighted `inbound_agents` lists as of 2026-03-31).

---

## Data model reference

Fields on `tenants` relevant to this flow:

| Column | Set by | Meaning |
|---|---|---|
| `id`, `name`, `subdomain`, `tier` | Step 1 | Core organization identity |
| `retell_api_key` | Step 3 | Encrypted at rest (`src/lib/encryption.ts`); never returned to any client response (`sanitizeTenant()` in `src/app/api/tenants/route.ts` strips it) |
| `retell_connection_status` | Step 3 | `'disconnected'` \| `'connected'` \| `'error'` |
| `retell_connected_at` | Step 3 | Timestamp of last successful connect |
| `billing_exempt`, `plan_status` | Stripe billing (separate flow) | Gates whether this org can create *new* agents — see Billing note below |

Fields on `agents` relevant to this flow:

| Column | Set by | Meaning |
|---|---|---|
| `tenant_id` | Step 4 | Which organization owns this agent |
| `type` | Step 4 | `'chat'` or `'voice'` |
| `retell_agent_id` | Step 4 (from Retell's response) | The live Retell agent this row is linked to |
| `retell_phone_number_id` | Phone binding step | Set once a number is bound (voice only) |
| `configuration` | Step 4 | Raw snapshot of the Retell agent object at creation time, plus `ir_template: true` marker |

---

## Verification checklist (per new organization)

- [ ] Organization created (`/tenant-settings`, visible in the Organizations list)
- [ ] Retell workspace created for this company specifically (not reusing an existing one)
- [ ] API key connected — `retell_connection_status = 'connected'`
- [ ] Agents/Knowledge Base lists are empty immediately after connecting (proves isolation, not a shared workspace)
- [ ] At least one agent created and visible under this org, with a `retell_agent_id`
- [ ] Agent published (`POST /api/retell/agents/[id]/publish`)
- [ ] (Voice only) phone number purchased and bound
- [ ] Organization's billing state is what you expect — see next section

---

## Billing note (separate system, but blocks Step 4 if ignored)

Chat IR requires an active/trialing Stripe subscription (or a platform-admin-granted
`billing_exempt` flag) before an organization can create agents via the generic
`POST /api/agents` endpoint (`src/lib/billing.ts` → `hasActiveBilling()`, enforced in
`src/app/api/agents/route.ts`). New organizations created in Step 1 default to
`plan_status: 'inactive'` and are **not** exempt.

**Caveat found while writing this doc:** the IR-template creation route used in Step 4
(`POST /api/agents/create-ir-template`) inserts directly into `agents` and does **not**
currently call `hasActiveBilling()` — only the generic `POST /api/agents` route enforces
the billing soft-lock. In practice this means an org with no active subscription can
still create agents via the "Create Agent" template flow today. This is a real gap
between the two agent-creation code paths, not intentional; flagging it here rather than
silently working around it. If this matters for your workflow, either use the
platform-admin **billing override** (`/billing` → select the org → **"Grant exemption"**
or set `plan_status` directly) to make the org's state explicit either way, or treat
closing this gap as a small follow-up task.

For a self-serve signing-up company (not manually onboarded by a platform admin), the
Stripe Checkout flow at signup handles this automatically — see
`docs/superpowers/specs/2026-09-14-stripe-billing-design.md` for that design.

---

## Known limitations

- **Step 2 cannot be automated** with Retell's current API — no `create-workspace`
  endpoint exists as of the last time this was checked (see
  `docs/RETELL_WORKSPACE_ISOLATION.md` → "What we checked"). If Retell ships one, this
  is the highest-value step to automate next, since it's the only fully-manual one.
- **Documentation drift found while writing this:** `docs/RETELL_WORKSPACE_ISOLATION.md`
  references connecting the API key via a `RetellIntegrationManagement.tsx` component at
  `/settings` — that component does not exist in the current codebase. The real,
  verified UI for Step 3 today is `TenantManagement.tsx`'s connect flow on
  `/tenant-settings`, as documented above. Worth a follow-up correction to that doc.
- **A legacy shared-key fallback still exists** in `getResellerRetellConfig()` for
  tenants provisioned before the one-workspace-per-company model — new organizations
  should never rely on it; treat any tenant still using it as migration debt, not a
  supported permanent state.

## Related docs

- `docs/RETELL_WORKSPACE_ISOLATION.md` — why one workspace per company, and the
  isolation rationale in full
- `docs/RETELL_IR_AGENT_TEMPLATE.md` — the IR agent prompt/guardrail template itself
- `docs/RETELL_IR_VOICE_INBOUND_SETUP.md` — phone number binding, including the 2026
  weighted-`inbound_agents` API change
- `docs/RETELL_CHAT_AGENT_GUIDE.md` — chat-agent-specific setup notes
- `docs/superpowers/specs/2026-09-14-stripe-billing-design.md` — the billing model this
  doc's "Billing note" section summarizes
