import { PixelGrid, PixelPetData } from './types'
import {
  PIXELAB_PALETTE, PIXELAB_CAT_WALK, PIXELAB_CAT_IDLE, PIXELAB_CAT_PLAY,
  type PixellabGrid,
} from './pixellab-cat-data'

// ── Helpers ──
const clone = (g: PixelGrid): PixelGrid => g.map(row => [...row])
const isFilled = (c: string) => c && c !== 'transparent'

/** Convert a PixellabGrid (digit-indexed strings) to PixelGrid (color strings) */
function pixellabToGrid(pg: PixellabGrid): PixelGrid {
  return pg.map(row =>
    row.split('').map(ch => {
      const idx = parseInt(ch, 10)
      // Index 6 (#c2c3c7) = PixelLab background, treat as transparent
      if (idx === 6) return 'transparent'
      return PIXELAB_PALETTE[idx] || '#c2c3c7'
    })
  )
}

// ═══════════════════════════════════════════════
//  CAT (species 0) — PixelLab-generated frames
// ═══════════════════════════════════════════════

function catWalk(_petData: PixelPetData): PixelGrid[] {
  return PIXELAB_CAT_WALK.map(pixellabToGrid)
}

function catIdle(_petData: PixelPetData): PixelGrid[] {
  return PIXELAB_CAT_IDLE.map(pixellabToGrid)
}

function catPlay(_petData: PixelPetData): PixelGrid[] {
  return PIXELAB_CAT_PLAY.map(pixellabToGrid)
}

// ═══════════════════════════════════════════════
//  GENERIC SPECIES ANIMATION STYLES (fallback)
// ═══════════════════════════════════════════════

type AnimStyle = 'quadruped' | 'biped' | 'flyer' | 'floaty' | 'swimmer' | 'slither' | 'plant'

const SPECIES_STYLE: AnimStyle[] = [
  'quadruped','quadruped','biped','quadruped','quadruped',  // 0-4
  'biped','biped','quadruped','biped','biped',              // 5-9
  'floaty','floaty','quadruped','flyer','quadruped',        // 10-14
  'swimmer','flyer','slither','biped','quadruped',          // 15-19
  'quadruped','quadruped','quadruped','quadruped','quadruped', // 20-24
  'swimmer','floaty','flyer','flyer','biped',               // 25-29
  'flyer','flyer','plant','plant','plant',                  // 30-34
  'plant','floaty','quadruped','plant','quadruped',         // 35-39
  'biped','biped','floaty','biped','flyer',                 // 40-44
  'quadruped','swimmer','biped','floaty','quadruped',       // 45-49
]

function getStyle(speciesId: number): AnimStyle {
  return SPECIES_STYLE[speciesId] || 'quadruped'
}

/** Generic quadruped: 4-leg stride */
function genWalkQuadruped(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h, palette } = petData
  const s = palette.secondary
  const f0 = clone(grid), f2 = clone(grid)
  const f1 = clone(grid), f3 = clone(grid)
  const bs = Math.floor(h * 0.55)
  for (let y = bs; y < h; y++) { for (let x = w-1; x > 0; x--) { f1[y][x] = f1[y][x-1] }; f1[y][0] = 'transparent' }
  for (let y = Math.floor(h*0.25); y < bs; y++) { for (let x = w-1; x > 0; x--) { if (isFilled(f1[y][x-1]) && !isFilled(f1[y][x])) { f1[y][x] = s; break } } }
  for (let y = bs; y < h; y++) { for (let x = 0; x < w-1; x++) { f3[y][x] = f3[y][x+1] }; f3[y][w-1] = 'transparent' }
  for (let y = Math.floor(h*0.25); y < bs; y++) { for (let x = 0; x < w-1; x++) { if (isFilled(f3[y][x+1]) && !isFilled(f3[y][x])) { f3[y][x] = s; break } } }
  return [f0, f1, f2, f3]
}

/** Generic biped: 2-leg stride */
function genWalkBiped(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h, palette } = petData
  const s = palette.secondary
  const f0 = clone(grid), f2 = clone(grid)
  const f1 = clone(grid), f3 = clone(grid)
  const bs = Math.floor(h * 0.6)
  for (let y = bs; y < h; y++) { for (let x = w-1; x > 0; x--) { f1[y][x] = f1[y][x-1] }; f1[y][0] = 'transparent' }
  for (let y = Math.floor(h*0.15); y < bs; y++) { for (let x = w-1; x > 0; x--) { if (isFilled(f1[y][x-1]) && !isFilled(f1[y][x])) { f1[y][x] = s; break } } }
  for (let y = bs; y < h; y++) { for (let x = 0; x < w-1; x++) { f3[y][x] = f3[y][x+1] }; f3[y][w-1] = 'transparent' }
  for (let y = Math.floor(h*0.15); y < bs; y++) { for (let x = 0; x < w-1; x++) { if (isFilled(f3[y][x+1]) && !isFilled(f3[y][x])) { f3[y][x] = s; break } } }
  return [f0, f1, f2, f3]
}

