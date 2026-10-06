# Study Flow

**BUILT FOR DREAMERS. MADE FOR ACHIEVERS.**

Study Flow is an Android-first student productivity app: tasks, planner, Focus, Progress, goals, achievements, Leo, AI Meter, and subscriptions.

Official website: [https://getstudyflow.in](https://getstudyflow.in)

This tree is a clean rebuild. The previous implementation remains on `main` and `origin/cursor/study-flow-production-cf55` as UI/product reference only. See `reference/README.md`.

## Run

```bash
npm install
npx expo start
```

Web (local, loads `.env.local` or `.env`):

```bash
npx expo start --web
```

Production web build (inlines `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `.env.local` / `.env` / `.env.production` / the export-time environment):

```bash
npm run web:export
```

The static files are written to `dist/`. Serve them with any static host, or `npx expo serve dist`.

Primary Android build:

```bash
npx eas-cli build --platform android --profile preview
```

Development does not require Android Studio or a local Android SDK. Use Expo + EAS cloud builds.

## Architecture

- `app/` — Expo Router screens (tabs: Home, Plan, Focus, Progress, Profile)
- `components/` — shared UI
- `providers/` — auth, study data, theme
- `services/` — auth, tasks, focus, goals, AI, subscriptions, notifications
- `lib/` — entitlements, streak, progress, validation
- `supabase/migrations/` — PostgreSQL + RLS
- `supabase/functions/` — `ai-generate`, `delete-account`, `play-billing-sync`, `play-billing-rtdn`, `admin-stats`
- `website/` — public site for getstudyflow.in
- English only. There is no language switcher.

## What you still need to configure

Do not paste secrets into the app, git, or chat. Configure them in the provider dashboards.

1. **Supabase**
   - Project URL + publishable key → `EXPO_PUBLIC_SUPABASE_*`
   - Apply migrations with `supabase db push`
   - Enable Email and Google providers
   - Google redirect: the Supabase callback URL, not an arbitrary extra URL
   - App return scheme: `studyflow://`
   - Edge Function secrets: `SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`, optional `AI_API_URL` / `AI_MODEL`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (Play Developer API service account JSON). Optional: `GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_PLAY_RTDN_SECRET`
   - Deploy: `ai-generate`, `delete-account`, `admin-stats`, `play-billing-sync` (JWT), `play-billing-rtdn` (`--no-verify-jwt`)

2. **Google Play Billing**
   - No public SDK keys in the app. Play Billing is native (`expo-iap`).
   - Product IDs (must match Play Console exactly; change only `lib/google-play-products.ts` if Console differs): `studyflow_basic_monthly`, `studyflow_basic_yearly`, `studyflow_pro_monthly`, `studyflow_pro_yearly`
   - Entitlements stored after server verification: `basic`, `pro`
   - Production Android products require a Play Console app for `com.prabhjotkaur.studyflow`. Missing Play Console setup is not an app-code bug.

3. **Google Play**
   - Package: `com.prabhjotkaur.studyflow`
   - Digital subscriptions must use Google Play Billing. PayPal and Razorpay are modular and disabled for in-app digital subscriptions.

4. **Resend**
   - Auth email from `auth.getstudyflow.in`
   - API keys stay in Supabase/Resend, never in the app

Until those values exist, the app shows configuration states instead of fake success.

## Tester / Demo account (preview and development only)

On local `npx expo start` and EAS `preview` / `development` builds, Welcome and Sign in show **Tester / Demo Account**. Production builds hide that button and do not embed the demo password.

1. Apply migrations, including `supabase/migrations/202609160001_tester_seed.sql`.
2. In Supabase Auth, allow the tester user to sign in: turn **Confirm email** off for preview, or confirm `tester@getstudyflow.in` once.
3. Tap **Tester / Demo Account**. The app signs in through real Supabase Auth as `tester@getstudyflow.in` (password `StudyFlow-Tester-Preview` unless you override `EXPO_PUBLIC_TESTER_PASSWORD`) and seeds sample tasks, planner items, goals, focus sessions, achievements, and AI Meter history.
4. Reset the sample data from **Profile → Settings → Reset tester sample data**.

Live AI replies and Google Play purchases still use the real services. If those are not configured, the screens show a labeled test state instead of crashing.

## EAS profiles

`development`, `preview`, and `production` (auto-increment) are in `eas.json`.

Preview and development builds do **not** download a remote EAS Update on launch. They run the JavaScript embedded in the APK. Production builds keep EAS Update enabled (`https://u.expo.dev/<projectId>`, `appVersion` runtime, `production` channel) for a later production release.

After changing native/update config, install a new Android preview build:

```bash
npx eas-cli build --platform android --profile preview
```
