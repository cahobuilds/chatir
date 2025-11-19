# Vercel Deployment Setup Guide

This guide will help you set up CI/CD and deploy your multi-tenant AI Client Care platform to Vercel.

## Prerequisites

- GitHub repository (already set up ✅)
- Vercel account ([sign up here](https://vercel.com))
- Supabase project configured
- Environment variables ready

## Step 1: Create Vercel Project

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository: `tindevelopers/aI-multi-tenant-saas`
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm ci` (default)

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project (from project root)
vercel link

# Deploy to production
vercel --prod
```

## Step 2: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

### Required Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ystivchlyoijaghwdcjd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application URLs
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

### Optional Variables

```env
# Retell AI (can also be stored per-tenant in database)
RETELL_API_KEY=your-retell-api-key

# Stripe for billing (if using)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Important:** 
- Set these for **Production**, **Preview**, and **Development** environments
- Never commit `.env.local` files to Git
- Use Vercel's environment variables for all secrets

## Step 3: Set Up GitHub Secrets

For CI/CD workflows to work, add these secrets to your GitHub repository:

1. Go to GitHub → Your Repository → Settings → Secrets and variables → Actions
2. Click **"New repository secret"**
3. Add the following:

### Required Secrets

- **`VERCEL_TOKEN`**
  - Get it from: [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
  - Create a new token with full access
  - Name: `VERCEL_TOKEN`
  - Value: `vercel_xxxxx...`

### Optional Secrets (if using Vercel CLI in workflows)

- **`VERCEL_ORG_ID`**
  - Found in: Vercel Dashboard → Settings → General
  - Only needed if using multiple organizations

- **`VERCEL_PROJECT_ID`**
  - Found in: Vercel Project → Settings → General
  - Usually auto-detected, but can be set explicitly

## Step 4: Verify CI/CD Workflow

The `simple-ci.yml` workflow will:

1. **On Pull Requests:**
   - Run linting
   - Type checking
   - Build verification
   - No deployment

2. **On Push to Main:**
   - Run all CI checks
   - Automatically deploy to Vercel production

## Step 5: Test Deployment

### Manual Test

```bash
# Push a test commit
git commit --allow-empty -m "test: verify CI/CD"
git push origin main
```

### Check Workflow Status

1. Go to GitHub → Your Repository → Actions tab
2. Watch the workflow run
3. Check for any errors

### Verify Deployment

1. Go to Vercel Dashboard → Your Project → Deployments
2. Check that the latest deployment succeeded
3. Visit your production URL

## Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Solution: Add all required env vars in Vercel Dashboard

**Error: TypeScript errors**
- Solution: Run `npm run type-check` locally and fix errors

**Error: Build timeout**
- Solution: Check build logs, optimize dependencies if needed

### Deployment Fails

**Error: VERCEL_TOKEN invalid**
- Solution: Regenerate token in Vercel and update GitHub secret

**Error: Project not found**
- Solution: Run `vercel link` locally or set `VERCEL_PROJECT_ID` secret

### Common Issues

**Database connection errors**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and keys are correct
- Check Supabase project is active
- Verify RLS policies allow connections

**Authentication not working**
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- Check Supabase Auth settings
- Verify redirect URLs in Supabase dashboard

## Next Steps

1. ✅ Set up Supabase migrations (already done)
2. ✅ Configure environment variables
3. ✅ Set up GitHub secrets
4. ✅ Test deployment
5. 🎉 Your app is live!

## Useful Commands

```bash
# Check Vercel deployment status
vercel ls

# View deployment logs
vercel logs [deployment-url]

# Rollback to previous deployment
vercel rollback

# Check environment variables
vercel env ls
```

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)






