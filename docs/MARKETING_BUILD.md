# Marketing site implementation

The marketing site uses the existing Next.js 15 App Router project and Vercel configuration. There is no separate site framework or hosting service.

## Preview and deploy

- `npm run build` creates the production build.
- `npm run start -- --port 3010` previews it locally.
- Never run `npm run build` while `next dev` is running against this directory. They share `.next`, and the build replaces the chunks the dev server has already served, which surfaces in the browser as `Cannot read properties of undefined (reading 'call')`. Stop one before starting the other.
- Preserve the application's existing Supabase, Stripe and voice-provider environment configuration.

## Two Vercel projects, one repository

The marketing site and the application ship from this same repository through two Vercel
projects, matching how the other products in this account are deployed. Each project sets
`NEXT_PUBLIC_SITE_ROLE`, and `src/middleware.ts` sends any path belonging to the other half
to the domain that owns it, so neither domain exposes the other's pages.

| | Application project | Marketing project |
|---|---|---|
| Vercel project | `chatir` (existing) | `chatir-website` (new) |
| `NEXT_PUBLIC_SITE_ROLE` | `app` (or omit) | `marketing` |
| `NEXT_PUBLIC_APP_URL` | app origin | app origin |
| `NEXT_PUBLIC_SITE_URL` | marketing origin | marketing origin |
| Serves | `/dashboard`, `/auth`, `/api`, admin pages | `/`, `/platform`, `/pricing`, `/resources`, legal |
| `/` | redirects to `/dashboard` | marketing home page |
| `robots.txt` | `Disallow: /` | indexable, advertises `sitemap.xml` |

Both origins are set on both projects because each side needs to redirect to the other.
`NEXT_PUBLIC_APP_URL` keeps its original meaning of the application origin — it also builds
the chat widget embed snippet — so the marketing origin has its own
`NEXT_PUBLIC_SITE_URL` rather than overloading it.

Setting no role at all yields `both`, which serves every route on one origin with no
redirects. That is the local development default, and it also keeps a single-project
deployment working.

The marketing project builds the whole repository, including the application, so it needs
the application's server environment variables to build. It never serves those routes.

## Content and configuration

- The homepage follows the approved architectural hero, ivory demo, forest cards, sage steps and ivory closing design.
- Marketing routes live in the `(marketing)` route group and never mount the application context providers. `ThemeProvider`, `OrganizationProvider` and `SidebarProvider` are scoped to `(admin)`; auth screens get `ThemeProvider` alone so the saved light/dark preference still applies.
- Set `NEXT_PUBLIC_SITE_URL` to the public marketing origin (for example `https://chatir.com`). It drives canonical URLs, Open Graph tags, `sitemap.xml` and `robots.txt`. A deployed build fails if neither it nor `NEXT_PUBLIC_APP_URL` is set and Vercel supplies no production URL, rather than silently publishing `localhost` links to crawlers.
- Pricing: user-approved $99/month with a 14-day free trial. The existing signup flow requires a card. Provider charges are separate.
- Set `NEXT_PUBLIC_DEMO_BOOKING_URL` to the public HTTPS GHL calendar URL in Vercel and rebuild. The demo page opens that booking page. `NEXT_PUBLIC_SALES_EMAIL` is an optional fallback.
- Without either contact setting, the demo page honestly reports that scheduling is not yet available; it does not collect or discard requests.
- Privacy and Terms carry full product-based copy in `src/components/marketing/legal.tsx` and are indexed. Have counsel review the text before public launch.
- Resource guides are original starter copy for review, not customer case studies.
- Chat demo is illustrative and local. Voice preview uses browser speech synthesis and has a readable transcript. Neither sends investor questions to a live agent.

## Main source files

- `src/app/(marketing)/layout.tsx`: renders the shared chrome once for every marketing route.
- `src/components/marketing/Site.tsx`: shell, footer, button, page heading and closing block.
- `src/components/marketing/Home.tsx`: homepage sections.
- `src/components/marketing/pages.tsx`: per-page copy registry, metadata and canonical URLs.
- `src/components/marketing/Home.tsx`, `Platform.tsx`, `Teams.tsx`, `Pricing.tsx`, `Resources.tsx`, `About.tsx`, `legal.tsx`: one module per page body. Each route file under `src/app/(marketing)/` renders its own.
- `src/components/marketing/interactive.tsx`: header, mobile menu, agent demo and demo booking form.
- `src/components/marketing/marketing.css`: scoped visual system. Colours, radii and the minimum type size are tokens declared on `.marketing`; use them instead of new literals.
- `src/components/marketing/content.ts`: resource article content, site origin and demo contact resolution.
- `src/lib/site-role.ts`: which half of the repository a deployment serves, the two public origins, and the path lists that divide them.
- `src/middleware.ts`: applies that split before any auth work, then the existing Supabase session handling.

## Generated image

`public/images/marketing/architecture.jpg` was generated using the built-in imagegen tool and compressed to JPEG for the website.

Generation prompt: “Generate a photorealistic premium architectural website hero background, landscape 1792x1024. Quiet contemporary corporate atrium at dusk: broad dark charcoal stone wall in center with empty negative space for heading, floor-to-ceiling glass at left with softly blurred evening city lights, warm indirect architectural lighting at right, subtle stone floor reflections, one understated plant at far edge. Sophisticated finance brand editorial photography, real materials, minimal composition, no people, no text, no logos, no mountains. Dark enough for white overlay headline but not black. Camera straight on, wide interior shot.”

## Verification

- Production `npm run build` completed successfully, including TypeScript checking and static page generation.
- ESLint passed for all changed TypeScript/TSX files.
- Read-only HTTP smoke checks passed for the 12 marketing and article routes, signup, and an expected 404 for an unknown page.
- Desktop and 390px mobile layouts inspected in the browser; mobile page width matched viewport width.
- Mobile menu, suggested chat questions and voice preview controls checked interactively.
- No production deployment was performed.
