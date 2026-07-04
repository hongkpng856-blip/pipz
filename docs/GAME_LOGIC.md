# Game Logic

> Cross-platform game formulas. Every platform must implement these exact rules.

## First Pet

- User must walk **1000 steps** to hatch their first pet
- When `totalSteps >= 1000`, an egg appears
- User clicks "孵化 🐣" button → 2-second animation → Common pet spawned
- The egg is a one-time event for new users (no pets in collection)

## Encounter System

### Check Interval
- Every **500 steps**, a random encounter check is triggered

### Encounter Formula

```
roll = Math.random()  // 0.0 - 1.0

cumulative = 0
for each rarity in [Common, Uncommon, Rare, Epic, Legendary]:
    cumulative += RARITY_ENCOUNTER_CHANCE[rarity]
    if roll <= cumulative → encounter this rarity
```

### Encounter Rates

| Rarity | Chance | Cumulativ |
|--------|--------|-----------|
| Common | 50% (0.50) | 0.50 |
| Uncommon | 25% (0.25) | 0.75 |
| Rare | 15% (0.15) | 0.90 |
| Epic | 8% (0.08) | 0.98 |
| Legendary | 2% (0.02) | 1.00 |

### Pity System

If a player hasn't encountered a specific high rarity in a long time, pity guarantees it:

| Rarity | Pity Steps |
|--------|-----------|
| Legendary | 50,000 steps (guaranteed) |
| Epic | 20,000 steps (guaranteed) |

Pity counters reset when the rarity is encountered.

## Pet Spawning

When an encounter succeeds:
1. Generate a **random seed** (1 to 2,147,483,646)
2. Create Pet with:
   - `rarity` = encountered rarity
   - `level` = 1
   - `evolutionStage` = 1
   - `status` = PetStatus.Baby
   - `stats` = `generateStats(rarity, 1)`
   - `skills` = `generateSkills(rarity, 1)`
   - `mood` = Mood.Happy, `moodValue` = 100
   - `speciesId` = seed (used for pixel generation)

### Stat Generation

```
baseMultiplier = {
    Common: 1.0,
    Uncommon: 1.2,
    Rare: 1.5,
    Epic: 2.0,
    Legendary: 3.0,
}

levelBonus = (level - 1) * 0.1
base = random(10, 30)
stat = floor(base * baseMultiplier * (1 + levelBonus))
```

Each stat (speed, luck, charm, energy) is rolled independently.

### Skill Generation (Passive Effects)

Skills are random abilities assigned on hatch. There are two types:

**Stat buffs** — boost pet stats (speed/luck/charm/energy). These increase the raw stat value.

**Gameplay effects** — modify game mechanics **continuously** while the pet is active on the map (always active, not only during simulation):

| Effect | Icon | Description | Formula |
|--------|------|-------------|---------|
| `DoubleSteps` | 👟 雙倍步伐 | Each step counts as 2 | `finalSteps = steps × 2` |
| `EnergyBonus` | ⚡ 能量過載 | Bonus energy per step | `energy += steps × 1.5` |
| `StepBonus` | 💨 疾步如飛 | Random bonus steps | 15% chance for 5-14 extra steps |
| `EncounterUp` | 🧲 寵物磁鐵 | More egg encounters | `encounterRate × 1.5` |
| `HatchSpeed` | 🔥 溫暖孵化 | Faster egg hatching | `hatchSteps × 0.75` |
| `MoodGuard` | 🛡️ 平靜光環 | Mood decays slower | `moodDecay × 0.5` |

**Skill pool (18 total, plus `generateAllSkills(level)` for development):**
```

## Evolution System

### Evolution Stages

| Stage | Name (Cantonese) | Name (English) | Steps Required | Status |
|-------|-----------------|----------------|---------------|--------|
| 1 | BB | Baby | 0 | baby |
| 2 | 幼年 | Juvenile | 10,000 | juvenile |
| 3 | 成年 | Adult | 30,000 | adult |
| 4 | 完全體 | Evolved | 60,000 | evolved |
| 5 | 傳說 | Legendary | 100,000 | legendary |

### Evolution Formula

```typescript
function calculateEvolution(userTotalSteps, currentStage, currentStats):
    nextStage = currentStage + 1
    stepsRequired = EVOLUTION_STEPS[nextStage]
    
    if stepsRequired is undefined → return null (max stage)
    if userTotalSteps < stepsRequired → return null (not enough steps)
    
    growthFactor = 1 + (nextStage - 1) * 0.3
    
    return {
        evolved: true,
        newStage: nextStage,
        newStats: currentStats * growthFactor (per stat),
        newStatus: EVOLUTION_STATUS[nextStage],
    }
