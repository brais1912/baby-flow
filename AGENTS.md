# BabyFlow — Agent Guidelines

## Project Overview
BabyFlow contains a Next.js 16 App Router web app and a React Native + Expo mobile app for tracking baby events. Stack: TypeScript · Tailwind CSS v4 (web) · Drizzle ORM · Supabase (Postgres + Auth) · Recharts · Vercel · Expo.

## Memory

- Before starting work on any task, read the `memory/` folder to load project context (it is gitignored and holds persistent notes from previous sessions).
- After completing a task, check whether any existing file in `memory/` should be updated (e.g. decisions, conventions, gotchas, architecture changes). Update the corresponding file only if it genuinely adds value — do not update it for every task.

## Architecture

```
apps/
  mobile/        # Legacy React/Vite/Capacitor client retained during Expo cutover
  mobile-expo/   # Active React Native + Expo Android and iOS client
src/
  app/           # Next.js App Router — pages, layouts, API routes
  components/    # Web React components
  lib/
    db/          # Drizzle schema and client
    supabase/    # Supabase client helpers (server / browser)
    actions/     # Server Actions (data mutations)
    utils/       # Pure utility functions
  types/         # Shared TypeScript types
supabase/
  migrations/    # Drizzle-generated migrations plus RLS policies
```

## Development Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (watch mode)
npm run mobile:install # Install the isolated Expo dependency graph
npm run mobile:dev   # Start the Expo development server
npm run mobile:test  # Run mobile Vitest tests once
npm run mobile:typecheck # Type-check the Expo client
npm run mobile:lint  # Lint the Expo client
npm run mobile:build # Export the Expo bundles
npm run mobile:doctor # Validate Expo dependencies and configuration
npm run mobile:prebuild # Generate native projects when needed
npm run mobile:ios   # Start the iOS development target
npm run mobile:android # Start the Android development target
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations
npm run db:studio    # Open Drizzle Studio
```

## Code Style

- **TypeScript strict mode** — no `any`, no type assertions unless unavoidable
- **Named exports** for application components, functions, and types; default exports only where a framework requires them, such as Next.js pages/layouts and configuration files
- **No comments** unless the WHY is non-obvious (a hidden constraint, a tricky invariant)
- **Web mutations** use Server Actions — no dedicated API routes unless required by a third party
- **Web components** are Server Components by default — add `"use client"` only when interactivity requires it
- Web styling uses Tailwind utilities; the mobile client uses React Native `StyleSheet` styles and native components

## Data Layer

- Drizzle schema lives in `src/lib/db/schema.ts`
- Web data access uses the typed Drizzle query builder — no raw SQL except in migrations
- Mobile data access uses the typed Supabase client under the authenticated user's RLS policies
- Supabase Row Level Security (RLS) must be enabled on every client-accessible table; policies live in `supabase/migrations/`
- Never expose `SERVICE_ROLE_KEY` to the client — only `ANON_KEY`

## Authentication

- Web authentication uses email/password Supabase Auth via `@supabase/ssr` with cookie-based sessions
- Mobile authentication mirrors the email/password sign-in, sign-up, and recovery flows using `@supabase/supabase-js`
- Middleware (`src/middleware.ts`) refreshes web sessions on every request
- Protected web routes redirect to `/${locale}/login` when no session exists
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
- Run `npm run mobile:test`, `npm run mobile:typecheck`, `npm run mobile:lint`, and `npm run mobile:build` when mobile code is affected

## Environment Variables

Required in `.env.local` (never committed):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=          # Supabase pooler connection string
```

Required in `apps/mobile-expo/.env.local` for mobile development:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_AUTH_REDIRECT_URL=com.babyflow.app://auth
```

Keep the root `.env.example` and `apps/mobile-expo/.env.example` synchronized with their respective variables.

## Commits & PRs

- Small, focused commits — one logical change per commit
- Commit messages: imperative mood, ≤72 chars subject line
- Always run `npm run lint && npm run test -- --run` before committing; include the mobile checks when mobile code is affected

## Security

- Validate and sanitize all user input in Server Actions before DB writes
- Validate mobile mutation input before direct Supabase writes; RLS and database constraints remain mandatory
- Never log sensitive data (tokens, passwords, PII)
- Keep dependencies up to date; review `npm audit` output regularly
- Supabase RLS is the last line of defence — it must always be on for client-accessible tables

## Performance

- Prefer `async` Server Components for web data fetching — avoids client waterfalls
- Use `next/image` for web content images
- Avoid large web client bundles: keep Recharts and heavy libraries client-only with `dynamic(() => import(...), { ssr: false })`
