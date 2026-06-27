import { PixelGrid, PixelPetData } from './types'

// ── Helpers ──
const clone = (g: PixelGrid): PixelGrid => g.map(row => [...row])
const isFilled = (c: string) => c && c !== 'transparent'

// ═══════════════════════════════════════════════
//  WALK ANIMATION (4 frames)
// ═══════════════════════════════════════════════

/**
 * Improved walk cycle: 4-frame alternating stride.
 * Frame 0 = contact, Frame 1 = stride R (passing), Frame 2 = contact, Frame 3 = stride L (passing).
 */
export function generateWalkFrames(
  petData: PixelPetData,
): PixelGrid[] {
  const { grid, width: w, height: h, palette } = petData
  const secondary = palette.secondary

  const f0 = clone(grid)   // contact
  const f2 = clone(grid)   // contact (same as f0)

  // Frame 1: stride right — shift bottom body right, lean right
  const f1 = clone(grid)
  const bottomStart = Math.floor(h * 0.55)
  for (let y = bottomStart; y < h; y++) {
    for (let x = w - 1; x > 0; x--) {
      f1[y][x] = f1[y][x - 1]
    }
    f1[y][0] = 'transparent'
  }
  // Add trail pixels on right side for body lean
  for (let y = Math.floor(h * 0.25); y < bottomStart; y++) {
    for (let x = w - 1; x > 0; x--) {
      if (isFilled(f1[y][x - 1]) && !isFilled(f1[y][x])) {
        f1[y][x] = secondary
        break
      }
    }
  }

  // Frame 3: stride left — shift bottom body left
  const f3 = clone(grid)
  for (let y = bottomStart; y < h; y++) {
    for (let x = 0; x < w - 1; x++) {
      f3[y][x] = f3[y][x + 1]
    }
    f3[y][w - 1] = 'transparent'
  }
  // Add trail pixels on left side for body lean
  for (let y = Math.floor(h * 0.25); y < bottomStart; y++) {
    for (let x = 0; x < w - 1; x++) {
      if (isFilled(f3[y][x + 1]) && !isFilled(f3[y][x])) {
        f3[y][x] = secondary
        break
      }
    }
  }

  return [f0, f1, f2, f3]
}

// ═══════════════════════════════════════════════
//  IDLE ANIMATION (4 frames with blink)
// ═══════════════════════════════════════════════

/**
 * Generate idle animation frames.
 * Frame 0: Normal standing
 * Frame 1: Blink (eyes closed)
 * Frame 2: Normal with ear/head twitch
 * Frame 3: Normal
 */
export function generateIdleFrames(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h, palette } = petData

  // Frame 0: base
  const f0 = clone(grid)

  // Frame 1: blink — close eyes
  const f1 = generateBlinkFrame(f0, petData)

  // Frame 2: ear / top twitch
  const f2 = clone(grid)
  const topEnd = Math.ceil(h * 0.3)
  // Shift top-left ear-like pixels right by 1
  for (let y = 0; y < topEnd; y++) {
    // Right side of top area — squeeze in
    for (let x = Math.ceil(w * 0.6); x < w; x++) {
      if (isFilled(f2[y][x]) && x + 1 < w && !isFilled(f2[y][x + 1])) {
        f2[y][x + 1] = f2[y][x]
        f2[y][x] = 'transparent'
        break
      }
    }
    // Left side of top area — squeeze in
    for (let x = Math.floor(w * 0.4); x >= 0; x--) {
      if (isFilled(f2[y][x]) && x - 1 >= 0 && !isFilled(f2[y][x - 1])) {
        f2[y][x - 1] = f2[y][x]
        f2[y][x] = 'transparent'
        break
      }
    }
  }

  // Frame 3: normal
  const f3 = clone(grid)

  return [f0, f1, f2, f3]
}

// ═══════════════════════════════════════════════
//  PLAY ANIMATION (4 frames — happy/bouncy)
// ═══════════════════════════════════════════════

/**
 * Generate play animation frames.
 * Frame 0: Bounce up (shift body up)
 * Frame 1: Squish down (shift body down)
 * Frame 2: Stretch right
 * Frame 3: Stretch left
 */
