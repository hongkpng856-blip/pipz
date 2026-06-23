# Changelog

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
