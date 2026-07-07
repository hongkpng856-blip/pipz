# Changelog

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
