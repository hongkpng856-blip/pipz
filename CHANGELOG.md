# Changelog

## v0.22.0 (2026-08-01)

### Added
- **Monopoly grid overlay**: 6×6 fixed grid on Leaflet map, each cell is a Monopoly-style property
- **Server-side world anchor**: grid anchored to fixed geographic coordinates stored in Supabase `grid_config` table — shared across all players, cannot be tampered with client-side
- **`/api/grid-config` endpoint**: GET returns the world anchor, POST sets it once (server-authoritative)
- **Grid persistence**: anchor saved to server on first GPS fix → all players see the same cells

### Changed
- **♻️ Grid positioning**: from localStorage + center-on-GPS → server-side fixed anchor rounded to grid boundaries

## v0.21.0 (2026-08-01)

### Added
- **Accelerometer step detection** (60Hz): professional-grade algorithm with band-pass filter (0.5-3 Hz), adaptive threshold (running mean + std), positive+negative peak-pair detection, walking bout gating (≥5 consecutive steps)
- **DeviceOrientation API compass**: real-time magnetometer heading (60Hz) with EMA smoothing (factor 0.5), independent of GPS position updates

### Fixed
- **🐛 步數狂跳（十幾萬步）**: warmup accuracy filter 阻住 `last.current` 初始化 → displacement gate 永遠過唔到；accuracy filter 放 warmup 後面 + displacement gate 放寬至 3m
- **🐛 永遠冇步數**: `mode` default 由 `'stationary'` → `'walk'`（iPhone 經常冇 `pos.coords.speed` → `null` 就走咗去 stationary branch）
- **🐛 iOS motion permission 唔彈**: permission request 由 React synthetic event → native DOM click listener（`document.addEventListener('click', ...)`）
- **🐛 Compass 箭嘴 jitter**: EMA smoothing factor 0.5 加返但因為係 60Hz 所以 ~50ms converge

### Changed
- **♻️ 步數 calibration**: 1 步 = 1 真步（was `d × 1300` inflated），accelerometer: `addSt(accSteps)`，GPS fallback: `addSt(d × 1.4)`
- **♻️ GPS fallback**: 移除 5000-point accumulator，每個 reading 即時計步
- **♻️ iOS permission**: 由 `walkStart()` 搬去 component mount，`requestPermission()` 用 native DOM click，`{ once: true }` 自動清理
- **♻️ Warmup**: accuracy check 放 warmup 後面（所有 5 個 warmup reading 都計數），warmup 期間無條件 set `last.current`

## v0.20.0 (2026-08-01)

### Added
- **🧘 GPS 狀態 badge 三態**：🚶 步行中 / 🧘 靜止中 / 🚗 乘車中，各自不同顏色 badge + dot animation
- **方向即時回饋**：device compass heading EMA smoothing（factor 0.35），每個 GPS tick 更新方向箭嘴

### Fixed
- **🐛 定位 marker 唔顯示**：企定定嗰陣 speed gate（< 0.5 m/s）唔再 block mapPos，位置 marker 即時出現
- **🐛 方向更新延遲**：heading 同位置分離，唔再受 3s time gate / 5m displacement gate 限制

### Changed
- **♻️ GPS 重構**：分離位置更新同步數計算，每個 GPS reading 都 update 地圖位置同方向

## v0.19.0 (2026-08-01)

### Added
- **🚶🚗 步行/乘車檢測**：GPS speed 判斷模式（< 2 m/s = 步行，>= 2 m/s = 乘車），地圖 badge 顯示 🚶 步行中 / 🚗 乘車中。乘車時唔計步、唔畫 trail。 🔍🚗
- **🔍 Auto-zoom 按模式**：步行自動 zoom 18（街道級），乘車自動 zoom 14（區域級）。人手 zoom 後暫停 auto-zoom 15 秒。 🗺️📏
- **💾 路線持久化 (localStorage)**：trail 點自動 save 去 `localStorage`，熄 app 再開路線仍然存在。 `pipz_trail_data` key。 🗺️💾
- **🎬 初始 zoom 動畫**：開 app 後先 `fitBounds` zoom out 顯示所有路線，再 `flyTo` zoom in 到目前位置（zoom 18）。暖機期間唔更新地圖，避免打斷動畫。 🎬✨
- **Dev Tools 🗑️ 清除路線記憶**：清空 localStorage trail + 移除地圖上所有 polyline。 🔧🗑️
- **Dev Tools 🎬 重播初始動畫**：生成 5 日測試路線 → reload 頁面，重播 fitBounds → flyTo 動畫。 🔧🎬

