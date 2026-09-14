# Supabase Setup Instructions

Supabase provides the database and authentication layer for **Chat IR**, a multi-tenant SaaS platform for AI voice/chat agents. Every tenant-scoped table uses Row Level Security (RLS) so one organization's data is never visible to another.

## Prerequisites

1. Supabase account: [supabase.com](https://supabase.com)
2. Supabase CLI installed: `npm install -g supabase`

## Step-by-Step Setup

### 1. Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `chat-ir` (or your choice)
   - **Database Password**: Create a strong password (save it! — this is `SUPABASE_DB_PASSWORD` in `.env.local`, used only for `supabase link`/CLI operations, not read by the app at runtime)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. Wait ~2 minutes for project creation

### 2. Get Project Credentials

In your Supabase dashboard:
1. Go to **Settings** → **API**
2. Copy these values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:** 
- `NEXT_PUBLIC_SUPABASE_URL` - Your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public key (safe for client-side)
- `SUPABASE_SERVICE_ROLE_KEY` - **SECRET** - Only use server-side!

### 3. Link Local Project

```bash
# Link to your remote Supabase project
supabase link --project-ref your-project-ref
```

**To find project ref:**
- It's the `xxxxx` part of your URL: `https://xxxxx.supabase.co`
- Or find it in Settings → General → Reference ID

**When prompted:**
- Enter your database password (from step 1)

### 4. Run Migrations

```bash
# Push migrations to remote database
supabase db push
```

This will create all tables, indexes, and RLS policies.

### 5. Set Environment Variables

Create `.env.local` in project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Encrypts sensitive per-tenant fields (e.g. each org's Retell API key) — generate any
# strong random string for local dev
ENCRYPTION_KEY=
```

Supabase alone is enough to run `npm run dev`, but `ENCRYPTION_KEY` is required before you can connect a Retell workspace to an organization, and the Stripe variables (see `README.md`) are required before signup/billing works end-to-end. See the root [`README.md`](./README.md) for the full environment variable reference.

### 6. Verify Setup

```bash
# Check migration status
supabase migration list

# Test connection (optional)
npm run dev
# Visit http://localhost:3000
```

## Local Development (Optional)

To run Supabase locally:

```bash
# Start local Supabase
supabase start

# This starts:
# - PostgreSQL on port 54322
# - Supabase Studio on http://localhost:54323
# - API on http://localhost:54321

# Update .env.local for local:
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<shown-after-start>
SUPABASE_SERVICE_ROLE_KEY=<shown-after-start>

# Reset local database
supabase db reset

# Stop local Supabase
supabase stop
```

## Database Schema

The initial migration (`supabase/migrations/20251111172146_create_initial_schema.sql`) creates the core multi-tenant tables:

- ✅ **tenants** — organizations (also holds Stripe billing state: `stripe_customer_id`, `plan_status`, `billing_exempt`, etc.)
- ✅ **user_tenants** — user-to-tenant membership/role links
- ✅ **agents** — voice & chat agents
- ✅ **interactions** — call/chat interaction tracking
- ✅ **billing_records** — legacy billing/invoice records
- ✅ **api_keys** — API authentication

Later migrations layer on top of this: a platform-wide **roles/permissions** system (`roles`, `role_permissions`, `permissions`), **knowledge bases** (`knowledge_bases`, `knowledge_base_sources`, `agent_knowledge_bases`), **agent folders & per-user agent access** (`agent_folders`, `user_agents`), and real **Stripe billing fields** on `tenants` (see `supabase/migrations/20260914130000_add_stripe_billing_fields_to_tenants.sql`).

Run `supabase migration list` (or browse `supabase/migrations/`) for the full, current set — this doc intentionally doesn't enumerate every migration, since that list changes frequently.

All tenant-scoped tables have Row Level Security (RLS) enabled for tenant isolation, with platform-staff roles (`platform_admin`/`platform_operator`/etc.) granted cross-tenant access via the roles/permissions tables above.

## Troubleshooting

### Migration fails
```bash
# Check connection
supabase status

# View logs
supabase logs
```

### Can't link project
- Verify project ref is correct
- Check database password
- Ensure project is fully created

### RLS policies not working
- Verify user is authenticated
- Check `user_tenants` table has correct entries
- Review RLS policies in Supabase dashboard

## Next Steps

1. ✅ Set up authentication (see `docs/ARCHITECTURE_RECOMMENDATIONS.md`)
2. ✅ Create your first organization by signing up (`/auth/login?mode=signup`)
3. ✅ Connect that organization's own Retell workspace (Settings → Voice Provider Integration) — see `docs/RETELL_WORKSPACE_ISOLATION.md`
4. ✅ Test multi-tenant isolation

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [CLI Reference](https://supabase.com/docs/reference/cli)

