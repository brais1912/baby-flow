# BabyFlow — Claude Code Guidelines

## Project Overview
BabyFlow is a Next.js 15 (App Router) web app for tracking baby events (sleep, feeding, diaper changes). Stack: TypeScript · Tailwind CSS v4 · Drizzle ORM · Supabase (Postgres + Auth) · Recharts · Vercel.

## Architecture

```
src/
  app/           # Next.js App Router — pages, layouts, API routes
  components/    # Shared UI components (no business logic)
  lib/
    db/          # Drizzle schema, client, migrations
    supabase/    # Supabase client helpers (server / browser)
    actions/     # Server Actions (data mutations)
    utils/       # Pure utility functions
  types/         # Shared TypeScript types
```

## Development Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (watch mode)
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations
npm run db:studio    # Open Drizzle Studio
```

## Code Style

- **TypeScript strict mode** — no `any`, no type assertions unless unavoidable
- **Named exports** for components, functions, types; default exports only for Next.js pages/layouts
- **No comments** unless the WHY is non-obvious (a hidden constraint, a tricky invariant)
- **Server Actions** for all data mutations — no dedicated API routes unless required by a third party
- **Server Components by default** — add `"use client"` only when interactivity requires it
- Tailwind utility classes only — no inline `style` props, no CSS modules unless Tailwind cannot express it

## Data Layer

- Drizzle schema lives in `src/lib/db/schema.ts`
- Always use the typed Drizzle query builder — no raw SQL except in migrations
- Supabase Row Level Security (RLS) must be enabled on every table; policies live in `supabase/migrations/`
- Never expose `SERVICE_ROLE_KEY` to the client — only `ANON_KEY`

## Authentication

- Supabase Auth via `@supabase/ssr` — cookie-based sessions
- Middleware (`src/middleware.ts`) refreshes sessions on every request
- Protected routes redirect to `/login` when no session exists
- All Server Actions must validate the session before touching the DB

## Testing

- **Framework**: Vitest + React Testing Library
- **Location**: co-located alongside source files as `*.test.ts` / `*.test.tsx`
- **Rule**: every non-trivial piece of logic gets a test at the time it is written — not later. If you add a bug fix, add a regression test that would have caught it.
- **What to test**:
  - All utility functions in `src/lib/utils/` — unit tests, full branch coverage
  - Data transformation logic inside chart components (aggregation, grouping, null handling) — extract to a pure function and test it
  - Server Actions — mock the Drizzle client and Supabase auth; assert correct DB calls and revalidation
  - UI components with conditional rendering or user interactions (form validation, mode toggles, QuickLog flow)
- **What NOT to test**: pure presentational components with no logic, Next.js routing
- Use `@testing-library/user-event` for user interactions, not `fireEvent`
- No snapshot tests — they are brittle and provide low signal
- **Null/undefined inputs**: always test the boundary — if a field can be null (e.g. QuickLog events with no diaperType), test that the code handles it correctly
- Run `npm run test -- --run` (single pass, no watch) before every commit to confirm nothing is broken

## Environment Variables

Required in `.env.local` (never committed):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=          # Supabase pooler connection string
```

`.env.example` must stay up to date with every new variable added.

## Commits & PRs

- Small, focused commits — one logical change per commit
- Commit messages: imperative mood, ≤72 chars subject line
- Always run `npm run lint && npm run test` before committing

## Security

- Validate and sanitize all user input in Server Actions before DB writes
- Never log sensitive data (tokens, passwords, PII)
- Keep dependencies up to date; review `npm audit` output regularly
- Supabase RLS is the last line of defence — it must always be on

## Performance

- Prefer `async` Server Components for data fetching — avoids client waterfalls
- Use `next/image` for all images
- Avoid large client bundles: keep Recharts and heavy libs client-only with `dynamic(() => import(...), { ssr: false })`
