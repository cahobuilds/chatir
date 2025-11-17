# Reseller Architecture - Summary & Recommendations

## Executive Summary

This document provides recommendations for implementing a reseller-level Retell AI configuration architecture that:
1. **Hides provider details** from organization admins (they don't know Retell powers the platform)
2. **Isolates each reseller** with their own Retell AI instance
3. **Tracks billing** at the organization level for accurate cost allocation

## Current State

### What We Have
- ✅ `tenants` table with `parent_id` for hierarchical relationships
- ✅ `is_reseller` flag to mark reseller accounts
- ✅ `retell_api_key` stored at tenant level (currently organization-level)
- ✅ `interactions` table tracking calls with `retell_call_id`, `duration`, etc.
- ✅ `billing_records` table for billing aggregation

### What Needs to Change
- ❌ Move `retell_api_key` from organization to reseller level
- ❌ Hide Retell settings from organization admins
- ❌ Add billing tracking per organization (cost breakdown)

## Recommended Architecture

### 1. Reseller-Level Retell Configuration

**Principle**: Each reseller has their own Retell AI workspace/API key. Organizations under that reseller inherit the Retell configuration but cannot see or modify it.

```
Reseller A (is_reseller=true)
├── Organization A1 (parent_id=ResellerA) → Uses Reseller A's Retell API key
├── Organization A2 (parent_id=ResellerA) → Uses Reseller A's Retell API key
└── Organization A3 (parent_id=ResellerA) → Uses Reseller A's Retell API key

Reseller B (is_reseller=true)
├── Organization B1 (parent_id=ResellerB) → Uses Reseller B's Retell API key
└── Organization B2 (parent_id=ResellerB) → Uses Reseller B's Retell API key
```

**Implementation**:
- Store `retell_api_key` only on reseller tenants (`is_reseller=true`)
- Organizations inherit via `parent_id` lookup
- Helper function: `getResellerRetellConfig(organizationId)` → returns reseller's API key

### 2. UI Visibility Rules

**Reseller Admin View** (`/tenant-settings`):
- ✅ **Show**: "Retell AI Integration" section
  - API key input field
  - "Sync Agents from Retell AI" button
  - Usage/billing overview
  - Agent management

**Organization Admin View** (`/tenant-settings`):
- ❌ **Hide**: "Retell AI Integration" section completely
- ✅ **Show**: Generic "Voice AI" features (if needed)
  - Agent management (without Retell-specific details)
  - Usage/billing (organization-level only)
  - No mention of "Retell" anywhere

### 3. Billing Granularity Analysis

#### Retell AI Billing Capabilities

Based on Retell AI's billing system, they provide:

**Workspace-Level Metrics**:
- Total expenses
- Total call minutes
- Average cost per minute
- Daily/weekly call costs
- Breakdown by provider:
  - Voice engine costs (ElevenLabs, etc.)
  - LLM costs (OpenAI, Anthropic, etc.)
  - Telephony costs (Twilio, etc.)
  - Concurrency usage

**Call-Level Data** (via Webhooks):
- Unique `call_id` per call
- `agent_id` (maps to our agent → organization)
- `duration_seconds`
- `status` (completed, failed, etc.)
- Timestamp

**Limitation**: Retell doesn't provide cost breakdown per call via webhooks. We need to:
1. Track calls per organization (via `agent_id` → `tenant_id` mapping)
2. Calculate costs using Retell's pricing model
3. Or aggregate from Retell's usage API periodically

#### Our Billing Tracking Strategy

**Option 1: Per-Call Tracking (Recommended for Accuracy)**

When a call completes via webhook:
1. Store `retell_call_id`, `duration`, `agent_id` in `interactions` table
2. Map `agent_id` → `tenant_id` (organization)
3. Calculate cost using Retell pricing:
   - Voice: $X per minute
   - LLM: $Y per token (if available)
   - Telephony: $Z per minute
4. Store cost breakdown in `interactions.cost_breakdown` JSONB
5. Aggregate to `billing_records` per organization per period

**Option 2: Periodic Aggregation (Recommended for Simplicity)**

Run a daily/hourly job:
1. Query Retell Usage API for date range
2. Get all calls with `agent_id` and costs
3. Map `agent_id` → `tenant_id` (organization)
4. Aggregate costs per organization
5. Store in `billing_records`

**Recommended Approach**: **Hybrid**
- Track per-call data in `interactions` (for accuracy)
- Aggregate periodically to `billing_records` (for reporting)
- Use Retell webhooks for real-time tracking
- Use Retell Usage API for reconciliation

### 4. Database Schema Changes

```sql
-- Add reseller tracking to interactions
ALTER TABLE interactions 
  ADD COLUMN IF NOT EXISTS reseller_tenant_id UUID REFERENCES tenants(id),
  ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}'::jsonb;

-- cost_breakdown structure:
-- {
--   "voice_engine": { "cost": 0.05, "minutes": 2.5 },
--   "llm": { "cost": 0.02, "tokens": 1500 },
--   "telephony": { "cost": 0.01, "minutes": 2.5 },
--   "total": 0.08
-- }

-- Add reseller tracking to billing_records
ALTER TABLE billing_records
  ADD COLUMN IF NOT EXISTS reseller_tenant_id UUID REFERENCES tenants(id),
  ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}'::jsonb;
```

### 5. Implementation Phases

#### Phase 1: Database & Helper Functions (Week 1)
- [ ] Create migration for reseller billing tracking
- [ ] Create `getResellerRetellConfig()` helper function
- [ ] Create `getResellerTenantId()` helper function
- [ ] Test with sample data

#### Phase 2: API Routes Update (Week 1-2)
- [ ] Update all Retell API routes to use reseller config
- [ ] Update webhook handler to track costs
- [ ] Test API routes with reseller hierarchy

#### Phase 3: UI Changes (Week 2)
- [ ] Update `TenantConfiguration` to hide Retell settings for organizations
- [ ] Add reseller admin UI for Retell configuration
- [ ] Test UI visibility rules

#### Phase 4: Billing Integration (Week 2-3)
- [ ] Implement webhook cost tracking
- [ ] Create billing aggregation job
- [ ] Build organization-level billing dashboard
- [ ] Test billing accuracy

## Key Decisions

### Decision 1: Where to Store Retell API Key?
**Answer**: Reseller level only (`is_reseller=true` tenants)

**Rationale**:
- Organizations shouldn't know about Retell
- Each reseller can have their own Retell instance
- Simplifies billing (one Retell account per reseller)

### Decision 2: How to Track Billing Per Organization?
**Answer**: Track per call via webhooks, aggregate to billing_records

**Rationale**:
- Most accurate (real-time)
- Can reconcile with Retell Usage API
- Supports detailed cost breakdown

### Decision 3: Should Organizations See Any Retell Details?
**Answer**: No - completely hidden

**Rationale**:
- Maintains abstraction (platform-agnostic)
- Prevents organizations from bypassing reseller
- Cleaner UX for organization admins

## Security Considerations

1. **RLS Policies**: Ensure organization admins cannot query reseller's `retell_api_key`
2. **API Route Protection**: Verify user is reseller admin before showing/updating Retell config
3. **Data Isolation**: Ensure billing data is properly isolated per reseller
4. **Webhook Security**: Verify webhook signatures from Retell

## Migration Strategy

### For Existing Organizations

1. **Identify Resellers**: Mark existing tenants as resellers (`is_reseller=true`)
2. **Move API Keys**: Move `retell_api_key` from organizations to their parent reseller
3. **Update Code**: All Retell API calls use `getResellerRetellConfig()`
4. **Test**: Verify organizations can still use Retell (via reseller config)

### Backward Compatibility

During transition, support both:
- Old: Organization-level `retell_api_key` (if exists)
- New: Reseller-level `retell_api_key` (preferred)

Gradually migrate all organizations.

## Next Steps

1. **Review & Approve**: Review this architecture with stakeholders
2. **Create Migration**: Implement database changes
3. **Implement Helpers**: Create reseller config helper functions
4. **Update UI**: Hide Retell settings from organization admins
5. **Test**: Test with sample reseller/organization hierarchy
6. **Deploy**: Deploy to production with migration plan

## Questions to Resolve

1. **Pricing Model**: How do we calculate costs per call? (Retell pricing structure)
2. **Billing Frequency**: How often should we bill organizations? (monthly, weekly, per-call)
3. **Cost Markup**: Should resellers be able to add markup to Retell costs?
4. **Multi-Provider**: Should we support other providers (ElevenLabs, Deepgram) at reseller level?

## References

- [Reseller Retell Architecture](./RESELLER_RETELL_ARCHITECTURE.md) - Detailed technical architecture
- [Multi-Provider Architecture](./MULTI_PROVIDER_ARCHITECTURE.md) - Future multi-provider support
- [Retell Integration](./RETELL_INTEGRATION.md) - Current Retell integration docs

