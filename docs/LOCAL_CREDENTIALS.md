# Local Development Credentials

> ⚠️ **Local development only.** The credentials and scripts below create an account with a
> publicly documented password. They now refuse to run against anything that isn't a local
> Supabase instance (`127.0.0.1`/`localhost`) unless `ALLOW_REMOTE_SYSTEM_ADMIN_SEED=true` is
> explicitly set — see `scripts/create-system-admin.ts`. Never run them against a shared,
> staging, or production project without immediately changing the password afterward.

## 🚀 Quick Login

**Test Admin Account:**
- **Email**: `admin@test.com`
- **Password**: `test123456`
- **Role**: `tenant_admin`
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
3. Link the user to the tenant with `tenant_admin` role

## 🔐 Creating Additional Users

### Option 1: Use Signup Page
1. Go to http://localhost:3000/auth/signup
2. Fill in the form
3. A new tenant will be created automatically

### Option 2: Use Supabase Studio
1. Open http://127.0.0.1:54323
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
- **Role**: `system_admin`

## 🧪 Testing Different Roles

You can modify the `user_tenants` table in Supabase Studio to test different roles:

- `system_admin` - Full platform access
- `super_admin` - Tenant admin with elevated permissions
- `tenant_admin` - Standard tenant administrator
- `subtenant_admin` - Sub-tenant administrator
- `agent` - Agent user
- `viewer` - Read-only access

## 📝 Notes

- All emails are auto-confirmed in local Supabase (no email verification needed)
- Passwords can be changed via Supabase Studio > Authentication > Users
- You can reset the local database with `supabase db reset` (this will delete all data)


