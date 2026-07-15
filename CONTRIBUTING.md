# Contributing to Lumen

## Development Setup

```bash
bun install
bun run dev
```

## Code Style

- **TypeScript** strict mode enabled
- **ESLint** + **Prettier** for formatting
- Follow existing patterns — check neighboring files before adding new ones
- Use the `@/` path alias for imports from `src/`

## Testing

```bash
bun run test          # Unit tests (Vitest)
bun run test:watch    # Watch mode
bun run test:e2e      # E2E tests (Playwright)
```

- Write tests for new features
- Unit tests go in `__tests__/` directories next to the code
- E2E tests go in `e2e/`

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Run `bun run lint` and `bun run typecheck`
4. Run `bun run test` to verify tests pass
5. Open a PR with a clear description

## Architecture

- **Server vs Client**: Files ending in `.server.ts` are server-only. Never import them in client code.
- **Routes**: File-based routing via TanStack Router. See `src/routes/README.md`.
- **PWA**: All PWA code lives under `src/pwa/`. Services are framework-agnostic.
- **Components**: Use shadcn/ui primitives. Check `components.json` for the component library.

## Commit Messages

Use clear, descriptive commit messages:
- `feat: add user profile page`
- `fix: resolve HLS playback on Safari`
- `chore: update dependencies`
