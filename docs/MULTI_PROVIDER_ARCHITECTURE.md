# Multi-Provider Architecture Guide

## Overview

This document outlines the architecture for supporting multiple AI/voice providers (Retell, Eleven Labs, Deepgram) with a clean abstraction layer that allows for provider-specific implementations when needed.

## Current State Analysis

### What's Currently Provider-Specific (Retell)

1. **Database Schema:**
   - `tenants.retell_api_key` - Hard-coded to Retell
   - `agents.retell_agent_id` - Retell-specific
   - `agents.retell_phone_number_id` - Retell-specific
   - `interactions.retell_call_id` - Retell-specific
   - `interactions.retell_conversation_id` - Retell-specific

2. **Code:**
   - Direct Retell SDK usage (`createRetellClient`)
   - Retell-specific API routes (`/api/retell/*`)
   - Retell-specific configuration in UI

3. **Integration Points:**
   - Agent creation/sync
   - Phone number management
   - Call initiation
   - Webhook handling

## Architecture Decision: Abstraction Layer + Provider Router

### ✅ Recommended Approach: **Provider Abstraction Layer with Router**

**Why:**
- Clean separation of concerns
- Easy to add new providers
- Provider-specific code isolated
- Common operations unified
- Type-safe interfaces

**When to Fork to Provider-Specific Code:**
- **Voice Synthesis**: Each provider has different voice models/IDs
- **API Authentication**: Different key formats and auth methods
- **Webhook Formats**: Each provider sends different webhook payloads
- **Phone Number Management**: Different APIs and capabilities
- **Real-time Streaming**: Different protocols (WebSocket, SSE, etc.)
- **Billing Models**: Different pricing structures

## Required Components

### 1. Database Schema Changes

#### A. Provider Configuration Table

```sql
-- Provider configurations per tenant
CREATE TABLE provider_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('retell', 'elevenlabs', 'deepgram')),
  provider_name TEXT NOT NULL, -- Display name
  api_key TEXT NOT NULL, -- Encrypted at application level
  api_secret TEXT, -- For providers that need it
  webhook_url TEXT,
  webhook_secret TEXT,
  is_active BOOLEAN DEFAULT true,
  configuration JSONB DEFAULT '{}'::jsonb, -- Provider-specific settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, provider_type)
);

-- Index for fast lookups
CREATE INDEX idx_provider_configs_tenant ON provider_configurations(tenant_id);
CREATE INDEX idx_provider_configs_type ON provider_configurations(provider_type);
```

#### B. Update Agents Table

```sql
-- Add provider reference
ALTER TABLE agents 
  ADD COLUMN provider_type TEXT CHECK (provider_type IN ('retell', 'elevenlabs', 'deepgram')),
  ADD COLUMN provider_configuration_id UUID REFERENCES provider_configurations(id),
  ADD COLUMN provider_agent_id TEXT, -- Generic provider agent ID (replaces retell_agent_id)
  ADD COLUMN provider_phone_number_id TEXT; -- Generic provider phone number ID

-- Migrate existing Retell data
UPDATE agents 
SET provider_type = 'retell',
    provider_agent_id = retell_agent_id,
    provider_phone_number_id = retell_phone_number_id
WHERE retell_agent_id IS NOT NULL;

-- Keep retell_* columns for backward compatibility during migration
-- Can be removed after full migration
```

#### C. Update Interactions Table

```sql
-- Add provider reference
ALTER TABLE interactions
  ADD COLUMN provider_type TEXT,
  ADD COLUMN provider_call_id TEXT, -- Generic provider call ID
  ADD COLUMN provider_conversation_id TEXT; -- Generic provider conversation ID

-- Migrate existing Retell data
UPDATE interactions
SET provider_type = 'retell',
    provider_call_id = retell_call_id,
    provider_conversation_id = retell_conversation_id
WHERE retell_call_id IS NOT NULL;
```

#### D. Update Tenants Table

```sql
-- Keep retell_api_key for backward compatibility
-- New provider configs go in provider_configurations table
-- Can deprecate retell_api_key after migration
```

### 2. Provider Abstraction Layer

#### A. Core Interfaces

