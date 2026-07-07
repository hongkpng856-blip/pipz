# Component Catalog

> Every screen and component in the Pipz web app. iOS/Android agents should replicate these exactly.

## 1. Main Page (`page.tsx`)

The entire app is a single page with 5 tabs and modals.

### Layout Structure

```
┌──────────────────────────────┐
│         Header               │  ← Sticky, Pipz logo + steps + auth
├──────────────────────────────┤
│                              │
│       Scrollable Content     │  ← padding-bottom: 62px
│                              │
│  ┌─── Tab Content ───────┐  │
│  │                       │  │
│  │  Varies by tab        │  │
│  │                       │  │
│  └───────────────────────┘  │
│                              │
├──────────────────────────────┤
│   Bottom Navigation (fixed)  │  ← 4 tabs: 地圖 🗺️ 寵物 🐾 社群 🏪 背包 🎒
└──────────────────────────────┘
```

### Header
- Left: "Pipz" title
- **Golden bell 🔔** (after title): opens notification modal; color `#fbbf24` (gold) when unread > 0, `#9ca3af` (grey) when none; red badge on top-right corner (capped 99+)
- **Unread count loads on page init** — `useEffect` runs on user login to fetch unread notifications from DB, so the bell shows correct gold/grey state even after page reload
- Right: sync indicator, Walk button (🚶/⏹), GPS indicator, profile button 👤, steps counter 👣

### Bottom Navigation
- 5 fixed tabs: 地圖 (Map), 寵物 (Pets), 地產 (Properties), 社群 (Community), 背包 (Inventory)
- Nav grid uses `grid-template-columns: 1fr 1fr 1fr 1fr 1fr` (5 equal columns)
- Active tab: purple highlight
- Navigation is `position: absolute; bottom: 0`

---

## 2. Map Tab (`tab === 'map'`)

### Main View: RealMap (always visible)

The map tab always displays the `RealMap` component — a Leaflet GPS map with CartoDB Voyager tiles (Google Maps-style, clean light background). GPS tracking is optional:

| | GPS Tracking | Component | Behavior |
|---|---|---|---|
|| ON (`walking && mapPos`) | RealMap | Live GPS — shows blue dot + trail + accuracy circle + pet marker |
|| OFF | RealMap | Static map centered on default Hong Kong location — no tracking |

The map is always the same `RealMap` component; the `walking` and `position` props control whether GPS tracking features are enabled.

**Layout order (v0.15.0+):**
```
┌─────────────────────────────────┐
│      🎮 探險進度 (adventure)     │  ← NEW: first element
├─────────────────────────────────┤
│      🗺️ Leaflet RealMap        │
├─────────────────────────────────┤
│      📊 Stats Card              │
└─────────────────────────────────┘
```

#### RealMap (🗺️ Leaflet GPS Map)
Rendered by `RealMap.tsx`. Always shown in the map tab. Imported with `next/dynamic` to avoid SSR errors (`{ ssr: false }`).

**Component:** `apps/web/src/src/components/RealMap.tsx`

**Tech:**
- Leaflet (`npm install leaflet`) — dynamically imported with `next/dynamic` to avoid SSR errors
- **CartoDB Voyager tiles** (`{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`) — Google Maps-style, clean light background, clear roads/labels, green parks, blue water
- `@pipz/core` imports `generatePixelPet()` + `drawPixelGrid()` for pet marker sprite rendering

**Layout:**
- Full-width card with `section card` wrapper
- Leaflet map container at 4:3 aspect ratio, min 240px height
- **User marker**: custom `L.divIcon` containing **pixel art sprite** of the active battle pet (via `petSpriteDataUrl()` — canvas → base64 PNG data URL → `<img>` element):
  - 44×44px round container with rarity-coloured 3px border
  - Inner 36×36px pixel art image (`image-rendering: pixelated`)
  - Rarity glow shadow (`box-shadow: 0 0 14px ${rarityColor}66`)
  - Rarity colour map: Common `#9ca3af`, Uncommon `#22c55e`, Rare `#3b82f6`, Epic `#8b5cf6`, Legendary `#f59e0b`
  - **No pet logged in**: shows 🥚 emoji with rarity tint
  - Sprite regenerated on pet change via `useEffect` → `setIcon(buildPetIcon())`
- **Accuracy circle**: translucent cyan circle around user marker showing GPS accuracy
- **Owned cell flags** (v0.34.0+, updated v0.37.0): `allFlagCells` prop (`FlagCell[]`) passed from `page.tsx` — fetched via `/api/properties/all-cells` (service role, all users). Each occupied cell renders a 🏠 `L.divIcon` at cell center. Interactive, clickable to open cell popup. Flags are **tied to grid toggle**: `gridVisible=false` → flags hidden, `gridVisible=true` → flags shown. Managed by `placeAllFlags()` function, triggered by grid toggle ON and `useEffect([allFlagCells])` (only when grid is ON). Previously used `ownedCells` (current user only) — changed in v0.37.0 to show flags from ALL users.
- **Zone-based grid coloring** (v0.34.0+): grid cells share colour in 10×10 region blocks via `getZoneIdx(row, col)` — deterministic hash `(Math.floor(row/10)*7 + Math.floor(col/10)*13) % 6`. Six named zones: 紫晶區, 翠綠區, 琥珀區, 碧藍區, 赤紅區, 湛藍區.
|- **Path trail** (v0.18.1+): **7-day colour per-day polyline** system via `trailByDay` ref (`Map<number, LatLng[]>`):
|  - Each day of week gets an independent `L.polyline` with its own colour from `DAY_COLORS`
|  - Day mapping: `0(日)=#8b5cf6` `1(一)=#06b6d4` `2(二)=#22c55e` `3(三)=#f59e0b` `4(四)=#ef4444` `5(五)=#ec4899` `6(六)=#3b82f6`
|  - Trail is **permanent** — never cleared when walking stops; persists as long as the component is mounted
|  - **localStorage persistence** (v0.19.0+): every new GPS point auto-saves to `localStorage` key `pipz_trail_data`. On mount, saved trails are restored and drawn as polylines. Survives app restart/PWA close. 🗺️💾
|  - `getDay()` determines the day index automatically, so routes from different weekdays display different colours on the same map
||- **GPS mode badge** (v0.19.0+): top-right overlay replacing old "GPS" static label. Shows movement mode detected from GPS speed:
||  - 🧘 靜止中 (grey dot, `speed < 0.5 m/s` or `null`) — stationary, no trail, no step counting
||  - 🚶 步行中 (cyan dot, `0.5 ≤ speed < 2 m/s`) — walking mode, trails drawn, steps counted
||  - 🚗 乘車中 (amber dot, `speed >= 2 m/s`) — vehicle mode, no trail, no step counting
||  - Only visible when `walking=true` (GPS active)

