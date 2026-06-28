import { PixelGrid, PixelPetData } from './types'

// ── Helpers ──
const clone = (g: PixelGrid): PixelGrid => g.map(row => [...row])
const isFilled = (c: string) => c && c !== 'transparent'

// ── Species animation styles ──
// Each species index maps to an animation style
type AnimStyle = 'quadruped' | 'biped' | 'flyer' | 'floaty' | 'swimmer' | 'slither' | 'plant' | 'crawler'

const SPECIES_STYLE: AnimStyle[] = [
  // 0-9
  'quadruped','quadruped','biped','quadruped','quadruped',
  'biped','biped','quadruped','biped','biped',
  // 10-19
  'floaty','floaty','quadruped','flyer','quadruped',
  'swimmer','flyer','slither','biped','quadruped',
  // 20-29
  'quadruped','quadruped','quadruped','quadruped','quadruped',
  'swimmer','floaty','flyer','flyer','biped',
  // 30-39
  'flyer','flyer','plant','plant','plant',
  'plant','floaty','crawler','crawler','crawler',
  // 40-49
  'biped','biped','floaty','biped','flyer',
  'quadruped','swimmer','biped','floaty','quadruped',
]

// Crawler is similar to quadruped but side-to-side
function getStyle(speciesId: number): AnimStyle {
  return SPECIES_STYLE[speciesId] || 'quadruped'
}

// ═══════════════════════════════════════════════
//  WALK ANIMATION — species-specific
// ═══════════════════════════════════════════════

export function generateWalkFrames(petData: PixelPetData): PixelGrid[] {
  const style = getStyle(petData.speciesId)

  switch (style) {
    case 'quadruped': return walkQuadruped(petData)
    case 'biped':     return walkBiped(petData)
    case 'flyer':     return walkFlyer(petData)
    case 'floaty':    return walkFloaty(petData)
    case 'swimmer':   return walkSwimmer(petData)
    case 'slither':   return walkSlither(petData)
    case 'plant':     return walkPlant(petData)
    case 'crawler':   return walkQuadruped(petData)
  }
  return walkQuadruped(petData)
}

/** Quadruped: 4-leg alternating stride */
function walkQuadruped(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h, palette } = petData
  const s = palette.secondary
  const f0 = clone(grid), f2 = clone(grid)
  const f1 = clone(grid), f3 = clone(grid)
  const bs = Math.floor(h * 0.55)

  // Stride R
  for (let y = bs; y < h; y++) { for (let x = w-1; x > 0; x--) { f1[y][x] = f1[y][x-1] }; f1[y][0] = 'transparent' }
  for (let y = Math.floor(h*0.25); y < bs; y++) { for (let x = w-1; x > 0; x--) { if (isFilled(f1[y][x-1]) && !isFilled(f1[y][x])) { f1[y][x] = s; break } } }
  // Stride L
  for (let y = bs; y < h; y++) { for (let x = 0; x < w-1; x++) { f3[y][x] = f3[y][x+1] }; f3[y][w-1] = 'transparent' }
  for (let y = Math.floor(h*0.25); y < bs; y++) { for (let x = 0; x < w-1; x++) { if (isFilled(f3[y][x+1]) && !isFilled(f3[y][x])) { f3[y][x] = s; break } } }
  return [f0, f1, f2, f3]
}

/** Biped: 2-leg stride, body sways side to side */
function walkBiped(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h, palette } = petData
  const s = palette.secondary
  const f0 = clone(grid), f2 = clone(grid)
  const f1 = clone(grid), f3 = clone(grid)
  const bs = Math.floor(h * 0.6)

  // Stride R (single leg shift)
  for (let y = bs; y < h; y++) { for (let x = w-1; x > 0; x--) { f1[y][x] = f1[y][x-1] }; f1[y][0] = 'transparent' }
  // Body whole shift R
  for (let y = Math.floor(h*0.15); y < bs; y++) { for (let x = w-1; x > 0; x--) { if (isFilled(f1[y][x-1]) && !isFilled(f1[y][x])) { f1[y][x] = s; break } } }
  // Stride L
  for (let y = bs; y < h; y++) { for (let x = 0; x < w-1; x++) { f3[y][x] = f3[y][x+1] }; f3[y][w-1] = 'transparent' }
  for (let y = Math.floor(h*0.15); y < bs; y++) { for (let x = 0; x < w-1; x++) { if (isFilled(f3[y][x+1]) && !isFilled(f3[y][x])) { f3[y][x] = s; break } } }
  return [f0, f1, f2, f3]
}

