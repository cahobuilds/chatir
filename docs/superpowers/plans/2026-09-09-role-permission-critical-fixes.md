# Role/Permission Cleanup — Critical & High Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 5 Critical and 7 High severity gaps found in the 2026-09-09 audit of `docs/ROLE_PERMISSION_CLEANUP_PLAN.md` (§7) — a cross-tenant IDOR, a committed secret, unsafe seed scripts, a client-side ciphertext leak, and several places where authorization/business logic still depends on the legacy `role` text column or bypasses the platform-curated model/voice allowlists.

**Architecture:** No new subsystems. Every task is a targeted fix inside the existing Next.js App Router API routes / React components, using the already-established helpers (`hasPermission`, `hasPlatformPermission`, `canAccessTenant`, `getUserRoleInfo` from `src/lib/permissions-server.ts`; `encrypt`/`decrypt`/`isEncrypted` from `src/lib/encryption.ts`; `isModelAllowed` from `src/lib/models.ts`). Tasks 6 and 7 touch the same permission-resolution layer and must be done in order (7 depends on 6's fix to `getUserRoleInfo`).

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + PostgREST), Retell SDK.

## Global Constraints

- **No test framework exists in this repo** (`package.json` has only `dev`/`build`/`start`/`lint`/`type-check`; no jest/vitest, no `*.test.ts` files anywhere). Do not introduce one as part of this plan — that's a separate decision for the user. Every task's verification step is `npm run type-check` (must stay clean) + `npm run lint` (no new warnings in touched files) + a manual functional check (exact `curl`/browser steps given per task).
- **Do not assume Phase 1b has shipped.** The legacy `user_tenants.role` (text) column and `tenants.parent_id`/`is_reseller` still exist in the DB (Phase 1b drops them later). Every fix must keep working whether or not a given row has been backfilled to `role_id` yet — prefer the new column, fall back to the legacy one, never assume only one exists.
- **No reseller tier.** Per the plan's Locked Decision #1, don't reintroduce or preserve `parent_id`/`is_reseller`-driven logic in any file this plan touches, even if that means deleting a UI section outright (Task 4).
- **Retell/voice-provider key management is platform-only.** Per Locked Decision #2, no company-facing surface may read, show, or let a company user set `tenants.retell_api_key` (Task 4).
- **White-label:** company-facing text may not say "Retell" (Task 12). Platform-staff-only screens may.
- Every task below states its **Model + Tool + Justification** per the repo's model-selection-policy rule.

---

### Task 1: Fix cross-tenant agent overwrite (IDOR) in `POST /api/retell/agents`

**Model:** `claude-4.6-opus-high-thinking` · **Tool:** `generalPurpose` · **Justification:** tenant-isolation/security-critical path — per the model-selection-policy escalation rules, security paths touching tenant isolation start at Tier 1 minimum.

**Files:**
- Modify: `src/app/api/retell/agents/route.ts:76-244` (POST handler)

**Context:** The handler checks `canAccessTenant(user.id, tenant_id, 'agents.manage')` against the **client-supplied** `tenant_id`, then does `.from('agents').update({...}).eq('id', agent_id)` with no tenant filter and no check that `agent_id` actually belongs to `tenant_id`. A user with `agents.manage` on their own tenant can pass their own `tenant_id` (passes the check) but a `agent_id` belonging to a different tenant, silently overwriting that tenant's agent row with a Retell agent tied to their own workspace. `src/app/api/agents/link-retell/route.ts:29-40` has the correct pattern (derive tenant from the agent row itself) — use it as the reference.

- [ ] **Step 1: Add a tenant-ownership check for `agent_id` right after the existing tenant-access check**

In `src/app/api/retell/agents/route.ts`, immediately after:

```ts
    // Verify user can manage this tenant's agents (or is platform staff).
    if (!(await canAccessTenant(user.id, tenant_id, 'agents.manage'))) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }
```

add:

```ts
    // Verify the local agent row actually belongs to tenant_id before touching it or Retell.
    // Without this, a caller with agents.manage on their own tenant could pass their own
    // tenant_id (which passes the check above) together with an agent_id belonging to a
    // DIFFERENT tenant, and overwrite that tenant's agent row (cross-tenant IDOR).
    const { data: localAgent, error: localAgentError } = await supabase
      .from('agents')
      .select('id, tenant_id')
      .eq('id', agent_id)
      .maybeSingle();

    if (localAgentError || !localAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    if (localAgent.tenant_id !== tenant_id) {
      return NextResponse.json(
        { error: 'Forbidden: agent_id does not belong to tenant_id' },
        { status: 403 }
      );
    }
```

- [ ] **Step 2: Scope the final DB write by `tenant_id` too (defense in depth)**

Find:

```ts
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({
        retell_agent_id: retellAgent.agent_id,
        configuration: {
          ...retellConfig,
          retell_agent_id: retellAgent.agent_id,
        },
      })
      .eq('id', agent_id)
      .select()
      .single();
```

Replace with:

```ts
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({
        retell_agent_id: retellAgent.agent_id,
        configuration: {
          ...retellConfig,
          retell_agent_id: retellAgent.agent_id,
        },
      })
      .eq('id', agent_id)
      .eq('tenant_id', tenant_id)
      .select()
      .single();
```

- [ ] **Step 3: Verify with `type-check`**

Run: `npm run type-check`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

Start the dev server (`npm run dev`), then as a user with `agents.manage` on tenant A, call:

```bash
curl -X POST http://localhost:3000/api/retell/agents \
  -H "Content-Type: application/json" -H "Cookie: <your session cookie>" \
  -d '{"tenant_id":"<tenant-A-id>","agent_id":"<an agent_id that belongs to tenant B>","agent_name":"x","voice_id":"11labs-Adrian"}'
```