**Position tracking:**
- GPS position received via `position` prop (from `mapPos` state in `page.tsx`)
- `page.tsx` `watchPosition` callback updates `mapPos` state — called on **every** valid GPS reading (accuracy < 50m) after warmup, NOT gated by speed/time/displacement
- RealMap syncs markers + centers map on each position update
- **GPS warmup**: First 5 GPS readings skip `setMapPos` (sensor stabilisation). However `setMapPos` now runs on **every** post-warmup reading, so the marker appears even when stationary
- **deviceHeading prop** (v0.20.0+): `page.tsx` passes smoothed compass heading as separate `deviceHeading` prop → RealMap uses `deviceHeading ?? position.heading ?? trajectory(atan2)` priority chain
- Trail is **permanent** — never resets when walking stops; `trailByDay` ref persists for the entire component lifecycle
- **Auto-zoom** (v0.19.0+): Map zoom adjusts based on movement mode:
  - 🧘 `stationary` → preserves last zoom (no change)
  - 🚶 `walk` → zoom **18** (street level, close)
  - 🚗 `vehicle` → zoom **14** (city district, wide)
  - Manual zoom via +/- buttons pauses auto-zoom for **15 seconds** (tracked via `lastManualZoomRef` + `autoZoomingRef` to distinguish programmatic vs user zoom)
- **Initial zoom animation** (v0.19.0+): On first GPS fix when saved trails exist:
  1. `map.fitBounds(allTrailPoints, { maxZoom: 14 })` — zoom out to show all walked paths
  2. 1.5s delay → `map.flyTo(currentPos, 18, { duration: 1.5 })` — slowly zoom in to current location
  3. `initialAnimBusyRef` prevents `setView` from interrupting the animation sequence

**CSS styles** (in `globals.css`):
- `.real-map-container`: container sizing (4:3 aspect ratio, min-height 240px)
- `.real-map-container .leaflet-tile`: default rendering (no pixel/CSS filters applied)
- `.pipz-player-marker`: custom pet marker style (removes Leaflet default bg/border)
||- `.real-map-gps-badge`: GPS status badge with `@keyframes gps-pulse` animation
||- `.real-map-mode-vehicle`: vehicle mode badge override (amber border/text)
||- `.gps-dot-vehicle`: amber pulsing dot for vehicle mode
||- `@keyframes gps-pulse-vehicle`: amber pulse animation for vehicle dot
||- `.real-map-mode-stationary`: stationary mode badge override (grey border/text, no dot pulse)
||- `.gps-dot-stationary`: grey static dot for stationary mode (animation: none, opacity: 0.5)
- `.leaflet-control-zoom`: dark-theme styled zoom control (blend with app theme)
- `.leaflet-popup-content-wrapper`: dark popup theme (ready for future quest points)

```
┌─────────────────────────────────┐
│     [🗺️ Leaflet Voyager Map]    │
│  ┌───────────────────────────┐  │
│  │  🗺️ CartoDB Voyager       │  │
│  │  (clean, Google Maps-like)  │  │
│  │       ┌────────┐          │  │
│  │       │ 🐱 px │ ← pet    │  │
│  │       │ sprite │   marker  │  │
│  │       └────────┘          │  │
|-> `generateTestTrails()` method (v0.18.1+) — exposed via `forwardRef` + `useImperativeHandle` (`RealMapHandle` interface): draws 7 small coloured arcs around the map center to preview all 7 day colours at once. Each arc uses `DAY_COLORS[day]` with `dashArray: '6 4'`.
|-> **New in v0.35.2: `toggleOverview()`** — trail overview / heatmap toggle. Click 👣 button on map or call `realMapRef.current.toggleOverview()`.
│  │                    [GPS ●]│  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│       Stats Card (unchanged)    │
└─────────────────────────────────┘
```

**v0.16.0 change:** Map tiles switched from CartoDB dark_all (with pixel CSS filters + maxNativeZoom) to CartoDB Voyager — clean Google Maps-style rendering with no pixel effects.

#### ~~PetCompanion~~ *(no longer used in map tab)*
The PetCompanion component (interactive pet room canvas) was previously shown when GPS walking was off. As of v0.14.5, the map tab always shows RealMap instead — PetCompanion is no longer imported or rendered in `page.tsx`. The component still exists in the codebase for potential future use.

#### ~~WalkingCanvas~~ *(removed — no longer used)*
Previously displayed a top-down pixel view during GPS walking and encounter animation. Replaced by RealMap which is now always visible.

**Encounter eggs** now trigger a **🥚 Egg Found Popup** (v0.18.1) showing the egg name, rarity, and buttons to dismiss or go to eggs tab. The popup uses a **queue system** (`pendingEggRef`/`pendingEventRef`) — if an event triggers simultaneously, the event modal shows first, then the egg popup appears on dismiss (and vice versa).

### Stats Card
- Bigger card with **bar chart visualization**
- Top row: today's steps | total steps (divided by vertical line)
  - **Today steps**: uses `steps.toLocaleString()` (full number, no K/M abbreviation)
  - **Step visual effects** (when `addSt()` fires):
    - **Green flash** overlay (`.step-flash` / `.step-flash-skill`)
    - **Floating ↑ arrows** animating up + fade (`.arrow-float` / `.arrow-float-skill`)
    - **Bounce animation** on number (`.step-bounce`)
    - Skill-triggered steps → larger arrows, brighter flash, longer duration
  - **Skill hints below today steps**: amber `👟 雙倍步伐` + cyan `💨 疾步如飛` badges (shown automatically when active pet has the effect)
  - **Skill hints below total steps**: amber `⚡ 能量過載` badge (shown automatically when active pet has the effect)
- **7-day weekly bar chart** (📊 **每週步數**, v0.18.1+):
  - Shows last 7 days of step data (Sun–Sat) in vertical bar chart
  - Each bar colour matches the corresponding weekday colour from `DAY_COLORS` (same as trail colour system)
    - `0(日)=#8b5cf6` `1(一)=#06b6d4` `2(二)=#22c55e` `3(三)=#f59e0b` `4(四)=#ef4444` `5(五)=#ec4899` `6(六)=#3b82f6`
  - **Today** bar: solid gradient (`DAY_COLORS[dayIdx]` → `DAY_COLORS[dayIdx]88`) + glow shadow (`0 0 8px`)
  - **Other days**: semi-transparent gradient (`DAY_COLORS[dayIdx]66` → `DAY_COLORS[dayIdx]33`)
  - Max height: 60px, min: 4px; scales proportionally to the day with the most steps in the week
  - Labels below each bar: abbreviated step count (e.g. `127`), day label (e.g. `一` or `Tue`)
- **Walk button** moved to **header** (top-right area)
- Green bg when idle, red bg when walking
- **Random egg encounters**: Every 2000 steps accumulated while walking, 40% chance to find a PixelLab 蛋（50/50 cat or shiba）— egg saved to DB, shown in pets tab (inside energy card)

### Nearby Pets
- Horizontal scroll row of recent pets
- Each: thumbnail + rarity name + CP + level
- Click → opens Pet Detail Modal

### Dev Tools (always visible)
- **🔧 Dev 工具** toggle button at the top of the main content — visible to **all users** (no login required, no email check)
- Panel is **floating overlay** (`position: absolute; max-height: 50vh; overflow-y: auto`) — map stays visible behind it
- **GPS**: 📡 開GPS / ⏹ 熄GPS toggle (starts/stops `watchPosition`)
- **🕹️ 手動模式 ON/OFF** toggle (v0.37.1+): when ON, stops real GPS and enables D-pad arrow controls; when OFF, D-pad is disabled and GPS can be restarted
- **D-Pad** (▲◄►▼, v0.37.1+): press a direction to walk without GPS (~15m per step):
  - Tap → moves one step immediately
  - Hold → continues walking every 150ms
  - Shows current `lat, lng` below the D-pad
  - Only works when manual mode is ON
  - Uses `stepManualWalk()` + `setInterval` pattern (not `onMouseDown`-only, to avoid missed ticks)
