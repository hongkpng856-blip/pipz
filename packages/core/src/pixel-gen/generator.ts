import { PixelPetConfig, PixelGrid, PixelPetData, PixelPalette } from './types'
import { seededRandom, RARITY_PALETTES, BODY_TEMPLATES, EYE_TEMPLATES, ACCESSORY_TEMPLATES, STAGE_EMBELLISHMENTS } from './palette'

const GRID_SIZE = 16

export function generatePixelPet(config: PixelPetConfig): PixelPetData {
  const rand = seededRandom(config.seed)
  
  // Select palette based on rarity
  const palettes = RARITY_PALETTES[config.rarity]
  const palette = palettes[Math.floor(rand() * palettes.length)]
  
  // Select body template
  const bodyIdx = Math.floor(rand() * BODY_TEMPLATES.length)
  const body = BODY_TEMPLATES[bodyIdx]
  
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
  
  return {
    grid,
    width: GRID_SIZE,
    height: GRID_SIZE,
    palette,
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
