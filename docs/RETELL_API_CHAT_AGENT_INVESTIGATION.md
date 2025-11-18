# Retell API Chat Agent Creation Investigation

## Executive Summary

**Conclusion**: Retell AI does **NOT** support programmatic creation of chat agents via their API. The `channel` field is **read-only** and determined automatically by Retell based on how the agent is created (dashboard vs API).

## Investigation Results

### Tested Patterns (All Failed)

We tested 7 different API payload patterns, and **ALL** resulted in `channel: "voice"`:

1. ✅ **Pattern 1**: Minimal payload (response_engine + voice_id) → `channel: "voice"`
2. ✅ **Pattern 2**: Explicit `channel: "chat"` → `channel: "voice"` (ignored)
3. ✅ **Pattern 3**: Minimal voice configs (no backchannel, no DTMF) → `channel: "voice"`
4. ✅ **Pattern 4**: Custom LLM (websocket) → `channel: "voice"`
5. ❌ **Pattern 5**: No voice_id → `400 error` (voice_id required)
6. ✅ **Pattern 6**: channel="chat" minimal → `channel: "voice"` (ignored)
7. ✅ **Pattern 7**: response_engine first → `channel: "voice"`

### Key Findings

1. **`channel` is NOT in API request parameters**
   - Not in `AgentCreateParams`
   - Not in `AgentUpdateParams`
   - Only appears in `AgentResponse` (read-only)

2. **`channel` is determined automatically**
   - Dashboard creation → Can select "Chat Agent" → Results in `channel: "chat"`
   - API creation → Always results in `channel: "voice"`

3. **`voice_id` is required for ALL agents**
   - Even chat agents must have `voice_id`
   - Error: `400 {"error_message":"request/body must have required property 'voice_id'"}`

4. **Voice agents cannot support chat sessions**
   - Even with `response_engine` and `is_published: true`
   - Error: `422 Cannot start a chat session with selected agent`

## Retell Documentation

According to Retell's official documentation:

> **Create a New Chat Agent**:
> - Navigate to the Agents section in your Retell dashboard.
> - Click "Create New Agent."
> - Select "Chat Agent" as the agent type.

**No API endpoint is mentioned for creating chat agents.**

## SDK Analysis

### AgentCreateParams Interface
```typescript
export interface AgentCreateParams {
  response_engine: ResponseEngineRetellLm | ResponseEngineCustomLm | ResponseEngineConversationFlow;
  voice_id: string;  // Required
  agent_name?: string | null;
  // ... many other optional fields
  // ❌ NO 'channel' field
}
```

### AgentResponse Interface
```typescript
export interface AgentResponse {
  agent_id: string;
  channel: string;  // ✅ Present in response (read-only)
  response_engine: ResponseEngine;
  voice_id: string;
  // ... other fields
}
```

## Conclusion

**Retell AI does not support programmatic creation of chat agents via their REST API.**

The `channel` field is:
- ✅ Present in API responses (`AgentResponse`)
- ❌ **NOT** present in API requests (`AgentCreateParams`, `AgentUpdateParams`)
- 🔒 **Read-only** - Determined by Retell based on creation method

## Workarounds

### Option 1: Dashboard Creation (Recommended)
1. Create chat agent via Retell dashboard
2. Retrieve `agent_id` from dashboard or via API
3. Link `agent_id` to database agent record

### Option 2: Dashboard Conversion
1. Create voice agent via API (as we currently do)
2. Use Retell dashboard to convert voice → chat
3. Agent will then support chat sessions

### Option 3: Hybrid Approach
1. Create voice agent via API for initial setup
2. Provide UI instructions for user to convert in dashboard
3. Or automate conversion via Retell dashboard API (if available)

## Recommendations

1. **Short-term**: Use Retell dashboard to convert existing agent
2. **Medium-term**: Create chat agents via dashboard, then link via API
3. **Long-term**: 
   - Contact Retell support to request API support for chat agent creation
   - Or implement a hybrid workflow that uses dashboard for chat agent creation

## API Endpoints Checked

- ✅ `POST /create-agent` - Creates agent (always voice)
- ✅ `PATCH /update-agent/{id}` - Updates agent (cannot change channel)
- ✅ `GET /get-agent/{id}` - Returns agent with channel field (read-only)
- ✅ `POST /publish-agent/{id}` - Publishes agent
- ✅ `POST /create-chat` - Creates chat session (fails for voice agents)

## References

- [Retell Chat Agent Documentation](https://docs.retellai.com/build/create-chat-agent)
- [Retell Create Agent API](https://docs.retellai.com/api-references/create-agent)
- [Retell Create Chat API](https://docs.retellai.com/api-references/create-chat)