### Fixed
- **初始 zoom 動畫被 GPS 暖機打斷**：5 次 warmup 讀數本來每次都 call `setMapPos` → 觸發 `setView` → 中斷 `fitBounds` 動畫 → `zoomend` 唔 fire → `flyTo` timeout 永遠唔執行 → 地圖 keep 住遠 zoom。Fix：暖機期間唔 `setMapPos`，加 `initialAnimBusyRef` guard 確保動畫完整執行。 🐛✅

### Fixed
- **地圖 tiles 覆蓋通知 modal**：Leaflet tile pane 內部 z-index 200 高過 `.fixed-modal-layer` 嘅 100。將 `z-index` 提升到 9999 + `isolation: isolate` 創建新 stacking context，確保所有 portal modal 喺地圖之上。 🗺️⬆️
- **通知 modal 遮擋底部導航欄**：`css class` 嘅 `inset: 0 !important` 覆蓋咗 inline `bottom: 85px`，令底部空間無效。移除 `!important` 令 inline style 正常生效，modal 內容留 85px 底部空間俾導航欄。 🔔✅
- **CSS `!important` 壓過 inline override**：`.fixed-modal-layer` 嘅 `inset: 0 !important` 阻止任何 component 自訂定位。全部改為非 `!important`，保留 `position: fixed !important` 同 `z-index: 9999 !important`，其他定位屬性可由 component override。 ⚡

### Added
- **`docs/BUGS_AND_PITFALLS.md`**：所有過去錯誤同 bug 修改記錄文件，方便其他平台 agent 參考避免重複錯誤。 📖
- **Dev Tools -500 步**：紅色 `-500 步` button，直接從今日步數同總步數扣除（`removeSt(500)`），唔觸發 event check。方便測試步數倒退情境。 👣🔴
- **🥚 蛋獲得 popup**：行路發現蛋時會彈出「🚶 行路發現新蛋！」視窗，顯示蛋名、稀有度，可「收埋」或「去蛋頁面孵化」。取代之前嘅靜默 logMsg。 🥚✨
- **Event/蛋排隊機制**：如果蛋同 event 同時觸發，先顯示 event，dismiss 後自動彈出蛋 popup（反之亦然）。用 `pendingEggRef` / `pendingEventRef` 做 queue。 🔄
- **🧭 地圖方向指示**：RealMap marker 加 compass ring + heading arrow，GPS 嘅 `pos.coords.heading` 驅動箭頭旋轉（0=北，順時針）。支援 pet marker 同 🥚 預設 marker。 🗺️🧭
- **🎨 7日路線顏色**：地圖路線按星期分 7 色（紫水綠橙紅粉藍），bar chart 圓形圖同步使用相同顏色。每條路線獨立 `L.polyline`，永久保留。 🗺️🌈
- **Dev Tools 🎨 測試7日路線**：`forwardRef` + `useImperativeHandle` 暴露 `generateTestTrails()` 方法，一鍵生成 7 條弧形路線展示所有星期顏色。 🔧🎨

## v0.18.0 (2026-07-03)

