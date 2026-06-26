import { PixelPetConfig, PixelGrid, PixelPetData, PixelPalette, AnimationFrame, AnimationType } from './types'
import { seededRandom, RARITY_PALETTES, BODY_TEMPLATES, EYE_TEMPLATES, ACCESSORY_TEMPLATES, STAGE_EMBELLISHMENTS, SPECIES_NAMES } from './palette'

const GRID_SIZE = 16

// ── Build raw grid (before outline pass) ──
function buildRawGrid(config: PixelPetConfig): {
  grid: PixelGrid,
  palette: PixelPalette,
  bodyIdx: number,
  eyeIdx: number,
  speciesName: string,
} {
  const rand = seededRandom(config.seed)

  const palettes = RARITY_PALETTES[config.rarity]
  const palette = palettes[Math.floor(rand() * palettes.length)]

  const bodyIdx = Math.floor(rand() * BODY_TEMPLATES.length)
  const body = BODY_TEMPLATES[bodyIdx]
  const speciesName = SPECIES_NAMES[bodyIdx] || '未知'

  const eyeIdx = Math.floor(rand() * EYE_TEMPLATES.length)
  const eyes = EYE_TEMPLATES[eyeIdx]

  const accRoll = rand()
  let accessoryIdx = 0
  if (config.rarity === 'common' && accRoll > 0.5) accessoryIdx = 0
  else if (config.rarity === 'uncommon' && accRoll > 0.4) accessoryIdx = Math.floor(rand() * ACCESSORY_TEMPLATES.length)
  else if (config.rarity === 'rare') accessoryIdx = Math.floor(rand() * ACCESSORY_TEMPLATES.length)
  else if (config.rarity === 'epic') accessoryIdx = Math.floor(rand() * (ACCESSORY_TEMPLATES.length - 1)) + 1
  else if (config.rarity === 'legendary') accessoryIdx = Math.floor(rand() * (ACCESSORY_TEMPLATES.length - 2)) + 2
  const accessories = ACCESSORY_TEMPLATES[accessoryIdx]

  const stageEmbellishments = STAGE_EMBELLISHMENTS[config.evolutionStage] || []

  // Build empty grid
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

  // Legendary crown
  if (config.rarity === 'legendary') {
    grid[0][7] = palette.accent
    grid[1][6] = palette.accent
    grid[1][7] = palette.primary
    grid[1][8] = palette.accent
    grid[0][6] = palette.accent
    grid[0][8] = palette.accent
  }

  // Track eye pixel positions for animation
  // Store as metadata: eye row range, col range
  const eyePixels = eyes // [row, col] pairs in base grid

  return { grid, palette, bodyIdx, eyeIdx, speciesName }
}

// ── Apply outline pass ──
function applyOutline(grid: PixelGrid, outlineColor: string): PixelGrid {
  const outlineGrid: PixelGrid = grid.map(row => [...row])
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x] === 'transparent') continue
      const neighbors: [number, number][] = [[y-1,x],[y+1,x],[y,x-1],[y,x+1]]
      for (const [ny, nx] of neighbors) {
        if (ny < 0 || ny >= GRID_SIZE || nx < 0 || nx >= GRID_SIZE) continue
        if (grid[ny][nx] === 'transparent' && outlineGrid[ny][nx] === 'transparent') {
          outlineGrid[ny][nx] = outlineColor
        }
      }
    }
  }
  return outlineGrid
}

export function generatePixelPet(config: PixelPetConfig): PixelPetData {
  const { grid: rawGrid, palette, bodyIdx, speciesName } = buildRawGrid(config)
  const grid = applyOutline(rawGrid, palette.outline)

  return {
    grid,
    width: GRID_SIZE,
    height: GRID_SIZE,
    palette,
    speciesId: bodyIdx,
    speciesName,
  }
}

// ── Frame modifiers ──

