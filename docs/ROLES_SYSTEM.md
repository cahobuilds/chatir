# Roles and Permissions System

## Overview

The platform uses a comprehensive role-based access control (RBAC) system designed for managing AI infrastructure, specifically tailored for Retell AI operations.

## Role Hierarchy

Roles are organized by hierarchy level (higher number = more permissions):

1. **System Admin** (100) - Full platform control
2. **Super Admin** (90) - Platform-wide administration
3. **Organization Admin** (80) - Organization-level administration
4. **Manager** (60) - Team and department management
5. **Call Manager** (50) - Call and interaction management
6. **Agent** (40) - Agent management
7. **Analyst** (30) - Analytics and reporting
8. **User** (20) - Standard user access
9. **Viewer** (10) - Read-only access

## Role Definitions

### System Admin
- **Level**: 100
- **Category**: System
- **Description**: Full platform access with all permissions across all organizations. Can manage system settings, all tenants, and platform infrastructure.
- **Key Permissions**:
  - All permissions across the platform
  - System-level settings management
  - Tenant creation and deletion
  - User role management

### Super Admin
- **Level**: 90
- **Category**: Platform
- **Description**: Platform-wide administrative access. Can manage multiple organizations, assign roles, and configure platform-level settings.
- **Key Permissions**:
  - Manage multiple organizations
  - Assign roles to users
  - Platform-level configuration
  - All tenant operations (except system settings)

### Organization Admin
- **Level**: 80
- **Category**: Organization
- **Description**: Full administrative access to organization settings, user management, agent configuration, and billing.
- **Key Permissions**:
  - Manage organization settings
  - User management within organization
  - Agent configuration and management
  - Billing and subscription management
  - API key management
  - Webhook configuration

### Manager
- **Level**: 60
- **Category**: Team
- **Description**: Manages teams and departments within an organization. Can view analytics, manage assigned agents, and oversee team interactions.
- **Key Permissions**:
  - View and manage team users
  - Create and update agents
  - Monitor interactions
  - View analytics and reports
  - Manage knowledge base content

### Call Manager
- **Level**: 50
- **Category**: Team
- **Description**: Manages phone calls, interactions, and call monitoring. Can initiate calls, monitor live conversations, and manage call queues.
- **Key Permissions**:
  - Initiate phone calls
  - Monitor live calls
  - Intervene in calls
  - Access call recordings
  - Manage phone number assignments
  - Export interaction data

### Agent
- **Level**: 40
- **Category**: Standard
- **Description**: Can manage assigned agents, view interactions, and monitor agent performance. Limited to assigned resources.
- **Key Permissions**:
  - View and update assigned agents
  - Monitor interactions
  - View analytics

### Analyst
- **Level**: 30
- **Category**: Standard
- **Description**: Read-only access to analytics, reports, and interaction data. Can export data and generate insights.
- **Key Permissions**:
  - View agents and interactions
  - Export interaction data
  - View and create custom analytics reports
  - View billing information

### User
- **Level**: 20
- **Category**: Standard
- **Description**: Standard user access with basic permissions to view agents and interactions within their scope.
- **Key Permissions**:
  - View agents
  - View interactions
  - View basic analytics

### Viewer
- **Level**: 10
- **Category**: Standard
- **Description**: Read-only access to view agents, interactions, and basic analytics. Cannot modify any data.
- **Key Permissions**:
  - View agents
  - View interactions
  - View analytics

## Permission Categories

Permissions are organized into the following categories:

1. **Tenants** - Organization/tenant management
2. **Users** - User management
3. **Agents** - AI agent management
4. **Interactions** - Call and chat interaction management
5. **Calls** - Phone call operations (Retell AI specific)
6. **Phone Numbers** - Phone number management (Retell AI specific)
7. **Analytics** - Analytics and reporting
8. **Billing** - Billing and payment management
9. **API** - API key management
10. **Settings** - System and organization settings
11. **Knowledge Base** - Knowledge base management (Retell AI specific)
12. **Webhooks** - Webhook configuration

## Database Structure

### Roles Table
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  hierarchy_level INTEGER NOT NULL,
  category TEXT,
  is_system_role BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Role Permissions Table
```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY,
  role_id UUID REFERENCES roles(id),
  permission_id TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  UNIQUE(role_id, permission_id)
);
```

### User Tenants Table (Updated)
The `user_tenants` table now includes a `role_id` column that references the `roles` table, while maintaining backward compatibility with the `role` text column.

## Usage

### Getting User Permissions

```typescript
import { getRolePermissions } from '@/lib/roles';

// Get permissions for a role
const permissions = await getRolePermissions(roleId);
```

### Checking Permissions

```typescript
import { roleHasPermission } from '@/lib/roles';

// Check if role has specific permission
const canCreateAgents = await roleHasPermission(roleId, 'agents.create');
```

### Getting Role Information

```typescript
import { getRoleById, getRoleByName } from '@/lib/roles';

// Get role by ID
const role = await getRoleById(roleId);

// Get role by name
const role = await getRoleByName('organization_admin');
```

## Migration Notes

The system maintains backward compatibility with the old role system:
- Old roles (`tenant_admin`, `subtenant_admin`) are still supported
- New roles use the database `roles` table
- Permissions can be managed dynamically through the database
- The `user_tenants.role` column is maintained for backward compatibility

## Retell AI Specific Roles

Several roles are specifically designed for Retell AI operations:

- **Call Manager**: Manages phone calls and call monitoring
- **Agent**: Manages AI agents and monitors their performance
- **Analyst**: Analyzes call data and generates insights

These roles include permissions for:
- Phone number management
- Call initiation and monitoring
- Knowledge base management
- Webhook configuration

