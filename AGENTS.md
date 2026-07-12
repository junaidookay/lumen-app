# Cinema Core - Lumen

A premium streaming experience for movies and TV built with TanStack Start, Supabase, and Tailwind CSS.

## Development

```bash
bun install
bun run dev
```

The dev server runs at http://localhost:8080.

## Environment Variables

Create a `.env` file with:

```
SUPABASE_URL=your_supabase_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
TMDB_ACCESS_TOKEN=your_tmdb_access_token
```

## Tech Stack

- **Framework**: TanStack Start (SSR + file-based routing)
- **UI**: React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend**: Supabase (auth + database)
- **Content**: TMDB API
- **Package Manager**: Bun
