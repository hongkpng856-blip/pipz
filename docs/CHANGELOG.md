# Changelog

## v0.37.1 — Manual D-Pad Walk + Floating Dev Tools (2026-07-07)

**New:** D-pad walking simulator and manual mode toggle in Dev Tools. Panel now floats over the map instead of pushing content down.

**Changes:**
- **🕹️ 手動模式 ON/OFF toggle** — when ON: stops real GPS (`walkStop()`), enables D-pad, sets initial position; when OFF: stops D-pad, clears mapPos, GPS can be restarted
- **D-pad buttons** (▲◄►▼) — cyan-styled arrow pad. Works only when manual mode is ON
  - `stepManualWalk(dir)` — immediate position update on tap (+0.00015° ≈ 15m per step)
  - `startManualWalk(dir)` — calls `stepManualWalk` immediately, then starts 150ms interval for held-down continuous walking
  - `stopManualWalk()` — clears the interval on release
- **Dev Tools panel** — now `position: absolute; max-height: 50vh; overflow-y: auto` — floats over the map, map stays visible behind it
- Shows current `lat, lng` below the D-pad for orientation

**Bug fix:** D-pad had no reaction on click because `startManualWalk` only started a 150ms interval, but `onMouseUp`/`onTouchEnd` fired before the interval ever ran. Fixed by extracting `stepManualWalk()` that runs **synchronously** on every press, then the interval only adds continued movement while held.

**Changed files:**
- `apps/web/src/app/page.tsx` — added `manualMode` state, `manualWalkRef`, `manualPosRef`, `stepManualWalk()`, `startManualWalk()`, `stopManualWalk()`, `toggleManualMode()`, D-pad JSX + manual mode toggle in Dev Tools, panel `position: absolute` overlay

## v0.37.0 — Cross-User Flag Visibility (2026-07-07)

**Fix:** Property flags now show for ALL users' occupied cells, not just the current user's cells.

**Root cause:** `placeAllFlags()` was reading from `ownedCells` (built from `loadProperties(userId)` — current user only), so other users' flags never appeared.