Expected: `403 {"error":"Forbidden: agent_id does not belong to tenant_id"}` instead of silently succeeding.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/retell/agents/route.ts
git commit -m "fix: prevent cross-tenant agent overwrite in POST /api/retell/agents"
```

---

### Task 2: Remove the committed live Retell API key fallback

**Model:** `claude-4.6-sonnet-medium-thinking` · **Tool:** `generalPurpose` · **Justification:** small, single-file change but needs judgment on failure-mode messaging; not pure mechanical boilerplate.

**Files:**
- Modify: `scripts/test-agent-creation-fix.ts:10-11`

- [ ] **Step 1: Remove the hardcoded fallback key and fail loudly instead**

Find:

```ts
const apiKey = process.env.RETELL_API_KEY || 'key_2111b0be36b992beec8fd18b689b';
```

Replace with:

```ts
const apiKey = process.env.RETELL_API_KEY;
if (!apiKey) {
  console.error('❌ RETELL_API_KEY is not set in your environment/.env.local.');
  console.error('   (A hardcoded fallback key was removed here on 2026-09-09 for security reasons.');
  console.error('   If that key was ever used, rotate it in the Retell dashboard.)');
  process.exit(1);
}
```

- [ ] **Step 2: Verify with `type-check`**

Run: `npm run type-check`
Expected: no new errors (the removed fallback means `apiKey` is now `string`, not `string | undefined`, at the point it's passed to `new Retell({...})` below — confirm no other line in this file still expects `string | undefined`).

- [ ] **Step 3: Manual verification**

Run: `RETELL_API_KEY= npx tsx scripts/test-agent-creation-fix.ts` (empty var)
Expected: prints the new error and exits with code 1, instead of silently using the old committed key.

- [ ] **Step 4: Commit**

```bash
git add scripts/test-agent-creation-fix.ts
git commit -m "fix: remove hardcoded fallback Retell API key from test script"
```

**Manual follow-up (not code — needs your Retell dashboard access):** rotate/revoke the key `key_2111b0be36b992beec8fd18b689b` in the Retell dashboard, since it was committed to git history and must be treated as compromised regardless of this code fix.

---

### Task 3: Guard system-admin seed scripts against accidental production use

**Model:** `claude-4.6-sonnet-medium-thinking` · **Tool:** `generalPurpose` · **Justification:** judgment call on the right guard condition and messaging; touches multiple files with the same pattern, but each needs to fit that file's existing structure.

**Files:**
- Modify: `scripts/create-system-admin.ts:12-22`
- Modify: `scripts/grant-system-admin-access.ts` (apply the identical guard right after its Supabase URL/key env check — locate it the same way as below)
- Modify: `docs/LOCAL_CREDENTIALS.md`, `docs/CREATE_SYSTEM_ADMIN.md`, `docs/SYSTEM_ADMIN_USER_CREATION.md` (add a banner)

**Context:** `systemadmin@tin.info` / `88888888` is a *documented local-dev seed credential* (see `docs/LOCAL_CREDENTIALS.md`), not a leaked production secret — but nothing stops `scripts/create-system-admin.ts` or `scripts/grant-system-admin-access.ts` from being run against a real hosted Supabase project by accident (e.g. a `.env.local` that was copied from staging), which would create/grant a real platform-admin-equivalent account with a public, well-known password. Fix: refuse to run unless the target looks like a local Supabase instance, with an explicit opt-out for anyone who really means to seed a remote project.

- [ ] **Step 1: Add the production guard to `scripts/create-system-admin.ts`**

Find:

```ts
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure .env.local exists with:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
```

Replace with:

```ts
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure .env.local exists with:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// This script creates a privileged system_admin account using a password documented in
// docs/LOCAL_CREDENTIALS.md. It must never run against a hosted/production project by accident.
const isLocalSupabase = supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost');
if (!isLocalSupabase && process.env.ALLOW_REMOTE_SYSTEM_ADMIN_SEED !== 'true') {
  console.error('❌ Refusing to run: NEXT_PUBLIC_SUPABASE_URL does not look like a local Supabase instance.');
  console.error(`   URL: ${supabaseUrl}`);
  console.error('   This script creates a system_admin account with a publicly documented default password.');
  console.error('   If you really need to seed a remote/staging project, set ALLOW_REMOTE_SYSTEM_ADMIN_SEED=true');
  console.error('   and change the password immediately after creation.');
  process.exit(1);
}
```

- [ ] **Step 2: Apply the identical guard to `scripts/grant-system-admin-access.ts`**

Read the file, find its equivalent `supabaseUrl`/`supabaseServiceKey` env-check block (same shape as Step 1), and insert the same `isLocalSupabase` guard immediately after it, verbatim except adapting the variable names to whatever this file already uses for the Supabase URL.

- [ ] **Step 3: Add a "LOCAL DEV ONLY" banner to the docs**

At the top of `docs/LOCAL_CREDENTIALS.md`, `docs/CREATE_SYSTEM_ADMIN.md`, and `docs/SYSTEM_ADMIN_USER_CREATION.md` (right after the H1 title), add:

```markdown
> ⚠️ **Local development only.** The credentials and scripts below create an account with a
> publicly documented password. They now refuse to run against anything that isn't a local
> Supabase instance (`127.0.0.1`/`localhost`) unless `ALLOW_REMOTE_SYSTEM_ADMIN_SEED=true` is
> explicitly set — see `scripts/create-system-admin.ts`. Never run them against a shared,
> staging, or production project without immediately changing the password afterward.
```

- [ ] **Step 4: Verify with `type-check`**

Run: `npm run type-check`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

Run: `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co SUPABASE_SERVICE_ROLE_KEY=x npx tsx scripts/create-system-admin.ts`
Expected: prints "Refusing to run" and exits 1, instead of proceeding to create the account.

Run: `npx tsx scripts/create-system-admin.ts` against your local `.env.local` (which points at `127.0.0.1`)
Expected: proceeds as before (no behavior change for the actual local-dev use case).

- [ ] **Step 6: Commit**

```bash
git add scripts/create-system-admin.ts scripts/grant-system-admin-access.ts docs/LOCAL_CREDENTIALS.md docs/CREATE_SYSTEM_ADMIN.md docs/SYSTEM_ADMIN_USER_CREATION.md
git commit -m "fix: refuse to seed the system_admin account against non-local Supabase projects"
```

---

### Task 4: Stop shipping the encrypted Retell key to the browser; remove the dead reseller-gated UI

**Model:** `claude-4.6-opus-high-thinking` · **Tool:** `generalPurpose` · **Justification:** security/compliance boundary fix (client exposure of an encrypted secret column) combined with an architectural decision (removing reseller-era UI per the plan's Locked Decision #1) — Tier 1 per the escalation rules.

**Files:**
- Modify: `src/components/TenantConfiguration.tsx`

**Context:** `fetchTenantData()` queries Supabase directly from client-side JS (`select('tenant_id, role, tenants(*)')`), bypassing the API layer's `sanitizeTenant()` and shipping the encrypted `retell_api_key` ciphertext to the browser. It also gates a whole "AI Provider Integration" section (retell key input + sync button) on `tenantData.is_reseller`, which contradicts the plan's "no reseller tier, Retell key is platform-only" decision — this section should not exist here at all (the platform-only `RetellIntegrationManagement.tsx` already does this correctly). Its admin check also uses a hardcoded legacy role array (`'system_admin', 'organization_admin', 'tenant_admin', 'super_admin'`) instead of the new permission model.

- [ ] **Step 1: Replace the imports**

Find:

```tsx
import { 
  CogIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  PhotoIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
```

Replace with:

```tsx
import { 
  CogIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  PhotoIcon,
  XMarkIcon,
  CheckIcon,
  ClipboardDocumentIcon
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
```

(`ArrowPathIcon`, `KeyIcon`, `EyeIcon`, `EyeSlashIcon` were only used by the removed Retell-key section.)

- [ ] **Step 2: Remove the now-unused state**

Find:

```tsx
  const [retellApiKey, setRetellApiKey] = useState("");
  const [showRetellApiKey, setShowRetellApiKey] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isResellerTenant, setIsResellerTenant] = useState(false);
  const [copiedTenantId, setCopiedTenantId] = useState(false);
```

Replace with:

```tsx
  const [copiedTenantId, setCopiedTenantId] = useState(false);
```

- [ ] **Step 3: Replace `fetchTenantData` to go through the sanitized API instead of a direct client-side query**

Find the entire function (from `const fetchTenantData = async () => {` through its closing `};`, i.e. everything currently between the `retellApiKey`/`isResellerTenant` block and `handleLogoUpload`):

```tsx
  const fetchTenantData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      // Get user's tenants
      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id, role, tenants(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!userTenants || !userTenants.tenants) {
        setError("No organization found. Please ensure you are associated with an organization.");
        setLoading(false);
        setIsAdmin(false);
        return;
      }

      const userTenant = userTenants as any;
      const tenantData = userTenant.tenants as Tenant;
      
      // Check if user is admin (including system_admin, organization_admin, super_admin)
      const admin = ['system_admin', 'organization_admin', 'tenant_admin', 'super_admin'].includes(userTenant.role);
      setIsAdmin(admin);

      if (!admin) {
        setError(`Admin access required. Your current role is: ${userTenant.role}. You need 'organization_admin' or 'super_admin' role to modify organization settings.`);
        setLoading(false);
        return;
      }

      // Check if this tenant is a reseller (only resellers can see/configure Retell settings)
      const tenantIsReseller = (tenantData as any).is_reseller === true;
      setIsResellerTenant(tenantIsReseller);

      setTenant(tenantData);
      setTenantName(tenantData.name);
      setLogoPreview((tenantData.branding as any)?.logo_url || null);
      setWordmarkPreview((tenantData.branding as any)?.wordmark_url || null);
      
      // Only show Retell API key if this tenant is a reseller
      // Organizations should NOT see Retell settings
      if (tenantIsReseller) {
        setRetellApiKey((tenantData as any).retell_api_key || "");
      } else {
        setRetellApiKey(""); // Hide from organizations
      }
      
      // Initialize config state
      setConfig({
        branding: {
          logo: (tenantData.branding as any)?.logo_url || "",
          primaryColor: (tenantData.branding as any)?.primaryColor || "#4F46E5",
          secondaryColor: (tenantData.branding as any)?.secondaryColor || "#06B6D4",
          favicon: (tenantData.branding as any)?.favicon || "",
          customDomain: (tenantData.branding as any)?.customDomain || "",
          customCSS: (tenantData.branding as any)?.customCSS || ""
        },
        features: tenantData.settings?.features || {
          voiceAgents: true,
          chatAgents: true,
          callRecording: true,
          analytics: true,
          integrations: true,
          customWorkflows: false,
          whiteLabel: false
        },
        limits: tenantData.settings?.limits || {
          maxAgents: 50,
          maxConcurrentCalls: 100,
          maxWorkspaces: 10,
          storageLimit: "100GB",
          apiRateLimit: 1000
        },
        security: tenantData.settings?.security || {
          twoFactorAuth: false,
          ssoEnabled: false,
          ipWhitelist: []
        }
      });
      
      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching tenant:", err);
      setError(err.message);
      setLoading(false);
    }
  };
