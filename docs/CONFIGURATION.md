# Remaining external configuration

These are account actions, not application-code gaps.

| Item | Where to set it | Notes |
| --- | --- | --- |
| Supabase URL + publishable key | Local `.env.local` or `.env`; production web export reads the same files at build time; EAS env vars for cloud native builds | Public client values only (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). URL is the project origin (`https://<ref>.supabase.co`), not `/rest/v1/`. Never put `SUPABASE_SERVICE_ROLE_KEY` in these files or the app. |
| Google OAuth | Supabase Auth + Google Cloud | Callback is the Supabase URL; app scheme is `studyflow://` |
| AI_API_KEY | Supabase Edge Function secrets | Optional. OpenAI-compatible chat when set. If absent, Leo uses `GEMINI_API_KEY` for normal/fast/detailed chat, notes, quizzes, and PDF content. Never `EXPO_PUBLIC_` |
| AI_API_URL | Edge Function secret (optional) | Defaults to `https://api.openai.com/v1/chat/completions` |
| AI_MODEL | Edge Function secret (optional) | Deeper model. Default `gpt-4o-mini` |
| AI_FAST_MODEL | Edge Function secret (optional) | Fast model for simple questions |
| GEMINI_API_KEY | Edge Function secret | Sufficient for normal Leo chat and Google Search research. Also used for file analysis and Gemini image fallback. Never `EXPO_PUBLIC_` |
| GEMINI_MODEL | Edge Function secret (optional) | Default `gemini-3.6-flash`. Retired/unavailable ids including `gemini-2.0-flash` and `gemini-2.5-flash` are remapped to that default. |
| GEMINI_IMAGE_MODEL | Edge Function secret (optional) | Used only if `IMAGE_API_KEY` is not set |
| IMAGE_API_KEY | Edge Function secret (optional) | Image generation. Falls back to `AI_API_KEY` |
| IMAGE_API_URL | Edge Function secret (optional) | Defaults to OpenAI images API |
| IMAGE_MODEL | Edge Function secret (optional) | Default `dall-e-3` |
| Google Play service account JSON | Edge Function secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Play Developer API. Never `EXPO_PUBLIC_`. Required before paid access can be granted. |
| Google Play package name | Edge Function secret `GOOGLE_PLAY_PACKAGE_NAME` (optional) | Defaults to `com.prabhjotkaur.studyflow` |
| Google Play RTDN secret | Edge Function secret `GOOGLE_PLAY_RTDN_SECRET` (optional but recommended) | Bearer token for the `play-billing-rtdn` Pub/Sub push endpoint |
| Google Play app + subscriptions | Play Console | Required before production IAP works. Product IDs live in `lib/google-play-products.ts`. The app sells Pro only; Basic is free. |
| AdMob Android App ID | EAS production env `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID` | Public. Development/preview ignore this and use Google test App IDs. |
| AdMob iOS App ID | EAS production env `EXPO_PUBLIC_ADMOB_IOS_APP_ID` | Public. Required by the native plugin even if Android is the primary store. |
| AdMob banner unit IDs | EAS production env `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID` and `EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID` | Public ad unit IDs. Never use production units in development. |
| AdMob interstitial unit IDs | EAS production env `EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_UNIT_ID` and `EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_UNIT_ID` | Public ad unit IDs. Interstitials are cooldown-gated and never shown on launch. |
| Resend | Supabase Auth email | Domain `auth.getstudyflow.in` |
| PayPal / Razorpay | Not for Play digital IAP | Modular stubs only |
| EAS Update | Production profile only | Preview/development use the embedded bundle. Publish with `eas update --channel production` when you want OTA. |
| Tester / Demo account | Preview & development builds | Button on Welcome/Sign in. Email `tester@getstudyflow.in`. Override password with `EXPO_PUBLIC_TESTER_PASSWORD`. Apply `202609160001_tester_seed.sql`. Production builds hide this. |

Android package: `com.prabhjotkaur.studyflow`
