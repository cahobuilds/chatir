# Notion MCP Integration Architecture Analysis

## Executive Summary

This document analyzes the architecture and implementation strategy for integrating Notion resources as Model Context Protocol (MCP) servers into the multi-tenant SaaS platform's knowledge base system. The goal is to allow tenants/organizations to connect their Notion accounts to agents, enabling agents to reference Notion pages and databases during conversations.

---

## Current System Context

### Existing Architecture

1. **Multi-Tenant Structure**
   - `tenants` table: Organizations with hierarchical support (parent_id)
   - `agents` table: Voice and chat agents per tenant
   - `knowledge_bases` table: Knowledge base configurations per tenant
   - `knowledge_base_sources` table: Individual sources within knowledge bases

2. **Knowledge Base System**
   - Knowledge bases are tenant-scoped
   - Sources can be of different types (currently file-based)
   - RLS policies enforce tenant isolation

3. **Agent Configuration**
   - Agents have `configuration` JSONB field for flexible settings
   - Agents are linked to Retell AI via `retell_agent_id`
   - Agents can be assigned to users via `user_agents` table

### Railway Service Creation Flow

Based on the provided documentation:
- Railway API allows creating services in a project
- Each service requires a `NOTION_TOKEN` environment variable
- Services get deployed and receive a domain/URL
- Services act as MCP servers that can be referenced by Retell AI agents

---

## Key Requirements Analysis

### Business Requirements

1. **One Notion Account Per Tenant**
   - Each tenant/organization should connect one Notion account (one token)
   - The token's permissions determine which pages/databases are accessible
   - Multiple pages/databases can be accessed via the same token

2. **Service Management**
   - System admin should manage Railway service creation
   - Services should be reusable and assignable to multiple agents
   - Services should be tenant-scoped for security and isolation

3. **Agent Assignment**
   - Agents should be able to reference one or more Notion MCP services
   - Assignment should be flexible (many-to-many relationship)
   - Configuration should be stored and retrievable for Retell AI integration

---

## Architecture Options Analysis

### Option 1: One Service Per Tenant (Token-Based)

**Concept**: Create one Railway service per tenant, using the tenant's Notion token.

**Pros:**
- Simple model: One token = One service
- Cost-effective: One service per tenant
- Easy to manage: Direct tenant-to-service mapping
- Token isolation: Each tenant's token is isolated

**Cons:**
- Less flexible: Cannot have multiple Notion accounts per tenant
- Single point of failure: If service fails, all agents lose access
- Cannot segment access: All agents see all accessible pages

**Use Case**: Best for tenants with single Notion workspaces and straightforward needs.

---

### Option 2: One Service Per Notion Resource (Resource-Based)

**Concept**: Create one Railway service per Notion database/page, each with its own token.

**Pros:**
- Maximum flexibility: Different tokens for different resources
- Granular control: Assign specific resources to specific agents
- Better isolation: Failure of one service doesn't affect others
- Supports multiple Notion accounts per tenant

**Cons:**
- Higher cost: Multiple services per tenant
- Complex management: Many services to track
- Token management overhead: Multiple tokens to manage
- May exceed Railway project limits

**Use Case**: Best for enterprise tenants with complex Notion structures and multiple workspaces.

---

### Option 3: Shared Service Pool with Token Assignment (Hybrid - RECOMMENDED)

**Concept**: System admin creates Railway services in a shared pool. Each service is configured with a tenant's Notion token and can be assigned to one or more agents.

**Pros:**
- **Flexibility**: Services can be shared across agents or dedicated
- **Cost optimization**: Reuse services when multiple agents need same Notion account
- **Scalability**: Add services as needed without 1:1 tenant mapping
- **Granular assignment**: Agents can reference multiple Notion resources
- **Resource efficiency**: One service can serve multiple agents from same tenant
- **Future-proof**: Supports both single and multi-account scenarios

**Cons:**
- More complex data model: Requires service-to-agent mapping
- Service lifecycle management: Need to track which services are in use
- Token rotation complexity: Updating token requires service update

**Use Case**: Best for production systems requiring flexibility and scalability.

---

## Recommended Architecture: Option 3 (Hybrid Model)

### Core Principles

1. **Service Pool Management**
   - System admin creates and manages Railway services
   - Services are tenant-scoped but can be shared
   - Services track their Railway service ID, domain, and status

2. **Notion Resource Abstraction**
   - Notion resources (accounts/tokens) are separate from services
   - One Notion resource can be used by multiple services (if needed)
   - Services are bound to a specific Notion token

3. **Agent Assignment**
   - Many-to-many relationship: Agents ↔ Notion MCP Services
   - Agents can reference multiple Notion resources
   - Assignment is tenant-scoped and permission-controlled

---

