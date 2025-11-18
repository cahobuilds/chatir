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
      similarity_threshold: 0.7, // 0-1, how similar chunks must be
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
      similarity_threshold: 0.7,
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

### What We Have

✅ **Agent Update Endpoint**: `PATCH /api/retell/agents/[id]`
- Already supports updating `response_engine`
- Can accept `knowledge_base_ids` in `response_engine`

### What We Need to Add

1. **Knowledge Base Management Endpoints**:
   - `GET /api/retell/knowledge-bases` - List knowledge bases
   - `POST /api/retell/knowledge-bases` - Create knowledge base
   - `GET /api/retell/knowledge-bases/[id]` - Get knowledge base details
   - `PATCH /api/retell/knowledge-bases/[id]` - Update knowledge base
   - `DELETE /api/retell/knowledge-bases/[id]` - Delete knowledge base
   - `POST /api/retell/knowledge-bases/[id]/sources` - Add sources

2. **UI Components**:
   - Knowledge base list/management UI
   - Link knowledge base to agent in agent configuration
   - Display linked knowledge bases in agent details

## Example: Linking KB to Chat Agent

```typescript
// Via our API endpoint
PATCH /api/retell/agents/{database_agent_id}
{
  "response_engine": {
    "type": "retell-llm",
    "llm_id": "llm_xxxxx",
    "knowledge_base_ids": ["kb_123456"],
    "kb_config": {
      "similarity_threshold": 0.7,
      "top_k": 5
    }
  }
}
```

This will:
- ✅ Update the agent's LLM configuration
- ✅ Link the knowledge base
- ✅ **Preserve** `channel: "chat"` (if agent is a chat agent)

## Knowledge Base Configuration

### KB Config Options

```typescript
kb_config: {
  similarity_threshold: number, // 0-1, minimum similarity score
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

