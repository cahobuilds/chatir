# Quick Testing Guide - Railway Service Creation

## What You've Done ✅

1. ✅ Database migration applied
2. ✅ Railway environment variables set
3. ✅ Notion MCP integration setup

## What's Left to Test

The API endpoints are ready, but there's **no UI yet**. You can test via:

1. **Browser DevTools Console** (Easiest - recommended)
2. **Postman/Insomnia** (GUI tool)
3. **curl commands** (Command line)

## Quick Test via Browser Console

### Step 1: Open Your App & Login

1. Open your app in the browser (e.g., `http://localhost:3000`)
2. Log in as a system admin or tenant admin
3. Open DevTools (F12) → Console tab

### Step 2: Get Your Tenant ID

Run this in the console:

```javascript
// Get your current organization/tenant
const response = await fetch('/api/tenants');
const data = await response.json();
const tenantId = data.tenants[0]?.tenant_id || data.tenants[0]?.tenants?.id;
console.log('Tenant ID:', tenantId);
```

### Step 3: Create a Notion Resource

```javascript
const tenantId = 'YOUR_TENANT_ID_FROM_STEP_2';
const notionToken = 'secret_YOUR_NOTION_TOKEN'; // Get from Notion settings

const response = await fetch('/api/notion/resources', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenant_id: tenantId,
    name: 'Test Notion Workspace',
    notion_token: notionToken,
    description: 'Test workspace'
  })
});

const data = await response.json();
console.log('Notion Resource:', data);
const resourceId = data.resource.id;
```

### Step 4: Create a Railway Service

```javascript
const resourceId = 'RESOURCE_ID_FROM_STEP_3';

const response = await fetch('/api/railway/services', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenant_id: tenantId,
    notion_resource_id: resourceId,
    service_name: 'test-service',
    description: 'Test Railway service'
  })
});

const data = await response.json();
console.log('Railway Service:', data);
const serviceId = data.id;
```

### Step 5: Check Service Status

```javascript
const serviceId = 'SERVICE_ID_FROM_STEP_4';

const response = await fetch(`/api/railway/services/${serviceId}`);
const data = await response.json();
console.log('Service Status:', data.service.status);
console.log('Service URL:', data.service.service_url);
```

### Step 6: List All Services

```javascript
const response = await fetch(`/api/railway/services?tenant_id=${tenantId}`);
const data = await response.json();
console.log('All Services:', data.services);
```

## Verify in Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app)
2. Open your project (ID: `471386cf-d433-426e-a30e-a35532a0f7ec`)
3. You should see a new service named like `notion-xxxxx-test-service`
4. Check the service is deploying/running

## What to Check

✅ **Service Created**: Service appears in Railway dashboard  
✅ **Environment Variable Set**: Check service settings → `NOTION_TOKEN` is set  
✅ **Service URL**: Service gets a domain (e.g., `https://notion-xxx.railway.app`)  
✅ **Database Record**: Service record exists in `notion_mcp_services` table  
✅ **Status Updates**: Service status changes from `creating` → `deploying` → `active`  

## Common Issues

### "Forbidden: System admin access required"
- **Fix**: Make sure you're logged in as `system_admin` or `super_admin`
- Check your role: `SELECT * FROM user_tenants WHERE user_id = 'your-user-id'`

### "Railway API error"
- **Fix**: Verify `RAILWAY_API_TOKEN` is correct in Vercel
- Check token permissions in Railway dashboard

### Service stuck in "creating"
- **Fix**: 
  1. Check Railway dashboard - service might be created but not deployed
  2. Manually trigger: `POST /api/railway/services/:id/deploy`
  3. Wait 2-5 minutes for deployment

## Next Steps

Once testing works:

1. **Create UI Pages** for:
   - `/admin/notion-resources` - Manage Notion resources
   - `/admin/railway-services` - Manage Railway services
   - Agent settings page - Assign services to agents

2. **Add Monitoring**:
   - Background job for health checks
   - Status updates based on Railway deployment status

3. **Production Ready**:
   - Set `ENCRYPTION_KEY` in production
   - Test with real Notion tokens
   - Monitor costs

## Full Testing Guide

For detailed curl commands and troubleshooting, see:
- `docs/TESTING_RAILWAY_SERVICES.md`

