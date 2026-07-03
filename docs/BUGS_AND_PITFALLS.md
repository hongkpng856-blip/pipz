# Pipz Bugs & Pitfalls

> **Purpose:** Comprehensive record of every bug, mistake, and hard-learned lesson during Pipz development. This file exists so that other agents (web, iOS, or Android) can avoid repeating the same errors.
>
> **Rule:** When starting a new feature or fixing a bug on any platform, **search this file first** for similar patterns.

---

## 1. iOS Stacking Context & CSS Positioning

### 1.1 `position: fixed` + `body { position: fixed }` → Click Dead Zones

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical (all UI unclickable) |
| **Root Cause** | `body { position: fixed; }` on iOS Safari causes all child elements to lose correct click areas. `position: fixed` forces a new containing block that clips/intercepts pointer events. |
| **Fix** | Replace `body { position: fixed; width: 100%; }` with `overflow: hidden`. The layout wrapper (`.layout`) handles positioning with `position: relative`. |
| **Platforms** | iOS PWA only (desktop Chrome fine) |
| **Prevention** | Never set `position: fixed` on `<body>`. Use a wrapper div with `position: relative; overflow: hidden;` instead. |

### 1.2 Leaflet Tile Pane z-index Override

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical (modals invisible behind map) |
| **Root Cause** | Leaflet internally sets `z-index: 200` on `.leaflet-tile-pane` and uses GPU compositing (`translate3d`). CSS overlays with `z-index: 100` render **behind** the map tiles. |
| **Fix** | Raise `.fixed-modal-layer` to `z-index: 9999`. Add `isolation: isolate` to force a fresh stacking context. |
| **Prevention** | Always set modal z-index above 200 when Leaflet is present. Verify with DevTools > Computed > z-index. |

### 1.3 `!important` Blocking Inline Override

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (layout misalignment) |
| **Root Cause** | CSS class `.fixed-modal-layer` had `inset: 0 !important`. Inline `style={{ bottom: '85px' }}` could NOT override because `!important` in CSS class > inline style without `!important`. |
| **Fix** | Remove `!important` from positioning properties (`inset`, `top`, `left`, `right`, `bottom`). Keep `!important` only on `position: fixed` and `z-index`. |
| **Prevention** | CSS discipline: `!important` only on properties that must **never** be overridden. Layout/positioning properties should always be overrideable. |

### 1.4 React Portal Wrapper → Blank Screen

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical (nothing clickable) |
| **Root Cause** | ModalPortal component rendered a persistent wrapper div (even when modal closed) that covered the entire screen, intercepting all pointer events. |
| **Fix** | Return `null` when no children, or use pure `createPortal(children, document.body)` without wrapper. |
| **Code** | `ModalPortal.tsx`: `if (!mounted) return null; return createPortal(children, document.body)` — no wrapper div. |

### 1.5 `body { position: fixed }` + Modal Portal

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical (modal content invisible behind map) |
| **Root Cause** | `body { position: fixed; }` creates a new containing block in iOS Safari. Elements rendered via `createPortal` to `document.body` get positioned relative to the fixed body, not the viewport. |
| **Fix** | Remove `body { position: fixed; }` entirely. Replace with `overflow: hidden`. |
| **Platforms** | iOS Safari / PWA only |
| **Prevention** | Test modal overlays on actual iOS device after every CSS change to `body` or `html`. |

---

## 2. Modal/Popup Stacking & Overlap

