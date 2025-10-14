# Multitenant Architecture for AI Customer Care Bot

## Overview

This document outlines the multitenant architecture design for the AI Customer Care Bot system, enabling multiple organizations (tenants) and their sub-organizations (subtenants) to use the platform with complete data isolation and customizable configurations.

## 🏗️ Architecture Principles

### 1. **Tenant Isolation**
- **Data Isolation**: Complete separation of data between tenants
- **Resource Isolation**: Dedicated resources per tenant when needed
- **Configuration Isolation**: Custom settings and branding per tenant
- **Security Isolation**: Separate authentication and authorization

### 2. **Scalability**
- **Horizontal Scaling**: Add new tenants without affecting existing ones
- **Resource Optimization**: Shared infrastructure with tenant-specific scaling
- **Performance Isolation**: Prevent one tenant from affecting others

### 3. **Flexibility**
- **Custom Branding**: White-label capabilities
- **Feature Toggles**: Enable/disable features per tenant
- **Integration Customization**: Tenant-specific integrations
- **Workflow Customization**: Custom call flows and agent behaviors

## 🏢 Tenant Hierarchy

```
Master Platform
├── Tenant A (Enterprise Customer)
│   ├── Subtenant A1 (Department 1)
│   ├── Subtenant A2 (Department 2)
│   └── Subtenant A3 (Regional Office)
├── Tenant B (SMB Customer)
│   ├── Subtenant B1 (Sales Team)
│   └── Subtenant B2 (Support Team)
└── Tenant C (Agency)
    ├── Subtenant C1 (Client 1)
    ├── Subtenant C2 (Client 2)
    └── Subtenant C3 (Client 3)
```

## 🗄️ Database Architecture

### Option 1: Shared Database with Tenant ID
```sql
-- All tables include tenant_id for isolation
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    parent_tenant_id UUID REFERENCES tenants(id),
    tier VARCHAR(50) DEFAULT 'standard',
    settings JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE calls (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subtenant_id UUID REFERENCES tenants(id),
    agent_id UUID NOT NULL,
    customer_phone VARCHAR(20),
    status VARCHAR(50),
    duration INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE agents (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subtenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    configuration JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Option 2: Database per Tenant
```sql
-- Separate database for each tenant
-- Database naming: ai_care_tenant_{tenant_id}
-- Complete isolation but higher resource usage
```

### Option 3: Hybrid Approach
```sql
-- Critical data in separate databases
-- Shared data (templates, integrations) in shared database
-- Best of both worlds
```

## 🔐 Authentication & Authorization

### Multi-Level Access Control

```typescript
interface TenantContext {
  tenantId: string;
  subtenantId?: string;
  userId: string;
  role: 'super_admin' | 'tenant_admin' | 'subtenant_admin' | 'agent' | 'viewer';
  permissions: Permission[];
}

interface Permission {
  resource: string; // 'calls', 'agents', 'analytics', etc.
  actions: string[]; // ['read', 'write', 'delete', 'admin']
  scope: 'tenant' | 'subtenant' | 'own';
}
```

### JWT Token Structure
```json
{
  "sub": "user_123",
  "tenant_id": "tenant_456",
  "subtenant_id": "subtenant_789",
  "role": "agent",
  "permissions": [
    {
      "resource": "calls",
      "actions": ["read", "write"],
      "scope": "subtenant"
    }
  ],
  "exp": 1640995200
}
```

## 🎨 Tenant Customization

### 1. **Branding & UI**
```typescript
interface TenantBranding {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  favicon: string;
  customCSS?: string;
  customDomain?: string;
}
```

### 2. **Feature Configuration**
```typescript
interface TenantFeatures {
  voiceAgents: boolean;
  chatAgents: boolean;
  callRecording: boolean;
  analytics: boolean;
  integrations: string[];
  maxAgents: number;
  maxConcurrentCalls: number;
  customWorkflows: boolean;
}
```

### 3. **Integration Settings**
```typescript
interface TenantIntegrations {
  crm: {
    provider: 'salesforce' | 'hubspot' | 'custom';
    configuration: Record<string, any>;
  };
  telephony: {
    provider: 'twilio' | 'vonage' | 'custom';
    configuration: Record<string, any>;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    webhook: boolean;
  };
}
```

## 📊 Data Isolation Strategies

### 1. **Row-Level Security (RLS)**
```sql
-- Enable RLS on all tenant tables
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation ON calls
  FOR ALL TO application_role
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### 2. **Application-Level Filtering**
```typescript
class CallService {
  async getCalls(tenantId: string, subtenantId?: string) {
    const query = this.db.calls
      .where('tenant_id', tenantId);
    
    if (subtenantId) {
      query.where('subtenant_id', subtenantId);
    }
    
    return query.execute();
  }
}
```

