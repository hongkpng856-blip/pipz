# Changelog

## v0.4.0 (2026-06-24)

### Changed
- **Pets tab layout restructured**: ⚡ 能量 + ⭐ 主力隊伍 always visible at top, 🐾 其他寵物 scrolls independently in flex container (`calc(100dvh - 110px)` with `overflow-y: auto`)
- **Energy card compacted**: smaller icons/padding to fit fixed layout

## v0.3.9 (2026-06-24)

### Changed
- **Dev tools moved to community tab**: "+500 測試步數" button + log moved from map tab to a collapsible 🔧 Dev section at the bottom of 🏪 社群 tab (hidden by default, click to reveal)

## v0.3.8 (2026-06-24)

### Changed
- **PetCompanion card redesigned:**
  - Canvas shortened from 460px to 300px (wider play area ratio)
  - Pet roams in **full 2D** (x + y axes) — can reach any pixel position within the card
  - Added up/down walking behaviors + full directional roaming
  - Randomised spawn position on pet change
  - Shadow follows pet position dynamically (2D)
  - Info overlay moved to bottom (slides up from action bar)
  - Action buttons and overlays restyled for compact card layout
  - Added subtle decorative paw-print dots on background

## v0.3.7 (2026-06-24)

### Changed
- **PetCompanion card UI revamp:**
  - Removed "未命名" fallback text → shows species name (`#speciesName`) only
  - Removed room scene background (walls, floor tiles, rug) → uniform card bg `#141b2d` with subtle dot texture
  - Expanded pet roaming range from ±25% canvas width to ±42% (nearly full card width)
  - Outer container bg consistent with card bg (`#141b2d`)

## v0.3.6 (2026-06-24)

