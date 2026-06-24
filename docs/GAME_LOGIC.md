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

### Render Priority
```
1. PNG sprite → /pixel-gen/sprites/{speciesIdx}.png  (loaded into canvas)
2. Fallback → procedural generatePixelPet() (16×16 grid)
```

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

### Canvas Rendering (`PixelPetCanvas.tsx`)
- **Global sprite cache**: all `PixelPetCanvas` instances share a `Map<speciesIdx, Canvas>` — same species loads only once
- **128×128 source sprites** — no `removeBg()` needed (already have RGBA transparency)
- Loads PNG via `new Image()` from `/pixel-gen/sprites/${speciesIdx}.png?v=${SPRITE_VERSION}`
- On `onload`: draws PNG 1:1 to offscreen canvas, cached globally
- On `onerror`: falls back to procedural `generatePixelPet()` **(lazy: only generated when PNG fails)**
- **Rarity tint overlay**: `fillRect` with rgba colour per rarity
- **Rarity glow**: `ctx.shadowBlur` with rarity glow colour
- **Legendary**: gold border + sparkle effect (corner highlights)
- Canvas size: `(16 * pixelSize + 40)` wide × `(16 * pixelSize + 30)` tall
- Animation loop: idle bob, walk offset, happy bounce, jump arc
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
- Accuracy threshold: < 100m
- Distance formula: Haversine
- Steps = `floor(distance_in_meters * 1300)`
- Walk button toggles GPS on/off
- High accuracy mode: `enableHighAccuracy: true, maximumAge: 5000, timeout: 10000`

### Manual Testing
- Debug button: "+500 測試步數" adds 500 steps instantly (no longer skips encounters)
- Clicking the debug button now properly triggers the **encounter system** every 500 steps (500 = `ENCOUNTER_INTERVAL`)
- Encounters collected as eggs, displayed via egg popup → eggs tab → hatch → **new pet popup**
- **Instant feedback**: log message "🔍 測試步數處理中..." appears immediately on click

### Encounter Animation
- **No** WalkingCanvas encounter animation — egg popup appears **immediately** when encounter triggers (every 500 steps)
- **Egg popup**: Shows 🥚 with rarity badge (common/uncommon/rare/epic/legendary) + "已收錄到蛋列表" message
- Popup dismissed by clicking ✅收埋 button or tapping outside
- Egg is saved to Supabase DB **immediately** on discovery (logged-in users) or localStorage (guests)
- Notification sent: "🥚 發現新蛋！行路途中發現咗 {rarity}蛋！快啲去收咗佢"

### Egg & Hatching Flow

1. **Encounter** (every 500 steps): popup appears immediately → egg saved to inventory → user dismisses popup
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
