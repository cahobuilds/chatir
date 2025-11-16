# SuperAdmin Capabilities

## Overview

Both `system_admin` and `super_admin` roles can create organizations and manage admin users. This document outlines their capabilities and how to use them.

## Capabilities

### ✅ Create Organizations
Both `system_admin` and `super_admin` can create new organizations (tenants) via the API.

**Endpoint:** `POST /api/tenants`

**Required Role:** `system_admin` or `super_admin`

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "subdomain": "acme",
  "tier": "standard",
  "settings": {},
  "branding": {}
}
```

### ✅ Create Admin Users
Both `system_admin` and `super_admin` can create new users and assign them admin roles.

**Endpoint:** `POST /api/users`

**Required Role:** `system_admin` or `super_admin`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "securepassword123",
  "name": "Admin User",
  "tenant_ids": ["tenant-uuid-1"],
  "role": "organization_admin"
}
```

**Supported Admin Roles:**
- `system_admin` - Full platform access
- `super_admin` - Platform-wide administration
- `organization_admin` - Organization admin (maps to `tenant_admin` in database)
- `workspace_admin` - Workspace admin (maps to `subtenant_admin` in database)

**Note:** The API accepts both `organization_admin`/`workspace_admin` (UI terminology) and `tenant_admin`/`subtenant_admin` (database terminology). They are automatically normalized to the database format.

### ✅ List All Users
Both `system_admin` and `super_admin` can list all users in the system.

**Endpoint:** `GET /api/users`

**Required Role:** `system_admin` or `super_admin`

## Role Differences

### System Admin (Level 100)
- Full platform access
- Can manage system settings
- Can create/delete organizations
- Can create users with any role, including `system_admin`

### Super Admin (Level 90)
- Platform-wide administration
- Can create organizations
- Can create users with admin roles (except `system_admin`)
- Cannot manage system-level settings
- Cannot create other `system_admin` users

## Examples

### Create an Organization
```bash
curl -X POST https://your-app.com/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "New Organization",
    "subdomain": "neworg",
    "tier": "premium"
  }'
```

### Create an Organization Admin User
```bash
curl -X POST https://your-app.com/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "admin@neworg.com",
    "password": "SecurePass123!",
    "name": "Organization Admin",
    "tenant_ids": ["organization-uuid"],
    "role": "organization_admin"
  }'
```

### Create a Super Admin User
```bash
curl -X POST https://your-app.com/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "superadmin@example.com",
    "password": "SecurePass123!",
    "name": "Super Admin",
    "tenant_ids": ["tenant-uuid-1", "tenant-uuid-2"],
    "role": "super_admin"
  }'
```

## Security Notes

1. **Password Requirements**: Passwords must be at least 8 characters
2. **Email Confirmation**: Users created via API are auto-confirmed
3. **Role Validation**: Only valid roles can be assigned
4. **Tenant Validation**: All tenant IDs must exist before user creation
5. **Access Control**: Only `system_admin` and `super_admin` can use these endpoints

## Database Mapping

The API accepts user-friendly role names but stores them in the database format:

| API Role | Database Role |
|----------|---------------|
| `organization_admin` | `tenant_admin` |
| `workspace_admin` | `subtenant_admin` |
| `system_admin` | `system_admin` |
| `super_admin` | `super_admin` |

This allows the UI to use "Organization Admin" while the database maintains the standard "tenant_admin" terminology.