```

> **Note:** Evolution uses the PET's total steps (tracked per-pet). When a pet evolves, the required steps for that stage are **deducted** from the pet's total steps:
> ```
> remainingSteps = pet.totalSteps - EVOLUTION_STEPS[currentStage + 1]
> ```
> - Stage 1→2 deducts 10,000 steps
> - Stage 2→3 deducts 30,000 steps
> - Stage 3→4 deducts 60,000 steps
> - Stage 4→5 deducts 100,000 steps
> - Excess steps beyond the requirement are preserved on the pet
> - This means each pet must independently earn its own evolution
> - Updated in both local state AND Supabase DB immediately

### Evolution Effect

- All 4 stats increase by `growthFactor` multiplier
- Level increases by 1
- Pet visual changes (evolutionStage affects pixel generation)
- Evolution animation plays (2.5 seconds)

## Pet Interactions

> ⚠️ **Removed in v0.5.0**: Feed/Pet/Play action buttons and their associated UI have been stripped from both PetCompanion (map card) and PetDetailModal. The game no longer has manual interaction buttons.

### Mood Decay

Calculated every interaction:

```
hoursSinceFed = (now - lastFedAt) / 3600000
hoursSinceInteraction = (now - lastInteractionAt) / 3600000

decay = 0
if hoursSinceFed > 4 → decay += (hoursSinceFed - 4) * 5
if hoursSinceInteraction > 2 → decay += (hoursSinceInteraction - 2) * 3

