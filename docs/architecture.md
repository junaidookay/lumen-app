# Architecture

## Overview

Lumen is a streaming platform for movies and TV shows. It uses SSR for fast initial loads, a service worker for offline support, and Supabase for auth/data.

## Data Flow

```
Browser ←→ TanStack Start (SSR) ←→ Supabase
                                      ↕
                                   TMDB API
                                      ↕
                                   Stripe
```

## Key Decisions

### TanStack Start over Next.js
- File-based routing with type-safe params
- Built-in SSR with Nitro
- Better React 19 support

### Supabase over Firebase
- SQL-based (PostgreSQL)
- Row-level security
- Self-hostable

### Workbox over custom SW
- Proven caching strategies
- Background sync support
- Cache versioning built-in

### Zod for validation
- Runtime + compile-time type safety
- Used for env vars, API responses, form data

## Server/Client Boundary

- `*.server.ts` files are server-only (enforced by ESLint + TanStack Start)
- `src/pwa/` services detect `typeof window` for SSR safety
- Supabase admin client uses service role key (server only)

## Error Handling

- Root `ErrorComponent` in `__root.tsx` catches route errors
- Per-feature `ErrorBoundary` components isolate failures
- `captureError()` sends to monitoring sinks
- Server errors captured via `error-capture.ts` (h3 recovery)

## Caching

- Static assets: CacheFirst (1 year)
- TMDB images: StaleWhileRevalidate (7 days)
- Supabase API: NetworkFirst (24 hours)
- Auth caches: User-scoped, cleared on logout
