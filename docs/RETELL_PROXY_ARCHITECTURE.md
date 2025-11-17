# Retell API Proxy Architecture

## Overview

This document outlines the hybrid proxy approach for obfuscating Retell API calls from the frontend while maintaining optimal audio performance. The approach uses a Next.js API proxy layer for REST API calls while keeping WebRTC connections direct to Retell for real-time audio.

## Architecture Goals

1. **Obfuscation**: Hide Retell API structure and endpoints from frontend
2. **Security**: Centralize API key management and add rate limiting
3. **Control**: Centralize business logic and enable custom features
4. **Performance**: Maintain direct WebRTC connections for low-latency audio
5. **Flexibility**: Enable future provider switching or multi-provider support

## Current Architecture

```
Frontend → Retell Web SDK → Retell WebRTC/WebSocket → Retell Infrastructure
         ↓
    Server API (generates access tokens)
```

## Proposed Architecture

```
Frontend → Your API Proxy (SSE/WebSocket) → Retell REST API
         ↓
    Retell Web SDK (WebRTC direct - for audio only)
         ↓
    Retell WebRTC Infrastructure
```

## What Gets Proxied

### ✅ Proxied Through Your API

1. **Call Management**
   - Create web calls (`POST /api/proxy/retell/calls/web`)
   - Create phone calls (`POST /api/proxy/retell/calls/phone`)
   - Get call status (`GET /api/proxy/retell/calls/:call_id`)
   - End calls (`POST /api/proxy/retell/calls/:call_id/end`)

2. **Agent Management**
   - List agents (`GET /api/proxy/retell/agents`)
   - Get agent details (`GET /api/proxy/retell/agents/:agent_id`)
   - Update agents (`PATCH /api/proxy/retell/agents/:agent_id`)
   - Create agents (`POST /api/proxy/retell/agents`)

3. **LLM Management**
   - Get LLM details (`GET /api/proxy/retell/llms/:llm_id`)
   - Update LLM prompts (`PATCH /api/proxy/retell/llms/:llm_id`)

4. **Real-time Updates (via SSE/WebSocket)**
   - Call status updates
   - Transcript streaming
   - Agent speaking indicators
   - Call metadata changes

### ❌ Direct to Retell (Cannot Proxy)

1. **WebRTC Audio Streams**
   - Bidirectional audio (microphone input, agent audio output)
   - Must connect directly to Retell's media servers
   - Proxying would add unacceptable latency

2. **WebSocket Signaling (Optional)**
   - Can be proxied but adds latency
   - Recommended: Keep direct for real-time events

## Implementation Structure

### API Routes to Create

```
src/app/api/proxy/retell/
├── calls/
│   ├── web/
│   │   └── route.ts          # POST - Create web call
│   ├── phone/
│   │   └── route.ts          # POST - Create phone call
│   ├── [call_id]/
│   │   ├── route.ts          # GET - Get call status
│   │   └── end/
│   │       └── route.ts      # POST - End call
│   └── [call_id]/
│       └── events/
│           └── route.ts      # GET - SSE stream for call events
├── agents/
│   ├── route.ts              # GET - List agents
│   └── [agent_id]/
│       ├── route.ts          # GET, PATCH - Agent operations
│       └── llm/
│           └── route.ts      # GET, PATCH - LLM operations
└── webhooks/
    └── route.ts              # POST - Receive Retell webhooks
```

### Frontend Changes

1. **Replace Direct Retell SDK Calls**
   - Remove direct `retellClient.call.createWebCall()` calls
   - Use your API: `POST /api/proxy/retell/calls/web`

2. **Use SSE for Real-time Updates**
   - Replace Retell SDK event listeners with SSE connection
   - Stream: `/api/proxy/retell/calls/[call_id]/events`

3. **Keep WebRTC Direct**
   - Continue using Retell Web SDK for audio
   - Use access token from your API response

## Implementation Steps

### Phase 1: API Proxy Layer

1. **Create Proxy Utilities**
   - `src/lib/retell-proxy.ts` - Proxy helper functions
   - `src/lib/retell-client-wrapper.ts` - Wrapper for Retell SDK
   - Error handling and retry logic
   - Request/response transformation

2. **Implement Call Management Endpoints**
   - Web call creation with access token generation
   - Phone call creation
   - Call status retrieval
   - Call termination

3. **Add Authentication & Authorization**
   - Verify user has access to agent/tenant
   - Rate limiting per user/tenant
   - Audit logging

### Phase 2: Real-time Updates (SSE)

1. **Create SSE Endpoint**
   - `/api/proxy/retell/calls/[call_id]/events`
   - Stream call events, transcripts, status updates
   - Handle connection lifecycle

2. **Webhook Handler**
   - Receive Retell webhooks
   - Forward relevant events to connected SSE clients
   - Store events in database for history

3. **Event Transformation**
   - Transform Retell events to your format
   - Filter sensitive information
   - Add custom metadata

### Phase 3: Frontend Integration