return min(decay, 100)
```

- Mood decays when pet hasn't been fed in 4+ hours
- Mood decays when pet hasn't been interacted with in 2+ hours
- Max decay: 100

## XP System

- XP_MAX per level = `level * 50`
- Feed: +10 XP
- Play: +5 XP
- XP bar shows as progress bar in pet display

## Pixel Pet Generation (Hybrid System)

Pets use a **hybrid rendering system**: PNG sprites (PICO-8 style) as primary, procedural fallback when sprite fails to load.

### Render Priority (v0.13+)
```
1. PixelLab species (cat seed 175, shiba seed 23/176) → grid animation (32×32 PixelLab frames)
2. PNG sprite → /pixel-gen/sprites/{speciesIdx}.png (loaded into canvas, fallback)
3. Procedural generatePixelPet() → (16×16 grid, last resort)
```

> **Note:** PixelLab species (cat + shiba) ALWAYS skip PNG sprite loading and go straight to grid animation. This ensures transparent background + 4-frame animation per action.

### PNG Sprite System (Primary)

50 unique PICO-8 style sprites (resized to 128×128 for performance):

| Asset | Location | Format |
|-------|----------|--------|
| Sprites | `apps/web/public/pixel-gen/sprites/{0-49}.png` | PICO-8 dithered PNG, 128×128 RGBA |
| Total size | ~250KB (avg ~5KB/sprite) | ~2-7KB/sprite compressed |
| Generation | Pollinations.ai free API + pico8 dither → resized to 128×128 | |

**Sprite generation pipeline:**
```
Pollinations.ai API → raw PNG (~30-50KB) → pico8 dither → resized 128×128 → output PNG (~2-7KB)
```

**Species list (0-49):**
`橙色貓 · 小狗 · 白兔 · 熊仔 · 紅狐 · 藍鳥 · 企鵝 · 小龍 · 外星人 · 機械人 · 鬼魂 · 史萊姆 · 恐龍 · 貓頭鷹 · 海龜 · 鯨魚 · 蝙蝠 · 蛇 · 猴子 · 鹿 · 熊貓 · 樹懶 · 獅子 · 老虎 · 獨角獸 · 八爪魚 · 水母 · 蝴蝶 · 蜜蜂 · 青蛙 · 鳳凰 · 精靈 · 仙人掌 · 花 · 樹人 · 水晶 · 雲 · 螃蟹 · 海星 · 瓢蟲 · 雪怪 · 哥布林 · 南瓜 · 魔鬼 · 天使 · 刺蝟 · 鯊魚 · 老鼠 · 蛋 · 金貓`

**Species index lookup:** `getSpeciesIndex(seed) % 50` determines which sprite file to load.

### Canvas Rendering (`PixelPetCanvas.tsx`) — v0.13+

PixelLab species (cat + shiba) use **grid animation path**:
- `IS_PIXELLAB(seed)` returns true for seeds 175 (cat), 23 and 176 (shiba)
- `effectiveForceGrid = forceGrid || isPixellab` — forces grid rendering, skips PNG loading
- `effectiveSeed = (seed === 23) ? 176 : seed` — maps old Shiba to new seed 176
- `generatePixelPet({ seed: effectiveSeed, ... })` → returns proper species with 32×32 grid
- 32×32 grids get canvas size normalization: `sizeMult = 16 / gridSize`

For generic species (fallback):
- **Global sprite cache**: all `PixelPetCanvas` instances share a `Map<speciesIdx, Canvas>` — same species loads only once
- **128×128 source sprites** — no `removeBg()` needed (already have RGBA transparency)
- Loads PNG via `new Image()` from `/pixel-gen/sprites/${speciesIdx}.png?v=${SPRITE_VERSION}`
- On `onload`: draws PNG 1:1 to offscreen canvas, cached globally
- On `onerror`: falls back to procedural `generatePixelPet()`
- **Rarity tint overlay**: `fillRect` with rgba colour per rarity
- **Rarity glow**: `ctx.shadowBlur` with rarity glow colour
- Canvas size: `(16 * pixelSize + 40)` wide × `(16 * pixelSize + 30)` tall (adjusted for 32×32)
- `imageRendering: 'pixelated'` CSS for sharp pixel scaling

### Procedural Fallback System

When PNG fails to load, falls back to procedural generation based on 3 inputs:
- **seed** (deterministic random) — same seed = same pet
- **rarity** — determines colour palette
- **evolutionStage** — determines size/complexity

#### Body Templates (50 species)
50 unique species generated via procedural seed + species lookup. Each species has:
- **speciesId**: deterministic seed
- **speciesName**: e.g., `#圓貓`, `#小狗`, `#小龍`, `#機械人`, `#史萊姆`, `#鳳凰`, `#獨角獸`, `#水母`
- **gridTemplate**: 16×16 pixel grid
- **palette**: rarity-coloured variant
- **accessorySet**: which accessories this species can wear

#### Eye Styles (15)
Big round, Small dot, Happy closed, Sparkle, Side eyes, Sleepy (━━), Angry (> <), Heart (♥), Tear (; ;), Star (☆), Glowing, Cross (X X), Dizzy (@ @), Winking (◕‿◕), Closed happy (∪ ∪)

#### Accessories (19)
None, Small ears, Cat ears, Horns, Wings, Crown, Bow, Top hat, Flower, Scarf, Glasses, Eyepatch, Halo, Antenna, Tail, Cape, Collar, Earring, Mask

#### Stage Embellishments
- Stage 1 (Baby): no extras
- Stage 2: tiny feet
- Stage 3: full feet
- Stage 4: bigger + ornate
- Stage 5 (Legendary): wings + glow

#### Legendary Crown
All legendary pets automatically get a crown on their head.

#### Colour Palettes
Each rarity has 3 colour variants (randomly chosen):
- Common: greys, tans, muted greens
- Uncommon: vibrant greens, teals, ambers
- Rare: blues, purples, pinks
- Epic: deep purples, royal blues, ruby reds (with glow)
- Legendary: golds, red-golds, cyan-golds (with glow)

#### Grid
- 16x16 pixel grid
- Rendered on HTML Canvas with `image-rendering: pixelated`
- Pixel size determines display scale

## Steps System

