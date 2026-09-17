# Remaining external configuration

These are account actions, not application-code gaps.

| Item | Where to set it | Notes |
| --- | --- | --- |
| Supabase URL + publishable key | EAS secrets / local `.env` | Public client values only. URL is the project origin (`https://<ref>.supabase.co`), not `/rest/v1/`. |
| Google OAuth | Supabase Auth + Google Cloud | Callback is the Supabase URL; app scheme is `studyflow://` |
| AI_API_KEY | Supabase Edge Function secrets | Optional. OpenAI-compatible chat when set. If absent, Leo uses `GEMINI_API_KEY` for normal/fast/detailed chat, notes, quizzes, and PDF content. Never `EXPO_PUBLIC_` |
| AI_API_URL | Edge Function secret (optional) | Defaults to `https://api.openai.com/v1/chat/completions` |
| AI_MODEL | Edge Function secret (optional) | Deeper model. Default `gpt-4o-mini` |
| AI_FAST_MODEL | Edge Function secret (optional) | Fast model for simple questions |
| GEMINI_API_KEY | Edge Function secret | Sufficient for normal Leo chat and Google Search research. Also used for file analysis and Gemini image fallback. Never `EXPO_PUBLIC_` |
| GEMINI_MODEL | Edge Function secret (optional) | Default `gemini-2.5-flash`. Do not use shut-down `gemini-2.0-flash`. |
| GEMINI_IMAGE_MODEL | Edge Function secret (optional) | Used only if `IMAGE_API_KEY` is not set |
| IMAGE_API_KEY | Edge Function secret (optional) | Image generation. Falls back to `AI_API_KEY` |
| IMAGE_API_URL | Edge Function secret (optional) | Defaults to OpenAI images API |
| IMAGE_MODEL | Edge Function secret (optional) | Default `dall-e-3` |
| RevenueCat public SDK keys | EAS secrets / `.env` | Test Store can stay; production products are separate |
| RevenueCat webhook secret | Edge Function secret | Deploy `revenuecat-webhook --no-verify-jwt` |
| Google Play app + subscriptions | Play Console | Required before production IAP works |
| Resend | Supabase Auth email | Domain `auth.getstudyflow.in` |
| PayPal / Razorpay | Not for Play digital IAP | Modular stubs only |
| EAS Update | Production profile only | Preview/development use the embedded bundle. Publish with `eas update --channel production` when you want OTA. |
| Tester / Demo account | Preview & development builds | Button on Welcome/Sign in. Email `tester@getstudyflow.in`. Override password with `EXPO_PUBLIC_TESTER_PASSWORD`. Apply `202609160001_tester_seed.sql`. Production builds hide this. |

Android package: `com.prabhjotkaur.studyflow`
