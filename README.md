# Velora

Velora is a luxury watch storefront built with Astro, TypeScript, semantic HTML, modular CSS and small browser scripts. It combines a content-first public website with customer accounts, a role-protected content and inventory administration area, and Stripe-hosted payments.

## Architecture

- Astro renders the public storefront, accounts and administration pages on the server. There is no client-side application framework.
- Supabase provides passwordless authentication, PostgreSQL, Row Level Security and media storage.
- Stripe Checkout collects payment details on Stripe-hosted pages. Velora stores only Stripe object identifiers, price snapshots and receipt links.
- Cloudflare Workers runs the website and server endpoints. A scheduled Worker releases expired reservations that never received a Checkout Session.
- Bundled published content keeps the public catalogue readable during a short data outage. Authentication, checkout, stock and administration fail closed.

The key folders are:

```text
src/components/       shared storefront components
src/data/             published fallback catalogue
src/layouts/          public, account and administration layouts
src/lib/server/       authentication, CMS, commerce and data boundaries
src/pages/api/        same-origin mutations and Stripe webhook
src/pages/admin/      protected content and commerce administration
supabase/migrations/  versioned schema, RLS and transaction functions
supabase/tests/       database integration and concurrency tests
tests/                fast TypeScript unit tests
```

## Requirements

- Node.js 22.12 or newer
- pnpm
- Docker for the local Supabase stack
- Stripe CLI for forwarding test webhooks
- A Cloudflare account and Wrangler login for deployment

## Environment

Copy `.env.example` to `.env` for Astro development. Copy `.dev.vars.example` to `.dev.vars` for local Wrangler execution. Never commit either populated file.

| Variable | Purpose | Browser-visible |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Restricted Supabase publishable key | Yes |
| `SUPABASE_SECRET_KEY` | Server-only administrative database key | No |
| `STRIPE_SECRET_KEY` | Stripe test secret key | No |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the Velora webhook endpoint | No |
| `PUBLIC_SITE_URL` | Canonical website origin | Yes |

The Supabase secret key and both Stripe secrets must remain server-only. Payment-card data must never be added to the database, logs or application forms.

## Local development

Install dependencies and start the local services:

```bash
pnpm install
pnpm db:start
pnpm db:reset
pnpm dev
```

The database reset applies all migrations, loads the three Velora watches and their six variants, and seeds initial inventory and published content. Local authentication email is available through the Mailpit URL printed by `supabase start`.

Forward Stripe test webhooks in a second terminal:

```bash
stripe listen --forward-to http://127.0.0.1:4321/api/stripe/webhook
```

Place the displayed webhook signing secret in `.env`, then restart the Astro server. Use Stripe's standard test card `4242 4242 4242 4242`, any future expiry and any three-digit security code. Test mode must remain enabled.

## Customer and staff access

Customers sign in with a six-digit email code. Checkout requires an authenticated session and preserves the browser cart through sign-in. Account pages provide profile and delivery-address management, order history, payment and fulfilment status, tracking and receipt links.

To create the first owner, sign in once with the intended address and run:

```bash
pnpm admin:grant-owner owner@example.com
```

The command works only when no active owner exists. Further staff access is managed by an owner in `/admin/staff`.

| Role | Access |
| --- | --- |
| Owner | Full content, pricing, inventory, orders, configuration, staff and audit access |
| Editor | Products, collections, media, homepage, journal and policies |
| Fulfilment | Orders, tracking, reservations and stock adjustments |

Roles are stored in protected database records and revalidated on every administrator request. They are not taken from editable customer metadata.

## Commerce flow

1. The server accepts variant identifiers and quantities and reloads publication, price and stock data.
2. A PostgreSQL transaction locks stock in SKU order, verifies availability and creates a 30-minute reservation.
3. Stripe products, prices and the hosted Checkout Session are created only after database locks are released.
4. A failed Stripe request triggers a compensating reservation release.
5. Signed webhooks atomically finalise paid orders or release expired and failed sessions.
6. Unique event and Checkout Session constraints make retries idempotent.
7. The success page runs the same finalisation path to recover when webhook delivery is delayed.

All stock changes are recorded in the append-only movement ledger. Browser-provided prices are discarded.

## Quality checks

Run the complete local verification suite:

```bash
pnpm verify
pnpm db:test
pnpm audit
pnpm exec wrangler deploy --dry-run
```

`pnpm verify` runs ESLint, unit tests, Astro diagnostics and the production build. Database tests cover least-privilege grants, final-unit contention, reservation release, price snapshots, webhook idempotency and orphan cleanup. `pnpm db:test` requires the local Supabase stack.

Before a release, also complete a Stripe test purchase and check the storefront at 360, 768, 1024 and 1536 pixels with keyboard navigation and reduced-motion enabled.

## Deployment

1. Create a Supabase development project, link it with `supabase link --project-ref …`, then run `supabase db push`.
2. Load the reviewed initial content from `supabase/seed.sql` into the development project. Do not reset a hosted database containing customer data.
3. Add the Cloudflare deployment origin to the Supabase Auth site URL and allowed redirect URLs.
4. Configure the five service values with `wrangler secret put <NAME>`. Public values may also be configured as Worker variables, but secrets must never be placed in `wrangler.jsonc`.
5. Register `/api/stripe/webhook` in the Stripe test dashboard and subscribe to:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
6. Run `pnpm deploy`. Wrangler packages the Astro Worker, static assets and the ten-minute reservation cleanup schedule.

Use a dedicated SMTP provider, reviewed legal text, production monitoring and a complete security review before enabling real payments. The current configuration is intentionally limited to portfolio and test-mode commerce.
