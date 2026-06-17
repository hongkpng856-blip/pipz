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