```typescript
// src/lib/providers/types.ts

export type ProviderType = 'retell' | 'elevenlabs' | 'deepgram';

export interface ProviderConfig {
  id: string;
  tenant_id: string;
  provider_type: ProviderType;
  api_key: string;
  api_secret?: string;
  webhook_url?: string;
  webhook_secret?: string;
  configuration: Record<string, any>;
}

export interface VoiceAgent {
  id: string;
  name: string;
  voice_id: string;
  language?: string;
  configuration: Record<string, any>;
}

export interface PhoneNumber {
  id: string;
  number: string;
  country_code: string;
  type: 'local' | 'toll-free' | 'international';
}

export interface Call {
  id: string;
  agent_id: string;
  from_number: string;
  to_number: string;
  status: 'initiated' | 'ringing' | 'connected' | 'ended' | 'failed';
  duration?: number;
  metadata?: Record<string, any>;
}

// Base provider interface
export interface VoiceProvider {
  // Provider identification
  readonly type: ProviderType;
  readonly name: string;
  
  // Agent management
  listAgents(): Promise<VoiceAgent[]>;
  getAgent(agentId: string): Promise<VoiceAgent>;
  createAgent(config: CreateAgentConfig): Promise<VoiceAgent>;
  updateAgent(agentId: string, config: Partial<CreateAgentConfig>): Promise<VoiceAgent>;
  deleteAgent(agentId: string): Promise<void>;
  
  // Phone number management
  listPhoneNumbers(): Promise<PhoneNumber[]>;
  purchasePhoneNumber(params: PurchasePhoneNumberParams): Promise<PhoneNumber>;
  releasePhoneNumber(phoneNumberId: string): Promise<void>;
  
  // Call management
  initiateCall(params: InitiateCallParams): Promise<Call>;
  getCall(callId: string): Promise<Call>;
  endCall(callId: string): Promise<void>;
  
  // Webhook validation
  validateWebhook(payload: any, signature: string): boolean;
  parseWebhook(payload: any): WebhookEvent;
}

export interface CreateAgentConfig {
  name: string;
  voice_id: string;
  language?: string;
  llm_websocket_url?: string;
  llm_api_key?: string;
  system_prompt?: string;
  [key: string]: any; // Provider-specific fields
}

export interface InitiateCallParams {
  agent_id: string;
  from_number: string;
  to_number: string;
  metadata?: Record<string, any>;
}

export interface WebhookEvent {
  type: 'call.started' | 'call.ended' | 'call.failed' | 'transcription' | 'agent.response';
  call_id: string;
  agent_id: string;
  timestamp: string;
  data: Record<string, any>;
}
```

#### B. Provider Factory

```typescript
// src/lib/providers/factory.ts

import { VoiceProvider, ProviderConfig, ProviderType } from './types';
import { RetellProvider } from './retell';
import { ElevenLabsProvider } from './elevenlabs';
import { DeepgramProvider } from './deepgram';

export class ProviderFactory {
  static create(config: ProviderConfig): VoiceProvider {
    switch (config.provider_type) {
      case 'retell':
        return new RetellProvider(config);
      case 'elevenlabs':
        return new ElevenLabsProvider(config);
      case 'deepgram':
        return new DeepgramProvider(config);
      default:
        throw new Error(`Unsupported provider type: ${config.provider_type}`);
    }
  }
  
  static getProviderForAgent(agentId: string, tenantId: string): Promise<VoiceProvider> {
    // Fetch agent and its provider config from database
    // Return appropriate provider instance
  }
}
```

#### C. Provider Router

```typescript
// src/lib/providers/router.ts

export class ProviderRouter {
  /**
   * Routes operations to the correct provider based on agent configuration
   */
  static async routeToProvider<T>(
    agentId: string,
    tenantId: string,
    operation: (provider: VoiceProvider) => Promise<T>
  ): Promise<T> {
    const provider = await ProviderFactory.getProviderForAgent(agentId, tenantId);
    return operation(provider);
  }
  
  /**
   * Get provider for a tenant's default provider type
   */
  static async getTenantProvider(
    tenantId: string,
    providerType: ProviderType
  ): Promise<VoiceProvider> {
    // Fetch provider config from database
    // Return provider instance
  }
}
```

### 3. Provider-Specific Implementations

#### A. Retell Provider

```typescript
// src/lib/providers/retell/index.ts

import { VoiceProvider, VoiceAgent, Call, ... } from '../types';
import Retell from 'retell-sdk';

export class RetellProvider implements VoiceProvider {
  readonly type = 'retell' as const;
  readonly name = 'Retell AI';
  
  private client: Retell;
  
  constructor(private config: ProviderConfig) {
    this.client = new Retell({ apiKey: config.api_key });
  }
  
  async listAgents(): Promise<VoiceAgent[]> {
    const agents = await this.client.agent.list();
    return agents.map(this.mapRetellAgentToVoiceAgent);
  }
  
  async createAgent(config: CreateAgentConfig): Promise<VoiceAgent> {
    const retellAgent = await this.client.agent.create({
      agent_name: config.name,
      voice_id: config.voice_id,
      llm_websocket_url: config.llm_websocket_url,
      // ... Retell-specific mapping
    });
    return this.mapRetellAgentToVoiceAgent(retellAgent);
  }
  
  // ... implement all interface methods
  
  private mapRetellAgentToVoiceAgent(retellAgent: any): VoiceAgent {
    return {
      id: retellAgent.agent_id,
      name: retellAgent.agent_name,
      voice_id: retellAgent.voice_id,
      language: retellAgent.language,
      configuration: retellAgent,
    };
  }
}
```

