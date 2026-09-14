# Roles and Permissions System

## Overview

The platform uses a role-based access control (RBAC) system with exactly **6 canonical
roles** split across **2 scopes**:

- **Platform scope** — platform staff who operate the SaaS itself (onboarding companies,
  connecting the voice-provider key, billing/plans, model allowlists). Platform roles are
  **tenant-agnostic**: a platform role is not tied to any single company and (depending on
  the specific permission) can act across every tenant.
- **Company scope** — staff of an individual company (tenant) who manage that company's
  agents, knowledge bases, users, and billing. Company roles are scoped to the single
  `tenant_id` the membership row belongs to.

This is the **only** active role model as of the `20260908000000_platform_roles_cleanup.sql`
migration (2026-09-08). All older roles (`system_admin`, `super_admin`, `tenant_admin`,
`subtenant_admin`, `organization_admin`, `workspace_admin`, `manager`, `call_manager`,
`agent`, `analyst`, `user`, `viewer`) were **deactivated** (`is_active = false`) — they are
never assigned to new memberships and are kept in the `roles` table only as a historical
record / mapping target for old data. The single source of truth for this model in code is
`src/lib/permissions-server.ts`.

## The 6 Canonical Roles

| Role | Scope | `hierarchy_level`* | `category`* | Purpose |
|---|---|---|---|---|
| `platform_admin` | platform | 100 | system | Full platform access: organizations, plans, payments, the voice-provider (Retell) key, platform staff management. Superuser — see [Platform-admin superuser bypass](#platform-admin-superuser-bypass) below. |
| `platform_operator` | platform | 90 | system | Onboard organizations, connect the voice-provider key, view payments, manage the LLM model allowlist. |
| `platform_billing` | platform | 85 | system | View/update plans, view/manage payments. |
| `company_admin` | company | 80 | organization | Manage agents, knowledge base, users, and plan/billing for their company. |
| `company_editor` | company | 60 | organization | Manage agents and knowledge base for their company. No user or billing management. |
| `company_viewer` | company | 30 | standard | Read-only access to analytics, call/chat history, and transcripts. |

\* `hierarchy_level` and `category` are informational fields used only for UI ordering/badge
color (`src/lib/roles-client.ts`) — they play **no role** in authorization decisions.
Authorization is always driven by the permission strings below, resolved via
`role_permissions`, never by comparing hierarchy numbers.

All 6 roles are seeded with `is_system_role = true` and `is_active = true` — none of them can
be renamed or deleted through the app (role creation/editing via `POST /api/roles` is for
custom, non-system roles only, gated by the platform permission `platform_users.manage`).

## Permission Catalog

Permissions live in a dedicated `permissions` table (`id`, `name`, `description`, `category`,
`scope`). Every permission belongs to exactly one of the two scopes:

### Platform-scope permissions

| Permission | Description | Category |
|---|---|---|
| `orgs.view` | View organizations | organizations |
| `orgs.create` | Create an organization | organizations |
| `orgs.update` | Update an organization | organizations |
| `orgs.delete` | Delete an organization | organizations |
| `plans.view` | View plans/pricing | billing |
| `plans.update` | Change plan/pricing | billing |
| `payments.view` | View payment status | billing |
| `payments.manage` | Manage payments/refunds | billing |
| `retell_key.manage` | Add/rotate the voice-provider API key | integrations |
| `platform_users.manage` | Manage platform staff and roles | admin |
| `models.manage` | Manage the LLM model allowlist | integrations |
| `voices.view` | View curated voices | integrations |

### Company-scope permissions

| Permission | Description | Category |
|---|---|---|
| `agents.manage` | Create/update/delete agents | agents |
| `knowledge.manage` | Manage knowledge bases and sources | knowledge |
| `users.manage` | Manage company users and roles | users |
| `billing.manage` | Manage company plan and billing | billing |
| `analytics.view` | View analytics dashboards | analytics |
| `interactions.view` | View call/chat history + transcripts | analytics |

These are the **only** permission strings the running code checks. Older docs/UI referencing
strings like `agents.create`, `tenant.billing`, `users.manage_roles`, `settings.system`, etc.
describe the pre-2026-09-08 model and no longer correspond to any row in the `permissions`
table or anything `hasPermission`/`hasPlatformPermission` will match.

## Role → Permission Grants

| Role | Granted permissions |
|---|---|
| `platform_admin` | **All 12** platform-scope permissions, *plus* an implicit superuser bypass over every company-scope permission in every tenant (see below) |
| `platform_operator` | `orgs.view`, `orgs.create`, `orgs.update`, `retell_key.manage`, `payments.view`, `models.manage`, `voices.view` (7 of 12 — no `orgs.delete`, `plans.*`, `payments.manage`, or `platform_users.manage`) |
| `platform_billing` | `orgs.view`, `plans.view`, `plans.update`, `payments.view`, `payments.manage` (`orgs.view` is included specifically so the "is this platform staff?" bypass — `hasPlatformPermission(userId, 'orgs.view')` — recognizes billing staff too) |
| `company_admin` | All 6 company-scope permissions: `agents.manage`, `knowledge.manage`, `users.manage`, `billing.manage`, `analytics.view`, `interactions.view` |
| `company_editor` | `agents.manage`, `knowledge.manage`, `analytics.view`, `interactions.view` (no `users.manage` or `billing.manage`) |
| `company_viewer` | `analytics.view`, `interactions.view` only (read-only) |

In practice, within a single company:
- **`company_admin`** is the only role that can add/remove users or touch billing/plan settings.
- **`company_editor`** can do everything operational (build agents, manage the knowledge base)
  but can't manage teammates or billing.
- **`company_viewer`** can see analytics, call/chat history, and transcripts, but cannot create
  or modify anything.

## Platform-Admin Superuser Bypass

Platform staff are never expected to hold a `user_tenants` membership row in every company
they might need to touch, so the permission helpers special-case them:

- **`isPlatformAdmin(userId)`** — true if the user holds an **active** `user_tenants` row
  with role `platform_admin` **anywhere** (no `tenant_id` filter). This mirrors the SQL
  `is_platform_admin()` RLS helper so the app layer and the database layer agree on what
  "platform_admin" means.
- **`hasPermission(userId, tenantId, permissionId)`** — the company-scope check. It calls
  `isPlatformAdmin(userId)` **first** and returns `true` immediately if so — a `platform_admin`
  gets every company-scope permission in every tenant, even one they have no membership row
  in at all. Otherwise it resolves the caller's role for that specific tenant and checks
  `role_permissions`.
- **`hasPlatformPermission(userId, permissionId)`** — the platform-scope check. Loops over the
  user's active memberships: any `platform_admin` role anywhere grants everything; a
  `platform_operator`/`platform_billing` role only grants what's actually in `role_permissions`
  for that role.
- **`canAccessTenant(userId, tenantId, permissionId)`** — the standard "can this user touch
  this company's data?" gate used across the API routes. It first checks
  `hasPlatformPermission(userId, 'orgs.view')` — true for all three platform roles, since all
  three are granted `orgs.view` — meaning **any platform staff can access any tenant's data**,
  regardless of company-scope permissions. If that's false, it falls back to
  `hasPermission(userId, tenantId, permissionId)` for ordinary company-role checks.
- **`getUserPermissions`/`getUserRoleInfo`** (used to populate the UI) apply the same
  tenant-agnostic rule: a `platform_admin` with no membership row in the tenant being viewed
  still gets the full permission list / a synthetic "Platform Admin" role object, instead of an
  empty result.

Net effect: `platform_admin` is an unconditional superuser over both scopes;
`platform_operator` and `platform_billing` are platform-scoped specialists who also get a
"see into any tenant" pass via `orgs.view`, but only the specific platform permissions
assigned to them.

## Database Structure

### Roles table

```sql
CREATE TABLE roles (
  id               UUID PRIMARY KEY,
  name             TEXT UNIQUE NOT NULL,       -- e.g. 'company_admin'
  display_name     TEXT NOT NULL,               -- e.g. 'Company Admin'
  description      TEXT,
  hierarchy_level  INTEGER NOT NULL,            -- UI ordering only, not authorization
  category         TEXT,                        -- 'system' | 'organization' | 'standard' (UI badge color)
  scope            TEXT NOT NULL CHECK (scope IN ('platform','company')),
  is_system_role   BOOLEAN DEFAULT false,
  is_active        BOOLEAN DEFAULT true,        -- legacy roles are false, never assigned
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
);
```

### Permissions table

```sql
CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,             -- e.g. 'agents.manage'
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'standard',
  scope       TEXT NOT NULL CHECK (scope IN ('platform','company')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Role–permission mapping table

```sql
CREATE TABLE role_permissions (
  id             UUID PRIMARY KEY,
  role_id        UUID REFERENCES roles(id),
  permission_id  UUID REFERENCES permissions(id) ON DELETE CASCADE,  -- FK, not free text
  created_at     TIMESTAMPTZ,
  UNIQUE(role_id, permission_id)
);
```

> **Note:** `role_permissions.permission_id` is a UUID foreign key into `permissions.id`, not
> the permission's `name` string. `src/lib/permissions-server.ts`'s helpers (`hasPermission`,
> `hasPlatformPermission`, etc.) always resolve through the `permissions(name)` embed and
> compare against the `name` string (e.g. `'agents.manage'`) — that's the API every route
> handler and this doc uses. See `docs/ROLE_PERMISSIONS_SECURITY.md` for a caveat about
> `src/lib/roles.ts`'s lower-level helpers, which operate on the raw UUID instead.

### `user_tenants` table

Each membership row has a `role_id` column (FK to `roles.id`) that determines the member's
role for that specific `tenant_id`. Every active membership row has `role_id` populated — the
migration backfilled it from the old `role` text column, and new writes always set `role_id`
via `resolveRoleId()`. The legacy `role` text column still exists on the table for now (kept
for the Phase-1b cleanup) but is no longer read by any permission check.

## Usage

### Server-side permission checks (authorization — use these)

```typescript
import {
  hasPermission,
  hasPlatformPermission,
  canAccessTenant,
  isPlatformAdmin,
  getUserPermissions,
  getUserRoleInfo,
  hasAnyRole,
} from '@/lib/permissions-server';

// Company-scope: does this user have `agents.manage` in this tenant?
// (platform_admin bypasses this automatically)
const canManageAgents = await hasPermission(user.id, tenantId, 'agents.manage');

// Platform-scope: does this user have `retell_key.manage` at the platform level?
const canManageKey = await hasPlatformPermission(user.id, 'retell_key.manage');

// The common "route-level" gate: platform staff OR a company role with this permission
if (!(await canAccessTenant(user.id, tenantId, 'agents.manage'))) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Resolving legacy or canonical role names to a `role_id` (write paths)

```typescript
import { resolveRoleId, toCanonicalRoleName, CANONICAL_ROLE_NAMES } from '@/lib/permissions-server';

// Accepts either a canonical name ('company_admin') or a legacy name ('tenant_admin')
// and returns the active roles.id to write into user_tenants.role_id.
const roleId = await resolveRoleId(requestedRoleName);
```

### Server-side role metadata (display/admin UI — not for authorization)

```typescript
import { getAllRoles, getRoleById, getRoleByName, getRolePermissions, roleHasPermission } from '@/lib/roles';

const roles = await getAllRoles();                       // all active roles, ordered by hierarchy_level
const role = await getRoleByName('company_admin');        // canonical name lookup works the same way
```

## Legacy Role Mapping

Old code, old data rows, and old docs may still reference the pre-2026-09-08 role names.
`toCanonicalRoleName()` / `LEGACY_ROLE_TO_CANONICAL` in `permissions-server.ts` is the single
place this mapping is defined:

| Legacy role | Maps to canonical role |
|---|---|
| `system_admin` | `platform_admin` |
| `super_admin` | `company_admin` — **not** `platform_admin`. `super_admin` was actually a tenant-scoped "top admin of one company," not a platform-wide role, despite the name (corrected by `20260908000002_fix_super_admin_scope.sql` after the initial migration got this wrong). |
| `tenant_admin`, `organization_admin` | `company_admin` |
| `subtenant_admin`, `workspace_admin`, `agent`, `manager`, `call_manager` | `company_editor` |
| `analyst`, `user`, `viewer` | `company_viewer` |

Any role name not in this table and not one of the 6 canonical names resolves to `null`
(`toCanonicalRoleName` / `resolveRoleId` — the caller must handle that case explicitly).

## Migration Notes

- The old role zoo (`system_admin`, `super_admin`, `tenant_admin`, `subtenant_admin`,
  `organization_admin`, `workspace_admin`, `manager`, `call_manager`, `agent`, `analyst`,
  `user`, `viewer`) is **deactivated** (`is_active = false`), not deleted — rows referencing
  them historically still resolve for auditing, but they can never be assigned going forward
  and are excluded from every `roles` query the app makes (`is_active = true` filters, and the
  `roles_select_all` RLS policy only exposes active roles).
- `role_permissions` was fully re-seeded against the new `permissions` table; none of the old
  free-text permission rows survived the migration.
- `user_tenants.role_id` was backfilled from the legacy `role` text column using the mapping
  above. The legacy `role` column and the old client-side `permissions.ts` permission
  vocabulary (`tenant.view`, `users.manage_roles`, `settings.system`, ...) are scheduled for
  removal in a later "Phase 1b" migration/code-sweep — see
  `docs/ROLE_PERMISSION_CLEANUP_PLAN.md` for the full history and current status of that
  cleanup.
