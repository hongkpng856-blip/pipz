// Pixel Pet Generator Types

export interface PixelPetConfig {
  seed: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  evolutionStage: number
}

export interface PixelPalette {
  primary: string
  secondary: string
  accent: string
  eye: string
  outline: string
  glow: string | null
}

// 16x16 pixel grid
export type PixelGrid = string[][]

export interface PixelPetData {
  grid: PixelGrid
  width: number
  height: number
  palette: PixelPalette
  speciesId: number
  speciesName: string
}

// ── Per-pet animation personality (derived from seed) ──

export interface PetAnimationTraits {
  /** 1-10: walk cycle speed */
  walkSpeed: number
  /** 1-10: vertical bounce while walking */
  walkBounce: number
  /** 1-10: side-to-side waddle */
  walkWaddle: number
  /** idle fidget style */
  idleStyle: 'still' | 'sway' | 'bob' | 'look'
  /** ms between blinks (2000-8000) */
  blinkInterval: number
  /** blink duration (80-200ms) */
  blinkDuration: number
  /** sleep posture */
  sleepStyle: 'curl' | 'sprawl' | 'stand'
  /** 1-10: overall energy (affects behavior frequency) */
  energy: number
  /** reaction on click */
  reactionStyle: 'bounce' | 'spin' | 'jump' | 'wiggle'
  /** sparkle particle chance per frame */
  sparkleChance: number
  /** human-readable tags */
  personalityTags: string[]
}
