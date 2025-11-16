# Reseller/Partner Architecture

## Overview

The platform is architected to support a reseller/partner model in the future. The current multi-tenant structure already provides the foundation needed for reseller functionality.

## Current State

✅ **Reseller-Ready Foundation**
- `tenants` table with `parent_id` for hierarchy
- `is_reseller` boolean flag added (default: false)
- All data tables use `tenant_id` for isolation
- RLS policies enforce tenant-level security
- Billing structure supports per-tenant charges

## Architecture

### Database Structure

```sql
-- Tenants table supports reseller model
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES tenants(id),  -- Enables hierarchy
  is_reseller BOOLEAN DEFAULT false,      -- Marks reseller accounts
  -- ... other fields
);
```

### Hierarchy Model

```
Platform Level (system_admin)
│
├── Direct Organizations (parent_id = NULL, is_reseller = false)
│   └── Organizations that sign up directly (no reseller)
│
└── Resellers (parent_id = NULL, is_reseller = true)
    └── Organizations (parent_id = reseller_id, is_reseller = false)
        └── Customer organizations managed by reseller
```

### Data Isolation

All tables use `tenant_id` for complete isolation:
- ✅ `agents` → `tenant_id`
- ✅ `interactions` → `tenant_id`
- ✅ `billing_records` → `tenant_id`
- ✅ `user_tenants` → `tenant_id`

This ensures:
- Resellers can only see their organizations
- Organizations can only see their own data
- Platform admins can see everything
- RLS policies enforce isolation automatically

## Future Implementation

### Phase 1: Reseller Account Creation
- Add UI to mark tenant as reseller
- Add reseller settings (commission rate, billing model)
- Create reseller dashboard

### Phase 2: Organization Management
- Reseller can create organizations
- Organization signup flow under reseller
- Reseller can view/manage their organizations

### Phase 3: Revenue Sharing
- Track usage per organization
- Calculate reseller commissions
- Generate reseller reports

### Phase 4: White-Labeling
- Reseller branding for their organizations
- Custom domains per reseller
- Reseller-specific features

## Billing Models

### Option A: Reseller Pays (Aggregated)
- Organizations billed to reseller
- Reseller pays platform
- Reseller marks up to organizations

### Option B: Direct Billing (Pass-Through)
- Organizations billed directly
- Reseller gets commission/reporting
- Platform handles all payments

### Option C: Hybrid
- Configurable per reseller
- Some orgs billed to reseller, others direct

**Recommendation**: Start with Option B (direct billing), add Option A later.

## Migration Path

When ready to implement resellers:

1. **No Database Changes Needed** ✅
   - `is_reseller` field already exists
   - `parent_id` already supports hierarchy
   - All isolation already in place

2. **Add Reseller Settings**
   ```sql
   -- Add to tenants table (if needed)
   ALTER TABLE tenants 
   ADD COLUMN reseller_settings JSONB DEFAULT '{}'::jsonb;
   ```

3. **Build UI Features**
   - Reseller dashboard
   - Organization creation flow
   - Revenue reporting

4. **Add Roles** (if needed)
   - `reseller_admin` - manages reseller account
   - `organization_admin` - manages organization
   - `reseller_support` - reseller support staff

## Current Focus

🎯 **Build Agent Features First**

The platform is reseller-ready, but the focus should be on:
- Agent creation and configuration
- Agent training/knowledge base
- Call flows and conversation management
- Analytics and reporting
- Core product features

Reseller features can be added later when:
- Product is validated
- You have paying customers
- Reseller demand exists
- You have bandwidth for reseller features

## Key Principles

1. **Always use `tenant_id`** for data isolation (already done ✅)
2. **Use `parent_id`** for hierarchy (already supported ✅)
3. **RLS policies** enforce security (already in place ✅)
4. **Build core product first**, add resellers when needed

## Notes

- The `is_reseller` field is currently unused but ready for future implementation
- All existing code works with the current structure
- No breaking changes needed when adding reseller features
- The architecture is designed to support resellers without major refactoring