### GPS Walking
- Uses `navigator.geolocation.watchPosition()`
- **Accuracy threshold**: `< 50m` (readings with accuracy > 50m are discarded after warmup)
- **Warmup**: First 5 GPS readings (regardless of accuracy) count toward sensor stabilisation — they don't count steps. After warmup, the first reading sets the displacement reference without counting steps.
- **Position update**: After warmup + accuracy check, `setMapPos` is called on **every** valid reading — marker visible even when stationary
- **Step counting** separated from position: speed gate (`< 0.5 m/s`), time gate (`> 3s` since last), displacement gate (`> 3m`) only gate step accumulation, not the map marker
- **Default mode**: `'walk'` when speed unavailable (`null`), to avoid iPhone GPS not providing speed blocking all steps
- Distance formula: Haversine
- High accuracy mode: `enableHighAccuracy: true, maximumAge: 5000, timeout: 10000`

### Step Detection Algorithm (v0.21.0+)

**Method:** Accelerometer-based (primary) + GPS displacement fallback

**Priority 1: Accelerometer (`devicemotion`, 60Hz)**
Professional-grade algorithm:
1. **Band-pass filter** (0.5-3 Hz): IIR low-pass + DC removal removes sensor noise and gravity tilt
2. **Adaptive threshold**: `threshold = max(0.3, runningMean + 1.5 × sqrt(runningVar))` — adjusts to walking intensity
3. **Peak-pair detection**: positive peak (foot-strike impact) → negative peak (rebound) within 500ms = 1 step
4. **Walking bout gate**: only count steps after 5 consecutive steps (rejects random phone movement)
5. **Bout timeout**: reset after 3s of inactivity

When accelerometer steps available: `addSt(stepsCounted)` (1 step = 1 point)

**Priority 2: GPS displacement fallback**
When accelerometer unavailable (desktop, permission denied):
- `d = haversine(lastPos, currentPos)`
- `addSt(Math.max(1, floor(d × 1.4)))` (~1.4 steps per meter, avg stride 0.7m)
- Minimum 3m displacement to act

### iOS Permission Flow (v0.21.0+)
- `DeviceOrientationEvent.requestPermission()` called via **native DOM click listener** (`document.addEventListener('click', grant, { once: true })`) on component mount
- iOS 13+ requires this before `deviceorientation` / `devicemotion` events fire
- Native DOM click (not React synthetic event) ensures iOS recognizes the user gesture
- `{ once: true }` auto-removes after first click
- Event listeners are added in `walkStart()` before permission; once granted by iOS, they start receiving events
- The GPS tab-switch effect (`walkStop()` → `walkStart()`) re-adds listeners with fresh references

### Movement Mode Detection (v0.19.0+)

The GPS callback determines movement mode based on `pos.coords.speed` (every reading, independently of stepping):

| Mode | Threshold | Badge | Map Zoom | Step Counting | Trail Drawing |
|------|-----------|-------|----------|---------------|---------------|
| 🧘 Stationary | `speed < 0.5 m/s` or `null` | Grey badge, static dot | — (previous) | ❌ | ❌ |
| 🚶 Walk | `0.5 ≤ speed < 2.0 m/s` | Cyan badge, pulsing dot | 18 (street level) | ✅ | ✅ |
| 🚗 Vehicle | `speed ≥ 2.0 m/s` | Amber badge, pulsing dot | 14 (city district) | ❌ | ❌ |

- Vehicle mode: count 0 steps, draw no trail (prevents public-transport step inflation)
- Movement mode updates every GPS reading (not gated by time/displacement checks)

### Heading / Compass (v0.20.0+)
- **DeviceOrientation API** (iOS `webkitCompassHeading`, Android `event.alpha`): 60Hz real-time magnetometer heading
- **EMA smoothing**: factor 0.5 on both DeviceOrientation and GPS heading — at 60Hz converges in ~50ms, at 1Hz (GPS) still responsive enough
- Smoothed heading stored in `compassHeadingRef` + `setCompassHeading` state (throttled to ~10fps React updates) → passed as `deviceHeading` prop to RealMap
- **RealMap heading priority**: `deviceHeading ?? position.heading ?? trajectory(atan2)`
- Heading updates are **fully decoupled from position** — compass arrow rotates independently of GPS position updates
- `walkStop()` resets heading ref to 0 for clean restart
### Manual Testing