/** Generic flyer: wing flap */
function genWalkFlyer(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h } = petData
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)
  const y0 = Math.floor(h*0.2), y1 = Math.floor(h*0.55)
  for (let y = y0; y < y1; y++) {
    for (let x = w-1; x > Math.floor(w*0.5); x--) { f1[y][x] = f1[y][x-1] }
    for (let x = 0; x < Math.floor(w*0.5)-1; x++) { f3[y][x] = f3[y][x+1] }
  }
  return [f0, f1, f2, f3]
}

/** Generic floaty: squish */
function genWalkFloaty(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h } = petData
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)
  const mid = Math.floor(h/2)
  for (let x = 0; x < w; x++) {
    if (isFilled(f1[0][x]) && !isFilled(f1[1][x])) { f1[1][x] = f1[0][x]; f1[0][x] = 'transparent' }
    if (isFilled(f1[h-1][x]) && !isFilled(f1[h-2][x])) { f1[h-2][x] = f1[h-1][x]; f1[h-1][x] = 'transparent' }
  }
  return [f0, f1, f2, f3]
}

/** Generic swimmer: tail wave */
function genWalkSwimmer(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h } = petData
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)
  const bs = Math.floor(h*0.5)
  for (let y = bs; y < h; y++) { for (let x = w-1; x > 0; x--) { f1[y][x] = f1[y][x-1] }; f1[y][0] = 'transparent' }
  for (let y = bs; y < h; y++) { for (let x = 0; x < w-1; x++) { f3[y][x] = f3[y][x+1] }; f3[y][w-1] = 'transparent' }
  return [f0, f1, f2, f3]
}

/** Generic slither: wave */
function genWalkSlither(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h } = petData
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)
  for (let y = 1; y < h; y += 2) { for (let x = w-1; x > 0; x--) { f1[y][x] = f1[y][x-1] }; f1[y][0] = 'transparent' }
  for (let y = 0; y < h; y += 2) { for (let x = 0; x < w-1; x++) { f3[y][x] = f3[y][x+1] }; f3[y][w-1] = 'transparent' }
  return [f0, f1, f2, f3]
}

/** Generic plant: sway top */
function genWalkPlant(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h } = petData
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)
  const top = Math.ceil(h * 0.4)
  for (let y = 0; y < top; y++) { for (let x = w-1; x > 0; x--) { f1[y][x] = f1[y][x-1] }; f1[y][0] = 'transparent' }
  for (let y = 0; y < top; y++) { for (let x = 0; x < w-1; x++) { f3[y][x] = f3[y][x+1] }; f3[y][w-1] = 'transparent' }
  return [f0, f1, f2, f3]
}

// ═══════════════════════════════════════════════
//  GENERIC IDLE (ear twitch for most species)
// ═══════════════════════════════════════════════

function genIdleTwitch(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h } = petData
  const f0 = clone(grid)
  const f1 = generateBlinkFrame(f0, petData)
  const f2 = clone(grid)
  const f3 = clone(grid)
  const top = Math.ceil(h * 0.3)
  for (let y = 0; y < top; y++) {
    for (let x = Math.ceil(w*0.6); x < w; x++) { if (isFilled(f2[y][x]) && x+1 < w && !isFilled(f2[y][x+1])) { f2[y][x+1] = f2[y][x]; f2[y][x] = 'transparent'; break } }
    for (let x = Math.floor(w*0.4); x >= 0; x--) { if (isFilled(f2[y][x]) && x-1 >= 0 && !isFilled(f2[y][x-1])) { f2[y][x-1] = f2[y][x]; f2[y][x] = 'transparent'; break } }
  }
  return [f0, f1, f2, f3]
}

function genIdleBlinkOnly(petData: PixelPetData): PixelGrid[] {
  const { grid } = petData
  const f0 = clone(grid)
  const f1 = generateBlinkFrame(f0, petData)
  return [f0, f1, f0, f0]
}

