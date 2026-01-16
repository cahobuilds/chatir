# Railway Service Creation & Tenant-to-Agent Availability - Advisory

## Executive Summary

**YES, it is feasible to create new services in an existing Railway project and make each tenant's services available to their agents.** This document provides a comprehensive analysis of the approach, considerations, and recommendations based on Railway API capabilities and your existing multi-tenant architecture.

---

## Railway API Capabilities

### Service Creation in Existing Projects

Railway's Public API (GraphQL) supports creating new services within an existing project using the `serviceCreate` mutation. Key capabilities:

1. **Programmatic Service Creation**
   - Create services via API calls (not just UI)
   - Specify service name, source, and configuration
   - Set environment variables during creation
   - Automate service provisioning workflows

2. **Project Management**
   - Services belong to a project
   - Multiple services can exist in one project
   - Services are isolated but share project-level resources
   - Project-level billing and limits apply

3. **Service Configuration**
   - Set environment variables (e.g., `NOTION_TOKEN`)
   - Configure service source (GitHub repo, Docker image, etc.)
   - Set deployment triggers
   - Configure domains and networking

### Railway API Endpoints (GraphQL)

Based on Railway's Public API documentation:

```graphql
# Create a new service in an existing project
mutation {
  serviceCreate(
    projectId: "project-uuid"
    name: "notion-tenant-abc"
    source: {
      # GitHub repo, Docker image, or template
    }
  ) {
    id
    name
    projectId
  }
}

# Update service environment variables
mutation {
  variableUpsert(
    serviceId: "service-uuid"
    variables: [
      { name: "NOTION_TOKEN", value: "encrypted-token" }
    ]
  )
}

# Deploy service
mutation {
  deploymentCreate(
    serviceId: "service-uuid"
  ) {
    id
    status
  }
}
```

---

## Architecture Analysis

### Current System Context

Your platform has:
- **Multi-tenant structure**: `tenants` table with hierarchical support
- **Agent management**: `agents` table per tenant, linked to Retell AI
- **Knowledge base system**: `knowledge_bases` and `knowledge_base_sources` tables
- **RLS policies**: Tenant isolation enforced at database level
- **Role-based access**: System admins, tenant admins, and regular users

### Proposed Integration: Railway Services for Notion MCP

Based on the Notion MCP Integration Architecture document, the recommended approach is:

**Hybrid Service Pool Model** - System admins create Railway services in a shared pool, each configured with a tenant's Notion token, and assignable to one or more agents.

---

## Feasibility Assessment

### ✅ **Can Create Services in Existing Railway Project?**

**YES** - Railway API fully supports this:

