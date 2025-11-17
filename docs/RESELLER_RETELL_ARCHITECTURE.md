# Reseller-Level Retell AI Architecture

## Overview

This document outlines the architecture for moving Retell AI configuration to the reseller level, hiding provider-specific details from organization admins, and implementing granular billing per organization.

## Requirements

1. **Reseller-Level Configuration**: Each reseller has their own Retell AI instance/API key
2. **Organization Abstraction**: Organization admins should NOT see Retell settings - they only see generic "Voice AI" features
3. **Billing Granularity**: Track usage and costs per organization for accurate billing
4. **Provider Isolation**: Each reseller's Retell instance is completely isolated

## Architecture Design

### 1. Database Schema Changes

#### A. Move Retell API Key to Reseller Level

```sql
-- Migration: Move retell_api_key from organization to reseller level
-- Resellers (is_reseller=true) store the Retell API key
-- Organizations (is_reseller=false, parent_id=reseller_id) inherit from parent

-- Step 1: Add helper function to get reseller's Retell config
CREATE OR REPLACE FUNCTION get_reseller_retell_config(org_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  reseller_id UUID;
  retell_key TEXT;
BEGIN
  -- Get the reseller (parent tenant with is_reseller=true)
  WITH RECURSIVE tenant_hierarchy AS (
    SELECT id, parent_id, is_reseller, retell_api_key
    FROM tenants
    WHERE id = org_tenant_id
    
    UNION ALL
    
    SELECT t.id, t.parent_id, t.is_reseller, t.retell_api_key
    FROM tenants t
    INNER JOIN tenant_hierarchy th ON t.id = th.parent_id
    WHERE th.is_reseller IS NULL OR th.is_reseller = false
  )
  SELECT id, retell_api_key INTO reseller_id, retell_key
  FROM tenant_hierarchy
  WHERE is_reseller = true
  LIMIT 1;
  
  RETURN retell_key;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Remove retell_api_key from organization-level tenants
-- Keep it only for resellers (is_reseller=true)
-- This is done via application logic, not schema change
```

#### B. Billing Tracking Schema

```sql
-- Add organization-level billing tracking
ALTER TABLE interactions 
  ADD COLUMN IF NOT EXISTS reseller_tenant_id UUID REFERENCES tenants(id),
  ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_costs JSONB DEFAULT '{}'::jsonb;

-- Cost breakdown structure:
-- {
--   "voice_engine": { "provider": "elevenlabs", "cost": 0.05, "minutes": 2.5 },
--   "llm": { "provider": "openai", "cost": 0.02, "tokens": 1500 },
--   "telephony": { "provider": "twilio", "cost": 0.01, "minutes": 2.5 },
--   "total": 0.08
-- }

-- Add index for reseller billing queries
CREATE INDEX IF NOT EXISTS idx_interactions_reseller_tenant 
  ON interactions(reseller_tenant_id, started_at);

-- Update billing_records to track reseller vs organization
ALTER TABLE billing_records
  ADD COLUMN IF NOT EXISTS reseller_tenant_id UUID REFERENCES tenants(id),
  ADD COLUMN IF NOT EXISTS organization_tenant_id UUID REFERENCES tenants(id),
  ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}'::jsonb;
```

### 2. Application Logic Changes

#### A. Helper Function: Get Reseller Retell Config

```typescript
// src/lib/reseller.ts
import { createClient } from '@/lib/supabase/server';

export async function getResellerRetellConfig(organizationTenantId: string): Promise<string | null> {
  const supabase = await createClient();
  
  // Recursively find the reseller (parent with is_reseller=true)
  let currentTenantId: string | null = organizationTenantId;
  
  while (currentTenantId) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, parent_id, is_reseller, retell_api_key')
      .eq('id', currentTenantId)
      .single();
    
    if (!tenant) break;
    
    // If this tenant is a reseller, return its Retell API key
    if (tenant.is_reseller && tenant.retell_api_key) {
      return tenant.retell_api_key;
    }
    
    // Otherwise, check parent
    currentTenantId = tenant.parent_id;
  }
  
  return null;
}

export async function getResellerTenantId(organizationTenantId: string): Promise<string | null> {
  const supabase = await createClient();
  
  let currentTenantId: string | null = organizationTenantId;
  
  while (currentTenantId) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, parent_id, is_reseller')
      .eq('id', currentTenantId)
      .single();
    
    if (!tenant) break;
    
    if (tenant.is_reseller) {
      return tenant.id;
    }
    
    currentTenantId = tenant.parent_id;
  }
  
  return null;
}
```

#### B. Update Retell API Routes to Use Reseller Config

```typescript
// src/app/api/retell/agents/route.ts
import { getResellerRetellConfig } from '@/lib/reseller';

export async function GET(request: NextRequest) {
  // ... auth checks ...
  
  // Get reseller's Retell API key (not organization's)
  const retellApiKey = await getResellerRetellConfig(tenant_id);
  
  if (!retellApiKey) {
    return NextResponse.json(
      { error: 'Retell AI not configured for this organization\'s reseller' },
      { status: 400 }
    );
  }
  
  // Use reseller's API key
  const retellClient = createRetellClient(retellApiKey);
  // ... rest of logic ...
}
```

#### C. Hide Retell Settings from Organization Admins

```typescript
// src/components/TenantConfiguration.tsx
const fetchTenantData = async () => {
  // ... existing code ...
  
  const tenantData = userTenant.tenants as Tenant;
  
  // Check if this tenant is a reseller
  const isReseller = (tenantData as any).is_reseller === true;
  
  // Only show Retell settings if user is reseller admin
  // Organization admins should NOT see Retell settings
  if (isReseller && admin) {
    // Show Retell configuration section
    setRetellApiKey((tenantData as any).retell_api_key || "");
  } else {
    // Hide Retell settings - organization admins see generic "Voice AI" only
    setRetellApiKey("");
  }
  
  // ... rest of code ...
};
```

