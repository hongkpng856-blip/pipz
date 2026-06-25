import { PetSkill, PetStats, PetStatus, Rarity, SkillEffect } from '../types'
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

// ── Skills ──

interface SkillDef {
  id: string
  name: string
  description: string
  icon: string
  stat: keyof PetStats | 'all'
  minRarity: Rarity
  basePower: number
  effect?: SkillEffect      // gameplay effect (beyond stat boost)
}

const SKILL_POOL: SkillDef[] = [
  // ── Stat buffs (existing) ──
  { id: 'quick_dash', name: '疾速衝刺', description: '速度提升，行得更快', icon: '⚡', stat: 'speed', minRarity: Rarity.Common, basePower: 10 },
  { id: 'lucky_find', name: '幸運搜尋', description: '遇到稀有寵物機率提升', icon: '🍀', stat: 'luck', minRarity: Rarity.Common, basePower: 10 },
  { id: 'charm_wave', name: '魅力波動', description: '寵物心情更容易變好', icon: '💜', stat: 'charm', minRarity: Rarity.Common, basePower: 10 },
  { id: 'energy_shield', name: '能量護盾', description: '體力消耗減少', icon: '🔋', stat: 'energy', minRarity: Rarity.Common, basePower: 10 },
  { id: 'star_power', name: '星光之力', description: '全部能力小幅提升', icon: '⭐', stat: 'all', minRarity: Rarity.Uncommon, basePower: 8 },
  { id: 'fire_breath', name: '火焰吐息', description: '強大攻擊技能', icon: '🔥', stat: 'speed', minRarity: Rarity.Rare, basePower: 20 },
  { id: 'ice_armor', name: '冰霜護甲', description: '防禦大幅提升', icon: '❄️', stat: 'energy', minRarity: Rarity.Rare, basePower: 20 },
  { id: 'thunder_strike', name: '雷霆一擊', description: '傳說級終極技能', icon: '⚡', stat: 'all', minRarity: Rarity.Epic, basePower: 30 },
  { id: 'divine_blessing', name: '神聖祝福', description: '所有能力大幅提升', icon: '🌟', stat: 'all', minRarity: Rarity.Legendary, basePower: 50 },
  { id: 'shadow_step', name: '暗影步', description: '移動速度極大幅提升', icon: '🌙', stat: 'speed', minRarity: Rarity.Epic, basePower: 25 },
  { id: 'nature_gift', name: '自然恩賜', description: '運氣大幅提升', icon: '🌿', stat: 'luck', minRarity: Rarity.Rare, basePower: 18 },
  { id: 'moonlight_serenade', name: '月光小夜曲', description: '魅惑效果加倍', icon: '🌙', stat: 'charm', minRarity: Rarity.Uncommon, basePower: 12 },

  // ── Gameplay effects (new) ──
  { id: 'double_step', name: '雙倍步伐', description: '每步當兩步計！行路效率加倍', icon: '👟', stat: 'speed', minRarity: Rarity.Uncommon, basePower: 5, effect: SkillEffect.DoubleSteps },
  { id: 'energy_overload', name: '能量過載', description: '獲得更多能量！步數轉換率提升', icon: '⚡', stat: 'energy', minRarity: Rarity.Common, basePower: 5, effect: SkillEffect.EnergyBonus },
  { id: 'step_rush', name: '疾步如飛', description: '隨機獲得額外步數獎勵', icon: '💨', stat: 'speed', minRarity: Rarity.Rare, basePower: 10, effect: SkillEffect.StepBonus },
  { id: 'pet_magnet', name: '寵物磁鐵', description: '更容易遇到寵物蛋', icon: '🧲', stat: 'luck', minRarity: Rarity.Uncommon, basePower: 5, effect: SkillEffect.EncounterUp },
  { id: 'warm_incubator', name: '溫暖孵化', description: '蛋孵化所需步數減少', icon: '🔥', stat: 'energy', minRarity: Rarity.Common, basePower: 5, effect: SkillEffect.HatchSpeed },
  { id: 'calm_aura', name: '平靜光環', description: '心情下降速度減半', icon: '🛡️', stat: 'charm', minRarity: Rarity.Common, basePower: 5, effect: SkillEffect.MoodGuard },
]

const RARITY_ORDER: Record<Rarity, number> = {
  [Rarity.Common]: 0,
  [Rarity.Uncommon]: 1,
  [Rarity.Rare]: 2,
  [Rarity.Epic]: 3,
  [Rarity.Legendary]: 4,
}