### Fixed
- **Modal popups invisible on mobile**: Added `inset: 0` to `.fixed-modal-layer` and `.fixed-modal-layer-top` CSS classes. Without it, `position: fixed` elements had no positioning — modals rendered at their DOM position (below nav, off-screen on mobile). Now covers full viewport correctly. 🖼️
- **Map tiles still covering all modals**: Root cause was `body { position: fixed; }` combined with Leaflet's GPU compositing creating conflicting stacking contexts. All modals now render via React `createPortal` directly to `document.body`, completely outside the `.layout` div and any parent `transform`/`overflow`/`z-index` constraints. Includes new `ModalPortal` component. 🗺️🔝
- **Event popup overlapped with new pet popup**: Auto-dismiss new pet popup when an event triggers (`addSt` → `rollEvent` → `dismissNewPet()` before `setCurrentEvent`). Prevents two overlays stacking.
- **Simulation interval stale closure**: Added `addStRef` to ensure `setInterval` callback inside simulation always calls the latest `addSt` function, preventing stale render-context bugs with event checks.
- **Event `pet` check used closure instead of ref**: Changed `if (... && pet)` to `if (... && petRef.current)` in `addSt` event trigger, consistent with other ref-based state reads in the function.

### Added
- **🗑️ 刪除 pet button in Dev Tools**: New `deleteActivePet()` function removes current active pet from state, favorites, and database (if logged in). Red "🗑️ 刪除" button in the quick modify section.

## v0.17.0 (2026-07-03)

### Fixed
- **New pet popup not dismissing**: Added `popupDismissed` state to prevent auto-detect useEffect from re-opening the popup after user dismisses it. Uses `dismissedNewPets` ref set to block re-detection.
- **+10K step button only added pet steps**: `addPetSteps` now calls `addSt(n)` instead of directly mutating pet state, ensuring skill multipliers, global step counters, and event progress all update correctly.
- **Event progress bar not updating**: Added `eventCounterState` (useState) alongside existing `eventStepCounter` (useRef) so progress bar text/width trigger React re-renders when step count changes.
- **Event step counter used raw `n` instead of `finalSteps`**: Changed `eventStepCounter.current += Math.round(finalSteps * encMult)` to use the skill-multiplied step count, consistent with other step tracking in the app.
- **Dev Tools moved to global dropdown**: Dev Tools moved from bottom of map tab to top of `.main` div, accessible from all tabs (map, pets, eggs, community, inventory) with ▲/▼ dropdown indicator and improved button styling.

## v0.16.0 (2026-07-03)

### Changed
- **Map tiles switched to Google Maps style**: Replaced pixel-art styled tiles (CartoDB dark_all + CSS filters + maxNativeZoom) with **CartoDB Voyager** tiles — clean, light background, clear roads/labels, green parks, blue water. Similar to Google Maps. 🗺️
- **Removed all pixel CSS filters**: No more `image-rendering: pixelated`, `maxNativeZoom`, `saturate/contrast/invert` filters. Clean standard map rendering.
- **Removed `maxNativeZoom`**: Tiles now load at native resolution at every zoom level — no upscaling artifacts.

### Removed
- **總步數進度 bar** (📈) from stats card — removed total steps progress bar
- **進化進度 section** (🌟) from stats card — removed evolution progress bar with per-stage step requirements

## v0.15.0 (2026-07-03)

### Added
- **Map marker → pixel art sprite**: RealMap now renders the active pet's actual pixel art (via `generatePixelPet()` + `drawPixelGrid()` → canvas `toDataURL()` → `<img>` inside Leaflet `L.divIcon`). Rarity-coloured border (3px) + glow. No pet → 🥚 with rarity tint. 🖼️
- **探險進度 card at top of map tab**: Adventure progress card (🎮 探險進度) moved to be the **first element** in map tab — above the map and stats card. Contains:
  - ⚔️ 下一次事件 progress bar (gradient purple fill, milestone markers, 🎁 reward indicator)
  - 🥚 遇蛋機會 progress bar (gradient green fill, 2000-step interval, 40% indicator)
- **`petSpriteDataUrl()` in RealMap**: new helper function converts pet's pixel grid to a base64 PNG data URL for use in Leaflet markers

### Changed
- **Map tab layout order**: 🎮 探險進度 → 🗺️ Map → 📊 Stats Card (previously stats was above adventure)

## v0.14.6 (2026-07-02)

### Added
- **Auto GPS on map tab**: entering map tab auto-starts GPS tracking. Leaving map tab stops GPS to save battery. 🆕

## v0.14.5 (2026-07-02)