```

Replace with:

```tsx
  const fetchTenantData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      // Resolve only the current tenant_id from the membership row -- no tenant columns are
      // read directly from the client (that goes through the sanitized API below instead).
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (!userTenant?.tenant_id) {
        setError("No organization found. Please ensure you are associated with an organization.");
        setLoading(false);
        setIsAdmin(false);
        return;
      }

      // Fetch the sanitized tenant (never includes retell_api_key -- see sanitizeTenant() in
      // src/app/api/tenants/[id]/route.ts) and this user's role through the API layer, instead
      // of querying `tenants` directly from client-side JS.
      const [tenantRes, permsRes] = await Promise.all([
        fetch(`/api/tenants/${userTenant.tenant_id}`),
        fetch(`/api/permissions/check?tenant_id=${userTenant.tenant_id}`),
      ]);

      if (!tenantRes.ok) {
        const errData = await tenantRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load organization");
      }
      const { tenant: tenantData } = (await tenantRes.json()) as { tenant: Tenant };

      const permsData = permsRes.ok ? await permsRes.json() : { role_info: null };
      const roleName: string | undefined = permsData.role_info?.role;
      const roleScope: string | undefined = permsData.role_info?.scope;
      const admin = roleName === 'company_admin' || roleScope === 'platform';
      setIsAdmin(admin);

      if (!admin) {
        setError(`Admin access required. Your current role is: ${roleName || 'unknown'}. You need the Company Admin role to modify organization settings.`);
        setLoading(false);
        return;
      }

      // Retell/voice-provider key management is platform-only (see
      // docs/ROLE_PERMISSION_CLEANUP_PLAN.md, Locked Decision #2) -- it is never fetched,
      // shown, or editable from this company-facing settings screen. Platform staff manage it
      // via RetellIntegrationManagement instead.

      setTenant(tenantData);
      setTenantName(tenantData.name);
      setLogoPreview((tenantData.branding as any)?.logo_url || null);
      setWordmarkPreview((tenantData.branding as any)?.wordmark_url || null);

      // Initialize config state
      setConfig({
        branding: {
          logo: (tenantData.branding as any)?.logo_url || "",
          primaryColor: (tenantData.branding as any)?.primaryColor || "#4F46E5",
          secondaryColor: (tenantData.branding as any)?.secondaryColor || "#06B6D4",
          favicon: (tenantData.branding as any)?.favicon || "",
          customDomain: (tenantData.branding as any)?.customDomain || "",
          customCSS: (tenantData.branding as any)?.customCSS || ""
        },
        features: tenantData.settings?.features || {
          voiceAgents: true,
          chatAgents: true,
          callRecording: true,
          analytics: true,
          integrations: true,
          customWorkflows: false,
          whiteLabel: false
        },
        limits: tenantData.settings?.limits || {
          maxAgents: 50,
          maxConcurrentCalls: 100,
          maxWorkspaces: 10,
          storageLimit: "100GB",
          apiRateLimit: 1000
        },
        security: tenantData.settings?.security || {
          twoFactorAuth: false,
          ssoEnabled: false,
          ipWhitelist: []
        }
      });

      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching tenant:", err);
      setError(err.message);
      setLoading(false);
    }
  };
```

- [ ] **Step 4: Remove `handleSaveApiKey` and `handleSyncAgents`**

Delete both functions in full (from `const handleSaveApiKey = async () => {` through the end of `handleSyncAgents`'s closing `};`, i.e. everything between `handleSaveName` and the `currentConfig` comment).

- [ ] **Step 5: Remove the "AI Provider Integration" JSX block**

Delete the entire block:

```tsx
        {/* AI Provider Integration - Only visible to resellers */}
        {isResellerTenant && (
          <div>
            ...
          </div>
        )}
```

(everything from that comment through its matching closing `)}`), leaving the "Branding Settings" section immediately followed by the "Feature Toggles" section.

- [ ] **Step 6: Update the stale role-name text in the non-admin fallback view**

Find:

```tsx
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You need 'organization_admin' or 'super_admin' role to modify organization settings.
          </p>
```

Replace with:

```tsx
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You need the Company Admin role to modify organization settings.
          </p>