1. **Update AgentTestModal**
   - Replace Retell SDK REST calls with your API
   - Use SSE for real-time updates instead of SDK events
   - Keep WebRTC via Retell SDK (with your access token)

2. **Create SSE Hook**
   - `src/hooks/useRetellSSE.ts`
   - Manage SSE connection lifecycle
   - Parse and handle events

3. **Update Other Components**
   - VoiceAgentList - Use proxy for agent operations
   - CallHistory - Use proxy for call data
   - Any other Retell API consumers

## Security Considerations

### API Key Management
- ✅ Keep Retell API keys server-side only
- ✅ Never expose in frontend code or environment variables
- ✅ Use tenant-specific API keys from reseller config

### Access Control
- ✅ Verify user has access to requested agent/tenant
- ✅ Validate all input parameters
- ✅ Sanitize responses before sending to frontend

### Rate Limiting
- ✅ Per-user rate limits
- ✅ Per-tenant rate limits
- ✅ Per-endpoint rate limits
- ✅ Implement exponential backoff

### Audit Logging
- ✅ Log all API calls (who, what, when)
- ✅ Log errors and failures
- ✅ Track usage for billing/analytics

## Data Flow Examples

### Creating a Web Call

```
1. Frontend: POST /api/proxy/retell/calls/web
   Body: { agent_id: "internal-id", metadata: {...} }

2. Your API:
   - Verify user authentication
   - Map internal agent_id to Retell agent_id
   - Call Retell: POST /call/create-web-call
   - Generate access token
   - Store call metadata in database
   - Return: { call_id, access_token, agent_id }

3. Frontend:
   - Use access_token with Retell Web SDK
   - Connect WebRTC directly to Retell
   - Connect SSE to /api/proxy/retell/calls/[call_id]/events
```

### Real-time Transcript Updates

```
1. Retell Webhook: POST /api/proxy/retell/webhooks
   Body: { event: "call.update", call_id: "...", transcript: "..." }

2. Your API:
   - Verify webhook signature
   - Store event in database
   - Broadcast to connected SSE clients for this call_id

3. Frontend (via SSE):
   - Receives: { type: "transcript", text: "...", role: "user" }
   - Updates UI in real-time
```

## Error Handling

### Proxy Errors
- Network failures → Retry with exponential backoff
- Retell API errors → Transform to user-friendly messages
- Authentication errors → Return 401/403 appropriately
- Rate limit errors → Return 429 with retry-after header

### Frontend Error Handling
- Handle SSE connection failures (reconnect logic)
- Handle WebRTC connection failures (fallback to phone)
- Display user-friendly error messages
- Log errors for debugging

## Performance Considerations

### Caching
- Cache agent configurations (5-10 minutes)
- Cache LLM configurations (5-10 minutes)
- Cache call status (30 seconds)

### Connection Pooling
- Reuse Retell SDK client instances
- Implement connection pooling for high traffic

### SSE Optimization
- Use compression (gzip)
- Batch events when possible
- Implement heartbeat to detect dead connections

## Testing Strategy

### Unit Tests
- Proxy utility functions
- Request/response transformation
- Error handling logic

### Integration Tests
- API endpoint functionality
- SSE streaming
- Webhook processing

### E2E Tests
- Full call flow (create → connect → end)
- Real-time transcript updates
- Error scenarios

## Migration Plan

### Step 1: Parallel Implementation
- Implement proxy endpoints alongside existing code
- Add feature flag to switch between direct/proxy
- Test thoroughly

### Step 2: Gradual Migration
- Migrate one component at a time
- Start with non-critical features
- Monitor for issues

### Step 3: Full Cutover
- Switch all components to proxy
- Remove direct Retell SDK REST calls
- Keep WebRTC direct (always)

### Step 4: Cleanup
- Remove unused code
- Update documentation
- Archive old implementation

## Monitoring & Observability

### Metrics to Track
- API call latency (proxy → Retell)
- SSE connection count
- Error rates by endpoint
- Rate limit hits
- Webhook processing time

### Logging
- All API requests/responses (sanitized)
- SSE connection events
- Webhook receipts
- Errors with stack traces

### Alerts
- High error rates
- SSE connection failures
- Webhook processing delays
- Rate limit threshold breaches

## Future Enhancements

### Multi-Provider Support
- Abstract provider interface
- Support multiple voice AI providers
- Route calls based on configuration

### Advanced Features
- Call recording proxy
- Analytics aggregation
- Custom event processing
- A/B testing framework

### Optimization
- GraphQL API layer
- Request batching
- Response compression
- CDN caching for static data

## Notes

- **WebRTC Must Stay Direct**: This is non-negotiable for performance
- **Access Tokens**: Continue generating server-side (already implemented)
- **Backward Compatibility**: Maintain existing functionality during migration
- **Documentation**: Update all API documentation after implementation

## When Ready to Implement

1. Review this document and confirm approach
2. Set up feature flags for gradual rollout
3. Start with Phase 1 (API Proxy Layer)
4. Test thoroughly before moving to Phase 2
5. Migrate frontend components incrementally
6. Monitor and iterate based on feedback