- Debug button: "+500 測試步數" adds 500 steps instantly (no longer skips encounters)
- Clicking the debug button now properly triggers the **encounter system** every 500 steps (500 = `ENCOUNTER_INTERVAL`)
- Dev Tools panel (bottom of Community tab) — visible to **all users** (no login required):
  - **🎲 Event button** — one-click trigger for random roguelike events (Risk Ladder, 陽光草原, 泥濘水氹, etc.); bypasses the 800-step interval so testers can verify event flow immediately
  - **Walk speed multiplier**: 1x / 5x / 10x / 50x buttons — multiply simulation step rate without restarting walk:
    - 1x = 1-4 steps per 800ms tick (default walking speed)
    - 5x = ~5-20 steps per tick
    - 10x = ~10-40 steps per tick
    - 50x = ~50-200 steps per tick (rapid testing)
    - Active multiplier shown as 🟢 label (e.g. 🟢 5x)
  - **🚶 模擬 / ⏹ 停止** — start/stop walk simulation at current multiplier speed
- Encounters collected as eggs, displayed via egg popup → eggs tab → hatch → **new pet popup**
- **Instant feedback**: log message "🔍 測試步數處理中..." appears immediately on click

### Encounter Animation
- **No** WalkingCanvas encounter animation — egg popup appears **immediately** when encounter triggers (every 500 steps)
- **Egg popup**: Shows 🥚 with rarity badge (common/uncommon/rare/epic/legendary) + "已收錄到蛋列表" message
- Popup dismissed by clicking ✅收埋 button or tapping outside
- Egg is saved to Supabase DB **immediately** on discovery (logged-in users) or localStorage (guests)
| Notification sent: "🥚 發現新蛋！行路途中發現咗 {rarity}蛋！快啲去收咗佢"

### Random Egg While Walking (v0.12.0+)

Every **2000 steps** accumulated while walking, a separate random egg encounter check triggers:

| Interval | Chance | Egg Type |
|----------|--------|----------|
| Every 2000 steps | 40% | PixelLab 蛋 (50/50 cat or shiba) |

```
stepEggCounter % 2000 === 0 && Math.random() < 0.4 → spawn PixelLab egg
  → Math.random() < 0.5 ? spawn PixelLab 圓貓蛋 : spawn 柴犬蛋
```

- Independent from the 500-step pet encounter system — both can trigger during walking
- Egg is saved to DB immediately
- **🥚 Egg Found Popup** (v0.18.1): shows egg name + rarity + "收埋" / "去蛋頁面孵化" buttons
- **Queue system**: if an event triggers simultaneously, event shows first, egg popup appears on dismiss (via `pendingEggRef`/`pendingEventRef`)
- Hatches into PixelLab pet (cat or shiba) matching egg type

### Egg & Hatching Flow

1. **Encounter** (every 2000 steps, 40%): 🥚 Egg Found Popup appears → egg saved to DB → user taps "收埋" or "去蛋頁面孵化"
2. **Hatch** (from eggs tab): Tap egg → 2-second hatching animation → pet spawned → **new pet popup appears**
3. **New Pet Popup**: Shows pet's pixel art, rarity badge, species ID, level/stage, and 4 stats (⚡🍀💜🔋) in a bordered overlay
4. "🎉 睇下寵物" button → closes popup + switches to pets tab
5. **NEW badge**: Freshly hatched pets display a pulsating amber `.new-badge` (NEW) label on their card in pets tab
6. NEW badge has **3-layer detection**: `newPetId` match → `createdAt` recency (within 5 min) → dismissed set
7. **Persists across reloads**: saved to `localStorage` key `pipz_new_pet` until dismissed
8. **Dismissed**: clicking the pet card or closing the hatch popup removes the badge (saved to `dismissedNewPets` ref Set)

### Sync
- Steps are debounced and synced to Supabase every 2 seconds
- Tables: `profiles.total_steps`, `daily_activity.steps`

## CP (Combat Power)

```
CP = speed + luck + charm + energy
```

## Roguelike Systems (v0.6.0)

### Random Events

Every ~800 steps while walking, a random event may trigger. Events are drawn from a pool of 12 (6 positive, 6 negative), weighted by probability:

