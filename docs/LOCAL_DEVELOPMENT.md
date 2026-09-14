# Local Development Setup Guide

## ⚠️ Current Setup: Next.js locally + the remote hosted Supabase project

**Verified against this repo (2026-09-14):** `.env.local` points `NEXT_PUBLIC_SUPABASE_URL` at a
remote hosted Supabase project (`https://<project-ref>.supabase.co`), not `http://127.0.0.1:54321`.
There is no local Postgres/Supabase stack running for day-to-day development. `supabase/config.toml`
is still checked into the repo (and even has a stale `project_id` that no longer matches the
project `.env.local` points to), but it is effectively vestigial — nothing in `package.json`
invokes `supabase start`, `supabase stop`, or any other local-stack command, and
`docs/ROLE_PERMISSION_CLEANUP_PLAN.md` confirms migrations are applied straight to the
hosted project (via `supabase db push` with an access token, or the Supabase Dashboard SQL editor)
rather than through a local Postgres instance.

**In short: "local development" here means running the Next.js dev server on your machine while
it talks directly to the shared hosted Supabase project.** There is no local database to reset,
and schema changes land on the shared project as soon as a migration is pushed — coordinate with
the team before running destructive migrations.

If you want to run a fully local Supabase stack anyway (e.g. for isolated experiments), the
config is still there and the commands below under [Optional: running a fully local stack](#optional-running-a-fully-local-stack)
should work if you have Docker installed — but be aware this is not how the project is
currently developed, and your local schema can drift from the hosted project's.

## 🚀 Quick Start

```bash
npm run dev
```

This starts the Next.js dev server against whatever Supabase project `.env.local` points to
(currently the hosted project — see above). Get `.env.local` values (Supabase URL/keys, Stripe
keys, etc.) from another team member or the Supabase/Stripe dashboards; there is no
`.env.example` with placeholder Supabase values checked in.

## 📁 Environment Configuration

Your `.env.local` (gitignored, not committed) needs at minimum:
- `NEXT_PUBLIC_SUPABASE_URL` — the hosted project's API URL (`https://<project-ref>.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Stripe keys for billing (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`) — see `.env.example` for the current list of
  Stripe-related variables.

## 🔄 Development Workflow

### 1. Start Development Environment
```bash
npm run dev
```
No separate database process to start — you're talking to the hosted Supabase project directly.

### 2. Create Migrations
```bash
# Create a new migration file locally
supabase migration new your_migration_name

# Edit the migration file in supabase/migrations/
```

### 3. Apply Migrations to the Hosted Project
There is no local database to auto-apply migrations against. Apply migrations to the shared
hosted project with either:
```bash
# Requires a Supabase access token or the project's DB password
supabase db push
```
or by pasting the migration SQL into the Supabase Dashboard's SQL editor. Review migrations
carefully before applying — they run directly against the project everyone shares.

## 📊 Database Management

### View the Database
Use the Supabase Dashboard for the hosted project (Table Editor / SQL Editor), or connect `psql`
directly to the hosted project's connection string (get it from the Supabase Dashboard →
Project Settings → Database).

### Seed Data
`supabase/seed.sql` (if present) only applies automatically when running a local stack via
`supabase db reset`. Against the hosted project, run seed SQL manually via the Dashboard SQL
editor if you need it.

## 🔐 Authentication Testing

Because development points at the hosted Supabase project, auth emails (confirmation, password
reset, etc.) go through whatever email provider is configured on that project — there is no
local Inbucket test inbox in the current setup. Check the Supabase Dashboard's Auth logs, or your
own inbox, when testing auth flows.

## 🐛 Troubleshooting

### Supabase connection errors
Double check `.env.local` has the correct `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
/ `SUPABASE_SERVICE_ROLE_KEY` for the hosted project, and that the hosted project is not paused
(free/low-usage Supabase projects can auto-pause).

### Migration errors
```bash
# Check migration status against the linked hosted project
supabase migration list
```
Since there's no local database, there's no `supabase db reset` safety net here — a bad
migration on the hosted project needs a manual fix or a follow-up migration.

## 📝 Best Practices

1. **Coordinate schema changes** — migrations apply directly to the shared hosted project, so
   there's no local sandbox to test destructive changes against first.
2. **Never commit `.env.local`** — it's in `.gitignore` and holds real hosted-project credentials.
3. **Review migrations carefully before `supabase db push`** — there's no "reset and try again"
   for the shared project the way there is for a local stack.

## Optional: running a fully local stack

Not the current team workflow, and untested as of this writing — `supabase/config.toml` is
present but its `project_id` no longer matches the hosted project in `.env.local`, so linking may
need to be redone (`supabase link`). If you want to try it (requires Docker):

```bash
supabase start   # spins up local Postgres/Auth/Studio/etc. via Docker
supabase status  # print local API/Studio/DB URLs and keys
supabase stop    # tear it down
```

If it works, `supabase start` prints local URLs (API, Studio, Inbucket email testing, DB) you'd
swap into a separate `.env.local` to point the app at the local stack instead of the hosted
project. Treat this as an unsupported/experimental path unless someone verifies and updates this
doc.

## 🔗 Useful Links

- **Supabase Dashboard**: https://supabase.com/dashboard (hosted project — Table Editor, SQL
  Editor, Auth logs, etc.)
- **Supabase CLI Docs**: https://supabase.com/docs/guides/cli