### 3. **Middleware for Tenant Context**
```typescript
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.headers['x-tenant-id'] || extractFromDomain(req);
  const subtenantId = req.headers['x-subtenant-id'];
  
  req.tenantContext = {
    tenantId,
    subtenantId,
    userId: req.user.id
  };
  
  next();
}
```

## 🚀 Deployment Architecture

### 1. **Single Instance Multi-Tenant (SIMT)**
```
┌─────────────────────────────────────┐
│           Load Balancer             │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│        Application Server           │
│  ┌─────────────┬─────────────────┐  │
│  │   Tenant A  │    Tenant B     │  │
│  │   Context   │    Context      │  │
│  └─────────────┴─────────────────┘  │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│         Shared Database             │
│  ┌─────────────┬─────────────────┐  │
│  │ Tenant A    │    Tenant B     │  │
│  │ Data        │    Data         │  │
│  └─────────────┴─────────────────┘  │
└─────────────────────────────────────┘
```

### 2. **Multi-Instance Multi-Tenant (MIMT)**
```
┌─────────────────────────────────────┐
│           Load Balancer             │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
┌───────▼───┐ ┌───▼───┐ ┌───▼───┐
│ Instance  │ │ Inst. │ │ Inst. │
│ Tenant A  │ │ B & C │ │ D & E │
└───────┬───┘ └───┬───┘ └───┬───┘
        │         │         │
┌───────▼───┐ ┌───▼───┐ ┌───▼───┐
│ Database  │ │ DB B  │ │ DB C  │
│ Tenant A  │ │ & C   │ │ & D   │
└───────────┘ └───────┘ └───────┘
```

## 🔧 Implementation Components

### 1. **Tenant Management Service**
```typescript
class TenantService {
  async createTenant(tenantData: CreateTenantRequest): Promise<Tenant> {
    // Create tenant record
    // Set up initial configuration
    // Create default admin user
    // Initialize integrations
  }
  
  async createSubtenant(parentTenantId: string, subtenantData: CreateSubtenantRequest): Promise<Tenant> {
    // Create subtenant with parent relationship
    // Inherit parent configuration
    // Set up subtenant-specific settings
  }
  
  async getTenantConfiguration(tenantId: string): Promise<TenantConfiguration> {
    // Return tenant-specific settings
    // Include inherited settings from parent
  }
}
```

### 2. **Tenant-Aware Components**
```typescript
// React component with tenant context
export function TenantAwareComponent() {
  const { tenantId, subtenantId } = useTenantContext();
  const { data } = useQuery(['calls', tenantId, subtenantId], () => 
    callService.getCalls(tenantId, subtenantId)
  );
  
  return <CallList calls={data} />;
}
```

### 3. **API Gateway with Tenant Routing**
```typescript
// API Gateway configuration
const tenantRoutes = {
  'tenant-a.example.com': 'tenant-a-service',
  'tenant-b.example.com': 'tenant-b-service',
  'api.example.com': 'shared-service'
};

// Route based on domain or header
function routeRequest(req: Request) {
  const tenantId = extractTenantFromDomain(req.hostname);
  return tenantRoutes[tenantId] || 'default-service';
}
```

