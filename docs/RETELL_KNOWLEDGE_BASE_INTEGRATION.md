# Retell Knowledge Base Integration Guide

## Overview

Retell AI supports linking knowledge bases to chat agents via the LLM's `response_engine` configuration. Knowledge bases enable RAG (Retrieval-Augmented Generation) to provide agents with access to custom information.

## How Knowledge Bases Work

Knowledge bases are linked to agents **through the LLM configuration**, not directly to the agent. The workflow is:

1. **Create Knowledge Base** → Get `knowledge_base_id`
2. **Link to LLM** → Add `knowledge_base_ids` to LLM's `response_engine`
3. **Update Agent** → Agent uses LLM with knowledge base

## API Support

### ✅ Knowledge Base Management (Full API Support)

Retell SDK provides complete knowledge base management:

```typescript
// Create knowledge base
const kb = await retellClient.knowledgeBase.create({
  knowledge_base_name: 'My Knowledge Base',
  knowledge_base_urls: ['https://example.com/docs'],
  knowledge_base_texts: [{ text: 'Custom text content' }],
  knowledge_base_files: [file1, file2], // PDF, DOCX, etc.
  enable_auto_refresh: true, // Auto-refresh URLs every 24h
});

// List knowledge bases
const kbs = await retellClient.knowledgeBase.list();

// Retrieve knowledge base
const kbDetails = await retellClient.knowledgeBase.retrieve('kb_xxxxx');

// Add sources to existing KB
await retellClient.knowledgeBase.addSources('kb_xxxxx', {
  knowledge_base_urls: ['https://new-url.com'],
  knowledge_base_texts: [{ text: 'More content' }],
});

// Delete knowledge base
await retellClient.knowledgeBase.delete('kb_xxxxx');
```

### ✅ Linking to Agents (Via LLM Configuration)

Knowledge bases are linked through the `response_engine`:

```typescript
// Update agent's response_engine to include knowledge base
await retellClient.agent.update(agentId, {
  response_engine: {
    type: 'retell-llm',
    llm_id: 'llm_xxxxx',
    knowledge_base_ids: ['kb_123', 'kb_456'], // Array of KB IDs
    kb_config: {
      filter_score: 0.7, // 0-1, minimum similarity score for a retrieved chunk
      top_k: 5, // Max number of chunks to retrieve
    },
  },
});
```

## Implementation Options

### Option 1: Link Existing Knowledge Base to Agent

If you already have a knowledge base created in the dashboard:

```typescript
// 1. Get knowledge base ID from dashboard or API
const kbs = await retellClient.knowledgeBase.list();
const myKB = kbs.find(kb => kb.knowledge_base_name === 'My KB');

// 2. Update agent's response_engine
await retellClient.agent.update(agentId, {
  response_engine: {
    type: 'retell-llm',
    llm_id: currentLLMId,
    knowledge_base_ids: [myKB.knowledge_base_id],
    kb_config: {
      filter_score: 0.7,
      top_k: 5,
    },
  },
});
```

### Option 2: Create Knowledge Base and Link Programmatically

```typescript
// 1. Create knowledge base
const kb = await retellClient.knowledgeBase.create({
  knowledge_base_name: 'Agent Knowledge Base',
  knowledge_base_urls: ['https://docs.example.com'],
  enable_auto_refresh: true,
});

// 2. Wait for processing (check status)
let kbStatus = 'processing';
while (kbStatus === 'processing') {
  await new Promise(resolve => setTimeout(resolve, 2000));
  const kbDetails = await retellClient.knowledgeBase.retrieve(kb.knowledge_base_id);
  kbStatus = kbDetails.status;
}

// 3. Link to agent
await retellClient.agent.update(agentId, {
  response_engine: {
    type: 'retell-llm',
    llm_id: currentLLMId,
    knowledge_base_ids: [kb.knowledge_base_id],
  },
});
```

## Our Current Implementation

> **Update**: all of this is now implemented. This section originally described a plan;
> it's kept below (marked historical) for context, followed by what was actually built.

