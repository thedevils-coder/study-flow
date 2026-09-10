# Study Flow

An Expo Router / TypeScript mobile app for planning, focus, progress and Leo, Study Flow's personal AI study assistant.

**BUILT FOR DREAMERS. MADE FOR ACHIEVERS.**

Launch: 12 September, 7:00 PM IST · https://getstudyflow.in

## Run

```bash
npm install
npx expo start
```

Authentication uses the existing Supabase project. Launch sign-in is email (magic link or password) and Google OAuth. Phone OTP remains in the client behind `PHONE_AUTH_ENABLED` so it can be turned on later without an SMS provider for launch. Enable Email and Google in the Supabase dashboard. Resend SMTP should send from `auth.getstudyflow.in`. Redirect URLs must stay on trusted domains (`studyflow://` and `https://getstudyflow.in`). Do not use wildcard redirects.

## Architecture

- `app/`: Expo Router screens
- `components/`: shared UI
- `services/`: Supabase data, auth, RevenueCat, AI client
- `store/`: session-scoped application state (cleared on account switch)
- `supabase/migrations/`: additive schema, RLS
- `supabase/functions/`: RevenueCat webhook, `ai-generate`, `delete-account`
- `i18n/`: translations
- `website/`: public site for getstudyflow.in
- `docs/launch-markets.md`: store availability checklist

## Supabase

1. Copy `.env.example` to `.env` with the **publishable** key only.
2. `supabase db push` applies migrations. Do not rewrite historical `focus_sessions` or `study_tasks` dates.
3. Assign admin by updating `profiles.role` in the dashboard. The client cannot grant admin.
4. Edge Function secrets (never in the mobile app):
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `REVENUECAT_WEBHOOK_SECRET`
   - `AI_API_KEY` (and optional `AI_API_URL`, `AI_MODEL`)
   - optional `REVENUECAT_SECRET_API_KEY`
5. Deploy:
   - `supabase functions deploy revenuecat-webhook --no-verify-jwt`
   - `supabase functions deploy ai-generate`
   - `supabase functions deploy delete-account`

AI requests are authenticated, usage-limited and stored in `ai_generations`. The mobile client never receives provider API keys.

## RevenueCat

Public SDK keys only:

- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`

Products (store configuration is the source of truth):

- `studyflow_basic_monthly`
- `studyflow_basic_yearly`
- `studyflow_pro_monthly`
- `studyflow_pro_yearly`

Configure a 15-day introductory trial on the store products. Entitlements: `basic` and `pro`. Legacy `premium` is treated as Basic. Display defaults: Basic ₹99/month and ₹1,000/year; Pro ₹299/month and ₹2,500/year (₹1,088 annual save vs 12× monthly). Localized store prices always win.

Real IAP needs a development or production build. Expo Go cannot complete store purchases.

## Website

Static files in `website/` are intended for https://getstudyflow.in. Do not use `auth.getstudyflow.in` as the public site.

## Android production

```bash
eas build --platform android --profile production
```

Submit an AAB, not an APK.

## Checks

```bash
npm run typecheck
npm run lint
npm test
```