### Fixed
- **PICO-8 gray background remnants in sprites (root cause)** — all 50 species sprites had `rgb(194,195,199)` (#C2C3C7) PICO-8 light gray pixels that appeared as "white dots" on dark app background (#0b1120):
  - **Source PNGs:** Bulk-removed all `rgb(194,195,199)` pixels → transparent in all 50 sprite files
  - **`removeBg()` safety net:** Updated both `PixelPetCanvas.tsx` and `PetCompanion.tsx` to remove `rgb(194,195,199)` at render time (exact match, no tolerance) in addition to existing warm-beige `rgb(255,241,232)` ±40 pass
  - **Cache busting:** Bumped `SPRITE_VERSION` to `v5` so SW cache serves fresh sprites
  - **Verification:** Production sprite 0.png confirmed 0 light pixels (r>180,g>180,b>180), Vision AI confirms "no white dots or artifacts"
- **Stale canvas sprite on pets tab** — added `key={pet.id}` to all `PixelPetCanvas` instances so React properly unmounts/remounts the canvas when pet changes, preventing brief flash of wrong sprite on tab switch
- **Fallback grid flash on mount** — changed initial sprite state from `'fallback'` to `'loading'` in `PixelPetCanvas.tsx` so the low-res procedural grid doesn't briefly show before the PNG sprite loads; canvas stays empty until PNG is ready, then draws directly

## v0.3.5 (2026-06-24)

### Fixed
- **NEW badge not showing after hatching (root cause)** — complete rewrite of badge logic:
  - **Popup button:** calls `dismissNewPet()` correctly (adds to `dismissedNewPets` to prevent auto-detect loop, closes popup)
  - **isNewBadge:** no longer checks `dismissedNewPets` or `newPetId`. Uses dedicated `badgeDismissed` ref + recency (5 min) + newestPet detection — badge is independent of popup state
  - **Pet card click:** uses `badgeDismissed` ref instead of `dismissNewPet()` — clicking a pet dismisses its badge without affecting popup or auto-detect
  - **Fix verified in browser:** NEW badge shows correctly on pets tab after hatching

## v0.3.4 (2026-06-24)

### Fixed
- **NEW badge dismissed before pets tab renders** — hatch popup "睇下寵物！" button called `dismissNewPet()` before navigating to pets tab, which added pet to `dismissedNewPets` Set, causing `isNewBadge()` to return false before the badge was ever seen. Fixed by replacing `dismissNewPet()` with just clearing `newPetId` + localStorage (without adding to dismissed set), so the auto-detect effect or recency/newestPet conditions can show the badge on the pets tab.

## v0.3.3 (2026-06-24)

### Changed
- **Encounter animation speed** — `encPhase` increment 0.008→0.025 (3× faster), post-animation delay 800ms→300ms; safety timeout 4s→1.5s; total wait from ~2.9s to ~0.97s
- **Click-to-skip encounter** — tapping the WalkingCanvas during encounter instantly skips to the egg popup (200ms delay)
- **Instant debug feedback** — clicking "+500 測試步數" immediately shows log message "🔍 測試步數處理中..." instead of silent wait
- **Other pets sorted newest first** — non-favorite pets now sorted by `createdAt` descending (newest pet appears at the top)
- **NEW badge enlarged** — font 6→7px, padding bigger, z-index 5→10, pulsing glow shadow, bigger scale animation
- **PixelPetCanvas instant render** — status now starts as `'fallback'` instead of `'loading'`; procedural pet art shows immediately without waiting for PNG sprite download; upgrades to PNG seamlessly when loaded

### Added
- **NEW badge persistence** — `newPetId` now saved to `localStorage`, so the NEW badge survives page reload until the user clicks/taps the pet card
- **NEW badge recency fallback** — pets created within the last 5 minutes also show NEW badge (even without `newPetId` match), ensuring it always appears after hatching
- **Auto-detect recent pets on load** — extra `useEffect` scans pets for any created within 5 min and auto-sets `newPetId` (safety net for localStorage miss)

### Fixed
- **WalkingCanvas import** — added `useCallback` import for skipEncounter handler
- **NEW badge detection** — replaced `isNewPet` with `isNewBadge` that also computes `newestPet` directly from array as final fallback; ensures the badge always shows for the most recently created pet regardless of state matching

## v0.3.2 (2026-06-24)

### Fixed
- **Debug button skipEncounter** — `addDebug()` no longer skips encounters; +500 test steps now properly triggers the encounter system (every `ENCOUNTER_INTERVAL = 500` steps)
- **Golden bell notification count** — added `useEffect` with `[user?.id]` dependency to fetch unread notification count from DB on page load; bell now shows correct gold/grey state after page reload
- **Missing hatch result UI** — added new pet popup overlay after hatching (shows pixel art, rarity, stats)

### Added
- **New Pet Popup** — full-screen overlay after hatching: PixelPetCanvas (size 5, anim=happy), rarity badge, species ID, level/stage, 4 stats, "🎉 睇下寵物" button
- **NEW badge** — amber pulsating `.new-badge` on freshly hatched pet cards in pets tab; disappears on card click

## v0.3.1 (2026-06-23)

### Fixed (Code Review — 22 bugs)
- **Pity system** — legendary/epic counters now actually increment (were stuck at 0)
- **updatePet** — `user_id` no longer included in update payload (wrong destructure key)
- **savePet** — returns `null` on error instead of error message (which corrupted pet IDs)
- **GPS stale closure** — `addSt` now uses refs for `user`, `pets`, `pet`, `camState`, `steps` to prevent stale values in watchPosition callback
- **Step sync race** — `scheduleSync` now uses `pendingSteps.current` instead of render-cycle `steps`
- **Steps during encounter** — steps are no longer counted during encounter animation
- **Evolution totalSteps inflation** — removed catch-up logic that reset evolved pets' steps
- **WalkingCanvas** — `onEncounterEnd` stored in ref to prevent effect restart on every render
- **Egg save race** — egg saved to DB first, then added to local state (was optimistic + .then patch)
- **ensureProfile** — uses `maybeSingle()` + `upsert()` to prevent duplicate key errors
- **upsertDailySteps** — uses single `upsert()` instead of select-then-insert/update (TOCTOU race)
- **Encounter egg popup** — simplified condition to avoid timing race with state updates
- **PixelPetCanvas** — added `cancelled` flag to prevent setState after unmount
- **darkenColor** — handles short hex format (`#rgb`) + NaN-safe parse
- **Auth context** — removed duplicate `setLoading(false)` call

### Changed
- **Pixel pet rendering** — hybrid system: PICO-8 PNG sprites primary, procedural fallback
- **50 PICO-8 sprites** — all generated via Pollinations.ai + pico8 dither pipeline (~469KB total)

### Added
- **PetCompanion** — full-screen interactive pet room (indoor scene, auto-walk, mischief, tap ❤️)
- **Pet info panel** — mood bar (green/amber/red gradient), species name `#圓貓`, 4 stats (⚡🍀💜🔋), evolution progress
- **50 pixel pet species** — expanded from 5 to 50 (cat, dog, bunny, dragon, alien, robot, phoenix, unicorn, slime, jellyfish, etc.)
- **15 eye templates** — expanded from 5 to 15 (sleepy, angry, heart, sparkle, tear, star, etc.)
- **19 colour variants per rarity** — expanded from 3 to 5 per rarity × 5 rarities
- **Species name display** — `#物種名` shown in both PetCompanion and PetDetailModal
- **Mood bar in PetDetailModal** — feature parity with PetCompanion
- **Service Worker v2** — cache-busting via version bump (`pipz-v1` → `pipz-v2`) to force PWA update

### Changed
- PetDetailModal now shows species name (`#物種名`) and mood bar (emoji + gradient bar + %)
- Map tab: idle (no GPS) → PetCompanion room view; walking → WalkingCanvas
- PetCompanion replaces WalkingCanvas when GPS is off

### Fixed
- Vercel deploy failure — removed `vercel.json` (config conflicted with dashboard settings)
- iPhone PWA cache — SW v2 forces re-fetch of all static assets on next page load

### Added
- Procedural pixel pet generator (Canvas-based, seed + rarity + stage)
- Canvas pet animation (idle bob, walk bounce, happy jump, click reaction)
- Evolution system with 5 stages: Baby → Juvenile → Adult → Evolved → Legendary
- Evolution modal with animation
- Pet skill system — 12 unique skills based on rarity
- Pet detail modal with full stats, skills, evolution progress, interactions
- Pet detail matches main layout width (max-width: 24rem)

### Changed
- Pet grid click → opens detail modal (not switches to map tab)
- Nearby click → opens detail modal
- Evolution button always visible (disabled when not enough steps)

## v0.1.0 (2026-06-18)

### Added
- Monorepo: apps/web (Next.js) + packages/core + packages/design-tokens
- Supabase Auth: Password + Magic Link dual tabs
- AuthModal component with 密碼 / Magic Link tabs
- Client-side auth callback (exchangeCodeForSession)
- Header with email display + 登出 button
- SQL schema: profiles, pets, daily_activity, transactions
- Brevo SMTP integration for Magic Link emails
- Vercel deployment to pipz-ivory.vercel.app
- Pure custom CSS design system (solid cards, dark theme)
- GPS walking tracking + step counter
- Pet encounter system with pity mechanics
- Egg hatching animation
- Pet interactions (feed, pet, play)
- Pet collection grid view
- Incubator UI

### Fixed
- Auth callback user null → switched to client component
- Magic Link dead link → Supabase Auth URL config
- signUp shouldCreateUser not supported → removed option
- Vercel cache stale builds → file rename + git push strategy
- vercel link env var wipe → use --value flag

### Known Issues
- Magic Link open accounts have no password (need "set password" feature)
- Vercel build cache may retain stale env vars
