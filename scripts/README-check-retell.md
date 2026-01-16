# Check Retell Chat Agents Script

This script queries Retell directly to count active chat agents.

## Usage

### Option 1: Provide Retell API Key directly
```bash
npx tsx scripts/check-retell-chat-agents.ts "" "your_retell_api_key_here"
```

### Option 2: Provide tenant ID (will look up API key from reseller)
```bash
npx tsx scripts/check-retell-chat-agents.ts "tenant-uuid-here"
```

### Option 3: Auto-detect (uses first reseller with API key)
```bash
npx tsx scripts/check-retell-chat-agents.ts
```

## Requirements

- Environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Output

The script will display:
- Total agents found in Retell
- Number of chat agents (no voice_id)
- Number of voice agents (has voice_id)
- Detailed breakdown of each agent with its type detection
