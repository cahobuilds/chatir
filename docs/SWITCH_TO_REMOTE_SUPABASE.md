# Switch to Remote Supabase Instance

## Quick Setup

### Step 1: Get API Keys from Supabase Dashboard

1. Go to: **https://supabase.com/dashboard/project/ystivchlyoijaghwdcjd/settings/api**
2. Copy the following values:
   - **Project URL**: `https://ystivchlyoijaghwdcjd.supabase.co`
   - **anon/public key**: (starts with `eyJ...`)
   - **service_role key**: (starts with `eyJ...`) - **KEEP THIS SECRET!**

### Step 2: Update .env.local

Update your `.env.local` file with the remote credentials:

```env
# Remote Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ystivchlyoijaghwdcjd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-dashboard
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-dashboard

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Retell AI
# RETELL_API_KEY=your-retell-api-key
```

### Step 3: Restart Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Test Connection

```bash
npx tsx scripts/test-supabase-connection.ts
```

## Verify Connection

Once updated, you can verify the connection by:
1. Opening http://localhost:3000
2. Checking the browser console for any connection errors
3. Testing login functionality

## Switching Back to Local

To switch back to local Supabase:

```env
# Local Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=REDACTED
SUPABASE_SERVICE_ROLE_KEY=REDACTED
```

And make sure local Supabase is running:
```bash
supabase start
```

## Important Notes

⚠️ **Never commit `.env.local` to git** - it contains sensitive credentials!

🔐 **Keep your service_role key secret** - it has admin access to your database.

🌐 **Remote Supabase** - Use for:
- Testing with production-like data
- Sharing with team members
- Staging environment

💻 **Local Supabase** - Use for:
- Daily development
- Testing migrations
- Offline development