1. **Technical Feasibility**: ✅
   - Railway GraphQL API provides `serviceCreate` mutation
   - Can specify project ID when creating service
   - No limitations on number of services per project (within Railway's plan limits)
   - Services are isolated within the project

2. **Implementation Approach**:
   ```
   System Admin Action → Backend API → Railway GraphQL API → Service Created
   ```

3. **Required Components**:
   - Railway API token (stored server-side, never exposed to frontend)
   - Railway project ID (can be stored in environment variables or database)
   - Service creation API endpoint (system admin only)
   - Service configuration (name, source, environment variables)

### ✅ **Can Make Each Tenant Available to Agents?**

**YES** - With proper architecture:

1. **Tenant-to-Service Mapping**: ✅
   - Each service is linked to a tenant via `notion_mcp_services.tenant_id`
   - Services are tenant-scoped (enforced via RLS)
   - Multiple services per tenant are supported

2. **Agent-to-Service Assignment**: ✅
   - Many-to-many relationship via `agent_notion_services` junction table
   - Agents can reference multiple Notion MCP services
   - Assignment is tenant-scoped (agents and services must belong to same tenant)

3. **Service Availability Flow**:
   ```
   Tenant → Notion Resource → Railway Service → Agent Assignment → Agent Configuration
   ```

---

## Recommended Implementation Strategy

### Phase 1: Railway Service Creation API

**Endpoint**: `POST /api/railway/services` (System Admin Only)

**Flow**:
1. System admin selects tenant and Notion resource
2. Backend validates permissions and tenant data
3. Backend calls Railway GraphQL API to create service
4. Backend sets `NOTION_TOKEN` environment variable
5. Backend triggers deployment
6. Backend creates `notion_mcp_services` database record
7. Backend monitors deployment status
8. Backend performs health check once service is live
9. Service becomes available for agent assignment

**Key Implementation Details**:

```typescript
// Pseudo-code structure
async function createRailwayService(
  projectId: string,
  tenantId: string,
  notionResourceId: string,
  serviceName: string
) {
  // 1. Get Notion token from notion_resources table
  const notionToken = await getNotionToken(notionResourceId);
  
  // 2. Create service via Railway API
  const service = await railwayAPI.mutate({
    mutation: SERVICE_CREATE,
    variables: {
      projectId,
      name: serviceName,
      source: { /* GitHub repo or template */ }
    }
  });
  
  // 3. Set environment variables
  await railwayAPI.mutate({
    mutation: VARIABLE_UPSERT,
    variables: {
      serviceId: service.id,
      variables: [
        { name: "NOTION_TOKEN", value: notionToken }
      ]
    }
  });
  
  // 4. Trigger deployment
  const deployment = await railwayAPI.mutate({
    mutation: DEPLOYMENT_CREATE,
    variables: { serviceId: service.id }
  });
  
  // 5. Create database record
  await supabase.from('notion_mcp_services').insert({
    tenant_id: tenantId,
    notion_resource_id: notionResourceId,
    railway_service_id: service.id,
    railway_service_name: serviceName,
    status: 'deploying',
    // ... other fields
  });
  
  // 6. Poll for deployment completion and health check
  await monitorDeployment(service.id);
  
  return service;
}
```

### Phase 2: Agent Assignment

**Endpoint**: `POST /api/agents/:agentId/notion-services` (Tenant Admin)

**Flow**:
1. Tenant admin selects agent and available Notion MCP services
2. Backend validates tenant ownership (agent and services belong to same tenant)
3. Backend creates `agent_notion_services` records
4. Backend updates agent configuration to include MCP service URLs
5. Backend syncs configuration to Retell AI (if needed)

**Key Implementation Details**:

```typescript
// Pseudo-code structure
async function assignServiceToAgent(
  agentId: string,
  notionServiceId: string,
  tenantId: string
) {
  // 1. Validate tenant ownership
  const agent = await getAgent(agentId);
  const service = await getNotionService(notionServiceId);
  
  if (agent.tenant_id !== tenantId || service.tenant_id !== tenantId) {
    throw new Error('Tenant mismatch');
  }
  
  // 2. Create assignment
  await supabase.from('agent_notion_services').insert({
    agent_id: agentId,
    notion_mcp_service_id: notionServiceId,
    tenant_id: tenantId,
    is_active: true
  });
  
  // 3. Update agent configuration with MCP service URL
  const serviceUrl = service.service_url;
  await updateAgentConfiguration(agentId, {
    mcp_services: [
      ...(agent.configuration?.mcp_services || []),
      { url: serviceUrl, id: notionServiceId }
    ]
  });
  
  // 4. Sync to Retell AI if needed
  if (agent.retell_agent_id) {
    await syncAgentToRetell(agentId);
  }
}
```

---

## Key Considerations

### 1. **Railway Project Structure**

**Option A: Single Shared Project** (Recommended for MVP)
- All tenant services in one Railway project
- Simpler management and billing
- Project-level limits apply to all services
- **Consideration**: Monitor service count and resource usage

**Option B: Multiple Projects** (For Scale)
- One project per tenant or tenant tier
- Better isolation and resource management
- More complex management
- **Consideration**: Higher Railway costs, more API calls needed

**Recommendation**: Start with **Option A** (single shared project), migrate to **Option B** if needed for scale or isolation requirements.

### 2. **Service Naming Convention**

To ensure uniqueness and traceability:

```
Format: notion-{tenant-id-short}-{resource-name}
Example: notion-abc123-main-workspace
Example: notion-xyz789-support-kb
```

**Benefits**:
- Easy to identify tenant ownership
- Prevents naming conflicts
- Supports multiple services per tenant
- Human-readable in Railway dashboard

### 3. **Service Lifecycle Management**

**Creation**:
- System admin creates service via UI
- Backend handles Railway API calls
- Database record tracks service state
- Health checks verify service is live

**Updates**:
- Token rotation: Update environment variable, redeploy
- Service configuration: Update via Railway API, sync to database
- Status monitoring: Poll Railway API for deployment status

**Deletion**:
- Check for active agent assignments
- Delete Railway service (optional, or mark inactive)
- Update database record status
- Clean up agent configurations

### 4. **Security & Isolation**

**Tenant Isolation**:
- RLS policies on `notion_mcp_services` table
- RLS policies on `agent_notion_services` table
- Validation: Agents and services must belong to same tenant
- Service URLs are tenant-scoped (not shared across tenants)

**Token Security**:
- Notion tokens encrypted at rest
- Tokens only accessible to system admins
- Tokens stored in Railway environment variables (encrypted by Railway)
- Audit logging for all token access

**Railway API Security**:
- Railway API token stored server-side only
- Never exposed to frontend
- Rate limiting on Railway API calls
- Error handling and retry logic

### 5. **Cost Management**

**Railway Pricing Considerations**:
- Each service has a base cost (depends on Railway plan)
- Services consume resources (CPU, memory, bandwidth)
- Monitor service count and usage
- Optimize by reusing services when possible

**Cost Optimization Strategies**:
1. **Service Reuse**: Multiple agents can share one service if they use the same Notion account
2. **Service Pooling**: Detect duplicate Notion tokens and reuse services
3. **Inactive Service Cleanup**: Mark unused services as inactive, delete after grace period
4. **Usage Monitoring**: Track which services are actively used by agents

### 6. **Error Handling & Resilience**

**Service Creation Failures**:
- Railway API errors (rate limits, network issues)
- Deployment failures
- Health check failures
- Database transaction rollback on failure

**Mitigation Strategies**:
- Retry logic with exponential backoff
- Transaction management (database rollback on Railway failure)
- Status tracking (`creating`, `deploying`, `active`, `error`)
- Error messages stored in database for debugging
- Admin notifications for failures

**Service Availability**:
- Health checks every 5-10 minutes
- Automatic retry on health check failure
- Status indicators in UI (healthy, unhealthy, unknown)
- Alert system admins on persistent failures

---

## Data Model Integration

### Required Tables (from Notion MCP Architecture)

1. **`notion_resources`**: Stores Notion tokens per tenant
2. **`notion_mcp_services`**: Stores Railway service information
3. **`agent_notion_services`**: Junction table for agent-to-service assignments

### Database Schema Considerations

**Service Status Tracking**:
```sql
status TEXT DEFAULT 'creating' CHECK (status IN (
  'creating',      -- Service being created
  'deploying',     -- Deployment in progress
  'active',        -- Service is live and healthy
  'inactive',      -- Service disabled
  'error'          -- Service creation/deployment failed
))
```

**Health Check Fields**:
```sql
last_health_check TIMESTAMPTZ,
health_check_status TEXT CHECK (health_check_status IN ('healthy', 'unhealthy', 'unknown')),
deployment_status TEXT,  -- Railway deployment status
```

**Service Metadata**:
```sql
railway_service_id TEXT NOT NULL UNIQUE,  -- Railway service UUID
railway_service_name TEXT NOT NULL,        -- Service name in Railway
service_url TEXT,                          -- https://service-name.railway.app
health_check_url TEXT,                     -- Service health endpoint
```

---

## API Design Recommendations

### Railway Service Management (System Admin Only)

```
POST   /api/railway/services
  Body: {
    tenant_id: string,
    notion_resource_id: string,
    service_name: string,
    description?: string
  }
  Response: {
    id: string,
    railway_service_id: string,
    service_url: string,
    status: 'creating' | 'deploying' | 'active' | 'error',
    ...
  }

GET    /api/railway/services
  Query: ?tenant_id=xxx (optional filter)
  Response: { services: [...] }

GET    /api/railway/services/:id
  Response: { service: {...} }

PATCH  /api/railway/services/:id
  Body: { description?, status? }
  Response: { service: {...} }

DELETE /api/railway/services/:id
  Response: { success: true }

POST   /api/railway/services/:id/deploy
  Response: { deployment: {...} }

GET    /api/railway/services/:id/health
  Response: {
    status: 'healthy' | 'unhealthy' | 'unknown',
    last_check: timestamp,
    response_time_ms: number
  }
```

### Agent Service Assignment (Tenant Admin)

```
POST   /api/agents/:agentId/notion-services
  Body: {
    notion_mcp_service_id: string,
    priority?: number,
    configuration?: object
  }
  Response: { assignment: {...} }

GET    /api/agents/:agentId/notion-services
  Response: { services: [...] }

DELETE /api/agents/:agentId/notion-services/:serviceId
  Response: { success: true }

PATCH  /api/agents/:agentId/notion-services/:serviceId
  Body: { priority?, configuration?, is_active? }
  Response: { assignment: {...} }
```

---

## Implementation Challenges & Solutions

### Challenge 1: Railway API Rate Limits

**Problem**: Railway API may have rate limits that could affect bulk service creation.

**Solution**:
- Implement rate limiting on your backend API
- Queue service creation requests
- Batch Railway API calls when possible
- Cache Railway project/service information
- Implement exponential backoff retry logic

### Challenge 2: Service Deployment Time

**Problem**: Railway service deployment can take 2-5 minutes, blocking user experience.

**Solution**:
- Return immediately with `status: 'deploying'`
- Poll deployment status in background
- Use Server-Sent Events (SSE) or WebSocket for real-time updates
- Show deployment progress in UI
- Send notification when deployment completes

### Challenge 3: Service Health Monitoring

**Problem**: Need to ensure services are healthy and available for agents.

**Solution**:
- Implement background job to check service health every 5-10 minutes
- Store health check results in database
- Show health status in UI
- Alert system admins on persistent failures
- Automatically retry failed health checks

### Challenge 4: Token Rotation

**Problem**: When Notion token is rotated, all services using that token need updating.

**Solution**:
- Find all services using the Notion resource
- Update Railway environment variables for each service
- Trigger redeployment for each service
- Update database records
- Verify health after redeployment

### Challenge 5: Service Cleanup

**Problem**: Unused services accumulate costs.

**Solution**:
- Track service usage (which agents use which services)
- Mark services as inactive if unused for 30+ days
- Send notification to system admin before deletion
- Delete Railway service and database record
- Clean up agent configurations

---

## Benefits of This Approach

### 1. **Flexibility**
- Supports various tenant needs (single or multiple Notion accounts)
- Services can be shared or dedicated
- Easy to add/remove agent assignments

### 2. **Cost Efficiency**
- Service reuse reduces Railway costs
- One service can serve multiple agents from same tenant
- Optimize service allocation based on usage

### 3. **Scalability**
- Can add services as needed without 1:1 tenant mapping
- Supports growth from small to enterprise tenants
- Railway handles infrastructure scaling

### 4. **Security**
- Proper tenant isolation via RLS
- Encrypted token storage
- Backend-only Railway API access
- Audit logging for all operations

### 5. **Maintainability**
- Clear data model and service lifecycle
- Centralized service management
- Easy to monitor and troubleshoot
- Well-documented API endpoints

---

## Risks & Mitigations

### High Risk

1. **Railway API Changes**
   - **Risk**: Railway may change API, breaking service creation
   - **Mitigation**: Abstract Railway API calls, version handling, monitor Railway changelog

2. **Service Creation Failures**
   - **Risk**: Services fail to create, leaving system in inconsistent state
   - **Mitigation**: Transaction management, rollback on failure, status tracking, admin alerts

3. **Cost Overruns**
   - **Risk**: Too many services increase Railway costs
   - **Mitigation**: Service reuse, usage monitoring, cost alerts, inactive service cleanup

### Medium Risk

1. **Deployment Delays**
   - **Risk**: Long deployment times affect user experience
   - **Mitigation**: Async processing, progress indicators, notifications

2. **Health Check Failures**
   - **Risk**: Services become unhealthy, affecting agent functionality
   - **Mitigation**: Regular health checks, automatic retries, fallback mechanisms

### Low Risk

1. **Service Naming Conflicts**
   - **Risk**: Duplicate service names in Railway
   - **Mitigation**: Unique naming convention, validation before creation

---

## Recommended Next Steps

### Phase 1: Foundation (MVP)
1. ✅ Review and approve this architecture
2. Set up Railway API integration (test with Railway GraphQL API)
3. Create database tables (`notion_resources`, `notion_mcp_services`, `agent_notion_services`)
4. Implement Railway service creation API endpoint
5. Implement basic health check monitoring
6. Create system admin UI for service creation

### Phase 2: Agent Integration
1. Implement agent-to-service assignment API
2. Update agent configuration to include MCP service URLs
3. Integrate with Retell AI (if needed for MCP configuration)
4. Create tenant admin UI for service assignment

### Phase 3: Monitoring & Optimization
1. Implement background health check job
2. Add service usage tracking
3. Implement service reuse detection
4. Add cost monitoring and alerts
5. Create service lifecycle automation

---

## Conclusion

**YES, you can create new services in an existing Railway project and make each tenant available to agents.** The recommended approach is:

1. **Use Railway's GraphQL API** to programmatically create services
2. **Implement Hybrid Service Pool Model** for flexibility and cost efficiency
3. **Store service metadata in database** with proper tenant isolation
4. **Enable many-to-many agent-to-service assignments** via junction table
5. **Implement health monitoring and lifecycle management** for reliability

This architecture provides:
- ✅ Technical feasibility (Railway API supports it)
- ✅ Security and tenant isolation
- ✅ Cost efficiency through service reuse
- ✅ Scalability for growth
- ✅ Maintainability with clear data model

The main implementation effort will be:
- Railway API integration (GraphQL client setup)
- Database schema creation
- API endpoint development
- Background jobs for health checks
- UI for system and tenant admins

**Estimated Complexity**: Medium to High
- Railway API integration: Medium
- Database schema: Low
- API endpoints: Medium
- Health monitoring: Medium
- UI development: Medium

**Recommended Timeline**: 2-3 weeks for MVP, 4-6 weeks for full implementation with monitoring and optimization.

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Status**: Advisory - Ready for Review


