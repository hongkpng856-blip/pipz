# Component Catalog

> Every screen and component in the Pipz web app. iOS/Android agents should replicate these exactly.

## 1. Main Page (`page.tsx`)

The entire app is a single page with 4 tabs and modals.

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
│   Bottom Navigation (fixed)  │  ← 4 tabs: 地圖 🐾 蛋 🥚 社群 🏪
└──────────────────────────────┘
```

### Header
- Left: "Pipz" title
- Right: Sync indicator, **Walk button (🚶/⏹)**, GPS badge, email button, logout, 👣 icon, step count

### Bottom Navigation
- 4 fixed tabs: 地圖 (Map), 寵物 (Pets), 蛋 (Eggs), 社群 (Community)
- Active tab: purple highlight
- Navigation is `position: absolute; bottom: 0`

---

## 2. Map Tab (`tab === 'map'`)

### Pet Display Card → **WalkingCanvas** (top-down pixel view — Pixel Agents style)
- Top-down 2D pixel art environment (grass, winding path, trees, bushes)
- **Pet character** drawn with rarity colour + evolution stage size
- **Idle**: pet stands with slight idle bob, ground slowly scrolls
- **Walk**: pet legs alternate, ground scrolls at walking speed
- **Run**: faster scrolling + leg movement
- **Encounter**: grass shakes near pet, ❗ pops up, egg appears with sparkles (longer ~4s animation), then popup shows collected egg
- After encounter: **egg popup** with rarity badge + "去蛋頁" button (not a pet yet)
- Egg goes to inventory, hatched on Eggs tab by tapping
- Pet status shown BELOW the canvas in a slim bar

### Stats Card
- Bigger card with **bar chart visualization**
- Top row: today's steps | total steps (divided by vertical line)
- Three bars:
  - 📊 **今日進度**: today's steps / 5,000 goal
  - 📈 **總步數進度**: total steps / 10,000 milestone
  - 🥚 **孵化進度** / 🌟 **進化進度**: depending on pet state
- Walk button moved to **header** (top-right area)
- Green bg when idle, red bg when walking

### Nearby Pets
- Horizontal scroll row of recent pets
- Each: thumbnail + rarity name + CP + level
- Click → opens Pet Detail Modal

### Debug Row
- "+500 測試步數" button
- "🛰️ GPS 記錄真實步數" label

### Log
- Shows last 3 log messages (encounters, actions, etc.)

---

## 3. Pets Tab (`tab === 'pets'`)

### Header
- "🐾 寵物" title + count (e.g., "3隻")
- Empty state: 🥚 "未有寵物，行路孵化啦！"

### Three Sections Layout

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

#### 🐾 其他寵物 (unselected pets)
- Section title: "🐾 其他寵物" with count
- **4-column grid** of tiny square cards (gap 8px)
- Each card:
  - Rarity-colored top strip (2px)
  - Pixel pet canvas (size 1.6) centered
  - Small "▶" arrow (amber) bottom-right if evolvable
  - **`draggable`** — drag to empty team slot to add to team
  - **Click** → opens **PetDetailModal** for that pet
  - On drag start: sets `dataTransfer` with pet ID
  - Active pet highlighted with brighter border
- All pets not in `favorites` array

### Interaction Rules (critical)
| Zone | Click | Drag | Minus button |
|------|-------|------|--------------|
| ⚡ Energy card | Nothing | N/A | N/A |
| ⭐ Team slot (filled) | Open detail modal | N/A (prevented) | **Remove from team** |
| ⭐ Team slot (empty) | Nothing | **Drop target** → insert at this slot position | N/A |
| 🐾 Other pet | Open detail modal | **Drag source** → move to team | N/A |

### Drag & Drop Implementation
- **Source**: `onDragStart` on other pets — `e.dataTransfer.setData('text/plain', pet.id)`
- **Target**: `onDragOver` (preventDefault) + `onDrop` on empty team slots
- **Positional insert**: dropped pet is inserted at the specific slot index via `splice(slotIdx, 0, pid)`
- **Guard**: no duplicates (`!favorites.includes(pid)`), max 5 (`favorites.length < 5`)
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
- **isMarket=true**: Shows seller asking price + ⚡ **購買** button
- **Own pet (onList provided)**: Shows:
  - If listed: ✅ 已上架 + price + **取消上架** button
  - If not listed: **🏪 上架交易市場** section with price input + **📤 上架** button
- Purchase deducts `price` from buyer's `total_steps` and adds to seller's
- Pet ownership transferred to buyer after purchase

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
- Rarity badge, Level, CP, Stage name
- Mood emoji + text
- 3 action buttons: 🍖餵食 ✋摸頭 🎾玩

### Stats Section
- "📊 能力值" title
- 4 stat bars with values (speed, luck, charm, energy)
- Progress bar fill: purple→cyan gradient

### Skills Section
- "🎯 技能" title
- List of skill cards (icon + name + description + power + level)
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
- Two tabs: "密碼" / "Magic Link"
- Email input (autoFocus)
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

## 11. WalkingCanvas (`WalkingCanvas.tsx`)

Canvas-based top-down pixel art view (VS Code Pixel Agents style).

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

### Installation
- **Desktop Chrome**: Address bar install prompt or ⋮ → Install Pipz
- **Android Chrome**: ⋮ → Install app
- **iOS Safari**: Share → Add to Home Screen (manual, Safari only)
- **iOS limitation**: Background GPS does not work when app is minimized (Safari restriction)
