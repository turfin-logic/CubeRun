# Cube Run — Project Master Map

> Last updated: 2026-10-14 | Status: Active Development

## Quick Reference

| Item | Value |
|---|---|
| Game Name | Cube Run (marketed as "Neon Drift: Boss Level") |
| App ID | `com.neondrift.bosslevel` |
| Version | `1.0.7+12` |
| Web URL | https://turfin-logic.github.io/CubeRun/?v=4 |
| GitHub Repo | https://github.com/turfin-logic/CubeRun |
| AdMob Publisher | `pub-7135509336156881` |
| Analytics | GTM `GTM-WDLK97FW` / GA4 `G-5JKRS76MWK` |

---

## Repository Locations

| Location | Type | Git? | Notes |
|---|---|---|---|
| `C:\Users\pc\OneDrive\Desktop\CubeRun\` | **Web game source (active)** | ✅ Yes → `turfin-logic/CubeRun` | This is the authoritative web copy |
| `D:\Projects\NeonDriftAPK\` | **Flutter Android wrapper** | ✅ Yes (initialized 2026-10-14) | No remote configured yet — back up to GitHub |
| `D:\Projects\NeonDrift\` | Stale web clone | ✅ Yes | Identical to Desktop copy but outdated. Do not edit. |

> ⚠️ `D:\Projects\NeonDrift\` is a stale secondary clone. All web edits go to `C:\Users\pc\OneDrive\Desktop\CubeRun\`.

---

## Web Game Files (`CubeRun/`)

| File | Purpose |
|---|---|
| `index.html` | Main HTML: UI screens, GTM, GameDistribution SDK, Service Worker |
| `game_source.js` | **UNOBFUSCATED SOURCE** — all game logic (~1170 lines). Excluded from git by `.gitignore`. |
| `game.js` | Production build served to players (copy of game_source.js) |
| `style.css` | Cyberpunk neon theme + event theme overrides |
| `ads.js` | GameDistribution web ad SDK integration |
| `sw.js` | Service Worker — offline caching (cache v6 as of 2026-10-14) |
| `events_config.json` | 24-month live event schedule (fetched fresh — not cached by SW) |
| `app-ads.txt` | AdMob authorized seller declaration |
| `manifest.json` | PWA web app manifest |
| `privacy.html` | Privacy policy for Play Store |
| `docs/` | Project documentation (this folder) |

---

## Flutter Wrapper Files (`NeonDriftAPK/`)

| File | Purpose |
|---|---|
| `lib/main.dart` | Flutter entrypoint: WebView, AdMob, JS bridge |
| `pubspec.yaml` | Dependencies: webview_flutter, google_mobile_ads, url_launcher |
| `android/app/build.gradle.kts` | Android build config, signing |
| `android/app/src/main/AndroidManifest.xml` | Permissions, AdMob App ID |
| `android/key.properties` | Keystore credentials — **gitignored, never commit** |
| `android/app/upload-keystore.jks` | Signing keystore — **gitignored, back up separately** |

---

## How the Two Parts Connect

```
Flutter App (main.dart)
    └─ WebView loads: https://turfin-logic.github.io/CubeRun/?v=4
         └─ Injects: window.IS_APK = true
         └─ JS Channel: "AdChannel" (postMessage bridge)
              ├─ showInterstitial → _showInterstitialAd()
              └─ showRewarded    → _showRewardedAd()
                                       └─ onUserEarnedReward → runJavaScript('FlutterBridge.onRewardGranted()')
```

---

## Deployment Workflow

**Web game (push to live in ~2 minutes):**
```
Edit game_source.js / style.css / index.html
Copy game_source.js → game.js
git add . && git commit -m "feat: ..."
git push origin main
→ GitHub Pages auto-deploys
```

**Android APK/AAB:**
```
cd D:\Projects\NeonDriftAPK
flutter build appbundle --release
→ Output: build/app/outputs/bundle/release/app-release.aab
→ Upload to Play Console
```
