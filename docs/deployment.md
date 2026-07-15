# Deployment Guide

## Prerequisites

- Vercel account connected to GitHub
- Supabase project
- TMDB API token
- Stripe account (optional)

## Vercel Setup

1. Import `junaidookay/lumen-app` in Vercel
2. Framework: Nitro (auto-detected)
3. Build command: `bun run build`
4. Output directory: `.vercel/output`

## Environment Variables

Set these in Vercel dashboard:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TMDB_ACCESS_TOKEN=your-tmdb-token
SITE_URL=https://your-domain.vercel.app
STRIPE_SECRET_KEY=sk_live_...  (production only)
STRIPE_WEBHOOK_SECRET=whsec_...  (production only)
```

## Deployment Flow

1. Push to `main` → Vercel auto-deploys
2. PR → Vercel creates preview deployment
3. CI runs lint, typecheck, tests, build

## Custom Domain

1. Add domain in Vercel dashboard
2. Update `SITE_URL` env var
3. DNS: Add CNAME or A record

## Monitoring

- Vercel Analytics for Web Vitals
- Error monitoring via `src/lib/monitoring/`
- Console sinks in dev, Supabase sink in prod

## Rollback

Vercel supports instant rollback to any previous deployment.
