# Retell AI Integration Guide

## ✅ Integration Complete

The Retell AI SDK has been integrated into the multi-tenant platform for managing voice and chat bots.

## 📦 Installed Package

- `retell-sdk` - Official Retell AI TypeScript SDK

## 🔌 API Routes Created

### Retell Agent Management

**POST `/api/retell/agents`**
- Create Retell AI agent and link to local agent record
- Body: `{ tenant_id, agent_id, agent_name, voice_id, llm_websocket_url?, ...config }`
- Automatically updates agent record with `retell_agent_id`

**GET `/api/retell/agents/[id]`**
- Get Retell AI agent details
- Returns full Retell agent configuration

**PATCH `/api/retell/agents/[id]`**
- Update Retell AI agent configuration
- Body: `{ agent_name?, voice_id?, llm_websocket_url?, ...config }`
- Updates both Retell AI and local database

**DELETE `/api/retell/agents/[id]`**
- Delete Retell AI agent
- Removes agent from Retell AI platform

### Phone Call Management

**POST `/api/retell/calls`**
- Create a phone call via Retell AI
- Body: `{ agent_id, from_number, to_number, metadata? }`
- Creates interaction record automatically
- Returns Retell call details

**GET `/api/retell/phone-numbers`**
- Get available phone numbers for tenant
- Query: `?tenant_id=xxx`

**POST `/api/retell/phone-numbers`**
- Purchase/assign phone number
- Body: `{ tenant_id, area_code, agent_id? }`
- Can optionally assign to agent

### Webhooks

**POST `/api/webhooks/retell`**
- Handles Retell AI webhook events
- Events: `call.ended`, `call.connected`, `call.failed`
- Automatically updates interaction records
- Tracks call duration, transcript, status

### Interactions

**GET `/api/interactions`**
- Get all interactions for user's tenants
- Query params: `tenant_id`, `agent_id`, `status`, `limit`, `offset`
- Returns paginated results with agent and tenant info

## 🔧 Usage Examples

### 1. Create Retell AI Agent

```typescript
// First create local agent
const agentResponse = await fetch('/api/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenant_id: tenantId,
    name: 'Customer Support Bot',
    type: 'voice',
    description: 'Handles customer inquiries',
  }),
});

const { agent } = await agentResponse.json();

// Then create Retell AI agent
const retellResponse = await fetch('/api/retell/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenant_id: tenantId,
    agent_id: agent.id,
    agent_name: 'Customer Support Bot',
    voice_id: '11labs-Adrian', // Retell voice ID
    llm_websocket_url: 'wss://your-llm-endpoint.com',
    enable_transcription: true,
    enable_recording: true,
  }),
});

const { retell_agent } = await retellResponse.json();
```

### 2. Make a Phone Call

```typescript
const response = await fetch('/api/retell/calls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_id: agentId,
    from_number: '+1234567890', // Your Retell phone number
    to_number: '+0987654321',   // Customer phone number
    metadata: {
      customer_id: '123',
      order_id: '456',
    },
  }),
});

const { call, interaction } = await response.json();
// call.call_id - Retell call ID
// interaction.id - Local interaction ID
```

### 3. Get Phone Numbers

```typescript
const response = await fetch(`/api/retell/phone-numbers?tenant_id=${tenantId}`);
const { phone_numbers } = await response.json();
```

### 4. Purchase Phone Number

```typescript
const response = await fetch('/api/retell/phone-numbers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenant_id: tenantId,
    area_code: '415', // San Francisco
    agent_id: agentId, // Optional: assign to agent
  }),
});

const { phone_number } = await response.json();
```

## 🔗 Webhook Configuration

### In Retell AI Dashboard:

1. Go to Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/retell`
3. Select events:
   - ✅ `call.ended`
   - ✅ `call.connected`
   - ✅ `call.failed`

### Webhook Events Handled:

**`call.ended`**
- Updates interaction status to `completed`
- Records duration and transcript
- Marks for billing

**`call.connected`**
- Updates interaction status to `in_progress`

**`call.failed`**
- Updates interaction status to `failed`
- Records error message

## 🔐 Security

- ✅ Tenant API keys stored securely in database
- ✅ Per-tenant Retell API key isolation
- ✅ User access verified before Retell API calls
- ✅ RLS policies ensure tenant data isolation

## 📊 Interaction Tracking

Every call automatically creates an interaction record:
- Links to tenant and agent
- Tracks Retell call ID
- Records duration, transcript, status
- Ready for billing integration

## 🎯 Next Steps

1. ✅ Retell AI Integration - Complete
2. ⏭️ Configure Retell API keys per tenant
3. ⏭️ Set up webhook endpoint in Retell dashboard
4. ⏭️ Test phone call creation
5. ⏭️ Build UI for agent configuration

## 📚 Resources

- [Retell AI API Documentation](https://docs.retellai.com/api-references/create-phone-call)
- [Retell TypeScript SDK](https://github.com/RetellAI/retell-typescript-sdk)
- [Retell Webhooks Guide](https://docs.retellai.com/webhooks)

