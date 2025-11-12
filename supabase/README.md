# Supabase Setup Guide

This directory contains Supabase configuration and migrations for the multi-tenant AI Client Care platform.

## 🚀 Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - Name: `ai-client-care` (or your preferred name)
   - Database Password: (save this securely)
   - Region: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### 2. Get Your Project Credentials

In your Supabase project dashboard:
1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (starts with `eyJ`)
   - **service_role key**: `eyJhbGc...` (starts with `eyJ`) - **KEEP THIS SECRET**

### 3. Link Local Project to Supabase

```bash
# Link to your remote Supabase project
supabase link --project-ref your-project-ref

# You'll be prompted for:
# - Database password (from step 1)
```

**To find your project ref:**
- It's in your Supabase project URL: `https://xxxxx.supabase.co`
- The `xxxxx` part is your project ref

### 4. Run Migrations

```bash
# Push migrations to remote Supabase database
supabase db push

# Or run locally first (recommended for testing)
supabase start
supabase db reset
```

### 5. Set Environment Variables

Create `.env.local` file in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📊 Database Schema

The migration creates the following tables:

- **tenants** - Organizations using the platform
- **user_tenants** - User-tenant relationships and roles
- **agents** - Chatbots and voice bots
- **interactions** - Tracks all bot interactions
- **billing_records** - Billing and invoicing
- **api_keys** - API authentication keys

All tables have Row Level Security (RLS) enabled for tenant isolation.

## 🔒 Row Level Security (RLS)

RLS policies ensure:
- Users can only access data from their tenant(s)
- Tenant admins can manage their tenant's data
- Complete data isolation between tenants

## 🛠️ Local Development

```bash
# Start local Supabase (includes PostgreSQL, Auth, Storage, etc.)
supabase start

# Stop local Supabase
supabase stop

# Reset database (drops all data)
supabase db reset

# View local Supabase dashboard
# Open: http://localhost:54323
```

## 📝 Creating New Migrations

```bash
# Create a new migration
supabase migration new migration_name

# Edit the migration file in supabase/migrations/
# Then apply:
supabase db push
```

## 🔍 Useful Commands

```bash
# View migration status
supabase migration list

# Generate TypeScript types from database
supabase gen types typescript --local > src/types/database.types.ts

# Or for remote:
supabase gen types typescript --project-id your-project-ref > src/types/database.types.ts
```

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

