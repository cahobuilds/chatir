# Role & Permissions Security Architecture

## Overview

This document outlines the security architecture for role-based access control (RBAC) in the multi-tenant platform. All security-critical operations are performed server-side to prevent unauthorized access.

## Architecture Principles

### ✅ Server-Side (Security-Critical)
- **Permission checks** - Always query the database
- **Role verification** - Validate against database records
- **Authorization decisions** - Made in API routes and server components
- **User role retrieval** - Fetch from database with proper RLS

### ✅ Client-Side (Presentation Only)
- **Display formatting** - Role names, colors, badges
- **UI utilities** - Formatting functions for display
- **Type definitions** - TypeScript interfaces
- **Constants** - Static configuration values

## File Structure

### Server-Side Files

#### `src/lib/permissions-server.ts`
**Purpose**: Server-side permission checking utilities  
**Usage**: API routes, server components, middleware  
**Never import in**: Client components

**Key Functions**:
- `isPlatformAdmin(userId)` - Tenant-agnostic superuser check (true if the user holds an active `platform_admin` membership anywhere)
- `hasPermission(userId, tenantId, permissionId)` - Company-scope permission check (e.g. `'agents.manage'`); `platform_admin` bypasses this and is always `true`
- `hasPlatformPermission(userId, permissionId)` - Platform-scope permission check (e.g. `'retell_key.manage'`); `platform_admin` bypasses this and is always `true`
- `canAccessTenant(userId, tenantId, permissionId)` - The route-level gate: `true` if the caller is platform staff (has `'orgs.view'` at the platform scope) **or** holds `permissionId` on that tenant via `hasPermission`
- `getUserPermissions(userId, tenantId)` - Get all user permissions (UI)
- `getUserRoleInfo(userId, tenantId)` - Get user's role information (UI)
- `hasAnyRole(userId, tenantId, roles[])` - Check if user has any of the specified role **names** for that tenant (defined but not currently called anywhere in the route handlers — prefer the permission-based checks above)
- `resolveRoleId(role, client?)` / `toCanonicalRoleName(role)` - Map a legacy or canonical role name (e.g. `'tenant_admin'` or `'company_admin'`) to the active `roles.id` to write into `user_tenants.role_id`
- `CANONICAL_ROLE_NAMES` - The 6 canonical role names: `platform_admin`, `platform_operator`, `platform_billing`, `company_admin`, `company_editor`, `company_viewer`

#### `src/lib/roles.ts`
**Purpose**: Server-side role management  
**Usage**: API routes, server components  
**Never import in**: Client components

**Key Functions**:
- `getAllRoles()` - Get all active roles from database
- `getRoleById(roleId)` / `getRoleByName(name)` - Get a role by ID or by name (works with canonical names, e.g. `'company_admin'`)
- `getRolePermissions(roleId)` - Get permission **IDs** (raw `permissions.id` UUIDs) assigned to a role
- `roleHasPermission(roleId, permissionId)` - Check if a role has a permission, by permission **ID**

> ⚠️ **Caveat**: `role_permissions.permission_id` is a UUID FK into `permissions.id`, not the
> permission's `name` string. Unlike `permissions-server.ts`'s helpers (which join through
> `permissions(name)` and compare against strings like `'agents.manage'`), `getRolePermissions`
> and `roleHasPermission` in this file operate on the raw UUID. Calling
> `roleHasPermission(roleId, 'agents.manage')` will **not** match — you'd need the permission
> row's actual `id`. In practice, no route handler in this codebase calls
> `roleHasPermission`/`getRolePermissions` for authorization; all real permission checks go
> through `permissions-server.ts`'s name-based helpers instead. Treat this as a
> display/inventory helper, not an authorization primitive.

### Client-Side Files

#### `src/lib/roles-client.ts`
**Purpose**: Client-side display utilities  
**Usage**: Client components for UI display  
**Security**: None - presentation only

**Key Functions**:
- `getRoleDisplayName(roleName)` - Format role name for display
- `getRoleCategoryColor(category)` - Get badge color for role category
- `compareRoleHierarchy(role1, role2)` - Compare role hierarchy levels (UI ordering only — hierarchy is never consulted for authorization)

> ⚠️ **Stale display data**: `getRoleDisplayName()`'s lookup map and the `ROLE_HIERARCHY`
> constant in this file still only list the pre-2026-09-08 legacy role names
> (`system_admin`, `super_admin`, `tenant_admin`, ...), not the 6 canonical roles
> (`platform_admin`, `company_admin`, ...). A canonical role name falls through to the
> `roleMap[roleName] || roleName` fallback and displays as its raw slug (e.g.
> `"company_admin"`) instead of a formatted label. This is a real display gap in the current
> code, not an authorization issue — call it out if you touch this file.