## Proposed Data Model

### New Tables

#### 1. `notion_resources` Table
Stores Notion account/token information per tenant.

```sql
CREATE TABLE notion_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Notion Account Information
  name TEXT NOT NULL, -- e.g., "Company Notion Workspace"
  notion_token_encrypted TEXT NOT NULL, -- Encrypted Notion API token
  notion_workspace_id TEXT, -- Optional: Notion workspace identifier
  
  -- Metadata
  description TEXT,
  accessible_pages JSONB, -- Cached list of accessible pages/databases
  last_synced_at TIMESTAMPTZ, -- When accessible pages were last fetched
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  error_message TEXT, -- If status is 'error'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, name) -- One unique name per tenant
);
```

**Purpose**: 
- Stores Notion token per tenant
- Allows multiple Notion resources per tenant (future expansion)
- Caches accessible pages for UI display

---

#### 2. `notion_mcp_services` Table
Stores Railway service information for Notion MCP servers.

```sql
CREATE TABLE notion_mcp_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notion_resource_id UUID NOT NULL REFERENCES notion_resources(id) ON DELETE CASCADE,
  
  -- Railway Service Information
  railway_service_id TEXT NOT NULL UNIQUE, -- Railway service UUID
  railway_service_name TEXT NOT NULL, -- e.g., "notion-tenant-abc"
  service_url TEXT, -- https://notion-tenant-abc.railway.app
  health_check_url TEXT, -- https://notion-tenant-abc.railway.app/health
  
  -- Service Configuration
  name TEXT NOT NULL, -- User-friendly name, e.g., "Main Knowledge Base"
  description TEXT,
  
  -- Status Tracking
  status TEXT DEFAULT 'creating' CHECK (status IN ('creating', 'active', 'inactive', 'error', 'deploying')),
  deployment_status TEXT, -- Railway deployment status
  last_health_check TIMESTAMPTZ,
  health_check_status TEXT, -- 'healthy', 'unhealthy', 'unknown'
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id), -- System admin who created it
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, railway_service_id)
);
```

**Purpose**:
- Tracks Railway service lifecycle
- Links services to Notion resources
- Monitors service health and status
- Enables service reuse across agents

---

#### 3. `agent_notion_services` Table (Junction Table)
Many-to-many relationship between agents and Notion MCP services.

```sql
CREATE TABLE agent_notion_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  notion_mcp_service_id UUID NOT NULL REFERENCES notion_mcp_services(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Assignment Metadata
  priority INTEGER DEFAULT 0, -- Order of precedence if multiple services
  is_active BOOLEAN DEFAULT true,
  
  -- Configuration
  configuration JSONB DEFAULT '{}'::jsonb, -- Agent-specific MCP config
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(agent_id, notion_mcp_service_id), -- One assignment per agent-service pair
  -- Ensure agent and service belong to same tenant
  CONSTRAINT agent_service_tenant_match CHECK (
    (SELECT tenant_id FROM agents WHERE id = agent_id) = tenant_id AND
    (SELECT tenant_id FROM notion_mcp_services WHERE id = notion_mcp_service_id) = tenant_id
  )
);
```

**Purpose**:
- Enables many-to-many agent-to-service assignment
- Supports priority ordering for multiple services
- Allows agent-specific configuration overrides
- Enforces tenant isolation

---

### Updated Tables

#### `knowledge_base_sources` Table Enhancement
Add support for Notion MCP as a source type.

```sql
-- Add new source type
ALTER TABLE knowledge_base_sources 
  ADD CONSTRAINT source_type_check 
  CHECK (source_type IN ('file', 'url', 'notion_mcp', 'api'));

-- Add reference to notion_mcp_services
ALTER TABLE knowledge_base_sources
  ADD COLUMN notion_mcp_service_id UUID REFERENCES notion_mcp_services(id) ON DELETE SET NULL;
```

**Purpose**: Integrate Notion MCP services into existing knowledge base system.

---

## Service Lifecycle Management

### Service Creation Flow

1. **Tenant Admin Action**: Tenant admin provides Notion token
2. **System Admin Action**: System admin creates Railway service
3. **Service Configuration**: 
   - Create Railway service with unique name
   - Set `NOTION_TOKEN` environment variable
   - Trigger deployment
   - Wait for domain assignment
4. **Database Record**: Create `notion_mcp_services` record
5. **Health Check**: Verify service is healthy
6. **Assignment**: Assign service to agents as needed

### Service Update Flow

1. **Token Rotation**: Update `notion_resources.notion_token_encrypted`
2. **Service Update**: Update Railway service environment variable
3. **Redeploy**: Trigger new deployment
4. **Health Check**: Verify service is still healthy

### Service Deletion Flow

