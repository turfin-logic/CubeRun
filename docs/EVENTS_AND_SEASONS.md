# Cube Run — Events & Seasons

> Last updated: 2026-10-14 | System: LEGACY / NOT INITIALIZED IN ARCADE FLOW

## How It Works

The event configuration and compatibility API remain in the repository, but the arcade build no longer calls `EventManager.init()` during boot. Normal play therefore:

- does not fetch `events_config.json` or show event banners/popups;
- does not read, overwrite, or clear the existing event cache;
- uses score-driven arcade phases instead of seasonal themes or event multipliers.

The remaining configuration is preserved for reference/future opt-in use. Editing or publishing it does not change the current arcade game.

---

## Config File: `events_config.json`

Located at: `C:\Users\pc\OneDrive\Desktop\CubeRun\events_config.json`
Hosted at: `https://turfin-logic.github.io/CubeRun/events_config.json`

### Event Object Schema

```json
{
  "id": "diwali_2026",
  "name": "Diwali Light Rush",
  "type": ["theme", "reward"],
  "start_utc": "2026-11-06T00:00:00Z",
  "end_utc":   "2026-11-12T23:59:59Z",
  "theme": "diwali",
  "score_multiplier": 2.0,
  "banner_text": "✨ DIWALI LIGHT RUSH — 2× SCORE!",
  "banner_color": "#FFD700",
  "particle_colors": ["#FFD700", "#FF8C00", "#FF4500"],
  "trail_color": "#FFD700",
  "active": true,
  "note": "Verify exact date from lunar calendar before event"
}
```

### Fields

| Field | Required | Description |
|---|---|---|
| `id` | ✅ | Unique string identifier |
| `name` | ✅ | Display name |
| `type` | ✅ | Array: `"theme"`, `"reward"`, `"challenge"`, `"recurring"` |
| `start_utc` | ✅ | ISO 8601 UTC start datetime |
| `end_utc` | ✅ | ISO 8601 UTC end datetime (inclusive) |
| `theme` | ✅ | Theme ID from `themes` block |
| `score_multiplier` | ✅ | Score multiplier (1.0 = no change) |
| `banner_text` | ✅ | Text shown in menu banner |
| `banner_color` | ✅ | Hex color for banner and glow |
| `active` | ✅ | `false` to disable without removing |
| `score_multiplier_on_weekends_only` | ❌ | If `true`, multiplier only applies on weekends |
| `note` | ❌ | Internal note (not shown to players) |

---

## Test Mode

To simulate a future event without changing the device clock:

```javascript
// In browser console or game dev tools:
EventManager.setTestDate('2026-12-25');  // Activates Christmas event
EventManager.setTestDate(null);          // Return to real time
```

---

## Available Themes

| Theme ID | Used By | Colors |
|---|---|---|
| `default` | Normal gameplay | Cyan player, pink obstacles |
| `diwali` | Diwali events | Gold/orange |
| `christmas` | Christmas events | Green/red/white |
| `newyear` | New Year events | Gold/pink/cyan |
| `lunar` | Lunar New Year | Red/gold |
| `valentine` | Valentine's Day | Pink/magenta |
| `holi` | Holi | Rainbow |
| `eid` | Eid | Green/gold |
| `glitch` | April Fools | Inverted/glitch effect |
| `summer` | Summer | Orange/yellow |
| `tricolor` | India Independence | Orange/white/green |
| `anniversary` | 1st/2nd Anniversary | Gold |
| `halloween` | Halloween | Purple/orange |

---

## EventManager API

```javascript
EventManager.init()                  // Legacy opt-in only; not called on boot
EventManager.getScoreMultiplier()    // Returns current multiplier (1.0 if no event)
EventManager.getActiveEventId()      // Returns event ID string or null
EventManager.getTheme()              // Returns CR_EVENT_THEME object or null
EventManager.setTestDate('2027-02-05') // QA: simulate a specific date
EventManager.setTestDate(null)       // QA: return to real time
```

The `window.CR_EVENT_THEME` object is available globally for the canvas renderer:
```javascript
window.CR_EVENT_THEME = {
  id, playerColor, obstacleColor, bgColor,
  particleColors, trailColor, uiAccent,
  invertColors, scoreMultiplier
}
```

---

## Weekend Boost

Configured in `global_settings.enable_weekend_boost` and the `weekend_boost` object.
- Fires every Saturday 00:00 UTC → Sunday 23:59 UTC
- Applies only when no themed event is active
- 1.5× score multiplier

---

## Adding a New Event

1. Open `events_config.json`
2. Add a new object to the `events` array
3. Choose a theme from the available themes (or add a new theme to the `themes` block)
4. Add corresponding CSS to `style.css` under `body.theme-{id}`
5. Commit and push → live in ~2 minutes
