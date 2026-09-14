# Local Development Credentials

> ⚠️ **LOCAL ONLY.** The credentials and scripts below create accounts with publicly documented
> passwords (`admin@test.com` / `test123456` and `systemadmin@tin.info` / `88888888`). Never run
> them against a shared, staging, or production project without immediately changing the password
> afterward.
>
> **Guard status differs by script:**
> - `scripts/create-system-admin.ts` refuses to run against anything that doesn't look like a
>   local Supabase instance (`127.0.0.1`/`localhost` in `NEXT_PUBLIC_SUPABASE_URL`) unless
>   `ALLOW_REMOTE_SYSTEM_ADMIN_SEED=true` is explicitly set.
> - **Known issue:** `scripts/setup-local-credentials.ts` does **not** have this guard yet — it
>   will happily create the `admin@test.com` account against whatever Supabase project
>   `NEXT_PUBLIC_SUPABASE_URL`/`.env.local` currently points to, local or remote. **Do not run it
>   against a remote/production project.** Adding the same guard to this script is a separate,
>   out-of-scope code fix — until then, double-check your `.env.local` before running it.

## 🚀 Quick Login

**Test Admin Account:**
- **Email**: `admin@test.com`
- **Password**: `test123456`
- **Role**: `tenant_admin` — ⚠️ this is a *legacy* role name the script still assigns (see Known
  Issues below); it predates the 2026-09-08 canonical role model and is not one of the 6 current
  roles (`company_admin`, `company_editor`, `company_viewer`, `platform_admin`,
  `platform_operator`, `platform_billing` — see `src/lib/permissions-server.ts`)
- **Tenant**: Test Company

## 📍 Access Points

- **App**: http://localhost:3000
- **Login Page**: http://localhost:3000/auth/login
- **Dashboard**: http://localhost:3000/dashboard (after login)

## 🔄 Recreating Credentials

If you need to recreate the test credentials:

```bash
npx tsx scripts/setup-local-credentials.ts
```

This script will:
1. Create a test user (`admin@test.com`)
2. Create a test tenant (`Test Company`)
3. Link the user to the tenant with the legacy `tenant_admin` role (see Known Issues below)

## 🔐 Creating Additional Users

### Option 1: Use Signup Page
1. Go to http://localhost:3000/auth/signup
2. Fill in the form
3. A new tenant will be created automatically

### Option 2: Use Supabase Studio
1. Open your Supabase project's dashboard (Project Settings → General, or
   `https://supabase.com/dashboard/project/<your-project-ref>`) — this repo's local dev
   points at the shared **hosted** Supabase project, not a local Postgres instance (see
   `docs/LOCAL_DEVELOPMENT.md`), so there is no `127.0.0.1:54323` Studio to open.
2. Go to **Authentication** > **Users**
3. Click **Add User** > **Create new user**
4. Fill in email and password
5. Check **Auto Confirm User**
6. Create the user

Then manually create:
- A tenant in the `tenants` table
- A `user_tenants` relationship linking the user to the tenant

### Option 3: Use System Admin Script
For a system admin user with full access:

```bash
npx tsx scripts/create-system-admin.ts
```

This creates:
- **Email**: `systemadmin@tin.info`
- **Password**: `88888888`
- **Role**: `system_admin` — ⚠️ legacy role name (see Known Issues below); the current
  platform-wide equivalent is `platform_admin`

## ⚠️ Known Issues

- **`setup-local-credentials.ts` has no local-only guard.** Unlike `create-system-admin.ts`, it
  does not check `NEXT_PUBLIC_SUPABASE_URL` before running. Do not run it against a
  remote/production Supabase project.
- **Both scripts still assign pre-2026-09-08 legacy role names** (`tenant_admin`, `system_admin`)
  instead of the 6 canonical roles now defined in `src/lib/permissions-server.ts`
  (`platform_admin`, `platform_operator`, `platform_billing`, `company_admin`, `company_editor`,
  `company_viewer` — seeded by `supabase/migrations/20260908000000_platform_roles_cleanup.sql`).
  Those legacy roles are deactivated (`roles.is_active = false`) and have **no rows in
  `role_permissions`**, so accounts created *today* by either script end up with `role_id` set but
  **no recognized permissions** — `isPlatformAdmin()`/`hasPlatformPermission()` only match the
  role name `platform_admin`/`platform_operator`/`platform_billing` by name, and
  `hasPermission()` looks up permissions via `role_permissions`, which is empty for legacy roles.
  In short: as of this writing, running these scripts produces a login that authenticates but has
  no admin access in the app. Updating the scripts to assign `company_admin`/`platform_admin` is a
  separate, out-of-scope code fix. If you need a working admin account locally, assign the role
  manually via Supabase Studio (see below) using one of the 6 canonical role names.

## 🧪 Testing Different Roles

You can modify the `user_tenants.role_id` column in Supabase Studio to point at one of the 6
canonical roles in the `roles` table:

- `platform_admin` - Full platform access (organizations, plans, payments, voice provider key, platform staff)
- `platform_operator` - Onboard organizations, connect voice-provider key, view payments, manage model allowlist
- `platform_billing` - View/update plans, view/manage payments
- `company_admin` - Manage agents, knowledge base, users, and plan/billing for one company
- `company_editor` - Manage agents and knowledge base for one company (no users/billing)
- `company_viewer` - Read-only access to analytics, history, and transcripts

## 📝 Notes

- Emails created via `scripts/setup-local-credentials.ts`/`scripts/create-system-admin.ts` are
  auto-confirmed (service-role `email_confirm: true`), no email verification needed
- Passwords can be changed via the hosted Supabase Studio > Authentication > Users
- ⚠️ **Do not run `supabase db reset`** — this repo's dev environment is the shared hosted
  project (see `docs/LOCAL_DEVELOPMENT.md`), so that command would wipe real, shared data,
  not an isolated local database