### Changed
- **Map tab always shows RealMap**: GPS tracking (`walking && mapPos`) enables live features (blue dot, trail) but the map is always visible. When GPS is off, the map centers on default HK location instead of showing PetCompanion room view.
- Removed unused `PetCompanion` import from `page.tsx` — the component was only used in the map tab area and is no longer needed.

## v0.14.4 (2026-07-01)

### Fixed
- **Per-species flip 方向**：Cat frames 面向 **RIGHT**（鼻在眼左邊），Shiba 同 generic species frames 面向 **LEFT**
  - Cat: `facingLeft → scale(-1,1)`（向左行先 flip）
  - Shiba/其他: `!facingLeft → scale(-1,1)`（向右行先 flip）
  - PetCompanion 兩個 path（PNG + fallback）都用 `shouldFlip` condition
- **PixelPetCanvas oscillating flip**：Walk animation `flipRef` 之前跟 `Math.sin` oscillate（即使 `xOff=0`），set 做 constant `false` — 冇 lateral movement 就唔需要 flip
- **Merge regression `4d38115`**：Clean-flip merge 唔小心 re-add 咗 `xOff = dir * 6`（lateral sway），還原做 `xOff = 0`

### Changed
- PetCompanion: 新增 `framesFaceRight` + `shouldFlip` per-species flip detection
- PixelPetCanvas walk case: 移除 `flipRef = dir > 0`，改為 `flipRef = false`

## v0.14.3 (2026-07-01)

### Fixed
- **PixelPetCanvas PNG path 方向 flip**：全部 generic species 用 PNG path 但 **冇 flip** → 所有非 PixelLab 寵物向右行時倒後行
- **PetCompanion PNG path 方向 flip**：同上，generic species 嘅 companion view 都冇 flip
- 兩個 component × 兩個 rendering path = 4 個 code path 全部加齊 flip

## v0.14.2 (2026-07-01)

### Fixed
- **PetCompanion flip logic 反轉**：`if (facingLeft.current) scale(-1,1)` → frames 面向 LEFT，flip 咗變面向 RIGHT，行緊左但望右 → 倒後行
- 改為 `if (!facingLeft.current) scale(-1,1)`（向右行先 flip）

## v0.14.1 (2026-07-01)

### Fixed
- **PixelPetCanvas 橫向移動 regression**：Merge `4d38115`（clean-flip → main）re-add 咗 lateral sway（`xOff = dir * 6`），令 PixelPetCanvas walk 再次「倒後行」
- 還原 `xOff = 0`（zero lateral sway）

## v0.14.0 (2026-07-18)

### Fixed
- **Walk animation flip 跟方向**：向左行面向左，向右行用 `ctx.scale(-1,1)` flip sprite 面向右 — 頭永遠跟住行路方向
- **Pet icon 視覺大小不一致**：貓（Compact ~19×19）同柴犬（~29×26）用 bounding box normalization，所有 species 嘅 sprite content 視覺大細一致
- **Walk animation 倒後行**：取消 bounce logic（`walkDirRef`），改用 `Math.sin` 平滑 sway，寵物永遠向前行

### Changed
- `PixelPetCanvas.tsx`: 新增 `computeBoundingBox()` — 用 sprite 實際 content 範圍代替 full grid size 做 normalization
- 移除未用嘅 `xOffsetRef`、`walkDirRef`、`yOffsetRef`

## v0.13.2 (2026-07-14)

### Changed
- **PixelLab Shiba像素數據全面升級**：取代手畫 grid data，改用真正 PixelLab API 生成嘅 32×32 sprite + palette conversion
  - Walk: 4 frames（唔同 stride 位置）— 由 `v2/create-image-pixflux` 生成
  - Idle: 3 frames（坐、舐舌、耳仔郁）+ 1 copy
  - Play: 1 frame（跳躍）× 4（API credits 用盡）
  - 背景 index 6 正確 mapping 做 transparent
  - `shiba_32icon.png` — front view 柴犬 icon

