# Switch to Correct Database (ystivchlyoijaghwdcjd)

## Current Issue
The project is currently using the wrong database:
- **Current**: `pbtsipcciojuwtvzmzeu.supabase.co`
- **Should be**: `ystivchlyoijaghwdcjd.supabase.co`

## Steps to Fix

### 1. Get API Keys from Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/ystivchlyoijaghwdcjd/settings/api
2. Copy the following:
   - **Project URL**: `https://ystivchlyoijaghwdcjd.supabase.co`
   - **anon/public key**: (starts with `eyJ`)
   - **service_role key**: (starts with `eyJ`) - **KEEP THIS SECRET**

### 2. Update .env.local

Update your `.env.local` file with:

```env
# Supabase Configuration - CORRECT DATABASE
NEXT_PUBLIC_SUPABASE_URL=https://ystivchlyoijaghwdcjd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-dashboard
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-dashboard

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Link Project (Optional)

If you have access, link the project:
```bash
supabase link --project-ref ystivchlyoijaghwdcjd
# Password: REDACTED
```

### 4. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

### 5. Test Connection

```bash
npx tsx scripts/test-supabase-connection.ts
```

## Database Password

If needed for linking:
- Password: `REDACTED`