export function generateSkills(rarity: Rarity, level: number): PetSkill[] {
  const available = SKILL_POOL.filter(s => RARITY_ORDER[s.minRarity] <= RARITY_ORDER[rarity])
  const shuffled = [...available].sort(() => Math.random() - 0.5)

  let count = 1
  if (rarity === Rarity.Uncommon) count = Math.random() > 0.5 ? 2 : 1
  else if (rarity === Rarity.Rare) count = 2
  else if (rarity === Rarity.Epic) count = Math.random() > 0.5 ? 3 : 2
  else if (rarity === Rarity.Legendary) count = 3

  return shuffled.slice(0, count).map((s, i) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    stat: s.stat,
    power: s.basePower + Math.floor(level * 1.5),
    unlockedAtLevel: Math.max(1, i * 3 + 1),
    effect: s.effect,
  }))
}

/** Return ALL skills for test/development pet */
export function generateAllSkills(level: number): PetSkill[] {
  return SKILL_POOL.map((s, i) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    stat: s.stat,
    power: s.basePower + Math.floor(level * 1.5),
    unlockedAtLevel: 1, // all unlocked immediately
    effect: s.effect,
  }))
}

export function getSkillBonus(skills: PetSkill[], stat: keyof PetStats): number {
  return skills
    .filter(s => s.stat === stat || s.stat === 'all')
    .reduce((sum, s) => sum + s.power, 0)
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

// ── Skill effects query ──

/** Check if any active pet skills provide a given effect */
export function hasEffect(skills: PetSkill[], effect: SkillEffect): boolean {
  return skills.some(s => s.effect === effect)
}

/** Step multiplier from DoubleSteps effect (1 = normal, 2 = double) */
export function calculateStepMultiplier(skills: PetSkill[]): number {
  return hasEffect(skills, SkillEffect.DoubleSteps) ? 2 : 1
}

/** Encounter rate multiplier (1 = normal, >1 = more encounters) */
export function getEncounterMultiplier(skills: PetSkill[]): number {
  return hasEffect(skills, SkillEffect.EncounterUp) ? 1.5 : 1
}

/** Hatch speed multiplier (1 = normal, <1 = faster) */
export function getHatchSpeedMultiplier(skills: PetSkill[]): number {
  return hasEffect(skills, SkillEffect.HatchSpeed) ? 0.75 : 1
}

/** Whether mood decay is halved */
export function hasMoodGuard(skills: PetSkill[]): boolean {
  return hasEffect(skills, SkillEffect.MoodGuard)
}

/** Bonus energy per step (extra percentage points) */
export function getEnergyBonus(skills: PetSkill[]): number {
  return hasEffect(skills, SkillEffect.EnergyBonus) ? 0.5 : 0 // +50% energy per step
}

/** Random step bonus: returns bonus steps or 0 */
export function rollStepBonus(skills: PetSkill[]): number {
  if (!hasEffect(skills, SkillEffect.StepBonus)) return 0
  return Math.random() < 0.15 ? Math.floor(Math.random() * 10) + 5 : 0 // 15% chance for 5-14 bonus steps
}

// ── Roguelike: Equipment Definitions ──

import { EquipmentSlot, EquipmentDef, HelpItemDef, HelpEffect, GameEvent, EventEffect, EventType } from '../types'

export const EQUIPMENT_POOL: EquipmentDef[] = [
  // ── Head ──
  { id: 'leaf_crown', name: '樹葉冠冕', description: '森林精靈編織嘅葉冠，提升運氣', icon: '🌿', slot: EquipmentSlot.Head, rarity: Rarity.Common, statBonuses: { luck: 5 }, bonusValue: 5 },
  { id: 'bone_helm', name: '骨製頭盔', description: '堅硬嘅骨頭保護，提升體力', icon: '🦴', slot: EquipmentSlot.Head, rarity: Rarity.Uncommon, statBonuses: { energy: 10 }, bonusValue: 10 },
  { id: 'crystal_circlet', name: '水晶額環', description: '閃爍水晶提升魅力', icon: '💎', slot: EquipmentSlot.Head, rarity: Rarity.Rare, statBonuses: { charm: 15 }, bonusValue: 15, eventOnly: true },
  { id: 'crown_of_thorns', name: '荊棘冠', description: '傳說級頭冠，全能力提升', icon: '👑', slot: EquipmentSlot.Head, rarity: Rarity.Legendary, statBonuses: { speed: 10, luck: 10, charm: 10, energy: 10 }, bonusValue: 40, eventOnly: true },
  // ── Body ──
  { id: 'leaf_cloak', name: '樹葉披風', description: '輕巧嘅葉披風，行得更快', icon: '🍃', slot: EquipmentSlot.Body, rarity: Rarity.Common, statBonuses: { speed: 5 }, bonusValue: 5 },
  { id: 'bone_armor', name: '骨甲', description: '堅固骨甲保護，提升體力', icon: '🛡️', slot: EquipmentSlot.Body, rarity: Rarity.Uncommon, statBonuses: { energy: 10 }, bonusValue: 10 },
  { id: 'silk_robe', name: '絲綢法袍', description: '柔軟絲袍，充滿魅力', icon: '👘', slot: EquipmentSlot.Body, rarity: Rarity.Rare, statBonuses: { charm: 15 }, bonusValue: 15 },
  { id: 'dragon_scale', name: '龍鱗甲', description: '龍鱗打造嘅終極護甲', icon: '🐉', slot: EquipmentSlot.Body, rarity: Rarity.Legendary, statBonuses: { speed: 10, energy: 20, charm: 10 }, bonusValue: 40, eventOnly: true },
  // ── Feet ──
  { id: 'grass_sandals', name: '草鞋', description: '簡單草鞋，輕快步伐', icon: '👡', slot: EquipmentSlot.Feet, rarity: Rarity.Common, statBonuses: { speed: 5 }, bonusValue: 5 },
  { id: 'rabbit_boots', name: '兔毛靴', description: '兔毛製成，跳得更快', icon: '🐇', slot: EquipmentSlot.Feet, rarity: Rarity.Uncommon, statBonuses: { speed: 10 }, bonusValue: 10 },
  { id: 'wind_greaves', name: '風之脛甲', description: '灌注風之力量，極速移動', icon: '🌪️', slot: EquipmentSlot.Feet, rarity: Rarity.Epic, statBonuses: { speed: 20, luck: 5 }, bonusValue: 25, eventOnly: true },
  // ── Accessory ──
  { id: 'lucky_coin', name: '幸運硬幣', description: '古老硬幣帶嚟好運', icon: '🪙', slot: EquipmentSlot.Accessory, rarity: Rarity.Common, statBonuses: { luck: 5 }, bonusValue: 5 },
  { id: 'moon_pendant', name: '月亮吊墜', description: '月光祝福，魅力提升', icon: '🌙', slot: EquipmentSlot.Accessory, rarity: Rarity.Uncommon, statBonuses: { charm: 10 }, bonusValue: 10 },
  { id: 'four_leaf_clover', name: '四葉草', description: '傳說中嘅幸運物', icon: '🍀', slot: EquipmentSlot.Accessory, rarity: Rarity.Epic, statBonuses: { luck: 20, charm: 5 }, bonusValue: 25, eventOnly: true },
]

// ── Roguelike: Help Items Definitions ──

export const HELP_ITEM_POOL: HelpItemDef[] = [
  { id: 'berry', name: '魔法莓果', description: '回復心情 30%', icon: '🫐', rarity: Rarity.Common, effect: HelpEffect.RestoreMood, power: 30 },
  { id: 'power_herb', name: '力量藥草', description: '暫時提升全能力 +10', icon: '🌿', rarity: Rarity.Uncommon, effect: HelpEffect.TempStatBoost, power: 10, duration: 500 },
  { id: 'swift_potion', name: '疾走藥水', description: '步數 x2 持續 200 步', icon: '🧪', rarity: Rarity.Rare, effect: HelpEffect.StepMultiplier, power: 2, duration: 200 },
  { id: 'attract_incense', name: '吸引香薰', description: '遭遇率提升 200 步', icon: '🪔', rarity: Rarity.Uncommon, effect: HelpEffect.EncounterBoost, power: 2, duration: 200 },
  { id: 'xp_elixir', name: '經驗靈藥', description: '立即獲得 50 XP', icon: '✨', rarity: Rarity.Common, effect: HelpEffect.HealXp, power: 50 },
]

// ── Roguelike: Event Definitions ──

export const EVENT_POOL: GameEvent[] = [
  // ── Positive Events ──
  {
    id: 'sunny_meadow', name: '陽光草原', description: '你同寵物穿越一片溫暖嘅陽光草原，心情大好！', icon: '🌞', type: 'positive', weight: 15, minSteps: 0,
    effects: [{ type: 'mood_change', value: 20 }, { type: 'step_bonus', value: 50 }],
  },
  {
    id: 'rainbow_trail', name: '彩虹小徑', description: '天空出現彩虹，寵物興奮地奔跑，獲得額外步數！', icon: '🌈', type: 'positive', weight: 12, minSteps: 100,
    effects: [{ type: 'step_bonus', value: 100 }, { type: 'mood_change', value: 10 }],
  },
  {
    id: 'treasure_chest', name: '寶藏箱', description: '路邊發現一個古老寶箱！', icon: '📦', type: 'positive', weight: 10, minSteps: 500,
    effects: [{ type: 'step_bonus', value: 200 }],
    choices: [
      { label: '打開佢', effects: [{ type: 'item_gain', value: 0, itemId: 'lucky_coin' }, { type: 'step_bonus', value: 50 }] },
      { label: '唔好亂掂', effects: [{ type: 'step_bonus', value: 20 }] },
    ],
  },
  {
    id: 'wandering_merchant', name: '流浪商人', description: '一個神秘商人出現，送你一份禮物！', icon: '🧳', type: 'positive', weight: 8, minSteps: 1000,
    effects: [{ type: 'item_gain', value: 0, itemId: 'berry' }, { type: 'xp_gain', value: 20 }],
  },
  {
    id: 'healing_spring', name: '治癒泉水', description: '發現一眼閃閃發光嘅泉水，寵物完全回復！', icon: '⛲', type: 'positive', weight: 10, minSteps: 300,
    effects: [{ type: 'mood_change', value: 50 }, { type: 'xp_gain', value: 30 }],
  },
  {
    id: 'lucky_shooting_star', name: '流星', description: '一顆流星劃過天際，快啲許願！', icon: '⭐', type: 'positive', weight: 5, minSteps: 2000,
    effects: [{ type: 'step_bonus', value: 500 }, { type: 'mood_change', value: 30 }],
    eventOnly: true,
  },

  // ── Negative Events ──
  {
    id: 'mud_puddle', name: '泥濘水氹', description: '踩到一個大泥氹，行路變慢咗！', icon: '💧', type: 'negative', weight: 15, minSteps: 0,
    effects: [{ type: 'step_loss', value: 30 }, { type: 'mood_change', value: -10 }],
  },
  {
    id: 'thorn_bush', name: '荊棘叢', description: '穿過荊棘叢，寵物受傷了！', icon: '🌵', type: 'negative', weight: 12, minSteps: 100,
    effects: [{ type: 'mood_change', value: -20 }],
    choices: [
      { label: '慢慢通過', effects: [{ type: 'mood_change', value: -10 }, { type: 'step_loss', value: 50 }] },
      { label: '繞路行', effects: [{ type: 'step_loss', value: 100 }] },
    ],
  },
  {
    id: 'rain_storm', name: '暴風雨', description: '突然落大雨，寵物好驚！', icon: '🌧️', type: 'negative', weight: 12, minSteps: 200,
    effects: [{ type: 'mood_change', value: -15 }, { type: 'step_loss', value: 50 }],
  },
  {
    id: 'lost_path', name: '迷路', description: '喺森林入面迷路咗…', icon: '🧭', type: 'negative', weight: 8, minSteps: 500,
    effects: [{ type: 'step_loss', value: 150 }],
    choices: [
      { label: '原路折返', effects: [{ type: 'step_loss', value: 100 }] },
      { label: '繼續向前', effects: [{ type: 'step_loss', value: 200 }, { type: 'stat_boost', target: 'luck', value: 3 }] },
    ],
  },
  {
    id: 'goblin_ambush', name: '哥布林偷襲', description: '一隻哥布林跳出嚟偷走咗你嘅道具！', icon: '👺', type: 'negative', weight: 5, minSteps: 1500,
    effects: [{ type: 'item_loss', value: 0 }, { type: 'step_loss', value: 100 }],
    eventOnly: true,
  },
  {
    id: 'rock_slide', name: '山崩', description: '前方山體滑坡，要繞好大個圈！', icon: '⛰️', type: 'negative', weight: 6, minSteps: 1000,
    effects: [{ type: 'step_loss', value: 300 }, { type: 'mood_change', value: -10 }],
  },
  // ── Interactive: Risk Ladder ──
  {
    id: 'risk_ladder', name: '連環寶箱', description: '發現一排古老寶箱！逐個開，隨時停手拎走獎勵。㩒中💣就乜都冇。', icon: '📦', type: 'positive', weight: 60, minSteps: 500,
    effects: [{ type: 'step_bonus', value: 0 }],
    eventOnly: true,
  },
]

/** Calculate total stat bonuses from equipped items */
export function calculateEquipmentBonus(
  equipped: EquipmentDef[],
  stat: keyof PetStats
): number {
  return equipped.reduce((sum, eq) => sum + ((eq.statBonuses[stat] as number) || 0), 0)
}

/** Roll a random event based on current state */
export function rollEvent(totalSteps: number): GameEvent | null {
  const available = EVENT_POOL.filter(e => totalSteps >= e.minSteps)
  if (available.length === 0) return null

  const totalWeight = available.reduce((s, e) => s + e.weight, 0)
  let roll = Math.random() * totalWeight

  for (const ev of available) {
    roll -= ev.weight
    if (roll <= 0) return ev
  }

  return available[available.length - 1]
}

/** Roll random equipment drop */
export function rollEquipmentDrop(rarity: Rarity): EquipmentDef | null {
  const available = EQUIPMENT_POOL.filter(e => !e.eventOnly)
  if (available.length === 0) return null

  // Higher rarity = better equipment
  const rarityOrder: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }
  const maxRarity = rarityOrder[rarity] ?? 0
  const candidates = available.filter(e => rarityOrder[e.rarity] <= maxRarity)

  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}