### Fixed
- 解決「粉紅耳仔」— palette conversion artifact，原生 PixelLab 10色 palette 限制
- Shiba walk animation 完整 4-frame stride cycle（之前只有 static pose）
- **寵物頁面白底問題**：PixelPetCanvas 同 PetDetailModal 改用 grid animation fallback，移除 `/pixel-gen/sprites/shiba.png`
  - `PixelPetCanvas.tsx`: IS_PIXELLAB 包含 seed 23/176 → forceGrid
  - `PetDetailModal.tsx`: seed mapping for species name
  - 刪除舊 shiba.png（白底源頭）
- `.gitignore`: 加 `*.bak` pattern

### Fixed
- **Shiba rendering fix**: 移除 external PNG sprite（白底 + static image），改用 grid animation system（transparent bg + walk/idle/play 3種動畫）
  - `PetCompanion.tsx`: IS_SHIBA_PET → setStatus('fallback')，跳過 PNG path
  - `generator.ts`: seed 176 special case 正確連接到 pixellab-shiba-data.ts 嘅 32×32 grid
  - `animation.ts`: speciesId === 1 check 正確調用 shibaWalk/shibaIdle/shibaPlay
  - `page.tsx`: spawnShiba speciesId 由 '23' 改為 '176'
  - backward compatible: 舊 pet（speciesId '23'）自動 map 去 seed 176

### Removed
- `/pixel-gen/sprites/shiba.png` — 不再使用 external PNG sprite

### Added
- **New PixelLab Shiba species** (species 1, seed 176): 🐶 柴犬 with dedicated PixelLab-generated walk/idle/play animations
  - `packages/core/src/pixel-gen/pixellab-shiba-data.ts` — 4-frame walk, idle, and play pixel grids
  - `animation.ts` — dedicated shibaWalk/shibaIdle/shibaPlay functions for species 1
  - `generator.ts` — special case for seed 176 returning speciesId=1, speciesName='柴犬'
- **Shiba egg** in Dev Tools: 🥚 柴犬蛋 button (purple styling)
- **Spawn Shiba** function: `spawnShiba()` creates Uncommon Shiba (seed 176) with 4 animations
- **Random encounter**: Walking now has 40% chance per 2000 steps to drop either cat OR shiba egg (50/50)

### Changed
- **Egg hatching**: `hatchEgg()` now handles 3 egg types: `shiba_` → Shiba, `pixellab_` → Cat, old eggs → Cat (fallback)
- **Random egg encounter**: Updated from always dropping cat eggs to 50/50 cat/shiba

## v0.12.0 (2026-07-14)

### Added
- **Walk speed multiplier** (Dev Tools): 1x / 5x / 10x / 50x buttons in Dev Tools — increases simulation step rate from ~1-4 steps/800ms (1x) up to ~200 steps/tick (50x). Current multiplier shown as 🟢 5x indicator.
- **Random egg encounter while walking**: Every 2000 steps accumulated triggers a 40% chance to discover a PixelLab 圓貓蛋. Egg is saved to DB and shown in eggs tab. Console log: "🥚 行路發現咗圓貓蛋！".

### Changed
- **Walk simulation**: Now uses `multiplier` state instead of fixed step increment. Multiplier persisted in component state (default 1x).
- **Event system still triggers** independently alongside egg encounters — both can fire during walking.

## v0.11.0 (2026-06-30)

### Changed
- **Map pet visibility**: PetCompanion only renders when team (favorites) has pets. Empty team = no pet on map.
- **Full egg-to-cat flow**: Removed "直接產生圓貓" instant spawn button. Only "圓貓蛋" in Dev Tools. Egg persists in DB across page reloads.
- **All eggs → PixelLab cat**: Old generic eggs now also hatch into PixelLab cat instead of random pets.
- **Egg DB cleanup**: On page load, old non-pixellab eggs are auto-deleted from DB. Only PixelLab cat eggs survive.
- **Removed old incubator**: "行 1,000 步孵化" incubator section purged.
- **Cleaned dead code**: Removed `showEncounterEgg` state, `setShowEgg` call, unused imports.

### Fixed
- Guest/no-pet state: page shows only header + bottom nav, no pet or popup content.

## v0.10.0 (2026-06-27)

