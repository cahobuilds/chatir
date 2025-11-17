# Phase 1 Implementation - Reseller Billing Tracking

## Completed Tasks

### 1. Database Migration ✅
**File**: `supabase/migrations/20251113000002_add_reseller_billing_tracking.sql`

**Changes**:
- Added `reseller_tenant_id` column to `interactions` table
- Added `cost_breakdown` JSONB column to `interactions` table
- Added `reseller_tenant_id` column to `billing_records` table
- Added `cost_breakdown` JSONB column to `billing_records` table
- Created indexes for efficient queries
- Created PostgreSQL helper functions:
  - `get_reseller_tenant_id(UUID)` - Traverses tenant hierarchy to find reseller
  - `get_reseller_retell_config(UUID)` - Gets Retell API key from reseller

### 2. TypeScript Helper Functions ✅
**File**: `src/lib/reseller.ts`

**Functions Created**:
- `getResellerTenantId(organizationTenantId)` - Gets reseller tenant ID for an organization
- `getResellerRetellConfig(organizationTenantId)` - Gets Retell API key from reseller
- `isReseller(tenantId)` - Checks if a tenant is a reseller
- `getResellerOrganizations(resellerTenantId)` - Gets all organizations under a reseller

### 3. TypeScript Types Updated ✅
**File**: `src/lib/supabase/types.ts`

**Changes**:
- Added `is_reseller: boolean | null` to `tenants` table type
- Added `reseller_tenant_id: string | null` to `interactions` table type
- Added `cost_breakdown: Json` to `interactions` table type
- Added `reseller_tenant_id: string | null` to `billing_records` table type
- Added `cost_breakdown: Json` to `billing_records` table type

## Database Schema Changes

### Interactions Table
```sql
ALTER TABLE interactions 
  ADD COLUMN reseller_tenant_id UUID REFERENCES tenants(id),
  ADD COLUMN cost_breakdown JSONB DEFAULT '{}'::jsonb;
```

### Billing Records Table
```sql
ALTER TABLE billing_records
  ADD COLUMN reseller_tenant_id UUID REFERENCES tenants(id),
  ADD COLUMN cost_breakdown JSONB DEFAULT '{}'::jsonb;
```

## Usage Examples

### Get Reseller Retell Config
```typescript
import { getResellerRetellConfig } from '@/lib/reseller';

// Get Retell API key for an organization
const retellApiKey = await getResellerRetellConfig(organizationTenantId);
if (retellApiKey) {
  // Use the reseller's Retell API key
  const retellClient = createRetellClient(retellApiKey);
}
```

### Get Reseller Tenant ID
```typescript
import { getResellerTenantId } from '@/lib/reseller';

// Get reseller tenant ID for billing aggregation
const resellerTenantId = await getResellerTenantId(organizationTenantId);
if (resellerTenantId) {
  // Use for billing queries
  const { data: billing } = await supabase
    .from('billing_records')
    .select('*')
    .eq('reseller_tenant_id', resellerTenantId);
}
```

### Check if Tenant is Reseller
```typescript
import { isReseller } from '@/lib/reseller';

const isResellerTenant = await isReseller(tenantId);
if (isResellerTenant) {
  // Show Resell configuration UI
}
```

## Next Steps (Phase 2)

1. Update all Retell API routes to use `getResellerRetellConfig()`
2. Update `TenantConfiguration` component to hide Retell settings from organization admins
3. Implement webhook handler to track cost breakdown per interaction
4. Create billing aggregation job

## Testing

To test the migration:
```bash
# Apply migration
supabase db push

# Test helper functions
npm run dev
# Then test in browser console or API routes
```

## Notes

- The migration is backward compatible (uses `IF NOT EXISTS`)
- Existing data will have `NULL` for new columns until populated
- Helper functions handle cases where no reseller is found (returns `null`)

