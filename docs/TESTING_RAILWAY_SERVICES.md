# Testing Railway Service Creation

This guide walks you through testing the Railway service creation functionality step by step.

## Prerequisites

✅ Database migration applied  
✅ Railway environment variables set (`RAILWAY_API_TOKEN`, `RAILWAY_PROJECT_ID`)  
✅ You have a Notion API token  
✅ You're logged in as a system admin or tenant admin  

## Testing Workflow

### Step 1: Get Your Authentication Token

You'll need to authenticate to use the API. Here are two methods:

#### Method A: Using Browser DevTools (Easiest)

1. Open your app in the browser and log in
2. Open DevTools (F12) → Application/Storage → Cookies
3. Find your session cookie (usually `sb-<project-id>-auth-token` or similar)
4. Copy the cookie value

#### Method B: Using Supabase Client

If you have Supabase CLI access, you can get a session token programmatically.

### Step 2: Get Your Tenant ID

You need your tenant ID for the API calls. You can:

1. **Via API**:
```bash
curl -X GET http://localhost:3000/api/tenants \
  -H "Cookie: your-auth-cookie"
```

2. **Via Database**: Query the `tenants` table in Supabase

3. **Via UI**: Check the URL when viewing tenant settings - the tenant ID is usually in the URL

### Step 3: Create a Notion Resource

First, create a Notion resource (this stores your Notion token):

```bash
curl -X POST http://localhost:3000/api/notion/resources \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "tenant_id": "YOUR_TENANT_ID",
    "name": "Test Notion Workspace",
    "notion_token": "secret_YOUR_NOTION_TOKEN",
    "description": "Test workspace for Railway integration"
  }'
```

**Expected Response:**
```json
{
  "resource": {
    "id": "uuid-here",
    "tenant_id": "your-tenant-id",
    "name": "Test Notion Workspace",
    "status": "active",
    "created_at": "2025-01-22T...",
    ...
  }
}
```

**Save the `id` from the response - you'll need it for the next step!**

### Step 4: Create a Railway Service

Now create a Railway service using the Notion resource:

```bash
curl -X POST http://localhost:3000/api/railway/services \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "tenant_id": "YOUR_TENANT_ID",
    "notion_resource_id": "NOTION_RESOURCE_ID_FROM_STEP_3",
    "service_name": "test-workspace",
    "description": "Test Railway service for Notion MCP"
  }'
```

**Expected Response:**
```json
{
  "id": "service-uuid",
  "railway_service_id": "railway-service-uuid",
  "railway_service_name": "notion-abc12345-test-workspace",
  "service_url": null,
  "status": "creating",
  ...
}
```

**Note**: The service will be in `creating` status initially. Railway will deploy it, which takes 2-5 minutes.

### Step 5: Check Service Status

Monitor the service creation:

```bash
curl -X GET http://localhost:3000/api/railway/services/SERVICE_ID \
  -H "Cookie: your-auth-cookie"
```

Check the `status` field:
- `creating` - Service is being created
- `deploying` - Deployment in progress
- `active` - Service is live
- `error` - Something went wrong

### Step 6: Trigger Deployment (if needed)

If the service is stuck in `creating`, you can manually trigger deployment:

```bash
curl -X POST http://localhost:3000/api/railway/services/SERVICE_ID/deploy \
  -H "Cookie: your-auth-cookie"
```

### Step 7: Check Service Health

Once the service is deployed, check its health:

```bash
curl -X GET http://localhost:3000/api/railway/services/SERVICE_ID/health \
  -H "Cookie: your-auth-cookie"
```

**Expected Response:**
```json
{
  "status": "healthy",
  "last_check": "2025-01-22T...",
  "response_time_ms": 123
}
```

### Step 8: List All Services

View all services for your tenant:

```bash
curl -X GET "http://localhost:3000/api/railway/services?tenant_id=YOUR_TENANT_ID" \
  -H "Cookie: your-auth-cookie"
```

### Step 9: Assign Service to an Agent

Get an agent ID first:

```bash
curl -X GET http://localhost:3000/api/agents \
  -H "Cookie: your-auth-cookie"
```

