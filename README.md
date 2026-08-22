# BabyFlow

BabyFlow tracks sleep, feeding, diaper, and solid-food events. The repository contains the existing Next.js web application and a Capacitor mobile application for Android and iOS.

## Requirements

- Node.js 20 or newer
- A Supabase project with the migrations in `supabase/migrations/` applied
- Xcode for iOS development
- Android Studio and an Android SDK for Android development

## Web application

Create `.env.local` from `.env.example`, then run:

```bash
npm install
npm run dev
```

The web app is available at [http://localhost:3000](http://localhost:3000).

## Mobile application

The React/Vite client lives in `apps/mobile`. It communicates with Supabase using the anonymous key and the signed-in user's session; RLS continues to scope every query and mutation to that user.

Create `apps/mobile/.env.local` from `apps/mobile/.env.example`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AUTH_REDIRECT_URL=com.babyflow.app://auth
```

Mobile authentication mirrors the web application: email/password sign-in, account creation, and password recovery. Add both `com.babyflow.app://auth/callback` and `com.babyflow.app://auth/reset-callback` to the Supabase authentication redirect allowlist. Never place a service-role key or notification-provider credential in a `VITE_` variable.

Run the mobile client in a browser:

```bash
npm run mobile:dev
```

Build, test, and synchronize the native projects:

```bash
npm run mobile:test
npm run mobile:build
npm run mobile:sync
```

Open the generated projects:

```bash
npm run mobile:ios
npm run mobile:android
```

Xcode requires selecting an Apple development team before installing on a physical device. Android Studio may prompt to install the SDK version declared in `apps/mobile/android/variables.gradle`.

Local reminders and haptics run only in installed Android/iOS builds. Browser development supports authentication and event workflows but does not emulate those native behaviors. Remote push notifications require a separate server-side sender and are not part of the initial mobile implementation.

## Checks

```bash
npm run lint
npm run test -- --run
npm run build
npm run mobile:test
npm run mobile:build
```