/** Flyer: wing flap — alternate sides expand/contract */
function walkFlyer(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h, palette } = petData
  const a = palette.accent, p = palette.primary
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)

  // Spread wings (shift side pixels out)
  for (let y = Math.floor(h*0.2); y < Math.floor(h*0.6); y++) {
    // Right wing out
    for (let x = w-1; x > Math.floor(w*0.5); x--) { f1[y][x] = f1[y][x-1] }
    // Left wing out
    for (let x = 0; x < Math.floor(w*0.5)-1; x++) { f3[y][x] = f3[y][x+1] }
  }
  return [f0, f1, f2, f3]
}

/** Floaty: squish and stretch bounce */
function walkFloaty(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h } = petData
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)

  // Squish (shift top down, bottom up)
  for (let x = 0; x < w; x++) {
    if (isFilled(f1[0][x]) && !isFilled(f1[1][x])) { f1[1][x] = f1[0][x]; f1[0][x] = 'transparent' }
    if (isFilled(f1[h-1][x]) && !isFilled(f1[h-2][x])) { f1[h-2][x] = f1[h-1][x]; f1[h-1][x] = 'transparent' }
  }
  // Stretch (reverse)
  for (let x = 0; x < w; x++) {
    if (isFilled(f3[1][x]) && !isFilled(f3[0][x])) { f3[0][x] = f3[1][x]; f3[1][x] = 'transparent' }
    if (isFilled(f3[h-2][x]) && !isFilled(f3[h-1][x])) { f3[h-1][x] = f3[h-2][x]; f3[h-2][x] = 'transparent' }
  }
  return [f0, f1, f2, f3]
}

/** Swimmer: tail/fin wave */
function walkSwimmer(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h, palette } = petData
  const s = palette.secondary
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)
  const bs = Math.floor(h*0.5)

  // Tail/fin wave right
  for (let y = bs; y < h; y++) { for (let x = w-1; x > 0; x--) { f1[y][x] = f1[y][x-1] }; f1[y][0] = 'transparent' }
  // Tail/fin wave left
  for (let y = bs; y < h; y++) { for (let x = 0; x < w-1; x++) { f3[y][x] = f3[y][x+1] }; f3[y][w-1] = 'transparent' }
  return [f0, f1, f2, f3]
}

/** Slither: side-to-side body wave */
function walkSlither(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h, palette } = petData
  const s = palette.secondary
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)

  // Wave right
  for (let y = 1; y < h; y += 2) {
    for (let x = w-1; x > 0; x--) { f1[y][x] = f1[y][x-1] }; f1[y][0] = 'transparent'
  }
  // Wave left
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w-1; x++) { f3[y][x] = f3[y][x+1] }; f3[y][w-1] = 'transparent'
  }
  return [f0, f1, f2, f3]
}

/** Plant: gentle sway */
function walkPlant(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h, palette } = petData
  const s = palette.secondary
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)
  const top = Math.ceil(h * 0.4)

  // Sway right (top section only)
  for (let y = 0; y < top; y++) { for (let x = w-1; x > 0; x--) { f1[y][x] = f1[y][x-1] }; f1[y][0] = 'transparent' }
  // Sway left
  for (let y = 0; y < top; y++) { for (let x = 0; x < w-1; x++) { f3[y][x] = f3[y][x+1] }; f3[y][w-1] = 'transparent' }
  return [f0, f1, f2, f3]
}

// ═══════════════════════════════════════════════
//  IDLE ANIMATION — species-specific
// ═══════════════════════════════════════════════

