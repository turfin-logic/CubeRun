# CUBE RUN — DESIGN & ENGINEERING PHILOSOPHY

Har system ke peeche ka "KYUN". Ye doc code padhne se pehle/paadhte waqt
padho — har naye feature ka jawab yahi principles denge.

---

## 1. The Core Loop — "Flow above everything"

```
requestAnimationFrame loop → update(dt) → draw() → repeat
```

- **Ek hi RAF loop**, `GAME_STATE` gate se. Pause/GAMEOVER pe loop cancel —
  battery + performance.
- `dt` clamp (×3 max): frame drop pe game teleport nahi hota, sirf thoda
  fast chalta hai. Fairness > physics accuracy.
- **Philosophy:** player ko kabhi bhi "system ke liye rukna" na pade. Pause
  screen, ad break, revive countdown — sab **player ke action pe** hote
  hain, timer pe nahi.

## 2. Object Pooling — "Allocate once, play forever"

- `ObjectPool` class: obstacles/particles/bg-dots pre-allocated hotte hain.
- GC pause mid-run = death without fault — isliye **zero allocations in the
  hot path**. FloatTexts hi exception hai (rare, small).
- **Philosophy:** 60fps on a ₹8000 phone is a design constraint, not a
  bonus. `shadowBlur` isko ban kyun kiya — layered-alpha glow se same look,
  1/10th cost. `devicePixelRatio` cap (1.5 APK pe) — retina sharpness vs
  fill-rate ka tradeoff, explicitly chosen.

## 3. Risk-Reward — "Greed is the score multiplier"

- Obstacle pass = +10. **CLOSE CALL (gap ≤6px) = +50.** Laser tight-jump
  (z∈[15,21]) = +50.
- Score multipliers (NEON ×1 → MATRIX ×2) reward **survival time**, sirf
  distance nahi.
- **Philosophy:** safe khelne pe bhi game jeet sakte ho, par daredevil ko
  game pyaar karta hai. Highest Combo = ek run me maximum greed streak —
  revive pe combo survive karta hai (run abhi zinda hai!), naye run pe
  reset.

## 4. Ad Philosophy — "An ad is a reward for a real session, never a punishment"

Golden rules (INTERSTITIAL_POLICY + rewarded flow me encoded):

1. **Natural break only** — game-over settle hone ke baad (900ms), kabhi
   gameplay me nahi.
2. **Earned cadence** — run ≥10s hi count hota hai (rapid-death spam se ad
   tak nahi pahunchta), ≥3 qualifying deaths, ≥75s cooldown.
3. **Counter sirf confirmed show pe reset** — `onInterstitialShown(true)`
   native se aata hai; no-fill pe 20s re-arm, cadence barbaad nahi hota.
4. **Player-initiated rewarded** — revive hamesha opt-in; ad fail = retry
   message, kabhi punishment nahi.
5. **Remove Ads = trust** — entitlement verify hone se PEHLE koi grant nahi
   (product ID + payload + token + state==purchased), pending = kabhi nahi,
   revoke pe instant hatana.

## 5. Bridge Philosophy — "Queue, verify, never fake"

- **JS ↔ Dart calls kabhi lost nahi hote**: `GameBridge` queue karta hai
  jab tak game JS live na ho (probe handshake). Reload mid-purchase pe bhi
  entitlement push hota hai.
- **Ordering is sacred:** page load → entitlement PEHLE → games config →
  price. Pehle ad chala jaye entitlement se pehle — impossible.
- **No fake anything:** sign-in nahi hua → pill hidden; product nahi mila →
  "UNAVAILABLE"; purchase pending → NO entitlement; server na bole → NO
  unlock. UI ke liye fabrika karna project ka cardinal sin hai.
- **Terminal events always release the UI** — canceled/pending/error
  productID ke bina bhi handle hote hain (Android inhe blank bhejta hai) +
  90s auto-release safety net.

## 6. Achievements Philosophy — "Truth is computed, never stored"

- Progress **kabhi store nahi hota** — lifetime stats (`ndStats`) se
  hota hai: `a.progress(Stats.data) >= a.goal`. Double-award structurally
  impossible; storage corruption se sirf progress loss, galat unlock nahi.
- **Unlock-once**: `state.unlocked` + in-memory `_toasted` dedup.
- **Offline-first sync:** local truth authoritative; Play Games ko sirf
  **deltas** jaate hain (kabhi absolute re-increment nahi). Server state
  aaye to **baseline adopt** hota hai (reinstall-safe) aur sirf genuine
  delta re-dirty hota hai. Failure pe per-key cap (5) — infinite retry
  loop impossible.
- **Platform humility:** Play Games ka level/XP platform-managed hai — hum
  use **display** karte hain, banana nahi.

## 7. Billing Philosophy — "Native is the authority, localStorage is a rumour"

- Entitlement ki asli jagah: **SharedPreferences** (native). JS localStorage
  sirf UI cache. Koi tampering JS-side se entitlement nahi de sakti.
- Verification chain: product ID match → Play payload JSON parse →
  purchaseToken/orderId present → `purchaseState == 0`. Phir acknowledge
  (`completePurchase`) — 3-day rule.
- **Startup + resume pe re-verify:** reinstall = restore; refund = revoke
  (sirf verifiably successful query pe — offline pe kabhi revoke nahi).
- **Every terminal state frees the player:** success/cancel/pending/error/
  unavailable — button unlock + honest toast.

## 8. Persistence Philosophy — "Versioned, base64, tiny"

- Sab game keys (`ndSave`, `ndStats`, `ndSettings`, `ndAchState`,
  `ndAchSync`) localStorage me, base64 JSON, `v` schema field ke saath.
- Migrations: purane plaintext se base64, default-merge (`{...DEFAULT, ...parsed}`)
  — naya field aaye to purana save invalid na ho.
- SW cache version chain: **game.js edit → `?v=` bump → SW CACHE bump →
  wrapper URL bump → bundled copy sync.** Ek bhi step miss = stale game in
  the wild.

## 9. Platform Respect — "The OS is a player too"

- Lifecycle: resume pe ads re-kick, billing re-verify, games re-auth
  (passive only — repeated `signIn()` = repeated OS banner, isliye
  **one explicit attempt per process**).
- Back button: gameplay me **pause** (run bacha), menus me standard exit.
- Edge gestures: system back-gesture pe PopScope pause karta hai (mid-run
  exit impossible). Edge-exclusion rects future enhancement.
- UMP consent: 10s cap — consent atka to ads limited-mode me chalu, player
  block nahi hota.

## 10. The Vibe — "Sensory overload with a safety net"

Glitch title, aberration phase, crash shake, haptics on every meaningful
event — **style kabhi readability se mehnga nahi** (devtools-protocol-free,
no external UI libs, 2 fonts). Jo bhi flash/glow hai wo canvas me hai,
DOM me nahi.

---

**Naya feature likhte waqt apne se sirf ek sawal:** *"Iska jawab upar ke
kaunse principle me fit hota hai?"* — agar fit nahi hota, to design dobara
socho.