```

- [ ] **Step 7: Verify with `type-check` and `lint`**

Run: `npm run type-check && npm run lint`
Expected: no new errors; confirm no remaining references to `retellApiKey`, `isResellerTenant`, `syncing`, `showRetellApiKey` in this file (`grep -n "retellApiKey\|isResellerTenant\|showRetellApiKey" src/components/TenantConfiguration.tsx` should return nothing).

- [ ] **Step 8: Manual verification**

Load the page that renders `<TenantConfiguration />` as a `company_admin` user. Expected: organization name/branding sections work as before; no "AI Provider Integration" section is visible; open browser devtools → Network tab → confirm the response body for `GET /api/tenants/<id>` contains no `retell_api_key` field (sanitized already, but worth re-confirming end to end).

- [ ] **Step 9: Commit**

```bash
git add src/components/TenantConfiguration.tsx
git commit -m "fix: stop leaking encrypted retell_api_key to the browser; remove dead reseller-gated UI"
```

---

### Task 5: Fix the legacy-role access-control regression in `GET /api/agents`

**Model:** `claude-4.6-opus-high-thinking` · **Tool:** `generalPurpose` · **Justification:** authorization-decision bug (who is treated as admin for result filtering) — Tier 1 per the "escalate for auth" rule.

**Files:**
- Modify: `src/app/api/agents/route.ts:60-80`

**Context:** `isAdmin` is computed from a hardcoded legacy-role-name array (`'tenant_admin', 'super_admin', 'organization_admin', 'manager'`) that doesn't match any of the 6 canonical roles seeded by the Phase 1 migration (`company_admin`, `company_editor`, ...). Once a user's `user_tenants` row is backfilled to `role_id`/`roles.name = 'company_admin'`, this check silently stops recognizing them as admin, changing which agents they see.

- [ ] **Step 1: Select the canonical role name alongside the legacy one, and widen the admin check**

Find:

```ts
    // For regular users, get their tenant IDs and check roles
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      console.log(`[Agents API] User ${user.id} has no active tenant access`);
      return NextResponse.json({ agents: [] });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);
    const userRoles = userTenants.map(ut => ut.role);
    
    console.log(`[Agents API] User ${user.id} has access to tenants:`, tenantIds, 'with roles:', userRoles);
    
    // Check if user is admin (tenant_admin, super_admin, organization_admin, manager)
    const isAdmin = userRoles.some(role => 
      ['tenant_admin', 'super_admin', 'organization_admin', 'manager'].includes(role)
    );
```

Replace with:

```ts
    // For regular users, get their tenant IDs and check roles.
    // Select both the canonical role name (via role_id -> roles.name) and the legacy `role`
    // text column, since not every row is guaranteed to be backfilled yet (Phase 1b pending).
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id, role, role_id, roles(name)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      console.log(`[Agents API] User ${user.id} has no active tenant access`);
      return NextResponse.json({ agents: [] });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);
    const userRoles = userTenants.map((ut: any) => {
      const nested = Array.isArray(ut.roles) ? ut.roles[0] : ut.roles;
      return nested?.name ?? ut.role;
    });

    console.log(`[Agents API] User ${user.id} has access to tenants:`, tenantIds, 'with roles:', userRoles);

    // Admin = holds a role with agents.manage in the canonical model (company_admin/editor) or a
    // platform role, OR (transition period only) an un-backfilled legacy admin-equivalent role.
    const ADMIN_ROLE_NAMES = [
      'company_admin', 'company_editor',
      'platform_admin', 'platform_operator',
      // Legacy text values -- only matter for rows not yet backfilled to role_id:
      'tenant_admin', 'super_admin', 'organization_admin', 'manager',
    ];
    const isAdmin = userRoles.some(role => role && ADMIN_ROLE_NAMES.includes(role));
```

- [ ] **Step 2: Verify with `type-check`**

Run: `npm run type-check`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

As a `company_admin` user (role backfilled to `role_id`), call `GET /api/agents`. Expected: response includes all agents for their tenant(s) (not filtered down to `user_agents` assignments), matching pre-migration behavior.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/agents/route.ts
git commit -m "fix: recognize canonical company_admin/company_editor roles in GET /api/agents"
```

---

### Task 6: Fix the `platform_admin` tenant-scoping bypass in `permissions-server.ts`

**Model:** `claude-4.6-opus-high-thinking` · **Tool:** `generalPurpose` · **Justification:** core auth primitive used across the whole codebase — Tier 1, must be correct.

**Files:**
- Modify: `src/lib/permissions-server.ts`

**Interfaces:**
- Produces: `isPlatformAdmin(userId: string): Promise<boolean>` — new tenant-agnostic helper, exported for reuse; `hasPermission`, `getUserPermissions`, `getUserRoleInfo` now short-circuit true/full-access for a `platform_admin`, matching the tenant-agnostic behavior already used by `hasPlatformPermission` and the SQL `is_platform_admin()` RLS helper.

**Context:** `hasPermission()`, `getUserPermissions()`, and `getUserRoleInfo()` all call `resolveTenantRole(userId, tenantId)`, which filters `user_tenants` by the *specific* `tenantId`. A `platform_admin` who doesn't happen to hold a membership row in that exact tenant gets denied/empty results from these three functions, even though `hasPlatformPermission()` (used by `canAccessTenant`) correctly treats them as tenant-agnostic. `GET/POST /api/permissions/check` calls `hasPermission`/`getUserPermissions`/`getUserRoleInfo` directly — this is where the bug is user-visible.

- [ ] **Step 1: Add the `isPlatformAdmin` helper**

Add this function right after `rolePermissionNames` (before `hasPermission`):

```ts
// True if `userId` holds the platform_admin role anywhere (tenant-agnostic superuser check).
// Mirrors the SQL is_platform_admin() RLS helper (see the Phase 1 migration) so the app layer
// and the DB layer agree on what "platform_admin" means.
async function isPlatformAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_tenants')
    .select('roles(name)')
    .eq('user_id', userId)
    .eq('status', 'active');
  return (data || []).some((row: any) => nestedRoleName(row.roles) === 'platform_admin');
}
```

- [ ] **Step 2: Fix `hasPermission` to check it first**

Find:

```ts
export async function hasPermission(
  userId: string,
  tenantId: string,
  permissionId: string
): Promise<boolean> {
  const role = await resolveTenantRole(userId, tenantId);
  if (!role) return false;
  if (role.role_name === 'platform_admin') return true;
  if (role.role_id) {
    return (await rolePermissionNames(role.role_id)).includes(permissionId);
  }
  return false;
}
```

Replace with:

```ts
export async function hasPermission(
  userId: string,
  tenantId: string,
  permissionId: string
): Promise<boolean> {
  // Tenant-agnostic superuser bypass -- must be checked BEFORE resolving a tenant-scoped role,
  // since a platform_admin is not guaranteed to hold a user_tenants row for every tenant.
  if (await isPlatformAdmin(userId)) return true;

  const role = await resolveTenantRole(userId, tenantId);
  if (!role) return false;
  if (role.role_id) {
    return (await rolePermissionNames(role.role_id)).includes(permissionId);
  }
  return false;
}
```

- [ ] **Step 3: Fix `getUserRoleInfo` to return a synthetic platform_admin result when there's no tenant-scoped row**

Find:

```ts
export async function getUserRoleInfo(
  userId: string,
  tenantId: string
): Promise<RolePermissions | null> {
  const role = await resolveTenantRole(userId, tenantId);
  if (!role) return null;
```

Replace with:

```ts
export async function getUserRoleInfo(
  userId: string,
  tenantId: string
): Promise<RolePermissions | null> {
  const role = await resolveTenantRole(userId, tenantId);
  if (!role) {
    // No membership row for this specific tenant -- still recognize a tenant-agnostic
    // platform_admin instead of returning null (see isPlatformAdmin's doc comment).
    if (await isPlatformAdmin(userId)) {
      return {
        role: 'platform_admin',
        scope: 'platform',
        displayName: 'Platform Admin',
        description: 'Full platform access: organizations, plans, payments, Retell key, platform staff.',
        permissions: [],
      };
    }
    return null;
  }
```