/** Shift all non-transparent pixels by dx, dy */
function shiftPixels(grid: PixelGrid, dx: number, dy: number): PixelGrid {
  const shifted: PixelGrid = []
  for (let y = 0; y < GRID_SIZE; y++) {
    shifted[y] = []
    for (let x = 0; x < GRID_SIZE; x++) {
      shifted[y][x] = 'transparent'
    }
  }
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const color = grid[y][x]
      if (color === 'transparent') continue
      const ny = y + dy
      const nx = x + dx
      if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE) {
        shifted[ny][nx] = color
      }
    }
  }
  return shifted
}

/** Find eye-colored pixels and return them to transparent (blink) */
function blinkEyes(grid: PixelGrid, eyeColor: string): PixelGrid {
  const blinked = grid.map(row => [...row])
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (blinked[y][x] === eyeColor) {
        blinked[y][x] = 'transparent'
      }
    }
  }
  return blinked
}

/** Replace eye-colored pixels with a happy pattern (wider/different) */
function happyEyes(grid: PixelGrid, eyeColor: string): PixelGrid {
  const happy = grid.map(row => [...row])
  // Find eye positions first, then modify them
  const eyePositions: [number, number][] = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (happy[y][x] === eyeColor) {
        eyePositions.push([y, x])
      }
    }
  }
  if (eyePositions.length === 0) return happy

  // Remove old eye pixels
  for (const [y, x] of eyePositions) {
    happy[y][x] = 'transparent'
  }

  // Compute center of eyes
  const avgY = eyePositions.reduce((s, [y]) => s + y, 0) / eyePositions.length
  const eyesLeft = eyePositions.filter(([_, x]) => x < 8)
  const eyesRight = eyePositions.filter(([_, x]) => x >= 8)

  // Draw ^ ^ pattern for happy eyes (two diagonal lines)
  const happyRow = Math.round(avgY)
  if (eyesLeft.length > 0) {
    const leftX = Math.round(eyesLeft.reduce((s, [_, x]) => s + x, 0) / eyesLeft.length)
    happy[happyRow - 1][leftX] = eyeColor
    happy[happyRow][leftX - 1] = eyeColor
    happy[happyRow][leftX + 1] = eyeColor
  }
  if (eyesRight.length > 0) {
    const rightX = Math.round(eyesRight.reduce((s, [_, x]) => s + x, 0) / eyesRight.length)
    happy[happyRow - 1][rightX] = eyeColor
    happy[happyRow][rightX - 1] = eyeColor
    happy[happyRow][rightX + 1] = eyeColor
  }

  return happy
}

/** Replace eye-colored pixels with sleepy — — pattern */
function sleepyEyes(grid: PixelGrid, eyeColor: string): PixelGrid {
  const sleepy = grid.map(row => [...row])
  const eyePositions: [number, number][] = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (sleepy[y][x] === eyeColor) {
        eyePositions.push([y, x])
      }
    }
  }
  if (eyePositions.length === 0) return sleepy

  // Remove old eye pixels
  for (const [y, x] of eyePositions) {
    sleepy[y][x] = 'transparent'
  }

  const avgY = Math.round(eyePositions.reduce((s, [y]) => s + y, 0) / eyePositions.length)
  const eyesLeft = eyePositions.filter(([_, x]) => x < 8)
  const eyesRight = eyePositions.filter(([_, x]) => x >= 8)

  // Draw — — pattern (horizontal line for each eye)
  if (eyesLeft.length > 0) {
    const leftX = Math.round(eyesLeft.reduce((s, [_, x]) => s + x, 0) / eyesLeft.length)
    sleepy[avgY][leftX - 1] = eyeColor
    sleepy[avgY][leftX] = eyeColor
    sleepy[avgY][leftX + 1] = eyeColor
  }
  if (eyesRight.length > 0) {
    const rightX = Math.round(eyesRight.reduce((s, [_, x]) => s + x, 0) / eyesRight.length)
    sleepy[avgY][rightX - 1] = eyeColor
    sleepy[avgY][rightX] = eyeColor
    sleepy[avgY][rightX + 1] = eyeColor
  }

  return sleepy
}

// ── Animation frame generator ──

