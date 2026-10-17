# Cube Run — Architecture

> Last updated: 2026-10-14

## System Overview

```
┌─────────────────────────────────────────────────────┐
│              PLAYER'S ANDROID PHONE                 │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │      Flutter Native Wrapper (Dart)            │  │
│  │  • AdMob: Banner, Interstitial, Rewarded      │  │
│  │  • WebView → turfin-logic.github.io/CubeRun  │  │
│  │  • JS Bridge: "AdChannel" postMessage         │  │
│  └──────────────────┬────────────────────────────┘  │
│                     │ postMessage / runJavaScript    │
│  ┌──────────────────▼────────────────────────────┐  │
│  │           WebView (Game Engine)               │  │
│  │  • HTML5 Canvas @ 60 FPS                      │  │
│  │  • Vanilla JS (game.js / game_source.js)      │  │
│  │  • EventManager (events_config.json)          │  │
│  │  • CSS Cyberpunk + event themes               │  │
│  │  • Web Audio API                              │  │
│  │  • localStorage (settings, high score)        │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│           GITHUB PAGES CDN (FREE)                   │
│  turfin-logic.github.io/CubeRun/                    │
│  • index.html, game.js, style.css, sw.js            │
│  • events_config.json (live event config)           │
│  • GameDistribution SDK (web-only ads)              │
│  • GTM Analytics                                    │
└─────────────────────────────────────────────────────┘
```

---

## localStorage Schema

| Key | Type | Contents |
|---|---|---|
| `ndSettings` | JSON | `{ sfx: bool, music: bool, vibration: bool }` |
| `ndSave` | JSON | `{ highScore: int }` |
| `cr_events_config` | JSON | Cached events_config.json (1-hour TTL) |
| `cr_events_ts` | Number | Timestamp of last events_config cache write |

---

## JS Bridge (AdChannel)

The Flutter wrapper registers a `JavaScriptChannel` named `AdChannel`. The web game sends messages via `window.AdChannel.postMessage(msg)`.

```
Web game (JS)                    Flutter (Dart)
─────────────────────────────────────────────────────
AdChannel.postMessage('showRewarded')   →   _showRewardedAd()
                                              ↓ ad shows
                                        onUserEarnedReward fires
                                              ↓
                                        runJavaScript('FlutterBridge.onRewardGranted()')
                                              ↓ (WHILE ad still showing)
                                        onAdDismissedFullScreenContent fires
                                              ↓
                                        runJavaScript('window.onAdClose()')
                                              ↓ (AFTER ad dismissed)
                                    revivePlayer() called in JS

AdChannel.postMessage('showInterstitial') → _showInterstitialAd()
```

**Critical ordering:** `onUserEarnedReward` fires BEFORE `onAdDismissedFullScreenContent`. The JS side uses `window._pendingRevive` flag set by `onRewardGranted()`, then `onAdClose()` checks the flag and calls `revivePlayer()`.

---

## Game Loop

```
requestAnimationFrame loop
    └─ update(dt)
         ├─ Move player (CLASSIC: gravity swap | TOPDOWN: tap-to-move | LASER: Z-jump)
         ├─ Move obstacles
         ├─ Collision detection
         ├─ addScore(N) — applies EventManager multiplier
         └─ spawn obstacles (Poisson-like interval)
    └─ draw()
         ├─ background particles
         ├─ obstacles (offscreen sprite cache)
         ├─ player (trail → glow sprite)
         └─ HUD
```

---

## Event System

```
Game boot
    └─ EventManager.init()
         ├─ 1. Check localStorage cache (cr_events_config)
         │       └─ If fresh (<1h old): use cache
         ├─ 2. Fetch events_config.json from GitHub Pages
         │       └─ Store to cache
         ├─ 3. Fall back to stale cache if fetch fails
         ├─ 4. Evaluate active event by UTC date
         ├─ 5. Apply theme (CSS class + window.CR_EVENT_THEME)
         └─ 6. Show event banner in menu
```

---

## Service Worker Strategy

- Cache: `cuberun-v17` (responsive neon UI refresh)
- Strategy: **Stale-While-Revalidate** for all game assets
- Bypassed (always network): `gamedistribution.*`, `google.*`, `events_config.json`
- Bypassed because `events_config.json` must always be fresh for live event scheduling