// ═══════════════════════════════════════════════
//  GENERIC PLAY (jump for most species)
// ═══════════════════════════════════════════════

function genPlayJump(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h } = petData
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)
  for (let y = 0; y < h-1; y++) { for (let x = 0; x < w; x++) { if (isFilled(f0[y+1][x]) && !isFilled(f0[y][x])) { f0[y][x] = f0[y+1][x]; f0[y+1][x] = 'transparent' } } }
  for (let y = h-1; y > 0; y--) { for (let x = 0; x < w; x++) { if (isFilled(f1[y-1][x]) && !isFilled(f1[y][x])) { f1[y][x] = f1[y-1][x]; f1[y-1][x] = 'transparent' } } }
  for (let y = 0; y < h; y++) { let s = false; for (let x = w-1; x > 0; x--) { if (isFilled(f2[y][x-1])) { f2[y][x] = f2[y][x-1]; s = true } }; if (s) f2[y][0] = 'transparent' }
  for (let y = 0; y < h; y++) { let s = false; for (let x = 0; x < w-1; x++) { if (isFilled(f3[y][x+1])) { f3[y][x] = f3[y][x+1]; s = true } }; if (s) f3[y][w-1] = 'transparent' }
  return [f0, f1, f2, f3]
}

function genPlayFlap(petData: PixelPetData): PixelGrid[] {
  const { grid, width: w, height: h } = petData
  const f0 = clone(grid), f1 = clone(grid), f2 = clone(grid), f3 = clone(grid)
  for (let y = 0; y < h-1; y++) { for (let x = 0; x < w; x++) { if (isFilled(f0[y+1][x]) && !isFilled(f0[y][x])) { f0[y][x] = f0[y+1][x]; f0[y+1][x] = 'transparent' } } }
  // Wing spread
  const y0 = Math.floor(h*0.2), y1 = Math.floor(h*0.55)
  for (let y = y0; y < y1; y++) {
    for (let x = w-1; x > 0; x--) { f2[y][x] = f2[y][x-1] }
    for (let x = 0; x < w-1; x++) { f3[y][x] = f3[y][x+1] }
  }
  return [f0, f1, f2, f3]
}

// ═══════════════════════════════════════════════
//  BLINK FRAME
// ═══════════════════════════════════════════════

export function generateBlinkFrame(baseFrame: PixelGrid, petData: PixelPetData): PixelGrid {
  const { palette } = petData
  const bc = palette.outline || palette.secondary
  const ec = palette.eye
  const f = baseFrame.map(row => [...row])
  for (let y = 0; y < f.length; y++) {
    for (let x = 0; x < f[y].length; x++) {
      if (f[y][x] === ec) { f[y][x] = bc; if (x+1 < f[y].length && f[y][x+1] === ec) f[y][x+1] = bc }
    }
  }
  return f
}

// ═══════════════════════════════════════════════
//  MAIN ENTRY POINTS
// ═══════════════════════════════════════════════

export function generateWalkFrames(petData: PixelPetData): PixelGrid[] {
  // Cat (species 0) gets dedicated walk
  if (petData.speciesId === 0) return catWalk(petData)

  const style = getStyle(petData.speciesId)
  switch (style) {
    case 'quadruped': return genWalkQuadruped(petData)
    case 'biped':     return genWalkBiped(petData)
    case 'flyer':     return genWalkFlyer(petData)
    case 'floaty':    return genWalkFloaty(petData)
    case 'swimmer':   return genWalkSwimmer(petData)
    case 'slither':   return genWalkSlither(petData)
    case 'plant':     return genWalkPlant(petData)
  }
  return genWalkQuadruped(petData)
}

export function generateIdleFrames(petData: PixelPetData): PixelGrid[] {
  // Cat (species 0) gets dedicated idle
  if (petData.speciesId === 0) return catIdle(petData)

  const style = getStyle(petData.speciesId)
  switch (style) {
    case 'floaty':
    case 'plant':
      return genIdleBlinkOnly(petData)
    default:
      return genIdleTwitch(petData)
  }
}

export function generatePlayFrames(petData: PixelPetData): PixelGrid[] {
  // Cat (species 0) gets dedicated play
  if (petData.speciesId === 0) return catPlay(petData)

  const style = getStyle(petData.speciesId)
  switch (style) {
    case 'flyer':     return genPlayFlap(petData)
    case 'floaty':    return genPlayJump(petData)
    default:          return genPlayJump(petData)
  }
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
