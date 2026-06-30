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
│   Bottom Navigation (fixed)  │  ← 5 tabs: 地圖 🐾 蛋 🥚 社群 🏪 背包 🎒
└──────────────────────────────┘
```

### Header
- Left: "Pipz" title
- **Golden bell 🔔** (after title): opens notification modal; color `#fbbf24` (gold) when unread > 0, `#9ca3af` (grey) when none; red badge on top-right corner (capped 99+)
- **Unread count loads on page init** — `useEffect` runs on user login to fetch unread notifications from DB, so the bell shows correct gold/grey state even after page reload
- Right: sync indicator, Walk button (🚶/⏹), GPS indicator, profile button 👤, steps counter 👣

### Bottom Navigation
- 5 fixed tabs: 地圖 (Map), 寵物 (Pets), 蛋 (Eggs), 社群 (Community), 背包 (Inventory)
- Nav grid uses `grid-template-columns: 1fr 1fr 1fr 1fr 1fr` (5 equal columns)
- Active tab: purple highlight
- Navigation is `position: absolute; bottom: 0`

---

## 2. Map Tab (`tab === 'map'`)

### Main View: Single State (PetCompanion)

#### State A — PetCompanion (🐱 full-screen interactive play card)
Always rendered on the map tab. Rendered by `PetCompanion.tsx`.

**Layout:**
|- Full-width card with **rounded corners** (`border-radius: 16px`), uniform dark bg `#141b2d`, `position:relative`
|- **Canvas** (400×280): pixel pet roams freely in full 2D with shadow, mood emoji above sprite
|  - **Skills**: displayed as pill badges in a clean wrap layout **below the stat grid** (moved out of canvas overlay)
|  - **Species name badge** (`#水晶`): overlaid on canvas top-left (translucent bg)
|  - **Rarity badge**: overlaid on canvas top-right (coloured bg)
|- **Steps walked together header**: 👣 hero section at **very top of card** (above canvas) showing pet's accumulated steps (`pet.totalSteps`) in 32px bold with 「一起走過的日子」subtitle — represents days spent together with this pet
|- **Sprite**: rendered at ~96px with crisp pixel edges (`imageSmoothingEnabled=false`)
|- **⤵ Below canvas — clean info panel** (no action buttons):
|  1. **Row 1**: mood emoji + % + mood bar + Lv. + evolution stage
|  2. **2×2 stat grid**: ⚡速度 / 🍀運氣 / 💜魅力 / 🔋能量 (each in a rounded bg cell)
|  3. **Skills**: horizontal wrap of pill badges (icon + name, amber dot for active effects)

```
┌─────────────────────────────────┐
│          👣                      │
│        999,999                  │ ← 32px hero header
│     一起走過的日子               │
├─────────────────────────────────┤
│ Canvas 400×280                  │
│  (#水晶 badge top-left)  [傳說]  │
│         🐱 walking sprite        │
│         (mood emoji above)       │
│      [👣 999,999  一起行咗]     │ ← steps badge overlay
├─────────────────────────────────┤
│ 😊 開心  92% ████  Lv.99 · 🌟  │
├─────────────────────────────────┤
│ ⚡速度  999  🍀運氣  999        │
│ 💜魅力  999  🔋能量  999        │ ← 2×2 grid
├─────────────────────────────────┤
│ [⚡疾速衝刺] [🍀幸運搜尋] ...   │ ← skills pills wrap
└─────────────────────────────────┘


#### State B — ~~WalkingCanvas~~ *(removed — no longer used)*
Previously displayed a top-down pixel view during GPS walking and encounter animation. Replaced by PetCompanion which is now always visible.

**Encounter eggs** are now handled entirely through a popup modal — no animation canvas needed.

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
- Three bars:
  - 📊 **今日進度**: today's steps / 5,000 goal
  - 📈 **總步數進度**: total steps / 10,000 milestone
  - 🥚 **孵化進度** / 🌟 **進化進度**: depending on pet state
- **Walk button** moved to **header** (top-right area)
- Green bg when idle, red bg when walking
- **Random egg encounters**: Every 2000 steps accumulated while walking, 40% chance to find a PixelLab 蛋（50/50 cat or shiba）— egg saved to DB, shown in eggs tab

### Nearby Pets
- Horizontal scroll row of recent pets
- Each: thumbnail + rarity name + CP + level
- Click → opens Pet Detail Modal

### Dev Tools (always visible)
- **🔧 Dev 工具** toggle button at bottom of Community tab — visible to **all users** (no login required, no email check)
- **🎲 Event** button — one-click trigger for random roguelike events (Risk Ladder, 陽光草原, etc.); useful for testers to verify event flow without waiting 800 steps
- **Walk Speed**: 1x / 5x / 10x / 50x buttons — set simulation step multiplier; 🟢 indicator shows current speed
- **Walk Simulation**: 🚶 模擬 / ⏹ 停止 toggle — continuous steps at selected multiplier (1x=~1-4 steps/800ms, 50x=~50-200 steps/tick)
- **Test Pet**: 🧪 全能測試寵物 — spawns Legendary pet with all 18 skills (Lv.99, max stats)
- **Quick Modify** (when pet selected):
  - ⬆️ 升 Lv — level +1
  - 👣 +10K 步 — add 10,000 steps to active pet
  - 🌟 進化 — advance evolution stage
  - 💪 MAX — max out all stats + level
- **+500 步** button — adds 500 steps (triggers encounters)
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

## 4. Eggs Tab (`tab === 'eggs'`)

### Incubator
- Slot with egg/badge icon
- Name: "基本孵化器" / "已孵化"
- Progress bar to 1,000 steps
- "進度: X/1.0K" labels

### Locked Slots
- 2 locked slots with 🔒 "額外孵化器" "即將開放"

---

## 5. Community / Market Tab (`tab === 'community'`)

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

## 11. ~~WalkingCanvas~~ (`WalkingCanvas.tsx`) *(deprecated — no longer used in app)*

Previously a canvas-based top-down pixel art view (VS Code Pixel Agents style). **No longer imported or rendered** — removed from map page in v0.3.6.

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

## 17. Inventory Tab (`tab === 'inventory'`)

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
