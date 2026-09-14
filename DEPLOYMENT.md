# Deployment Guide — Chat IR

This guide covers deploying **Chat IR**, a multi-tenant SaaS platform for AI voice/chat agents (via **Retell AI**) with **Supabase** for database/auth and **Stripe** for subscription billing.

## 🚀 Quick Deploy (Vercel — Recommended)

For the full step-by-step Vercel + CI/CD setup (native Git integration vs. GitHub Actions, environment variables, GitHub secrets), see **[`VERCEL_SETUP.md`](./VERCEL_SETUP.md)** — that is the canonical Vercel deployment doc for this repo. The summary:

```bash
npm i -g vercel
vercel link
vercel --prod
```

### Prerequisites

**Required accounts:**
- [Supabase](https://supabase.com) — Database & Authentication
- [Retell AI](https://retellai.com) — Voice & Chat Bot API
- [Stripe](https://stripe.com) — Subscription billing
- [Vercel](https://vercel.com) — Hosting (or your preferred Node.js host)

### 1. Set Up Supabase

See [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) for the full walkthrough. In short:

```bash
npm install -g supabase
supabase link --project-ref your-project-ref
supabase db push
```

### 2. Set Up Stripe

1. Create a Stripe account (test mode is fine to start) and grab your API keys from the Stripe Dashboard.
2. Run the one-time setup script to create the "Chat IR Subscription" product/price (idempotent — safe to re-run):
   ```bash
   npx tsx scripts/stripe-setup.ts
   ```
   This prints a `STRIPE_PRICE_ID` — save it for the environment variables below.
3. Register a webhook endpoint pointing at `https://<your-domain>/api/webhooks/stripe` (events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`) and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
   - Locally, use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` instead — it prints a local `whsec_...` secret.
   - **Note:** you can only register the *production* webhook endpoint after your first deploy, once you know the live URL. Set `STRIPE_WEBHOOK_SECRET` to the local value first, deploy, then come back and set the production value in Vercel's environment variables.

### 3. Environment Variables

Set these in your **Vercel dashboard** → Project Settings → Environment Variables (Production, Preview, and Development):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Used to encrypt per-tenant secrets (e.g. each org's Retell API key) at the application layer
ENCRYPTION_KEY=a-strong-random-secret

# Application URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Stripe (required — subscription billing is live, card required at signup)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Optional variables** (safe to leave unset — see `README.md` for full descriptions of each):

```env
RETELL_WEBHOOK_SECRET=
RETELL_WEBHOOK_VERIFY=            # "true" to enforce Retell webhook signature verification
ALLOWED_LLM_MODELS=               # comma-separated allowlist; empty = no restriction
WIDGET_RATE_LIMIT_ENABLED=        # "true" to enable per-IP rate limiting on the public chat widget
WIDGET_RATE_LIMIT_PER_MINUTE=
RETELL_API_KEY=                   # only used by local smoke-test scripts in scripts/, not by the app
```

**Note on Retell AI:** there is no global `RETELL_API_KEY` used by the running app. Each organization connects its **own** Retell workspace API key via **Settings → Voice Provider Integration** in the app (stored encrypted, per-tenant). See `docs/RETELL_WORKSPACE_ISOLATION.md` for why.

**Important:** Never commit `.env.local`. Use your hosting platform's environment variable store for all secrets.

## 🐳 Alternative: Docker Deployment

Next.js supports a standalone Docker build. This repo does not ship a `Dockerfile` — add one if you need this path:

1. Add `output: 'standalone'` to `next.config.ts`.
2. Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

3. Build and run, passing all environment variables from the list above (via `-e` flags, an env file, or your platform's secrets manager):

```bash
docker build -t chat-ir .
docker run -p 3000:3000 --env-file .env.local chat-ir
```

Any host that runs a standard Node.js server (Fly.io, Railway-style PaaS, a VM, etc.) works the same way — Vercel is simply the path this project is set up for out of the box (see `.github/workflows/deploy-vercel.yml`).

## 🗄️ Database Setup (Supabase)

```bash
supabase migration new some_change   # create a new migration
supabase db push                     # apply all pending migrations
```

Row Level Security is enabled on every multi-tenant table (`tenants`, `agents`, `interactions`, etc.) for tenant isolation — see [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) for the full setup guide and current table list.

## 🤖 Retell AI Integration

1. Each client organization gets its **own** Retell workspace (Retell has no API-level tenant isolation — see `docs/RETELL_WORKSPACE_ISOLATION.md` for why one workspace per org is required, not optional).
2. In that workspace's Retell dashboard, generate an API key and paste it into the org's **Settings → Voice Provider Integration** screen in Chat IR (it's encrypted at rest with `ENCRYPTION_KEY`).
3. Configure the Retell webhook to point at `https://your-domain.com/api/webhooks/retell` for call/chat event delivery.

## 📦 Embeddable Chat Widget

Every chat agent has a **Get Embed Code** action (`ChatAgentList`) that produces:

```html
<script src="https://your-domain.com/api/widget/chat.js?agent_id=AGENT_ID"></script>
```

This can be pasted into any site (WordPress, Webflow, a plain HTML page, etc.). The widget script and its message endpoint are served from `/api/widget/*`; optional per-IP rate limiting is controlled by `WIDGET_RATE_LIMIT_ENABLED`/`WIDGET_RATE_LIMIT_PER_MINUTE`.

## 🔒 Security Considerations

- ✅ Never commit `.env.local` (already in `.gitignore`)
- ✅ Use your hosting platform's environment variable store for all secrets in production
- ✅ Rotate API keys (Supabase, Stripe, Retell) regularly
- ✅ `SUPABASE_SERVICE_ROLE_KEY` is server-only — never expose it to the client
- ✅ Row Level Security is enabled on all tenant tables for isolation
- ✅ Per-tenant Retell API keys are encrypted at the application layer (`ENCRYPTION_KEY`)
- ✅ Stripe webhook requests are verified against `STRIPE_WEBHOOK_SECRET`; Retell webhook verification is opt-in via `RETELL_WEBHOOK_VERIFY`
- ✅ Always use HTTPS in production (Vercel provides this automatically)

## 🆘 Troubleshooting

### Build Failures
- Check Node.js version (requires 18+)
- Clear `node_modules` and reinstall
- Run `npx tsc --noEmit` locally to catch type errors before deploying

### Deployment Issues
- Check that every required environment variable above is set for the target environment
- Verify the Vercel build/output settings — see [`VERCEL_SETUP.md`](./VERCEL_SETUP.md)
- Check deployment logs in the Vercel dashboard

### Billing Issues
- Confirm `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_ID` are all set
- If a production webhook isn't registered yet, `checkout.session.completed` events will never arrive — a tenant's `plan_status` won't update even after a successful Checkout

### Database Connection Errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and the Supabase keys are correct
- Check the Supabase project is active and migrations have been applied (`supabase migration list`)

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Retell AI API Documentation](https://docs.retellai.com)
- [Stripe Documentation](https://stripe.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
