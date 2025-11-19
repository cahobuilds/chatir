# How to Extract Chat Transcript

## Analysis of Current Issue

**Problem:** The transcript is not showing on the chat detail page.

**Root Cause:** The interaction ID (`d6bbeb11-3c96-4eac-b99c-2996f790e893`) is different from the Retell chat ID (`chat_b5c4e0ec5a3930223b824357450`). The API needs to find the correct Retell chat ID from the interaction record.

## Solution: Use the Interaction ID

Since you're viewing the chat detail page, use the **interaction ID from the URL** to extract the transcript:

### Method 1: Browser Console (Recommended)

Open the browser console on the chat detail page and run:

```javascript
// Get the interaction ID from the current URL
const interactionId = window.location.pathname.split('/').pop();

// Fetch the interaction to get chat_id
fetch(`/api/interactions/${interactionId}`)
  .then(r => r.json())
  .then(data => {
    const interaction = data.interaction;
    const chatId = interaction.retell_conversation_id || 
                   interaction.metadata?.retell_chat_id || 
                   interaction.metadata?.chat_id;
    
    console.log('Interaction:', interaction);
    console.log('Chat ID found:', chatId);
    
    if (!chatId) {
      console.error('❌ No chat ID found in interaction');
      console.log('Available fields:', {
        retell_conversation_id: interaction.retell_conversation_id,
        metadata: interaction.metadata
      });
      return;
    }
    
    // Extract transcript using the chat ID
    return fetch('/api/test-retell-chat/extract-transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId,
        interaction_id: interactionId
      })
    });
  })
  .then(r => r.json())
  .then(data => {
    if (data.error) {
      console.error('❌ Error:', data.error);
      return;
    }
    
    console.log('✅ Transcript extracted!');
    console.log(`Messages found: ${data.message_count}`);
    console.log('Markdown:', data.markdown);
    
    // Copy markdown to clipboard
    navigator.clipboard.writeText(data.markdown).then(() => {
      console.log('✅ Markdown copied to clipboard!');
    });
    
    // Also log the messages
    console.log('Messages:', data.messages);
  })
  .catch(err => console.error('Error:', err));
```

### Method 2: Direct API Call with Interaction ID

If the extract-transcript endpoint is deployed, you can call it directly:

```javascript
fetch('/api/test-retell-chat/extract-transcript', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    interaction_id: 'd6bbeb11-3c96-4eac-b99c-2996f790e893'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Markdown:', data.markdown);
  navigator.clipboard.writeText(data.markdown);
});
```

### Method 3: Check What Chat ID is Stored

First, check what chat ID is actually stored in the interaction:

```javascript
const interactionId = window.location.pathname.split('/').pop();

fetch(`/api/interactions/${interactionId}`)
  .then(r => r.json())
  .then(data => {
    const interaction = data.interaction;
    console.log('Full interaction:', interaction);
    console.log('retell_conversation_id:', interaction.retell_conversation_id);
    console.log('metadata.retell_chat_id:', interaction.metadata?.retell_chat_id);
    console.log('metadata.chat_id:', interaction.metadata?.chat_id);
    console.log('retell_chat_data:', interaction.retell_chat_data);
  });
```

## Expected Results

After running the script, you should see:
1. The chat ID that was found in the interaction
2. The transcript markdown (copied to clipboard)
3. The number of messages extracted
4. The raw messages array

## Troubleshooting

### If you get 405 Method Not Allowed:
- The route hasn't been deployed yet. Wait for Vercel to finish building.
- Or use Method 3 to check the interaction data first.

### If no chat_id is found:
- The interaction might not have been synced from Retell yet
- Run the sync operation: Go to Chat History page → Click "Sync Chats"
- Or manually check the `interactions` table in Supabase

### If chat_id is found but transcript is empty:
- The chat might still be "in_progress" - Retell only provides transcripts after chat ends
- Check `chat_status` in the response - it should be "ended" or "completed"

## Next Steps

Once you have the transcript extracted:
1. Verify it contains the expected messages
2. Check why the chat detail page isn't displaying it
3. Review the console logs from `/api/interactions/[id]` to see what's happening

