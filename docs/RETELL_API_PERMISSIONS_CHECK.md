# Retell API Key Permissions Check

This document outlines all Retell API functions required for complete agent setup and how to verify your API key has access to them.

## Required API Functions for Agent Setup

### 1. Agent Management (CRUD Operations)
- ✅ `agent.list()` - List all agents
- ✅ `agent.create()` - Create a new agent
- ✅ `agent.retrieve(agent_id)` - Get agent details
- ✅ `agent.update(agent_id, config)` - Update agent configuration
- ✅ `agent.delete(agent_id)` - Delete an agent

**Used in:**
- `/api/retell/agents` (GET, POST)
- `/api/retell/agents/[id]` (GET, PATCH, DELETE)
- `/api/tenants/[id]/retell/connect` (POST - connection test)

### 2. Phone Number Management
- ✅ `phoneNumber.list()` - List available phone numbers
- ✅ `phoneNumber.create(params)` - Purchase/assign phone number

**Used in:**
- `/api/retell/phone-numbers` (GET, POST)

### 3. Call Management
- ✅ `call.createPhoneCall(params)` - Create a phone call
- ✅ `call.createWebCall(params)` - Create a web call (for testing)

**Used in:**
- `/api/retell/calls` (POST)
- `/api/agents/[id]/test` (POST)
- `/api/agents/[id]/test/web-call` (POST)

### 4. Voice & LLM Configuration (Optional but Recommended)
- ⚠️ `voice.list()` - List available voices
- ⚠️ `llm.list()` - List available LLMs

**Note:** These are helpful for agent configuration but not strictly required if you know the voice_id/llm_id beforehand.

## How to Test API Key Permissions

### Option 1: Use the Test Script

```bash
# Set your API key as environment variable
export RETELL_API_KEY="your_api_key_here"

# Run the test script
npx tsx scripts/test-retell-api-permissions.ts

# Or pass API key as argument
npx tsx scripts/test-retell-api-permissions.ts "your_api_key_here"
```

### Option 2: Direct Retell API (curl)

Retell REST calls authenticate with `Authorization: Bearer <RETELL_API_KEY>` — the same format used by `retell-sdk` (`src/lib/retell.ts`) and scripts such as `scripts/test-direct-retell-chat-api.ts`. Prefer **Option 1** for a full permission sweep; use curl for a quick smoke test:

```bash
export RETELL_API_KEY="your_api_key_here"

# List agents (POST /v2/list-agents)
curl -s -X POST "https://api.retellai.com/v2/list-agents" \
  -H "Authorization: Bearer $RETELL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

> **Note:** This app's `/api/retell/*` proxy routes use Supabase **session cookies**, not a Bearer token in curl. Test those from the logged-in UI or use Option 1.

### Option 3: Check Retell Dashboard

1. Log into your Retell AI dashboard
2. Go to Settings → API Keys
3. Verify your API key has the following permissions:
   - ✅ Agent Management (Read/Write)
   - ✅ Phone Number Management (Read/Write)
   - ✅ Call Management (Create)

## Common Permission Issues

### Error: "Invalid API key"
- **Cause:** API key is incorrect or expired
- **Solution:** Generate a new API key from Retell dashboard

### Error: "Insufficient permissions"
- **Cause:** API key doesn't have required scopes
- **Solution:** Check API key permissions in Retell dashboard

### Error: "Rate limit exceeded"
- **Cause:** Too many API calls
- **Solution:** Wait and retry, or upgrade your Retell plan

### Error: "Resource not found"
- **Cause:** Trying to access resource that doesn't exist
- **Solution:** Verify the resource ID is correct

## Minimum Required Permissions

For complete agent setup functionality, your API key needs:

1. **Agent Management:**
   - Create agents
   - Read agent details
   - Update agent configuration
   - Delete agents
   - List agents

2. **Phone Number Management:**
   - List phone numbers
   - Purchase phone numbers (if needed)

3. **Call Management:**
   - Create phone calls
   - Create web calls (for testing)

## Verification Checklist

- [ ] Can list agents (`agent.list()`)
- [ ] Can create agents (`agent.create()`)
- [ ] Can retrieve agent details (`agent.retrieve()`)
- [ ] Can update agents (`agent.update()`)
- [ ] Can delete agents (`agent.delete()`)
- [ ] Can list phone numbers (`phoneNumber.list()`)
- [ ] Can create phone calls (`call.createPhoneCall()`)
- [ ] (Optional) Can list voices (`voice.list()`)
- [ ] (Optional) Can list LLMs (`llm.list()`)

## Next Steps

If all tests pass:
✅ Your API key has full access to all required functions
✅ You can proceed with agent setup

If any tests fail:
⚠️ Check the error message
⚠️ Verify API key permissions in Retell dashboard
⚠️ Contact Retell support if needed

