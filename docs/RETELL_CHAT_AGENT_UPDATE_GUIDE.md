# Retell Chat Agent Update Guide

## Can We Update Chat Agents Created in Dashboard?

**YES!** ✅ You can update chat agents created in the Retell dashboard via the API without changing their `channel` from "chat" to "voice".

## Key Finding

The `channel` field is **read-only** and **not included** in `AgentUpdateParams`. This means:
- ✅ Updating a chat agent will **preserve** its `channel: "chat"` status
- ✅ You can modify all other agent properties via API
- ❌ You **cannot** change `channel` via API (it's determined at creation time)

## Updatable Fields

Based on `AgentUpdateParams`, you can update the following fields via API:

### Core Fields
- ✅ `agent_name` - Agent display name
- ✅ `voice_id` - Voice selection
- ✅ `response_engine` - LLM configuration (type, llm_id, llm_websocket_url)
- ✅ `language` - Language/dialect for speech recognition

### Configuration Fields
- ✅ `allow_user_dtmf` - Enable/disable DTMF input
- ✅ `enable_backchannel` - Enable backchannel responses
- ✅ `backchannel_frequency` - Frequency of backchannel
- ✅ `backchannel_words` - Custom backchannel words
- ✅ `data_storage_setting` - Data storage preferences
- ✅ `pii_config` - PII scrubbing configuration
- ✅ `normalize_for_speech` - Text normalization
- ✅ `opt_in_signed_url` - Signed URL preferences

### Voice-Specific Fields (May Not Apply to Chat)
- ⚠️ `ambient_sound` - Ambient sound (voice calls only)
- ⚠️ `begin_message_delay_ms` - First message delay (voice calls only)
- ⚠️ `end_call_after_silence_ms` - Call timeout (voice calls only)
- ⚠️ `interruption_sensitivity` - Interruption handling (voice calls only)
- ⚠️ `max_call_duration_ms` - Maximum call duration (voice calls only)
- ⚠️ `ring_duration_ms` - Ring duration (voice calls only)
- ⚠️ `stt_mode` - Speech-to-text mode (voice calls only)
- ⚠️ `vocab_specialization` - Vocabulary specialization (voice calls only)

**Note**: Voice-specific fields may be ignored for chat agents or have no effect.

## Workflow Recommendation

### Step 1: Create Chat Agent in Dashboard
1. Go to Retell Dashboard → Agents → Create New Agent
2. Select **"Chat Agent"** as agent type
3. Configure basic settings (name, LLM, voice)
4. Copy the `agent_id` from dashboard

### Step 2: Link to Database
```typescript
// Update database agent with Retell agent_id
await supabase
  .from('agents')
  .update({
    retell_agent_id: 'agent_xxxxx', // From dashboard
  })
  .eq('id', database_agent_id);
```

### Step 3: Update via API
```typescript
// Update agent name, LLM, or other settings
PATCH /api/retell/agents/{database_agent_id}
{
  "agent_name": "Updated Name",
  "response_engine": {
    "type": "retell-llm",
    "llm_id": "llm_xxxxx"
  },
  "voice_id": "cartesia-Cleo"
}
```

The `channel` will remain `"chat"` ✅

## Our API Endpoint

We already have an update endpoint at:
- **PATCH** `/api/retell/agents/[id]`

This endpoint:
- ✅ Accepts `agent_name`, `voice_id`, `response_engine`, and other Retell config fields
- ✅ Updates the Retell agent via API
- ✅ Updates local database configuration
- ✅ **Preserves** the `channel` field (cannot change it)

## Example: Updating Chat Agent

```typescript
// Update chat agent's LLM
const response = await fetch(`/api/retell/agents/${agentId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_name: 'My Chat Agent',
    response_engine: {
      type: 'retell-llm',
      llm_id: 'llm_new_llm_id',
    },
    voice_id: 'cartesia-Cleo',
  }),
});
```

After this update:
- ✅ Agent name updated
- ✅ LLM updated
- ✅ Voice updated
- ✅ **Channel remains "chat"** (unchanged)

## Testing

To verify channel preservation, you can:

1. Create a chat agent in dashboard
2. Update it via API
3. Retrieve agent details:
   ```typescript
   GET /api/retell/agents/{id}
   ```
4. Verify `channel` is still `"chat"`

## Limitations

- ❌ Cannot change `channel` via API (must use dashboard conversion)
- ⚠️ Voice-specific fields may not apply to chat agents
- ⚠️ Some fields may be ignored for chat agents (e.g., `ambient_sound`)

## Conclusion

**Yes, you can fully manage chat agents created in the dashboard via our API**, as long as you don't need to change the channel. All other properties can be updated programmatically.