1. **Check Usage**: Verify no agents are using the service
2. **Railway Cleanup**: Delete Railway service (optional, or mark inactive)
3. **Database Cleanup**: Mark service as inactive or delete record

---

## Assignment Strategy

### Recommended Approach: Agent-Level Assignment

**Model**: Agents directly reference Notion MCP services via `agent_notion_services` junction table.

**Benefits**:
- Direct control: Each agent can have different Notion resources
- Flexible: One agent can use multiple Notion services
- Scalable: Easy to add/remove assignments
- Clear ownership: Assignment is explicit and trackable

**Alternative Considered**: Knowledge Base-Level Assignment
- Less flexible: All agents using a knowledge base share same resources
- More complex: Requires knowledge base → service mapping
- Not recommended for this use case

---

## Security Considerations

### 1. Token Storage
- **Encryption**: Store Notion tokens encrypted at rest
- **Access Control**: Only system admins can view/update tokens
- **Audit Logging**: Log all token access and updates

### 2. Tenant Isolation
- **RLS Policies**: Enforce tenant isolation on all new tables
- **Service Isolation**: Services are tenant-scoped
- **Assignment Validation**: Ensure agents and services belong to same tenant

### 3. Railway API Security
- **Backend Proxy**: Never expose Railway API token to frontend
- **Environment Variables**: Store Railway API token server-side only
- **Rate Limiting**: Implement rate limiting on Railway API calls

### 4. Service Access
- **Health Checks**: Regular health checks to detect compromised services
- **Monitoring**: Monitor service status and alert on failures
- **Access Logs**: Log all MCP service access for audit

---

## Implementation Phases

### Phase 1: Foundation (MVP)
1. Create `notion_resources` table
2. Create `notion_mcp_services` table
3. Create `agent_notion_services` junction table
4. Implement Railway service creation API (system admin only)
5. Basic UI for tenant admins to provide Notion tokens
6. Basic UI for system admins to create services

### Phase 2: Assignment & Configuration
1. UI for assigning services to agents
2. Agent configuration to include MCP service URLs
3. Retell AI integration: Generate MCP config for agents
4. Health check monitoring
5. Service status dashboard

### Phase 3: Advanced Features
1. Notion page/database discovery and selection
2. Granular page-level access control
3. Service reuse optimization (detect duplicate tokens)
4. Automated service provisioning
5. Service usage analytics

### Phase 4: Enterprise Features
1. Multiple Notion accounts per tenant
2. Service pooling and load balancing
3. Advanced monitoring and alerting
4. Cost tracking per service
5. Service lifecycle automation

---

## API Design Recommendations

### Backend API Routes

#### Railway Service Management (System Admin Only)
```
POST   /api/railway/services                    # Create service
GET    /api/railway/services                   # List all services
GET    /api/railway/services/:id               # Get service details
PATCH  /api/railway/services/:id               # Update service
DELETE /api/railway/services/:id               # Delete service
POST   /api/railway/services/:id/deploy        # Trigger deployment
GET    /api/railway/services/:id/health        # Check service health
```

#### Notion Resource Management (Tenant Admin)
```
POST   /api/notion/resources                   # Create Notion resource (provide token)
GET    /api/notion/resources                  # List tenant's Notion resources
GET    /api/notion/resources/:id              # Get resource details
PATCH  /api/notion/resources/:id              # Update resource (token rotation)
DELETE /api/notion/resources/:id              # Delete resource
POST   /api/notion/resources/:id/sync         # Sync accessible pages
```

#### Service Assignment (Tenant Admin)
```
POST   /api/agents/:agentId/notion-services    # Assign service to agent
GET    /api/agents/:agentId/notion-services    # Get agent's assigned services
DELETE /api/agents/:agentId/notion-services/:serviceId  # Remove assignment
PATCH  /api/agents/:agentId/notion-services/:serviceId  # Update assignment config
```

---

## UI/UX Recommendations

### For Tenant Admins

1. **Notion Resource Management Page**
   - Form to add Notion token
   - List of connected Notion resources
   - Token masking (show last 4 chars only)
   - Status indicators (active, error, etc.)
   - Accessible pages/databases list

2. **Service Request/Assignment Page**
   - Request service creation (triggers system admin notification)
   - View available services for assignment
   - Assign services to agents
   - View service status and health

### For System Admins

1. **Railway Service Management Dashboard**
   - List all Railway services
   - Create new services
   - Monitor service health
   - View service usage (which agents use which services)
   - Service lifecycle management (create, update, delete)

2. **Service Creation Wizard**
   - Select tenant
   - Select Notion resource
   - Configure service name
   - Create and deploy service
   - Show deployment progress
   - Display service URL and health status

### For Agent Configuration

