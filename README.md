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

The mobile UI supports English and Spanish as a per-device preference. Authenticated users must complete a baby profile with a name and calendar date of birth before entering the mobile dashboard. Apply `supabase/migrations/0010_add_baby_profile.sql` before using this flow; the nullable profile columns do not make the profile mandatory on existing web routes.

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

Local reminders and haptics run only in installed Android/iOS builds. Browser development supports authentication and event workflows but does not emulate those native behaviors. The daily reminder remains independent from the optional sleep-window reminder, which schedules local guidance from the latest wake-up event and the baby's calculated age. Wake-window ranges are estimates rather than medical instructions; delivery can also be delayed by the operating system, especially when Android exact alarms are unavailable.

Sleep reminders are reconciled when this app starts, returns to the foreground, refreshes, or changes sleep/profile/language state. If a wake-up is recorded only on the web or another device, this phone cannot schedule its local notification until BabyFlow is opened or refreshed here. Remote push notifications and background polling require a server-side sender and are not part of this implementation.

## Checks

```bash
npm run lint
npm run test -- --run
npm run build
npm run mobile:test
npm run mobile:build
```
