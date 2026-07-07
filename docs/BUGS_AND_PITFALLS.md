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

### 5.6 Property Transfer Atomicity

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (steps lost or double-spent) |
| **Root Cause** | If the transfer flow deducts steps from buyer BEFORE crediting seller (non-atomic), a crash between the two operations permanently loses the buyer's steps. |
| **Fix** | `POST /api/properties/transfer` uses Supabase RPC in a single transaction: check buyer balance → deduct → credit seller → transfer property → unlist — all in one `rpc()` call. See `apps/web/src/app/api/properties/transfer/route.ts`. |
| **Prevention** | Any two-step financial transaction MUST be wrapped in a database transaction or RPC. Never use separate client-side API calls for deduct + credit. |

### 5.7 UPDATE RLS Must Be Explicit

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (cannot list/unlist) |
| **Root Cause** | The original `properties` table had only `SELECT` and `INSERT` RLS policies. The new `PATCH` endpoint for listing/unlisting silently failed because users could not UPDATE their own rows. |
| **Fix** | Add explicit `CREATE POLICY "Users can update own properties" ON properties FOR UPDATE USING (auth.uid() = user_id)` — grants UPDATE on user's own rows only. |
| **Prevention** | Any new mutation API must be checked against existing RLS policies. Adding a PATCH or PUT endpoint requires a corresponding UPDATE policy in Supabase. |

### 5.8 profiles LEFT JOIN RLS Block

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (properties invisible in Community tab) |
| **Root Cause** | `loadAllListedProperties()` used `.select('*, profiles(username)')` to get seller usernames. The `profiles` table RLS policy (`auth.uid() = id`) blocks reading OTHER users' profile rows. In Supabase, LEFT JOIN + RLS on the joined table can silently drop the **entire parent row** — not just the joined fields. |
| **Fix** | Remove the `profiles` join entirely: `.select('*')`. Seller names are not shown; cards display "由賣家出售" instead. |
| **Prevention** | When using Supabase client-side joins (`db()` with RLS), understand that RLS on the joined table can filter out rows from the parent query. Use the service role API route pattern (`SUPABASE_SERVICE_ROLE_KEY`) when cross-user data access is required. |

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

### 5.6 Property API Wrong URL Path

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (property popup shows no buy button) |
| **Root Cause** | `RealMap.tsx` called `fetch('/api/properties/check?anchor_lat=...&...)`. The actual route is at `/api/properties` (GET handler), not `/api/properties/check`. |
| **Fix** | Use `fetch('/api/properties?anchor_lat=...&anchor_lng=...&cell_row=...&cell_col=...')` directly. |
| **Prevention** | When adding new API routes, verify the exact URL path matches the file structure in `app/api/`. Next.js `app/api/properties/route.ts` only creates `/api/properties`, not sub-paths. |

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
| **Prevention** | Always add `*.bak`, `*.log`, `.env.local`, `.env.production` to `.gitignore` early. Retroactive cleanup pollutes commit history. |

---

## 12. React useRef + useState Sync Timing (Stale Ref)

### 12.1 Grid Toggle `gridVisibleRef` Read Before Render