#### B. Eleven Labs Provider

```typescript
// src/lib/providers/elevenlabs/index.ts

export class ElevenLabsProvider implements VoiceProvider {
  readonly type = 'elevenlabs' as const;
  readonly name = 'Eleven Labs';
  
  // Eleven Labs specific implementation
  // Different API structure, different voice models, etc.
}
```

#### C. Deepgram Provider

```typescript
// src/lib/providers/deepgram/index.ts

export class DeepgramProvider implements VoiceProvider {
  readonly type = 'deepgram' as const;
  readonly name = 'Deepgram';
  
  // Deepgram specific implementation
  // Different streaming protocol, different capabilities
}
```

### 4. Unified API Routes

#### A. Agent Management (Provider-Agnostic)

```typescript
// src/app/api/agents/route.ts

import { ProviderRouter } from '@/lib/providers/router';

// GET /api/agents - List agents (works with any provider)
export async function GET(request: NextRequest) {
  // Get agent from database
  // Use ProviderRouter to fetch from provider
  const provider = await ProviderRouter.getProviderForAgent(agentId, tenantId);
  const agents = await provider.listAgents();
  // ...
}

// POST /api/agents - Create agent
export async function POST(request: NextRequest) {
  const { provider_type, provider_config_id, ...agentConfig } = body;
  
  // Get provider config
  const providerConfig = await getProviderConfig(tenantId, provider_type);
  const provider = ProviderFactory.create(providerConfig);
  
  // Create agent via provider
  const voiceAgent = await provider.createAgent(agentConfig);
  
  // Save to database
  await supabase.from('agents').insert({
    tenant_id,
    provider_type,
    provider_configuration_id: providerConfig.id,
    provider_agent_id: voiceAgent.id,
    // ...
  });
}
```

#### B. Call Management (Provider-Agnostic)

```typescript
// src/app/api/calls/route.ts

export async function POST(request: NextRequest) {
  const { agent_id, from_number, to_number } = body;
  
  // Route to appropriate provider
  const call = await ProviderRouter.routeToProvider(
    agent_id,
    tenantId,
    async (provider) => {
      return provider.initiateCall({
        agent_id,
        from_number,
        to_number,
      });
    }
  );
  
  // Save interaction
  await supabase.from('interactions').insert({
    agent_id,
    provider_type: agent.provider_type,
    provider_call_id: call.id,
    // ...
  });
}
```

### 5. UI Components

#### A. Provider Selection

```typescript
// src/components/ProviderSelector.tsx

export function ProviderSelector({ tenantId, onSelect }) {
  const providers = ['retell', 'elevenlabs', 'deepgram'];
  
  return (
    <Select onChange={onSelect}>
      {providers.map(provider => (
        <option key={provider} value={provider}>
          {getProviderName(provider)}
        </option>
      ))}
    </Select>
  );
}
```

#### B. Provider Configuration UI

```typescript
// src/components/ProviderConfiguration.tsx

export function ProviderConfiguration({ providerType, config, onSave }) {
  // Render provider-specific configuration fields
  // Each provider can have different required fields
  return (
    <Form>
      {providerType === 'retell' && <RetellConfigFields />}
      {providerType === 'elevenlabs' && <ElevenLabsConfigFields />}
      {providerType === 'deepgram' && <DeepgramConfigFields />}
    </Form>
  );
}
```

## Migration Strategy

### Phase 1: Add Abstraction Layer (Non-Breaking)
1. Create provider interfaces and factory
2. Implement Retell provider using new interface
3. Keep existing Retell code working
4. Add new database columns (nullable)

### Phase 2: Migrate Existing Data
1. Migrate Retell agents to new schema
2. Update API routes to use ProviderRouter
3. Test thoroughly

### Phase 3: Add New Providers
1. Implement Eleven Labs provider
2. Implement Deepgram provider
3. Add provider selection UI
4. Test multi-provider scenarios

### Phase 4: Cleanup
1. Remove old Retell-specific columns (after migration period)
2. Remove direct Retell SDK usage
3. Update documentation

## What Needs to Be Available Before Integration

### 1. Core Infrastructure ✅
- [x] Multi-tenant database structure
- [x] Agent management system
- [x] Interaction tracking
- [x] Authentication & authorization

### 2. Provider Abstraction Layer ⚠️ (Needs Implementation)
- [ ] Provider interface definitions
- [ ] Provider factory
- [ ] Provider router
- [ ] Provider-specific implementations

