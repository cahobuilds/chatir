# Provider Integration Checklist

## Quick Answer Summary

### ✅ Build an Abstraction Layer + Router Pattern

**Why:**
- Clean separation of concerns
- Easy to add new providers
- Provider-specific code isolated
- Common operations unified

### When to Fork to Provider-Specific Code

**Fork when:**
1. **Voice Model Selection** - Each provider has different voice IDs/models
2. **API Authentication** - Different key formats/auth methods
3. **Webhook Payloads** - Different webhook structures
4. **Real-time Streaming** - Different protocols (WebSocket, SSE, gRPC)
5. **Phone Number Management** - Different APIs and capabilities
6. **Billing Integration** - Different pricing models

**Don't fork when:**
1. **Core Operations** - Use abstraction (create/update/delete agents)
2. **Data Storage** - Use unified schema
3. **Common UI** - Use provider-agnostic components

## What You Need Before Integrating

### ✅ Already Available

- [x] Multi-tenant database structure
- [x] Agent management system
- [x] Interaction tracking
- [x] Authentication & authorization
- [x] Basic Retell integration (can be refactored)

### ⚠️ Needs Implementation

#### 1. Provider Abstraction Layer (CRITICAL)

**Files to Create:**
```
src/lib/providers/
├── types.ts              # Core interfaces (VoiceProvider, etc.)
├── factory.ts            # ProviderFactory.create()
├── router.ts             # ProviderRouter.routeToProvider()
├── retell/
│   └── index.ts          # RetellProvider implementation
├── elevenlabs/
│   └── index.ts          # ElevenLabsProvider implementation
└── deepgram/
    └── index.ts          # DeepgramProvider implementation
```

**What it does:**
- Defines common interface for all providers
- Routes operations to correct provider
- Handles provider-specific differences

#### 2. Database Schema Updates (CRITICAL)

**New Table:**
```sql
CREATE TABLE provider_configurations (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  provider_type TEXT CHECK (provider_type IN ('retell', 'elevenlabs', 'deepgram')),
  api_key TEXT,
  configuration JSONB,
  ...
);
```

**Update Existing Tables:**
- `agents`: Add `provider_type`, `provider_configuration_id`, `provider_agent_id`
- `interactions`: Add `provider_type`, `provider_call_id`

**Migration:**
- Migrate existing Retell data to new schema
- Keep old columns temporarily for backward compatibility

#### 3. Provider Configuration UI (HIGH PRIORITY)

**Components Needed:**
- Provider selector (dropdown)
- Provider-specific configuration forms
- API key management per provider
- Provider switching logic

**Location:**
- Add to `/tenant-settings` page
- Similar to current Retell API key section, but for multiple providers

#### 4. Unified API Routes (HIGH PRIORITY)

**Refactor:**
- `/api/agents/*` - Use ProviderRouter instead of direct Retell calls
- `/api/calls/*` - New provider-agnostic call routes
- `/api/webhooks/*` - Unified webhook endpoint with provider routing

**New Routes:**
- `/api/providers` - Manage provider configurations
- `/api/providers/[type]/config` - Provider-specific config

#### 5. Webhook Handling (MEDIUM PRIORITY)

**Unified Endpoint:**
```
POST /api/webhooks/voice
```

**What it does:**
- Receives webhooks from all providers
- Routes to provider-specific parser
- Normalizes events to common format
- Updates interactions table

#### 6. Error Handling (MEDIUM PRIORITY)

**Standardize:**
- Provider-specific error mapping
- Unified error responses
- Retry logic per provider
- Fallback mechanisms

## Implementation Order

### Phase 1: Foundation (Week 1)
1. ✅ Create provider interfaces (`types.ts`)
2. ✅ Create provider factory (`factory.ts`)
3. ✅ Create provider router (`router.ts`)
4. ✅ Refactor Retell to use new interface
5. ✅ Create database migration

### Phase 2: Migration (Week 2)
1. ✅ Run database migration
2. ✅ Migrate existing Retell data
3. ✅ Update API routes to use ProviderRouter
4. ✅ Test Retell integration still works

### Phase 3: New Providers (Week 3-4)
1. ✅ Implement Eleven Labs provider
2. ✅ Implement Deepgram provider
3. ✅ Add provider selection UI
4. ✅ Test multi-provider scenarios

### Phase 4: Cleanup (Week 5)
1. ✅ Remove old Retell-specific columns
2. ✅ Remove direct Retell SDK usage
3. ✅ Update documentation

## Key Design Decisions

### 1. Abstraction Layer Pattern

```typescript
// Common interface
interface VoiceProvider {
  listAgents(): Promise<VoiceAgent[]>;
  createAgent(config): Promise<VoiceAgent>;
  initiateCall(params): Promise<Call>;
  // ... common operations
}

// Provider-specific implementation
class RetellProvider implements VoiceProvider {
  // Retell-specific code here
}

// Router routes to correct provider
ProviderRouter.routeToProvider(agentId, async (provider) => {
  return provider.initiateCall(params);
});
```

### 2. Configuration Storage

**Per-Tenant Provider Configs:**
- Each tenant can configure multiple providers
- Each agent references a provider config
- Allows tenant to use different providers for different agents

**Schema:**
```
tenant → provider_configurations (1:many)
agent → provider_configuration (many:1)
```

### 3. Provider-Specific Extensions

**When provider has unique features:**
```typescript
// Base interface
interface VoiceProvider {
  // Common operations
}

// Provider-specific extension
interface RetellProvider extends VoiceProvider {
  // Retell-specific methods
  enableVoicemailDetection(): Promise<void>;
}
```

## Testing Strategy

### Unit Tests
- Test each provider implementation
- Test provider factory
- Test provider router

### Integration Tests
- Test agent creation with each provider
- Test call initiation with each provider
- Test webhook handling for each provider

### Multi-Provider Tests
- Test tenant with multiple providers
- Test agent switching between providers
- Test provider fallback scenarios

## Common Pitfalls to Avoid

1. **Don't hard-code provider logic in business logic**
   - Use ProviderRouter everywhere
   - Keep provider code isolated

2. **Don't assume all providers support same features**
   - Check provider capabilities
   - Handle missing features gracefully

3. **Don't mix provider-specific and generic code**
   - Clear separation in file structure
   - Provider-specific code in provider folders

4. **Don't forget webhook validation**
   - Each provider has different webhook signatures
   - Validate before processing

5. **Don't skip error handling**
   - Provider APIs can fail differently
   - Map to common error types

## Next Immediate Steps

1. **Read the full architecture doc**: `docs/MULTI_PROVIDER_ARCHITECTURE.md`
2. **Create provider interfaces**: Start with `src/lib/providers/types.ts`
3. **Create database migration**: Add `provider_configurations` table
4. **Refactor Retell integration**: Move to provider abstraction
5. **Test thoroughly**: Ensure Retell still works after refactor

## Questions to Answer Before Starting

1. **Can a tenant use multiple providers simultaneously?**
   - Yes → Need provider selection per agent
   - No → Need provider selection per tenant

2. **Do you need provider switching for existing agents?**
   - Yes → Need migration strategy
   - No → Only new agents use new system

3. **What's the priority order?**
   - Retell (already working) → Refactor first
   - Eleven Labs → Next
   - Deepgram → Last

4. **Do you need provider-specific features exposed in UI?**
   - Yes → Need provider-specific UI components
   - No → Keep UI generic

