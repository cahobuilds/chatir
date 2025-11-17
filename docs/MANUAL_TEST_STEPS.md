# Phase 2 Manual Testing Steps

## Quick Start

### 1. Verify Migration Applied

Check if the migration columns exist:

```sql
-- In Supabase SQL Editor or via psql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'interactions' 
  AND column_name IN ('reseller_tenant_id', 'cost_breakdown');
```

**Expected**: Should return 2 rows

### 2. Setup Test Data

If you don't have reseller/organization structure:

```sql
-- Option A: Mark existing tenant as reseller
UPDATE tenants 
SET is_reseller = true 
WHERE id = '<your-tenant-id>';

-- Option B: Create new reseller
INSERT INTO tenants (name, is_reseller, retell_api_key)
VALUES ('Test Reseller', true, 'your-retell-api-key-here')
RETURNING id;

-- Create organization under reseller (use the reseller ID from above)
INSERT INTO tenants (name, parent_id, is_reseller)
VALUES ('Test Organization', '<reseller-id>', false);
```

### 3. Test UI Visibility

#### Test as Reseller Admin:
1. Log in as user with admin role on **reseller** tenant
2. Go to: `https://ai-multi-tenant-saas.vercel.app/tenant-settings`
3. **Expected**: See "Retell AI Integration" section

#### Test as Organization Admin:
1. Log in as user with admin role on **organization** tenant  
2. Go to: `https://ai-multi-tenant-saas.vercel.app/tenant-settings`
3. **Expected**: Do NOT see "Retell AI Integration" section

### 4. Test API Endpoints

#### Test Organization Cannot Update Retell Key:
```bash
# Get your session cookie from browser DevTools → Application → Cookies
curl -X PATCH https://ai-multi-tenant-saas.vercel.app/api/tenants/<org-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-<project>-auth-token=<your-token>" \
  -d '{"retell_api_key": "test-key"}'
```

**Expected**: `{"error":"Only resellers can configure Retell API keys..."}` with status 403

#### Test Reseller Can Update Retell Key:
```bash
curl -X PATCH https://ai-multi-tenant-saas.vercel.app/api/tenants/<reseller-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-<project>-auth-token=<your-token>" \
  -d '{"retell_api_key": "your-actual-key"}'
```

**Expected**: `{"tenant":{...}}` with status 200

#### Test Retell Routes Use Reseller Config:
```bash
curl "https://ai-multi-tenant-saas.vercel.app/api/retell/agents?tenant_id=<org-id>" \
  -H "Cookie: sb-<project>-auth-token=<your-token>"
```

**Expected**: Returns agents list if reseller has API key configured

### 5. Verify Database Functions

```sql
-- Test with an organization tenant ID
SELECT get_reseller_tenant_id('<organization-tenant-id>');
SELECT get_reseller_retell_config('<organization-tenant-id>');
```

**Expected**: Returns reseller ID and API key (if configured)

## ✅ Success Checklist

- [ ] Migration columns exist in database
- [ ] PostgreSQL functions exist
- [ ] Reseller can see Retell settings in UI
- [ ] Organization cannot see Retell settings in UI
- [ ] Organization cannot update Retell API key (403 error)
- [ ] Reseller can update Retell API key (200 success)
- [ ] Retell API routes work with organization tenant_id
- [ ] Database functions return correct values

## 🐛 Common Issues

**Issue**: Organizations still see Retell settings
- **Fix**: Hard refresh browser (Cmd+Shift+R)
- **Check**: Verify `is_reseller` is set correctly in database

**Issue**: API returns "Retell AI not configured"
- **Fix**: Ensure reseller has `retell_api_key` set
- **Check**: Verify organization's `parent_id` points to reseller

**Issue**: Migration not applied
- **Fix**: Run `supabase db push` from project root