export function generatePlayFrames(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h, palette } = petData

  const f0 = clone(grid)
  const f1 = clone(grid)
  const f2 = clone(grid)
  const f3 = clone(grid)

  // ── Frame 0: bounce up ──
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w; x++) {
      if (isFilled(f0[y + 1][x]) && !isFilled(f0[y][x])) {
        f0[y][x] = f0[y + 1][x]
        f0[y + 1][x] = 'transparent'
      }
    }
  }

  // ── Frame 1: squish down ──
  for (let y = h - 1; y > 0; y--) {
    for (let x = 0; x < w; x++) {
      if (isFilled(f1[y - 1][x]) && !isFilled(f1[y][x])) {
        f1[y][x] = f1[y - 1][x]
        f1[y - 1][x] = 'transparent'
      }
    }
  }

  // ── Frame 2: stretch right ──
  for (let y = 0; y < h; y++) {
    let shifted = false
    for (let x = w - 1; x > 0; x--) {
      if (isFilled(f2[y][x - 1])) {
        f2[y][x] = f2[y][x - 1]
        shifted = true
      }
    }
    if (shifted) f2[y][0] = 'transparent'
  }

  // ── Frame 3: stretch left ──
  for (let y = 0; y < h; y++) {
    let shifted = false
    for (let x = 0; x < w - 1; x++) {
      if (isFilled(f3[y][x + 1])) {
        f3[y][x] = f3[y][x + 1]
        shifted = true
      }
    }
    if (shifted) f3[y][w - 1] = 'transparent'
  }

  return [f0, f1, f2, f3]
}

// ═══════════════════════════════════════════════
//  BLINK FRAME
// ═══════════════════════════════════════════════

/**
 * Generate a blink frame (eyes closed) from a base frame.
 * Detects eye-colored pixels and replaces them with outline/secondary.
 */
export function generateBlinkFrame(
  baseFrame: PixelGrid,
  petData: PixelPetData,
): PixelGrid {
  const { palette } = petData
  const blinkColor = palette.outline || palette.secondary
  const eyeColor = palette.eye

  const frame = baseFrame.map(row => [...row])

  for (let y = 0; y < frame.length; y++) {
    for (let x = 0; x < frame[y].length; x++) {
      if (frame[y][x] === eyeColor) {
        frame[y][x] = blinkColor
        if (x + 1 < frame[y].length && frame[y][x + 1] === eyeColor) {
          frame[y][x + 1] = blinkColor
        }
      }
    }
  }

  return frame
}

// ═══════════════════════════════════════════════
//  FULL PET ANIMATION
// ═══════════════════════════════════════════════

/**
 * Full animation data for a pixel pet — 3 action sets × 4 frames.
 */
export interface PetAnimation {
  /** 4 walk frames: contact → strideR → contact → strideL */
  walkFrames: PixelGrid[]
  /** 4 idle frames: normal → blink → twitch → normal */
  idleFrames: PixelGrid[]
  /** 4 play frames: bounce → squish → stretchR → stretchL */
  playFrames: PixelGrid[]
  /** Blink frame (same as idleFrames[1]) */
  blinkFrame: PixelGrid
  /** Number of frames per animation (always 4) */
  frameCount: number
}

/**
 * Generate complete animation data for a pet — walk + idle + play.
 * Every pet gets all 3 action animations with 4 frames each.
 */
export function generatePetAnimation(petData: PixelPetData): PetAnimation {
  const walkFrames = generateWalkFrames(petData)
  const idleFrames = generateIdleFrames(petData)
  const playFrames = generatePlayFrames(petData)
  const blinkFrame = idleFrames[1]

  return {
    walkFrames,
    idleFrames,
    playFrames,
    blinkFrame,
    frameCount: 4,
  }
}

// ═══════════════════════════════════════════════
//  RENDERER
// ═══════════════════════════════════════════════

/**
 * Draw a pixel grid onto a canvas context.
 */
export function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  pixelSize: number,
  offsetX: number = 0,
  offsetY: number = 0,
): void {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y]
    for (let x = 0; x < row.length; x++) {
      const color = row[x]
      if (color && color !== 'transparent') {
        ctx.fillStyle = color
        ctx.fillRect(
          offsetX + x * pixelSize,
          offsetY + y * pixelSize,
          pixelSize,
          pixelSize,
        )
      }
    }
  }
}
