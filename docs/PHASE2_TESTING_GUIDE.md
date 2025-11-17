# Phase 2 Testing Guide

## Overview

This guide helps you test the reseller-level Retell configuration implementation.

## Prerequisites

1. ✅ Migration applied (or ready to apply)
2. ✅ At least one tenant marked as reseller (`is_reseller = true`)
3. ✅ At least one organization tenant with `parent_id` pointing to a reseller
4. ✅ Reseller tenant has `retell_api_key` configured

## Test Setup

### Step 1: Apply Migration

```bash
cd /Users/foo/projects/aI-multi-tenant-saas
supabase db push
```

### Step 2: Create Test Data

If you don't have reseller/organization structure yet, create it:

```sql
-- Option 1: Mark existing tenant as reseller
UPDATE tenants 
SET is_reseller = true 
WHERE id = '<your-reseller-tenant-id>';

-- Option 2: Create a new reseller tenant
INSERT INTO tenants (name, is_reseller, retell_api_key)
VALUES ('Test Reseller', true, 'your-retell-api-key-here');

-- Create organization under reseller
INSERT INTO tenants (name, parent_id, is_reseller)
VALUES ('Test Organization', '<reseller-tenant-id>', false);
```

### Step 3: Run Test Script

```bash
npx tsx scripts/test-reseller-config.ts
```

## Manual Testing Checklist

### ✅ Test 1: Reseller Can See Retell Settings

1. Log in as a user with `tenant_admin` or `super_admin` role on a **reseller** tenant
2. Navigate to `/tenant-settings`
3. **Expected**: You should see "Retell AI Integration" section
4. **Expected**: You can enter and save Retell API key
5. **Expected**: You can click "Sync Agents from Retell AI"

### ✅ Test 2: Organization Cannot See Retell Settings

1. Log in as a user with `tenant_admin` or `super_admin` role on an **organization** tenant (not reseller)
2. Navigate to `/tenant-settings`
3. **Expected**: You should NOT see "Retell AI Integration" section
4. **Expected**: The section is completely hidden (not just disabled)

### ✅ Test 3: Organization Cannot Update Retell API Key via API

1. Log in as organization admin
2. Try to update `retell_api_key`:
```bash
curl -X PATCH https://your-domain.com/api/tenants/<org-id> \
  -H "Content-Type: application/json" \
  -d '{"retell_api_key": "test-key"}'
```
3. **Expected**: Error 403 with message "Only resellers can configure Retell API keys..."

### ✅ Test 4: Retell API Routes Use Reseller Config

1. As organization admin, try to list Retell agents:
```bash
curl "https://your-domain.com/api/retell/agents?tenant_id=<org-id>"
```
2. **Expected**: Should work if reseller has Retell API key configured
3. **Expected**: Should use reseller's API key, not organization's

### ✅ Test 5: Reseller Can Update Retell API Key

1. Log in as reseller admin
2. Update Retell API key via API:
```bash
curl -X PATCH https://your-domain.com/api/tenants/<reseller-id> \
  -H "Content-Type: application/json" \
  -d '{"retell_api_key": "new-key"}'
```
3. **Expected**: Should succeed (200 OK)

### ✅ Test 6: Organization Inherits Reseller Config

1. Configure Retell API key on reseller
2. As organization admin, try to sync agents:
```bash
curl -X POST https://your-domain.com/api/retell/agents/sync \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "<org-id>"}'
```
3. **Expected**: Should work using reseller's API key
4. **Expected**: Agents should sync successfully

### ✅ Test 7: Billing Tracking

1. Create a call as organization:
```bash
curl -X POST https://your-domain.com/api/retell/calls \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "<agent-id>",
    "from_number": "+1234567890",
    "to_number": "+0987654321"
  }'
```
2. Check interaction record:
```sql
SELECT id, tenant_id, reseller_tenant_id, retell_call_id
FROM interactions
WHERE retell_call_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;
```
3. **Expected**: `reseller_tenant_id` should be populated with reseller's ID

## Database Verification

### Check Reseller Structure

```sql
-- List all resellers
SELECT id, name, is_reseller, retell_api_key IS NOT NULL as has_retell_key
FROM tenants
WHERE is_reseller = true;

-- List organizations and their resellers
SELECT 
  o.id as org_id,
  o.name as org_name,
  r.id as reseller_id,
  r.name as reseller_name,
  r.retell_api_key IS NOT NULL as reseller_has_retell_key
FROM tenants o
LEFT JOIN tenants r ON o.parent_id = r.id AND r.is_reseller = true
WHERE o.is_reseller != true OR o.is_reseller IS NULL;
```

### Test PostgreSQL Functions

```sql
-- Test get_reseller_tenant_id function
SELECT get_reseller_tenant_id('<organization-tenant-id>');

-- Test get_reseller_retell_config function
SELECT get_reseller_retell_config('<organization-tenant-id>');
```

### Check Migration Applied

```sql
-- Verify new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interactions' 
  AND column_name IN ('reseller_tenant_id', 'cost_breakdown');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'billing_records' 
  AND column_name IN ('reseller_tenant_id', 'cost_breakdown');

-- Verify functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('get_reseller_tenant_id', 'get_reseller_retell_config');
```

## Common Issues

### Issue: Migration fails with "relation already exists"
**Solution**: The migration only adds columns, it shouldn't create tables. If you see this error, the initial schema migration may have already been applied. Check which migrations are applied.

### Issue: Organizations can still see Retell settings
**Solution**: 
1. Verify `is_reseller` is correctly set: `SELECT id, name, is_reseller FROM tenants WHERE id = '<tenant-id>'`
2. Check browser cache - hard refresh (Cmd+Shift+R)
3. Verify the component is checking `isResellerTenant` state

### Issue: API routes return "Retell AI not configured"
**Solution**:
1. Verify reseller has Retell API key: `SELECT id, name, retell_api_key IS NOT NULL FROM tenants WHERE is_reseller = true`
2. Verify organization's `parent_id` points to reseller: `SELECT id, name, parent_id FROM tenants WHERE id = '<org-id>'`
3. Test the helper function: `SELECT get_reseller_retell_config('<org-id>')`

### Issue: PostgreSQL functions not found
**Solution**: The migration may not have been applied. Run `supabase db push` to apply the migration.

## Success Criteria

✅ Resellers can see and configure Retell settings  
✅ Organizations cannot see Retell settings  
✅ Organizations cannot update Retell API key  
✅ All Retell API routes use reseller config  
✅ Organizations inherit Retell config from reseller  
✅ `reseller_tenant_id` is tracked in interactions  
✅ PostgreSQL helper functions work correctly  

## Next Steps

Once Phase 2 is verified:
- Proceed to Phase 3: Webhook handler and billing aggregation
- Or test with real Retell API keys and agents