#### `src/lib/permissions.ts`
**Purpose**: Type definitions and constants  
**Usage**: Both client and server  
**Security**: Contains deprecated functions marked as display-only

**Note**: Functions like `hasPermission()`, `getRoleInfo()`, and `getPermissionsForRole()` are marked as deprecated and should NOT be used for authorization. They are kept for backward compatibility in display components only. This file's entire permission vocabulary
(`tenant.view`, `users.manage_roles`, `settings.system`, `agents.create`, ...) and its
`ROLE_PERMISSIONS` role list (`system_admin`, `organization_admin`, `manager`, ...) predate the
2026-09-08 canonical model and do **not** match the real `permissions`/`roles` tables. Since
these functions are display-only and never called for authorization, this is a docs-accuracy
issue rather than a security one — but don't use any permission string or role name from this
file as a reference for what the server actually enforces.

## API Endpoints

### `/api/permissions/check`

#### POST - Check Permission
```typescript
POST /api/permissions/check
Body: {
  tenant_id: string;
  permission_id: string;
}
Response: {
  has_permission: boolean;
}
```

#### GET - Get User Permissions
```typescript
GET /api/permissions/check?tenant_id=xxx
Response: {
  permissions: Permission[];
  role_info: RolePermissions | null;
}
```

## Usage Examples

### Server-Side Permission Check (API Route)

```typescript
// src/app/api/agents/route.ts
import { canAccessTenant } from '@/lib/permissions-server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Check permission server-side (platform staff bypass this automatically)
  const canCreate = await canAccessTenant(
    user.id,
    tenantId,
    'agents.manage'
  );
  
  if (!canCreate) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }
  
  // Proceed with agent creation...
}
```

### Client-Side Display (Component)

```typescript
// src/components/profile/UserPermissions.tsx
"use client";

import { usePermissions } from '@/hooks/usePermissions';
import { getRoleDisplayName } from '@/lib/roles-client';

export default function UserPermissions({ tenantId }: Props) {
  // Fetch permissions from server via API
  const { permissions, roleInfo, loading } = usePermissions(tenantId);
  
  // Use client-side utility for display
  const displayName = getRoleDisplayName(roleInfo?.role || '');
  
  // Render UI...
}
```

### Client-Side Hook

```typescript
// src/hooks/usePermissions.ts
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent({ tenantId }: Props) {
  const { permissions, hasPermission, loading } = usePermissions(tenantId);
  
  // hasPermission() here checks against fetched data (display only)
  // Actual authorization happens server-side
  if (hasPermission('agents.manage')) {
    // Show create button (but API will still verify)
  }
}
```

## Security Best Practices

### ✅ DO

1. **Always check permissions server-side** in API routes before performing actions
2. **Use API endpoints** for permission checks from client components
3. **Use RLS policies** in Supabase for database-level security
4. **Validate tenant access** before checking permissions
5. **Use server-side functions** (`permissions-server.ts`, `roles.ts`) in API routes

### ❌ DON'T

1. **Never trust client-side permission checks** for authorization
2. **Don't import server-side files** (`permissions-server.ts`, `roles.ts`) in client components
3. **Don't use deprecated functions** (`hasPermission()` from `permissions.ts`) for security
4. **Don't bypass API routes** - always go through server-side validation
5. **Don't expose sensitive logic** in client-side code

## Migration Guide

### Old Pattern (Insecure)
```typescript
// ❌ Client component
import { hasPermission } from '@/lib/permissions';

if (hasPermission(role, 'agents.manage')) {
  // This can be bypassed!
  createAgent();
}
```

### New Pattern (Secure)
```typescript
// ✅ Client component
import { usePermissions } from '@/hooks/usePermissions';

const { hasPermission } = usePermissions(tenantId);

// Display logic only
if (hasPermission('agents.manage')) {
  showCreateButton();
}

// ✅ API route (server-side)
import { canAccessTenant } from '@/lib/permissions-server';

export async function POST(request: NextRequest) {
  const canCreate = await canAccessTenant(userId, tenantId, 'agents.manage');
  if (!canCreate) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Proceed...
}
```

## Testing

When testing permission checks:

1. **Test API endpoints** - Verify server-side permission checks work correctly
2. **Test RLS policies** - Ensure database-level security is enforced
3. **Test client display** - Verify UI shows/hides correctly based on permissions
4. **Test unauthorized access** - Verify API rejects unauthorized requests

## Summary

- **Security = Server-Side**: All authorization decisions happen on the server
- **Display = Client-Side**: UI formatting and display logic can be client-side
- **API = Bridge**: Client components fetch permission data via API endpoints
- **RLS = Database**: Supabase RLS provides additional database-level security

