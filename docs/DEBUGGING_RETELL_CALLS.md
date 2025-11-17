# Debugging Retell Call Issues

This guide explains how to check logs and diagnose why Retell calls disconnect or fail.

## 📊 Log Sources

### 1. **Vercel Server Logs** (Recommended)

Vercel logs show all server-side API calls and webhook events.

**Access:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Deployments** → Select latest deployment → **Logs** tab
4. Filter by:
   - `[Web Call API]` - Web call creation logs
   - `[Retell Webhook]` - Webhook event logs
   - `[Call Status API]` - Call status check logs

**What to look for:**
- `[Web Call API] Web call created successfully` - Confirms call was created
- `[Retell Webhook] Call connected` - Confirms Retell connected
- `[Retell Webhook] Call ended` - Shows when/why call ended
- `[Retell Webhook] Call failed` - Shows failure reasons

### 2. **Retell Dashboard Logs**

Retell provides detailed call logs in their dashboard.

**Access:**
1. Go to [Retell Dashboard](https://dashboard.retellai.com/)
2. Navigate to **Calls** section
3. Find your call by `call_id` (visible in browser console)
4. View:
   - Call status and timeline
   - Error messages
   - Engine connection status
   - Audio quality metrics

### 3. **Browser Console Logs** (Client-Side)

Client-side logs show the SDK events and errors.

**Access:**
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for:
   - `[AgentInteractionModal]` - Client-side call events
   - `Retell call ended` - Call termination
   - `PublishTrackError` - Audio track publishing issues

**Key Logs:**
- `Retell call started - waiting for engine to initialize...`
- `Retell call ready - engine connected`
- `Retell call ended` - Shows call_id and duration
- `PublishTrackError` - Timing/connection issues

## 🔍 API Endpoints for Debugging

### Check Call Status

```bash
GET /api/retell/calls/[call_id]
```

Returns:
- Call details from Retell API
- Status, duration, end_reason
- Agent configuration

**Example:**
```javascript
const callId = 'call_50b4eb5cd39e78c67db28a20a13';
const response = await fetch(`/api/retell/calls/${callId}`);
const data = await response.json();
console.log('Call status:', data.call);
```

### Get Call Logs

```bash
GET /api/retell/calls/[call_id]/logs
```

Returns:
- Retell API call logs
- Database interaction logs
- Webhook event metadata

**Example:**
```javascript
const callId = 'call_50b4eb5cd39e78c67db28a20a13';
const response = await fetch(`/api/retell/calls/${callId}/logs`);
const data = await response.json();
console.log('Retell logs:', data.retell_logs);
console.log('Database logs:', data.database_logs);
```

## 🐛 Common Issues & Solutions

### Issue: `PublishTrackError: publishing rejected as engine not connected within timeout`

**Symptoms:**
- Call starts but ends quickly
- Error appears in browser console
- No audio connection

**Diagnosis:**
1. Check Vercel logs for `[Retell Webhook] Call failed` - shows Retell-side error
2. Check Retell dashboard for call status - may show engine connection timeout
3. Check browser console for initialization duration

**Possible Causes:**
- Agent LLM not configured properly
- Agent response_engine missing or invalid
- Network timeout (agent takes > 2 minutes to initialize)
- Retell API key permissions issue

**Solutions:**
- Verify agent has `response_engine` configured in Retell dashboard
- Check agent is published (`is_published: true`)
- Increase timeout if agent initialization is slow
- Verify Retell API key has web call permissions

### Issue: Call ends immediately after creation

**Symptoms:**
- Call created successfully
- `call_ended` fires immediately
- No `call_ready` event

**Diagnosis:**
1. Check Vercel logs: `[Web Call API] Web call created successfully`
2. Check Retell dashboard: Call status should show reason
3. Check browser console: `Call ended during initialization`

**Possible Causes:**
- Agent configuration invalid
- LLM websocket URL unreachable
- Agent not published
- API key lacks permissions

**Solutions:**
- Verify agent configuration in Retell dashboard
- Check LLM websocket URL is accessible
- Ensure agent is published
- Verify API key permissions

### Issue: Call connects but disconnects after a few seconds

**Symptoms:**
- `call_ready` fires successfully
- Call works briefly then ends
- `call_ended` with specific reason

**Diagnosis:**
1. Check Retell dashboard for `end_reason`
2. Check Vercel logs: `[Retell Webhook] Call ended` shows reason
3. Check browser console for error messages

**Possible Causes:**
- Audio quality issues
- Network instability
- Agent LLM timeout
- Rate limiting

**Solutions:**
- Check network stability
- Review Retell dashboard for audio quality metrics
- Check LLM response times
- Verify no rate limits exceeded

## 📝 Enhanced Logging

All logs now include:
- **Timestamps** - When events occurred
- **Call IDs** - Track specific calls
- **Error details** - Full error messages and stack traces
- **Duration** - How long initialization took
- **Status** - Current call state

## 🔗 Quick Links

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Retell Dashboard](https://dashboard.retellai.com/)
- [Retell API Docs](https://docs.retellai.com/api-references)
- [Retell Webhooks Guide](https://docs.retellai.com/webhooks)

## 💡 Tips

1. **Always check Vercel logs first** - They show server-side events
2. **Use call_id from browser console** - Search for it in Retell dashboard
3. **Check webhook events** - They show Retell's perspective
4. **Compare timestamps** - See timing between events
5. **Look for patterns** - Multiple calls failing similarly indicates configuration issue

