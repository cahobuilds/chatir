# Supabase Setup Instructions

## Prerequisites

1. Supabase account: [supabase.com](https://supabase.com)
2. Supabase CLI installed: `npm install -g supabase`

## Step-by-Step Setup

### 1. Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `ai-client-care` (or your choice)
   - **Database Password**: Create a strong password (save it!)
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
```

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

The migration creates:

- ✅ **tenants** - Organizations
- ✅ **user_tenants** - User-tenant relationships
- ✅ **agents** - Chatbots & voice bots
- ✅ **interactions** - Interaction tracking
- ✅ **billing_records** - Billing & invoices
- ✅ **api_keys** - API authentication

All with Row Level Security (RLS) for tenant isolation.

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
2. ✅ Create first tenant and user
3. ✅ Set up Retell AI integration
4. ✅ Test multi-tenant isolation

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [CLI Reference](https://supabase.com/docs/reference/cli)

