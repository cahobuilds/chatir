# Local Development Setup Guide

## ✅ Current Setup: Local Supabase (Recommended)

Your project is now configured to use **local Supabase** for development, which is the best practice.

## 🎯 Why Local Supabase?

- ✅ **Fast** - No network latency, instant responses
- ✅ **Safe** - Isolated from production data
- ✅ **Free** - No API costs during development
- ✅ **Offline** - Works without internet connection
- ✅ **Testable** - Easy to reset and test migrations

## 🚀 Quick Start Commands

### Start Local Supabase
```bash
supabase start
```

### Stop Local Supabase
```bash
supabase stop
```

### View Local Supabase Status
```bash
supabase status
```

### Access Supabase Studio (Local)
Open: http://127.0.0.1:54323

### Reset Local Database
```bash
supabase db reset
```

## 📁 Environment Configuration

Your `.env.local` file is configured with local Supabase credentials:
- **API URL**: `http://127.0.0.1:54321`
- **Studio URL**: `http://127.0.0.1:54323`
- **Database URL**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

## 🔄 Development Workflow

### 1. Start Development Environment
```bash
# Terminal 1: Start Supabase
supabase start

# Terminal 2: Start Next.js
npm run dev
```

### 2. Create Migrations
```bash
# Create a new migration
supabase migration new your_migration_name

# Edit the migration file in supabase/migrations/
```

### 3. Apply Migrations Locally
```bash
# Migrations auto-apply on supabase start
# Or manually reset:
supabase db reset
```

### 4. Test Migrations
```bash
# Test locally first
supabase db reset

# Then push to remote (staging/production)
supabase db push
```

## 🌐 Switching Between Local and Remote

### Use Local Supabase (Current - Recommended for Dev)
Your `.env.local` is already configured for local development.

### Use Remote Supabase (For Testing/Staging)
Update `.env.local` with remote credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-remote-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-remote-service-role-key
```

## 📊 Database Management

### View Local Database
```bash
# Using psql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Or use Supabase Studio
open http://127.0.0.1:54323
```

### Seed Data
Create `supabase/seed.sql` for initial test data:
```sql
-- Example seed data
INSERT INTO tenants (name, subdomain) VALUES 
  ('Test Tenant', 'test');
```

### Backup Local Database
```bash
supabase db dump -f backup.sql
```

## 🔐 Authentication Testing

Local Supabase includes:
- **Email Testing**: http://127.0.0.1:54324 (Inbucket)
- **Auth UI**: Available in Supabase Studio
- **No real emails sent** - All emails are captured in Inbucket

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Stop existing Supabase instance
supabase stop

# Or stop specific project
supabase stop --project-id your-project-id
```

### Migration Errors
```bash
# Reset database and reapply migrations
supabase db reset

# Check migration status
supabase migration list
```

### Docker Issues
```bash
# Ensure Docker is running
docker ps

# Restart Docker Desktop if needed
```

## 📝 Best Practices

1. **Always test migrations locally first** before pushing to remote
2. **Use local Supabase for development** - faster and safer
3. **Use remote Supabase for staging/testing** - before production
4. **Never commit `.env.local`** - it's in `.gitignore`
5. **Reset local DB frequently** during development to test migrations

## 🔗 Useful Links

- **Local Supabase Studio**: http://127.0.0.1:54323
- **Email Testing (Inbucket)**: http://127.0.0.1:54324
- **API Docs**: http://127.0.0.1:54321/rest/v1/
- **Supabase CLI Docs**: https://supabase.com/docs/guides/cli