| Event | Type | Weight | Min Steps | Effects |
|-------|------|--------|-----------|---------|
| 🌞 陽光草原 | Positive | 15 | 0 | ❤️+20 mood, 👣+50 steps |
| 🌈 彩虹小徑 | Positive | 12 | 100 | 👣+100 steps, ❤️+10 mood |
| 📦 寶藏箱 | Positive | 10 | 500 | Choice: open (item + steps) or leave (steps) |
| 🧳 流浪商人 | Positive | 8 | 1000 | 📦 gain item (berry), ✨+20 XP |
| ⛲ 治癒泉水 | Positive | 10 | 300 | ❤️+50 mood, ✨+30 XP |
| ⭐ 流星 | Positive | 5 | 2000 | 👣+500 steps, ❤️+30 mood |
| 💧 泥濘水氹 | Negative | 15 | 0 | 👣-30 steps, 💔-10 mood |
| 🌵 荊棘叢 | Negative | 12 | 100 | Choice: slow through (less damage) or detour (more steps lost) |
| 🌧️ 暴風雨 | Negative | 12 | 200 | 💔-15 mood, 👣-50 steps |
| 🧭 迷路 | Negative | 8 | 500 | Choice: backtrack (less steps) or push forward (risk/reward) |
| 👺 哥布林偷襲 | Negative | 5 | 1500 | 📦 lose item, 👣-100 steps |
| ⛰️ 山崩 | Negative | 6 | 1000 | 👣-300 steps, 💔-10 mood |

Events with a **Choice** present 2 buttons — each leads to different outcomes.
### Equipment System

4 equipment slots per pet:

| Slot | Label | Examples |
|------|-------|---------|
| Head | 👑 頭部 | 樹葉冠冕, 骨製頭盔, 水晶額環, 荊棘冠 |
| Body | 👕 身體 | 樹葉披風, 骨甲, 絲綢法袍, 龍鱗甲 |
| Feet | 👟 腳部 | 草鞋, 兔毛靴, 風之脛甲 |
| Accessory | 📿 飾品 | 幸運硬幣, 月亮吊墜, 四葉草 |

**Equipment slots** are displayed as a 2×2 grid of square WoW-style slots inside the pet image card (PetDetailModal), below the mood bar.

**Drag-and-drop equipping:** Available equipment from inventory appears as a draggable row below the slots. Drag an item onto a slot to equip it instantly. Empty slots show dashed borders with slot label; dragging over highlights in purple.

**Equip/Unequip flow:**
- Click an empty slot → opens full inventory to pick equipment
- Click an equipped item → shows ✕ button (top-right) to unequip back to inventory
- Drag an equipment item from the "可用裝備" row → drop onto the target slot

Equipment stat bonuses apply when equipped:

```
effectiveStat = pet.baseStat + equippedBonuses[stat]
```

### Help Items (Consumables)

| Item | Effect | Rarity | Duration |
|------|--------|--------|----------|
| 🫐 魔法莓果 | Restore 30% mood | Common | Instant |
| 🌿 力量藥草 | +10 all stats temporarily | Uncommon | 500 steps |
| 🧪 疾走藥水 | Steps ×2 | Rare | 200 steps |
| 🪔 吸引香薰 | Encounter rate ×2 | Uncommon | 200 steps |
| ✨ 經驗靈藥 | +50 XP instantly | Common | Instant |

### Event Drops

Some events grant items as rewards (e.g., 流浪商人 gives 🫐 魔法莓果, 寶藏箱 may contain 🪙 幸運硬幣). Items go to the player's inventory for later use.

---

## Animation System

### Current approach (v0.10.0+)

Every pet has **3 distinct animations** — walk, idle, play — each with 4 pixel frames.

**Animation generator** (`packages/core/src/pixel-gen/animation.ts`):

| Animation | Frames | Timing | Description |
|-----------|--------|--------|-------------|
| `walkFrames` | 4 | 150ms | contact → stride right → contact → stride left |
| `idleFrames` | 4 | 180ms | normal → blink → ear/head twitch → normal |
| `playFrames` | 4 | 120ms | bounce up → squish down → stretch right → stretch left |

