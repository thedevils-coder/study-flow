# Remaining external configuration

These are account actions, not application-code gaps.

| Item | Where to set it | Notes |
| --- | --- | --- |
| Supabase URL + publishable key | EAS secrets / local `.env` | Public client values only. URL is the project origin (`https://<ref>.supabase.co`), not `/rest/v1/`. |
| Google OAuth | Supabase Auth + Google Cloud | Callback is the Supabase URL; app scheme is `studyflow://` |
| Schema alignment | SQL editor or `supabase db push` | Apply `supabase/migrations/202609160002_align_existing_project.sql` on the existing Studyflow project. It is additive (`IF NOT EXISTS`) and creates missing `study_goals`, `subscriptions`, `ai_generations`, achievements, settings columns, profile insert policy, and tester profile backfill. |
| Deploy `ai-generate` | `supabase functions deploy ai-generate` | The live project currently has no Edge Functions. Leo and AI Meter return HTTP 404 until this is deployed. |
| AI_API_KEY | Supabase Edge Function secrets | Never `EXPO_PUBLIC_`. Required by `ai-generate`. Optional: `AI_API_URL`, `AI_MODEL`. |
| RevenueCat public SDK keys | EAS secrets / `.env` | Test Store can stay; production products are separate |
| RevenueCat webhook secret | Edge Function secret | Deploy `revenuecat-webhook --no-verify-jwt` |
| Google Play app + subscriptions | Play Console | Required before production IAP works |
| Resend | Supabase Auth email | Domain `auth.getstudyflow.in` |
| PayPal / Razorpay | Not for Play digital IAP | Modular stubs only |
| EAS Update | Production profile only | Preview/development use the embedded bundle. Publish with `eas update --channel production` when you want OTA. |
| Tester / Demo account | Preview & development builds | Button on Welcome/Sign in. Email `tester@getstudyflow.in`. Override password with `EXPO_PUBLIC_TESTER_PASSWORD`. Apply `202609160001_tester_seed.sql` and `202609160002_align_existing_project.sql`. Production builds hide this. |
| Study Shield DND | EAS `preview` or `development` build | Keep-awake works in Expo Go. Setting Android interruption filter requires the local `study-shield` native module, so a new preview/dev APK is required. App blocking is not available. |

Android package: `com.prabhjotkaur.studyflow`
