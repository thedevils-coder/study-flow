# Launch markets — store availability audit

Display prices in the app are defaults. Apple App Store and Google Play, through RevenueCat, are the source of truth for whether a product can be purchased and which local payment methods appear.

City names in the product brief are launch-time regional references, not separate SKUs.

| COUNTRY | APP STORE AVAILABLE | GOOGLE PLAY AVAILABLE | BASIC MONTHLY | BASIC YEARLY | PRO MONTHLY | PRO YEARLY | LOCAL CURRENCY | PAYMENT METHODS | REVENUECAT CONFIGURATION | LEGAL/STORE REQUIREMENTS | STATUS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| India | Yes (IN storefront) | Yes | Pending store product | Pending store product | Pending store product | Pending store product | INR | Store-supported (UPI/cards via Play/Apple; no in-app UPI collection) | Create 4 products + 15-day intro offer | Privacy, account deletion, subscription disclosure | Not ready — products must exist in Play Console / App Store Connect / RevenueCat |
| United States | Yes | Yes | Pending | Pending | Pending | Pending | USD | Store-supported | Same four product IDs | State privacy / Kids category N/A | Not ready |
| United Kingdom | Yes | Yes | Pending | Pending | Pending | Pending | GBP | Store-supported | Same | UK GDPR / consumer law | Not ready |
| Canada | Yes | Yes | Pending | Pending | Pending | Pending | CAD | Store-supported | Same | PIPEDA | Not ready |
| Australia | Yes | Pending confirmation in Play Console country list | Pending | Pending | Pending | Pending | AUD | Store-supported | Same | ACL | Not ready |
| New Zealand | Yes | Yes | Pending | Pending | Pending | Pending | NZD | Store-supported | Same | | Not ready |
| Singapore | Yes | Yes | Pending | Pending | Pending | Pending | SGD | Store-supported | Same | | Not ready |
| Philippines | Yes | Yes | Pending | Pending | Pending | Pending | PHP | Store-supported | Same | | Not ready |
| South Africa | Yes | Yes | Pending | Pending | Pending | Pending | ZAR | Store-supported | Same | | Not ready |
| Taiwan | Yes | Yes | Pending | Pending | Pending | Pending | TWD | Store-supported | Same | | Not ready |
| Japan | Yes | Yes | Pending | Pending | Pending | Pending | JPY | Store-supported | Same | Specified Commercial Transactions if required | Not ready |
| South Korea | Yes | Yes | Pending | Pending | Pending | Pending | KRW | Store-supported | Same | Local content rating | Not ready |
| San Marino | Uses Italy/EU storefronts; confirm in App Store Connect & Play Console | Confirm | Pending | Pending | Pending | Pending | EUR | Store-supported | Same | EU DSA / consumer rules via IT/EU | Unverified storefront |
| Netherlands | Yes | Yes | Pending | Pending | Pending | Pending | EUR | Store-supported | Same | EU | Not ready |
| Suriname | Confirm Play and App Store country lists before launch | Confirm | Pending | Pending | Pending | Pending | SRD / USD | Store-supported only if listed | Same | Do not claim availability until consoles show the country | Unverified |
| Bangladesh | Confirm | Confirm | Pending | Pending | Pending | Pending | BDT | Store-supported if listed | Same | | Unverified |
| Sri Lanka | Confirm | Confirm | Pending | Pending | Pending | Pending | LKR | Store-supported if listed | Same | | Unverified |
| Spain | Yes | Yes | Pending | Pending | Pending | Pending | EUR | Store-supported | Same | EU | Not ready |
| Mexico | Yes | Yes | Pending | Pending | Pending | Pending | MXN | Store-supported | Same | | Not ready |
| France | Yes | Yes | Pending | Pending | Pending | Pending | EUR | Store-supported | Same | EU | Not ready |
| Belgium | Yes | Yes | Pending | Pending | Pending | Pending | EUR | Store-supported | Same | EU | Not ready |
| Switzerland | Yes | Yes | Pending | Pending | Pending | Pending | CHF | Store-supported | Same | | Not ready |
| Germany | Yes | Yes | Pending | Pending | Pending | Pending | EUR | Store-supported | Same | EU | Not ready |
| Austria | Yes | Yes | Pending | Pending | Pending | Pending | EUR | Store-supported | Same | EU | Not ready |
| Luxembourg | Yes | Yes | Pending | Pending | Pending | Pending | EUR | Store-supported | Same | EU | Not ready |
| Brazil | Yes | Yes | Pending | Pending | Pending | Pending | BRL | Store-supported | Same | Local tax / receipt rules | Not ready |
| Portugal | Yes | Yes | Pending | Pending | Pending | Pending | EUR | Store-supported | Same | EU | Not ready |
| Saudi Arabia | Yes | Yes | Pending | Pending | Pending | Pending | SAR | Store-supported | Same | Age rating / local content | Not ready |
| United Arab Emirates | Yes | Yes | Pending | Pending | Pending | Pending | AED | Store-supported | Same | | Not ready |
| Egypt | Yes | Yes | Pending | Pending | Pending | Pending | EGP | Store-supported | Same | | Not ready |
| Qatar | Yes | Confirm | Pending | Pending | Pending | Pending | QAR | Store-supported if listed | Same | | Unverified Play |
| Kuwait | Yes | Confirm | Pending | Pending | Pending | Pending | KWD | Store-supported if listed | Same | | Unverified Play |
| Bahrain | Yes | Confirm | Pending | Pending | Pending | Pending | BHD | Store-supported if listed | Same | | Unverified Play |
| Oman | Yes | Confirm | Pending | Pending | Pending | Pending | OMR | Store-supported if listed | Same | | Unverified Play |
| Jordan | Yes | Confirm | Pending | Pending | Pending | Pending | JOD | Store-supported if listed | Same | | Unverified Play |
| Iraq | Confirm App Store Connect country list | Confirm Play Console | Pending | Pending | Pending | Pending | IQD | Only if the store lists the country | Same | Do not mark ready without console confirmation | Unverified |
| China | Apple App Store China exists but needs China-specific filing / compliance | **Google Play is not a dependable mainland distribution or billing channel** | Not via Play Billing | Not via Play Billing | Not via Play Billing | Not via Play Billing | CNY | Apple IAP on China storefront if approved; Play Billing is not a China launch path. Do not claim WeChat/Alipay inside this app. | RevenueCat + Play cannot substitute for mainland Android stores | ICP / app filing / local Android stores (Huawei, Xiaomi, OPPO, vivo, Tencent MyApp) require a China entity or partner | **Blocked for Play billing launch** |

## Honest blockers

- No country is marked **ready** until the four product IDs exist in App Store Connect, Google Play Console, and RevenueCat, with a 15-day introductory trial where the store allows it.
- Mainland China Android cannot use Google Play Billing. A truthful launch there needs a separate local-store programme, which this repository does not implement.
- Study Flow does not collect UPI, cards, CVV or bank credentials. Local methods appear only if Apple or Google present them.
- New personal Google Play developer accounts may have extra testing requirements before production. Verify the current Play Console policy before claiming production readiness.

## Product IDs

- `studyflow_basic_monthly`
- `studyflow_basic_yearly`
- `studyflow_pro_monthly`
- `studyflow_pro_yearly`
