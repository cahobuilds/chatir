# System Admin User Creation Guide

## Overview

The system admin user (`systemadmin@tin.info`) now has full platform access (100/100 permissions) and can create users and assign them to one or many organizations (tenants).

## System Admin Capabilities

✅ **Full Platform Access** - 100/100 permissions  
✅ **Create Users** - Create new users in the system  
✅ **Assign to Tenants** - Assign users to one or multiple organizations  
✅ **Manage All Tenants** - Access and manage all tenants in the platform  
✅ **Create Tenants** - Create new organizations  
✅ **Manage Branding** - Update logos and settings for any tenant  

## API Endpoints

### 1. Create a New User

**Endpoint:** `POST /api/users`

**Authentication:** Requires system_admin role

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "tenant_ids": ["tenant-uuid-1", "tenant-uuid-2"],
  "role": "viewer"
}
```

**Parameters:**
- `email` (required) - User's email address
- `password` (required) - User's password (min 8 characters)
- `name` (optional) - User's display name
- `tenant_ids` (required) - Array of tenant UUIDs to assign the user to
- `role` (optional, default: "viewer") - Role to assign. Valid roles:
  - `system_admin` - Full platform access
  - `super_admin` - Tenant admin with full tenant access
  - `tenant_admin` - Organization admin
  - `subtenant_admin` - Subtenant admin
  - `agent` - Agent role
  - `viewer` - Read-only access

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "tenants": [
      {
        "tenant_id": "tenant-uuid-1",
        "tenant_name": "Organization 1",
        "role": "viewer"
      },
      {
        "tenant_id": "tenant-uuid-2",
        "tenant_name": "Organization 2",
        "role": "viewer"
      }
    ]
  }
}
```

### 2. List All Users

**Endpoint:** `GET /api/users`

**Authentication:** Requires system_admin role

**Response:**
```json
{
  "users": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2024-01-15T10:00:00Z",
      "email_confirmed": true,
      "tenants": [
        {
          "tenant_id": "tenant-uuid",
          "tenant_name": "Organization Name",
          "role": "viewer",
          "status": "active"
        }
      ]
    }
  ]
}
```

## Example Usage

### Using cURL

```bash
# Create a new user assigned to multiple tenants
curl -X POST https://ai-multi-tenant-saas.vercel.app/api/users \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-ystivchlyoijaghwdcjd-auth-token=YOUR_TOKEN" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "name": "New User",
    "tenant_ids": [
      "tenant-uuid-1",
      "tenant-uuid-2"
    ],
    "role": "tenant_admin"
  }'
```

### Using JavaScript/TypeScript

```typescript
// Create a user and assign to multiple tenants
const response = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'SecurePass123!',
    name: 'New User',
    tenant_ids: [
      'tenant-uuid-1',
      'tenant-uuid-2',
    ],
    role: 'tenant_admin',
  }),
});

const { user } = await response.json();
console.log('Created user:', user);
```

## Accessing Tenant Settings

As a system admin, you can now:

1. **Navigate to:** `/tenant-settings`
2. **See:** "Tenant Configuration" section with branding options
3. **Update:** Organization logos and names for any tenant you have access to

## Getting Tenant IDs

To get tenant IDs for user assignment:

```bash
# Get all tenants
curl https://ai-multi-tenant-saas.vercel.app/api/tenants \
  -H "Cookie: sb-ystivchlyoijaghwdcjd-auth-token=YOUR_TOKEN"
```

Or use the Supabase Dashboard:
1. Go to Supabase Dashboard → Table Editor → `tenants`
2. Copy the `id` (UUID) of the tenant(s) you want to assign

## Notes

- System admin has access to **all tenants** automatically
- Users can be assigned to **multiple tenants** with the same or different roles
- The `system_admin` role has **100/100 permissions** (all permissions enabled)
- User creation requires the user to be logged in as `system_admin`
- Passwords should be at least 8 characters long
- Users are automatically email-confirmed upon creation