**PixelLab species** (cat + shiba) use **dedicated 32×32 pre-made frames** instead of procedural generation:
- Cat (speciesId 0): `PIXELAB_CAT_WALK`, `PIXELAB_CAT_IDLE`, `PIXELAB_CAT_PLAY` from `pixellab-cat-data.ts`
- Shiba (speciesId 1): `PIXELAB_SHIBA_WALK`, `PIXELAB_SHIBA_IDLE`, `PIXELAB_SHIBA_PLAY` from `pixellab-shiba-data.ts`
- Fallback species (speciesId 2+): procedural `genWalkQuadruped()`, `genIdleTwitch()`, `genPlayJump()`

All 3 sets are generated procedurally from any `PixelPetData` (16×16 RGB grid) using pixel manipulation — no per-species asset pipeline needed for fallback species. See `generatePetAnimation()` in the source.

**Integration:**

- **`PixelPetCanvas.tsx`** (detail cards, modal): accepts `animation="idle" | "walk" | "play"` and cycles the correct frame set
- **`PetCompanion.tsx`** (interactive pet room canvas, not currently used in map tab): cycles between idle → roam (walk) → play behaviors autonomously, mapping each behavior to its frame set
- **`RealMap.tsx`** (map tab): Leaflet GPS map using **CartoDB Voyager** tiles (Google Maps-style, clean light background). Shows pet marker as pixel art sprite rendered via `generatePixelPet()` + `drawPixelGrid()` → canvas `toDataURL()` → `<img>` inside `L.divIcon`. The marker always shows the active battle pet with rarity-coloured border + glow. No pet → 🥚 emoji with rarity tint. Sprite regenerates when `pet` prop changes.
- **Frame rendering**: `drawPixelGrid(ctx, frameGrid, pixelSize)` draws the current frame onto Canvas via `requestAnimationFrame`

**PNG sprite path (Tier 2):**
When a static PNG sprite is loaded (e.g. AI-generated), falls back to x/y offset + sinusoidal bob. The PNG path doesn't support frame-by-frame changes — upgrade path is to replace the static PNG with a sprite sheet.

### Data flow

```
PixelPetData (16×16 RGB grid)
  → generatePetAnimation()
    → walkFrames[4] + idleFrames[4] + playFrames[4]
      → drawPixelGrid(ctx, frame, pixelSize)
        → Canvas display (requestAnimationFrame loop)
```

### Integration paths

- **AI base sprite**: once an API reliably produces pixel art, replace procedural grid with AI-generated base sprite, then apply same `generateWalkFrames()` / `generateIdleFrames()` / `generatePlayFrames()` pixel manipulation
- **Pixel manipulation**: handles: body shift (horizontal sway) + bottom row stride + vertical bob = convincing walk cycle on any sprite shape
- **Additional animations**: sleep (half-closed), jump (vertical arc), or species-specific can be added as additional frame sets — add a new function in `animation.ts` and extend `PetAnimation`

---

## Trail System (v0.18.1+)

### 7-Day Colour Map

Each day of the week gets its own trail colour, used identically in both the map trail polylines and the weekly bar chart:

| Day | Index | Colour | Hex |
|-----|-------|--------|-----|
| 星期日 | 0 | 🟣 Purple | `#8b5cf6` |
| 星期一 | 1 | 🔵 Cyan | `#06b6d4` |
| 星期二 | 2 | 🟢 Green | `#22c55e` |
| 星期三 | 3 | 🟠 Orange | `#f59e0b` |
| 星期四 | 4 | 🔴 Red | `#ef4444` |
| 星期五 | 5 | 🩷 Pink | `#ec4899` |
| 星期六 | 6 | 🔵 Blue | `#3b82f6` |

### Storage

- `trailByDay` ref in `RealMap.tsx`: `Map<number, [number, number][]>` — keyed by `dayIndex` (0–6)
- `polylineByDay` ref: `Map<number, L.Polyline>` — each day gets its own Leaflet polyline layer
- **Permanent**: trails are never cleared when walking stops; they persist for the entire component lifetime
- **localStorage persistence** (v0.19.0+): every new GPS point auto-saves to `localStorage` key `pipz_trail_data`. On component mount (`restoreTrailFromStorage()`), saved trails are restored and polylines drawn. Survives app restart / PWA close. 🗺️💾

