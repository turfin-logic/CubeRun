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
│  │  • Score-driven arcade phases and patterns    │  │
│  │  • CSS Cyberpunk                              │  │
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
         ├─ addScore(N) — applies the current phase multiplier
         └─ spawn obstacles (Poisson-like interval)
    └─ draw()
         ├─ background particles
         ├─ obstacles (offscreen sprite cache)
         ├─ player (trail → glow sprite)
         └─ HUD
```

---

## Arcade Flow

- Boot directly to the clean start screen; no loading sequence or event popup is initialized.
- Gameplay phases are score-driven (50 / 150 / 300), with a smooth color transition and a short phase banner.
- Obstacle patterns are mode-aware: gravity-flip pairs/staircases, vertical-dodge gates, and laser obstacles.
- A tap or Space immediately restarts from game over; the rewarded revive is highlighted only near an established high score.
- Interstitials remain on the third-death cadence, require that run to exceed 18 seconds, and use a session-scoped death count that survives page reloads in the same tab. Pending interstitials and revive countdowns are cancelled when their run is abandoned.
- Orientation/viewport changes keep the player and active obstacles aligned with the resized arena.
- Legacy event configuration and cached values are left untouched but are not fetched or shown in normal play.

---

## Service Worker Strategy

- Cache: `cuberun-v20` (runtime lifecycle and resize fixes)
- Strategy: **Stale-While-Revalidate** for all game assets
- Bypassed (always network): `gamedistribution.*`, `google.*`, `events_config.json`
- Bypassed because `events_config.json` must always be fresh for live event scheduling
