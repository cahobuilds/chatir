# Chat IR

Chat IR is a multi-tenant SaaS platform for building and managing AI voice and chat agents, powered by [Retell AI](https://retellai.com). It gives a platform-admin team a single dashboard to onboard client organizations, connect each org's own Retell workspace, create voice/chat agents with knowledge bases, and monitor call/chat analytics — with per-organization role-based access control and real Stripe subscription billing.

## 🚀 Features

### 🤖 Agents & Content
- **Voice Agents** — create and manage AI voice agents (backed by a connected Retell workspace)
- **Chat Agents** — create and manage AI chat agents, embeddable on any site via a single `<script>` tag
- **Call History** — browse past calls and recordings
- **Chat History** — browse past chat conversations
- **Knowledge Base** — attach knowledge sources to agents

### 📊 Analytics
- **Overview** — cross-agent performance dashboard
- **Agent Performance** — per-agent metrics
- **Call Analytics** — call outcomes and trends
- **Customer Experience** — satisfaction/sentiment signals surfaced from interactions

### 🏢 Platform Administration (platform staff only)
- **Organizations** — every client company: its users, plan/billing status, and Retell connection
- **Platform Users** — manage platform staff and their roles
- **Roles & Permissions** — manage the role/permission catalog (RBAC, tenant-isolated via Supabase RLS)
- **Model Comparison** — compare candidate LLM models against the allowlist
- **Billing & Usage** — real Stripe subscription status per organization, with a manual override for grandfathered/comped accounts

### 💳 Billing
- Single $99/month subscription plan via **Stripe**, with a 14-day free trial (card required at signup)
- Self-serve plan management through Stripe's hosted Customer Portal
- Pre-existing tenants are grandfathered and billing-exempt

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Supabase (Postgres + Row Level Security)
- **Voice/Chat provider**: Retell AI (`retell-sdk`, `retell-client-js-sdk`)
- **Billing**: Stripe (`stripe`)
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts & ApexCharts
- **Icons**: Heroicons & Lucide

## 📦 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables** — copy `.env.example` to `.env.local` and fill in the values described below.

3. **Set up the database** — see [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) to create a Supabase project and run the migrations in `supabase/migrations/`.

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** and navigate to `http://localhost:3000`.

### Environment variables

`.env.example` only documents the Stripe variables in comments today; the full set of variables the app actually reads is below (see `.env.local` for a working local template — it is git-ignored).

**Required to run the app at all:**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-only, never exposed to the client) |
| `ENCRYPTION_KEY` | Encrypts sensitive per-tenant fields (e.g. each org's Retell API key) at the application layer |

**Required for billing (Stripe subscriptions, live since 2026-09-14):**

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe server-side API key |
| `STRIPE_WEBHOOK_SECRET` | Verifies `POST /api/webhooks/stripe` signatures |
| `STRIPE_PRICE_ID` | The recurring Price ID for the single $99/mo plan (see `scripts/stripe-setup.ts`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Reserved for a future client-side Stripe Elements flow; not read by the current server-redirect Checkout/Portal flow, but still expected to be set |

**Optional:**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Base URL used when generating widget embed code; falls back to the browser's own origin when unset |
| `RETELL_WEBHOOK_SECRET` / `RETELL_WEBHOOK_VERIFY` | Opt-in signature verification for `POST /api/webhooks/retell` (set `RETELL_WEBHOOK_VERIFY=true` to enforce; secret falls back to `RETELL_API_KEY` when unset) |
| `ALLOWED_LLM_MODELS` | Comma-separated allowlist of voice-provider model IDs; empty = no restriction |
| `WIDGET_RATE_LIMIT_ENABLED` / `WIDGET_RATE_LIMIT_PER_MINUTE` | Best-effort per-IP rate limiting for the public chat widget endpoint |
| `RETELL_API_KEY` | Only used by local smoke-test scripts in `scripts/` — **not** read by the app itself. Retell is connected per-organization via **Settings → Voice Provider Integration**, not as a global key (see `docs/RETELL_WORKSPACE_ISOLATION.md`) |

## 🏗️ Project Structure

```
src/
├── app/
│   ├── (admin)/          # Authenticated app: dashboard, agents, calls, chats,
│   │                      # knowledge, analytics, billing, tenant-settings, users, settings
│   ├── api/               # API routes (agents, analytics, billing, retell, tenants, webhooks, widget, ...)
│   └── auth/              # Login / signup / forgot-password
├── components/            # Feature components (agent lists, billing screens, tenant management, ...)
├── config/                # Navigation config
├── context/               # React context providers (organization, sidebar, theme)
├── hooks/                 # Custom React hooks
└── lib/                   # Supabase clients, Retell client, Stripe client, encryption, permissions
```

## 🚀 Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full deployment guide and [`VERCEL_SETUP.md`](./VERCEL_SETUP.md) for the canonical Vercel setup steps.

```bash
npm run build
npx vercel --prod
```

## 📚 Related Docs

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — deployment guide
- [`VERCEL_SETUP.md`](./VERCEL_SETUP.md) — Vercel project setup + CI/CD
- [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) — database setup
- [`docs/RETELL_WORKSPACE_ISOLATION.md`](./docs/RETELL_WORKSPACE_ISOLATION.md) — why each org gets its own Retell workspace
- [`docs/PLATFORM_ORG_ONBOARDING.md`](./docs/PLATFORM_ORG_ONBOARDING.md) — runbook for onboarding a new client organization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Verify with `npx tsc --noEmit` and `npm run build` (there is no automated test suite yet)
5. Submit a pull request

## 📄 License

MIT License.