export function generateIdleFrames(petData: PixelPetData): PixelGrid[] {
  const { grid } = petData
  const f0 = clone(grid)
  const f1 = generateBlinkFrame(f0, petData)
  const f2 = clone(grid)
  const f3 = clone(grid)

  // Species-specific idle variation
  const style = getStyle(petData.speciesId)
  switch (style) {
    case 'quadruped':
    case 'biped': {
      // Ear/head twitch on frame 2
      const top = Math.ceil(16 * 0.3)
      for (let y = 0; y < top; y++) {
        for (let x = Math.ceil(16*0.6); x < 16; x++) {
          if (isFilled(f2[y][x]) && x+1 < 16 && !isFilled(f2[y][x+1])) { f2[y][x+1] = f2[y][x]; f2[y][x] = 'transparent'; break }
        }
        for (let x = Math.floor(16*0.4); x >= 0; x--) {
          if (isFilled(f2[y][x]) && x-1 >= 0 && !isFilled(f2[y][x-1])) { f2[y][x-1] = f2[y][x]; f2[y][x] = 'transparent'; break }
        }
      }
      break
    }
    case 'flyer': {
      // Wing twitch (slight side expansion)
      for (let y = Math.floor(16*0.2); y < Math.floor(16*0.5); y++) {
        for (let x = Math.ceil(16*0.7); x < 16; x++) {
          if (isFilled(f2[y][x]) && x+1 < 16 && !isFilled(f2[y][x+1])) { f2[y][x+1] = f2[y][x]; f2[y][x] = 'transparent'; break }
        }
      }
      break
    }
    case 'floaty': {
      // Pulse: slight squish on frame 2
      for (let x = 0; x < 16; x++) {
        if (isFilled(f2[0][x]) && isFilled(f2[1][x])) { f2[1][x] = f2[0][x]; f2[0][x] = 'transparent'; break }
      }
      break
    }
    case 'swimmer': {
      // Fin flick
      for (let y = Math.floor(16*0.6); y < 16; y++) { for (let x = 15; x > 0; x--) { f2[y][x] = f2[y][x-1] }; f2[y][0] = 'transparent'; break }
      break
    }
    case 'slither': {
      // Tongue flick: add accent pixel near head
      break
    }
    case 'plant': {
      // Slight sway
      for (let y = 0; y < Math.ceil(16*0.3); y++) { for (let x = 15; x > 0; x--) { f2[y][x] = f2[y][x-1] }; f2[y][0] = 'transparent'; break }
      break
    }
    case 'crawler': {
      // Antenna twitch
      for (let y = 0; y < Math.ceil(16*0.25); y++) { for (let x = 15; x > 0; x--) { f2[y][x] = f2[y][x-1] }; f2[y][0] = 'transparent'; break }
      break
    }
  }
  return [f0, f1, f2, f3]
}

// ═══════════════════════════════════════════════
//  PLAY ANIMATION — species-specific
// ═══════════════════════════════════════════════

export function generatePlayFrames(petData: PixelPetData): PixelGrid[] {
  const style = getStyle(petData.speciesId)
  switch (style) {
    case 'quadruped': return playJump(petData)
    case 'biped':     return playJump(petData)
    case 'flyer':     return playFly(petData)
    case 'floaty':    return playBounce(petData)
    case 'swimmer':   return playSplash(petData)
    case 'slither':   return playCoil(petData)
    case 'plant':     return playGrow(petData)
    case 'crawler':   return playJump(petData)
  }
  return playJump(petData)
}

/** Jump: bounce up + squish (quadruped/biped) */
function playJump(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h } = petData
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)
  // Bounce up
  for (let y = 0; y < h-1; y++) { for (let x = 0; x < w; x++) { if (isFilled(f0[y+1][x]) && !isFilled(f0[y][x])) { f0[y][x] = f0[y+1][x]; f0[y+1][x] = 'transparent' } } }
  // Squish
  for (let y = h-1; y > 0; y--) { for (let x = 0; x < w; x++) { if (isFilled(f1[y-1][x]) && !isFilled(f1[y][x])) { f1[y][x] = f1[y-1][x]; f1[y-1][x] = 'transparent' } } }
  // Stretch right
  for (let y = 0; y < h; y++) { let s = false; for (let x = w-1; x > 0; x--) { if (isFilled(f2[y][x-1])) { f2[y][x] = f2[y][x-1]; s = true } }; if (s) f2[y][0] = 'transparent' }
  // Stretch left
  for (let y = 0; y < h; y++) { let s = false; for (let x = 0; x < w-1; x++) { if (isFilled(f3[y][x+1])) { f3[y][x] = f3[y][x+1]; s = true } }; if (s) f3[y][w-1] = 'transparent' }
  return [f0, f1, f2, f3]
}

