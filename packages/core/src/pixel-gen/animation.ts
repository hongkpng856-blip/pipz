import { PixelGrid, PixelPetData } from './types'

/**
 * Generate walk cycle frames from a pet's pixel grid.
 * Returns 4 frames (stand → strideR → stand → strideL) for smooth walk animation.
 * Uses pixel manipulation on the existing grid — no AI gen needed for frame data.
 */
export function generateWalkFrames(
  petData: PixelPetData,
): PixelGrid[] {
  const { grid, width, height, palette } = petData
  const h = height
  const w = width
  const outline = palette.outline
  const primary = palette.primary

  // Clone helpers
  const clone = (g: PixelGrid): PixelGrid => g.map(row => [...row])
  const isFilled = (c: string) => c && c !== 'transparent'

  // Frame 0: base (no shift)
  const f0 = clone(grid)

  // Frame 1: stride right — shift bottom rows right, add bob down
  const f1 = clone(grid)
  const strideR = (bottomRows: number) => {
    for (let y = h - bottomRows; y < h; y++) {
      // Shift right by 1
      for (let x = w - 1; x > 0; x--) {
        f1[y][x] = f1[y][x - 1]
      }
      f1[y][0] = 'transparent'
    }
    // Add small rightward body lean
    for (let y = Math.floor(h * 0.3); y < h - bottomRows; y++) {
      if (y < h) {
        for (let x = w - 1; x > 0; x--) {
          if (isFilled(f1[y][x - 1]) && !isFilled(f1[y][x])) {
            f1[y][x] = palette.secondary // trail pixel
            break
          }
        }
      }
    }
  }
  strideR(3)

  // Frame 2: same as base (mid-stride)
  const f2 = clone(grid)

  // Frame 3: stride left — shift bottom rows left, add bob down
  const f3 = clone(grid)
  const strideL = (bottomRows: number) => {
    for (let y = h - bottomRows; y < h; y++) {
      for (let x = 0; x < w - 1; x++) {
        f3[y][x] = f3[y][x + 1]
      }
      f3[y][w - 1] = 'transparent'
    }
    // Leftward body lean
    for (let y = Math.floor(h * 0.3); y < h - bottomRows; y++) {
      if (y < h) {
        for (let x = 0; x < w - 1; x++) {
          if (isFilled(f3[y][x + 1]) && !isFilled(f3[y][x])) {
            f3[y][x] = palette.secondary
            break
          }
        }
      }
    }
  }
  strideL(3)

  return [f0, f1, f2, f3]
}

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

  // Find eye pixels and close them
  for (let y = 0; y < frame.length; y++) {
    for (let x = 0; x < frame[y].length; x++) {
      if (frame[y][x] === eyeColor) {
        // Close eye: replace with horizontal line of secondary/outline
        frame[y][x] = blinkColor
        // Also cover the neighbor (make a 2px-wide closed eye line)
        if (x + 1 < frame[y].length && frame[y][x + 1] === eyeColor) {
          frame[y][x + 1] = blinkColor
        }
      }
    }
  }

  return frame
}

/**
 * Full animation data for a pixel pet.
 */
export interface PetAnimation {
  /** 4 walk frames */
  walkFrames: PixelGrid[]
  /** Blink frame */
  blinkFrame: PixelGrid
  /** Number of walk frames (always 4) */
  frameCount: number
}

/**
 * Generate complete animation data for a pet.
 */
export function generatePetAnimation(petData: PixelPetData): PetAnimation {
  const walkFrames = generateWalkFrames(petData)
  const blinkFrame = generateBlinkFrame(walkFrames[0], petData)

  return {
    walkFrames,
    blinkFrame,
    frameCount: 4,
  }
}

/**
 * Palette index renderer — convert a pixel grid (RGB strings) to draw commands.
 * Used by canvas renderers for frame-by-frame animation.
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
