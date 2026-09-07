# Retell Chat Agent Guide (Native Chat Agent API)

> **Supersedes**: `RETELL_CHAT_AGENT_FINDINGS.md`, `RETELL_API_CHAT_AGENT_INVESTIGATION.md`,
> and `RETELL_CHAT_VOICE_BEST_PRACTICES.md` (all removed). Those docs documented a
> workaround for a real historical limitation: Retell's API used to only support creating
> *voice* agents, and the `channel` field on `AgentResponse` was read-only, so chat agents
> had to be created manually in the Retell dashboard and linked in after the fact. **Retell
> has since shipped a dedicated Chat Agent API** and that limitation no longer exists.
> This doc describes the current, correct approach.

## What changed

Retell now exposes chat agents as a **first-class, separate resource** from voice agents,
with its own full CRUD + versioning + publish surface:

| Operation | Endpoint | SDK method |
|---|---|---|
| Create | `POST /create-chat-agent` | `client.chatAgent.create(...)` |
| Retrieve | `GET /get-chat-agent/{id}` | `client.chatAgent.retrieve(id)` |
| Update | `PATCH /update-chat-agent/{id}` | `client.chatAgent.update(id, ...)` |
| List | `POST /v2/list-agents` (filtered) | `client.chatAgent.list({ filter_criteria: { channel: {...} } })` |
| Delete | `DEL /delete-chat-agent/{id}` | `client.chatAgent.delete(id)` |
| Publish | `POST /publish-agent-version/{id}` | `client.chatAgent.publish(id, { version })` |
| Version | `POST /create-agent-version/{id}` | `client.chatAgent.createVersion(id, { base_version })` |

This requires `retell-sdk` **v5.x or later** (`chatAgent` is not present in the v4.x SDK
this project originally shipped with — see "SDK version" below).

Key differences from the voice `agent` resource:
- **No `voice_id` at all.** Chat agents never had voice fields; there's nothing to omit.
- **`guardrail_config`** — built-in prohibited-topic detection for both user input
  (`input_topics`, e.g. jailbreak attempts) and agent output (`output_topics`, e.g.
  `regulated_professional_advice`, `harassment`, `violence`, etc.). See
  `docs/RETELL_IR_AGENT_TEMPLATE.md` for how this is used for the Investor Relations
  agent template.
- **`handbook_config`** — behavior presets (`scope_boundaries`, `ai_disclosure`,
  `default_personality`, `high_empathy`). `scope_boundaries` ("stay within prompt/context
  scope, don't invent details") is a meaningful built-in anti-hallucination toggle.
- **`post_chat_analysis_data`** with chat-specific system presets (`chat_summary`,
  `chat_successful`, `user_sentiment`).

## Creating a chat agent (current, correct way)

```typescript
// 1. Create (or reuse) a Retell LLM response engine
const llm = await client.llm.create({
  general_prompt: "...",
  model: "gpt-4.1",
});

// 2. Create the chat agent directly -- no dashboard round-trip needed
const chatAgent = await client.chatAgent.create({
  response_engine: { type: "retell-llm", llm_id: llm.llm_id },
  agent_name: "Acme Corp Investor Relations Chat",
  guardrail_config: {
    output_topics: ["regulated_professional_advice"],
    input_topics: ["platform_integrity_jailbreaking"],
  },
  handbook_config: {
    scope_boundaries: true,
    ai_disclosure: true,
  },
});

// 3. Publish once ready
await client.chatAgent.publish(chatAgent.agent_id, { version: chatAgent.version });
```

In this codebase, this flow is implemented at:
- `POST /api/retell/llms` — create the LLM
- `POST /api/retell/chat-agents` — create the chat agent (accepts `llm_id` shorthand and
  optionally links it to a local `agents` row in one call)
- `GET/PATCH/DELETE /api/retell/chat-agents/[id]` — manage an existing chat agent
- `POST /api/retell/chat-agents/[id]/publish` — publish (requires fetching the current
  `version` first; Retell's publish endpoint now requires an explicit version number)

The `ChatAgentList` component (`src/components/ChatAgentList.tsx`) uses this end to end:
creating a new agent in the UI creates the local record, creates a Retell LLM, creates the
native chat agent, and links all three together automatically.

## Linking an existing (dashboard-created) chat agent

The "Link Retell Agent" flow still exists for the case where a chat agent was created
directly in the Retell dashboard and needs to be attached to a local agent record
(`POST /api/agents/link-retell`). It now uses `chatAgent.retrieve()` / `agent.retrieve()`
directly (trying whichever matches the local agent's `type` first) instead of the old
workaround of creating and immediately ending a throwaway chat session just to prove the
agent exists.

## SDK version

This project depends on `retell-sdk`. The `chatAgent` resource, the unified
`{items, has_more, pagination_key}` list response shape, and the version-required
`publish()` signature all require a **current major version of the SDK** — confirm
`retell-sdk` in `package.json` is `^5.x` or later, not `^4.x`. If you see
`TypeError: retellClient.chatAgent is undefined`, the SDK is out of date; run
`npm install retell-sdk@latest`.

## Chat vs. voice: current best practice

Both channels share the same `response_engine` types (`retell-llm`, `custom-llm`,
`conversation-flow`), so the recommended pattern is still to **create separate agents per
channel that share one Retell LLM** when the same underlying knowledge/behavior should
power both a text chat widget and a phone/voice agent (e.g. the Investor Relations
template): one `chatAgent` and one `agent` (voice), both pointing at the same `llm_id`,
each with channel-appropriate prompt phrasing and (for voice) voice-specific settings.
See `docs/RETELL_IR_AGENT_TEMPLATE.md`.

## References

- [Retell Create Chat Agent API](https://docs.retellai.com/api-references/create-chat-agent)
- [Retell Create Chat Agent guide](https://docs.retellai.com/build/create-chat-agent)
- [Retell Guardrails](https://docs.retellai.com/build/guardrails)
- [Retell Agent Handbook](https://docs.retellai.com/build/agent-handbook)
- [Retell Knowledge Base](https://docs.retellai.com/build/knowledge-base)
- [`retell-typescript-sdk` source](https://github.com/RetellAI/retell-typescript-sdk)