| Field | Value |
|-------|-------|
| **Severity** | 🟠 Medium (toggle button doesn't show grid) |
| **Root Cause** | `gridVisibleRef.current = gridVisible` is set during render. When `onClick` → `setGridVisible(true)` is called, React schedules a re-render but hasn't executed it yet. A subsequent call to `updateGrid()` that reads `gridVisibleRef.current` sees the OLD value (`false`) and exits early. |
| **Fix** | Sync the ref synchronously in the onClick handler BEFORE the action: `gridVisibleRef.current = newVal; setGridVisible(newVal); ... updateGrid(...)` — ensures the ref is up-to-date for any function called in the same tick. |
| **Prevention** | When using `useRef` as a "mirror" of `useState` for use in callbacks/event handlers, always update the ref synchronously in the same event handler that calls `setState`, not just in the render body. The render body sync (`gridVisibleRef.current = gridVisible`) only guarantees consistency for the render itself, not for functions called between `setState` and the next render. |

### 12.2 Zoom Auto-Toggle-Off Overriding Manual Toggle

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (toggle button to show grid while zoomed out has no effect) |
| **Root Cause** | When `updateGrid()` detects `zoomFactor ≤ 0`, it auto-toggles `gridVisible` to `false`. If the user presses the toggle button to show while zoomed out, the same `updateGrid()` call (triggered by the toggle) immediately auto-toggles back off. |
| **Fix** | Add a `fromToggle` parameter to `updateGrid()`. When `true`, skip the auto-toggle-off logic. Call `updateGrid(map, anchor, true)` from the manual toggle button, and `updateGrid(map, anchor)` from zoom/move events (use default `false`). |
| **Prevention** | Any "auto state change" logic in shared functions needs a way to distinguish between user-triggered and system-triggered calls. Use an optional parameter (e.g. `fromUser = false`) that callers set appropriately. |

---

## 11. Canvas Overlay Grid — Container Coordinate Drift

### 11.1 Grid Cells Drifting During Map Pan

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (grid not anchored to geographic coordinates) |
| **Root Cause** | Direct canvas overlay was positioned over the map container and drawn using `map.latLngToContainerPoint()`. During pan, Leaflet transforms the tile pane via CSS `translate3d` but the canvas itself doesn't participate in the transform — it stays fixed at `[0,0]` in the container. Even with `move` event + `rAF` redraw, the canvas coordinate system doesn't perfectly track the map's internal offset, causing visible drift. |
| **Fix** | Revert to Leaflet vector layers (`L.Rectangle` per-cell). Each rectangle is a geographic feature added to Leaflet's overlay pane — Leaflet automatically handles all CSS transforms during pan/zoom/fly. No per-frame redraw needed. |
| **Prevention** | Never use a bare `<canvas>` element positioned outside Leaflet's overlay pane for geographic rendering. Always use `L.GridLayer`, `L.Rectangle`, or other native Leaflet layers. Canvas overlays break because they don't participate in Leaflet's coordinate transform pipeline. |

### 11.2 Grid Not Visible During `flyTo` Animation

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (grid hidden mid-animation) |
| **Root Cause** | Canvas overlay only redrew on `moveend`/`zoomend` events. `flyTo()` and `setView({ animate: true })` trigger `move` but `moveend` only fires when the animation completes. Mid-flight, the canvas kept the old content — invisible because the geographic area moved away. |
| **Fix** | Revert to `L.Rectangle` — Leaflet renders vector layers during all animation phases. |
| **Prevention** | Any custom rendering that depends on `moveend` will be invisible during Leaflet animations. Use native Leaflet layers or hook into `move` events with aggressive redraw. |

### 11.3 Canvas Overlay Has No Per-Cell Interactivity

| Field | Value |
|-------|-------|
| **Severity** | 🟢 Minor (no hover/click per cell) |
| **Root Cause** | A single `<canvas>` element cannot have per-polygon click targets. All grid interaction had to be handled through the map's `click` event and manual `getCellInfo()` coordinate detection. |
| **Fix** | Each `L.Rectangle` has its own `click`, `mouseover`, `mouseout` events. Hover tooltip + click highlight animation + Leaflet popup — all native. |
| **Verification** | Pan map → grid stays with geographic landmarks. Click any cell → highlight + popup. Scroll/zoom → no gaps. |

### 11.4 Grid Anchor Instability (Multi-Player) — FIXED v0.35.0

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical (properties scatter across different geographic areas per device/session) |
| **Root Cause** | Grid anchor was dynamically set from the user's first GPS fix (`roundToGrid(lat, lng)` → saved to server via `POST /api/grid-config`). This meant: (1) Different devices at different locations would set different anchors; (2) Same user on different days (different starting GPS) could trigger anchor re-initialization. Properties bought under anchor A would appear in a completely different location when viewed under anchor B. By the time this was discovered, 50 properties existed across **6 different anchors**. |
| **Fix** | (1) Hard-code a single constant `GRID_ANCHOR = {lat: 22.3752, lng: 114.1134}` in `RealMap.tsx`. (2) Remove `fetchGridAnchor()` / `setGridAnchor()` / `roundToGrid()` — client no longer fetches or sets the anchor. (3) SQL migration: for each of the 50 properties, calculate its actual center `(anchor_lat + row * CELL_SIZE_DEG + CELL_SIZE_DEG/2)`, then recalculate row/col relative to the unified anchor. Resolved 3 duplicate-cell conflicts by shifting to nearest free cell. (4) Fixed `fetchLocationName()` — was passing just the anchor lat/lng to the geocoding API; now passes the property's actual **cell center** coordinates so location names are correct. |
| **Prevention** | Anchor must be a **compile-time constant** for any grid-based multi-player game. Never derive the anchor from a runtime value (GPS fix, user input, etc.). If the anchor needs to change, plan a coordinated data migration that recalculates all property positions. |

---

## 10. GPS Warmup + Map Animation Interference

### 10.1 Warmup Positions Interrupting `fitBounds` Animation

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (initial zoom animation never completes) |
| **Symptom** | When opening the app with saved trails, the map zooms way out (fitBounds) but never zooms back in to the user's current location. The flyTo timeout is silently lost. |
| **Root Cause** | GPS warmup (5 readings at ~1s intervals) calls `setMapPos` for each reading. This triggers the position-sync `useEffect`, which calls `map.setView(position, zoom, { animate: true })`. This Leaflet API calls `map.stop()` internally, which **interrupts the fitBounds animation mid-flight**. Since fitBounds never completes its zoom change, the `zoomend` event never fires. The `map.once('zoomend', ...)` listener that starts the 1.5s timeout → `flyTo()` sequence never fires, so the zoom-in animation is permanently lost. |
| **Fix (two-part)** | |
| | 1. **Remove `setMapPos` during warmup** (`page.tsx`): Warmup readings only update `last.current` (heading reference). The map doesn't update until the 6th reading (first real GPS fix). |
| | 2. **`initialAnimBusyRef` guard** (`RealMap.tsx`): A ref flag that's `true` from `fitBounds` start until `flyTo` completes. During this window, the position-sync effect skips `map.setView()` entirely (`else if (!initialAnimBusyRef.current)`), protecting the animation sequence from being interrupted by subsequent position updates. |
| **Prevention** | Any Leaflet animation sequence that uses `map.once('zoomend', callback)` must be protected against `setView`/`setZoom`/`fitBounds` calls that might fire during the animation. Use a busy flag ref that blocks view-altering operations during multi-step animation chains. Beware that Leaflet's `setView({ animate: true })` calls `map.stop()` which aborts *any* in-progress animation including fitBounds. |

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
| Speed gate blocks map position (stationary marker never appears) | All | Separate position update from step counting gates. Call `setMapPos` before the speed/time/displacement checks so the marker shows even when stationary. |
| GPS cold-start jump causes 100k+ phantom steps in one reading | All | Move accuracy check AFTER warmup; first post-warmup reading sets reference point without counting steps |
| `pos.coords.speed === null` on iPhone leads to `'stationary'` mode blocking all steps | iOS | Default movement mode to `'walk'` when speed is unavailable; only gate on `stationary` / `vehicle` when speed is explicitly known |
| iOS `DeviceOrientationEvent.requestPermission()` silent fails in React useEffect / synthetic onClick | iOS | Use native DOM `document.addEventListener('click', grant, { once: true })` — iOS only recognises direct DOM event for permission prompts |
| Concurrent state updates (popups) | All | Dismiss old before showing new |
| Silent item acquisition (no popup) | All | Always show visible confirmation for acquired items |
| Multiple independent modal triggers | All | Use ref-based queue system with pending refs |
|| Map compass arrow direction/wrong pivot | All | SVG path + GPS trajectory heading (`atan2`) + same-container rotate |
||| **ModalPortal animation creates click trap on grandchildren** | All | Fade-in/out animation (`opacity: 0` + rAF state machine) created a transparent overlay that trapped clicks. `pointer-events: none` does NOT cascade to grandchildren — `.fixed-modal-layer` had default `pointer-events: auto` and intercepted all clicks during the animation window. Repeated cycles accumulated timing race conditions causing cards to become permanently unresponsive after 4-5 opens. **Fix:** Remove all animation from ModalPortal. Render children instantly with no transition or state machine. Verified: 30-cycle stress test at 50ms intervals. (`src/components/ModalPortal.tsx` v0.35.4) |
|| **Map auto-centers on every GPS update, ignores user pan** | All | `else if (!initialAnimBusyRef.current) { map.setView([lat, lng], ...) }` in position sync runs on EVERY position fix, overriding user's manual pan. **Fix:** Remove the else-if block entirely. Only center on initial zoom. Add a 🎯 recenter button instead. |
|| **Map remounts every tab switch** | All | `{tab === 'map' && (<RealMap />)}` causes React to unmount/remount the entire Leaflet map when switching away and back. **Fix:** Always render the map tab div, toggle visibility via `style={{ display: tab === 'map' ? '' : 'none' }}`. |
|| **GPS position drift bearing causes random arrow direction** | All | Computing `atan2(dLng, dLat)` from consecutive GPS positions at walking speed gives unreliable bearing (GPS noise ~5-10m). Arrow points in random direction when user stands or walks slowly. **Fix:** Remove bearing computation entirely. Arrow only updates from compass (`deviceHeading`) or Geolocation API `coords.heading`. Defaults to north (0°) when no source available. |
|| **Compass arrow jitters on large turns** | All | CSS `transition: 0.25s ease` on arrow rotation is longer than state throttle (100ms). Each new heading arrives before the previous transition completes, causing visible vibration. **Fix:** Change transition to `0.08s ease-out` (faster than 100ms throttle). Each transition completes before the next update. |

---

| 5.9 | **Geocode server proxy response format mismatch** | All | Client `processGeocodeQueue` parsed `data?.address` from `/api/geocode` response, but server proxy returns `{label, detail, full}` format — not raw Nominatim JSON. Caused `addr = {}` always → no district/suburb → "📍 未知地區" for every cell. **Fix:** Read `data.label` / `data.detail` / `data.full` directly from server response. |
||---|---|---|---|

---

## 11. Map Grid Flag & Highlight Bugs

### 11.1 Flags Not Appearing After Purchase

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical |
| **Symptom** | After buying a property, the 🚩 flag does not appear on the map. Refreshing the page shows it. |
| **Root Cause** | Flag code was inside `updateGrid()`, which only runs on map `moveend`/`zoomend`. After buying, `ownedCells` prop updates but `updateGrid()` is not called. Also `updateGrid()` clears all flags at the start, so even existing flags get wiped. |
| **Fix** | Extract flags into standalone `placeAllFlags(map)` function. Managed by `useEffect([ownedCells])` — fires on every owned cell change. |

### 11.2 Highlight Overwritten by Owned Cell Style

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Symptom** | Standing on an owned cell: golden highlight is invisible, only owned-cell dim fill shows. |
| **Root Cause** | `isHighlightCell` `rect.setStyle()` ran BEFORE `isOwned` `rect.setStyle()`. Owned style overwrote highlight's `fillOpacity: 0.7` -> `0.2` and golden border. |
| **Fix** | Reverse order: owned check runs first, highlight runs second. Last `setStyle()` wins. |

### 11.3 Grid Not Rebuilt on `ownedCells` Change

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Symptom** | After selling/unlisting a property, flag remains on map. |
| **Root Cause** | No `useEffect` watching `ownedCells`. Grid only rebuilds on `moveend`/`zoomend`. |
| **Fix** | Add `useEffect(() => { placeAllFlags(mapRef.current) }, [ownedCells])`. |

---

## 12. Trail Day Filter Pitfalls

### 12.1 `useEffect` Comparison Preventing Regeneration

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Symptom** | Clicking a day in the weekly chart doesn't change the heatmap/trails visible — all days still show. |
| **Root Cause** | The `useEffect` syncing `trailDayFilter` prop had a `next !== prev` guard. On initial render, both `trailDayFilter` prop and `trailDayFilterRef.current` were `null`, so first effect run skipped. When prop changed to a day index, `prev` (from ref) was also `null`... but edge cases with SSR hydration caused stale comparisons. |
| **Fix** | Remove the `next !== prev` guard entirely. Always regenerate heatmap and show/hide polylines when the effect fires. |

### 12.2 Polyline Filter Without Heatmap

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Symptom** | Clicking a day filters the heatmap overlay but the dashed trail polylines still show all days. |
| **Root Cause** | `generateTrailHeatmap(filterDay)` correctly aggregated only the filtered day's grid cells, but `polylineByDay` / `vehiclePolylineByDay` layers were not hidden. The polylines remained visible regardless of the filter. |
| **Fix** | Add `map.addLayer`/`map.removeLayer` logic for each polyline in the `trailDayFilter` useEffect. Use `map.hasLayer(poly)` guard to avoid redundant operations. |

### 12.3 Overview Toggle Resetting Day Filter

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Symptom** | When trail overview (👣) toggles OFF, all polylines were restored, losing the day filter state. |
| **Root Cause** | `toggleTrailOverview` in OFF path called `polylineByDay.current.forEach(poly => map.addLayer(poly))` which restored ALL polylines regardless of filter. Also reset `trailDayFilterRef.current = null`. |
| **Fix** | Remove the restore-all-polylines code. Don't reset `trailDayFilterRef.current` in the OFF path. Day filter should persist in normal map mode too. |

### 12.4 Default Day Filter = Today

| Field | Value |
|-------|-------|
| **Severity** | 🟢 Low (enhancement) |
| **Symptom** | On page load, all 7 days' trails were visible. User wanted only today's trails by default. |
| **Root Cause** | `useState<number \| null>(null)` — no default filter. |
| **Fix** | Change to `useState<number \| null>(new Date().getDay())`. On page load, only today's trail polylines are visible. Clicking today's bar again sets `null` to show all. |

### 12.5 Property Flags Tied to Grid Toggle (Not Day Filter)

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Symptom** | Clicking a day filter hides non-matching trail polylines, but 🏠 property flags remain visible on all owned cells regardless of filter. |
| **Root Cause** | `placeAllFlags()` creates all flags unconditionally on init — no coupling to grid visibility state. |
| **Fix (v0.35.3)** | Flags are now **exclusively tied to the grid toggle** (`gridVisible`), NOT day filter. `placeAllFlags()` is only called when grid toggle is ON. Day filter only affects trail polylines — flags show on ALL days (or none, depending on grid state). |
| **Key Insight** | Flags display owned cells, not visited cells. Day filter is for walking trails only. Mixing them was architecturally wrong. Store `flagMarkerByCell` for individual marker access, but control visibility through `gridVisibleRef.current` + grid toggle button handler. |

---

---

## 13. ModalPortal Animation Click Trap (Fixed v0.35.4)

### 13.1 Transparent Overlay Intercepts Clicks During Animation

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical (cards unresponsive after 4-5 cycles) |
| **Symptom** | Opening/closing property cards 4-5 times causes all pet-grid cards to stop responding to clicks. Reloading the page fixes it temporarily. |
| **Root Cause** | Three interacting problems: (1) ModalPortal fade-in used `opacity: 0` → rAF → `opacity: 1`, creating a 16ms+ window where the overlay is transparent but present in the DOM. (2) CSS `.modal-portal-wrapper > * { pointer-events: auto }` gives grandchildren like `.fixed-modal-layer` `pointer-events: auto` — `pointer-events: none` does NOT cascade to descendants. (3) The rAF-based state machine accumulated timing race conditions over multiple cycles, eventually leaving the overlay in a state where it permanently blocked clicks to cards behind it. |
| **Fix (v0.35.4)** | Remove ALL animation logic from ModalPortal. Children render instantly via simple conditional: `children ? <div>{children}</div> : null`. No transition, no opacity animation, no rAF state machine. The 16ms invisible overlay window is eliminated entirely. |
| **Additional isolation (v0.36.0)** | Property Detail Modal is now rendered **inline** in `page.tsx` (not through ModalPortal), using a conditional `{detailProperty && (<div className="fixed-modal-layer">...)}` pattern. This eliminates any interaction between the property modal and ModalPortal's state machine. PetDetailModal, NotificationModal, ProfileModal, and other complex modals still use ModalPortal. |
| **Why no animation?** | The fade-in was purely cosmetic (< 300ms). Eliminating it removes an entire class of race-condition bugs at negligible UX cost. Verified with 30-cycle stress test at 50ms intervals — 100% pass rate. |
| **Prevention** | Any portal-based overlay system must guarantee ZERO invisible DOM elements that can intercept events. If animation is needed, use `display: none` + CSS `transition-delay` (not setTimeout/rAF) with proper `visibility` coordination. |

*Last updated: 2026-07-07. Add new entries at the top when you discover new pitfalls.*

---

## 14. Cross-User Flag Visibility (Fixed v0.37.0)

### 14.1 Other Users' Flags Never Appear

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (flags only shown for current user's cells) |
| **Symptom** | User A buys a cell → flag appears on User A's map. User B logs in → cannot see User A's flag even when zoomed in with grid enabled. |
| **Root Cause** | `placeAllFlags()` in RealMap.tsx read from `ownedCellsRef.current`, which was built from `loadProperties(userId)` — a Supabase query filtered by `user_id`. Only the current user's cells were ever returned, so flags only showed for cells owned by the logged-in account. |
| **Fix (v0.37.0)** | New API route `/api/properties/all-cells` fetches ALL occupied cells using `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). `loadUserProperties()` auto-refreshes this data after buy/sell. `placeAllFlags()` now iterates over `allFlagCellsRef.current` (`FlagCell[]` array) instead of `ownedCellsRef.current` (`Set<string>`). |
| **Files changed** | `route.ts` (new all-cells endpoint), `supabase-db.ts` (new `FlagCell` type + `fetchAllFlagCells()`), `page.tsx` (new `allFlagCells` state integrated into `loadUserProperties()`), `RealMap.tsx` (switched flag source to `allFlagCells`) |
| **Prevention** | Any feature that needs cross-user data (e.g. leaderboard, PvP, trade visibility) must use an API route with `SUPABASE_SERVICE_ROLE_KEY` — never rely on client-side Supabase queries which are subject to RLS. RLS only shows the current user's own rows unless specifically configured otherwise. |

---

## 15. D-Pad Interval Race Condition (Fixed v0.37.1)

### 15.1 onMouseDown Interval Never Fires Before onMouseUp

| Field | Value |
|-------|-------|
| **Severity** | 🟠 High (D-pad appears usable but does nothing on click) |
| **Symptom** | Tapping any D-pad arrow button (▲◄►▼) yields no movement. Coordinates don't change. Holding the button for <150ms also does nothing. |
| **Root Cause** | `startManualWalk(dir)` created a `setInterval(updateFn, 150)` and set it as `manualWalkRef.current`. Button `onMouseDown` fired `startManualWalk`, but `onMouseUp` fired `stopManualWalk` within ~50ms — before the interval's first callback at 150ms. The interval was cleared before it ever executed, so `mapPos` was never updated. |
| **Fix (v0.37.1)** | Extracted `stepManualWalk(dir)` that calls `setMapPos()` **synchronously** on every press. `startManualWalk` now calls `stepManualWalk` immediately, then sets up the interval only for continued movement while held. Even a sub-150ms tap produces one position update. |
| **Files changed** | `apps/web/src/app/page.tsx` — added `stepManualWalk()`, refactored `startManualWalk()` to call it synchronously + start interval |
| **Prevention** | Any interaction pattern that uses `onMouseDown` to start an async timer + `onMouseUp` to cancel it must ensure the **first action is synchronous**. The timer should only add **repeat** behavior. Test with the shortest possible click/tap (not just held-down) to verify immediate response. On touch devices, also verify `onTouchStart`/`onTouchEnd` fire in the correct order (they do, but the same race condition applies). |

---

## 13. React State Batching — setState Inside Cross-Component Callback

### 13.1 Monster Encounter Modal Never Renders (setEncounter Called but State Not Applied)

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical (monster encounter invisible) |
| **Symptom** | Walking into a monster cell triggers detection logic (console: `TRIGGERING ENCOUNTER!`), `setEncounter(monster)` is called inside the `monsterEncountered` callback, but the modal component (`{encounter && ...}` or `<MonsterModal encounter={encounter}>`) never renders. Console shows no `[Modal]` debug logs. |
| **Root Cause** | Unclear — appears to be a React 18 state-batching issue where `setState` called inside a `useCallback` (with `[]` deps) that was defined in parent component A but invoked from child component B's `useEffect` doesn't trigger a re-render in component A with the new state. The callback reference is stable (empty deps), `setEncounter` is a stable setState function, and the console confirms the callback body executes. But the parent component re-renders with `encounter` still `null`. `ReactDOM.createPortal` with the same condition also fails to render. |
| **Failed attempts** | 1. IIFE inline pattern `{encounter && (() => {...})()}` → no render<br>2. Separate `<MonsterModal>` component → no render<br>3. `ReactDOM.createPortal(conditional content, document.body)` → no render<br>4. Adding `walking` to useCallback deps → no change<br>5. Removing `walkStop()` from callback → no change<br>6. `useCallback(..., [])` vs `useCallback(..., [walking])` → no difference |
| **Fix (v0.37.3)** | Bypass React state entirely: call `showMonsterModal()` which uses **direct DOM manipulation** (`document.createElement('div')` + `innerHTML` + `appendChild`). The overlay is created imperatively in the callback, not via React rendering. Event listeners use `addEventListener`. Modal is closed via `overlay.remove()`. |
| **Files changed** | `apps/web/src/app/page.tsx` — replaced `setEncounter(monster)` with `showMonsterModal(monster, addStRef, logMsg)` |
| **Prevention** | When a React state update from a cross-component callback (parent useCallback → passed to child → called from child's useEffect) consistently fails to trigger a re-render with the new state, bypass the React rendering pipeline entirely with direct DOM manipulation for the specific UI element. This is a last resort — only after exhausting all React debugging approaches. |
