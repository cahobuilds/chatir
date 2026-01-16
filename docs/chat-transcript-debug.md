# Chat Transcript Debugging Guide

## Chat ID: `chat_b5c4e0ec5a3930223b824357450`

### Issue
The transcript is not displaying on the chat detail page despite being available in Retell AI.

### Investigation Steps

1. **Check Database Interaction Record**
   - Query the `interactions` table for this chat ID
   - Check fields: `retell_conversation_id`, `metadata.retell_chat_id`, `retell_call_id`
   - Verify `type` is set to `'chat'`

2. **Check Retell API Directly**
   - Try `chat.retrieve(chat_b5c4e0ec5a3930223b824357450)`
   - Try `chat.list()` and filter by `chat_id`
   - Check if chat is associated with a call (may need `call.retrieve()` first)

3. **API Endpoint Flow**
   - `/api/interactions/[id]` route checks:
     - `interaction.retell_conversation_id` ✅
     - `interaction.metadata.retell_chat_id` ✅ (NEW - added for widget chats)
   - Falls back to `chat.list()` if `chat.retrieve()` doesn't return transcript

4. **Transcript Extraction Priority**
   1. `message_with_tool_calls` (structured array)
   2. `transcript` as array
   3. `transcript` as string (parsed into messages)
   4. `messages` field
   5. Database `interaction.transcript` (fallback)

### Code Changes Made

**File:** `src/app/api/interactions/[id]/route.ts`

1. Added support for `metadata.retell_chat_id` (stored by widget chat API)
2. Enhanced chat ID lookup to try multiple sources
3. Improved `chat.list()` filtering with partial matching
4. Better string transcript parsing

### Testing

Run the comprehensive fetch script:
```bash
npx tsx scripts/fetch-chat-transcript-comprehensive.ts chat_b5c4e0ec5a3930223b824357450
```

This will:
- Find the interaction in the database
- Try multiple Retell API methods
- Extract transcript and save to markdown file
- Show which method worked

### Next Steps

1. Verify the interaction exists in database with correct `retell_conversation_id`
2. Check if chat ID format matches what Retell expects
3. Verify Retell API key is correct for the tenant
4. Check if chat is still "in_progress" (may not have transcript yet)
5. Review console logs from API route for extraction details

