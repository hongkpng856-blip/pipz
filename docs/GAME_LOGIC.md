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

### Skill Generation

```
available = all skills where skill.minRarity <= pet.rarity
shuffled = random shuffle of available

count = {
    Common: 1,
    Uncommon: 1 or 2 (50%),
    Rare: 2,
    Epic: 2 or 3 (50%),
    Legendary: 3,
}

skills = first `count` skills from shuffled
Each skill: power = basePower + floor(level * 1.5)
            unlockedAtLevel = max(1, index * 3 + 1)
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

### Feed (餵食)
- Sets mood to `Happy`
- Sets moodValue to 100
- Adds **10 XP**
- Updates lastFedAt

### Pet (摸頭)
- Sets mood to `Happy`
- Increases moodValue by 15 (capped at 100)
- Updates lastInteractionAt

### Play (玩)
- Sets mood to `Excited`
- Increases moodValue by 20 (capped at 100)
- Adds **5 XP**
- Updates lastInteractionAt

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

## Pixel Pet Generation

Pets are procedurally generated based on 3 inputs:
- **seed** (deterministic random) — same seed = same pet
- **rarity** — determines colour palette
- **evolutionStage** — determines size/complexity

### Body Templates (5)
- Round/chubby, Tall/slender, Wide/flat, Star-shaped, Heart-shaped

### Eye Styles (5)
- Big round, Small dot, Happy closed, Sparkle, Side eyes

### Accessories (5)
- None, Small ears, Cat ears, Horns, Wings

### Stage Embellishments
- Stage 1 (Baby): no extras
- Stage 2: tiny feet
- Stage 3: full feet
- Stage 4: bigger + ornate
- Stage 5 (Legendary): wings + glow

### Legendary Crown
All legendary pets automatically get a crown on their head.

### Colour Palettes
Each rarity has 3 colour variants (randomly chosen):
- Common: greys, tans, muted greens
- Uncommon: vibrant greens, teals, ambers
- Rare: blues, purples, pinks
- Epic: deep purples, royal blues, ruby reds (with glow)
- Legendary: golds, red-golds, cyan-golds (with glow)

### Grid
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
- Debug button: "+500 測試步數" adds 500 steps instantly

### Sync
- Steps are debounced and synced to Supabase every 2 seconds
- Tables: `profiles.total_steps`, `daily_activity.steps`

## CP (Combat Power)

```
CP = speed + luck + charm + energy
```
