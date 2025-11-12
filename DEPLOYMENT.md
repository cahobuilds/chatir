# Deployment Guide - Multi-Tenant AI Client Care Platform

This guide covers deployment for your multi-tenant AI Client Care platform using **Supabase** for database/auth and **Retell AI** for voice/chat bots.

## 🚀 Quick Deploy (Vercel - Recommended)

### 1. Prerequisites

**Required Accounts:**
- [Supabase](https://supabase.com) - Database & Authentication
- [Retell AI](https://retellai.com) - Voice & Chat Bot API
- [Vercel](https://vercel.com) - Hosting (or your preferred hosting)

### 2. Set Up Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run database migrations
supabase db push
```

**Create Supabase Project:**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and API keys:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon Key: `eyJhbGc...` (public)
   - Service Role Key: `eyJhbGc...` (secret, server-only)

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

### 4. Environment Variables

Set these in your **Vercel dashboard** → Project Settings → Environment Variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application URLs
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Retell AI (optional - can be stored per-tenant in database)
# RETELL_API_KEY=your-default-retell-api-key

# Optional: Stripe for billing
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Important:** Never commit `.env.local` files. Use Vercel's environment variables for production.

## 🐳 Docker Deployment

### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

**Update `next.config.ts` for standalone output:**

```typescript
const nextConfig = {
  output: 'standalone',
  // ... rest of config
};
```

### 2. Build and Run

```bash
# Build the image
docker build -t ai-client-care-app .

# Run the container with environment variables
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-supabase-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  ai-client-care-app
```

**Note:** For production, use Docker secrets or environment variable files instead of command-line args.

## ☁️ AWS Deployment

### 1. Using AWS Amplify
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
```

## 🌐 Netlify Deployment

### 1. Build Settings
```yaml
# netlify.toml
[build]
  command = "npm run build"
  publish = "out"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## 🔧 Environment Configuration

### Development (.env.local)

Create `.env.local` file in project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Retell AI (for testing)
RETELL_API_KEY=your-retell-api-key
```

**Run Supabase locally:**
```bash
supabase start
```

### Production

Set environment variables in your hosting platform (Vercel/Netlify/etc.):

```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 🗄️ Database Setup (Supabase)

### 1. Run Migrations

```bash
# Create migration file
supabase migration new create_initial_schema

# Edit migration file in supabase/migrations/
# Then apply:
supabase db push
```

### 2. Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;

-- Create policies (see docs/MULTITENANT_ARCHITECTURE.md for details)
```

### 3. Set Up Authentication

In Supabase Dashboard:
1. Go to Authentication → Providers
2. Enable Email provider
3. Configure email templates
4. Set up OAuth providers (optional)

## 🤖 Retell AI Integration

### 1. Install Retell SDK

```bash
npm install retell-sdk
```

### 2. Configure Retell Webhooks

**In Retell AI Dashboard:**
1. Go to Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/retell`
3. Select events: `call.ended`, `call.connected`, `call.failed`

**In Supabase:**
Create Edge Function for webhook handling:

```bash
supabase functions new retell-webhook
```

### 3. Per-Tenant API Keys

Store Retell API keys per tenant in Supabase (encrypted):

```typescript
// Each tenant has their own Retell API key
// Store in tenants.retell_api_key column
// Use tenant's key when making Retell API calls
```

## 📦 Embedding Code Generation

### Generate Embed Code for Clients

Clients can copy-paste this code into WordPress/Webflow/Shopify:

```html
<!-- Retell AI Widget -->
<script>
  (function() {
    const script = document.createElement('script');
    script.src = 'https://your-domain.com/widget.js';
    script.setAttribute('data-tenant-id', 'TENANT_ID');
    script.setAttribute('data-agent-id', 'AGENT_ID');
    document.head.appendChild(script);
  })();
</script>
```

**API Endpoint:** `/api/tenants/[id]/embed-code`
Returns embeddable script tag with tenant-specific configuration.

## 📊 Performance Optimization

### 1. Enable Caching
```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};
```

### 2. Image Optimization
```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/images/hero.jpg"
  alt="Hero image"
  width={800}
  height={600}
  priority
/>
```

## 🔒 Security Considerations

### 1. Environment Variables
- ✅ Never commit `.env.local` files (already in `.gitignore`)
- ✅ Use Vercel environment variables for production
- ✅ Rotate API keys regularly
- ✅ Use Supabase Service Role Key only on server-side
- ✅ Never expose Service Role Key to client

### 2. Supabase Security
- ✅ Enable Row Level Security (RLS) on all tables
- ✅ Use RLS policies for tenant isolation
- ✅ Store Retell API keys encrypted in database
- ✅ Use Supabase Auth for user authentication
- ✅ Validate webhook signatures from Retell AI

### 3. HTTPS & SSL
- ✅ Always use HTTPS in production
- ✅ Vercel provides SSL automatically
- ✅ Enable HSTS headers (Vercel default)
- ✅ Use secure cookies for sessions

### 4. API Security
- ✅ Validate all API requests
- ✅ Use Supabase RLS instead of application-level checks
- ✅ Rate limit API endpoints
- ✅ Sanitize user inputs
- ✅ Use TypeScript for type safety

## 📈 Monitoring & Analytics

### 1. Error Tracking

```bash
# Install Sentry
npm install @sentry/nextjs
```

**Configure Sentry:**

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 2. Performance Monitoring

```bash
# Install Vercel Analytics
npm install @vercel/analytics
```

**Add to `app/layout.tsx`:**

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 3. Supabase Monitoring

- Use Supabase Dashboard for database monitoring
- Set up alerts for high query times
- Monitor RLS policy performance
- Track authentication metrics

### 4. Retell AI Monitoring

- Monitor webhook delivery in Retell dashboard
- Track call success/failure rates
- Set up alerts for failed calls
- Monitor API rate limits

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (requires 18+)
   - Clear `node_modules` and reinstall
   - Verify all dependencies are compatible

2. **Deployment Issues**
   - Check environment variables
   - Verify build output directory
   - Check deployment logs

3. **Performance Issues**
   - Enable caching
   - Optimize images
   - Use CDN for static assets

### Getting Help
- 📧 Email: support@tinadmin.com
- 📚 Documentation: [docs.tinadmin.com](https://docs.tinadmin.com)
- 🐛 Issues: [GitHub Issues](https://github.com/tinadmin/tinadmin/issues)

## 📚 Additional Resources

### Supabase
- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

### Retell AI
- [Retell AI API Documentation](https://docs.retellai.com/api-references/create-phone-call)
- [Retell TypeScript SDK](https://github.com/RetellAI/retell-typescript-sdk)
- [Retell Frontend Demo](https://github.com/RetellAI/retell-frontend-reactjs-demo)

### Architecture
- See `docs/ARCHITECTURE_RECOMMENDATIONS.md` for detailed architecture decisions
- See `docs/MULTITENANT_ARCHITECTURE.md` for multi-tenancy patterns

---

**Happy deploying! 🚀**