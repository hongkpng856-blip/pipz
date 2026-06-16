import { Rarity, PetStats } from '../types'

// 稀有度顏色
export const RARITY_COLORS: Record<Rarity, string> = {
  [Rarity.Common]: '#9ca3af',      // 灰色
  [Rarity.Uncommon]: '#22c55e',    // 綠色
  [Rarity.Rare]: '#3b82f6',        // 藍色
  [Rarity.Epic]: '#a855f7',        // 紫色
  [Rarity.Legendary]: '#f59e0b',   // 金色
}

// 稀有度標籤
export const RARITY_LABELS: Record<Rarity, string> = {
  [Rarity.Common]: '普通',
  [Rarity.Uncommon]: '罕見',
  [Rarity.Rare]: '稀有',
  [Rarity.Epic]: '史詩',
  [Rarity.Legendary]: '傳說',
}

// 計算總能力值
export function calculateTotalStats(stats: PetStats): number {
  return stats.speed + stats.luck + stats.charm + stats.energy
}

// 計算能力值等級評分（S/A/B/C/D）
export function statGrade(value: number): string {
  if (value >= 80) return 'S'
  if (value >= 60) return 'A'
  if (value >= 40) return 'B'
  if (value >= 20) return 'C'
  return 'D'
}

// 生成 AI prompt（後端用）
export function buildPetPrompt(species: string, rarity: Rarity, stage: number): string {
  const rarityStyle: Record<Rarity, string> = {
    [Rarity.Common]: 'simple',
    [Rarity.Uncommon]: 'detailed',
    [Rarity.Rare]: 'ornate',
    [Rarity.Epic]: 'magnificent',
    [Rarity.Legendary]: 'legendary glowing',
  }

  return `A cute pixel art pet, ${species}, ${rarityStyle[rarity]} style, evolution stage ${stage}, 32x32 pixels, solid colors, game sprite, white background, adorable, chibi, kawaii`
}

// 格式化步數
export function formatSteps(steps: number): string {
  if (steps >= 1000000) return `${(steps / 1000000).toFixed(1)}M`
  if (steps >= 1000) return `${(steps / 1000).toFixed(1)}K`
  return steps.toString()
}

// 生成寵物名稱（暫時用）
const PET_NAMES = ['Pipi', 'Zizi', 'Momo', 'Lala', 'Kiki', 'Toto', 'Bubu', 'Didi', 'Gugu', 'Fufu']

export function randomPetName(): string {
  return PET_NAMES[Math.floor(Math.random() * PET_NAMES.length)]
}

// Random ID 生成器
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}
