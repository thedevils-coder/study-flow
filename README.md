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
- `supabase/functions/` — `ai-generate`, `delete-account`, `revenuecat-webhook`, `admin-stats`
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
   - Edge Function secrets: `SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`, optional `AI_API_URL` / `AI_MODEL`, `REVENUECAT_WEBHOOK_SECRET`
   - Deploy: `ai-generate`, `delete-account`, `admin-stats`, `revenuecat-webhook` (`--no-verify-jwt` for the webhook)

2. **RevenueCat + Google Play**
   - Public SDK keys only in Expo public env vars
   - Products: `studyflow_basic_monthly`, `studyflow_basic_yearly`, `studyflow_pro_monthly`, `studyflow_pro_yearly`
   - Entitlements: `basic`, `pro`
   - Keep any existing Test Store products intact
   - Production Android products require a Play Console app for `com.prabhjotkaur.studyflow`. Missing Play Console setup is not an app-code bug.

3. **Google Play**
   - Package: `com.prabhjotkaur.studyflow`
   - Digital subscriptions must use Google Play Billing. PayPal and Razorpay are modular and disabled for in-app digital subscriptions.

4. **Resend**
   - Auth email from `auth.getstudyflow.in`
   - API keys stay in Supabase/Resend, never in the app

Until those values exist, the app shows configuration states instead of fake success.

## EAS profiles

`development`, `preview`, and `production` (auto-increment) are in `eas.json`.

Preview and development builds do **not** download a remote EAS Update on launch. They run the JavaScript embedded in the APK. Production builds keep EAS Update enabled (`https://u.expo.dev/<projectId>`, `appVersion` runtime, `production` channel) for a later production release.

After changing native/update config, install a new Android preview build:

```bash
npx eas-cli build --platform android --profile preview
```
