# Retell Chat vs Voice Agents: Best Practices

## Overview

Retell AI supports both **voice agents** and **chat agents** using the same underlying architecture. The primary difference is the presence of a `voice_id` field.

## Key Differences

### Voice Agents
- **Required**: `voice_id` (e.g., "11labs-Cimo")
- **Required**: `response_engine` (with `llm_id` or `llm_websocket_url`)
- **Use Case**: Phone calls, voice interactions
- **Features**: Voice synthesis, call transfers, DTMF, telephony features

### Chat Agents
- **Required**: `response_engine` (with `llm_id` or `llm_websocket_url`)
- **NOT Required**: `voice_id` (must be absent/null)
- **Use Case**: Text-based chat, SMS, web widgets
- **Features**: Text responses, no voice synthesis

## Architecture

Both agent types use the same `response_engine` configuration:

```typescript
// Voice Agent
{
  agent_name: "Customer Support",
  voice_id: "11labs-Cimo",  // ← Required for voice
  response_engine: {
    type: "retell-llm",
    llm_id: "llm_abc123"
  }
}

// Chat Agent (same response_engine, no voice_id)
{
  agent_name: "Customer Support Chat",
  // voice_id: null or absent  // ← Must be absent for chat
  response_engine: {
    type: "retell-llm",
    llm_id: "llm_abc123"  // ← Same LLM configuration
  }
}
```

## Converting Between Voice and Chat

### ✅ Best Practice: Create Separate Agents

**Recommended Approach**: Create separate agents for voice and chat, sharing the same `response_engine` configuration.

**Why?**
- Different interaction patterns (voice vs text)
- Different features (call transfers vs text formatting)
- Easier to optimize each channel independently
- Better analytics and tracking

**Implementation:**
```typescript
// 1. Create voice agent
const voiceAgent = await createRetellAgent({
  agent_name: "Support Voice",
  voice_id: "11labs-Cimo",
  response_engine: {
    type: "retell-llm",
    llm_id: "llm_abc123"
  },
  prompt: "You are a helpful customer support agent..."
});

// 2. Create chat agent with same LLM but no voice_id
const chatAgent = await createRetellAgent({
  agent_name: "Support Chat",
  // No voice_id!
  response_engine: {
    type: "retell-llm",
    llm_id: "llm_abc123"  // Same LLM
  },
  prompt: "You are a helpful customer support agent..." // Same prompt
});
```

### 🔄 Alternative: Convert Existing Agent

**If you must convert**, update the agent configuration:

**Voice → Chat:**
```typescript
// Remove voice_id, keep response_engine
await updateRetellAgent(agentId, {
  voice_id: null,  // Remove voice capability
  // Keep response_engine unchanged
});
```

**Chat → Voice:**
```typescript
// Add voice_id, keep response_engine
await updateRetellAgent(agentId, {
  voice_id: "11labs-Cimo",  // Add voice capability
  // Keep response_engine unchanged
});
```

**⚠️ Limitations:**
- Voice-specific features (call transfers, DTMF) will be lost when converting to chat
- Chat-specific optimizations (text formatting) may not apply to voice
- Historical interactions may be affected

## Best Practices

### 1. **Shared Configuration Pattern**

Create a shared configuration object that both agents use:

```typescript
const sharedConfig = {
  response_engine: {
    type: "retell-llm",
    llm_id: "llm_abc123"
  },
  prompt: "You are a helpful customer support agent...",
  enable_transcription: true,
  // ... other shared settings
};

// Voice agent
const voiceAgent = {
  ...sharedConfig,
  voice_id: "11labs-Cimo",
  agent_name: "Support Voice"
};

// Chat agent
const chatAgent = {
  ...sharedConfig,
  // No voice_id
  agent_name: "Support Chat"
};
```

### 2. **Channel-Specific Optimizations**

While sharing core logic, optimize for each channel:

**Voice Optimizations:**
- Shorter responses (users can't re-read)
- Clear pauses and confirmations
- Voice-specific prompts ("speak clearly", "repeat if needed")

**Chat Optimizations:**
- Longer, detailed responses (users can read at their pace)
- Rich formatting (markdown, links, lists)
- Text-specific prompts ("type your question", "use emojis if helpful")

### 3. **Unified Prompt Strategy**

Use conditional prompts that adapt to channel:

```typescript
const basePrompt = "You are a helpful customer support agent.";

const voicePrompt = `${basePrompt} 
Speak clearly and concisely. 
Ask for confirmation before proceeding with actions.`;

const chatPrompt = `${basePrompt}
Provide detailed, well-formatted responses.
Use markdown formatting for lists and links.`;
```

### 4. **Response Engine Options**

Both voice and chat agents support the same `response_engine` types:

**Option A: Retell LLM** (Recommended for most cases)
```typescript
response_engine: {
  type: "retell-llm",
  llm_id: "llm_abc123"
}
```

**Option B: Custom LLM WebSocket** (For advanced control)
```typescript
response_engine: {
  type: "custom-llm",
  llm_websocket_url: "wss://your-llm-endpoint.com"
}
```

### 5. **Connection Methods**

**Voice Agents:**
- Phone calls via Retell API (`/api/retell/calls`)
- WebRTC for browser-based voice (`RetellWebClient`)
- Uses `voice_id` for TTS

**Chat Agents:**
- WebSocket connection to `llm_websocket_url` (for custom LLM)
- Retell Chat API (if available)
- Text-based responses only

## Implementation in This Codebase

### Current API Endpoints

**Create Agent** (`POST /api/retell/agents`):
- Currently requires `voice_id` (voice-only)
- **TODO**: Make `voice_id` optional for chat agents

**Update Agent** (`PATCH /api/retell/agents/[id]`):
- Supports updating `voice_id` (can add/remove)
- Supports updating `response_engine`
- **Can be used for conversion**

**Sync Agents** (`POST /api/retell/agents/sync`):
- Automatically detects type based on `voice_id` presence
- Syncs both voice and chat agents correctly

### Recommended Workflow

1. **Create Base Configuration**
   ```typescript
   const baseConfig = {
     prompt: "Your agent prompt...",
     response_engine: { type: "retell-llm", llm_id: "..." }
   };
   ```

2. **Create Voice Agent**
   ```typescript
   POST /api/retell/agents
   {
     ...baseConfig,
     voice_id: "11labs-Cimo",
     agent_name: "Support Voice"
   }
   ```

3. **Create Chat Agent** (when API supports it)
   ```typescript
   POST /api/retell/agents
   {
     ...baseConfig,
     // No voice_id
     agent_name: "Support Chat"
   }
   ```

4. **Or Convert Existing Agent**
   ```typescript
   PATCH /api/retell/agents/[id]
   {
     voice_id: null  // Remove voice → becomes chat
     // OR
     voice_id: "11labs-Cimo"  // Add voice → becomes voice
   }
   ```

## Summary

✅ **Best Practice**: Create separate agents for voice and chat, sharing `response_engine` configuration

✅ **Conversion**: Possible but not recommended - use separate agents instead

✅ **Shared Logic**: Use the same `response_engine` and `prompt` for consistency

✅ **Channel Optimization**: Adapt prompts and responses for each channel's strengths

✅ **Unified Experience**: Maintain consistent personality and knowledge across both channels