- [ ] **Step 4: Fix `getUserPermissions` the same way**

Find:

```ts
export async function getUserPermissions(
  userId: string,
  tenantId: string
): Promise<Permission[]> {
  const role = await resolveTenantRole(userId, tenantId);
  if (!role) return [];
```

Replace with:

```ts
export async function getUserPermissions(
  userId: string,
  tenantId: string
): Promise<Permission[]> {
  const role = await resolveTenantRole(userId, tenantId);
  if (!role) {
    // Tenant-agnostic platform_admin: return every permission rather than an empty list.
    if (await isPlatformAdmin(userId)) {
      const supabase = await createClient();
      const { data } = await supabase.from('permissions').select('id, name, description, category');
      return (data || []) as Permission[];
    }
    return [];
  }
```

- [ ] **Step 5: Verify with `type-check`**

Run: `npm run type-check`
Expected: no new errors.

- [ ] **Step 6: Manual verification**

As a `platform_admin` user who is confirmed to have **no** `user_tenants` row for some tenant X (check with `select * from user_tenants where user_id = '<id>' and tenant_id = 'X'` — should return 0 rows), call:

```bash
curl "http://localhost:3000/api/permissions/check?tenant_id=X" -H "Cookie: <session cookie>"
```

Expected before fix: `403 {"error":"Forbidden"}` (because the route's own membership pre-check would also need attention -- see note below). Expected after this task: `getUserPermissions`/`getUserRoleInfo` no longer return empty/null for this user when called directly; if the route's separate membership-row pre-check still blocks this specific endpoint, that's expected (Task 6 fixes the library functions; the route's own gate is a separate, narrower concern not in scope here since it correctly requires *some* form of tenant relationship before disclosing permission data).

- [ ] **Step 7: Commit**

```bash
git add src/lib/permissions-server.ts
git commit -m "fix: make platform_admin bypass tenant-agnostic in hasPermission/getUserPermissions/getUserRoleInfo"
```

---

### Task 7: Fix new-signup `role: null` in `lib/tenant.ts` and `lib/organization-context.ts`

**Model:** `claude-4.6-opus-high-thinking` · **Tool:** `generalPurpose` · **Justification:** authorization-relevant data used across many call sites — Tier 1.

**Files:**
- Modify: `src/lib/tenant.ts`
- Modify: `src/lib/organization-context.ts`

**Interfaces:**
- Consumes: `getUserRoleInfo(userId, tenantId): Promise<RolePermissions | null>` from Task 6 (`src/lib/permissions-server.ts`) — returns `{ role: string, scope, displayName, description, permissions }`.

**Context:** Both files return `role: userTenant.role` straight from the legacy `role` text column. A user created via the new `/api/auth/signup` route (which assigns `role_id` for `company_admin` but never writes the legacy `role` text) gets `role: null` back from every function here. Fix: prefer the canonical role name (via `getUserRoleInfo`), fall back to the legacy text column only if that returns nothing.

- [ ] **Step 1: Update `getCurrentTenant()` in `src/lib/tenant.ts`**

Find:

```ts
import { createClient } from '@/lib/supabase/server';
import { hasPlatformPermission } from '@/lib/permissions-server';
import { cookies } from 'next/headers';
```

Replace with:

```ts
import { createClient } from '@/lib/supabase/server';
import { hasPlatformPermission, getUserRoleInfo } from '@/lib/permissions-server';
import { cookies } from 'next/headers';
```

Find (first branch, inside `if (currentOrgId) { ... }`):

```ts
    if (userTenant) {
      return {
        id: userTenant.tenant_id,
        role: userTenant.role,
        ...userTenant.tenants,
      };
    }
```

Replace with:

```ts
    if (userTenant) {
      // Prefer the canonical role name; fall back to the legacy text column for rows not yet
      // backfilled to role_id (a fresh /api/auth/signup user has role_id but no legacy `role`
      // text, so without this fallback-preferring-new-first order they'd get role: null here).
      const roleInfo = await getUserRoleInfo(user.id, userTenant.tenant_id);
      return {
        id: userTenant.tenant_id,
        role: roleInfo?.role ?? userTenant.role,
        ...userTenant.tenants,
      };
    }
```

Find (the "Fallback: primary tenant" branch near the end of the function):

```ts
  return {
    id: userTenant.tenant_id,
    role: userTenant.role,
    ...userTenant.tenants,
  };
}
```

Replace with:

```ts
  const primaryRoleInfo = await getUserRoleInfo(user.id, userTenant.tenant_id);
  return {
    id: userTenant.tenant_id,
    role: primaryRoleInfo?.role ?? userTenant.role,
    ...userTenant.tenants,
  };
}
```

- [ ] **Step 2: Update `getUserTenants()` in `src/lib/tenant.ts`**

Find the final `return` in the "Regular user - only their organizations" branch:

