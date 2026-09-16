# Remaining external configuration

These are account actions, not application-code gaps.

| Item | Where to set it | Notes |
| --- | --- | --- |
| Supabase URL + publishable key | EAS secrets / local `.env` | Public client values only. URL is the project origin (`https://<ref>.supabase.co`), not `/rest/v1/`. |
| Google OAuth | Supabase Auth + Google Cloud | Callback is the Supabase URL; app scheme is `studyflow://` |
| AI_API_KEY | Supabase Edge Function secrets | Never `EXPO_PUBLIC_` |
| RevenueCat public SDK keys | EAS secrets / `.env` | Test Store can stay; production products are separate |
| RevenueCat webhook secret | Edge Function secret | Deploy `revenuecat-webhook --no-verify-jwt` |
| Google Play app + subscriptions | Play Console | Required before production IAP works |
| Resend | Supabase Auth email | Domain `auth.getstudyflow.in` |
| PayPal / Razorpay | Not for Play digital IAP | Modular stubs only |
| EAS Update | Production profile only | Preview/development use the embedded bundle. Publish with `eas update --channel production` when you want OTA. |
| Tester / Demo account | Preview & development builds | Button on Welcome/Sign in. Email `tester@getstudyflow.in`. Override password with `EXPO_PUBLIC_TESTER_PASSWORD`. Apply `202609160001_tester_seed.sql`. Production builds hide this. |

Android package: `com.prabhjotkaur.studyflow`
