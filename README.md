# Study Flow

An Expo Router / TypeScript mobile implementation of the supplied Study Flow portfolio: Home, Planner, Focus, Study Shield integration point, Progress, Profile, multilingual preferences, subscription architecture, and a protected admin preview.

## Run

```bash
npm install
npx expo start
```

Open the QR code in Expo Go for UI and Supabase email-link testing. Authentication uses Supabase Email OTP; authorization is read from the authenticated user’s Supabase profile. Admin access is never granted from an email prefix.

## Architecture

- `app/`: Expo Router screens and guarded routes
- `components/`: shared visual primitives
- `services/`: auth persistence, pricing, and billing contracts
- `store/`: application state
- `supabase/migrations/`: schema, RLS, and Study Flow data tables
- `i18n/`: supported language registry and UI copy

## Supabase setup

1. Create a Supabase project, then copy its Project URL and **publishable** key into a local `.env` based on `.env.example`.
2. In Authentication, enable Email OTP and set the redirect URL to `studyflow://` (add your production universal/app links too).
3. Install the Supabase CLI, run `supabase link --project-ref <your-ref>`, then `supabase db push` to apply `supabase/migrations/202608080001_study_flow.sql`.
   This also applies the task, goal, focus-session, and settings migration; all records are owner-scoped with RLS.
4. Assign an admin only through the protected database/dashboard, e.g. update the profile role after verifying the user. The client cannot assign its own role.
5. In Edge Function secrets, set `REVENUECAT_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and, only for server-side RevenueCat API work, `REVENUECAT_SECRET_API_KEY`. Do not add any of these to `.env` or the mobile app. Deploy with `supabase functions deploy revenuecat-webhook --no-verify-jwt`.

## RevenueCat setup

1. Create a RevenueCat project and add iOS and Android apps. Put only the corresponding **public app SDK keys** in `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
2. Create one App Store Connect / Google Play monthly subscription at ₹99/month. Configure its **15-day free introductory trial in the store**, then import it into a RevenueCat offering with a package identifier containing `monthly`. Attach it to the `premium` entitlement (or change `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`). Do not create a ₹0 product and do not configure a separate trial package.
3. Configure RevenueCat’s webhook to the deployed `revenuecat-webhook` URL using the same webhook secret. This function is the server-side source for trial, renewal, cancellation, expiration, and payment-failure state.
4. Install dependencies, then create a development build (`npx expo install expo-dev-client && npx expo prebuild && eas build --profile development`). Real iOS/Android IAP cannot run in Expo Go; RevenueCat Preview API mode is the Expo Go-only alternative and never grants real access.

Prices, entitlements, admin authorization, payment verification and webhook updates are server-authoritative. No payment secret belongs in this app. Study Shield also needs a development build for native controls.
