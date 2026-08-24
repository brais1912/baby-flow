# BabyFlow Expo app

This is the React Native + Expo replacement for the Capacitor client in `apps/mobile`.
The legacy client remains temporarily as a parity reference and rollback path.

## Setup

Copy `.env.example` to `.env.local` and set the public Supabase URL and anonymous key.
Install this isolated mobile dependency graph with `npm run mobile:install` from the repository root.
The Supabase project must allow these redirect URLs:

- `com.babyflow.app://auth/callback`
- `com.babyflow.app://auth/reset-callback`

## Commands

```bash
npm run mobile:dev
npm run mobile:ios
npm run mobile:android
npm run mobile:test
npm run mobile:typecheck
npm run mobile:build
```

Local notifications require a native development build for complete Android verification.
Use `npx eas-cli build --profile development --platform ios|android` when an EAS project is configured.
