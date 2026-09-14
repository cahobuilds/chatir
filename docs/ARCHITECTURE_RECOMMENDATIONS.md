# Architecture & Technology Recommendations

> **Status: implemented 2025 — historical design record.** This document captured the original
> technology/architecture recommendations for the project. The core DB schema and RLS strategy
> below were implemented almost verbatim — compare against
> `supabase/migrations/20251111172146_create_initial_schema.sql` (tenants/agents/interactions/
> billing_records tables and their `tenant_isolation_*` RLS policies match closely; the role model
> referenced here has since been superseded by the 6-role model in `src/lib/permissions-server.ts`,
> see `supabase/migrations/20260908000000_platform_roles_cleanup.sql`). Some proposals below —
> the per-tenant embed-code generator, a WordPress plugin, and a Shopify app — were **never
> built**; they're left in place as a historical record and marked inline. The "TailAdmin"
> frontend framing is also stale: the app has since undergone a "Chat IR" rebrand (charcoal/gray +
> amber palette, Heroicons — see `src/app/globals.css` and `src/config/navigation.tsx`), noted
> inline below as well. Treat this whole file as a snapshot of 2025 planning, not current guidance.

## Executive Summary

Based on research of Retell AI SDKs, Supabase multi-tenancy, TailAdmin frontend, and Retell AI API documentation, here are the recommended technology choices and architecture for building a multi-tenant platform for managing chatbots and voice bots.

---

## 🎯 Technology Stack Recommendations

### 1. **Retell AI SDK Choice: TypeScript SDK** ✅

**Recommendation: Use `retell-typescript-sdk` (Node.js/TypeScript SDK)**

**Rationale:**
- Your frontend is built with **Next.js 15.5.4** and **TypeScript**
- TypeScript SDK provides:
  - Full type safety and IntelliSense support
  - Native async/await support
  - Seamless integration with Next.js API routes
  - Better error handling with typed error responses
  - No need for separate Python service layer

**Installation:**
```bash
npm install retell-sdk
```

**Why NOT Python SDK:**
- Would require a separate Python service/microservice
- Adds complexity with inter-service communication
- TypeScript SDK works natively with Next.js API routes
- Single codebase reduces maintenance overhead

