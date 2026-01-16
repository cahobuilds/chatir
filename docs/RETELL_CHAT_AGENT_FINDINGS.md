# Retell AI Chat Agent Investigation Findings

## Executive Summary

After comprehensive testing, we've determined that **Retell AI agents configured with `channel: "voice"` cannot support chat sessions**, even if they have a `response_engine`. The `channel` field is determined automatically by Retell and cannot be changed via the API.

## Key Findings

### 1. Retell Requires `voice_id` for All Agents
- ✅ **Confirmed**: Even chat agents must have a `voice_id`
- ❌ **Failed**: Attempting to create an agent without `voice_id` results in: `400 {"error_message":"request/body must have required property 'voice_id'"}`

### 2. Channel Cannot Be Set Via API
- ✅ **Confirmed**: The `channel` field is **not** in `AgentCreateParams` or `AgentUpdateParams`
- ✅ **Confirmed**: Setting `channel: "chat"` in create/update requests is **ignored**
- ✅ **Confirmed**: Retell automatically determines channel based on creation method

### 3. Voice Agents Cannot Support Chat Sessions
- ✅ **Confirmed**: Agent `agent_61e0863a6f6a118daf0da48586` has:
  - `channel: "voice"`
  - `voice_id: "cartesia-Cleo"`
  - `response_engine: { type: "retell-llm", ... }`
  - `is_published: true` (version 6)
- ❌ **Failed**: Attempting to create a chat session results in: `422 Cannot start a chat session with selected agent`

### 4. Publish Status Investigation
- ✅ **Found**: Version 7 (current draft) is not published
- ✅ **Found**: Versions 0-6 are all published
- ✅ **Found**: Only difference between version 6 (published) and version 7 (unpublished) is `response_engine.version: 6 → 7`
- ⚠️ **Issue**: Publish API returns `204 No Content` (expected), but version 7 doesn't become published

### 5. Conversion Process
- ✅ **Documented**: Retell dashboard has a "Convert to Chat Agent" feature
- ❌ **Not Available**: No API endpoint for conversion
- ⚠️ **Limitation**: Conversion appears to be UI-only

## Test Results

### Strategy 1: Create Chat Agent Without `voice_id`
```
❌ Failed: 400 {"error_message":"request/body must have required property 'voice_id'"}
```
**Conclusion**: Not possible - `voice_id` is required for all agents.

### Strategy 2: Create Agent With `voice_id` and `channel: "chat"`
```
✅ Created: agent_a8435343fbecee308bd319d679
   Channel: voice  ← Retell ignored channel="chat" and set to "voice"
```
**Conclusion**: Retell ignores `channel` parameter and determines it automatically.

### Strategy 3: Create Voice Agent, Publish, Then Update for Chat
```
✅ Created voice agent
✅ Published (204 response)
❌ Chat session failed: 422 Cannot start a chat session
```
**Conclusion**: Voice agents cannot support chat sessions even after publishing.

## Recommendations

### Option 1: Create New Chat Agent (Recommended)
Since Retell determines channel automatically, we need to create agents in a way that results in `channel: "chat"`. Based on Retell documentation:

1. **Use Retell Dashboard**: Create the agent via dashboard as "Chat Agent" type
2. **API Workaround**: Try creating agent with minimal voice-specific config (may result in chat channel)
3. **Link to Database**: After creation, link the Retell agent ID to our database agent

### Option 2: Delete and Recreate
1. Delete current Retell agent (`agent_61e0863a6f6a118daf0da48586`)
2. Create new agent via Retell dashboard as "Chat Agent"
3. Update database with new `retell_agent_id`

### Option 3: Manual Conversion
1. Use Retell dashboard to convert existing agent from voice to chat
2. This will remove voice-specific features (DTMF, call transfers, etc.)
3. Agent should then support chat sessions

## Current Agent Status

**Agent**: `a3c2cb9c-28bb-4c74-aad0-67cdcae3d558` (Gratia Agent Test 3)
- **Retell Agent ID**: `agent_61e0863a6f6a118daf0da48586`
- **Channel**: `voice` ❌
- **Published**: Version 6 is published, Version 7 (draft) is not
- **Chat Support**: ❌ Cannot start chat sessions

## Next Steps

1. **Immediate**: Use Retell dashboard to convert agent from voice to chat, OR
2. **Alternative**: Create new chat agent via dashboard and update database
3. **Long-term**: Investigate if there's a specific API pattern that creates chat agents
4. **Code Update**: Update agent creation code to ensure chat agents are created correctly

## API Endpoints Tested

- ✅ `POST /create-agent` - Creates agent (channel determined automatically)
- ✅ `PATCH /update-agent/{id}` - Updates agent (channel cannot be changed)
- ✅ `POST /publish-agent/{id}` - Publishes agent (returns 204)
- ✅ `GET /get-agent/{id}` - Retrieves agent details
- ✅ `GET /get-agent-versions/{id}` - Lists all versions
- ✅ `POST /create-chat` - Creates chat session (fails for voice agents)

## References

- [Retell Chat Agent Documentation](https://docs.retellai.com/build/create-chat-agent)
- [Retell Publish Agent API](https://docs.retellai.com/api-references/publish-agent)
- [Retell Chat API](https://docs.retellai.com/api-references/create-chat)