Then assign the service:

```bash
curl -X POST http://localhost:3000/api/agents/AGENT_ID/notion-services \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "notion_mcp_service_id": "SERVICE_ID",
    "priority": 0
  }'
```

### Step 10: Verify Agent Assignment

Check which services are assigned to an agent:

```bash
curl -X GET http://localhost:3000/api/agents/AGENT_ID/notion-services \
  -H "Cookie: your-auth-cookie"
```

## Testing Checklist

- [ ] Create Notion resource
- [ ] Create Railway service
- [ ] Verify service appears in Railway dashboard
- [ ] Check service status updates
- [ ] Verify service URL is set
- [ ] Test health check endpoint
- [ ] Assign service to agent
- [ ] Verify agent configuration includes MCP service URL
- [ ] List all services
- [ ] Test service deletion (optional)

## Common Issues & Solutions

### Issue: "Unauthorized" Error

**Solution**: Make sure you're logged in and using the correct auth cookie. The cookie must be from an active session.

### Issue: "Forbidden: System admin access required"

**Solution**: You need to be a system admin or super admin to create Railway services. Check your role in the `user_tenants` table.

### Issue: Service Status Stuck in "creating"

**Solution**: 
1. Check Railway dashboard to see if service was created
2. Manually trigger deployment: `POST /api/railway/services/:id/deploy`
3. Check Railway API logs for errors

### Issue: "Railway API error"

**Solution**:
1. Verify `RAILWAY_API_TOKEN` is set correctly
2. Check token has proper permissions
3. Verify `RAILWAY_PROJECT_ID` is correct
4. Check Railway API status

### Issue: "Failed to encrypt Notion token"

**Solution**: 
- In development: This should use the fallback key automatically
- In production: Make sure `ENCRYPTION_KEY` is set (64 hex characters)

## Using Postman or Insomnia

If you prefer a GUI tool:

1. **Set up Environment Variables**:
   - `base_url`: `http://localhost:3000`
   - `auth_cookie`: Your session cookie
   - `tenant_id`: Your tenant ID

2. **Create Requests**:
   - Use the curl commands above as templates
   - Replace placeholders with environment variables
   - Add the cookie to the request headers

## Next Steps After Testing

Once testing is successful:

1. **Create UI Components**: Build admin interfaces for:
   - Notion resource management
   - Railway service creation/management
   - Agent service assignment

2. **Set Up Monitoring**: 
   - Background job for health checks
   - Alerts for service failures

3. **Production Deployment**:
   - Set `ENCRYPTION_KEY` in production
   - Test with real Notion tokens
   - Monitor Railway service costs

## Quick Test Script

Save this as `test-railway-api.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:3000"
COOKIE="your-auth-cookie-here"
TENANT_ID="your-tenant-id-here"
NOTION_TOKEN="secret_your-notion-token"

echo "Step 1: Creating Notion resource..."
RESOURCE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/notion/resources" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d "{
    \"tenant_id\": \"$TENANT_ID\",
    \"name\": \"Test Workspace\",
    \"notion_token\": \"$NOTION_TOKEN\",
    \"description\": \"Test\"
  }")

RESOURCE_ID=$(echo $RESOURCE_RESPONSE | jq -r '.resource.id')
echo "Created resource: $RESOURCE_ID"

echo "Step 2: Creating Railway service..."
SERVICE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/railway/services" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d "{
    \"tenant_id\": \"$TENANT_ID\",
    \"notion_resource_id\": \"$RESOURCE_ID\",
    \"service_name\": \"test-service\",
    \"description\": \"Test service\"
  }")

SERVICE_ID=$(echo $SERVICE_RESPONSE | jq -r '.id')
echo "Created service: $SERVICE_ID"
echo "Response: $SERVICE_RESPONSE"

echo "Step 3: Checking service status..."
curl -s -X GET "$BASE_URL/api/railway/services/$SERVICE_ID" \
  -H "Cookie: $COOKIE" | jq '.'
```

Make it executable: `chmod +x test-railway-api.sh`

