import { PixelPetConfig, PixelGrid, PixelPetData, PixelPalette, PetAnimationTraits } from './types'
import { seededRandom, RARITY_PALETTES, BODY_TEMPLATES, EYE_TEMPLATES, ACCESSORY_TEMPLATES, STAGE_EMBELLISHMENTS, SPECIES_NAMES } from './palette'

const GRID_SIZE = 16

// Personality tags pool
const PERSONALITY_TAGS = [
  '活潑', '文靜', '貪玩', '懶惰', '好奇', '高傲', '親切', '古怪',
  '勇敢', '膽小', '醒目', '傻氣', '優雅', '粗魯', '神秘', '熱情',
]

export function generatePixelPet(config: PixelPetConfig): PixelPetData {
  const rand = seededRandom(config.seed)
  
  // Select palette based on rarity
  const palettes = RARITY_PALETTES[config.rarity]
  const palette = palettes[Math.floor(rand() * palettes.length)]
  
  // Select body template
  const bodyIdx = Math.floor(rand() * BODY_TEMPLATES.length)
  const body = BODY_TEMPLATES[bodyIdx]
  
  // Species info
  const speciesName = SPECIES_NAMES[bodyIdx] || '未知'
  
  // Select eye style
  const eyeIdx = Math.floor(rand() * EYE_TEMPLATES.length)
  const eyes = EYE_TEMPLATES[eyeIdx]
  
  // Select accessories (weighted against "none" for higher rarity)
  const accRoll = rand()
  let accessoryIdx = 0
  if (config.rarity === 'common' && accRoll > 0.5) accessoryIdx = 0
  else if (config.rarity === 'uncommon' && accRoll > 0.4) accessoryIdx = Math.floor(rand() * ACCESSORY_TEMPLATES.length)
  else if (config.rarity === 'rare') accessoryIdx = Math.floor(rand() * ACCESSORY_TEMPLATES.length)
  else if (config.rarity === 'epic') accessoryIdx = Math.floor(rand() * (ACCESSORY_TEMPLATES.length - 1)) + 1
  else if (config.rarity === 'legendary') accessoryIdx = Math.floor(rand() * (ACCESSORY_TEMPLATES.length - 2)) + 2
  const accessories = ACCESSORY_TEMPLATES[accessoryIdx]
  
  // Stage embellishments
  const stageEmbellishments = STAGE_EMBELLISHMENTS[config.evolutionStage] || []
  
  // Build grid
  const grid: PixelGrid = []
  for (let y = 0; y < GRID_SIZE; y++) {
    grid[y] = []
    for (let x = 0; x < GRID_SIZE; x++) {
      grid[y][x] = 'transparent'
    }
  }
  
  // Apply body
  for (const [row, col, part] of body) {
    if (row < GRID_SIZE && col < GRID_SIZE) {
      grid[row][col] = part === 'p' ? palette.primary : part === 's' ? palette.secondary : palette.accent
    }
  }
  
  // Apply eyes
  for (const [row, col] of eyes) {
    if (row < GRID_SIZE && col < GRID_SIZE && grid[row][col] !== 'transparent') {
      grid[row][col] = palette.eye
    }
  }
  
  // Apply accessories
  for (const [row, col, part] of accessories) {
    if (row < GRID_SIZE && col < GRID_SIZE) {
      grid[row][col] = part === 'p' ? palette.primary : part === 's' ? palette.secondary : palette.accent
    }
  }
  
  // Apply stage embellishments
  for (const [row, col, part] of stageEmbellishments) {
    if (row < GRID_SIZE && col < GRID_SIZE) {
      grid[row][col] = part === 'p' ? palette.primary : part === 's' ? palette.secondary : palette.accent
    }
  }
  
  // Add crown for legendary
  if (config.rarity === 'legendary') {
    grid[0][7] = palette.accent
    grid[1][6] = palette.accent
    grid[1][7] = palette.primary
    grid[1][8] = palette.accent
    grid[0][6] = palette.accent
    grid[0][8] = palette.accent
  }
  
  // ── Outline pass: add 1px outline around entire sprite ──
  // For each non-transparent pixel, fill its transparent neighbors with outline color
  const outlineColor = palette.outline
  const outlineGrid: PixelGrid = grid.map(row => [...row]) // copy
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x] === 'transparent') continue
      // Check 4 neighbors (up, down, left, right)
      const neighbors: [number, number][] = [[y-1,x],[y+1,x],[y,x-1],[y,x+1]]
      for (const [ny, nx] of neighbors) {
        if (ny < 0 || ny >= GRID_SIZE || nx < 0 || nx >= GRID_SIZE) continue
        if (grid[ny][nx] === 'transparent' && outlineGrid[ny][nx] === 'transparent') {
          outlineGrid[ny][nx] = outlineColor
        }
      }
    }
  }
  
  return {
    grid: outlineGrid,
    width: GRID_SIZE,
    height: GRID_SIZE,
    palette,
    speciesId: bodyIdx,
    speciesName,
  }
}

