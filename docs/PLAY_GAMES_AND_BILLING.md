# Cube Run — Play Games v2 + Play Billing + Achievements Integration

Status: implementation complete; **Play Console configuration pending** (see §6).
This document is the single source of truth for the bridge contract, achievement
mapping and the remaining store setup steps.

## 1. What was added (summary)

| Layer | Change |
|---|---|
| `game.js` | `ACHIEVEMENTS` (9 awards, conditions derived from real mechanics), `Stats` (`ndStats`), `Achievements` (`ndAchState`), `GPGSync` (delta-based, offline-first sync queue), `RemoveAdsUi` (price/busy states), achievements screen renderer, `window.onInterstitialShown` cadence feedback |
| `index.html` | `#gpg-profile` pill, Awards dock button, `#achievements-screen`, version bumps (`style.css?v=22`, `game.js?v=27`) |
| `style.css` | Profile pill + achievements screen + purchase button states |
| `sw.js` | Cache `cuberun-v28`, precache list bumped in lockstep |
| wrapper `lib/main.dart` | SDK init await, UMP consent, lifecycle observer, interstitial shown-feedback, rewarded race fix, noAds gating, queued JS bridge |
| wrapper `lib/game_bridge.dart` | NEW — queued Dart→JS bridge with readiness probe |
| wrapper `lib/billing_service.dart` | NEW — Play Billing: query/buy/acknowledge/restore/pending/refund |
| wrapper `lib/game_services.dart` | NEW — Play Games v2 via MethodChannel, achievement ID map |
| wrapper `MainActivity.kt` | NEW — official `play-services-games-v2` integration |
| wrapper gradle | `play-services-games-v2:21.0.0`, `play-services-base:18.5.0` |

## 2. JavaScript ↔ Flutter bridge (complete contract)

### JS → Dart

| Channel | Message | Trigger |
|---|---|---|
| `AdChannel` | `showInterstitial` | game.js cadence engine (gameOver) |
| `AdChannel` | `showRewarded` | REVIVE button |
| `AdChannel` | `purchaseRemoveAds` | REMOVE ADS button (UPGRADE) |
| `GameHaptics` | `light` / `medium` | vibrate() |
| `GameChannel` | `gpgSignIn` | "Tap to connect Google Play Games" / achievements screen open |
| `GameChannel` | `{"type":"gpgIncrement","id":…,"key":…,"amount":…}` | GPGSync.flush delta push |
| `GameChannel` | `{"type":"gpgUnlock","id":…,"key":…}` | achievement unlocked locally |

### Dart → JS (all queued until game JS is live — `game_bridge.dart`)

| Global call | Meaning |
|---|---|
| `window.IS_APK = true` | wrapper flag (also self-detected via AdChannel) |
| `window.__initPlayGames({enabled,signedIn,ids})` | sync config; `enabled=false` until Play Console IDs exist |
| `window.onPlayGamesProfile({name,level,icon}\|null)` | REAL Play Games profile; `null` = signed out; pill stays hidden |
| `window.onGpgAchievementsLoaded([{id,steps,totalSteps,unlocked}])` | authoritative server state after sign-in (adopted locally, baselines set) |
| `window.onGpgSyncResult(key, ok)` | native failed an unlock/increment → JS re-arms dirty flag |
| `window.setNoAds(true\|false)` | VERIFIED entitlement flip (purchase/restore/revoke) |
| `window.setRemoveAdsPrice(label)` | real localized Play price |
| `window.setRemoveAdsUnavailable()` | store/product not queryable |
| `window.setPurchaseBusy(true\|false)` | purchase in flight — button locked |
| `window.onPurchaseResult(status, detail?)` | `success\|pending\|canceled\|unavailable\|error\|revoked` |
| `window.onInterstitialShown(true\|false)` | cadence counters reset ONLY on a real show |
| `window.FlutterBridge.onRewardGranted/Failed()` | rewarded outcome (unchanged contract) |
| `window.onAdClose()` | rewarded dismissed (unchanged contract) |

### Ordering guarantees
- Entitlement (`setNoAds`) is pushed **before** anything else after each page
  load, so no ad can fire before the game knows the entitlement.
- Purchase success is pushed **only after** `_verify()` passed
  (product id + Play purchase payload + token/orderId + purchaseState==0).
- `pending` purchases never grant entitlement.
- Reinstalls: `verifyOwnership()` on every launch/resume queries Play; the
  server state adoption path (`onGpgAchievementsLoaded`) baselines steps so
  restored achievements are never re-incremented.

## 3. Achievement mapping (derivation: all conditions are NEW — no achievement
system existed before this change; verified across full git history)

