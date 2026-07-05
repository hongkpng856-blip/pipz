# Data Model

> Cross-platform data model. Every platform (Web, iOS, Android) must implement these exact types.

## Pet

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string (UUID) | auto | Unique identifier |
| `userId` | string (UUID) | - | Owner's user ID |
| `name` | string | '' | Pet name (user-customisable) |
| `speciesId` | string | - | Seed for pixel generation |
| `imageUrl` | string | '' | AI-generated image URL (future) |
| `rarity` | Rarity enum | - | Common | Uncommon | Rare | Epic | Legendary |
| `level` | number | 1 | Current level |
| `xp` | number | 0 | Experience points |
| `totalSteps` | number | 0 | Total steps walked with this pet |
| `evolutionStage` | number | 1 | 1=BB, 2=Juvenile, 3=Adult, 4=Evolved, 5=Legendary |
| `status` | PetStatus enum | 'baby' | egg | hatching | baby | juvenile | adult | evolved | legendary |
| `stats` | PetStats object | generated | See below |
| `skills` | PetSkill[] | [] | Generated on spawn |
| `mood` | Mood enum | 'happy' | happy | excited | hungry | sleepy | sad |
| `moodValue` | number | 100 | 0-100 mood meter |
| `lastFedAt` | timestamp | now | Last feeding time |
| `lastInteractionAt` | timestamp | now | Last pet/play time |
| `createdAt` | timestamp | now | Creation time |
| `isForSale` | boolean | false | Listed on market |
| `price` | number | 0 | Listing price |

### PetStats

| Field | Type | Description |
|-------|------|-------------|
| `speed` | number | Movement speed (10-200) |
| `luck` | number | Encounter luck (10-200) |
| `charm` | number | Interaction charm (10-200) |
| `energy` | number | Stamina/energy (10-200) |

### PetSkill

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique skill ID |
| `name` | string | Display name (Cantonese) |
| `description` | string | What the skill does |
| `icon` | string | Emoji icon |
| `stat` | 'speed' \| 'luck' \| 'charm' \| 'energy' \| 'all' | Which stat it boosts |
| `power` | number | Boost amount |
| `unlockedAtLevel` | number | Min level to unlock |

### Skill Pool (12 skills)

| ID | Name | Icon | Stat | Min Rarity | Base Power |
|----|------|------|------|-----------|-----------|
| quick_dash | 疾速衝刺 | ⚡ | speed | Common | 10 |
| lucky_find | 幸運搜尋 | 🍀 | luck | Common | 10 |
| charm_wave | 魅力波動 | 💜 | charm | Common | 10 |
| energy_shield | 能量護盾 | 🔋 | energy | Common | 10 |
| star_power | 星光之力 | ⭐ | all | Uncommon | 8 |
| moonlight_serenade | 月光小夜曲 | 🌙 | charm | Uncommon | 12 |
| fire_breath | 火焰吐息 | 🔥 | speed | Rare | 20 |
| ice_armor | 冰霜護甲 | ❄️ | energy | Rare | 20 |
| nature_gift | 自然恩賜 | 🌿 | luck | Rare | 18 |
| shadow_step | 暗影步 | 🌙 | speed | Epic | 25 |
| thunder_strike | 雷霆一擊 | ⚡ | all | Epic | 30 |
| divine_blessing | 神聖祝福 | 🌟 | all | Legendary | 50 |

### Skill Count by Rarity

| Rarity | Skills |
|--------|--------|
| Common | 1 |
| Uncommon | 1-2 (50% chance for 2) |
| Rare | 2 |
| Epic | 2-3 (50% chance for 3) |
| Legendary | 3 |

## User / Profile

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string (UUID) | auto | Supabase auth.users ID |
| `email` | string | - | User email |
| `username` | string | email prefix | Display name |
| `totalSteps` | bigint | 0 | Lifetime steps |
| `createdAt` | timestamp | now | Registration time |

## DailyActivity

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID (auto) | Primary key |
| `userId` | UUID (FK→profiles) | Owner |
| `date` | DATE | Activity date (unique per user+date) |
| `steps` | int | Steps on this date |
| `petsEncountered` | int | Pets found this date |
| `achievements` | text[] | Achievements earned |

## Transaction

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID (auto) | Primary key |
| `sellerId` | UUID (FK→profiles) | Seller |
| `buyerId` | UUID (FK→profiles) | Buyer (null until bought) |
| `petId` | UUID (FK→pets) | Pet being traded |
| `price` | int | Sale price |
| `status` | 'pending' \| 'completed' \| 'cancelled' | Transaction state |
| `createdAt` | timestamp | Listing time |
| `completedAt` | timestamp | Completion time |

## Enums

### Rarity
```
Common = 'common'
Uncommon = 'uncommon'
Rare = 'rare'
Epic = 'epic'
Legendary = 'legendary'
```

### Mood
```
Happy = 'happy'
Hungry = 'hungry'
Sleepy = 'sleepy'
Sad = 'sad'
Excited = 'excited'
```

### PetStatus
```
Egg = 'egg'
Hatching = 'hatching'
Baby = 'baby'
Juvenile = 'juvenile'
Adult = 'adult'
Evolved = 'evolved'
Legendary = 'legendary'
```

## Database Schema (PostgreSQL)

Tables: `profiles`, `pets`, `daily_activity`, `transactions`, `properties`

See `supabase-schema.sql` for full DDL. For `properties` DDL see `supabase/migrations/20260802_properties.sql`.

### `properties` table

| Field | Type | Description |
|-------|------|-------------|
| `id` | BIGINT (PK, auto-increment) | Primary key |
| `user_id` | UUID (FK → auth.users) | Owner of the property |
| `anchor_lat` | DOUBLE PRECISION | Grid anchor latitude |
| `anchor_lng` | DOUBLE PRECISION | Grid anchor longitude |
| `cell_row` | INTEGER | Grid cell row offset |
| `cell_col` | INTEGER | Grid cell column offset |
| `price` | INTEGER (default 100) | Cost in steps |
| `is_listed` | BOOLEAN (default false) | Listed on marketplace (v0.29.0) |
| `list_price` | INTEGER | Selling price on marketplace (v0.29.0) |
| `purchased_at` | TIMESTAMPTZ (default now()) | When the property was bought |

**Indexes:**
- `idx_properties_is_listed` on `(is_listed)` — fast marketplace queries (v0.29.0)

**Constraints:**
- UNIQUE `(anchor_lat, anchor_lng, cell_row, cell_col)` — one owner per cell
- RLS: users can read their own rows, UPDATE their own `is_listed`/`list_price`, service role (API route) can read/write all

Key constraints:
- `pets.rarity` CHECK: `('common','uncommon','rare','epic','legendary')`
- `pets.status` CHECK: `('baby','juvenile','adult','evolved','legendary')`
- `pets.mood` CHECK: `('happy','excited','hungry','sleepy','sad')`
- `daily_activity` UNIQUE: `(user_id, date)`
- Auto-profile trigger: `on_auth_user_created` via `handle_new_user()`