// ── Generate per-pet animation personality traits from seed ──
// Different seed offset from visual generation so animation is independent but deterministic.

export function generatePetAnimationTraits(
  seed: number,
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
  evolutionStage: number,
): PetAnimationTraits {
  const rand = seededRandom(seed + 9999) // different offset from visual gen

  const raritySpeedMap: Record<string, number> = { common: 0, uncommon: 0.5, rare: 1.2, epic: 2, legendary: 3 }
  const rarityEnergyMap: Record<string, number> = { common: 0, uncommon: 0.5, rare: 1, epic: 2, legendary: 3 }
  const raritySparkle: Record<string, number> = { common: 0.01, uncommon: 0.02, rare: 0.04, epic: 0.06, legendary: 0.10 }

  const stageBonus = (evolutionStage - 1) * 0.5

  const walkSpeed = Math.floor(rand() * 5) + 3 + (raritySpeedMap[rarity] || 0)
  const walkBounce = Math.floor(rand() * 6) + 2
  const walkWaddle = Math.floor(rand() * 5)

  const idleStyles: PetAnimationTraits['idleStyle'][] = ['still', 'sway', 'bob', 'look']
  const sleepStyles: PetAnimationTraits['sleepStyle'][] = ['curl', 'sprawl', 'stand']
  const reactionStyles: PetAnimationTraits['reactionStyle'][] = ['bounce', 'spin', 'jump', 'wiggle']

  // Pick personality tags
  const tagCount = 1 + Math.floor(rand() * 3) // 1-3 tags
  const shuffled = [...PERSONALITY_TAGS].sort(() => rand() - 0.5)
  const personalityTags = shuffled.slice(0, tagCount)

  return {
    walkSpeed: Math.min(10, Math.max(1, Math.round(walkSpeed))),
    walkBounce: Math.min(10, Math.max(1, Math.round(walkBounce))),
    walkWaddle: Math.min(10, Math.max(0, Math.round(walkWaddle))),
    idleStyle: idleStyles[Math.floor(rand() * idleStyles.length)],
    blinkInterval: 2000 + Math.floor(rand() * 6000),
    blinkDuration: 80 + Math.floor(rand() * 120),
    sleepStyle: sleepStyles[Math.floor(rand() * sleepStyles.length)],
    energy: Math.min(10, Math.max(1, Math.round(Math.floor(rand() * 5) + 1 + stageBonus + (rarityEnergyMap[rarity] || 0)))),
    reactionStyle: reactionStyles[Math.floor(rand() * reactionStyles.length)],
    sparkleChance: raritySparkle[rarity] || 0.01,
    personalityTags,
  }
}

export function renderPixelPetToCanvas(
  canvas: HTMLCanvasElement,
  data: PixelPetData,
  pixelSize: number = 3,
  glowColor: string | null = null,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const w = data.width * pixelSize
  const h = data.height * pixelSize
  canvas.width = w
  canvas.height = h
  
  // Clear
  ctx.clearRect(0, 0, w, h)
  
  // Glow effect
  if (glowColor) {
    ctx.shadowColor = glowColor
    ctx.shadowBlur = pixelSize * 3
  }
  
  // Draw pixels
  for (let y = 0; y < data.height; y++) {
    for (let x = 0; x < data.width; x++) {
      const color = data.grid[y][x]
      if (color && color !== 'transparent') {
        ctx.fillStyle = color
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize)
      }
    }
  }
  
  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

export function pixelPetToDataURL(data: PixelPetData, pixelSize: number = 3): string {
  const canvas = document.createElement('canvas')
  renderPixelPetToCanvas(canvas, data, pixelSize, data.palette.glow)
  return canvas.toDataURL('image/png')
}

// Get the species index (0-49) from a seed, matching generatePixelPet's logic
export function getSpeciesIndex(seed: number): number {
  const rand = seededRandom(seed)
  rand() // skip first rand() call (palette selection in generatePixelPet)
  return Math.floor(rand() * 50) // second rand() is body/species index
}
