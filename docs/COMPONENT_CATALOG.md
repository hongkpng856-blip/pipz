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
- **Encounter**: grass shakes near pet, ❗ pops up, egg appears with sparkles
- Canvas fills entire card with `aspectRatio: 4/3`
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

### Pet Grid (P&D album style)
- **3-column grid** of pet cards (gap 6px)
- Each card:
  - **Rarity-colored top strip** (3px)
  - **CP badge** (amber, absolute top-right)
  - **Pixel pet Canvas** (48×48)
  - **Rarity stars** (★ × 1–5, coloured, e.g. ★★★ for Rare)
  - **Level** "Lv.X"
  - **Evolution indicator** (bottom-right):
    - ▶ amber with glow animation if evolvable
    - ► grey if locked
- Hover: rarity-coloured border glow
- Active: scale 0.93 press effect
- Empty state: 🥚 "未有寵物，行路孵化啦！"
- Click → opens Pet Detail Modal

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

## 5. Community Tab (`tab === 'community'`)

- Centered card with 🏪 icon
- Title: "社群 & 交易"
- Description: "與其他玩家交換寵物"
- 3 items (all "即將開放"):
  - 行路競賽
  - 交易市場
  - 好友列表

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