```ts
  // Regular user - only their organizations
  const { data: userTenants } = await supabase
    .from('user_tenants')
    .select(`
      tenant_id,
      role,
      status,
      tenants (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  return userTenants || [];
}
```

Replace with:

```ts
  // Regular user - only their organizations
  const { data: userTenants } = await supabase
    .from('user_tenants')
    .select(`
      tenant_id,
      role,
      status,
      tenants (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  // Prefer the canonical role name per tenant; fall back to the legacy text column.
  // (N+1 is acceptable here -- users belong to a small number of tenants.)
  const resolved = await Promise.all(
    (userTenants || []).map(async (ut: any) => {
      const roleInfo = await getUserRoleInfo(user.id, ut.tenant_id);
      return { ...ut, role: roleInfo?.role ?? ut.role };
    })
  );

  return resolved;
}
```

- [ ] **Step 3: Update `getCurrentOrganizationContext()` and `verifyOrganizationAccess()` in `src/lib/organization-context.ts`**

Find:

```ts
import { createClient } from '@/lib/supabase/server';
import { hasPlatformPermission } from '@/lib/permissions-server';
import { cookies } from 'next/headers';
```

Replace with:

```ts
import { createClient } from '@/lib/supabase/server';
import { hasPlatformPermission, getUserRoleInfo } from '@/lib/permissions-server';
import { cookies } from 'next/headers';
```

Find:

```ts
  if (userTenant) {
    return {
      id: userTenant.tenant_id,
      role: userTenant.role,
      ...userTenant.tenants,
    };
  }
```

Replace with:

```ts
  if (userTenant) {
    const roleInfo = await getUserRoleInfo(user.id, userTenant.tenant_id);
    return {
      id: userTenant.tenant_id,
      role: roleInfo?.role ?? userTenant.role,
      ...userTenant.tenants,
    };
  }
```

Find:

```ts
  if (userTenant) {
    return { role: userTenant.role };
  }
```

Replace with:

```ts
  if (userTenant) {
    const roleInfo = await getUserRoleInfo(user.id, organizationId);
    return { role: roleInfo?.role ?? userTenant.role };
  }
```

- [ ] **Step 4: Verify with `type-check`**

Run: `npm run type-check`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

Sign up a brand-new account through `POST /api/auth/signup`, log in as that user, then call whatever page/route uses `getCurrentTenant()` (e.g. the dashboard). Expected: the returned `role` is `"company_admin"`, not `null`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tenant.ts src/lib/organization-context.ts
git commit -m "fix: resolve role via the canonical role model so new signups aren't role: null"
```

---

### Task 8: Enforce the LLM allowlist on agent-update paths, not just agent-create

**Model:** `claude-4.6-sonnet-medium-thinking` · **Tool:** `generalPurpose` · **Justification:** business-logic enforcement using an existing helper — Tier 2, needs judgment on error messaging but no architectural decisions.

**Files:**
- Modify: `src/app/api/agents/[id]/llm-config/route.ts:113-116` (PATCH)
- Modify: `src/app/api/agents/[id]/route.ts:113-116` (PATCH)

**Context:** `isModelAllowed()` from `src/lib/models.ts` is enforced when creating a new Retell LLM (`retell/llms/route.ts`) but not when a company updates an already-linked agent's model — a company can bypass the platform's curated allowlist entirely by using the update path instead of create.

- [ ] **Step 1: Enforce the allowlist in `src/app/api/agents/[id]/llm-config/route.ts`**

Find (in the `PATCH` handler, right after parsing `body`):

```ts
    const body = await request.json();
    const { model, model_temperature, tool_call_strict_mode, general_prompt, default_dynamic_variables } = body;
```

Replace with:

```ts
    const body = await request.json();
    const { model, model_temperature, tool_call_strict_mode, general_prompt, default_dynamic_variables } = body;

    if (model !== undefined && !isModelAllowed(model)) {
      return NextResponse.json(
        { error: `Model "${model}" is not in the platform's approved model list.` },
        { status: 400 }
      );
    }
```

Add the import at the top of the file:

```ts
import { isModelAllowed } from '@/lib/models';
```

- [ ] **Step 2: Enforce the allowlist in `src/app/api/agents/[id]/route.ts`**

Find (in the `PATCH` handler, right after parsing `body`):

```ts
    const body = await request.json();
    const { name, type, description, configuration, retell_agent_id, retell_phone_number_id, is_active } = body;
```

Replace with:

```ts
    const body = await request.json();
    const { name, type, description, configuration, retell_agent_id, retell_phone_number_id, is_active } = body;

    // `configuration.llm_config.model` / `configuration.llm.model` is the field this route later
    // syncs to Retell's LLM below -- gate it against the platform allowlist here too.
    const configuredModel = configuration?.llm_config?.model ?? configuration?.llm?.model;
    if (configuredModel !== undefined && !isModelAllowed(configuredModel)) {
      return NextResponse.json(
        { error: `Model "${configuredModel}" is not in the platform's approved model list.` },
        { status: 400 }
      );
    }
```

Add the import at the top of the file:

```ts
import { isModelAllowed } from '@/lib/models';
```

- [ ] **Step 3: Verify with `type-check`**

Run: `npm run type-check`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

Set `ALLOWED_LLM_MODELS=gpt-4.1` in `.env.local`, restart the dev server, then:

```bash
curl -X PATCH http://localhost:3000/api/agents/<id>/llm-config \
  -H "Content-Type: application/json" -H "Cookie: <session cookie>" \
  -d '{"model":"not-an-allowed-model"}'
```

Expected: `400 {"error":"Model \"not-an-allowed-model\" is not in the platform's approved model list."}`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/agents/[id]/llm-config/route.ts src/app/api/agents/[id]/route.ts
git commit -m "fix: enforce the platform LLM allowlist on agent-update paths too"
```

---

### Task 9: Decrypt the Retell API key in the billing-sync route

**Model:** `composer-2-fast` · **Tool:** `generalPurpose` · **Justification:** mechanical — copy the exact `isEncrypted`/`decrypt` pattern already used correctly in 4 sibling files (`tenants/[id]/route.ts`, `widget/chat/message/route.ts`, `webhooks/retell/route.ts`, `lib/reseller.ts`).

**Files:**
- Modify: `src/app/api/tenants/[id]/retell/billing/route.ts`

- [ ] **Step 1: Import the encryption helpers**

Find:

```ts
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessTenant, hasPlatformPermission } from '@/lib/permissions-server';
```

Replace with:

```ts
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { formatRetellError, logRetellError } from '@/lib/retell-errors';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessTenant, hasPlatformPermission } from '@/lib/permissions-server';
import { decrypt, isEncrypted } from '@/lib/encryption';
```

- [ ] **Step 2: Decrypt before use**

Find:

```ts
    if (!tenant?.retell_api_key) {
      return NextResponse.json(
        { error: 'Retell API key not configured' },
        { status: 400 }
      );
    }

    if (tenant.retell_connection_status !== 'connected') {
```

Replace with:

```ts
    if (!tenant?.retell_api_key) {
      return NextResponse.json(
        { error: 'Retell API key not configured' },
        { status: 400 }
      );
    }
    const retellApiKey = isEncrypted(tenant.retell_api_key) ? decrypt(tenant.retell_api_key) : tenant.retell_api_key;

    if (tenant.retell_connection_status !== 'connected') {
```

Find:

```ts
      const retellClient = createRetellClient(tenant.retell_api_key, {
        timeout: 45 * 1000, // 45 seconds for billing operations
        maxRetries: 3, // More retries for critical billing sync
      });
```

Replace with:

```ts
      const retellClient = createRetellClient(retellApiKey, {
        timeout: 45 * 1000, // 45 seconds for billing operations
        maxRetries: 3, // More retries for critical billing sync
      });
```

- [ ] **Step 3: Verify with `type-check`**

Run: `npm run type-check`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

For a tenant whose `retell_api_key` is stored encrypted (i.e. it was set via `PATCH /api/tenants/[id]` or `POST /api/tenants/[id]/retell/connect` after Task 4/encryption was already in place), call `GET /api/tenants/<id>/retell/billing` as a platform user with `payments.view`. Expected: no longer fails with a Retell auth error caused by sending ciphertext as the API key.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tenants/[id]/retell/billing/route.ts
git commit -m "fix: decrypt the Retell API key before use in the billing-sync route"
```

---

### Task 10: Remove hardcoded voice lists; fetch from `/api/retell/voices` everywhere

**Model:** `composer-2-fast` · **Tool:** `generalPurpose` · **Justification:** mechanical propagation — `src/components/CreateIRAgentModal.tsx:60-83` already has the correct, working pattern; apply the same shape to the 3 remaining files.

**Files:**
- Modify: `src/components/VoiceAgentList.tsx:340-347` and its `<Select options={voiceOptions} .../>` usage around line 688
- Modify: `src/components/AgentConfiguration.tsx` (entire hardcoded voice list + selection)
- Modify: `src/components/AgentEditModal.tsx:326`

**Reference pattern** (already correct, in `src/components/CreateIRAgentModal.tsx:60-83`):

```tsx
const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
// ...
const voicesResponse = await fetch(`/api/retell/voices?tenant_id=${currentOrganization.id}`);
if (voicesResponse.ok) {
  const data = await voicesResponse.json();
  const options = (data.voices || []).map((voice: any) => ({
    value: voice.voice_id,
    label: `${voice.voice_name || voice.voice_id} (${voice.provider || 'unknown'})`,
  }));
  setVoiceOptions(options);
}
```

- [ ] **Step 1: Fix `VoiceAgentList.tsx`**

This file already imports `useOrganization` and has `const { currentOrganization } = useOrganization();` (confirmed at line 44) and an existing `useEffect` keyed on `currentOrganization?.id` (line 69-72) that fetches agents. Find:

```ts
  const voiceOptions = [
    { value: "alloy", label: "Alloy" },
    { value: "echo", label: "Echo" },
    { value: "fable", label: "Fable" },
    { value: "onyx", label: "Onyx" },
    { value: "nova", label: "Nova" },
    { value: "shimmer", label: "Shimmer" },
  ];
```

Replace with:

```ts
  const [voiceOptions, setVoiceOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    fetch(`/api/retell/voices?tenant_id=${currentOrganization.id}`)
      .then((res) => (res.ok ? res.json() : { voices: [] }))
      .then((data) => {
        const options = (data.voices || []).map((voice: any) => ({
          value: voice.voice_id,
          label: voice.voice_name || voice.voice_id,
        }));
        setVoiceOptions(options);
      })
      .catch((err) => console.warn("Failed to load voices:", err));
  }, [currentOrganization?.id]);
