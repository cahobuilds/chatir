# Phase 2 Quick Test Checklist

## ✅ Pre-Test Verification

### 1. Check Migration Status
```bash
# Verify migration is ready
cd /Users/foo/projects/aI-multi-tenant-saas
supabase migration list
```

**Expected**: Migration `20251113000002_add_reseller_billing_tracking.sql` should be listed

### 2. Apply Migration (if not already applied)
```bash
supabase db push
```

**Expected**: Migration applies successfully without errors

### 3. Verify Database Schema
```sql
-- Check if new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'interactions' 
  AND column_name IN ('reseller_tenant_id', 'cost_breakdown');

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('get_reseller_tenant_id', 'get_reseller_retell_config');
```

## 🧪 Test Scenarios

### Test 1: UI Visibility (Reseller)
1. **Setup**: Ensure you have a tenant with `is_reseller = true`
2. **Action**: Log in as admin user for that reseller tenant
3. **Navigate**: Go to `/tenant-settings`
4. **Expected Result**: 
   - ✅ "Retell AI Integration" section is visible
   - ✅ Can enter Retell API key
   - ✅ Can save Retell API key
   - ✅ Can sync agents

### Test 2: UI Visibility (Organization)
1. **Setup**: Ensure you have an organization tenant (`is_reseller = false` or `NULL`) with `parent_id` pointing to a reseller
2. **Action**: Log in as admin user for that organization tenant
3. **Navigate**: Go to `/tenant-settings`
4. **Expected Result**: 
   - ❌ "Retell AI Integration" section is NOT visible
   - ✅ Other settings (name, logo) are still visible

### Test 3: API - Organization Cannot Update Retell Key
```bash
# Replace <org-id> with an organization tenant ID
curl -X PATCH https://ai-multi-tenant-saas.vercel.app/api/tenants/<org-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"retell_api_key": "test-key"}'
```

**Expected**: 
- Status: 403 Forbidden
- Error message: "Only resellers can configure Retell API keys..."

### Test 4: API - Reseller Can Update Retell Key
```bash
# Replace <reseller-id> with a reseller tenant ID
curl -X PATCH https://ai-multi-tenant-saas.vercel.app/api/tenants/<reseller-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"retell_api_key": "your-actual-retell-api-key"}'
```

**Expected**: 
- Status: 200 OK
- Tenant updated successfully

### Test 5: API - Retell Routes Use Reseller Config
```bash
# Replace <org-id> with an organization tenant ID
curl "https://ai-multi-tenant-saas.vercel.app/api/retell/agents?tenant_id=<org-id>" \
  -H "Cookie: your-session-cookie"
```

**Expected**: 
- If reseller has Retell API key: Returns agents list
- If reseller has no API key: Error "Retell AI not configured for this organization's reseller..."

### Test 6: Database - Reseller Lookup
```sql
-- Test with an organization tenant ID
SELECT get_reseller_tenant_id('<organization-tenant-id>');
SELECT get_reseller_retell_config('<organization-tenant-id>');
```

**Expected**: 
- Returns reseller tenant ID (if organization has parent)
- Returns Retell API key (if reseller has it configured)

## 🔍 Quick Verification Queries

### Check Current Setup
```sql
-- List all resellers
SELECT id, name, is_reseller, retell_api_key IS NOT NULL as has_retell_key
FROM tenants
WHERE is_reseller = true;

-- List organizations and their resellers
SELECT 
  o.id as org_id,
  o.name as org_name,
  o.parent_id,
  r.id as reseller_id,
  r.name as reseller_name,
  r.retell_api_key IS NOT NULL as reseller_has_retell_key
FROM tenants o
LEFT JOIN tenants r ON o.parent_id = r.id AND r.is_reseller = true
WHERE o.is_reseller != true OR o.is_reseller IS NULL;
```

### Verify Migration Applied
```sql
-- Check interactions table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'interactions'
  AND column_name IN ('reseller_tenant_id', 'cost_breakdown');

-- Check billing_records table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'billing_records'
  AND column_name IN ('reseller_tenant_id', 'cost_breakdown');
```

## 🐛 Troubleshooting

### Issue: "Migration already applied"
**Solution**: This is fine! The migration uses `IF NOT EXISTS` so it's safe to run multiple times.

### Issue: Organizations can still see Retell settings
**Check**:
1. Verify `is_reseller` is set correctly: `SELECT id, name, is_reseller FROM tenants WHERE id = '<tenant-id>'`
2. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
3. Check browser console for errors

### Issue: API returns "Retell AI not configured"
**Check**:
1. Verify reseller has API key: `SELECT id, name, retell_api_key IS NOT NULL FROM tenants WHERE is_reseller = true`
2. Verify organization's parent: `SELECT id, name, parent_id FROM tenants WHERE id = '<org-id>'`
3. Test function: `SELECT get_reseller_retell_config('<org-id>')`

## ✅ Success Criteria

- [ ] Migration applied successfully
- [ ] Resellers can see Retell settings in UI
- [ ] Organizations cannot see Retell settings in UI
- [ ] Organizations cannot update Retell API key via API
- [ ] Resellers can update Retell API key via API
- [ ] Retell API routes use reseller config
- [ ] PostgreSQL helper functions work
- [ ] `reseller_tenant_id` tracked in interactions

## 📝 Test Results Template

```
Date: ___________
Tester: ___________

Migration Status: [ ] Applied [ ] Not Applied
Resellers Found: ___
Organizations Found: ___

Test 1 (UI - Reseller): [ ] Pass [ ] Fail
Test 2 (UI - Organization): [ ] Pass [ ] Fail
Test 3 (API - Org Update): [ ] Pass [ ] Fail
Test 4 (API - Reseller Update): [ ] Pass [ ] Fail
Test 5 (API - Retell Routes): [ ] Pass [ ] Fail
Test 6 (DB - Lookup): [ ] Pass [ ] Fail

Notes:
_______________________________________
_______________________________________
```

