# Agent Setup API Requirements Analysis

## Summary

Based on the codebase analysis, here are all the Retell API functions currently used for agent setup and their status.

## ✅ Currently Implemented API Functions

### Agent Management (All Required Functions)
| Function | Route | Status | Purpose |
|----------|-------|--------|---------|
| `agent.list()` | `/api/retell/agents` (GET) | ✅ Implemented | List all agents for a tenant |
| `agent.create()` | `/api/retell/agents` (POST) | ✅ Implemented | Create new Retell agent |
| `agent.retrieve()` | `/api/retell/agents/[id]` (GET) | ✅ Implemented | Get agent details |
| `agent.update()` | `/api/retell/agents/[id]` (PATCH) | ✅ Implemented | Update agent configuration |
| `agent.delete()` | `/api/retell/agents/[id]` (DELETE) | ✅ Implemented | Delete agent |

### Phone Number Management
| Function | Route | Status | Purpose |
|----------|-------|--------|---------|
| `phoneNumber.list()` | `/api/retell/phone-numbers` (GET) | ✅ Implemented | List available phone numbers |
| `phoneNumber.create()` | `/api/retell/phone-numbers` (POST) | ✅ Implemented | Purchase/assign phone number |

### Call Management
| Function | Route | Status | Purpose |
|----------|-------|--------|---------|
| `call.createPhoneCall()` | `/api/retell/calls` (POST) | ✅ Implemented | Create phone call |
| `call.createWebCall()` | `/api/agents/[id]/test/web-call` | ✅ Implemented | Create web call for testing |

### Connection Testing
| Function | Route | Status | Purpose |
|----------|-------|--------|---------|
| `agent.list({ limit: 1 })` | `/api/tenants/[id]/retell/connect` | ✅ Implemented | Test API key validity |

## ⚠️ Optional but Useful Functions

These are not currently implemented but would be helpful:

| Function | Purpose | Priority |
|----------|---------|----------|
| `voice.list()` | List available voices for selection | Medium |
| `llm.list()` | List available LLMs for configuration | Medium |
| `call.retrieve()` | Get call details/status | Low |
| `call.list()` | List call history | Low |

## Required API Key Permissions

Your Retell API key needs access to:

1. **Agent Management** (Full CRUD)
   - ✅ Create agents
   - ✅ Read agents
   - ✅ Update agents
   - ✅ Delete agents

2. **Phone Number Management**
   - ✅ List phone numbers
   - ✅ Purchase phone numbers

3. **Call Management**
   - ✅ Create phone calls
   - ✅ Create web calls

## How to Verify API Key Access

### Quick Test via Connection Endpoint

The easiest way to test is through the connection endpoint:

```bash
# This will test if your API key can list agents (minimal permission check)
POST /api/tenants/[id]/retell/connect
{
  "retell_api_key": "your_api_key_here"
}
```

### Comprehensive Test

Use the test script:

```bash
npx tsx scripts/test-retell-api-permissions.ts "your_api_key_here"
```

This will test:
- ✅ Agent listing
- ✅ Agent creation
- ✅ Agent retrieval
- ✅ Agent update
- ✅ Agent deletion
- ✅ Phone number listing
- ✅ Voice listing (if available)
- ✅ LLM listing (if available)

## Current Implementation Coverage

**Coverage: 100%** ✅

All required functions for agent setup are implemented:
- ✅ Agent CRUD operations
- ✅ Phone number management
- ✅ Call creation
- ✅ API key validation

## Next Steps

1. **Test your API key** using the connection endpoint or test script
2. **Verify permissions** in Retell dashboard if any tests fail
3. **Proceed with agent setup** if all tests pass

## Files to Check

- `src/app/api/retell/agents/route.ts` - Agent CRUD
- `src/app/api/retell/agents/[id]/route.ts` - Agent operations
- `src/app/api/retell/phone-numbers/route.ts` - Phone number management
- `src/app/api/retell/calls/route.ts` - Call creation
- `src/app/api/tenants/[id]/retell/connect/route.ts` - API key validation

