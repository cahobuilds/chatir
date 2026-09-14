# Vercel Deployment Setup Guide

This is the canonical guide for deploying **Chat IR** to Vercel, including CI/CD. (Two earlier, near-duplicate versions of this doc — `docs/VERCEL_DEPLOYMENT_OPTIONS.md` and `docs/VERCEL_GITHUB_SETUP.md` — have been folded into this one and removed.)

- **Repo:** [`cahobuilds/chatir`](https://github.com/cahobuilds/chatir)
- **Framework:** Next.js (App Router)

## Prerequisites

- The GitHub repository above, with push access
- A [Vercel](https://vercel.com) account
- A Supabase project set up (see [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md))
- Stripe API keys and a Price ID (see [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Stripe subscription billing is required, not optional)

## Step 1: Create the Vercel Project

### Option A: Via Vercel Dashboard (recommended)

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard) → **Add New Project**
2. Import the GitHub repository: `cahobuilds/chatir`
3. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm ci` (default)

### Option B: Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link      # from the project root — creates .vercel/project.json locally
vercel --prod
```

After linking, find your project's identifiers in **Vercel Dashboard → Project → Settings → General** (or in the locally generated `.vercel/project.json`, which is git-ignored and not committed to this repo):
- **Project ID**: `<your-vercel-project-id>`
- **Organization/Team ID**: `<your-vercel-org-id>`

> This repo does not have a committed `.vercel/project.json`, so these two IDs can't be filled in generically here — get them from your own Vercel dashboard once the project is linked/created. Do not reuse IDs from any other project (an earlier version of this doc had project/org IDs left over from the pre-rebrand `ai-multi-tenant-saas` project — those are stale and must not be reused for this repo).

## Step 2: Two Ways to Deploy — Pick One

This repo has workflows set up for **both** approaches; pick one and disable/ignore the other to avoid double-deploying.

### Option 1: Vercel's Native GitHub Integration (simpler — no GitHub secrets needed) ✅ Recommended

Vercel connects directly to the GitHub repository and deploys automatically on every push — no GitHub secrets required.

**Setup:**
1. Go to your Vercel project's **Settings → Git**
2. Connect/verify the GitHub repository (`cahobuilds/chatir`)
3. Configure branch deployments:
   - `main` → Production
   - Any other branch / PR → Preview deployment (automatic)
4. Done. `.github/workflows/ci-vercel.yml` still runs lint/type-check/build on every push and PR for code-quality gating — it does **not** deploy (its `deploy` job is intentionally commented out in favor of Vercel's own integration).

**Advantages:** simplest setup, automatic PR preview deployments, no secrets to manage, deployment status shown natively in GitHub.

### Option 2: GitHub Actions Deploys via Vercel CLI (more control — needs GitHub secrets)

`.github/workflows/deploy-vercel.yml` is already configured to build and deploy via the Vercel CLI: preview deployments on pull requests, production deployments on push to `main`.

**When to use this instead:** you want custom CI/CD logic before deploying, or you're already centralizing everything in GitHub Actions.

**Setup — add these GitHub repository secrets** (Repo → Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|---|---|
| `VERCEL_TOKEN` | [Vercel Account Settings → Tokens](https://vercel.com/account/tokens) — create a new token |
| `VERCEL_ORG_ID` | Vercel Project → Settings → General (or `.vercel/project.json` after `vercel link`) |
| `VERCEL_PROJECT_ID` | Vercel Project → Settings → General (or `.vercel/project.json` after `vercel link`) |

**If you go this route:** disable Vercel's automatic Git-push deploys in the Vercel dashboard (Settings → Git) so the same push doesn't trigger two deployments.

## Step 3: Configure Environment Variables

Add these in **Vercel Dashboard → Project → Settings → Environment Variables**, for **Production**, **Preview**, and **Development**. This list is kept in sync with `.env.example`/`.env.local` — see [`README.md`](./README.md) for the full description of each variable.

### Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Encrypts per-tenant secrets (e.g. each org's Retell API key) at the application layer
ENCRYPTION_KEY=a-strong-random-secret

# Application URL (update after your first deployment gives you a real domain)
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app

# Stripe — subscription billing is live; card required at signup, 14-day trial, single $99/mo plan
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Optional

```env
RETELL_WEBHOOK_SECRET=
RETELL_WEBHOOK_VERIFY=
ALLOWED_LLM_MODELS=
WIDGET_RATE_LIMIT_ENABLED=
WIDGET_RATE_LIMIT_PER_MINUTE=
RETELL_API_KEY=   # only used by local smoke-test scripts, not by the deployed app
```

**Note:** Retell AI itself has no global env var read by the app — each organization connects its own Retell workspace key in-app under **Settings → Voice Provider Integration** (see `docs/RETELL_WORKSPACE_ISOLATION.md`).

**Important:**
- Set variables for all three environments (Production, Preview, Development) unless you intentionally want different values per environment.
- Never commit `.env.local` to Git.
- After registering the production Stripe webhook (see [`DEPLOYMENT.md`](./DEPLOYMENT.md)), update `STRIPE_WEBHOOK_SECRET` in Vercel to the production signing secret (it differs from the local `stripe listen` secret).

## Step 4: Verify the Deployment

1. Push to `main` (or open a PR to see a preview deployment).
2. Watch the build in **Vercel Dashboard → Deployments** (and/or the GitHub Actions tab if using Option 2 above).
3. Visit the deployment URL and confirm:
   - `/api/health` responds and reports Supabase env vars as present
   - Signup (`/auth/login?mode=signup`) redirects to Stripe Checkout
   - Sign-in and the dashboard load correctly

## Useful Commands

```bash
vercel ls                 # list deployments
vercel logs <url>         # view deployment logs
vercel rollback           # roll back to a previous deployment
vercel env ls             # list configured environment variables
```

## Troubleshooting

**Build fails with missing environment variables**
- Add every required variable above in Vercel Dashboard → Settings → Environment Variables, for the environment that's failing (Production/Preview/Development can differ).

**Build fails with TypeScript errors**
- Run `npx tsc --noEmit` locally and fix errors before pushing.

**`VERCEL_TOKEN` invalid (Option 2 only)**
- Regenerate the token in Vercel and update the GitHub secret.

**Project/org ID not found (Option 2 only)**
- Run `vercel link` locally to generate `.vercel/project.json`, or find both IDs in Vercel Dashboard → Project → Settings → General.

**Repository not found when connecting Git (Option 1 only)**
- Confirm Vercel is authorized to access the `cahobuilds` GitHub account/org and that the repository name is exactly `cahobuilds/chatir`.

**Two deployments triggered per push**
- You likely have both Vercel's native Git integration *and* `deploy-vercel.yml` active. Pick one approach (Step 2) and disable the other.

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
