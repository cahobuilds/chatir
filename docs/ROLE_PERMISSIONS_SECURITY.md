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
- `hasPermission(userId, tenantId, permissionId)` - Check if user has permission
- `getUserPermissions(userId, tenantId)` - Get all user permissions
- `getUserRoleInfo(userId, tenantId)` - Get user's role information
- `hasAnyRole(userId, tenantId, roles[])` - Check if user has any of the specified roles

#### `src/lib/roles.ts`
**Purpose**: Server-side role management  
**Usage**: API routes, server components  
**Never import in**: Client components

**Key Functions**:
- `getAllRoles()` - Get all roles from database
- `getRoleById(roleId)` - Get role by ID
- `getRolePermissions(roleId)` - Get permissions for a role
- `roleHasPermission(roleId, permissionId)` - Check if role has permission

### Client-Side Files

#### `src/lib/roles-client.ts`
**Purpose**: Client-side display utilities  
**Usage**: Client components for UI display  
**Security**: None - presentation only

**Key Functions**:
- `getRoleDisplayName(roleName)` - Format role name for display
- `getRoleCategoryColor(category)` - Get badge color for role category
- `compareRoleHierarchy(role1, role2)` - Compare role hierarchy levels

#### `src/lib/permissions.ts`
**Purpose**: Type definitions and constants  
**Usage**: Both client and server  
**Security**: Contains deprecated functions marked as display-only

**Note**: Functions like `hasPermission()`, `getRoleInfo()`, and `getPermissionsForRole()` are marked as deprecated and should NOT be used for authorization. They are kept for backward compatibility in display components only.

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
import { hasPermission } from '@/lib/permissions-server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Check permission server-side
  const canCreate = await hasPermission(
    user.id,
    tenantId,
    'agents.create'
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
  if (hasPermission('agents.create')) {
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

if (hasPermission(role, 'agents.create')) {
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
if (hasPermission('agents.create')) {
  showCreateButton();
}

// ✅ API route (server-side)
import { hasPermission } from '@/lib/permissions-server';

export async function POST(request: NextRequest) {
  const canCreate = await hasPermission(userId, tenantId, 'agents.create');
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