### Added
- **3 animations per pet**: every species now has walk + idle + play (each 4 frames)
  - `generateIdleFrames()` — normal → blink → ear/head twitch → normal
  - `generatePlayFrames()` — bounce → squish → stretch right → stretch left
  - `PetAnimation` type extended with `idleFrames: PixelGrid[]` and `playFrames: PixelGrid[]`
- **`'play'` animation type** replaces `'happy'`/`'jump'` in PixelPetCanvas and PetCompanion

### Changed
- **PixelPetCanvas.tsx**: uses correct frame set per animation type (walk→walkFrames, idle→idleFrames, play→playFrames)
  - Frame timing varies: walk=150ms, play=120ms, idle=180ms
- **PetCompanion.tsx**: auto-behavior cycles between idle, walk directions, and play
  - Play behavior: upper bounce + tilt rotation using playFrames
- **`animation="happy"` → `"play"`**: updated in PetDetailModal.tsx and page.tsx (3 call sites)

### Fixed
- Idle animation now has actual pixel frame changes (blink + twitch), not just bob offset
- Play animation is a distinct frame set, not just accelerated walk frames

### Added
- **`packages/core/src/pixel-gen/animation.ts`**: frame-by-frame animation generator for all pets
  - `generateWalkFrames()` — 4-frame walk cycle from pet's pixel grid (body shift + stride)
  - `generateBlinkFrame()` — closed-eye frame for idle blink animation
  - `drawPixelGrid()` — canvas renderer for pixel grid frames
  - `generatePetAnimation()` — complete animation data generator

### Changed
- **`PixelPetCanvas.tsx`**: frame-by-frame animation replaces transform-only for fallback path
  - Walk state cycles through 4 pixel frames (180ms each)
  - Idle state shows blink frame every ~2 seconds
  - Happy state cycles through all frames at faster rate
- **`PetCompanion.tsx`**: frame-by-frame walk cycle on map screen
  - Roaming pets now show real pixel frame changes during walk
  - Idle blink animation every ~2 seconds
  - PNG sprite path still uses transform animation (upgrade path: replace PNG with AI-gen sprite sheet)

### Fixed
- Missing pixel art frame-by-frame walk cycle — pets now show "真正的行路" (real walking) pixel changes

## v0.8.0 (2026-06-27)

### Added
- **`/anim-test` page**: standalone canvas-based pixel art walk cycle animation demo
  - 24×24 pixel cat with PICO-8 palette, 4-frame walk cycle
  - Hand-drawn pixel data on HTML5 Canvas with `requestAnimationFrame`
  - AI-generated sprite replacement ready architecture (swap pixel data when AI API works reliably)
- **`scripts/gen_anim.py`**: Python tool to download Pollinations.ai base sprite, downscale to pixel art, quantize to PICO-8 palette, and generate 4 walk frames via pixel manipulation

### Changed
- **Animation strategy**: shifted from Pollinations-only sprite sheet generation to canvas-based pixel art rendering — more reliable, faster loading, full animation control

### Fixed
- `/anim-test` page: TypeScript strict mode errors (null refs, closure captures)

## v0.7.0 (2026-06-26)

### Added
- **🎲 Event button in Dev Tools**: one-click trigger for random roguelike events (Risk Ladder, 陽光草原, etc.) — great for testers to verify event flow without waiting 800 steps
- **Dev Tools always visible**: removed all user/email checks — Dev Tools panel now shows for everyone, not just test accounts

### Changed
- **Dev Tools access**: from "test account only (pipztest@gmail.com)" → "any logged-in user" → "always visible (no login required)" over 4 commits
- **Risk Ladder weight restored**: adjusted event pool weight back to 6 for balanced encounter rates

### Removed
- **Triple-tap on PetCompanion**: rejected by user — tester trigger is Dev Tools button only

## v0.6.0 (2026-06-25)

