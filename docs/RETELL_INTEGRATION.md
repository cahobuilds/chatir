# Retell AI Integration Guide

This guide explains how to connect your tenant to Retell AI and sync agents from your Retell account.

## Overview

The platform supports per-tenant Retell AI integration, allowing each organization to:
- Configure their own Retell API key
- Sync/import agents from their Retell account
- Manage agents that are already in Retell

## Step-by-Step Setup

### 1. Get Your Retell API Key

1. Log in to your [Retell AI Dashboard](https://retellai.com/dashboard)
2. Navigate to **Settings** → **API Keys**
3. Copy your API key (or create a new one if needed)

### 2. Configure API Key in Tenant Settings

1. Log in to the platform as a tenant admin (`tenant_admin`, `super_admin`, or `system_admin`)
2. Navigate to **Settings** → **Tenant Settings** (or `/tenant-settings`)
3. Scroll down to the **Retell AI Integration** section
4. Paste your Retell API key in the input field
5. Click **Save Key**

### 3. Sync Agents from Retell

Once your API key is configured:

1. In the same **Retell AI Integration** section
2. Click the **Sync Agents from Retell AI** button
3. The system will:
   - Fetch all agents from your Retell account
   - Create new agent records for agents not yet in the system
   - Update existing agents that are already linked (matched by `retell_agent_id`)
   - Display a success message with the number of agents synced

### 4. View Synced Agents

After syncing, you can view your agents:
- **Voice Agents**: Navigate to **Agents** → **Voice Agents**
- **Chat Agents**: Navigate to **Agents** → **Chat Agents**

## API Endpoints

### List Agents from Retell

**GET** `/api/retell/agents?tenant_id={tenant_id}`

Returns all agents from the Retell account associated with the tenant's API key.

**Response:**
```json
{
  "agents": [
    {
      "agent_id": "string",
      "agent_name": "string",
      "voice_id": "string",
      "language": "string",
      ...
    }
  ]
}
```

### Sync Agents from Retell

**POST** `/api/retell/agents/sync`

**Body:**
```json
{
  "tenant_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "synced": 5,
  "errors": 0,
  "agents": [
    {
      "action": "created",
      "agent": { ... }
    }
  ],
  "errors_list": []
}
```

## How It Works

### Agent Matching

When syncing, the system:
1. Fetches all agents from Retell using the tenant's API key
2. Checks if each Retell agent already exists in the local database (by `retell_agent_id`)
3. **Updates** existing agents with the latest data from Retell
4. **Creates** new agent records for agents not yet in the system

### Agent Type Detection

The system automatically determines agent type:
- **Voice agents**: Have a `voice_id` in their Retell configuration
- **Chat agents**: Don't have a `voice_id` (or have different configuration)

### Data Mapping

Retell agent data is stored in the `agents` table:
- `retell_agent_id`: The Retell agent ID (used for matching)
- `name`: Agent name from Retell
- `type`: Automatically determined (`voice` or `chat`)
- `configuration`: Full Retell agent configuration (JSONB)

## Security

- API keys are stored securely in the `tenants.retell_api_key` column
- Only tenant admins (`tenant_admin`, `super_admin`, `system_admin`) can configure API keys
- API keys are masked in the UI (password field) with a show/hide toggle
- All API endpoints require authentication and verify tenant access

## Troubleshooting

### "Tenant Retell API key not configured"

**Solution**: Make sure you've saved your Retell API key in the tenant settings before attempting to sync.

### "Failed to list Retell AI agents"

**Possible causes:**
- Invalid API key
- API key doesn't have necessary permissions
- Retell API is temporarily unavailable

**Solution**: Verify your API key in the Retell dashboard and try again.

### Agents not syncing

**Check:**
1. API key is correctly saved
2. You have agents in your Retell account
3. Your Retell account has the necessary permissions
4. Check browser console for detailed error messages

## Best Practices

1. **Keep API keys secure**: Never share your Retell API key
2. **Sync regularly**: Sync agents after creating new ones in Retell
3. **Monitor sync results**: Check the success message to see how many agents were synced
4. **Update existing agents**: If you modify an agent in Retell, sync again to update the local copy

## Next Steps

After syncing agents:
- Configure agent settings in the platform
- Assign agents to phone numbers
- Set up call routing
- Monitor agent performance