**References:**
- [Retell AI SDK Documentation](https://docs.retellai.com/get-started/sdk)
- [Retell TypeScript SDK GitHub](https://github.com/RetellAI/retell-typescript-sdk)

---

### 2. **Database & Authentication: Supabase** ✅

**Recommendation: Use Supabase exclusively**

**Why Supabase:**
- **Built-in Multi-Tenancy**: Row Level Security (RLS) policies perfect for tenant isolation
- **Authentication**: Built-in auth with email/password, OAuth, magic links
- **PostgreSQL**: Full PostgreSQL database with real-time capabilities
- **API Generation**: Auto-generated REST and GraphQL APIs
- **Edge Functions**: Serverless functions for webhook handling
- **Storage**: Built-in file storage for recordings/transcripts
- **Free Tier**: Generous free tier for development

**Multi-Tenancy Strategy with Supabase:**

```sql
-- Enable RLS on all tenant tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their tenant's data
CREATE POLICY tenant_isolation ON agents
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()));
```

**Benefits:**
- Database-level security (can't bypass in application code)
- Automatic tenant isolation
- Built-in user management
- Real-time subscriptions for live updates
- Edge functions for webhook processing

**References:**
- [Supabase Multi-Tenancy Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

### 3. **Frontend: TailAdmin Compatibility** ✅ *(superseded — see note)*

> **2026 update:** the app originally started from the TailAdmin template (hence this section),
> but has since undergone a full "Chat IR" rebrand — a charcoal/gray + amber color palette
> (`--color-brand-*` in `src/app/globals.css`) and Heroicons (`@heroicons/react`, see
> `src/config/navigation.tsx`) instead of TailAdmin's default theme/icons. The stack-compatibility
> reasoning below (Next.js/TypeScript/Tailwind) is still accurate; the TailAdmin branding/theme
> itself is not current.

**Current Stack Analysis:**
- ✅ **Next.js 15.5.4** - Compatible with TailAdmin
- ✅ **TypeScript** - TailAdmin supports TypeScript
- ✅ **Tailwind CSS 4.0** - TailAdmin uses Tailwind CSS
- ✅ **React 19** - TailAdmin supports React

**Recommendation: Keep Current Stack**

**Why:**
- TailAdmin is built specifically for Next.js + TypeScript + Tailwind
- Your current stack aligns perfectly
- No migration needed
- Can leverage TailAdmin components directly

**TailAdmin Features You Can Use:**
- Pre-built admin dashboard components
- Form components
- Data tables
- Charts and analytics widgets
- UI components (buttons, modals, etc.)

**Note:** TailAdmin is a template/component library, not a framework. Your current architecture is compatible. *(Historical note: this was true when written; the app's visual branding has since moved away from TailAdmin's default look — see the 2026 update above.)*

**References:**
- [TailAdmin Website](https://tailadmin.com/)
- [TailAdmin Documentation](https://tailadmin.com/docs)

---

## 🏗️ Architecture Recommendations

### Multi-Tenant Architecture with Supabase

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│  (TailAdmin Components + Retell Widget Integration)     │
└────────────────────┬────────────────────────────────────┘
                      │
                      │ HTTPS
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Next.js API Routes (Server)                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  /api/auth/*          - Supabase Auth           │   │
│  │  /api/tenants/*       - Tenant Management       │   │
│  │  /api/agents/*        - Agent CRUD              │   │
│  │  /api/calls/*         - Retell AI Integration  │   │
│  │  /api/webhooks/*      - Retell Webhooks         │   │
│  │  /api/billing/*       - Interaction Billing     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼──────┐ ┌───▼──────────┐
│   Supabase   │ │  Retell  │ │  Stripe/     │
│  PostgreSQL  │ │    AI    │ │  Payment    │
│   + Auth     │ │   API    │ │  Gateway    │
└──────────────┘ └──────────┘ └──────────────┘
```

### Database Schema (Supabase)

```sql
-- Tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  retell_api_key TEXT, -- Encrypted
  billing_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('chat', 'voice')),
  retell_agent_id TEXT,
  retell_phone_number_id TEXT,
  configuration JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions table (for billing)
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('chat', 'voice')),
  retell_call_id TEXT,
  retell_conversation_id TEXT,
  status TEXT,
  duration INTEGER, -- seconds
  billed BOOLEAN DEFAULT false,
  billing_record_id UUID,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Billing records
CREATE TABLE billing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  interaction_count INTEGER,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenant_isolation_agents ON agents
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );
```

---

## 🔌 Retell AI Integration Strategy

### 1. **Backend Integration (Next.js API Routes)**

```typescript
// src/app/api/agents/[id]/calls/route.ts
import Retell from 'retell-sdk';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { phoneNumber, agentId } = await request.json();
  
  // Get tenant's Retell API key from Supabase
  const tenant = await getTenantFromRequest(request);
  const retellClient = new Retell({
    apiKey: tenant.retell_api_key,
  });
  
  // Create phone call
  const call = await retellClient.call.createPhoneCall({
    from_number: phoneNumber,
    to_number: '+1234567890',
    override_agent_id: agentId,
  });
  
  // Store interaction in Supabase
  await supabase.from('interactions').insert({
    tenant_id: tenant.id,
    agent_id: agentId,
    retell_call_id: call.call_id,
    type: 'voice',
    status: 'initiated',
  });
  
  return Response.json({ call_id: call.call_id });
}
```

### 2. **Webhook Handling (Supabase Edge Functions)**

```typescript
// supabase/functions/retell-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { event, data } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  if (event === 'call.ended') {
    // Update interaction record
    await supabase
      .from('interactions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration: data.duration,
      })
      .eq('retell_call_id', data.call_id);
    
    // Bill the tenant
    await billTenantForInteraction(data.call_id);
  }
  
  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### 3. **Frontend Widget Integration**

For embedding in WordPress/Webflow/Shopify:

```html
<!-- Embeddable Widget Code -->
<script>
  (function() {
    // Load Retell Widget
    const script = document.createElement('script');
    script.src = 'https://cdn.retellai.com/widget.js';
    script.setAttribute('data-agent-id', 'YOUR_AGENT_ID');
    script.setAttribute('data-api-key', 'YOUR_API_KEY');
    document.head.appendChild(script);
  })();
</script>
```

**Better Approach: Generate Embed Code Per Tenant** — *never built.* No `embed-code` route,
per-tenant embed generator, or public widget script exists anywhere in `src/app` as of this
writing. Left below as the original proposal, not a description of current functionality.

```typescript
// src/app/api/tenants/[id]/embed-code/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const tenant = await getTenant(params.id);
  const agent = await getDefaultAgent(tenant.id);
  
  const embedCode = `
    <script>
      (function() {
        const script = document.createElement('script');
        script.src = 'https://cdn.retellai.com/widget.js';
        script.setAttribute('data-agent-id', '${agent.retell_agent_id}');
        script.setAttribute('data-api-key', '${tenant.retell_api_key}');
        script.setAttribute('data-tenant-id', '${tenant.id}');
        document.head.appendChild(script);
      })();
    </script>
  `;
  
  return Response.json({ embedCode });
}
```

---

## 📋 Embedding Strategy for WordPress/Webflow/Shopify — *never built / not planned*

None of the options below exist today: there is no embeddable widget script, no WordPress
plugin, and no Shopify app anywhere in this repo (confirmed by searching `src/app` and the repo
root for `embed-code`/`wordpress`/`shopify`). Kept below as the original 2025 proposal for
historical reference only.

### Option 1: Simple Script Tag (Recommended)

**Generate embed code in admin panel:**
```html
<!-- Copy-paste this code into your website -->
<script>
  (function() {
    const script = document.createElement('script');
    script.src = 'https://your-domain.com/widget.js';
    script.setAttribute('data-tenant-id', 'TENANT_ID');
    script.setAttribute('data-agent-id', 'AGENT_ID');
    document.head.appendChild(script);
  })();
</script>
```

**Benefits:**
- Works on any platform (WordPress, Webflow, Shopify)
- No backend required on client's site
- Single script tag
- Easy to update

### Option 2: WordPress Plugin

Create a WordPress plugin that:
1. Adds settings page for tenant ID
2. Injects widget script
3. Provides shortcode: `[retell-widget]`

### Option 3: Shopify App

Create a Shopify app that:
1. Installs via Shopify App Store
2. Configures agent settings
3. Injects widget into theme

### Option 4: Webflow Custom Code

Provide custom code block that users can paste into Webflow's custom code section.

---

## 💰 Billing Implementation

### Track Interactions

```typescript
// When call/webhook ends
async function trackInteraction(callId: string) {
  const interaction = await supabase
    .from('interactions')
    .select('*')
    .eq('retell_call_id', callId)
    .single();
  
  // Mark as billed
  await supabase
    .from('interactions')
    .update({ billed: true })
    .eq('id', interaction.id);
  
  // Update tenant's usage
  await supabase.rpc('increment_tenant_usage', {
    tenant_id: interaction.tenant_id,
    interaction_type: interaction.type,
  });
}
```

### Generate Billing Records

```typescript
// Cron job or scheduled function
async function generateMonthlyBills() {
  const tenants = await supabase.from('tenants').select('id');
  
  for (const tenant of tenants.data) {
    const interactions = await supabase
      .from('interactions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('billed', false)
      .gte('started_at', startOfMonth)
      .lte('started_at', endOfMonth);
    
    const total = interactions.data.length * PRICE_PER_INTERACTION;
    
    await supabase.from('billing_records').insert({
      tenant_id: tenant.id,
      amount: total,
      interaction_count: interactions.data.length,
      period_start: startOfMonth,
      period_end: endOfMonth,
    });
  }
}
```

---

## 🚀 Updated Deployment Recommendations

### 1. **Vercel Deployment** (Recommended)

**Why Vercel:**
- Native Next.js support
- Edge functions for webhooks
- Automatic deployments
- Built-in environment variables

**Updated `vercel.json`:**
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key"
  }
}
```

### 2. **Supabase Setup**

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 3. **Environment Variables**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Retell AI (per tenant, stored in database)
# RETELL_API_KEY=stored-per-tenant-in-supabase

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 📚 Key Resources

1. **Retell AI TypeScript SDK**: https://github.com/RetellAI/retell-typescript-sdk
2. **Retell AI API Reference**: https://docs.retellai.com/api-references/create-phone-call
3. **Retell AI Frontend Demo**: https://github.com/RetellAI/retell-frontend-reactjs-demo
4. **Retell AI Client JS SDK**: https://github.com/RetellAI/retell-client-js-sdk
5. **Supabase Multi-Tenancy**: https://supabase.com/docs/guides/auth/row-level-security
6. **TailAdmin**: https://tailadmin.com/

---

## ✅ Final Recommendations *(2025, as originally written — see status banner at top)*

1. ✅ **Use Retell TypeScript SDK** - Native Next.js integration — implemented
2. ✅ **Use Supabase** - Database + Auth + Multi-tenancy — implemented
3. ✅ **Keep TailAdmin/Current Stack** - Already compatible — stack kept, but branding since moved away from TailAdmin's default theme (Chat IR rebrand)
4. ✅ **Deploy on Vercel** - Best Next.js hosting
5. ⬜ **Generate Embed Codes** - Simple script tag for WordPress/Webflow/Shopify — **never built**
6. ✅ **Track Interactions** - Use Retell webhooks for billing — implemented

---

## 🎯 Next Steps *(2025 plan — see status banner at top for what actually shipped)*

1. Set up Supabase project — done
2. Install Retell TypeScript SDK — done
3. Create database schema with RLS policies — done
4. Build API routes for agent management — done
5. Implement webhook handlers — done
6. Create embed code generator — **never built**
7. Build billing system — done (Stripe, shipped 2026-09-14; see `docs/AUTHENTICATION_API_SETUP.md`)
8. Deploy to Vercel — done