### 3. Billing Granularity Analysis

#### Retell AI Billing API Capabilities

Based on Retell AI's billing system, they provide:

1. **Workspace-Level Billing**:
   - Total expenses
   - Call minutes (total)
   - Average cost per minute
   - Daily/weekly call costs
   - Breakdown by provider:
     - Voice engine costs (ElevenLabs, etc.)
     - LLM costs (OpenAI, Anthropic, etc.)
     - Telephony costs (Twilio, etc.)
     - Concurrency usage

2. **Call-Level Metadata**:
   - Each call has a unique `call_id`
   - Duration in seconds
   - Agent ID
   - Timestamp
   - Status (completed, failed, etc.)

#### Our Billing Tracking Strategy

**Option 1: Track at Call Level (Recommended)**

```typescript
// When a call completes, store cost breakdown per interaction
// src/app/api/webhooks/retell/route.ts

export async function POST(request: NextRequest) {
  const webhook = await request.json();
  
  if (webhook.event === 'call.ended') {
    const { call_id, agent_id, duration_seconds, cost_breakdown } = webhook.data;
    
    // Find the interaction by retell_call_id
    const { data: interaction } = await supabase
      .from('interactions')
      .select('id, tenant_id')
      .eq('retell_call_id', call_id)
      .single();
    
    if (interaction) {
      // Get reseller tenant ID
      const resellerTenantId = await getResellerTenantId(interaction.tenant_id);
      
      // Store cost breakdown
      await supabase
        .from('interactions')
        .update({
          duration: duration_seconds,
          cost_breakdown: cost_breakdown, // From Retell webhook
          reseller_tenant_id: resellerTenantId,
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', interaction.id);
    }
  }
}
```

**Option 2: Periodic Aggregation from Retell API**

```typescript
// src/app/api/billing/sync-retell-usage/route.ts
// Run daily/hourly to sync usage from Retell

export async function POST(request: NextRequest) {
  // For each reseller
  const resellers = await getResellers();
  
  for (const reseller of resellers) {
    const retellClient = createRetellClient(reseller.retell_api_key);
    
    // Get usage for date range
    const usage = await retellClient.usage.get({
      start_date: startDate,
      end_date: endDate,
    });
    
    // Break down by organization using agent metadata
    for (const call of usage.calls) {
      // Each call has agent_id - map to our agent -> tenant
      const { data: agent } = await supabase
        .from('agents')
        .select('tenant_id')
        .eq('retell_agent_id', call.agent_id)
        .single();
      
      if (agent) {
        // Aggregate costs per organization
        await updateOrganizationBilling(agent.tenant_id, {
          call_count: 1,
          total_minutes: call.duration_seconds / 60,
          total_cost: call.cost,
          cost_breakdown: call.cost_breakdown,
        });
      }
    }
  }
}
```

#### Billing Granularity Levels

1. **Per Interaction** (Most Granular):
   - Track cost per call/interaction
   - Store in `interactions.cost_breakdown`
   - Pros: Most accurate, real-time
   - Cons: More storage, requires webhook integration

2. **Per Organization Per Period** (Recommended):
   - Aggregate costs per organization per day/week/month
   - Store in `billing_records`
   - Pros: Efficient, easy to query
   - Cons: Requires aggregation logic

3. **Per Agent Per Period**:
   - Track costs per agent
   - Useful for agent-level analytics
   - Can aggregate to organization level

### 4. Implementation Plan

#### Phase 1: Database Migration
1. ✅ Add `is_reseller` column (already exists)
2. Create helper function `get_reseller_retell_config()`
3. Add `reseller_tenant_id` to `interactions` table
4. Add `cost_breakdown` columns to `interactions` and `billing_records`

#### Phase 2: Application Logic
1. Create `getResellerRetellConfig()` helper function
2. Update all Retell API routes to use reseller config
3. Update `TenantConfiguration` to hide Retell settings for non-resellers
4. Add reseller admin UI for Retell configuration

#### Phase 3: Billing Integration
1. Implement webhook handler for call completion
2. Store cost breakdown per interaction
3. Create billing aggregation job
4. Build organization-level billing dashboard

#### Phase 4: Testing
1. Test reseller configuration isolation
2. Test organization admin cannot see Retell settings
3. Test billing tracking accuracy
4. Test multi-reseller scenarios

### 5. UI Changes

#### Reseller Admin View (Tenant Settings)
- ✅ Show "Retell AI Integration" section
- ✅ API key input
- ✅ Agent sync button
- ✅ Usage/billing overview

#### Organization Admin View (Tenant Settings)
- ❌ Hide "Retell AI Integration" section completely
- ✅ Show generic "Voice AI Settings" (if needed)
- ✅ Show agent management (without Retell-specific details)
- ✅ Show usage/billing (organization-level only)

### 6. Security Considerations

1. **RLS Policies**: Ensure organization admins cannot query reseller's Retell API key
2. **API Route Protection**: Verify user is reseller admin before showing/updating Retell config
3. **Data Isolation**: Ensure billing data is properly isolated per reseller

### 7. Migration Strategy

1. **Existing Organizations**: 
   - Identify which tenants are resellers vs organizations
   - Move `retell_api_key` from organizations to their parent reseller
   - Update all Retell API calls to use reseller config

2. **Backward Compatibility**:
   - Support both old (organization-level) and new (reseller-level) configs during transition
   - Gradually migrate all organizations

## Next Steps

1. Review and approve this architecture
2. Create database migration
3. Implement helper functions
4. Update UI components
5. Test with sample data
6. Deploy to production