- **🎲 Event** button — one-click trigger for random roguelike events (Risk Ladder, 陽光草原, etc.); useful for testers to verify event flow without waiting 800 steps
- **Walk Speed**: 1x / 5x / 10x / 50x buttons — set simulation step multiplier; 🟢 indicator shows current speed
- **Walk Simulation**: 🚶 模擬 / ⏹ 停止 toggle — continuous steps at selected multiplier (1x=~1-4 steps/800ms, 50x=~50-200 steps/tick)
- **Step controls**:
  - **+500 步** — adds 500 steps via `addSt()`, triggers event/egg checks
  - **-500 步** (🔴 red) — subtracts 500 steps via `removeSt(500)`, direct state mutation, no triggers
  - **🗑️ 清零** (🔴 red bold) — resets today steps + total steps to 0 via `clearSteps()`
  - **🎨 測試7日路線** (cyan, v0.18.1+) — calls `realMapRef.current.generateTestTrails()` to draw 7 coloured arcs around the current map centre, previewing all trace colours at once
  - **🗑️ 清除路線記憶** (amber, v0.19.0+) — calls `realMapRef.current.clearStoredTrails()`: clears `pipz_trail_data` from localStorage + removes all polyline layers from the map
  - **🎬 重播初始動畫** (purple, v0.19.0+) — generates 5 days of test trail data around HK, saves to localStorage, then reloads the page. On next GPS fix, plays the full fitBounds→flyTo initial zoom animation
- **Test Pet**: 🧪 全能測試寵物 — spawns Legendary pet with all 18 skills (Lv.99, max stats)
- **Quick Modify** (when pet selected):
  - ⬆️ 升 Lv — level +1
  - 👣 +10K 步 — add 10,000 steps to active pet
  - 🌟 進化 — advance evolution stage
  - 💪 MAX — max out all stats + level
- **Log** — shows last 3 log messages (encounters, actions, etc.)

---

## 3. Pets Tab (`tab === 'pets'`)

### Header
- "🐾 寵物" title + count (e.g., "3隻")
- Empty state: 🥚 "未有寵物，行路孵化啦！"

### Three Sections Layout (flex column with independent scroll)

The entire pets tab content is a **flex column** (`display:flex; flexDirection:column; height:calc(100dvh - 110px); overflow:hidden`).

Only the 🐾 其他寵物 grid itself is scrollable — the energy card, team slots, and section headers all stay **fixed** and never scroll away.

