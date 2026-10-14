# Cube Run — Known Issues & Decisions

> Last updated: 2026-10-14

## Fixed Issues

| Date | ID | Issue | Fix |
|---|---|---|---|
| 2026-10-14 | ADX-1 | **Auto-revive exploit** — `visibilitychange` listener granted free reward after 3s app minimize | Removed; replaced with audio-only management |
| 2026-10-14 | ADX-2 | **Dead code** — `RewardedInterstitialAd` loaded on every launch using Google test ID, never shown | Removed entirely from `main.dart` |
| 2026-10-14 | ADX-3 | **No retry backoff** — ad load failures silently dropped, no retry | Added exponential backoff (1→2→4→8s, 4 attempts max) |
| 2026-10-14 | ADX-4 | **Interstitial disabled** — `FlutterBridge.showInterstitial()` was commented out | Re-enabled, fires every 3 deaths |
| 2026-10-14 | ADX-5 | **120s reward timeout** — dead ad sessions kept promise pending for 2 minutes | Reduced to 30s |
| 2026-10-14 | ADX-6 | **games_services dependency** — imported but zero code used it | Removed from `pubspec.yaml` |
| 2026-10-14 | GIT-1 | **NeonDriftAPK had no git** — Flutter wrapper at risk of permanent loss | Initialized git, keystore and key.properties excluded via `.gitignore` |

---

## Open Issues

| ID | Severity | Issue | Notes |
|---|---|---|---|
| ADX-7 | 🔴 Medium | **UMP consent not implemented** — no GDPR consent dialog | Add before targeting EU users. Could risk AdMob account if flagged. |
| ADX-8 | 🟡 Low | **Banner retry stops at 4 attempts** — if server is down all session, banner stays blank | Acceptable for now |
| REPO-1 | 🟡 Low | **NeonDriftAPK has no remote git** — only local commits | Push to GitHub as private repo |
| REPO-2 | 🟢 Info | **Stale clone at D:\Projects\NeonDrift** — identical to Desktop copy but outdated | Safe to keep or delete |
| IOS-1 | 🔴 High | **iOS build missing AdMob ID** — `Info.plist` has no `GADApplicationIdentifier` | App would crash on launch. Do not attempt iOS build without fixing. |
| FIX.JS | 🟢 Info | **fix.js, fix2.js, fix3.js in web root** — untracked debug files | Clean up when ready |

---

## Decisions Log

| Date | Decision | Reasoning |
|---|---|---|
| 2026-10-14 | Keep `google_mobile_ads` at v5.1.0 | Current version works; v9.x upgrade would require testing. Will upgrade when needed. |
| 2026-10-14 | Use GitHub Pages for event config (not Firebase) | Free, zero infrastructure, fits existing stack, full git history |
| 2026-10-14 | Interstitial re-enabled every 3 deaths | Was disabled — but it was wired up and tested in an earlier version. Revenue impact. |
| 2026-10-14 | Copy game_source.js → game.js (no obfuscator) | Obfuscation toolchain not available. Source is functionally identical to production build. Can add terser/webpack later. |
| 2026-10-14 | Timeout reduced to 30s (from 120s) | 120s was too long for users waiting for a failed ad. 30s is reasonable for mobile networks. |
| 2026-10-14 | Service Worker cache bumped to v6 | Required after sw.js change to bypass events_config.json caching |
| 2026-10-14 | WebView URL updated to ?v=4 | Ensures cached WebView in existing installs fetches fresh content on next launch |

---

## Future Work (Not Yet Approved)

- Implement UMP consent SDK (GDPR/CCPA compliance)
- Push NeonDriftAPK to a private GitHub remote
- Add Google Play Games leaderboards (games_services was already depended on, now removed — would need re-adding)
- Upgrade google_mobile_ads to v9.x
- Add obfuscation step (terser/uglifyjs) to build pipeline
- Remove stale fix.js / fix2.js / fix3.js files from web root