## 📈 Scaling Strategies

### 1. **Horizontal Scaling**
- **Tenant Sharding**: Distribute tenants across multiple instances
- **Database Sharding**: Split tenant data across multiple databases
- **Load Balancing**: Route requests based on tenant load

### 2. **Vertical Scaling**
- **Resource Allocation**: Dedicated resources for high-volume tenants
- **Performance Tiers**: Different performance levels per tenant tier
- **Caching Strategies**: Tenant-specific caching policies

### 3. **Auto-Scaling**
```typescript
interface ScalingPolicy {
  tenantId: string;
  minInstances: number;
  maxInstances: number;
  scaleUpThreshold: number; // CPU/Memory usage
  scaleDownThreshold: number;
  cooldownPeriod: number;
}
```

## 🔒 Security Considerations

### 1. **Data Encryption**
- **At Rest**: Database-level encryption per tenant
- **In Transit**: TLS/SSL for all communications
- **Application Level**: Sensitive data encryption

### 2. **Access Control**
- **API Keys**: Tenant-specific API keys
- **OAuth Integration**: Tenant-specific OAuth providers
- **SSO Support**: Enterprise SSO per tenant

### 3. **Audit & Compliance**
```typescript
interface AuditLog {
  tenantId: string;
  subtenantId?: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure';
}
```

## 🧪 Testing Strategy

### 1. **Tenant Isolation Testing**
```typescript
describe('Tenant Isolation', () => {
  it('should not allow cross-tenant data access', async () => {
    const tenantA = await createTestTenant();
    const tenantB = await createTestTenant();
    
    const tenantACalls = await callService.getCalls(tenantA.id);
    const tenantBCalls = await callService.getCalls(tenantB.id);
    
    expect(tenantACalls).not.toContain(tenantBCalls[0]);
  });
});
```

### 2. **Performance Testing**
- **Load Testing**: Simulate multiple tenants with high load
- **Stress Testing**: Test tenant isolation under stress
- **Scalability Testing**: Verify horizontal scaling works

## 📋 Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Database schema design
- [ ] Basic tenant management
- [ ] Authentication system
- [ ] Core API endpoints

### Phase 2: Isolation (Weeks 5-8)
- [ ] Data isolation implementation
- [ ] Tenant-aware components
- [ ] Security middleware
- [ ] Basic customization

### Phase 3: Advanced Features (Weeks 9-12)
- [ ] Subtenant support
- [ ] Advanced customization
- [ ] Integration management
- [ ] Performance optimization

### Phase 4: Production Ready (Weeks 13-16)
- [ ] Monitoring & alerting
- [ ] Backup & recovery
- [ ] Documentation
- [ ] Security audit

## 🎯 Benefits

### For Platform Providers
- **Cost Efficiency**: Shared infrastructure reduces costs
- **Scalability**: Easy to add new tenants
- **Maintenance**: Single codebase to maintain
- **Revenue**: Multiple revenue streams from different tenants

### For Tenants
- **Cost Effective**: Lower cost than dedicated solutions
- **Quick Setup**: Fast onboarding process
- **Customization**: Tailored to their needs
- **Scalability**: Grow with their business

### For Subtenants
- **Isolation**: Separate data and configuration
- **Flexibility**: Custom settings within parent constraints
- **Collaboration**: Shared resources when needed
- **Independence**: Operate independently when required

## 🔮 Future Enhancements

1. **AI-Powered Tenant Optimization**: ML-based resource allocation
2. **Cross-Tenant Analytics**: Aggregated insights (with permission)
3. **Tenant Marketplace**: Share integrations and workflows
4. **Advanced Customization**: Full white-label capabilities
5. **Edge Deployment**: Deploy closer to tenant locations

---

This multitenant architecture provides a robust foundation for scaling the AI Customer Care Bot platform while maintaining security, performance, and flexibility for all stakeholders.