**Changes:**
- **New API route** `/api/properties/all-cells` — returns all occupied cells `(anchor_lat, anchor_lng, cell_row, cell_col)` from all users, using `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- **New function** `fetchAllFlagCells()` + `FlagCell` interface in `supabase-db.ts`
- **RealMap** now accepts `allFlagCells: FlagCell[]` prop alongside existing `ownedCells`
- `placeAllFlags()` iterates over `allFlagCellsRef.current` instead of `ownedCellsRef.current`
- `loadUserProperties()` now also auto-refreshes `allFlagCells` after buy/sell, so new properties appear instantly
- `ownedCells` (Set&lt;string&gt;) kept for the Property tab — only `allFlagCells` is used for map flags

**Changed files:**
- `apps/web/src/app/api/properties/all-cells/route.ts` — NEW: fetches all property cells via service role
- `apps/web/src/lib/supabase-db.ts` — added `FlagCell` type + `fetchAllFlagCells()`
- `apps/web/src/app/page.tsx` — added `allFlagCells` state + fetch, wrapped into `loadUserProperties()`
- `apps/web/src/components/RealMap.tsx` — `placeAllFlags()` reads from `allFlagCells` instead of `ownedCells`

**Fix:** Property Detail Modal buttons now all uniform full-width stacked layout. Toggle button redesigned as pill-style.

**Changes:**
- **Modal buttons** — All action buttons now identical dimensions (`width:100%`, `padding:7px 0`, `borderRadius:10`, `fontSize:11`). Stacked vertically in a column (`flexDirection:'column', gap:6`). Previously the top row (上架出售 + 放棄) used side-by-side `flex:1` buttons with different padding from the bottom buttons (在地圖上顯示 + 關閉).
- **Toggle button** — Simplified from segmented control (2 pills) to a single pill toggle (`borderRadius:20`, purple border + subtle bg) toggling between 「📜 大卡」↔「📜 細卡」. Matches the section-count font size (10px).
- **大卡 grid** — Now correctly renders 2-column `prop-grid` (was using same 3-column `pet-grid` as 細卡).

**Changed files:**
- `apps/web/src/app/page.tsx` — modal actions layout restructured, toggle button redesigned

## v0.36.0 — Property Card Expand-on-Click (2026-07-07)

**Redesign:** Property grid cards now match pet card size (3-column `.pet-grid`). Click any card to open a full Monopoly-deed style modal with all details.

**Changes:**
- **Grid cards** — Property and Market grid now use `pet-card` class (pet-card size, 3-column grid), matching the pet gallery layout. Each card shows a zone colour top accent bar, emoji icon, cell name, district location, seller/owner, and ⚡ price.
- **Market grid** — Also changed to 3-column `pet-grid` (was 2-column `.prop-grid`) for visual consistency.
- **Expand-on-click** — Clicking any property card calls `setDetailProperty(prop)`, opening the Property Detail Modal.
- **Property Detail Modal** — Full Monopoly-deed modal design:
  - Zone-coloured header (name + district badge)
  - Body rows: 📍地段, ⚡價格, 📅購入, 🌐座標, 👤賣家
  - 📌 上架中 status badge (when listed)
  - Actions: 上架出售 / 下架 / 🗑️放棄 (own), ⚡購買 (other's), 🗺️在地圖上顯示
  - Modal uses inline `<div>` (no separate component) with `onClick` backdrop close + `e.stopPropagation()` on card
- **Toggle vestigial** — The 「📜 大卡/📜 細卡」toggle button remains but both states use the same 3-column grid (no visual difference in this version).

**Changed files:**
- `apps/web/src/app/page.tsx` — property grid (inline cards) → `pet-card` size, detail modal → Monopoly-deed inline modal
- `apps/web/src/app/globals.css` — added `.prop-modal-row`, `.prop-modal-label`, `.prop-modal-value` CSS classes for modal body

## v0.35.4 — ModalPortal Click Trap Fix (2026-07-06)

**Fix:** Property cards becoming unclickable after 4-5 modal open/close cycles.

**Root cause:** ModalPortal's fade-in/fade-out animation created a transparent overlay
(opacity 0) that still caught clicks due to CSS `pointer-events` not cascading to
grandchildren. Repeated cycles accumulated timing race conditions in the rAF-based
state machine.

**Fix:** Stripped all animation from ModalPortal. Children are rendered instantly
with no transition — no timing window exists for overlay click traps. Verified with
30-cycle stress tests at 50ms intervals (both overlay click and button click close).

**Changed files:**
- `src/components/ModalPortal.tsx` — removed animated/phase state machine

## v0.35.3 — Flag–Grid Toggle Sync (2026-07-07)

**Fix:** Property flags now follow the grid toggle strictly:
- **Default (grid OFF):** No flags, no grid overlay
- **Toggle ON:** Grid + flags appear together
- **Toggle OFF:** Grid + flags disappear together
- Removed unconditional `placeAllFlags()` on init — now gated by `gridVisibleRef.current`
- Cleaned up zoom handler on toggle OFF to prevent flag reappearance on zoom change

## v0.35.2 — Trail Overview + Day Filter (2026-07-06)

**New Features:**
- **👣 足跡總覽** — New button on map (right side, above grid toggle). Click to zoom out and see all trail polylines at once. Click again to recenter to GPS.
- **📅 Per-day filter via weekly chart** — Click a day column in the Stats Card weekly bar chart to show only that day's trail polylines on the map. Click again to show all. Active day shows amber glow border + label.
- **Day filter works at all times** — Whether trail overview is active or not, clicking a day shows only that day's trail dashed polylines.
- **Default filter = today** — On page load, only today's trails are shown (matching the `new Date().getDay()` index).

**Technical:**
- `toggleTrailOverview()` — simplified to only fitBounds + recenter. No heatmap overlay.
- Day filter state in `page.tsx`: `useState<number | null>(new Date().getDay())`.
- `trailDayFilter` prop → RealMap `useEffect` syncs ref + show/hide `L.Polyline` layers using `map.addLayer`/`map.removeLayer` with `map.hasLayer` guard.
- Weekly bar chart columns: `onClick={() => setTrailDayFilter(isFiltered ? null : dayIdx)}`. Active column: amber glow + bar highlight via `.weekly-bar-col-active` CSS.

## v0.35.1 — GPS Toggle UX + Flag Zoom Gate (previous)
## v0.35.0 — Auto-Follow Toggle + Anchor Stabilization (previous)