### Added
- **Roguelike events**: 12 random events (6 positive, 6 negative) trigger every ~800 steps while walking; events affect mood/steps/XP/stats; some have branching choices with different outcomes
- **EventModal UI**: full-screen popup with type badge (✨正面/⚠️負面), event icon, description, effect preview, and choice buttons
- **Equipment system (data)**: 15 equipment items across 4 slots (head/body/feet/accessory) with stat bonuses, rarities from Common to Legendary; some are event-only
- **Help items (data)**: 5 consumable items (berry, power herb, swift potion, attract incense, XP elixir) with different effects
- **DB tables**: `pet_equipment`, `inventory`, `event_log` with RPC functions for atomic quantity updates
- **DB CRUD**: equip/unequip items, add/remove inventory, load equipment/inventory, log events
- **Core types**: `EquipmentDef`, `EquipmentSlot`, `HelpItemDef`, `HelpEffect`, `GameEvent`, `EventEffect`, `InventoryEntry`, `EquippedItem`
- **Core formulas**: `rollEvent()`, `rollEquipmentDrop()`, `calculateEquipmentBonus()`, event/equipment/help item pools
- **Bottom inventory card**: compact backpack card at bottom of map tab, shows first 8 items with icons + quantities, click opens full InventoryModal
- **WoW-style square equipment slots**: 2×2 grid in PetDetailModal, shows equipped item icon + rarity border, empty slots as dashed frames with slot label
- **Drag-and-drop equipping**: "available equipment" row in PetDetailModal with draggable items; drop onto slot to equip; drag-over highlighting
- **Click-to-equip/unequip**: click empty slot opens inventory; click equipped item shows ✕ to unequip
- **Backpack as 5th nav tab**: moved from header button + bottom card to its own tab (地圖→寵物→蛋→社群→背包); nav grid expanded to 5 columns
- **Equipment slots inside pet image card**: moved WoW-style 2×2 square grid from separate card into the pet display card (below mood bar)
- **Test account items**: seeded `pipztest@gmail.com` with 5 equipment + 4 help items for drag-drop testing
- **Mobile-friendly tap-to-equip**: replaced HTML5 drag-and-drop with click-to-equip — tap an available equipment item to auto-equip to matching empty slot; dimmed items show when slot type is occupied
- **Pet center + slots on sides layout**: redesigned pet display card to match reference — [slot] [PET CANVAS] [slot] in flex row; head+body on left, feet+accessory on right
- **Risk Ladder interactive mini-game**: new roguelike event — 5 chests (1 bomb), opens one by one; player chooses "拎走" or "繼續" after each safe chest; bomb loses all accumulated rewards; rewards scale from +50 to +800 steps per chest

### Changed
- **Walking loop**: now also rolls for roguelike events alongside egg encounters (`eventStepCounter` every ~800 steps)
- **Console**: simulation mode events also trigger event rolls

### Fixed
- **Pixel crispness (root cause)**: added `ctx.imageSmoothingEnabled = false` in both `PetCompanion.tsx` and `PixelPetCanvas.tsx`. Canvas default is bilinear (smooth) interpolation which blurs pixel art — disabling it restores sharp, square pixel edges
- **Card layout simplified**: removed cluttered 4-column stat grid, decorative paw prints, and skills overlay from canvas. Replaced with clean 2×2 stat grid, pill-style skills below, and better spacing — inspired by reference clean game UI

### Changed
- **Card layout redesigned**: moved skills out of canvas into a clean pill list below stats; species name badge + rarity badge overlaid on canvas; mood bar + evolution info in a single clean row; 2×2 stat grid with tabular-nums alignment
- **Canvas height reduced**: 300px → 280px for tighter sprite area
- **Roaming boundaries now symmetric**: since skills are no longer drawn on canvas, the roaming area is equal on both sides

### Removed
- **餵食/摸頭/玩 actions removed entirely**: stripped `feed()`, `petAction()`, `playAction()` functions, their UI buttons in both PetCompanion and PetDetailModal, and all associated reaction/particle/shake effects — simplifies the card to a clean display-only view
- **Reaction system removed**: `triggerReaction()`, particle effects (❤️💕✨⭐), bounce, and shake animations — no longer needed without action buttons

### Added
- **Steps walked together header**: 👣 hero section at **top of card** (above canvas) showing `pet.totalSteps` in 32px bold with 「一起走過的日子」subtitle — moved from canvas overlay to full-width card-top header
- **One-click test login button**: 🔑 一鍵登入測試帳號 button in auth modal — directly calls `signInWithPassword` with test credentials (pipztest@gmail.com / Test123456!)
- **Test account created**: `pipztest@gmail.com` via Supabase Admin API (email pre-confirmed) — for development/testing use

