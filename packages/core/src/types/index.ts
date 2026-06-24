export enum Rarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary',
}

export enum Mood {
  Happy = 'happy',
  Hungry = 'hungry',
  Sleepy = 'sleepy',
  Sad = 'sad',
  Excited = 'excited',
}

export enum SkillEffect {
  DoubleSteps = 'double_steps',      // 每步當兩步
  EnergyBonus = 'energy_bonus',      // 步數→能量轉換加成
  StepBonus = 'step_bonus',          // 隨機額外步數
  EncounterUp = 'encounter_up',      // 遇到寵物機率提升
  HatchSpeed = 'hatch_speed',        // 孵化加速
  MoodGuard = 'mood_guard',          // 心情下降減半
}

export enum PetStatus {
  Egg = 'egg',
  Hatching = 'hatching',
  Baby = 'baby',
  Juvenile = 'juvenile',
  Adult = 'adult',
  Evolved = 'evolved',
  Legendary = 'legendary',
}

export interface PetSkill {
  id: string
  name: string
  description: string
  icon: string
  stat: keyof PetStats | 'all'
  power: number
  unlockedAtLevel: number
  effect?: SkillEffect      // gameplay effect (beyond stat boost)
}

export interface PetStats {
  speed: number
  luck: number
  charm: number
  energy: number
}

export interface Pet {
  id: string
  userId: string
  name: string
  speciesId: string
  imageUrl: string
  rarity: Rarity
  level: number
  xp: number
  totalSteps: number
  evolutionStage: number
  status: PetStatus
  stats: PetStats
  skills: PetSkill[]
  mood: Mood
  moodValue: number
  lastFedAt: number
  lastInteractionAt: number
  createdAt: number
  isForSale: boolean
  price: number
}

export interface PetSpecies {
  id: string
  name: string
  description: string
  baseStats: PetStats
  growthRate: number
  evolutionSteps: number[]
  rarity: Rarity
  aiSeed: string
}

export interface User {
  id: string
  email: string
  username: string
  totalSteps: number
  todaySteps: number
  lastActiveDate: string
  petSlots: number
  coins: number
  createdAt: number
}

export interface EncounterResult {
  pet: Pet
  isNew: boolean
  stepsUsed: number
}

export interface EvolutionResult {
  evolved: boolean
  newStage: number
  newStats: PetStats
  newStatus: PetStatus
}

export interface Transaction {
  id: string
  sellerId: string
  buyerId: string
  petId: string
  price: number
  status: 'pending' | 'completed' | 'cancelled'
  createdAt: number
}

export interface DailyActivity {
  id: string
  userId: string
  date: string
  steps: number
  petsEncountered: number
  achievements: string[]
}

// ── Roguelike: Equipment ──
export enum EquipmentSlot {
  Head = 'head',
  Body = 'body',
  Feet = 'feet',
  Accessory = 'accessory',
}

export interface EquipmentDef {
  id: string
  name: string
  description: string
  icon: string
  slot: EquipmentSlot
  rarity: Rarity
  statBonuses: Partial<PetStats>  // which stats get boosted
  bonusValue: number              // base bonus value
  eventOnly?: boolean             // only obtainable via events
}

export interface EquippedItem {
  equipmentId: string
  petId: string
  equippedAt: number
}

// ── Roguelike: Help Items (Consumables) ──
export enum HelpEffect {
  RestoreMood = 'restore_mood',
  TempStatBoost = 'temp_stat_boost',
  StepMultiplier = 'step_multiplier',
  EncounterBoost = 'encounter_boost',
  HealXp = 'heal_xp',
}

export interface HelpItemDef {
  id: string
  name: string
  description: string
  icon: string
  rarity: Rarity
  effect: HelpEffect
  power: number           // magnitude of effect
  duration?: number       // steps duration (0 = instant)
}

export interface InventoryEntry {
  itemId: string
  itemType: 'equipment' | 'help'
  quantity: number
}

// ── Roguelike: Events ──
export type EventType = 'positive' | 'negative'

export interface EventEffect {
  type: 'stat_boost' | 'mood_change' | 'step_bonus' | 'step_loss' | 'item_gain' | 'item_loss' | 'xp_gain'
  target?: keyof PetStats
  value: number
  itemId?: string
}

export interface GameEvent {
  id: string
  name: string
  description: string
  icon: string
  type: EventType
  weight: number            // probability weight
  minSteps: number          // minimum total steps to unlock
  effects: EventEffect[]
  eventOnly?: boolean       // only triggered by special conditions
  choices?: {               // branch choices (optional)
    label: string
    effects: EventEffect[]
  }[]
}