1. **Agent Edit Page Enhancement**
   - Section for "Knowledge Sources"
   - Multi-select for Notion MCP services
   - Priority ordering
   - Service status indicators
   - Test connection button

---

## Cost Considerations

### Railway Service Costs
- **Per Service**: Each Railway service has a base cost
- **Optimization**: Reuse services when multiple agents need same Notion account
- **Scaling**: Monitor service usage and optimize service allocation

### Recommendations
1. **Start Conservative**: One service per tenant initially
2. **Monitor Usage**: Track which services are actively used
3. **Optimize Later**: Implement service pooling based on usage patterns
4. **Cost Alerts**: Set up alerts for service costs per tenant

---

## Risk Assessment

### High Risk
1. **Token Security**: Notion tokens are sensitive credentials
   - **Mitigation**: Encrypt at rest, restrict access, audit logging

2. **Service Availability**: Railway service failures affect agent functionality
   - **Mitigation**: Health checks, monitoring, fallback mechanisms

3. **Cost Overruns**: Too many services can be expensive
   - **Mitigation**: Service reuse, usage monitoring, cost alerts

### Medium Risk
1. **Service Lifecycle**: Complex service creation/deletion flow
   - **Mitigation**: Automated workflows, clear documentation, error handling

2. **Token Rotation**: Updating tokens requires service updates
   - **Mitigation**: Automated token update flow, clear instructions

### Low Risk
1. **Railway API Changes**: Railway API may change
   - **Mitigation**: Abstract Railway API calls, version handling

---

## Alternative Approaches Considered

### Alternative 1: Direct Notion API Integration
**Concept**: Skip Railway services, call Notion API directly from agents.

**Rejected Because**:
- Requires exposing Notion tokens to agent runtime
- Less secure: Tokens in agent configuration
- No MCP protocol benefits
- Harder to manage and monitor

### Alternative 2: Shared MCP Service Pool
**Concept**: One global MCP service that routes to different Notion accounts.

**Rejected Because**:
- Complex routing logic
- Security concerns: All tokens in one service
- Single point of failure
- Harder to scale

### Alternative 3: Tenant-Owned Railway Projects
**Concept**: Each tenant has their own Railway project.

**Rejected Because**:
- Higher cost: Multiple Railway projects
- Complex management: Multiple projects to manage
- Overkill for most use cases

---

## Migration Strategy

### Existing System Impact
- **Minimal**: New tables don't affect existing functionality
- **Optional Integration**: Can integrate with existing `knowledge_base_sources` table
- **Backward Compatible**: Existing knowledge bases continue to work

### Data Migration
- No existing data to migrate
- Can start fresh with new tables
- Gradual rollout: Enable feature per tenant

---

## Success Metrics

### Technical Metrics
- Service creation success rate
- Service health check pass rate
- Average service deployment time
- Service availability (uptime %)

### Business Metrics
- Number of tenants using Notion integration
- Number of agents with Notion services assigned
- Service reuse rate (services per tenant)
- Cost per tenant for Notion services

### User Experience Metrics
- Time to create and assign service
- Service creation error rate
- User satisfaction with Notion integration

---

## Conclusion

### Recommended Approach: Hybrid Service Pool Model

The **Hybrid Service Pool Model (Option 3)** provides the best balance of:
- **Flexibility**: Supports various tenant needs
- **Cost Efficiency**: Service reuse reduces costs
- **Scalability**: Can grow with tenant needs
- **Security**: Proper tenant isolation and token management
- **Maintainability**: Clear data model and service lifecycle

### Key Implementation Priorities

1. **Security First**: Encrypt tokens, enforce RLS, audit logging
2. **System Admin Control**: System admins manage Railway services
3. **Tenant Self-Service**: Tenants manage their Notion resources and assignments
4. **Monitoring**: Health checks and status tracking from day one
5. **Documentation**: Clear documentation for both system and tenant admins

### Next Steps

1. Review and approve architecture
2. Design detailed database schema
3. Create API specifications
4. Design UI mockups
5. Implement Phase 1 (Foundation)
6. Test with pilot tenants
7. Iterate based on feedback

---

## Appendix: Railway API Integration Notes

### Service Naming Convention
- Format: `notion-{tenant-id}-{resource-name}`
- Example: `notion-abc123-main-workspace`
- Ensures uniqueness and traceability

### Environment Variables
- `NOTION_TOKEN`: Required, from `notion_resources` table
- Optional: `LOG_LEVEL`, `PORT`, etc.

### Health Check Endpoint
- Standard: `GET /health`
- Should return 200 OK when service is ready
- Include service metadata in response

### Deployment Strategy
- Automatic deployment after service creation
- Monitor deployment status
- Retry on failure
- Alert on deployment errors

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Author**: Architecture Analysis  
**Status**: Draft for Review

