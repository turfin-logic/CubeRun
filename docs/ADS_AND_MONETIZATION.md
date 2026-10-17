# Cube Run — Ads & Monetization

> Last updated: 2026-10-14 | Fixes applied this date

## Ad Unit IDs (Production)

| Ad Type | Unit ID | Status |
|---|---|---|
| AdMob App ID | `ca-app-pub-7135509336156881~6875634809` | ✅ Production |
| Rewarded | `ca-app-pub-7135509336156881/5832738189` | ✅ Production |
| Interstitial | `ca-app-pub-7135509336156881/9535345320` | ✅ Production |
| Banner | `ca-app-pub-7135509336156881/6519352091` | ✅ Production |

> ⚠️ Never commit these IDs to public repos with test IDs mixed in. All IDs above are real production IDs.

---

## Ad Flow — Rewarded (Revive)

```
Player dies → clicks "⚡ REVIVE (WATCH AD)"
    │
    ├── [APK] AdChannel.postMessage('showRewarded')
    │       └─ Flutter: _showRewardedAd()
    │               ├─ Ad ready?
    │               │   YES → show ad
    │               │         └─ onUserEarnedReward → FlutterBridge.onRewardGranted()
    │               │                                  └─ window._pendingRevive = true
    │               │         └─ onAdDismissedFullScreenContent → window.onAdClose()
    │               │                                              └─ revivePlayer()
    │               │   NO  → reset button, call onRewardFailed(), reload ad
    │
    └── [Web] gdsdk.showAd('rewarded')
                └─ SDK_REWARDED_WATCH_COMPLETE → FlutterBridge.onRewardGranted()
```

## Ad Flow — Interstitial (Every 3 deaths)

```
gameOver() called
    └─ deathCount++
    └─ if (deathCount % 3 === 0)
           └─ FlutterBridge.showInterstitial()
               ├─ [APK] AdChannel.postMessage('showInterstitial') → _showInterstitialAd()
               └─ [Web] gdsdk.showAd()
```

---

## Fixes Applied 2026-10-14

| # | Fix | File | Description |
|---|---|---|---|
| 1 | **Removed dead code** | `main.dart` | `RewardedInterstitialAd` was loaded with a Google test ID on every launch but never shown. Removed entirely. |
| 2 | **Added retry backoff** | `main.dart` | Rewarded, interstitial, and banner ads now retry with exponential backoff (1→2→4→8s, max 4 attempts) on load failure. |
| 3 | **Fixed auto-revive exploit** | `game_source.js` | `visibilitychange` and `focus` listeners were granting free rewards after 3s of app being minimized. Replaced with audio-only management. |
| 4 | **Re-enabled interstitial** | `game_source.js` | `FlutterBridge.showInterstitial()` was commented out. Now active every 3 deaths. |
| 5 | **Reduced reward timeout** | `game_source.js` | Timeout reduced from 120s to 30s so dead ad sessions fail cleanly and quickly. |
| 6 | **Removed games_services** | `pubspec.yaml` | Unused dependency removed (no code used it). |
| 7 | **Added dispose()** | `main.dart` | Added `dispose()` method to clean up all ad objects when widget is destroyed. |
| 8 | **Duplicate reward guard** | `main.dart` | `_rewardGranted` boolean prevents `onUserEarnedReward` firing twice in one session. |

---

## Web Ads — GameDistribution

- SDK is loaded by `game.js` only when an ad is requested; game startup and core play do not depend on the ad network.
- Game ID: `b13fb38f722340388cd26e643ed2d6f8`
- Rewarded: `gdsdk.showAd('rewarded')` → `SDK_REWARDED_WATCH_COMPLETE` is the only web callback that grants a revive; a resolved ad promise alone is not proof of completion.
- Pause/Resume: `SDK_GAME_PAUSE` / `SDK_GAME_START` events
- If the SDK is blocked or unavailable, rewarded ads fail cleanly and interstitials are skipped; the game remains playable. The service worker returns an unavailable response for failed SDK requests rather than a success-shaped placeholder.
- `SDK_GAME_START` resumes gameplay but does not grant a reward; rewards require the rewarded-ad completion callback.

---

## Consent (UMP) — OPEN ISSUE

> ⚠️ **Not yet implemented.** Google requires UMP (User Messaging Platform) for GDPR compliance. Without it, AdMob may restrict ad serving in EEA regions and could eventually flag the account.

**Future work:** Implement `ConsentInformation.instance.requestConsentInfoUpdate()` in `main.dart` before `MobileAds.instance.initialize()`.

---

## app-ads.txt

Located at `CubeRun/app-ads.txt` — required by AdMob for authorized seller verification. Must be accessible at `https://turfin-logic.github.io/CubeRun/app-ads.txt`.

---

## Testing Notes

- During Google Play **closed testing**, real ad IDs are fine to use. AdMob serves test-like ads based on fill rate.
- For local development, swap to test IDs: `ca-app-pub-3940256099942544/1033173712` (rewarded) etc.
- Never ship with test IDs in production builds.