### 3. Database Schema Updates ⚠️ (Needs Migration)
- [ ] `provider_configurations` table
- [ ] Updated `agents` table with provider fields
- [ ] Updated `interactions` table with provider fields
- [ ] Migration scripts

### 4. Configuration Management ⚠️ (Needs Implementation)
- [ ] Provider selection UI
- [ ] Provider configuration UI
- [ ] API key management per provider
- [ ] Provider switching logic

### 5. Unified API Routes ⚠️ (Needs Refactoring)
- [ ] Provider-agnostic agent routes
- [ ] Provider-agnostic call routes
- [ ] Provider-agnostic webhook handling
- [ ] Provider-specific extensions

### 6. Webhook Handling ⚠️ (Needs Abstraction)
- [ ] Unified webhook endpoint
- [ ] Provider-specific webhook parsers
- [ ] Webhook validation per provider
- [ ] Event normalization

### 7. Error Handling ⚠️ (Needs Standardization)
- [ ] Provider-specific error mapping
- [ ] Unified error responses
- [ ] Retry logic per provider
- [ ] Fallback mechanisms

## When to Fork to Provider-Specific Code

### ✅ Fork When:

1. **Voice Model Selection**
   - Each provider has different voice IDs/models
   - UI should show provider-specific voice options
   - Example: Retell uses `voice_id`, Eleven Labs uses `voice_id` but different format

2. **API Authentication**
   - Different key formats
   - Different auth methods (API key vs OAuth)
   - Example: Retell uses simple API key, Deepgram might use different format

3. **Webhook Payloads**
   - Each provider sends different webhook structures
   - Need provider-specific parsers
   - Example: Retell webhook format vs Eleven Labs format

4. **Real-time Streaming**
   - Different protocols (WebSocket, SSE, gRPC)
   - Different message formats
   - Example: Retell uses WebSocket, Deepgram might use different protocol

5. **Phone Number Management**
   - Different APIs and capabilities
   - Different number types available
   - Example: Retell manages phone numbers, Eleven Labs might not

6. **Billing Integration**
   - Different pricing models
   - Different usage tracking
   - Example: Per-minute vs per-character vs per-call

### ❌ Don't Fork When:

1. **Core Operations** (use abstraction)
   - Agent creation/update/delete
   - Call initiation
   - Status tracking

2. **Data Storage** (use unified schema)
   - Agent records
   - Interaction records
   - Billing records

3. **UI Components** (use provider-agnostic where possible)
   - Agent list views
   - Call history
   - Analytics dashboards

## Recommended File Structure

```
src/
├── lib/
│   ├── providers/
│   │   ├── types.ts              # Core interfaces
│   │   ├── factory.ts            # Provider factory
│   │   ├── router.ts             # Provider router
│   │   ├── retell/
│   │   │   ├── index.ts          # Retell provider implementation
│   │   │   ├── types.ts          # Retell-specific types
│   │   │   └── webhook.ts        # Retell webhook parser
│   │   ├── elevenlabs/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   └── webhook.ts
│   │   └── deepgram/
│   │       ├── index.ts
│   │       ├── types.ts
│   │       └── webhook.ts
│   └── ...
├── app/
│   └── api/
│       ├── agents/               # Provider-agnostic agent routes
│       ├── calls/                # Provider-agnostic call routes
│       ├── providers/            # Provider configuration routes
│       └── webhooks/             # Unified webhook endpoint
└── components/
    ├── providers/
    │   ├── ProviderSelector.tsx
    │   ├── ProviderConfiguration.tsx
    │   └── RetellConfigFields.tsx
    └── ...
```

## Next Steps

1. **Create Provider Abstraction Layer** (Priority 1)
   - Define core interfaces
   - Implement Retell provider using new interface
   - Create factory and router

2. **Database Migration** (Priority 1)
   - Create migration for provider_configurations table
   - Update agents and interactions tables
   - Migrate existing Retell data

3. **Refactor API Routes** (Priority 2)
   - Update agent routes to use ProviderRouter
   - Update call routes to use ProviderRouter
   - Create unified webhook endpoint

4. **Add Provider Selection UI** (Priority 2)
   - Provider selector component
   - Provider configuration forms
   - Update tenant settings

5. **Implement Additional Providers** (Priority 3)
   - Eleven Labs provider
   - Deepgram provider
   - Test multi-provider scenarios

## Conclusion

**Build an abstraction layer** with a provider router pattern. This allows:
- Clean separation of provider-specific code
- Easy addition of new providers
- Unified API for common operations
- Provider-specific implementations where needed

**Fork to provider-specific code** for:
- Voice model selection
- Webhook parsing
- Real-time streaming protocols
- Provider-specific features

**Keep unified** for:
- Core operations (CRUD)
- Data storage
- Common UI components