export function generateAnimationFrames(
  config: PixelPetConfig,
  animType: AnimationType = 'idle',
): AnimationFrame[] {
  const { grid: rawGrid, palette, bodyIdx, speciesName } = buildRawGrid(config)
  const outlineGrid = applyOutline(rawGrid, palette.outline)

  // Store outlined grid as base
  const baseData: PixelPetData = {
    grid: outlineGrid,
    width: GRID_SIZE,
    height: GRID_SIZE,
    palette,
    speciesId: bodyIdx,
    speciesName,
  }

  const frames: AnimationFrame[] = []
  const eyeColor = palette.eye

  switch (animType) {
    case 'idle': {
      // Frame 0: normal (2.5s)
      frames.push({ grid: outlineGrid, duration: 2500 })
      // Frame 1: blink (120ms)
      const blinked = applyOutline(blinkEyes(rawGrid, eyeColor), palette.outline)
      frames.push({ grid: blinked, duration: 120 })
      // Frame 2: normal again (3s)
      frames.push({ grid: outlineGrid, duration: 3000 })
      // Frame 3: blink (120ms)
      frames.push({ grid: blinked, duration: 120 })
      break
    }
    case 'walk': {
      // 4-frame walk cycle: center → left → center → right
      const f0 = outlineGrid
      // Shift body left by 1px (then outline)
      const shiftedGridL = shiftPixels(rawGrid, -1, 0)
      const f1 = applyOutline(shiftedGridL, palette.outline)
      // Center
      const f2 = outlineGrid
      // Shift right
      const shiftedGridR = shiftPixels(rawGrid, 1, 0)
      const f3 = applyOutline(shiftedGridR, palette.outline)

      frames.push({ grid: f0, duration: 150 })
      frames.push({ grid: f1, duration: 150 })
      frames.push({ grid: f2, duration: 150 })
      frames.push({ grid: f3, duration: 150 })
      break
    }
    case 'happy': {
      // Happy bounce: up → down with happy eyes
      const happyRaw = happyEyes(rawGrid, eyeColor)
      const f0 = applyOutline(happyRaw, palette.outline)

      // Shift up (jump)
      const upRaw = shiftPixels(happyRaw, 0, -1)
      const f1 = applyOutline(upRaw, palette.outline)

      frames.push({ grid: f0, duration: 200 })
      frames.push({ grid: f1, duration: 200 })
      break
    }
    case 'sleep': {
      // Sleepy breathing: normal sleepy → deeper sleepy
      const sleepyRaw = sleepyEyes(rawGrid, eyeColor)
      const f0 = applyOutline(sleepyRaw, palette.outline)

      // Shift down slightly (relaxed)
      const deepRaw = shiftPixels(sleepyRaw, 0, 1)
      const f1 = applyOutline(deepRaw, palette.outline)

      frames.push({ grid: f0, duration: 2000 })
      frames.push({ grid: f1, duration: 2000 })
      // Extra blink frame (eyes fully close for a moment)
      const blinkSleep = applyOutline(blinkEyes(sleepyRaw, eyeColor), palette.outline)
      frames.push({ grid: blinkSleep, duration: 300 })
      frames.push({ grid: f0, duration: 2000 })
      break
    }
  }

  return frames
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

  ctx.clearRect(0, 0, w, h)

  if (glowColor) {
    ctx.shadowColor = glowColor
    ctx.shadowBlur = pixelSize * 3
  }

  for (let y = 0; y < data.height; y++) {
    for (let x = 0; x < data.width; x++) {
      const color = data.grid[y][x]
      if (color && color !== 'transparent') {
        ctx.fillStyle = color
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize)
      }
    }
  }

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

export function pixelPetToDataURL(data: PixelPetData, pixelSize: number = 3): string {
  const canvas = document.createElement('canvas')
  renderPixelPetToCanvas(canvas, data, pixelSize, data.palette.glow)
  return canvas.toDataURL('image/png')
}

export function getSpeciesIndex(seed: number): number {
  const rand = seededRandom(seed)
  rand()
  return Math.floor(rand() * 50)
}