#### ⚡ 你擁有的能量 (top card)
- Section title: "⚡ 你擁有的能量"
- Card display:
  - **Amber (#f59e0b) lightning SVG** in a circular amber-tinted background (48×48)
  - "🔋 累積能量" label
  - **User's total steps** in large bold amber text (28px, 800 weight)
  - "步數 = 能量" subtitle
- No pet icon — this is a global energy counter using `totalSteps`
- Not clickable (no modal)

#### ⭐ 主力隊伍 (team slots, max 5)
- Section title: "⭐ 主力隊伍" with count (e.g., "3/5")
- **5-column grid** of equal-width square slots (gap 6px)
- **Filled slot** (team member):
  - Rarity-colored top strip (2px)
  - Pixel pet canvas (size 1.8)
  - **NEW badge** (if freshly hatched): amber `#f59e0b` badge, top-left, pulsating `new-pulse` animation
  - Level label bottom-center
  - **Red minus button** ("−") top-right corner (18px circle, #ef4444 bg, white text, z-index 3)
  - Click pet area → opens **PetDetailModal** for that pet
  - Click minus button → removes pet from team (`toggleFavorite`)
  - Drag-over prevented (already in team)
- **Empty slot** (placeholder):
  - Dashed border, dimmed "+" icon
  - **Drag target** — accept drop from other pets
  - Click does nothing
- **First slot pet = active map pet** — `useEffect` syncs `activeIdx` to `favorites[0]`
- Team order **matches `favorites` array order** (not pets array order):
  ```javascript
  teamPets = favorites.map(fid => pets.find(p => p.id === fid)).filter(Boolean).slice(0, 5)
  ```

#### 🐾 其他寵物 (unselected pets, scrollable grid only)
- Section title: **fixed** (doesn't scroll away), only the pet grid scrolls independently
- **4-column grid** of tiny square cards (gap 8px)
- Each card:
  - Rarity-colored top strip (2px)
  - Pixel pet canvas (size 1.6) centered
  - **NEW badge** (if freshly hatched): amber `#f59e0b` badge, top-left, pulsating `new-pulse` animation
  - Small "▶" arrow (amber) bottom-right if evolvable
  - **`draggable`** — drag to empty team slot to add to team (desktop)
  - **➕ button** bottom-right corner (24px, amber `#f59e0b` + icon overlay) — **tap to add to team** (mobile-friendly, `stopPropagation` preserves detail modal tap)
  - **Click** → opens **PetDetailModal** for that pet
  - On drag start: sets `dataTransfer` with pet ID
  - Active pet highlighted with brighter border
- All pets not in `favorites` array (filtered out automatically)

### PixelPetCanvas (`PixelPetCanvas.tsx`) — v0.13+

Canvas-based pet renderer with 3 rendering paths:

| Path | Used for | Method |
|------|----------|--------|
| **Grid animation** (primary) | PixelLab species (cat seed 175, shiba 23/176) | `generatePetAnimation()` + `drawPixelGrid()` |
| **PNG sprite** (fallback) | Generic species (seed 0-49, excl PixelLab) | `ctx.drawImage()` from cached PNG |
| **Procedural** (last resort) | When PNG fails to load | `generatePixelPet()` + frame animation |

**PixelLab species auto-detection (v0.13+):**
```typescript
const IS_PIXELLAB = (seed: number) => seed === 175 || seed === 23 || seed === 176
const effectiveForceGrid = forceGrid || isPixellab  // skip PNG loading

// Old Shiba (seed 23) → new seed 176 for generator special case
const effectiveSeed = (seed === 23 && isPixellab) ? 176 : seed

// generatePixelPet uses effectiveSeed → returns proper 32×32 Shiba grid
const pd = generatePixelPet({ seed: effectiveSeed, rarity, evolutionStage })
```

**32×32 Grid Size Normalization:**
```typescript
const gridSize = petDataRef.current?.width || (isPixellab ? 32 : 16)
const sizeMult = 16 / gridSize  // 32×32 → 0.5, 16×16 → 1.0
const effectivePixelVal = pixelVal * sizeMult
```

**Sprite loading (generic species only):**
- **Global sprite cache**: all `PixelPetCanvas` instances share a `Map<speciesIdx, Canvas>` — the same species only loads once across the entire page
- **128×128 source sprites** (resized from 768×768)
- Loads `Image` from `/pixel-gen/sprites/${speciesIdx}.png?v=SPRITE_VERSION`
- `onload` → draws PNG to offscreen canvas at 1:1
- `onerror` → falls back to procedural `generatePixelPet()`

**Animation system (v0.9.0+):**
- `generatePetAnimation(petData)` creates:
  - `walkFrames`: 4-frame walk cycle via pixel manipulation (body shift + stride)
  - `blinkFrame`: closed-eye frame for idle blink (eye pixels → outline)
- **Walk state**: cycles through 4 frames at 180ms intervals — shows real pixel changes
- **Idle state**: base frame with blink frame every ~2 seconds
- **Happy state**: cycles all 4 frames at faster rate
- **Fallback path**: `drawPixelGrid(ctx, frameGrid, pixelSize, offsetX, offsetY)` renders each frame

**Rarity effects:**
- Tint overlay: `fillRect` with rgba (common=`transparent`, uncommon=`#22c55e14`, rare=`#3b82f61a`, epic=`#8b5cf61f`, legendary=`#f59e0b26`)
- Glow shadow: `ctx.shadowBlur = size * 3` with rarity glow colour
- Legendary border: gold corner highlights (`#ffd70060`)

**Animation states:**
| State | Behaviour |
|-------|-----------|
| `idle` | Frame 0 + periodic blink + sinusoidal Y bob (±1.5px) |
| `walk` | 4-frame cycle (180ms) + X translation (±20px) + Y step bounce |
| `happy` | 4-frame cycle (faster) + Y bounce (±6px) |
| `jump` | Y arc (15px, decay 0.08/frame) |

**Canvas props:**
- `seed`: species + visual determinism
- `rarity`: tint/glow colours
- `evolutionStage`: not used for PNG (procedural fallback only)
- `animation`: idle/walk/happy/jump
- `size`: pixel multiplier (default 5)
- `onClick`: sets bounceRef + callback
- `forceGrid`: optional, skip PNG loading entirely
- `noAnim`: static frame only, no animation loop

### Interaction Rules (critical)
| Zone | Click/tap | Drag | Minus button | + button |
|------|-----------|------|--------------|---------|
| ⚡ Energy card | Nothing | N/A | N/A | N/A |
| ⭐ Team slot (filled) | Open detail modal | N/A (prevented) | **Remove from team** | N/A |
| ⭐ Team slot (empty) | Nothing | **Drop target** → insert at this slot position | N/A | N/A |
| 🐾 Other pet | Open detail modal | **Drag source** → move to team | N/A | **Add to team** (mobile-friendly) |

### Drag & Drop Implementation
- **Source**: `onDragStart` on other pets — `e.dataTransfer.setData('text/plain', pet.id)`
- **Target**: `onDragOver` (preventDefault) + `onDrop` on empty team slots
- **Positional insert**: dropped pet is inserted at the specific slot index via `splice(slotIdx, 0, pid)`
- **Guard**: no duplicates (`!favorites.includes(pid)`), max 5 (`favorites.length < 5`)

### Mobile Add-to-Team (➕ button)
- Each 🐾 other-pet card has a **➕ overlay** in the bottom-right corner (`.pet-add-btn` CSS class)
- **Tap** → calls `toggleFavorite(p.id)` which appends pet to `favorites` array (first available slot)
- `stopPropagation` prevents the tap from also opening the detail modal
- If team is full (≥5), the button does nothing (no error feedback)
- The pet **disappears** from "其他寵物" once added (filtered by `!favorites.includes(p.id)`)
- **DB sync**: `setFavoriteOrder(pid, slotIdx + 1)` on drop

---

## 4. Eggs (merged into Pets Tab, inside Energy Card)

As of v0.28.0, the standalone Eggs tab was removed. Eggs are now displayed as part of the **energy card** (`⚡ 你擁有的能量`) in the Pets tab.

### Display
- **Eggs > 0**: Shown as a 5-column grid (`repeat(5, 1fr)`) inside the energy card, below the energy number. Each egg is a compact `pet-card` with rarity-coloured border, 🥚 emoji (fontSize 32), rarity label badge, and "點擊孵化" hint.
- **Eggs = 0**: 3 dimmed placeholder slots (opacity 0.4, grayscale) labelled "蛋槽 1/2/3" + "行路獲得".
- **Hatching**: Tapping an egg shows ✨ pulse animation + "孵化中..." text.

### Incubator
- The energy card has 5 grid slots total, accommodating up to 5 eggs per row.
- Locked incubators (🔒 額外孵化器) were removed — they were "coming soon" placeholders from the old eggs tab.

### Flow
1. Walk 2000 steps → 40% chance to find an egg → saved to DB → `setTab('pets')` navigates there
2. Egg appears in the energy card as a clickable card
3. Tap to hatch → `hatchEgg()` → pet created → "收埋" / "去蛋頁面孵化" popup
4. Egg popup and event popup use a queue system (`pendingEggRef` / `pendingEventRef`)

---

## 5. Properties Tab (`tab === 'properties'`)

### Auth Gate
- Not logged in: 🔑 "需要登入先可以使用地產"

### Layout
- Title: 🏠 地產 (large, top-left)
- **📜 pill toggle button** (right of section count, `borderRadius:20`) — toggles between 「📜 細卡」(default) ↔「📜 大卡」. 細卡 uses 3-column `pet-grid`, 大卡 uses 2-column `prop-grid` (wider cards).
- Scrollable grid of property cards (`.pet-grid`, 3-column, gap:6), each showing:
  - **Zone colour top accent bar** (2px, zone colour, rounded top corners)
  - **Emoji icon**: ✅ (own) or 🏠 (unlisted/other's)
  - **Cell name**: `第${row+1}區 ${col+1}號` (zone colour, uppercase, 9px)
  - **📍 District name** (v0.32.0+): real-world district (e.g. "屯門區 · 蝴蝶邨") in small grey text (6px). Batch-fetched from `/api/geocode` via `enrichWithLocation()` after properties load, cached module-level.
  - **👤 seller label** (7px): "👤 你擁有" (own), "👤 {sellerName}" (other's listed), or "由賣家出售" (anonymous)
  - **Price**: ⚡ {price} 步 (amber, 8px bold)
- Clicking any card → **Property Detail Modal** (see §7.4)
- Empty state: "未有地產 — 點擊地圖購買地皮！"

### Data
- `loadUserProperties` (useCallback): calls `loadProperties(user.id)` → sets `properties` state
- Loaded on mount when user is logged in, and after buy/sell/list/unlist/transfer actions

### API
- **GET** `/api/properties?anchor_lat=X&anchor_lng=Y&cell_row=R&cell_col=C` — check ownership + get owner details (used by RealMap popup). Returns `{owner, isMine, price, ownerName, name, purchasedAt}`. Owner's display name is fetched from `profiles` table using service role key (bypasses RLS).
- **GET** `/api/properties/all-cells` — (v0.37.0) returns ALL occupied cells `{anchorLat, anchorLng, cellRow, cellCol}[]` from all users. Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. Consumed by `fetchAllFlagCells()` for cross-user flag rendering on map.
- **POST** `/api/properties` with `{userId, anchorLat, anchorLng, cellRow, cellCol, price}` — buy cell (deducts steps)
- **PATCH** `/api/properties` with `{id, is_listed: bool, list_price?: number}` — list/unlist property on marketplace
- **DELETE** `/api/properties?id=X&user_id=Y` — delete property (permanent, no refund)
- **POST** `/api/properties/transfer` with `{propertyId, buyerId, sellerId, price}` — atomic transfer: deduct steps from buyer → credit seller → transfer ownership

### Global Callbacks (on window)
- `window.__pipzBuyCell(row, col, anchorLat, anchorLng)` — called from Leaflet popup "💪 佔領此地" button → opens **Buy Confirmation Modal** (shows cell name, price, steps balance + 確認/取消 buttons). No longer has client-side steps check (server validates).
- `window.__pipzManageProperty(row, col)` — called from Leaflet popup "📋 管理" button → switches to `tab='properties'`
- **Popup owner info** (v0.31.0): when clicking an owned cell, the leaflet popup dynamically fetches `GET /api/properties?anchor_lat=...` and displays:
  - Self-owned: "✅ 你擁有此地" + 📋 管理 button
  - Other-owned: 👤 owner username (amber), property name (if set), 💎 price paid, 📅 purchase date

### Supabase Table
- `properties`: see DATA_MODEL.md for full schema. Additional marketplace columns: `is_listed` (boolean), `list_price` (integer). Migration: `20260803_property_market.sql`.

---

## 6. Community / Market Tab (`tab === 'community'`)

### Auth Gate
- Not logged in: 🔑 "需要登入先可以使用交易市場"

### My Listings Section
- Section title: "📋 我的上架" + count
- 3-column grid of listed pets (same style as pet-grid)
- Each card: PixelPetCanvas (size 2.2), Lv, ⚡price
- Click → opens PetDetailModal with **Unlist** option
- Empty state: "未有上架 — 喺寵物詳細頁可以上架"

### Marketplace Section
- Section title: "🛒 市集" + count
- 3-column grid of all pets listed by other players
- Each card: PixelPetCanvas (size 2.2), Lv, ⚡price
- Click → opens PetDetailModal in **market mode** with Buy option
- Empty state: "市集暫時未有寵物出售"

### Property Marketplace Section (v0.29.0+)
- Section title: "🏠 地皮市集" + count
- Shows **all listed properties from all players** (including the current user's own)
- 3-column grid (`.pet-grid`, gap:8, same as pet gallery) — changed from 2-column in v0.36.0
- Each card shows:
  - **Zone colour top accent bar** (2px, zone colour)
  - **Emoji icon**: ✅ (own) or 🏠 (other's)
  - **Cell name**: `第${row+1}區 ${col+1}號`
  - **📍 District name** (v0.32.0+): real-world district in small grey text
  - **List price**: ⚡{list_price} 步
  - **Seller name** (if available) or "由賣家出售"
  - **Own property styling**: ✅ icon, green border, semi-transparent (opacity 0.7), "👤 你擁有" label
  - Clicking **any** card → **Property Detail Modal**
- Empty state: "地皮市集暫時未有地皮出售 — 等玩家上架更多地皮！"
- Loaded on tab switch via `loadAllListedProperties()` from `supabase-db.ts` (client-side, uses RLS-read)

---

## 7. App-wide Modal System (v0.30.0+)

Three reusable modals defined directly in `page.tsx`, rendered near the bottom of the component tree.

### 7.1 Alert Modal
- **State:** `alertModal: { message: string; type: 'success' | 'error' | 'info' } | null`
- **Trigger:** `showAlert(msg, type)` — replaces Toast and DevTools log
- **UI:**
  - Centered overlay with backdrop blur
  - Emoji: ✅ (success), ❌ (error), ℹ️ (info)
  - Message text + "關閉" button
  - User must actively dismiss (no auto-dismiss)
- **Usage:** All success/error feedback after actions (buy, sell, list, unlist, transfer)

### 7.2 Confirm Modal
- **State:** `confirmModal: { message: string; onConfirm: () => void; onCancel?: () => void } | null`
- **Trigger:** `setConfirmModal({ message, onConfirm })`
- **UI:** ⚠️ icon + message + 取消/確定 buttons
- **Usage:** Replaces native `confirm()` for:
  - Abandoning property ("確定放棄此地？")
  - Buying from Property Detail Modal ("確定用 ⚡X 購買 X？")

### 7.3 Buy Confirmation Modal (map grid)
- **State:** `buyConfirm: { row, col, anchorLat, anchorLng } | null`
- **Trigger:** Clicking "💪 佔領此地" in the Leaflet grid cell popup
- **UI:**
  - Zone colour header + cell name
  - Price: ⚡25 (v0.33.0+, reduced from ⚡100 with 4× smaller cells)
  - Current steps: 👣 {steps}
  - 取消 / ✅ 確認佔領 buttons
- **On confirm:** POST to `/api/properties`, deducts 25 steps, refreshes property list

### 7.4 Property Detail Modal (v0.32.0+ — redesign v0.36.0)

**Note:** This modal is now rendered **inline** in `page.tsx` (not a separate component file). The modal renders via the `detailProperty` state — when non-null, a `fixed-modal-layer` div appears as an overlay.

- **State:** `detailProperty: Property | null`, `detailLocName: string`
- **Trigger:** Clicking any property card in **Properties** or **Community/Property Marketplace** tab (`onClick={() => setDetailProperty(prop)}`)
- **Close:** Click backdrop (`.fixed-modal-layer`) or the "關閉" button → `setDetailProperty(null)`
- **UI — Monopoly-deed style (full redesign v0.36.0):**
  - **Overlay:** Full-screen fixed, `background: rgba(0,0,0,0.7)`, `backdrop-filter: blur(6px)`, flex center
  - **Card:** `width: 300px`, `max-width: 100%`, `background: #0f1729`, zone-colour border (`2px solid ${color}66`), `border-radius: 12px`, overflow hidden
  - **Header section** (zone colour background):
    - 🏠 emoji (28px)
    - Property name (16px, white, 800 weight)
    - District badge: `{zoneName} · 地段` (10px, white 70% opacity, uppercase, letter-spacing 2px)
  - **Body section** (padding 14px 16px):
    - ✕ close button (top-right, absolute)
    - `.prop-modal-row` rows (flex space-between, border-bottom, 10px font):
      - 📍 地段 | detailLocName (lazy-fetched from `/api/geocode`)
      - ⚡ 價格 | price in amber (bold)
      - 📅 購入 | purchase date (zh-HK locale)
      - 🌐 座標 | anchorLat, anchorLng (4 decimal places)
      - 👤 賣家 | sellerName or "匿名賣家" (no border-bottom)
    - Listed status badge (when `p.isListed`): 📌 上架中 · ⚡{price} 步 (green, border-top separator)
  - **Actions section (v0.36.1+ all uniform full-width):** All buttons are full-width (`width:100%`), same height (`padding:7px 0`), same border-radius (`10px`), same font-size (`11px`), stacked vertically with 6px gap. Previously had mixed sizes (side-by-side `flex:1` + full-width). Colours differentiate actions:
    - **Own property (unlisted):** 📌 上架出售 (green) + 🗑️ 放棄 (red, opens Confirm Modal)
    - **Own property (listed):** 📭 下架 (amber) + 🗑️ 放棄 (red)
    - **Other's property:** ⚡ 購買地皮 (purple gradient, opens Confirm Modal → transfer)
    - **Navigate to map:** 🗺️ 在地圖上顯示 (blue, calls `__pipzFlyToProperty`)
    - **Cancel:** 關閉 (grey, dismisses modal)
- **Location name fetch:** `useEffect` on `detailProperty?.id` → checks `p.locationName` first → falls back to `fetchLocationName()` → caches on both `geocodeCache` and `p.locationName`

### PetDetailModal Market Mode
- **isMarket={isMarketView && !isOwnPet}**: Shows seller asking price + ⚡ **購買** button
- **Own pet (onList={user && isOwnPet})**: Shows:
  - If listed: ✅ 已上架 + price + **取消上架** button
  - If not listed: **🏪 上架交易市場** section with price input + **📤 上架** button
- **onBuy={user && isMarketView && !isOwnPet}**: Only other users' market pets show the buy button
- Purchase deducts `price` from buyer's `total_steps` (local state via `setTotalSteps(s => Math.max(0, s - price))` immediately, synced to Supabase via debounce) and adds to seller's
- Pet ownership transferred to buyer after purchase
- **Market data load**: `loadMarketListings()` and `loadMyListings()` both fetch from `/api/market`, filter client-side by `user_id`
- **detailPet lookup**: `pets.find(p => p.id === detailPetId) ?? marketListings.find(p => p.id === detailPetId)` — searches own pets first, falls back to market listings

---

## 6. Pet Detail Modal (`PetDetailModal.tsx`)

Full-screen overlay, max-width: 24rem centered.

### Header
- "← 返回" button | "寵物詳情" title | **紅色 ✕ 刪除按鈕** (右上角)
- ✕ 按鈕 hover 會變亮，click 開 delete confirmation popup

### Delete Confirmation Popup (full-screen overlay)
- Backdrop blur + dark overlay
- 🗑️ 大 icon + "確定要剷除呢隻寵物？" 紅色警告
- "此操作無法還原" 灰色提示
- 兩個按鈕：**取消** (灰) / **確認剷除** (紅)
- Click overlay 背景 = 關閉 popup

### Pet Display Section
- Large Canvas pet animation (happy state)
- Rarity badge
- **Species name**: `#圓貓` / `#柴犬` / `#小狗` etc. (rendered via `generatePixelPet({ seed: seed, ... }).speciesName`)
  - Shiba seed mapping: old '23' → 176 so species name shows '柴犬' not random name
- Level, CP, Stage name
- **Mood emoji + text + mood bar**:
  - Mood emoji (😊/🤩/😋/😴/😢) + mood label (開心/興奮/肚餓/眼瞓/傷心)
  - **Mood bar**: green `#22c55e` (>60) / amber `#eab308` (30-60) / red `#ef4444` (<30), gradient fill
  - Percentage shown (e.g., 92%)
- **No action buttons**: feed/pet/play have been removed from the detail view
- **Equipment slots (WoW-style square grid)**: 2×2 grid flanking the pet canvas in the top row of the same card:
  - Layout: `[head+body stacked left] [PET CANVAS] [feet+accessory stacked right]`
  - 4 slots: 頭 (Head) + 身 (Body) on left, 腳 (Feet) + 飾 (Accessory) on right
  - Equipped items show icon + rarity border + stat bonus
  - Empty slots show dashed border + slot icon + label
  - Drag-over highlights slot border in purple (`#8b5cf6`)
  - Equipped item has ✕ button (top-right) to unequip
  - Click empty slot → opens inventory to pick equipment
  - **Drag-drop row**: "可用裝備（拖到 slot 上）" shows draggable equipment items from inventory
  - Items use HTML5 `draggable="true"` with `DataTransfer` API
  - Equip flow: drag → drop → `onEquipToSlot(slot, equipmentId)` → DB update → re-render

### Stats Section
- "📊 能力值" title
- 4 stat bars with values (speed, luck, charm, energy)
- Progress bar fill: purple→cyan gradient

### Skills Section
- "🎯 技能" title
- List of skill cards (icon + name + description + power + level)
- Skills with **gameplay effects** (e.g., 雙倍步伐, 能量過載) show an amber "效" badge next to name
- Empty state: "未有技能"

### Evolution Section
- "🌟 進化進度" title
- 5-stage dot progression (BB → I → II → III → IV)
- Stage names below dots (BB → 幼年 → 成年 → 完全體 → 傳說)
- Progress bar showing steps toward next stage
- **Evolve button** (ALWAYS visible):
  - If evolvable: golden "🌟 進化！" with glow
  - If not: dashed "🔒 需要多 X 步進化"

### Total Stats Section
- "📈 總計" title
- List: 總步數, 等級, 階段, CP, 技能數量

---

## 7. Auth Modal (`auth-modal.tsx`)

### States
- Not logged in: Login form
- Logged in: Account info + logout
- Sent: Success message

### Login Form
|- Two tabs: "密碼" / "Magic Link"
|- **One-click test login**: 🔑 一鍵登入測試帳號 button (green outline, between tabs and email input) — directly calls `signInWithPassword('pipztest@gmail.com', 'Test123456!')`
|- Email input (autoFocus)
- Password input (password mode only)
- Error message display
- Submit: "登入" / "註冊" / "發送 Magic Link"
- Toggle: "未有帳號？註冊" / "已有帳號？登入"

### Account View
- Avatar circle (first letter of email, purple→cyan gradient)
- Email display
- Green "● 已登入" status
- Red "登出" button

### Styling
- Fixed overlay with backdrop blur
- Dark card (#141b2d), max-width 320px
- Tab toggle pill style

---

## 8. Auth Callback (`api/auth/callback/route.ts`)

- Server route that redirects back to main page with `?code=` parameter
- Client-side `AuthProvider` picks up the code via `exchangeCodeForSession`

---

## 9. Evolution Modal (inline in `page.tsx`)

- Overlay with backdrop blur
- Two states:
  - **Confirm**: Pet Canvas + "🌟 進化可能！" + stage name → stage name + "下次先" / "🌟 進化！" buttons
  - **Animating**: ✨ emoji + "進化中..." + sparkle particles (1.2 seconds)
- **After animation**: Auto-closes modal + redirects to **pets tab**
- On evolution:
  - Step deduction: pet.totalSteps - requirement of current stage (e.g. 10K/30K/60K/100K)
  - Stats boosted by growthFactor (1 + (stage-1)*0.3)
  - Level +1
  - Saved to Supabase DB

---

## 10. Egg Found Popup (inline in `page.tsx`)

Popup that appears when walking triggers an egg encounter (every 2000 steps, 40% chance).

### Triggers
- **Automatic**: `addSt()` → egg encounter check → `setEggFoundData({ type, rarity, eggId })`
- **Dev Tools**: Walk simulation generates steps which can trigger egg encounters normally

### Queue System (Event/Egg Interleaving)
Both event checks and egg checks run synchronously in `addSt()`. To prevent one modal overwriting the other:

| Scenario | Behavior |
|----------|----------|
| Only egg triggers | Egg popup shows immediately |
| Only event triggers | Event modal shows (existing) |
| Both trigger in same `addSt()` call | Event shows first; egg queued via `pendingEggRef`. On event dismiss → egg popup appears |
| Egg popup showing, event triggers | Event queued via `pendingEventRef`. On egg dismiss → event modal appears |
| Event modal showing, egg triggers | Egg queued via `pendingEggRef`. On event dismiss → egg popup appears |

**Implementation:**
- `pendingEggRef` / `pendingEventRef` — `useRef`-based queue
- `handleEventChoice()` checks `pendingEggRef` after `setCurrentEvent(null)`
- `dismissEggFound()` / `goToEggsFromPopup()` check `pendingEventRef` after `setEggFoundData(null)`
- Event check in `addSt()` checks `eggFoundData` before `setCurrentEvent(ev)`

### UI
- Full-screen overlay with backdrop blur
- 🥚 48px emoji
- "🚶 行路發現新蛋！" subtitle
- Egg name (圓貓蛋 / 柴犬蛋)
- Rarity badge (Rare for cat, Uncommon for shiba)
- Description: "{emoji} 行路途中發現咗 {eggName}！快啲去孵化啦！"
- Two buttons:
  - **收埋**: closed overlay (dismisses popup, checks pendingEventRef)
  - **🥚 去蛋頁面孵化**: closes overlay + switches to eggs tab (also checks pendingEventRef)

### States
- `eggFoundData: {type:'cat'|'shiba'; rarity:Rarity; eggId:string} | null` — null = hidden

---

## 11. ~~WalkingCanvas~~ (`WalkingCanvas.tsx`) *(deprecated — no longer used in app)*

Previously a canvas-based top-down pixel art view. **No longer imported or rendered** — removed from map page in v0.3.6.

Encounter system now uses a direct popup modal instead of animation canvas.

### States
- **idle**: Pet stands with slight idle bob, ground slowly scrolls
- **walk**: Pet legs alternate, ground scrolls at walking speed
- **run**: Faster scrolling + leg movement speed
- **encounter**: Grass shakes near pet → ❗ pop → egg + sparkles → callback

### Props
- `state`: `'idle' | 'walk' | 'run' | 'encounter'`
- `speed`: 0-100, affects scroll rate
- `onEncounterEnd`: callback when encounter animation completes
- `size`: pixel multiplier (default 3 = 320×180 base resolution)
- `pet`: `{ rarity, evolutionStage } | null` — the pet character to render

### Visual Design
- Top-down 2D pixel art environment
- Grass ground with checkerboard tiles and small flowers
- Winding dirt path going upward with edge lines
- Trees (trunk + leaves) on both sides, scrolling with parallax
- Pet character drawn procedurally:
  - Body colour = rarity colour (common→legendary)
  - Size = 4-8px based on evolution stage
  - White eyes, coloured limbs
  - Walking animation: legs alternate + arms swing
  - Idle: slight vertical bob
- No pet → egg at centre with floating animation
- Canvas CSS: `width: 100%; height: 100%` — fills parent card with `aspectRatio: 4/3`
- Wraps Y for all elements (seamless scrolling)
- Encounter: dark vignette, grass shake, ❗ mark, egg with sparkles, timed callback

---

## 10. PWA Support

### Files
| File | Purpose |
|------|---------|
| `public/manifest.json` | PWA manifest — name, icons, display standalone, theme color `#0b1120` |
| `public/sw.js` | Service worker — cache-first for static assets, network-first for navigation |
| `public/icon-192.png` | App icon 192×192 (lightning bolt on dark bg, generated via Sharp) |
| `public/icon-512.png` | App icon 512×512 (same design) |
| `public/favicon.svg` | Browser tab SVG favicon (lightning bolt) |
| `scripts/gen-icons.mjs` | Node.js script to regenerate PNG icons from SVG template |

### Layout Metadata (`layout.tsx`)
- `manifest: '/manifest.json'` — links PWA manifest
- `icons.icon: '/favicon.svg'` — favicon
- `icons.apple: '/icon-192.png'` — apple-touch-icon
- `appleWebApp.capable: true` — iOS standalone mode
- `appleWebApp.statusBarStyle: 'black-translucent'` — iOS status bar
- `viewport.themeColor: '#0b1120'` — browser chrome colour

### Service Worker Strategy
- **Install**: Cache `/`, `/manifest.json`, icons, favicon
- **Static assets** (scripts, styles, images, fonts, `/_next/static/`): **Cache-first** — serve from cache, update on fetch
- **Navigation + API**: **Network-first** — fetch from network, fall back to cache when offline
- **Register**: `src/components/SwRegister.tsx` client component, mounted in `layout.tsx`
- SW skips waiting and claims clients immediately on activate
- **Cache versioning**: SW version (`pipz-v1`, `pipz-v2`, etc.) must be bumped in `public/sw.js` every deploy to force PWA update:
  ```js
  const CACHE = 'pipz-v2'  // bump on every significant update
  ```
- **iPhone PWA cache fix**: When user reports "冇睇到更新":
  1. Settings → Safari → Advanced → Website Data → Delete `pipz-ivory.vercel.app`
  2. Kill PWA app
  3. Open Safari to URL (loads new SW)
  4. Re-open PWA app

### Installation
- **Desktop Chrome**: Address bar install prompt or ⋮ → Install Pipz
- **Android Chrome**: ⋮ → Install app
- **iOS Safari**: Share → Add to Home Screen (manual, Safari only)
- **iOS limitation**: Background GPS does not work when app is minimized (Safari restriction)

---

## 12. Profile Modal (`ProfileModal.tsx`)

Full-screen overlay showing user profile and stats.

### Header
- "← 返回" button | "👤 個人檔案" title

### Avatar Card
- 56px gradient circle (purple→cyan) with first letter of email
- Email address (full, word-break)
- "● 已登入" green status

### Stats Section
- "📊 統計" title
- 4 stat rows with colored values:
  - 👣 總步數 (amber `#f59e0b`)
  - ⚡ 今日步數 (cyan `#22d3ee`)
  - 🐾 寵物 (purple `#8b5cf6`)
  - 🥚 蛋 (green `#22c55e`)

### Achievements Section
- "🏆 成就" title
- 7 achievement badges with unlock state:
  | Achievement | Unlock condition |
  |-------------|------------------|
  | 👣 第一步 | totalSteps >= 1,000 |
  | 🥚 孵化者 | pets.length >= 1 |
  | 🌟 進化大師 | any pet evolutionStage > 1 |
  | 🚶 行路人 | totalSteps >= 10,000 |
  | 🐾 收藏家 | pets.length >= 3 |
  | 💜 繁殖者 | pets.length >= 5 |
  | 🏃 馬拉松 | totalSteps >= 50,000 |
- Unlocked: purple-tinted bg + colored border
- Locked: dimmed dark bg + 🔒 icon

### Sign Out Button
- Red button at bottom: "🔴 登出"
- Access via header user email button (replaces the old inline logout)

---

## 13. Notification Modal (`NotificationModal.tsx`)

Full-screen overlay showing all system notifications.

### Header
- "← 返回" button | "🔔 通知" title with unread count badge
- "全部已讀" button (only visible when unread > 0)

### Notification Types & Icons

| Type | Icon | Color | Trigger Event |
|------|------|-------|--------------|
| `pet_sold` | 💰 | `#f59e0b` | 你上架嘅寵物俾人買走 |
| `pet_bought` | 🎉 | `#22c55e` | 喺市集成功買入寵物 |
| `egg_hatched` | 🐣 | `#a855f7` | 蛋孵化出新寵物 |
| `pet_evolved` | 🌟 | `#f59e0b` | 寵物進化到下一形態 |
| `milestone` | 🏆 | `#3b82f6` | 步數達里程碑 (1k/5k/10k/25k/50k/100k/250k/500k/1M) |
| `achievement` | ⭐ | `#eab308` | 成就解鎖 |
| `egg_encounter` | 🥚 | `#ec4899` | 行路途中發現新蛋 |
| `pet_care` | 🍖 | `#ef4444` | 肚餓/唔開心時餵食 |
| `reward` | 🎁 | `#8b5cf6` | 每日獎勵 / Egg grant |
| `system` | 📢 | `#64748b` | 系統公告 |
| `info` | ℹ️ | `#5a6d85` | 其他資訊 (fallback) |

Each notification card shows:
- **Left border**: 3px colour bar matching notification type
- **Icon**: 20px emoji
- **Title**: bold 12px (white if unread, grey if read)
- **Message**: 11px secondary text
- **Timestamp**: 9px in zh-HK locale
- **Unread dot**: 8px purple circle (right side)

### Notification Generation (Client-side)
- `createNotification(userId, type, title, message, relatedPetId?)` helper in `supabase-db.ts`
- Calls `POST /api/notifications` with service-role key via API route
- Triggers in `page.tsx`:
  - **egg_hatched**: after `hatchEgg()` completes (2s animation)
  - **pet_evolved**: after `evolve()` calculation
  - **milestone**: in `addSt()` step counter, checks `MILESTONES[]` crossing
  - **egg_encounter**: on random encounter roll in `addSt()`
  - **pet_care (main)**: in `feed()` when pet mood < 40 or not happy
  - **pet_care (detail modal)**: in `onFeed` callback of PetDetailModal, creates notification + increments unread

### Notification Generation (Server-side)
- `POST /api/market` buy handler creates 2 notifications atomically:
  - **pet_sold**: seller receives "你嘅寵物以 ⚡X 能量賣出！"
  - **pet_bought**: buyer receives "你以 ⚡X 能量買入咗新寵物！"

### Notification Generation (Server-side) (above)

### ModalPortal Component (`src/components/ModalPortal.tsx`)

- Renders children into `document.body` via React `createPortal` to escape Leaflet's GPU compositing stacking context
- **No animation** — children appear/disappear instantly. Previous fade-in/out animation created a transparent overlay (`opacity: 0`) that trapped clicks because `pointer-events` does NOT cascade to grandchildren, and the rAF-based state machine accumulated timing race conditions over repeated open/close cycles
- Returns `null` when not mounted (SSR safety via `useState(false) → true`)
- Modal instances (3 total, independently rendered):
  1. **Property detail modal** — `key={detailProperty?.id ?? '__closed__'}` forces remount on every open/close for clean state
  2. **Alert modal** — replaces toast (shown/hidden via `alertModal` state)
  3. **Confirm modal** — replaces native confirm (shown/hidden via `confirmModal` state)
- CSS: `.modal-portal-wrapper` has `pointer-events: none` (z-index: 9999). Children get `pointer-events: auto` via `.modal-portal-wrapper > *`

### Modal Content: `.fixed-modal-layer`

- CSS class: `position: fixed; z-index: 9999; isolation: isolate`
- **Bottom nav guard**: inline `bottom: 85px` can override CSS `inset: 0` — modal stops 85px above viewport bottom, leaving room for the 5 bottom nav buttons
- `.fixed-modal-layer` does NOT use `!important` on `inset`/`top`/`bottom`/`left`/`right` — only `position: fixed` and `z-index: 9999` are `!important`. This allows individual modals to override positioning (e.g., notification modal sets `bottom: 85px`).

### Unread Count
- 🔔 **Golden bell** in header (between title and right controls): colour = `#fbbf24` (unread > 0) or `#9ca3af` (none)
- Red badge on bell's top-right corner, capped at 99+
- **Incremented locally** (`setNotifUnread(n => n + 1)`) after every `createNotification()` call for instant feedback
- **Refreshed from server** on bell click (open modal) and modal close
- **Loaded on page init**: `useEffect` with `[user?.id]` dependency fetches from `/api/notifications` on user login, ensuring correct bell state after page reload
- Community tab `useEffect` also refreshes on tab switch (backup)

### Milestone Thresholds
```ts
export const MILESTONES = [
  1000, 5000, 10000, 25000, 50000,
  100000, 250000, 500000, 1000000
]
```

---

## 14. New Pet Popup (inline in `page.tsx`)

Full-screen overlay shown after hatching an egg (triggered by `newPetId` state).

### Trigger
- Set by `spawnPet()` via `setNewPetId(np.id)` after any pet is created
- Covers both `hatchEgg()` (egg inventory hatch) and `hatch()` (first pet at 1000 steps)

### Layout
```
┌──────────────────────────────┐
│    🐣 新寵物孵化！           │  ← uppercase label
│                              │
│      [PixelPetCanvas]        │  ← size=5, animation="happy"
│                              │
│      [稀有度 Badge]          │  ← colour-coded
│      #speciesId              │
│      Lv.1 · BB               │
│                              │
│   ⚡20  🍀15  💜25  🔋18   │  ← 4 stats in mini cards
│                              │
│      [🎉 睇下寵物！]        │  ← button
└──────────────────────────────┘
```

### Behaviour
- z-index 200 (above all other modals)
- Backdrop: `rgba(0,0,0,0.8)` with `backdrop-filter: blur(8px)`
|- Click outside → dismisses popup + clears `newPetId` (adds to `dismissedNewPets` Set to prevent auto-detect re-creation)
|- "🎉 睇下寵物" button → `dismissNewPet()` + switches to pets tab (closes popup, prevents auto-detect loop)
|- **NEW badge** appears on the hatched pet's card in pets tab (team slot or other pets grid)
|- NEW badge uses **2-layer detection**: `createdAt` recency (within 5 min) → `newestPet` fallback (newest non-favorite)
|- Badge is **independent of popup state** — uses dedicated `badgeDismissed` ref instead of `dismissedNewPets`/`newPetId`
|- **Dismissed**: clicking the pet card adds to `badgeDismissed` ref → badge disappears immediately
|- **Auto-expires**: badge auto-hides 5 min after pet creation (recency check timeout)

### CSS
```css
.new-badge {
  position: absolute; top: -2px; left: -2px;
  background: #f59e0b; color: #0b1120;
  font-size: 6px; font-weight: 800;
  padding: 1px 5px; border-radius: 4px;
  z-index: 5; line-height: 1.2;
  letter-spacing: 0.3px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  animation: new-pulse 1.2s ease-in-out infinite;
}
@keyframes new-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
```

---

## 16. Anim Test Page (`/anim-test`)

Standalone canvas-based pixel art animation demo for testing walk cycles.

| Property | Value |
|----------|-------|
| Route | `/anim-test` |
| Sprite | 24×24 pixel cat, PICO-8 palette |
| Animation | 4-frame walk cycle (stand → left → stand → right) |
| Renderer | HTML5 Canvas + `requestAnimationFrame` |
| Frame duration | 180ms per frame |

### Data flow

```
Pixel grid (string[] of 24 palette-index chars)
  → drawSprite(ctx, frame, 8× scale)
    → requestAnimationFrame loop
      → 192×192 canvas display
```

### Expandability

- Add blink frames (overlay closed eyes)
- Add sleep frames (half-closed eyes + Y bob)
- Add jump frames (vertical arc)
- Replace pixel data with AI-generated sprite when API is reliable

---

## 18. Inventory Tab (`tab === 'inventory'`)

Full-page inventory view accessible as the 5th bottom nav tab (🎒 背包).

### Header
- "🎒 背包" title with count: `{helpCount}道具 · {equipCount}裝備`

### States
- **Empty**: 📭 icon + "未有物品 — 行路探索拎道具啦！" message
- **Items**: Scrollable list of item cards, each showing:
  - **Icon**: 36px rounded square with rarity-tinted background
  - **Name**: bold 12px + rarity label
  - **Description**: 10px grey text
  - **Quantity**: shown when > 1 (e.g., "x3")
  - **Action button**:
    - Help items: green "使用" button → calls `useHelpItem()`, switches to map tab
    - Equipment: blue "裝備" button → opens PetDetailModal for first pet

### Data Source
- `inventory` state loaded from `loadInventory(user.id)` on login and when PetDetailModal opens
- Items resolved against `HELP_ITEM_POOL` and `EQUIPMENT_POOL` by `itemId`

### Required Auth
- Tab content only renders when `user` is logged in (`{tab === 'inventory' && user && ...}`)
- Non-logged-in users see the 5th nav button but no inventory content
