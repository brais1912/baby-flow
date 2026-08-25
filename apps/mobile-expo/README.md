# BabyFlow Expo app

This is BabyFlow's React Native + Expo application for iOS and Android.

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
npm run mobile:lint
npm run mobile:build
npm run mobile:doctor
npm run mobile:prebuild
```

Local notifications require a native development build for complete Android verification.
Use `npx eas-cli build --profile development --platform ios|android` when an EAS project is configured.
