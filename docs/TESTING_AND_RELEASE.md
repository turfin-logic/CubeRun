# Cube Run — Testing & Release

> Last updated: 2026-10-14

## Web Game — Push to Live

```bash
# 1. Edit game_source.js, style.css, index.html etc.
# 2. Copy source to production build:
copy game_source.js game.js    # Windows
# 3. Commit and push:
git add .
git commit -m "feat: describe change"
git push origin main
# → GitHub Pages auto-deploys in ~2 minutes
# → Players see new version on next load
```

**Service Worker Note:** If you change `sw.js`, bump `CACHE_NAME` (currently `cuberun-v20`) and update asset query versions in `index.html` when changing `game.js` or `style.css`. Add new offline-required assets to `ASSETS_TO_CACHE`.

`game_source.js` is intentionally gitignored; keep the local source synchronized with `game.js`, but do not force-add it to the public repository.

---

## Android Build — AAB for Play Store

```bash
cd D:\Projects\NeonDriftAPK

# Ensure signing is configured (key.properties must exist):
# android/key.properties:
#   storePassword=<your-password>
#   keyPassword=<your-password>
#   keyAlias=upload
#   storeFile=app/upload-keystore.jks

flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab
```

Upload the `.aab` to Play Console → Internal/Closed/Open Testing → Production.

---

## Pre-Release Checklist

### Web
- [ ] `game.js` is up to date with `game_source.js`
- [ ] No `EventManager.setTestDate()` calls left active
- [ ] No test Ad Unit IDs in code (all should be production IDs)
- [ ] `sw.js` cache version bumped if SW changed
- [ ] `events_config.json` dates verified (especially movable holidays)
- [ ] `app-ads.txt` accessible at live URL
- [ ] GTM/GA4 data flowing (check Realtime in GA4)

### Android APK/AAB
- [ ] `?v=N` in WebView URL updated in `main.dart` (current: `?v=4`)
- [ ] `version` in `pubspec.yaml` incremented
- [ ] `key.properties` present and pointing to correct keystore
- [ ] Build signed with upload keystore (NOT a debug keystore)
- [ ] Test on real device: ads load, rewarded ad completes, revive works
- [ ] Test offline behavior: "CONNECTION LOST" screen shows, retry works
- [ ] No debug banner visible (`debugShowCheckedModeBanner: false` ✅)

---

## Ad Testing

**During development — use Google test IDs:**

| Ad Type | Test Unit ID |
|---|---|
| Rewarded | `ca-app-pub-3940256099942544/5354046379` |
| Interstitial | `ca-app-pub-3940256099942544/1033173712` |
| Banner | `ca-app-pub-3940256099942544/6300978111` |

**Switch back to production IDs before building AAB.**

---

## Arcade Flow Testing

- Confirm a fresh load opens directly on the clean start screen without loading/event overlays or an event-config request.
- Start each mode and verify its mode-specific obstacles; check score phases at 50, 150, and 300.
- Confirm game over can be dismissed immediately with a tap, the retry button, or Space; revive remains a separate rewarded action.
- The clutch revive appears only at 70%+ of an established best score or on a new record attempt; short (18 s or less) runs never trigger interstitials, even after three session deaths.
- Resize/rotate during each mode and confirm the player/obstacles stay inside the new arena; retry during a pending ad/countdown and confirm no stale ad or extra run starts.
- Existing event configuration and local cache data are intentionally retained but unused by the arcade flow.

---

## Play Store — Testing Phases

| Phase | Status | Notes |
|---|---|---|
| Internal Testing | Done | Small group |
| Closed Testing | **Active** | 14-day minimum before production |
| Open Testing | Not started | |
| Production | Not started | Do not push without approval |

> Real ad IDs are fine during all testing phases. AdMob controls fill rate.
> Do NOT manually click your own ads — this violates AdMob policy.

---

## Keystore Backup

> ⚠️ **Critical:** If the keystore is lost, you CANNOT publish updates to the same Play Store listing.

- Keystore location: `D:\Projects\NeonDriftAPK\android\app\upload-keystore.jks`
- Back up to a second location (external drive, encrypted cloud storage)
- Password is stored in `android/key.properties` — **never commit that file**
- See `user_rules` in AI assistant for keystore credentials reference