### What we have (current, as of the KB<->agent linking work)

✅ **Knowledge Base Management** (`/api/knowledge-bases`, `/api/knowledge-bases/[id]/sources`,
`/api/retell/knowledge-bases/sync`) -- create/list/sync knowledge bases and add
URL/file/text sources, all backed by the real Retell `knowledgeBase` resource.

✅ **Agent <-> Knowledge Base linking**: `GET`/`PATCH /api/agents/[id]/knowledge-bases`
(`src/app/api/agents/[id]/knowledge-bases/route.ts`). This is a **dedicated endpoint**,
not a field tacked onto the agent update endpoint -- it:
- Resolves local KB row ids to their Retell `knowledge_base_id`.
- Resolves the agent's `llm_id` from its `response_engine` (working for both the voice
  `agent` resource and the native `chatAgent` resource -- see
  `docs/RETELL_CHAT_AGENT_GUIDE.md`).
- Calls `retellClient.llm.update(llmId, { knowledge_base_ids, kb_config })` directly on
  the LLM (not through the agent's own update endpoint -- `knowledge_base_ids`/`kb_config`
  are LLM-level fields, not agent-level fields).
- Mirrors the link into a local `agent_knowledge_bases` table (migration
  `20260101000000_create_agent_knowledge_bases.sql`) purely for fast UI display; Retell
  remains the source of truth for whether retrieval actually happens.

✅ **UI**: the "Knowledge Base" tab in `AgentEditModal` (multi-select + filter_score/top_k
sliders), and a "Used by agents" section on the Knowledge Base detail page
(`src/components/KnowledgeBaseDetail.tsx`) showing which agents currently reference each KB.

### Correction: the field is `filter_score`, not `similarity_threshold`

An earlier draft of this doc (and this project's docs generally) used
`similarity_threshold` as the KB config field name. **The actual Retell API field is
`filter_score`** (confirmed against the current `retell-typescript-sdk` source,
`LlmUpdateParams.KBConfig`). The code in this repo uses `filter_score` correctly; if you
see `similarity_threshold` anywhere it is a naming error to fix, not an alternate valid
field.

## Example: Linking KB to an agent (current, correct way)

```typescript
// Via our dedicated endpoint (not the agent update endpoint):
PATCH /api/agents/{database_agent_id}/knowledge-bases
{
  "knowledge_base_ids": ["<local-kb-row-id-1>", "<local-kb-row-id-2>"],
  "filter_score": 0.75,
  "top_k": 5
}
```

Internally this resolves to a call against the agent's **LLM**, not the agent itself:

```typescript
await retellClient.llm.update(llmId, {
  knowledge_base_ids: ["kb_123456"],
  kb_config: { filter_score: 0.75, top_k: 5 },
});
```

This will:
- ✅ Update the agent's underlying LLM's knowledge base configuration
- ✅ Link the knowledge base for retrieval on the next message
- ✅ Leave the agent's own `channel`/`response_engine.type` untouched (this call never
  touches the agent resource itself)

## Knowledge Base Configuration

### KB Config Options

```typescript
kb_config: {
  filter_score: number, // 0-1, minimum similarity score for a retrieved chunk
  top_k: number, // Max chunks to retrieve per query
}
```

### Knowledge Base Sources

- **URLs**: Web pages to scrape (`knowledge_base_urls`)
- **Text**: Custom text snippets (`knowledge_base_texts`)
- **Files**: PDF, DOCX, TXT files (`knowledge_base_files`)

### Auto-Refresh

- `enable_auto_refresh: true` → URLs refreshed every 24 hours
- Useful for documentation sites that update frequently

## Testing Knowledge Base Integration

1. Create a test knowledge base with a simple URL
2. Wait for processing to complete
3. Link to agent via API
4. Test chat session - agent should use KB content in responses

## References

- [Retell Knowledge Base Docs](https://docs.retellai.com/build/knowledge-base)
- Retell SDK: `knowledgeBase` resource
- LLM `response_engine` supports `knowledge_base_ids` and `kb_config`

