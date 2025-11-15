# Testing Database Access for ystivchlyoijaghwdcjd

## Steps to Get API Keys

1. Go to: https://supabase.com/dashboard/project/ystivchlyoijaghwdcjd/settings/api
2. Copy the following:
   - **Project URL**: `https://ystivchlyoijaghwdcjd.supabase.co`
   - **anon/public key**: (starts with `eyJ`)
   - **service_role key**: (starts with `eyJ`) - **KEEP SECRET**

## Test Connection

Once you have the keys, update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ystivchlyoijaghwdcjd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then test with:
```bash
npx tsx scripts/test-supabase-connection.ts
```

## Link Project via CLI

If you have access, you can link:
```bash
supabase link --project-ref ystivchlyoijaghwdcjd
# When prompted, enter password: REDACTED
```