/** Fly: spiral/soar up, side dip */
function playFly(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h } = petData
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)
  // Soar up
  for (let y = 0; y < h-1; y++) { for (let x = 0; x < w; x++) { if (isFilled(f0[y+1][x]) && !isFilled(f0[y][x])) { f0[y][x] = f0[y+1][x]; f0[y+1][x] = 'transparent' } } }
  // Dip right
  for (let y = 0; y < h; y++) { for (let x = w-1; x > 0; x--) { f1[y][x] = f1[y][x-1] }; f1[y][0] = 'transparent' }
  // Dip left
  for (let y = 0; y < h; y++) { for (let x = 0; x < w-1; x++) { f3[y][x] = f3[y][x+1] }; f3[y][w-1] = 'transparent' }
  return [f0, f1, f2, f3]
}

/** Bounce: squish-stretch cycle like slime */
function playBounce(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h } = petData
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)
  // Stretch tall
  for (let y = 0; y < h-1; y++) { for (let x = 0; x < w; x++) { if (isFilled(f0[y+1][x]) && !isFilled(f0[y][x])) { f0[y][x] = f0[y+1][x]; f0[y+1][x] = 'transparent' } } }
  // Squish wide
  for (let y = 0; y < h; y++) { let s = false; for (let x = w-1; x > 0; x--) { if (isFilled(f1[y][x-1])) { f1[y][x] = f1[y][x-1]; s = true } }; if (s) f1[y][0] = 'transparent' }
  for (let y = 0; y < h; y++) { let s = false; for (let x = 0; x < w-1; x++) { if (isFilled(f1[y][x+1])) { f1[y][x] = f1[y][x+1]; s = true } }; if (s) f1[y][w-1] = 'transparent' }
  return playJump(petData) // fallback
}

/** Splash: wriggle/swim playfully */
function playSplash(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h } = petData
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)
  // Tail wag right
  for (let y = Math.floor(h*0.5); y < h; y++) { for (let x = w-1; x > 0; x--) { f0[y][x] = f0[y][x-1] }; f0[y][0] = 'transparent' }
  // Tail wag left
  for (let y = Math.floor(h*0.5); y < h; y++) { for (let x = 0; x < w-1; x++) { f2[y][x] = f2[y][x+1] }; f2[y][w-1] = 'transparent' }
  return [f0, f1, f2, f3]
}

/** Coil: snake coil/uncoil */
function playCoil(petData: PixelPetData): PixelGrid[] {
  return walkSlither(petData) // faster slither
}

/** Grow: sway + stretch for plants */
function playGrow(petData: PixelPetData): PixelGrid[] {
  return playJump(petData)
}

// ═══════════════════════════════════════════════
//  BLINK FRAME (shared)
// ═══════════════════════════════════════════════

export function generateBlinkFrame(baseFrame: PixelGrid, petData: PixelPetData): PixelGrid {
  const { palette } = petData
  const blinkColor = palette.outline || palette.secondary
  const eyeColor = palette.eye
  const frame = baseFrame.map(row => [...row])
  for (let y = 0; y < frame.length; y++) {
    for (let x = 0; x < frame[y].length; x++) {
      if (frame[y][x] === eyeColor) { frame[y][x] = blinkColor; if (x+1 < frame[y].length && frame[y][x+1] === eyeColor) frame[y][x+1] = blinkColor }
    }
  }
  return frame
}

// ═══════════════════════════════════════════════
//  FULL PET ANIMATION
// ═══════════════════════════════════════════════

export interface PetAnimation {
  walkFrames: PixelGrid[]
  idleFrames: PixelGrid[]
  playFrames: PixelGrid[]
  blinkFrame: PixelGrid
  frameCount: number
}

export function generatePetAnimation(petData: PixelPetData): PetAnimation {
  const walkFrames = generateWalkFrames(petData)
  const idleFrames = generateIdleFrames(petData)
  const playFrames = generatePlayFrames(petData)
  const blinkFrame = idleFrames[1]
  return { walkFrames, idleFrames, playFrames, blinkFrame, frameCount: 4 }
}

// ═══════════════════════════════════════════════
//  RENDERER
// ═══════════════════════════════════════════════

export function drawPixelGrid(ctx: CanvasRenderingContext2D, grid: PixelGrid, pixelSize: number, offsetX = 0, offsetY = 0): void {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x]
      if (c && c !== 'transparent') { ctx.fillStyle = c; ctx.fillRect(offsetX + x*pixelSize, offsetY + y*pixelSize, pixelSize, pixelSize) }
    }
  }
}