### 2.0 Egg Encounter No Popup (Silent Save)

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (user can't see egg found) |
| **Root Cause** | `addSt()` egg encounter only called `addPixelLabEgg()` → `logMsg()` + `setTab('eggs')`. No UI confirmation — user might not notice they found an egg. |
| **Fix** | Add `eggFoundData` state. When egg triggers: save to DB, then show popup with 🥚 icon, egg name, rarity badge, and two buttons (收埋 / 去蛋頁面孵化). |
| **Prevention** | Any "item acquired" event must show a visible popup/notification, not just a log message. |

### 2.0.1 Event & Egg Trigger Simultaneously (Queue Missing)

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (one modal lost behind other) |
| **Root Cause** | Both event check and egg check run synchronously in `addSt()`. If both trigger, only `setCurrentEvent(ev)` runs (event shows). Egg is saved silently — no popup ever appears. |
| **Fix** | Add `pendingEggRef` and `pendingEventRef` (useRef). If both trigger: show event, queue egg. On event dismiss (`handleEventChoice`): check `pendingEggRef` and show egg popup. If egg showing and event triggers: queue event in `pendingEventRef`. On egg dismiss (`dismissEggFound`): check `pendingEventRef` and show event. |
| **Prevention** | Any system with multiple independent modal triggers must have a queue/priority mechanism. Never assume only one modal type will fire at a time. |

### 2.1 Multiple Popups Overlapping

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (two modals at once) |
| **Symptom** | Event popup appears behind new-pet popup (or vice versa) |
| **Root Cause** | Both modals render simultaneously — their `if (state)` conditions both return true. |
| **Fix** | Auto-dismiss lower-priority popup before showing new one. In `addSt()`: `if (newPetId) dismissNewPet()` before `setCurrentEvent()`. |
| **Prevention** | Before opening any modal, explicitly close conflicting modals. Never assume only one modal will be open at a time. |

### 2.2 Popup Not Dismissing (Reopening on Re-render)

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (annoying UX) |
| **Root Cause** | `useEffect` auto-detect re-detected the same pet as "new" after each render because it only checked `createdAt`, not a dismissal set. |
| **Fix** | Add `dismissedNewPets` ref Set. Auto-detect effect checks `!dismissedNewPets.current.has(p.id)` before setting `newPetId`. On dismiss: add pet ID to the set. |
| **Prevention** | Any auto-detect "new item" feature needs a dismissal tracker (ref Set), not just a boolean state. |

### 2.3 Notification Modal Covers Bottom Nav

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (nav hidden) |
| **Root Cause** | Modal used `position: fixed; inset: 0` which covers the entire viewport, including the bottom navigation bar. |
| **Fix** | Override bottom edge: `bottom: 85px` + `height: calc(100dvh - 85px)` on the notification modal specifically. This leaves space for the bottom nav. |
| **Prevention** | Full-screen modals with bottom nav: either (a) render nav at higher z-index, or (b) limit modal bottom to leave nav visible. Option (b) is cleaner. |

---

## 3. Stale Closure & React Refs

### 3.1 setInterval Stale State

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (simulation uses stale values) |
| **Symptom** | Walk simulation interval shows old step count, doesn't trigger events correctly |
| **Root Cause** | `setInterval` callback captures closure variables at creation time. When state changes, the interval still sees old values. |
| **Fix** | Store critical functions in `useRef`: `addStRef.current = addSt`. Simulation reads `addStRef.current(steps)` instead of `addSt(steps)`. |
| **Prevention** | Any `setInterval`/`setTimeout` that reads state MUST use refs for the state/function it calls. |

### 3.2 GPS watchPosition Closure

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical (steps not counting correctly) |
| **Root Cause** | `navigator.geolocation.watchPosition` callback captures `addSt` / `pets` / `user` at subscription time. After re-render, these are stale. |
| **Fix** | Use refs for ALL state read inside `watchPosition` callback: `stepsRef`, `userRef`, `petsRef`. Read from `.current` when computing steps. |
| **Prevention** | Any callback registered with browser API (`watchPosition`, `setInterval`, `addEventListener`, `requestAnimationFrame`) must use refs, not closure variables. |

### 3.3 Event Check Used `pet` Instead of `petRef`

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (event fails silently) |
| **Root Cause** | `if (... && pet)` inside `addSt()` — `pet` is a render-cycle variable that's stale inside the state-update callback. |
| **Fix** | Use `petRef.current` for all checks inside `addSt()`. |
| **Prevention** | In any function that's called from effects/timers: use refs for reading state, not render-cycle variables. |

---

## 4. GPS Tracking Issues

### 4.1 Spurious Step Counting (GPS Drift)

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (inaccurate steps) |
| **Causes** | GPS noise — even standing still, coordinates can drift 5-20m, causing phantom steps |
| **Fix (multi-layer):** | |
| | 1. **Warmup**: Skip first 5 GPS readings (sensor stabilization) |
| | 2. **Accuracy gate**: Ignore readings with `accuracy > 50m` |
| | 3. **Speed check**: Ignore if `speed < 0.5 m/s` (~1.8 km/h — user isn't walking) |
| | 4. **Time gate**: Ignore updates faster than 3s apart |
| | 5. **Min displacement**: Only count steps when `distance > 5m` from last valid point |
| **Prevention** | ALL 5 filters must be implemented together. Any single one is insufficient. |

### 4.2 Steps Formula

| Field | Value |
|-------|-------|
| **Severity** | 🟢 Info (calibration) |
| **Formula** | `steps = floor(distance_in_meters × 1300)` — 1 meter ≈ 1.3 steps. |
| **Method** | Haversine formula for distance between two lat/lng coordinates. |
| **Prevention** | Store step count as integer. Use `Math.floor` to avoid floating-point accumulation. |

### 4.3 GPS Not Available on Simulators

| Field | Value |
|-------|-------|
| **Severity** | 🟢 Info (dev only) |
| **Solution** | Dev Tools provide walk **simulation** + manual step injection (+500, +10K buttons) so developers can test without real GPS. |
| **Prevention** | Always provide manual test controls alongside GPS-dependent features. |

---

## 5. Database & API

### 5.1 Market Buy Race Condition

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (double-buy possible) |
| **Root Cause** | No atomic transaction — SELECT balance → deduct → UPDATE → transfer pet. Two concurrent buys could pass the balance check. |
| **Fix** | `/api/market` buy endpoint uses `SUPABASE_SERVICE_ROLE_KEY` with a **stored procedure** or **transaction block** to atomically check balance, deduct, and transfer ownership. |
| **Prevention** | Any "deduct + transfer" operation MUST be atomic. Use stored procedures or Supabase RPC with transaction isolation. |

### 5.2 Pet Skills Lost on Hard Refresh

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical (pets lose abilities) |
| **Root Cause** | Database `pets` table had **no `skills` column**. `petToDb()` never saved skills; `dbToPet()` returned `skills: []`. |
| **Fix** | Add JSONB `skills` column to `pets` table. Serialize/deserialize in `petToDb()`/`dbToPet()`. |
| **Prevention** | Any new non-trivial field must be added to DB schema AND both serialization functions simultaneously. |

### 5.3 Evolution Steps Inflation

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (wrong step counts) |
| **Root Cause** | Evolution didn't deduct the required steps from the pet's `totalSteps`. The accumulated steps persisted, making the next evolution require fewer new steps. |
| **Fix** | `remainingSteps = pet.totalSteps - EVOLUTION_STEPS[currentStage + 1]` — deduct the stage requirement from the pet's steps on evolution. |
| **Prevention** | Any "upgrade/rank-up" system must subtract the resource cost, not just check it. |

### 5.4 Auth Callback Null User

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical (can't login) |
| **Root Cause** | Server-side `/api/auth/callback` always returned `null user` because Supabase session cookies aren't available on server routes in Next.js App Router. |
| **Fix** | Move auth to **client-side**: `exchangeCodeForSession()` in a client component (`useEffect` on mount). The callback route just redirects to `/`. |
| **Prevention** | Next.js App Router server routes cannot read Supabase auth cookies. Always handle Supabase auth callbacks on the client. |

### 5.5 Duplicate Profile (upsert Race)

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (duplicate key errors) |
| **Root Cause** | `SELECT` then `INSERT/UPDATE` has a TOCTOU race — two simultaneous logins create duplicate profiles. |
| **Fix** | Use PostgreSQL `upsert()` (INSERT ON CONFLICT DO UPDATE) in a single query. `ensureProfile()` now uses `.upsert()` with `onConflict: 'id'`. |
| **Prevention** | Never SELECT-then-INSERT. Always use upsert. |

---

## 6. Pixel Art & UI Rendering

### 6.1 PICO-8 Gray Background Remnants

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (white dots on dark bg) |
| **Root Cause** | PICO-8 sprites have `rgb(194,195,199)` (light gray) pixels that appear as "white dots" on the dark app background. |
| **Fix** | (1) Bulk-remove `#C2C3C7` pixels → transparent in all 50 sprite files. (2) Add `removeBg()` render-time safety net: both `PixelPetCanvas.tsx` and `PetCompanion.tsx` strip `(194,195,199)` at draw time. (3) Cache-bust via `SPRITE_VERSION` bump. |
| **Prevention** | Any sprite with a fixed palette (PICO-8, retro) must have its "background" colour explicitly mapped to transparent. |

### 6.2 Pixel Art Blurred on Canvas

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (blurry pixels) |
| **Root Cause** | Canvas default `imageSmoothingEnabled = true` uses bilinear interpolation, blurring pixel art. |
| **Fix** | `ctx.imageSmoothingEnabled = false` on both canvas renderers (`PetCompanion.tsx`, `PixelPetCanvas.tsx`). |
| **Prevention** | Always disable image smoothing on any canvas that renders pixel art. |

### 6.3 Sprite Flash on Tab Switch

| Field | Value |
|-------|-------|
| **Severity** | 🟢 Minor (visual glitch) |
| **Root Cause** | React reused the canvas DOM element when pet changed, so old sprite briefly showed before new pet loaded. |
| **Fix** | Add `key={pet.id}` to every `PixelPetCanvas` instance — React unmounts/remounts canvas when pet changes, preventing stale sprite flash. |
| **Prevention** | Any canvas that displays dynamic data needs a unique `key` prop to force proper remounting. |

### 6.4 Walk Animation Flip (Wrong Direction)

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (pet walks backwards) |
| **Causes** | Multiple regressions: |
| | 1. Flip logic inverted (`if (facingLeft) scale(-1,1)` vs `if (!facingLeft) scale(-1,1)`) |
| | 2. Merge conflict re-introduced old lateral sway (`xOff = dir * 6`) |
| | 3. PNG sprite path didn't flip at all for generic species |
| **Fix** | Per-species facing detection: Cat frames face RIGHT, Shiba/generic face LEFT. Combined `shouldFlip` condition for both canvas and PNG paths. |
| **Prevention** | When fixing flip animations, verify BOTH rendering paths (canvas grid + PNG sprite) and ALL species. Write a visual regression test. |

### 6.5 Map Compass / Heading Arrow Misaligned

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (arrow direction wrong or jittery) |
| **Symptom** | The direction arrow on the map marker either points the wrong way, jitters erratically, or has a rotated/offset pivot point |
| **Root Cause** | Three independent issues: |
| | 1. **CSS border triangle** had unpredictable `transform-origin` — the visual arrow didn't rotate around its centre, causing offset/pivot misalignment |
| | 2. **`pos.coords.heading`** (device compass heading) is unreliable — many devices return `null`, 0, or wildly fluctuating values, especially when phone orientation changes |
| | 3. **Arrow and circle rotated separately** — if only the arrow rotates inside a fixed circle container, there's a visual disconnect and the arrow can clip against the circle edge |
| **Fix** | |
| | 1. **SVG `<path>` arrow** instead of CSS border triangle — explicit `viewBox="0 0 16 12"` with `M8 0L16 12H0z` triangle, no transform-origin ambiguity |
| | 2. **GPS trajectory heading** (`atan2(dLng, dLat)`) instead of `pos.coords.heading` — compute actual movement direction from successive GPS position deltas |
| | 3. **Min 1m displacement gate** — discard tiny GPS fluctuations (<1m) that cause 180° heading flips when standing still |
| | 4. **Arrow + circle in same wrapper `<div>`** — `rotate()` on the parent div rotates both the SVG arrow AND the circular container together as one unit, preventing visual disconnect |
| **Prevention** | Never trust `pos.coords.heading` for walking direction — compute heading from `atan2(dLng, dLat)` with a min-displacement threshold. Use SVG `<path>` for direction indicators, not CSS border triangles. Wrap all marker elements in a single container for rotation.

---

## 7. Performance & Build

### 7.1 Vercel Build Cache Stale Env Vars

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical (wrong env vars deployed) |
| **Root Cause** | `vercel link` command wipes environment variables. `vercel env add` with project scope doesn't override old values. |
| **Fix** | Use `--value` flag for `vercel env add` commands. Avoid running `vercel link` on production projects. Use `vercel env pull` to inspect current values before modifying. |

### 7.2 vercel.json Conflicting with Dashboard Settings

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical (deploy failure) |
| **Root Cause** | Committing `vercel.json` with framework config that conflicts with Vercel Dashboard settings. |
| **Fix** | Remove `vercel.json` from repo. Configure all build settings through Vercel Dashboard only. |
| **Prevention** | Don't commit `vercel.json` unless you exclusively use CLI-based configuration. |

### 7.3 Service Worker Caching Stale Assets

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (users see old sprites) |
| **Root Cause** | PWA service worker has cache-first strategy. When sprites change, users served stale cached versions until SW is manually updated. |
| **Fix** | Version cache name: `pipz-v1` → `pipz-v2` on SPRITE_VERSION bump. Users get fresh assets on next page load. |
| **Prevention** | Version the service worker cache name with each asset update. Never use a static cache name. |

---

## 8. TypeScript & Build

### 8.1 Stale Canvas on Pet Tab Switch

Similar to 6.3 — resolved via `key={pet.id}`.

### 8.2 Missing `skills` Field in Pet (see 5.2)

---

## 9. Git & Collaboration

### 9.1 Merge Conflict Re-introducing Bugs

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (regression) |
| **Symptom** | Multiple occasions where a merge of two branches re-introduced code that had been intentionally removed, such as lateral sway `xOff = dir * 6` and flip animation logic. |
| **Fix** | After every merge, review the **diff** between the merged result and each parent branch. Auto-merge can silently resurrect dead code. |
| **Prevention** | Run `git diff <parent1>..HEAD` and `git diff <parent2>..HEAD` after merge commits. Verify intentional deletions are still absent. |

### 9.2 `.gitignore` for Generated Files

| Field | Value |
|-------|-------|
| **Severity** | 🟢 Minor |
| **Lesson** | Always add `*.bak`, `*.log`, `.env.local`, `.env.production` to `.gitignore` early. Retroactive cleanup pollutes commit history. |

---

## Quick Reference: Bug Patterns by Platform

| Pattern | Likely Platforms | Key Fix |
|---------|-----------------|---------|
| `position: fixed` on `<body>` | iOS PWA | Use `overflow: hidden` instead |
| Leaflet z-index < 200 | iOS + Android | Set modal z-index to 9999 |
| Stale closure in browser API callbacks | All | Use `useRef` for all closure reads |
| `setInterval` stale state | All | Ref the callback function |
| Missing DB column for new field | All | Add column + serialize/deserialize at the same time |
| TOCTOU race in DB operations | All | Use upsert/atomic transactions |
| Pixel art blurring | All | `imageSmoothingEnabled = false` |
| `!important` blocking overrides | All | Only use `!important` on truly invariant properties |
| Merge conflict resurrecting dead code | All | Manual review of merge diffs |
| Concurrent state updates (popups) | All | Dismiss old before showing new |
| Silent item acquisition (no popup) | All | Always show visible confirmation for acquired items |
| Multiple independent modal triggers | All | Use ref-based queue system with pending refs |
| Map compass arrow direction/wrong pivot | All | SVG path + GPS trajectory heading (`atan2`) + same-container rotate |

---

*Last updated: 2026-07-31. Add new entries at the top when you discover new pitfalls.*