```

(Confirm `useState`/`useEffect` are already imported from `"react"` in this file's import block; add them if not.)

- [ ] **Step 2: Fix `AgentConfiguration.tsx`**

This is a small, mostly-static demo-style component (no props, no API calls at all — `agentName`, `selectedVoice`, etc. are local-only `useState` with no save wiring beyond a no-op button). Bring it in line with the rest of the app by fetching voices the same way. Find:

```tsx
"use client";

import React, { useState } from "react";

export default function AgentConfiguration() {
  const [agentName, setAgentName] = useState("AI Agent Alpha");
  const [selectedVoice, setSelectedVoice] = useState("sarah-neural");
```

Replace with:

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/context/OrganizationContext";

export default function AgentConfiguration() {
  const { currentOrganization } = useOrganization();
  const [agentName, setAgentName] = useState("AI Agent Alpha");
  const [selectedVoice, setSelectedVoice] = useState("");
```

Find:

```tsx
  const voiceOptions = [
    { value: "sarah-neural", label: "Sarah (Neural)", gender: "Female" },
    { value: "marcus-neural", label: "Marcus (Neural)", gender: "Male" },
    { value: "elena-neural", label: "Elena (Neural)", gender: "Female" },
    { value: "david-standard", label: "David (Standard)", gender: "Male" }
  ];
```

Replace with:

```tsx
  const [voiceOptions, setVoiceOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    fetch(`/api/retell/voices?tenant_id=${currentOrganization.id}`)
      .then((res) => (res.ok ? res.json() : { voices: [] }))
      .then((data) => {
        const options = (data.voices || []).map((voice: any) => ({
          value: voice.voice_id,
          label: voice.voice_name || voice.voice_id,
        }));
        setVoiceOptions(options);
        if (options.length > 0) setSelectedVoice((prev) => prev || options[0].value);
      })
      .catch((err) => console.warn("Failed to load voices:", err));
  }, [currentOrganization?.id]);
```

Find the JSX rendering (`{voice.label} ({voice.gender})`):

```tsx
            {voiceOptions.map((voice) => (
              <option key={voice.value} value={voice.value}>
                {voice.label} ({voice.gender})
              </option>
            ))}
```

Replace with:

```tsx
            {voiceOptions.map((voice) => (
              <option key={voice.value} value={voice.value}>
                {voice.label}
              </option>
            ))}
```

- [ ] **Step 3: Fix the `AgentEditModal.tsx:326` fallback**

Find:

```ts
            const voiceIdFromConfig = config.voice_id || voiceConfig.voice_id || "sarah-neural";
```

Replace with:

```ts
            const voiceIdFromConfig = config.voice_id || voiceConfig.voice_id || "";
```

(This file already fetches real voice options from Retell elsewhere per its own comments — "Voice options - will be populated from Retell API" at line 104 — so the fallback should be an empty string, forcing the dropdown to prompt for a real selection, not a hardcoded id that may not exist in the tenant's actual voice list.)

- [ ] **Step 4: Verify with `type-check` and `lint`**

Run: `npm run type-check && npm run lint`
Expected: no new errors. Confirm no remaining hardcoded voice ids: `grep -rn "sarah-neural\|marcus-neural\|elena-neural\|david-standard" src/components/` should return nothing.

- [ ] **Step 5: Manual verification**

Load each of the 3 modified components in the browser with a tenant that has a connected Retell key. Expected: the voice dropdown is populated with real voices from `/api/retell/voices`, not the old hardcoded lists.

- [ ] **Step 6: Commit**

```bash
git add src/components/VoiceAgentList.tsx src/components/AgentConfiguration.tsx src/components/AgentEditModal.tsx
git commit -m "fix: remove hardcoded voice lists, fetch from /api/retell/voices everywhere"
```

---

### Task 11: Fix the legacy-role access path in `GET`/`PATCH /api/tenants/[id]`

**Model:** `claude-4.6-opus-high-thinking` · **Tool:** `generalPurpose` · **Justification:** tenant-access authorization logic — Tier 1.

**Files:**
- Modify: `src/app/api/tenants/[id]/route.ts:36-62` (GET)

**Context:** GET's access check for non-platform-staff is a bare row-existence check on the legacy `role` text column, and both GET and PATCH decide whether to use the RLS-bypassing admin client (`isAdminRole`) based on that same legacy value. This means any active tenant member (regardless of role) can read the tenant via GET, and the admin-client decision silently stops working once a role is backfilled to `role_id` only.

- [ ] **Step 1: Replace the GET access check with a real permission check**

Find:

```ts
    } else {
      const { data: userTenants, error: userTenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('tenant_id', id)
        .limit(1);

      if (userTenantError || !userTenants || userTenants.length === 0) {
        console.error('Access denied - no user_tenants relationship:', {
          userId: user.id,
          tenantId: id,
          error: userTenantError
        });
        return NextResponse.json({ error: 'Forbidden: You do not have access to this organization' }, { status: 403 });
      }
      
      userTenantRole = userTenants[0]?.role || null;
      hasVerifiedAccess = true;
    }
```

Replace with:

```ts
    } else {
      const { data: userTenants, error: userTenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id, role, role_id, roles(name)')
        .eq('user_id', user.id)
        .eq('tenant_id', id)
        .eq('status', 'active')
        .limit(1);

      if (userTenantError || !userTenants || userTenants.length === 0) {
        console.error('Access denied - no user_tenants relationship:', {
          userId: user.id,
          tenantId: id,
          error: userTenantError
        });
        return NextResponse.json({ error: 'Forbidden: You do not have access to this organization' }, { status: 403 });
      }

      const row: any = userTenants[0];
      const nestedRoleName = Array.isArray(row.roles) ? row.roles[0]?.name : row.roles?.name;
      userTenantRole = nestedRoleName ?? row.role ?? null;
      hasVerifiedAccess = true;
    }
```

- [ ] **Step 2: Verify with `type-check`**

Run: `npm run type-check`
Expected: no new errors. (`adminRoles.includes(userTenantRole)` a few lines below already checks for `'platform_admin'`/`'company_admin'`, which now correctly matches once `userTenantRole` is resolved from the canonical role name.)

- [ ] **Step 3: Manual verification**

As a `company_viewer` (read-only role, backfilled to `role_id`, no legacy `role` text), call `GET /api/tenants/<own-tenant-id>`. Expected: still succeeds (read access for any active member is intentional here — this task fixes *which client* is used and *what role is reported*, not whether GET requires elevated access), and the returned `isAdminRole`/client-selection logic behaves correctly for a `company_admin` calling the same endpoint (verify via added `console.log` output already in the file, or by confirming a `company_admin`'s write-adjacent behavior in the PATCH handler still uses the admin client).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tenants/[id]/route.ts
git commit -m "fix: resolve tenant access role via the canonical role model in GET /api/tenants/[id]"
```

---

### Task 12: Complete the white-label sweep on company-facing surfaces

**Model:** `composer-2-fast` · **Tool:** `generalPurpose` · **Justification:** mechanical text replacement, same pattern as the already-correct `RetellIntegrationManagement.tsx`; `AgentInteractionModal.tsx` already has an `obfuscateRetell()` helper for exactly this purpose.

**Files:**
- Modify: `src/components/ChatAgentList.tsx:197,455,459,1140-1146`
- Modify: `src/components/AgentTestModal.tsx:511,844`
- Modify: `src/components/AgentInteractionModal.tsx:586,681`
- Modify: `src/components/AgentEditModal.tsx:1064,1069`
- Modify: `src/components/TenantManagement.tsx:1055`

- [ ] **Step 1: `ChatAgentList.tsx`**

Line 197 — find:
```ts
          setError(`Agent ${retellAgentId} not found in database. Try syncing agents from Retell.`);
```
Replace:
```ts
          setError(`Agent ${retellAgentId} not found in database. Try syncing agents from the voice provider.`);
```

Line 455 — find:
```ts
        setSuccess(`Agent "${formData.name.trim()}" created and connected to Retell! Publish it when ready to go live.`);
```
Replace:
```ts
        setSuccess(`Agent "${formData.name.trim()}" created and connected to the voice provider! Publish it when ready to go live.`);
```

Line 459 — find:
```ts
          `Agent created locally, but connecting it to Retell failed: ${retellError.message}. You can retry with "Link AI Agent" once a Retell chat agent exists.`
```
Replace:
```ts
          `Agent created locally, but connecting it to the voice provider failed: ${retellError.message}. You can retry with "Link AI Agent" once a chat agent exists.`
```

Lines 1140-1146 — find:
```tsx
                Use this only if a chat agent already exists in Retell (e.g. created via the
                Retell dashboard) and you want to link it to this local agent record.
```
and (a few lines below, same block)
```tsx
                connected to Retell automatically.
```
and
```tsx
                <li>Find the chat agent in your Retell dashboard</li>
```
Replace each "Retell"/"Retell dashboard" occurrence in this instructional block with "the voice provider"/"the voice provider's dashboard" respectively, preserving the surrounding JSX exactly.

- [ ] **Step 2: `AgentTestModal.tsx`**

Line 511 — find:
```ts
          setError(`Retell audio unavailable: ${retellError.message}. Falling back to browser TTS.`);
```
Replace:
```ts
          setError(`Voice provider audio unavailable: ${retellError.message}. Falling back to browser TTS.`);
```

Line 844 — find:
```ts
            setError(`${errorMsg}\n\nPlease ensure the agent is configured as a chat agent in Retell dashboard.`);
```
Replace:
```ts
            setError(`${errorMsg}\n\nPlease ensure the agent is configured as a chat agent in the voice provider's dashboard.`);
```

- [ ] **Step 3: `AgentInteractionModal.tsx`**

This file already has an `obfuscateRetell()` helper (lines 174-214) used elsewhere for exactly this purpose; these two lines were simply missed.

Line 586 — find:
```ts
              setError(`Call ended during initialization after ${duration}s. Check Retell dashboard for call ${retellCallIdRef.current}`);
```
Replace:
```ts
              setError(`Call ended during initialization after ${duration}s. Check the voice provider dashboard for call ${retellCallIdRef.current}`);
```

Line 681 — find:
```ts
          setError(`Retell unavailable: ${retellError.message}. Using browser TTS.`);
```
Replace:
```ts
          setError(`Voice provider unavailable: ${retellError.message}. Using browser TTS.`);
```

- [ ] **Step 4: `AgentEditModal.tsx`**

Line 1064 — find:
```tsx
                      Link or create this agent in Retell first before attaching knowledge bases.
```
Replace:
```tsx
                      Link or create this agent in the voice provider first before attaching knowledge bases.
```

Line 1069 — find:
```tsx
                      Retell LLMs -- pass knowledge base content to your websocket server directly.
```
Replace:
```tsx
                      the voice provider's LLMs -- pass knowledge base content to your websocket server directly.
```

(Keep the surrounding sentence structure exactly as-is; only the "Retell" token changes.)

- [ ] **Step 5: `TenantManagement.tsx`**

Line 1055 — find:
```tsx
          title={`Voice Provider (Retell AI): ${selectedTenant.name}`}
```
Replace:
```tsx
          title={`Voice Provider: ${selectedTenant.name}`}
```

- [ ] **Step 6: Verify with `type-check` and `lint`**

Run: `npm run type-check && npm run lint`
Expected: no new errors. Confirm: `grep -rn "Retell" src/components/ChatAgentList.tsx src/components/AgentTestModal.tsx src/components/AgentInteractionModal.tsx src/components/AgentEditModal.tsx src/components/TenantManagement.tsx` shows remaining hits are only in code comments, `console.log`/`console.warn` debug strings, internal variable names (`retellAgentId`, `retellClient`, etc.), or the `obfuscateRetell` function name itself — never in a string passed to `setError`/`setSuccess`/JSX text content.

- [ ] **Step 7: Manual verification**

Trigger each fixed error path in the UI (easiest: disconnect network briefly to force a Retell-call failure in `AgentTestModal`/`AgentInteractionModal`, or use an invalid `retell_agent_id` in `ChatAgentList`'s link flow) and confirm the displayed message says "voice provider," not "Retell."

- [ ] **Step 8: Commit**

```bash
git add src/components/ChatAgentList.tsx src/components/AgentTestModal.tsx src/components/AgentInteractionModal.tsx src/components/AgentEditModal.tsx src/components/TenantManagement.tsx
git commit -m "fix: complete white-label sweep on remaining company-facing Retell strings"
```

---

## Self-Review

**Spec coverage:** All 5 Critical + 7 High findings from `docs/ROLE_PERMISSION_CLEANUP_PLAN.md` §7 map to a task (1↔1, 2↔2, 3↔3, 4↔4, 5↔5, 6↔7, 7↔6, 8↔8, 9↔9, 10↔10, 11↔11, 12↔12). The 6 Medium items and 2 doc-accuracy-only items from §7 are explicitly out of scope for this plan (they're lower-severity consistency/tech-debt items, not exploitable bugs or overstated-done claims) — flag separately if you want them planned too.

**Placeholder scan:** No `TBD`/`TODO`/"add appropriate error handling" left in any step; every code step shows complete before/after code.

**Type consistency:** `getUserRoleInfo`'s return shape (`{ role, scope, displayName, description, permissions }`) as fixed in Task 6 is what Task 7 consumes (`roleInfo?.role`) — consistent. `isModelAllowed(model?: string | null): boolean` from `src/lib/models.ts` matches its existing signature used in Task 8.

**Task ordering:** Task 7 explicitly depends on Task 6 (both are Tier 1 `generalPurpose`, so a subagent-driven executor should run them sequentially, not in parallel, even though most other tasks here are independent and file-disjoint).
