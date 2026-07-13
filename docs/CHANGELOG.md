# Changelog

## v0.40.2 — Sync cardTab on Bottom Nav, Remove Map Details Row from Extended Content (2026-07-12)

### Fixed
- **Map showed pet content after returning from pets page:** The bottom nav bar (`bottom-nav`) only set `tab` when clicking 🗺️/🐾/🏠/🏪/🎒, leaving `cardTab` unchanged. Navigating to pets page via card buttons (which set `cardTab='pets'`) and back via bottom nav (which didn't set `cardTab`) left `cardTab='pets'`, so the card showed pet content on the map. Fixed by `onClick={() => { setTab(t.k); setCardTab(t.k); }}` on both nav button sets (card nav + bottom nav).

### Cleaned
- **Removed 3-column map details row from map extended content:** The map tab's extended section (revealed by pull-up) contained "已佔領地", "插旗點", "寵物狀態" stats that the user didn't want. Only the weekly bar chart remains.

### Changed
- Both `card-nav` (inside the map card) and `bottom-nav` (shown on non-map tabs) now set both `tab` and `cardTab` in sync.
- Card nav buttons: `onClick={() => { setCardTab(t.k); setTab(t.k); }}`
- Bottom nav buttons: `onClick={() => { setTab(t.k); setCardTab(t.k); }}`

## v0.40.1 — Card Nav Stays on Map, "詳細" Buttons for Full Page (2026-07-12)

### Fixed
- **Card nav buttons no longer navigate away from map:** `onClick` changed back to `setCardTab(t.k)` only (removed `setTab(t.k)`). Clicking 🐾/🏠/🏪/🎒 in the card now switches card content while keeping the map visible.
- **Map extended content (3-column row) was wrapping all tab content:** The pet/property/community/inventory tab sections were accidentally nested inside the map details 3rd column (`宠Pet狀態`). Fixed by closing the map flex row before the other tabs' extended content.

### Added
- **"詳細" button in each non-map tab's extended section:** A button at the bottom of 🐾 (寵物詳情 →), 🏠 (地產詳情 →), 🏪 (社群詳情 →), 🎒 (背包詳情 →) that sets `tab` to navigate to the full page when the user wants more detail.

### Changed
- **Card nav buttons:** Only `setCardTab`, never `setTab`. Page navigation is opt-in via the "詳細" button in extended content.
- **BUGS_AND_PITFALLS.md** updated Section 17 with correct fix.

## v0.40.0 — Tabbed Card Content: Each Nav Button Shows Its Own Preview + Extended (2026-07-12)

### Added
- **Tab-switching card content (`cardTab` state):** The draggable card now shows different content depending on which of the 5 bottom nav buttons is active. 🗺️ shows steps + chart; 🐾 shows pet preview + skills; 🏠 shows property stats; 🏪 shows community info; 🎒 shows backpack summary.
- **Preview + Extended sections per tab:** Each tab has a compact Preview (measured by `innerRef`, always visible at collapsed state) and an Extended section below it (revealed when the card is pulled up, clipped by `overflow:hidden` on the flex wrapper).
- **Tab persistence across page switches:** `cardTab` state is independent of page-level `tab` state. When the user navigates to the pets page (🐾) and returns to the map (🗺️), the card remembers which tab was last selected.

### Changed
- **Card nav buttons** now set both `cardTab` (card content) and `tab` (page-level navigation), preserving old full-page access while adding card-level content.
- **Map visibility** remains conditioned on `tab === 'map'` — non-map tabs show their full-page content as before.
- **`innerRef`** only measures the Preview section. Extended content sits below the measured area and is clipped/revealed by the parent's flex-allocated height + `overflow:hidden`.
- **Effect deps** extended to include `cardTab`, so `innerH` is remeasured when the active tab changes.
- **Map Extended content** includes weekly bar chart + owned cells/flags/pet status row.

### Changed files
- `apps/web/src/app/page.tsx` — `cardTab` state added; card inner content switched by tab (5 previews, 5 extended sections); nav buttons set both states; effect deps updated.

## v0.39.10 — Incremental Drag Tracking, Direction-Based Snap, Tap No-Collapse (2026-07-12)

### Fixed
- **Card jumps to 0 when dragging down:** Replaced cumulative `dy = startY - currentY` with incremental `deltaY = prevMoveY - currentY`, adding to `cardDragYRef.current`. Card now smoothly follows the finger in both directions instead of snapping to minimum on any downward movement.
- **Tap after drag collapses card:** Tap now always expands (or no-ops if already expanded). Tapping can never collapse the card — only dragging down collapses.
- **Direction-snap threshold unstable:** Used `cardDragDirRef` (tracks `'up'`/`'down'` on every pointermove > 8px) instead of a fixed pixel threshold for snap-on-release decision.
- **Tap-to-toggle reads stale ref:** `cardDragYRef.current` was never updated in the tap `onUp` path, so a second tap always read `currentY = 0` and expanded again. Now synced in both tap and drag paths.

### Changed
- **onMove:** `deltaY = prevMoveY - currentY` — additive to `cardDragYRef.current`. Clamped to `[0, CARD_MAX_EXTRA]` so the card respects both bounds.
- **onUp — tap:** `setCardDragY(CARD_MAX_EXTRA)` unconditionally. Collapsed → expand; already expanded → React bailout (no-op).
- **onUp — drag:** `cardDragDirRef.current === 'up' ? CARD_MAX_EXTRA : 0` — direction-based snap.
- **`cardDragDirRef`** added (`useRef<'up'|'down'|null>`), reset to `null` in `onPointerDown`, updated on every `pointermove > 8px`.

### Changed files
- `apps/web/src/app/page.tsx` — onMove rewritten (incremental delta, direction tracking), onUp simplified (tap always expands, direction snap for drag), `cardDragDirRef` added.
- `docs/CHANGELOG.md` — this entry.

## v0.39.9 — Fixed Nav Visibility, Proper Content Measurement, iOS Touch Fix (2026-07-12)

### Fixed
- **Nav buttons not visible at collapsed state:** `contentRef` was measuring the `flex:1` wrapper (whose height is flex-allocated), not the actual inner content. Added `innerRef` on a dedicated inner `<div>` wrapping only the numbers + chart, so `innerH` accurately reflects real content height. Card height = `innerH + 24 + navH + cardDragY` now always fits all content.
- **Circular measurement bug:** Previously `contentH` would measure the element's own flex-distributed height, creating a self-reinforcing cycle that never adjusted to true content size. The inner div is unaffected by flex distribution.
- **iOS touch-to-drag not working:** Safari ignores `touch-action: none` on non-root elements. Added native `touchstart`/`touchmove` listeners with `preventDefault()` + `stopPropagation()` on the card element to block scroll interference.

### Changed
- **Drag hit area:** `onPointerDown` moved from the handle `<div>` to the card root `<div>`. Touching anywhere on the card (numbers, chart, empty space) starts a drag — the handle is just a visual affordance.
- **Flex layout finalised:** Card uses `display: flex; flex-direction: column`. Upper content (`flex: 1; overflow: hidden`) collapses/expands during drag. Nav area (`flex-shrink: 0`) is always pinned to the bottom.

### Added
- `cardRef` (on the card root) – native touch intercept for iOS
- `innerRef` (on the true content wrapper) – for accurate height measurement
- `navRef` (on the nav area) – for nav height measurement

### Changed files
- `apps/web/src/app/page.tsx` — major restructure: `innerRef`/`navRef`/`cardRef`, `innerH`/`navH` state, flex layout, `onPointerDown` on card root, native touch intercept effect, height formula uses `innerH + HANDLE_H + navH + cardDragY`
- `docs/CHANGELOG.md` — this entry

## v0.39.8 — Dynamic Card Height, Content Measurement, Nav Visibility Fix (2026-07-12)

### Fixed
- **Nav buttons hidden at start:** Card now measures its content height via `contentRef` (`useRef<HTMLDivElement>`). Collapsed height = `contentH + 24px` (handle), so the five nav buttons (🗺️ 🐾 🏠 🏪 🎒) are always fully visible on first load.
- **Content clipping with fixed height:** Previously used hard-coded `CARD_COLLAPSED` values (180→240→280→300px) which either clipped the nav or wasted space. Dynamic measurement eliminates this trade‑off.

### Changed
- **Card height formula:** `height: contentH + 24 + cardDragY` — always fits the actual content exactly when collapsed, scales linearly during drag, reaches `CARD_TARGET_H` (52 vh) when fully expanded.
- **CARD_TARGET_H adjusted:** Expanded target is now `window.innerHeight × 52%`, computed live. `CARD_MAX_EXTRA` accounts for handle height so the card stops exactly at the halfway point.
- **Handle height (+24px):** Explicitly added to both collapsed and expanded height calculations so the drag handle is never clipped or overlapped.

### Technical notes
- Initial `contentH` state defaults to 400px (generous), preventing clipping on the first paint. A `useEffect` with deps `[weeklySteps, user, steps, totalSteps]` re‑measures after data loads and corrects the height.
- The measurement effect also handles content changes: when weekly chart data arrives or step totals update, the collapsed height re‑adjusts automatically.

### Changed files
- `apps/web/src/app/page.tsx` — added `contentRef`, `contentH` state + measurement effect; card `height` uses `contentH + 24 + cardDragY`; `CARD_MAX_EXTRA` subtracts `contentH + 24`

## v0.39.7 — Finger-Follow Drag with Viewport-Based Height (2026-07-12)

### Changed
- **Drag mechanism:** Replaced native touch/mouse event listeners (useEffect) with React `onPointerDown` + document-level `pointermove`/`pointerup` listeners. No `setPointerCapture` — events track finger reliably even when moving outside the handle.
- **Card sizing:** Switched from `max-height` on inner wrapper to fixed `height` on the card itself (`CARD_COLLAPSED + cardDragY`). Card now forces itself to the target height regardless of content amount.
- **Expanded height:** `CARD_TARGET_H = window.innerHeight × 52%` (dynamically computed), making the card reach approximately the middle of the screen on any device.
- **Touch handling:** `touch-action: none` added to both card and handle divs; `pointerdown` calls `e.preventDefault()`/`e.stopPropagation()` to prevent map pan interference.
- **Tap behavior:** Distinguishes tap (no movement) from drag — tap toggles between collapsed/expanded; drag snaps based on release position (>70px → expand, else collapse).

### Removed
- `useEffect`-based native `touchstart`/`touchmove`/`touchend` `mousedown`/`mousemove`/`mouseup` listeners
- `cardTouchHandled` ref (no longer needed)
- `cardExpanded` state (replaced by `cardDragY` pixel tracking)
- `max-height` collapsible wrapper with inner `<div>`
- Fake expanded content (calories/distance)

### Changed files
- `apps/web/src/app/page.tsx` — full rewrite of drag logic: `CARD_COLLAPSED`, `CARD_TARGET_H`, `CARD_MAX_EXTRA` constants; `onPointerDown` handler with closure-based `onMove`/`onUp`; card `height` + `overflow: hidden` + `transition`
- `apps/web/docs/CHANGELOG.md` — this entry

## v0.39.6 — Expandable Steps Card with Drag Handle (2026-07-11)

### Added
- **Drag handle:** White line at top of steps card — tap to toggle expand/collapse, or drag up/down with smooth `max-height` transition
- **Native touch handling:** `passive: false` on `touchmove` + `preventDefault()` prevents map scroll interference during drag

### Changed
- **Steps card layout:** Content wrapped in collapsible `<div>` with `overflow: hidden` + `max-height` transition (`210px` collapsed → `70vh` expanded); `border-radius: 16px 16px 0 0` added
- **Restored original positions:** Map control buttons (📍🔲👣) back in bottom-right corner of map (reverted from top-right experiment)

### Changed files
- `apps/web/src/app/page.tsx` — card expanded state/refs, native touch/mouse event listeners, drag handle with ref, collapsible wrapper, extra expanded content

## v0.39.5 — Dev Tools in Header, Map Buttons Below Zoom, Nav Integrated into Steps Card (2026-07-11)

### Changed
- **Dev Tools:** Moved from fixed overlay (below header) into header-right as a compact 🔧 button — always accessible, saves vertical space
- **Map control buttons (📍GPS/🔲Grid/👣Trail):** Relocated from bottom-right corner to top-right, stacked below zoom (+/-) controls
- **Bottom nav integration:** 5 nav buttons (🗺️ 🐾 🏠 🏪 🎒) restored inside steps card as an integrated row with separator; bottom-nav hidden on map tab (no duplication)
- **Map area extent:** `position: fixed; top: 42; bottom: 0` — steps card now extends to the very bottom of the screen (instead of `bottom: 62` which left a gap)

### Fixed
- **Map controls behind header/bottom-nav:** Map area constrained to `top: 42` (below header) and visible gap-free — controls no longer hidden by fixed overlays
- **Steps card not flush to bottom:** Changed map fade-up `bottom: 62` → `bottom: 0` so steps card overlay reaches screen bottom
- **Dev Tools button duplication:** Single 🔧 button in header replaces both the full-width bar button and the old overlay toggle

### Changed files
- `apps/web/src/app/page.tsx` — Dev Tools 🔧 in header-right, steps card integrated nav row, map fade-up `bottom: 0`, bottom-nav `display: none` on map tab
- `apps/web/src/app/globals.css` — GPS/grid/trail buttons `top: Npx` (was `bottom: Npx`); updated comments
- `apps/web/src/components/RealMap.tsx` — removed createPortal import

## v0.39.4 — Fullscreen Map with Integrated Bottom Nav + Header Overlay (2026-07-10/11)

### Changed
- **Map tab layout:** `position: fixed; inset: 0; z-index: 1` — map fills entire viewport
- **Steps card:** Semi-transparent overlay at map bottom (`position: absolute; bottom: 0; z-index: 1000; margin-bottom: 0`)
  - `rgba(15,23,42,0.7)` background + `backdrop-filter: blur(8px)`
  - Flush with screen bottom (`margin-bottom: 0` overrides `.section` default)
- **Header:** `position: fixed; top:0; left:0; right:0; z-index: 1001` — spans full viewport width (not limited by `.layout`'s `max-width: 24rem`)
- **Bottom Nav:** `position: fixed; bottom:0; left:0; right:0; z-index: 1001`
- **Dev Tools:** `position: fixed; top:42px; left:0; right:0; z-index: 1002` — always visible above fullscreen map
- **Map tab:** Bottom nav hidden on map tab; navigation integrated into steps card
- **Map control buttons (GPS/Grid/Trail/Zoom):** `z-index: 1000` — sit above steps card overlay (`z-index: 999`)

### Fixed
- **Stacking context:** Header, bottom-nav now use `position: fixed` with `z-index: 1001`, placing them above the fullscreen map in the root stacking context
- **Map controls unclickable:** Steps card `z-index` lowered from `1000` to `999` so control buttons remain clickable
- **Dev Tools hidden by fullscreen map:** Changed from `position: relative` (inside scroll-wrap, behind map) to `position: fixed; z-index: 1002` above everything
- **Header not filling full width:** `position: absolute` only spanned `.layout`'s `max-width: 24rem`; `position: fixed` spans entire viewport

### Changed files
- `apps/web/src/app/page.tsx` — map tab `position: fixed; inset: 0`, steps card `z-index: 999; margin-bottom: 0`, Dev Tools `position: fixed; top: 42; z-index: 1002`
- `apps/web/src/app/globals.css` — header `position: fixed; z-index: 1001`, bottom-nav `position: fixed; z-index: 1001`

## v0.39.3 — Map Layout Redesign: 2/3 Map + 1/3 Steps Card, Remove Exploration Progress (2026-07-09)

### Changed
- **Map tab layout:** full-height flex container (`calc(100dvh - 110px)`) with `flex: 2` for map, `flex: 1` for steps card
- **Gap between cards:** `6px` padding + gap, no wasted space
- **`.real-map-container` height:** changed from `fixed 300px` to `100%` so map fills flex parent
- **`RealMap` root div:** added `height: 100%` to fill flex child

### Removed
- **🎮 探險進度 section** — removed entirely from map tab (event progress bar + egg progress bar + header)
- **⚔️ 事件進度 progress bar** — removed UI
- **🥚 遇蛋機會 progress bar** — removed UI

### Disabled (temporarily commented out)
- **Step-based event rolling:** `eventStepCounter` accumulation every 800 steps, `rollEvent()` call, `setCurrentEvent` trigger
- **Step-based egg encounters:** `eggStepCounter` every 2000 steps, 40% random egg spawn, DB save, modal trigger

### Preserved (still active)
- ❓ Cell events (walking into mystery cells)
- 🏪 Random shops on grid (countdown, trap/surprise)
- 🗺️ Full map functionality (grid, monsters, trails, shops)
- 📊 Stats Card (steps, total steps, daily average, weekly chart)
- All tab navigation, D-pad, GPS

**Changed files:**
- `apps/web/src/app/page.tsx` — map tab flex layout, removed exploration section, disabled event/egg encounter logic
- `apps/web/src/app/globals.css` — `.real-map-container` height: 100% (was 300px)
- `apps/web/src/components/RealMap.tsx` — root div height: 100%

**New:** Grid shop icons show live MM:SS countdown; color transitions from normal → orange → red as time runs out; shops disappear when expired. For testing, shop lifetimes are 15-45 minutes.

### Changes
- **`ShopData.expiresAt`** — each shop has an expiry timestamp
- **Grid badge countdown:** `MM:SS` format (e.g. `25:00`, `03:45`, `0:07`)
- **Color urgency system:**
  - `> 2 min` → gray (normal)
  - `< 2 min` → shop's own color (attention)
  - `< 30 s` → 🟠 orange
  - `< 12 s` → 🔴 red + red glow background
- **2-second auto-refresh** via `setInterval` (was 5s) — `shopTimerRef`
- **Expired shop removal** — `getShopForCell` checks `shopLifetimeRef` map; expired shops return `null`
- **Modal countdown:** beautiful `MM:SS` timer inside the shop card, updates every 1s via `setInterval`, auto-closes 2s after expiry
- **Timer cleanup:** countdown interval cleaned up on buy, close, or modal removal

**Changed files:**
- `apps/web/src/components/RealMap.tsx` — `shopLifetimeRef`, `shopTimerRef`, updated `getShopForCell` with expiry, `placeShopsOnGrid` with formatted countdown + color logic, 2s interval
- `apps/web/src/app/page.tsx` — `expiresAt` in shop type, countdown timer in modal (`MM:SS`, auto-close on expiry), timer cleanup

## v0.39.1 — Shop Card UI Overhaul: Real Store Design + Big Discount (2026-07-09)

**New:** Shop modal redesigned as a real storefront. Discount percentage displayed prominently (42px). Original price crossed out with discounted price below. All shops share same 🏪 icon with discount badge in top-right corner.

### Changes
- **Unified shop icon:** All 5 shop types now use the same 🏪 icon. Differentiation is via the top-right discount badge (e.g. "50%", "10%", "85%", "??")
- **Trap/surprise display discounts:**
  - Trap shops show "85%" (looks amazing) but entering reveals a trap
  - Surprise shops show "10%" (looks bad) but actual price is cheap
  - Mystery shops show "??" (unknown)
- **Store card layout:** Shop header → discount % (42px) → product display (egg) → original price (crossed) → discounted price → your steps → buy/close
- **Shop types simplified:** removed per-type icons, added `displayDiscount` and `actualPrice` fields

**Changed files:**
- `apps/web/src/components/RealMap.tsx` — `SHOP_TYPES` redefined with `displayDiscount` + `actualPrice`, removed `icon`/`discountMult`/`finalPrice`, unified icon rendering with discount badge
- `apps/web/src/app/page.tsx` — `showShopModal` redesigned with storefront layout, big discount %, trap/surprise display pricing

## v0.39.0 — Random Shops on Grid: Egg Purchase with Steps (2026-07-09)

**New:** Shops 🏪 appear on unowned grid cells (12% spawn rate). Players can buy 🥚 eggs using 👣 steps. Five shop types with varying discounts, including traps and surprises.

### Shop Types

| Type | Weight | Badge | Actual | Colour |
|------|--------|-------|--------|--------|
| 🟢 抵買店 (cheap_nice) | 35% | 50% | 👣 1,000 | `#22c55e` |
| 🟡 高檔店 (expensive) | 25% | 10% | 👣 5,000 | `#f59e0b` |
| 🟣 神秘店 (mystery) | 20% | ?? | 👣 2,000 | `#8b5cf6` |
| 🔴 特賣場 (trap) | 12% | 85% | Lose 👣3,000 | `#ef4444` |
| 🔵 名牌店 (surprise) | 8% | 10% | 👣 500 | `#06b6d4` |

### Implementation
- **`getShopForCell(row, col, ownedSet)`** — deterministic hash-based generator (different seed from monsters). 12% spawn rate per unowned cell. Weighted random pick among 5 shop types.
- **`placeShopsOnGrid(map)`** — renders 🏪 markers with discount % badge (top-right). Zoom-gated ≥14. Cleaned up on grid hide.
- **`onShopEntered` callback** — triggered when player walks into a shop cell (via position useEffect). Separate from monster/cell event system.
- **`showShopModal()`** — DOM-based modal (same pattern as monster modal). Shows shop details, discount %, price. Buy button deducts steps from `totalSteps`, adds PixelLab egg to inventory, saves to DB if logged in.
- **Trap handling:** clicking buy on a trap shop loses 👣 3,000 steps with no egg. Surprise: buy price is much lower than displayed.
- **Dedup:** Shops share the same `encounteredMonstersRef` Set as monster cells (a cell can have either a shop OR a monster OR nothing)

**Changed files:**
- `apps/web/src/components/RealMap.tsx` — `SHOP_TYPES` config, `ShopData` interface, `getShopForCell()`, `placeShopsOnGrid()`, `shopGroupRef`, `onShopEntered` prop, shop check in position useEffect, grid toggle show/hide cleanup, 3 call sites updated
- `apps/web/src/app/page.tsx` — `handleShopEntered` callback, `showShopModal()` function, `onShopEntered` prop on both RealMap instances

### Fixed
- **🔴 Manual mode starts at hardcoded position instead of current GPS** — `toggleManualMode` called `walkStop()` (clears `mapPos` to `null`) before `setMapPos(prev => prev ?? hardcoded)`. The updater always saw `prev = null`, so D-pad started from `(22.3194, 114.1694)` every time. **Fix:** Save current position to `manualPosRef` *before* `walkStop()` using `setMapPos(prev => { manualPosRef.current = {lat: prev.lat, lng: prev.lng}; return prev })`. The updater for turning ON now reads from `manualPosRef.current`.
- **🔴 Manual mode OFF doesn't snap back to GPS** — Two root causes:
  1. **`walkStop()` cleared `mapPos` to `null`**, so when `setManualMode` updater ran (with no `setMapPos` call), the map went blank until a GPS fix arrived. **Fix:** Updater now calls `setMapPos({ lat: manualPosRef.current.lat, lng: manualPosRef.current.lng })` to restore the last position.
  2. **Auto-GPS `useEffect` only depended on `[tab]`, not `[tab, walking]`**. When `walking` changed from `true` to `false` (manual mode OFF), the effect never re-ran — GPS was never restarted after `walkStop()`. The button showed "📡 開GPS" indefinitely. **Fix:** Add `walking` to dependency array: `useEffect(() => {...}, [tab, walking])`.
- **Re-opening manual mode from GPS position** — Because `manualPosRef` is updated with the current GPS position before each toggle, turning manual mode ON again always starts from the user's current real location, not the previous D-pad destination.

### Expected Behaviour
1. Toggle ON → D-pad starts from current GPS position
2. Walk with D-pad to any location
3. Toggle OFF → last D-pad position stays on map → GPS auto-starts → snap to real GPS when fix arrives
4. Toggle ON again → starts from current GPS position again (free to move)

**Changed files:**
- `apps/web/src/app/page.tsx` — `toggleManualMode()` saves position to `manualPosRef` before `walkStop()`, restores position on OFF, auto-GPS effect now depends on `[tab, walking]`
- `apps/web/src/components/RealMap.tsx` — added `trailStartedRef` guard to skip trail drawing on the very first GPS position fix (avoids phantom trail from default position to real GPS location)

## v0.38.0 — ❓ Mystery Cells + Random Event Encounters (2026-07-08)

**New:** Monster icon changed from 👾 to ❓ (purple question mark badge). Walking into a ❓ cell now triggers a **random event** — monster encounter is one possible outcome among the full event pool.

**Changes:**
- **Icon change:** 👾 → ❓ — cells with monsters now show a purple ❓ badge (mystery). Player doesn't know what's inside until they walk in.
- **Cell event system:** `onCellEvent` callback replaces `onMonsterEncounter`:
  - `onCellEvent(row, col, cellKey, monsterData)` passes monster data to parent
  - 50% chance: **monster encounter** (uses existing `showMonsterModal` DOM modal)
  - 50% chance: **random event** from the event pool (sunny meadow, treasure chest, mud puddle, etc.)
  - Event pool excludes `eventOnly` events (流星, 哥布林偷襲, 連環寶箱) — only normal events trigger from cells
  - Dedup via `encounteredMonstersRef` Set (same cell only triggers once per session)
- **Updated prop:** `RealMap` now accepts `onCellEvent?: (row, col, cellKey, monsterData)` instead of `onMonsterEncounter`
- **Event rolling logic:** Uses `EVENT_POOL` from `@pipz/core` with proper fallback (last available event if roll exceeds total weight)
- **Logging:** Both monster encounters and random events produce log messages in the dev tools log

**Changed files:**
- `apps/web/src/components/RealMap.tsx` — 👾 → ❓ in `placeMonstersOnGrid()`, prop changed to `onCellEvent`, call site updated
- `apps/web/src/app/page.tsx` — `handleCellEvent` callback replaces `monsterEncountered`, imports `EVENT_POOL`, 50/50 monster vs random event logic

## v0.37.3 — Monster Encounter Trigger + Modal Fix (2026-07-08)

**New:** Walking into a monster cell now triggers an encounter popup. The modal shows the monster's emoji, name, level, and rarity, with ⚔️戰鬥 and 🏃逃走 buttons.

**Changes:**
- **Encounter trigger** — `useEffect` in RealMap checks `getMonsterForCell()` every time position changes. If monster exists and not already encountered (dedup via `encounteredMonstersRef` Set): calls `onMonsterEncounter?.(monsterData)`
- **Encounter modal** — `<fixed-modal-layer>` overlay with monster card: emoji, name, rarity badge, level, ⚔️野生怪獸擋住去路！ text, ⚔️戰鬥 + 🏃逃走 buttons
- **戰鬥 button** — awards `level × 10` steps, logs victory message, closes modal
- **逃走 button** — logs escape message, closes modal
- **Debug logs** — console output for encounter check: cell, walking state, monster found/not found, trigger status

### Fixed
- **🔴 Monster encounter modal never appeared (React 18 state batching bug)** — `setEncounter(monster)` was called successfully (proven by console.log) but the modal component never rendered. Root cause unclear — appears to be a React 18 state batching issue where state updates from `useCallback` with empty deps inside a different component's `useEffect` don't propagate. **Fix:** Use direct DOM manipulation (`document.createElement` + `appendChild`) in the callback instead of React state — `showMonsterModal()` creates the overlay, adds event listeners via `addEventListener`, and `remove()` on close.
- **Hands-free test (vision AI):** Used `browser_vision` to visually confirm the modal appears on screen.
- **`toggleManualMode` GPS conflict** — `toggleManualMode` calls `walkStop()` before toggling, ensuring GPS is always stopped when entering manual mode. Previously used `if (walking) walkStop()` which missed GPS when `walking` was `false` but GPS was still running due to the auto-start effect.
- **Encounter handler no longer calls `walkStop()`** — Previously `monsterEncountered` called `walkStop()` to stop walking, which set `mapPos=null` and `walking=false`, potentially interfering with React state batching.

**Changed files:**
- `apps/web/src/app/page.tsx` — `monsterEncountered` callback now calls `showMonsterModal()` (direct DOM), removed `walkStop()` call, added `showMonsterModal()` function, fixed `toggleManualMode`
- `apps/web/src/components/RealMap.tsx` — encounter useEffect with dep array `[position?.lat, position?.lng, mode, deviceHeading, walking]`, debug console.logs

## v0.37.2 — Monster Spawn on Grid + Unified Icon (2026-07-07)

**New:** Monsters spawn on unowned grid cells (18% chance). Show as unified ⚔️ icon — actual monster type/level/rarity is only revealed on encounter.

**Changes:**
- **`getMonsterForCell(row, col, ownedSet)`** — deterministic hash-based generator; same cell always yields the same monster
- **5 monster types:** 🐺野狼 (common) 🐗山豬 (uncommon) 🐻黑熊 (rare) 🦅雷鷹 (epic) 🐉巨龍 (legendary)
- **18% spawn rate** per cell; level varies by rarity (type base + 0-4 variance)
- **No monsters on occupied cells** — uses `allFlagCells` to skip owned cells
- **`placeMonstersOnGrid(map)`** — renders ⚔️ icon at cell centre (red-edged badge with subtle red background, zoom-gated ≥14)
- **Integration:** called from `updateGrid()` and grid toggle show/hide; re-placed when `allFlagCells` change (e.g. after buying a cell)
- **Encounter-ready data:** monster data (emoji, label, color, level, rarity) is available for future "enter cell → trigger battle" mechanic
