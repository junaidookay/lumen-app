# Lumen

A premium streaming experience for movies and TV shows built with modern web technologies.

## Tech Stack

- **Framework**: TanStack Start (SSR + file-based routing)
- **UI**: React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend**: Supabase (auth + database)
- **Content**: TMDB API
- **Payments**: Stripe
- **PWA**: vite-plugin-pwa + Workbox
- **Package Manager**: Bun

## Getting Started

```bash
bun install
cp .env.example .env  # Fill in your env vars
bun run dev
```

The dev server runs at http://localhost:8080.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |
| `bun run test` | Run unit tests |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:e2e` | Run Playwright E2E tests |
| `bun run typecheck` | TypeScript type check |

## Environment Variables

See `.env.example` for required variables. Key ones:

- `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` — Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side admin access
- `TMDB_ACCESS_TOKEN` — TMDB API v3 token
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe (optional for dev)

## Project Structure

```
src/
├── components/     # Reusable UI components
├── hooks/          # React hooks
├── lib/            # Utilities, API clients, monitoring
├── pwa/            # PWA services, hooks, components
├── routes/         # File-based routes (TanStack Router)
└── styles.css      # Global styles + Tailwind
server/
└── plugins/        # Nitro server plugins (security, rate limiting)
```

## Deployment

Deployed to Vercel via `lumen-app` repo. See `docs/deployment.md` for details.

## License

Private — All rights reserved.
