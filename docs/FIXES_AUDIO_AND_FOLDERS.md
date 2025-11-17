# Fixes: Audio Testing and Folders API

## Issues Fixed

### 1. `/api/folders` 500 Errors
**Problem**: The `agent_folders` RLS policies were directly querying `user_tenants`, causing infinite recursion when RLS tried to check permissions.

**Solution**: Created migration `20251115000000_fix_agent_folders_rls_recursion.sql` that:
- Uses `get_user_tenant_ids()` SECURITY DEFINER function to bypass RLS
- Creates `is_folder_admin()` helper function for admin checks
- Prevents recursion by avoiding direct queries to `user_tenants` in policies

### 2. Audio Test "message is required" Errors
**Problem**: 
- Empty or whitespace-only transcripts were being sent to the API
- No validation on the frontend before making API calls
- Poor error messages

**Solution**:
- Added validation in `AgentTestModal.tsx` to skip empty transcripts
- Added input validation in `handleAgentVoiceResponse` to prevent API calls with empty messages
- Improved API endpoint validation to check for empty strings
- Better error messages

### 3. OpenAI API Key Error Handling
**Problem**: Generic error message when `OPENAI_API_KEY` is not configured.

**Solution**:
- Added detailed error message explaining the issue
- Added guidance on how to fix it
- Better logging for debugging

## Files Modified

1. `supabase/migrations/20251115000000_fix_agent_folders_rls_recursion.sql` - New migration
2. `src/components/AgentTestModal.tsx` - Audio test validation improvements
3. `src/app/api/agents/[id]/test/route.ts` - Better validation and error messages

## Testing Steps

### Test Folders API Fix

1. **Apply the migration**:
   ```bash
   # If using Supabase CLI
   supabase migration up
   
   # Or apply directly in Supabase dashboard SQL editor
   ```

2. **Test the folders endpoint**:
   ```bash
   # Should return 200 OK instead of 500
   curl -X GET "https://your-domain.com/api/folders?tenant_id=YOUR_TENANT_ID" \
     -H "Cookie: your-auth-cookie"
   ```

3. **Verify in browser console**: The repeated 500 errors for `/api/folders` should stop.

### Test Audio Testing Fix

1. **Test with valid speech**:
   - Open agent test modal
   - Click "Start Audio Test"
   - Speak clearly into microphone
   - Should see transcription and agent response

2. **Test edge cases**:
   - Empty/whitespace transcripts should not trigger API calls
   - Error messages should be clear if OpenAI API key is missing

3. **Check console**: Should see fewer 400/500 errors

### Test OpenAI API Key Error

1. **Without API key configured**:
   - Error message should clearly state: "OpenAI API key not configured. Please configure OPENAI_API_KEY environment variable..."
   - Should include helpful details

2. **With API key configured**:
   - Voice tests should work normally
   - Agent should respond to voice input

## Environment Variables Required

Make sure these are set in your deployment (Vercel, etc.):

```bash
OPENAI_API_KEY=sk-...  # Required for voice agent testing
```

## Migration Safety

The migration is safe to apply because:
- It only drops and recreates RLS policies (no data changes)
- Uses `DROP POLICY IF EXISTS` to avoid errors if policies don't exist
- Functions are created with `CREATE OR REPLACE` for idempotency
- All functions use `SECURITY DEFINER` to bypass RLS and prevent recursion

## Rollback

If needed, you can rollback by:
1. Dropping the new policies
2. Recreating the original policies from `20251114000000_add_agent_folders_and_access_control.sql`

However, the original policies have the recursion issue, so this is not recommended.