| key | Name | Condition (derived from real mechanics) | Play steps |
|---|---|---|---|
| `perseverance` | Perseverance | 10 completed runs within one local day | increment 10 |
| `adventurer` | Adventurer | play all 3 modes (CLASSIC/LASER/TOPDOWN) | increment 3 |
| `scorechampion` | Score Champion | 12 new personal bests | increment 12 |
| `invincible` | Invincible Legend | 5 runs lasting ≥ 60 s | increment 5 |
| `blockmaster` | Block Master | 500 obstacles dodged (lifetime) | increment 500 |
| `opportunist` | Opportunist | 25 CLOSE CALL bonuses (lifetime) | increment 25 |
| `jewelrytycoon` | Jewelry Tycoon | 10,000 total points banked | increment 10000 |
| `unwavering` | Unwavering | 5 rewarded CLUTCH REVIVEs | increment 5 |
| `mastercleaner` | Master Cleaner | 100 laser beams jumped in LASER mode | increment 100 |

Highest Combo (statistic) = most obstacles dodged in a single run (revives do
not reset it — the run continues). Rounds = completed runs. Login Days =
distinct local days seen (capped ring buffer, no double-count per day).

Create these 9 achievements in Play Console with the same names, mark them
**incremental** with the step totals above, then paste the numeric IDs into
`lib/game_services.dart → kAchievementIds`.

## 4. Remove Ads product

- Product type: **managed (non-consumable)**
- Product ID: `remove_ads` (change `BillingService.removeAdsProductId` if you
  created a different one)
- Covers: interstitials + bottom banner. The rewarded CLUTCH REVIVE stays
  available by documented pre-existing design (player-initiated, opt-in —
  game.js comment; removing it would break the revive mechanic for paying
  users).
- Authority: native SharedPreferences `noAdsEntitlement` (set only after
  verification). JS localStorage `ndRemoveAds` is a UI cache.
- Revocation: startup + every resume re-queries Play; a locally-entitled user
  whose purchase no longer appears (refund) gets the entitlement removed —
  only when the store query verifiably succeeded.
- Server-side verification: **not available** (no backend). Native
  verification is limited to payload/state/token checks — documented
  limitation; Google Play Billing provides the receipt locally signed by Play.

## 5. Player profile / "game acceleration" (screenshot 1 investigation)

- Profile pill: filled ONLY from the official `PlayersClient.getCurrentPlayer`
  (`displayName`, `levelInfo.currentLevel.levelNumber` — the platform-managed
  Play Games XP level, plus real `currentXpTotal` passed through). No
  fabrication; hidden when signed out or unconfigured.
- Games-v2 21.0.0 API notes: automatic sign-in via `PlayGamesSdk.initialize()`;
  passive check `isAuthenticated()`; explicit fallback `signIn()`.
  `unlockImmediate`/`incrementImmediate` are used so failures are reportable;
  `load(true)` returns `Task<AnnotatedData<AchievementBuffer>>`.
- The "Game acceleration engine activated" toast in the reference is a
  **manufacturer Game Booster / Game Mode notification** (Xiaomi/OnePlus-class
  OEM feature rendered by the OS over games). It is NOT a Google Play Games
  API. Android exposes no public API to trigger it; fabricating one in-app is
  prohibited by the task rules and would be deceptive. Nothing was faked; the
  OEM feature appears on its own on supporting devices while the game runs.

## 6. PLAY CONSOLE SETUP STILL REQUIRED (blocking full activation)

1. **Link Play Games Services**: Play Console → your app → Play Games Services
   → Setup → create/link a Google Cloud project.
2. **Credentials**: add Android credential with package `com.neondrift.bosslevel`
   and the SHA-1 of `android/app/upload-keystore.jks`
   (`keytool -list -v -keystore android/app/upload-keystore.jks`).
3. **App ID**: copy the numeric Application ID into
   `android/app/src/main/res/values/games_strings.xml` (`games_app_id`,
   `games_project_id` — currently placeholder `0`, which keeps the games SDK
   hard-disabled by design).
4. **Achievements**: create the 9 incremental achievements (§3) and paste IDs
   into `lib/game_services.dart → kAchievementIds`.
5. **Billing**: Monetize → Products → In-app products → create managed product
   `remove_ads` and set a price.
6. Rebuild and upload; test the flows with License Testers.

## 7. Storage keys (JS)

| Key | Storage | Content |
|---|---|---|
| `ndStats` | localStorage (base64 JSON) | lifetime stats (v1 schema) |
| `ndAchState` | localStorage JSON | `{unlocked:{key:ts}, seen:{}}` |
| `ndAchSync` | localStorage JSON | `{key:{steps,unlocked}}` last state confirmed by Play |
| `ndRemoveAds` | localStorage | entitlement UI cache |
| `ndSave` / `ndSettings` / `cr_session_death_count` | unchanged | best score / settings / session deaths |
| `noAdsEntitlement` | Android SharedPreferences (native) | verified entitlement authority |
