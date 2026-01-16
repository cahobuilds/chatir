# Railway Service Creation Implementation

This document describes the implementation of Railway service creation functionality for the Notion MCP integration.

## Overview

The implementation allows system administrators to create Railway services within an existing Railway project, configure them with Notion tokens, and assign them to agents. This replaces the need to create a new Railway project for each tenant.

## Architecture

### Database Schema

Three new tables have been created:

1. **`notion_resources`** - Stores Notion account/token information per tenant
2. **`notion_mcp_services`** - Stores Railway service information and status
3. **`agent_notion_services`** - Junction table for many-to-many agent-to-service assignments

See `supabase/migrations/20250122000000_create_notion_mcp_tables.sql` for the complete schema.

### Key Components

#### 1. Encryption Utility (`src/lib/encryption.ts`)

- Uses AES-256-GCM for authenticated encryption
- Encrypts Notion tokens before storing in database
- Requires `ENCRYPTION_KEY` environment variable (64 hex characters)

#### 2. Railway API Client (`src/lib/railway.ts`)

- GraphQL client for Railway API
- Functions for service creation, deployment, variable management
- Requires `RAILWAY_API_TOKEN` and `RAILWAY_PROJECT_ID` environment variables

#### 3. API Endpoints

**Railway Service Management** (System Admin Only):
- `POST /api/railway/services` - Create new service
- `GET /api/railway/services` - List services (filtered by tenant)
- `GET /api/railway/services/:id` - Get service details
- `PATCH /api/railway/services/:id` - Update service
- `DELETE /api/railway/services/:id` - Delete service
- `POST /api/railway/services/:id/deploy` - Trigger deployment
- `GET /api/railway/services/:id/health` - Check service health

**Notion Resource Management** (Tenant Admin):
- `POST /api/notion/resources` - Create Notion resource
- `GET /api/notion/resources` - List resources
- `GET /api/notion/resources/:id` - Get resource details
- `PATCH /api/notion/resources/:id` - Update resource (including token rotation)
- `DELETE /api/notion/resources/:id` - Delete resource

**Agent Service Assignment** (Tenant Admin):
- `POST /api/agents/:agentId/notion-services` - Assign service to agent
- `GET /api/agents/:agentId/notion-services` - Get agent's assigned services
- `PATCH /api/agents/:agentId/notion-services/:serviceId` - Update assignment
- `DELETE /api/agents/:agentId/notion-services/:serviceId` - Remove assignment

## Environment Variables

Add these to your `.env.local` (development) and production environment:

```env
# Railway API Configuration
RAILWAY_API_TOKEN=your-railway-api-token
RAILWAY_PROJECT_ID=your-railway-project-id

# Encryption Key (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-64-character-hex-encryption-key
```

### Getting Railway Credentials

1. **Railway API Token**:
   - Go to Railway Dashboard → Settings → Tokens
   - Create a new token with appropriate permissions
   - Copy the token value

2. **Railway Project ID**:
   - Go to your Railway project
   - The project ID is in the URL: `https://railway.app/project/{PROJECT_ID}`
   - Or use Railway CLI: `railway project`

3. **Encryption Key**:
   - Generate a secure key: `openssl rand -hex 32`
   - This will output a 64-character hex string
   - **IMPORTANT**: Keep this key secure and never commit it to version control

## Service Creation Flow

1. **Tenant Admin** creates a Notion resource via `POST /api/notion/resources`
   - Provides Notion API token
   - Token is encrypted and stored

2. **System Admin** creates a Railway service via `POST /api/railway/services`
   - Selects tenant and Notion resource
   - Service is created in Railway project
   - `NOTION_TOKEN` environment variable is set
   - Deployment is triggered automatically
   - Database record is created with status `creating`

3. **Deployment Process** (async):
   - Service status updates to `deploying`
   - Railway assigns domain/URL
   - Service becomes available
   - Status updates to `active` (manual or via health check)

4. **Tenant Admin** assigns service to agents via `POST /api/agents/:agentId/notion-services`
   - Agent configuration is updated with MCP service URL
   - Assignment is stored in `agent_notion_services` table

## Security Considerations

1. **Token Encryption**: All Notion tokens are encrypted at rest using AES-256-GCM
2. **Access Control**: 
   - System admins can manage Railway services
   - Tenant admins can manage their Notion resources and agent assignments
   - RLS policies enforce tenant isolation
3. **Railway API Token**: Stored server-side only, never exposed to frontend
4. **Tenant Isolation**: Services and resources are tenant-scoped via RLS

## Service Naming Convention

Services are named using the format:
```
notion-{tenant-id-short}-{service-name}
```

Example: `notion-abc12345-main-workspace`

This ensures:
- Uniqueness across the Railway project
- Easy identification of tenant ownership
- Human-readable names in Railway dashboard

## Health Checks

Services should implement a `/health` endpoint that returns:
- `200 OK` when healthy
- Service metadata (optional)

The health check endpoint (`GET /api/railway/services/:id/health`) will:
- Call the service's health endpoint
- Update `last_health_check` and `health_check_status` in database
- Return health status and response time

## Error Handling

All endpoints include comprehensive error handling:
- Authentication/authorization checks
- Input validation
- Database transaction safety
- Railway API error handling
- Structured logging via `logger` utility

## Database Migration

To apply the database schema:

```bash
# Using Supabase CLI
supabase db push

# Or manually via SQL Editor
# Copy contents of supabase/migrations/20250122000000_create_notion_mcp_tables.sql
```

## Testing

### 1. Create Notion Resource

```bash
curl -X POST http://localhost:3000/api/notion/resources \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "tenant_id": "your-tenant-id",
    "name": "Main Workspace",
    "notion_token": "your-notion-token",
    "description": "Primary Notion workspace"
  }'
```

### 2. Create Railway Service

```bash
curl -X POST http://localhost:3000/api/railway/services \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "tenant_id": "your-tenant-id",
    "notion_resource_id": "notion-resource-id",
    "service_name": "Main Workspace",
    "description": "Primary knowledge base service"
  }'
```

### 3. Assign Service to Agent

```bash
curl -X POST http://localhost:3000/api/agents/agent-id/notion-services \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "notion_mcp_service_id": "service-id",
    "priority": 0
  }'
```

## Next Steps

1. **Apply Database Migration**: Run the migration to create the new tables
2. **Set Environment Variables**: Add Railway API credentials and encryption key
3. **Test Service Creation**: Create a test Notion resource and Railway service
4. **Implement UI**: Create admin interfaces for service management
5. **Health Check Monitoring**: Set up background job for periodic health checks
6. **Service Lifecycle Automation**: Implement automatic status updates based on deployment status

## Troubleshooting

### Service Creation Fails

- Check Railway API token is valid
- Verify Railway project ID is correct
- Check Railway API rate limits
- Review logs for detailed error messages

### Token Encryption Errors

- Verify `ENCRYPTION_KEY` is set and is 64 hex characters
- Check that existing tokens were encrypted with the same key
- Regenerate encryption key if needed (will require re-encrypting all tokens)

### Health Check Failures

- Verify service has `/health` endpoint
- Check service is deployed and running
- Review service logs in Railway dashboard
- Ensure service URL is correctly set in database

## Related Documentation

- `docs/RAILWAY_SERVICE_CREATION_ADVISORY.md` - Architecture analysis
- `docs/NOTION_MCP_INTEGRATION_ARCHITECTURE.md` - Integration architecture
- Railway API Documentation: https://docs.railway.app/reference/public-api

