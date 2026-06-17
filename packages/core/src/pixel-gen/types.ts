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
}
