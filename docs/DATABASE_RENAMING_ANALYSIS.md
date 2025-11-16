# Database Field Renaming Analysis

> **Status**: Analysis completed. **Decision**: Keep database terminology as-is (recommended approach).

## Overview
This document analyzes the impact of renaming database fields from "tenant" terminology to "organization" terminology. After analysis, the decision was made to keep database terminology unchanged, following industry best practices.

## Current State
- **Database tables**: `tenants`, `user_tenants`
- **Database columns**: `tenant_id`, `parent_id` (in multiple tables)
- **UI terminology**: Already updated to "Organization" and "Workspace"
- **Code references**: 192 references across 30 files
- **Migration files**: 88 references across 7 files

## Proposed Changes

### Tables to Rename
1. `tenants` → `organizations`
2. `user_tenants` → `user_organizations`

### Columns to Rename
1. `tenant_id` → `organization_id` (in all tables)
2. `parent_id` → `parent_organization_id` (optional, in tenants table)
3. Role values: `tenant_admin` → `organization_admin`, `subtenant_admin` → `workspace_admin`

### Tables Affected
- `tenants` (table rename)
- `user_tenants` (table rename)
- `agents` (column: `tenant_id`)
- `interactions` (column: `tenant_id`)
- `billing_records` (column: `tenant_id`)
- `roles` (role values)
- All RLS policies referencing `tenant_id`

## Migration Strategy

### Phase 1: Add New Columns (Non-Breaking)
```sql
-- Add new columns alongside existing ones
ALTER TABLE tenants ADD COLUMN organization_id UUID;
ALTER TABLE user_tenants ADD COLUMN organization_id UUID;
ALTER TABLE agents ADD COLUMN organization_id UUID;
-- ... repeat for all tables

-- Copy data
UPDATE tenants SET organization_id = id;
UPDATE user_tenants SET organization_id = tenant_id;
UPDATE agents SET organization_id = tenant_id;
-- ... repeat for all tables
```

### Phase 2: Update Foreign Keys
```sql
-- Add new foreign key constraints
ALTER TABLE agents 
  ADD CONSTRAINT agents_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);
-- ... repeat for all tables
```

### Phase 3: Update Application Code
- Update all TypeScript types
- Update all API routes
- Update all component queries
- Update RLS policies
- Update migration files

### Phase 4: Remove Old Columns (Breaking)
```sql
-- Drop old foreign keys
-- Drop old columns
-- Drop old tables
```

## Risks

### High Risk
1. **Breaking Changes**: Existing deployments will break
2. **Data Loss Risk**: Complex migration with multiple steps
3. **Downtime**: Requires application downtime during migration
4. **Rollback Complexity**: Difficult to rollback if issues occur

### Medium Risk
1. **TypeScript Types**: Need to regenerate Supabase types
2. **RLS Policies**: All policies need updating
3. **API Compatibility**: Breaking change for any external integrations

### Low Risk
1. **Code Updates**: Mechanical find/replace (but extensive)
2. **Testing**: Need comprehensive testing

## Recommendation

**DO NOT RENAME** database fields for the following reasons:

1. **Industry Standard**: "Tenant" is a well-understood technical term in multi-tenant systems
2. **Separation of Concerns**: Database schema is an implementation detail separate from UI terminology
3. **Risk vs. Benefit**: High risk, low benefit (users don't see database column names)
4. **Maintenance Burden**: Significant ongoing maintenance for minimal gain
5. **Best Practice**: Many successful SaaS platforms use different terminology in DB vs UI

## Alternative Approach (Recommended)

Keep database terminology as-is and use mapping layers:

```typescript
// Database layer (internal)
interface Tenant {
  id: string;
  tenant_id: string;
}

// Application layer (mapping)
interface Organization {
  id: string;
  organizationId: string;
}

// UI layer (user-facing)
// Already using "Organization" terminology
```

This provides:
- ✅ Clear separation between DB and UI
- ✅ No breaking changes
- ✅ Industry-standard terminology in database
- ✅ User-friendly terminology in UI
- ✅ Easier maintenance

## Conclusion

The current approach (UI uses "Organization", database uses "tenant") is the recommended best practice. Database column names are implementation details that don't need to match user-facing terminology.

