import { PetStats, PetStatus, Rarity } from '../types'

// 孵化第一隻寵物需要嘅步數
export const FIRST_PET_STEPS = 1000

// 每級進化需要嘅步數
export const EVOLUTION_STEPS: Record<number, number> = {
  1: 0,      // 初始
  2: 10000,  // Level 2 幼年
  3: 30000,  // Level 3 成年
  4: 60000,  // Level 4 完全體
  5: 100000, // Level 5 傳說
}

// 進化狀態對應
export const EVOLUTION_STATUS: Record<number, PetStatus> = {
  1: PetStatus.Baby,
  2: PetStatus.Juvenile,
  3: PetStatus.Adult,
  4: PetStatus.Evolved,
  5: PetStatus.Legendary,
}

// 稀有度對應嘅遇見機率
export const RARITY_ENCOUNTER_CHANCE: Record<Rarity, number> = {
  [Rarity.Common]: 0.50,     // 50%
  [Rarity.Uncommon]: 0.25,   // 25%
  [Rarity.Rare]: 0.15,       // 15%
  [Rarity.Epic]: 0.08,       // 8%
  [Rarity.Legendary]: 0.02,  // 2%
}

// 保底機制：每 N 步保證遇到稀有
export const PITY_STEPS = {
  [Rarity.Legendary]: 50000, // 50000 步保底傳說
  [Rarity.Epic]: 20000,      // 20000 步保底史詩
}

// 寵物遭遇步數門檻（每幾步隨機判定一次）
export const ENCOUNTER_INTERVAL = 500 // 每 500 步判定一次

// 生成隨機能力值
export function generateStats(rarity: Rarity, level: number): PetStats {
  const baseMultiplier = rarityMultiplier(rarity)
  const levelBonus = (level - 1) * 0.1

  return {
    speed: randomStat(10, 30, baseMultiplier, levelBonus),
    luck: randomStat(10, 30, baseMultiplier, levelBonus),
    charm: randomStat(10, 30, baseMultiplier, levelBonus),
    energy: randomStat(10, 30, baseMultiplier, levelBonus),
  }
}

// 稀有度倍率
function rarityMultiplier(rarity: Rarity): number {
  switch (rarity) {
    case Rarity.Common: return 1.0
    case Rarity.Uncommon: return 1.2
    case Rarity.Rare: return 1.5
    case Rarity.Epic: return 2.0
    case Rarity.Legendary: return 3.0
  }
}

// 隨機能力值生成
function randomStat(min: number, max: number, multiplier: number, levelBonus: number): number {
  const base = Math.floor(Math.random() * (max - min + 1)) + min
  return Math.floor(base * multiplier * (1 + levelBonus))
}

// 計算進化
export function calculateEvolution(
  totalSteps: number,
  currentStage: number,
  currentStats: PetStats
): { evolved: boolean; newStage: number; newStats: PetStats; newStatus: PetStatus } | null {
  const nextStage = currentStage + 1
  const stepsRequired = EVOLUTION_STEPS[nextStage]

  if (!stepsRequired || totalSteps < stepsRequired) {
    return null
  }

  const growthFactor = 1 + (nextStage - 1) * 0.3

  return {
    evolved: true,
    newStage: nextStage,
    newStats: {
      speed: Math.floor(currentStats.speed * growthFactor),
      luck: Math.floor(currentStats.luck * growthFactor),
      charm: Math.floor(currentStats.charm * growthFactor),
      energy: Math.floor(currentStats.energy * growthFactor),
    },
    newStatus: EVOLUTION_STATUS[nextStage],
  }
}

// 隨機遇見判定
export function rollEncounter(
  stepsSinceLastEncounter: number,
  pityCounter: Record<string, number>
): Rarity | null {
  if (stepsSinceLastEncounter < ENCOUNTER_INTERVAL) {
    return null
  }

  const roll = Math.random()

  // 保底檢查
  if (pityCounter['legendary'] >= PITY_STEPS[Rarity.Legendary]) {
    return Rarity.Legendary
  }
  if (pityCounter['epic'] >= PITY_STEPS[Rarity.Epic]) {
    return Rarity.Epic
  }

  // 隨機稀有度
  let cumulative = 0
  const entries = Object.entries(RARITY_ENCOUNTER_CHANCE) as [Rarity, number][]
  for (const [rarity, chance] of entries) {
    cumulative += chance
    if (roll <= cumulative) {
      return rarity
    }
  }

  return Rarity.Common
}

// 計算 mood 衰減
export function calculateMoodDecay(
  lastFedAt: number,
  lastInteractionAt: number,
  now: number
): number {
  const hoursSinceFed = (now - lastFedAt) / (1000 * 60 * 60)
  const hoursSinceInteraction = (now - lastInteractionAt) / (1000 * 60 * 60)

  let decay = 0
  if (hoursSinceFed > 4) decay += (hoursSinceFed - 4) * 5
  if (hoursSinceInteraction > 2) decay += (hoursSinceInteraction - 2) * 3

  return Math.min(decay, 100)
}