### Colour Mapping

Both `RealMap.tsx` and `page.tsx` define the same `DAY_COLORS` array:
```ts
const DAY_COLORS = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6']
```

The day index is derived from `new Date().getDay()`:
- `0` = Sunday, `1` = Monday ... `6` = Saturday

### Test Tool

`RealMapHandle` interface (exposed via `forwardRef` + `useImperativeHandle`):
- `generateTestTrails()`: draws 7 small coloured arcs around the current map centre using all 7 `DAY_COLORS`, each with `dashArray: '6 4'` style. Accessible via Dev Tools `🎨 測試7日路線` button (`realMapRef.current.generateTestTrails()`).
- `clearStoredTrails()` (v0.19.0+): removes `pipz_trail_data` from localStorage and removes all polyline layers from the map. Dev Tools `🗑️ 清除路線記憶`.

### Auto-Zoom by Movement Mode (v0.19.0+)

The map zoom adjusts automatically based on the user's movement mode:

| Mode | Trigger | Target Zoom | Visual |
|------|---------|-------------|--------|
| 🧘 Stationary | `speed < 0.5 m/s` or `null` | — (preserves last zoom) | Grey badge |
| 🚶 Walk | `0.5 ≤ speed < 2.0 m/s` | **18** (street level) | Cyan badge |
| 🚗 Vehicle | `speed >= 2.0 m/s` | **14** (city district) | Amber badge |

**Manual override:** User zooming via +/- buttons records the time in `lastManualZoomRef`. Auto-zoom is suppressed for 15 seconds after any manual zoom. Distinguishes programmatic from user zoom via `autoZoomingRef` flag.

### Displacement Gate (v0.21.0+)
- Minimum GPS displacement to trigger step counting: **3m** (was 5m in v0.19.0)
- Walking at 1.4 m/s × 3s (time gate) = 4.2m, passes threshold
- Reduces GPS drift false steps while still responsive to slow walking

### Initial Zoom Animation (v0.19.0+)

On first valid GPS position after mount, if saved trails exist in localStorage:

1. `map.fitBounds(allTrailPoints, { maxZoom: 14, padding: [50, 50] })` — zoom out to show every walked path
2. 1.5s pause (after fitBounds animation completes)
3. `map.flyTo(currentPosition, 18, { duration: 1.5 })` — slow zoom in to user's current location

**Guards:**
- Warmup positions (first 5 GPS readings) do NOT update `mapPos` to avoid interrupting the animation
- `initialAnimBusyRef` blocks `setView()` during the fitBounds→flyTo sequence
- Without saved trails: `map.setView(currentPos, 18)` immediately (no animation)

### Limitations

- PNG sprite path (Tier 2) doesn't support frame-by-frame changes — static image moves as a whole
- 16×16 grid limits detail; AI-gen 24×24 or 32×32 base sprites would improve animation quality
| `generatePlayFrames()` uses generic stretch/shift that works on all body shapes but lacks species-specific personality (e.g. cat plays differently from slime)

---

## Monopoly Grid (v0.22.0+)

### World Anchor
- Grid is defined by a **fixed geographic anchor** stored on the server (`grid_config` table in Supabase)
- Anchor is calculated by rounding the first-ever GPS fix to nearest `CELL_SIZE_DEG` (0.0006° ≈ 60m)
- Once set, the anchor **cannot be changed** — all players see the same grid cells

### Grid Layout
- **6×6 grid** (36 cells) centered on the world anchor
- Each cell = one Monopoly-style property
- Cell size: ~60m × 60m (0.0006° × 0.0006°)
- Cells have alternating zone colors to distinguish regions

### Occupation (coming soon)
- Each cell will require a fixed step cost to claim
- Claimed cells are tied to player ID
- First player to walk enough steps in an area can claim it

### Technical
- Grid is rendered as Leaflet `L.Rectangle` objects at fixed lat/lng coordinates
- Grid persists on server — survives localStorage clears and browser changes
- API: `GET /api/grid-config` to read anchor, `POST /api/grid-config` (lat, lng) to set it (only first call succeeds)