### Changed
- **Skills vertical left (no overlap)**: skills drawn on canvas 2D as vertical stack on left side; asymmetric roaming boundaries prevent pet from overlapping with skills area
- **Sprite quality fixed**: removed `removeBg()` function that was eating sprite edges (TOL=40 was removing pixels near beige/PICO-8 gray); sprite now renders with full original edges
- **Sprite size increased 78%**: pet sprite rendered at ~96px (up from 54px) for significantly better pixel quality and visual presence on canvas
- **Dev Tools gated to test account only**: 🔧 Dev 工具 section now only renders when `user?.email === 'pipztest@gmail.com'`

### Removed
- **Skills section from PetCompanion info panel**: removed the HTML skills section below the canvas (now drawn on canvas instead)
- **Skills section from pets tab**: skills no longer appear in 🐾 寵物 tab (only on map page canvas)

## v0.4.2 (2026-06-25)

### Fixed
- **Pet skills lost on hard refresh (root cause)**: DB had no `skills` column — `petToDb()` never saved skills, `dbToPet()` returned `skills: []`. Added JSONB `skills` column, serialise/deserialise in both functions. Now skills survive Command+Shift+R.
### Changed
- **PetCompanion always shows skills + stats**: removed 📊 詳情 toggle button — mood bar, 4 stats, evolution info, and 🎯 目前技能 section are now **always visible** directly below the pet canvas
- **Step counter visual effects**: when steps increase (GPS or simulation), today steps number shows:
  - **Green flash** overlay on the counter (`.step-flash` / `.step-flash-skill`)
  - **Floating ↑ arrows** that animate upward and fade out (`.arrow-float` / `.arrow-float-skill` — skill-triggered arrows are larger, brighter, fly higher)
  - **Bounce animation** on the number (`.step-bounce` — scale 1→1.18→0.95→1)
- **Skills always active**: clarified that skill effects (DoubleSteps, EnergyBonus, StepBonus, EncounterUp, HatchSpeed, MoodGuard) apply to the active map pet continuously — not only during simulation mode

## v0.4.1 (2026-06-25)

### Added
- **Skills display in PetCompanion info panel**: when 📊 詳情 is toggled, shows all active skills (icons + names) with 🟡「加成中」badge on gameplay effects
- **Skill effect hints on Stats Card**: 👟 雙倍步伐 / 💨 疾步如飛 shown below today's steps; ⚡ 能量過載 shown below total steps — always visible without toggling
### Changed
- **Today steps shows full number**: uses `toLocaleString()` instead of `formatSteps()` (which abbreviates to K/M) — user sees exact step count for achievement tracking

## v0.4.0 (2026-06-24)

### Changed
- **Pets tab layout restructured**: ⚡ 能量 + ⭐ 主力隊伍 always visible at top, 🐾 其他寵物 scrolls independently in flex container (`calc(100dvh - 110px)` with `overflow-y: auto`)
- **「其他寵物」title fixed**: `.section-header` moved outside scrollable wrapper, only pet grid scrolls — title + count always visible
### Added
- **Mobile add-to-team**: "+" button overlay on each 其他寵物 card — tap adds pet to first available team slot (stopPropagation preserves detail modal tap)
- **Random passive skills**: 6 new gameplay-effect skills (雙倍步伐, 能量過載, 疾步如飛, 寵物磁鐵, 溫暖孵化, 平靜光環) assigned randomly on hatch — effects apply to active map pet
- **Dev Tools: Test Pet + Quick Modify**: "🧪 全能測試寵物" spawns Legendary pet with all 18 skills; quick modify panel (⬆️升Lv, 👣+10K步, 🌟進化, 💪MAX)
### Performance
- **Sprite loading 36× faster**: resized all sprites from 768×768 → 128×128, removed `removeBg()` pixel scan (sprites already have alpha), added global sprite cache so same species loads only once
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
