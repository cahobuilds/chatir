# Running Database Migrations

Your Supabase project is configured. Follow these steps to run the migrations:

## Option 1: Using Supabase CLI (Recommended)

### Step 1: Authenticate with Supabase

Open a terminal and run:

```bash
supabase login
```

This will open your browser to authenticate. After authentication, you'll be able to link and push migrations.

### Step 2: Link Your Project

```bash
supabase link --project-ref ystivchlyoijaghwdcjd
```

When prompted, enter your database password: `REDACTED`

### Step 3: Push Migrations

```bash
supabase db push
```

This will apply all migrations to your remote Supabase database.

## Option 2: Using Supabase Dashboard (Alternative)

If CLI authentication doesn't work, you can run the migration SQL directly:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ystivchlyoijaghwdcjd)
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/20251111172146_create_initial_schema.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**

## Verify Migration

After running migrations, verify in Supabase Dashboard:

1. Go to **Table Editor**
2. You should see these tables:
   - ✅ `tenants`
   - ✅ `user_tenants`
   - ✅ `agents`
   - ✅ `interactions`
   - ✅ `billing_records`
   - ✅ `api_keys`

3. Go to **Authentication** → **Policies**
4. Verify RLS policies are enabled on all tables

## Environment Variables

Your `.env.local` file has been created with:
- ✅ Supabase URL
- ✅ Anon Key (public)
- ✅ Service Role Key (secret - server-side only)

**Important:** Never commit `.env.local` to git!

## Next Steps

After migrations are complete:

1. ✅ Test database connection: `npm run dev`
2. ✅ Set up authentication (see `docs/ARCHITECTURE_RECOMMENDATIONS.md`)
3. ✅ Create your first tenant
4. ✅ Set up Retell AI integration

## Troubleshooting

### "Access denied" error
- Make sure you're logged in: `supabase login`
- Verify project ref is correct: `ystivchlyoijaghwdcjd`

### Migration fails
- Check SQL syntax in migration file
- Verify database password is correct
- Check Supabase dashboard for error messages

### RLS policies not working
- Verify policies were created (check SQL Editor → History)
- Ensure user is authenticated
- Check `user_tenants` table has correct entries

