'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { generatePixelPet, PixelPetData, PixelGrid, getSpeciesIndex, generatePetAnimation, drawPixelGrid } from '@pipz/core'

const SPRITE_VERSION = 'v7' // Bump when sprite assets change (forces cache refresh)

interface Props {
  seed: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  evolutionStage: number
  animation?: 'idle' | 'walk' | 'happy' | 'jump'
  size?: number
  style?: React.CSSProperties
  onClick?: () => void
  forceGrid?: boolean  // Skip PNG sprite, use pixel grid animation
  noAnim?: boolean     // No animation, static frame only
}

// PixelLab pets (cat seed 175, shiba seeds 23 and 176)
const IS_PIXELLAB = (seed: number) => seed === 175 || seed === 23 || seed === 176

// Rarity tint overlays (PICO-8 inspired accent colors)
const RARITY_TINTS: Record<string, string> = {
  common: 'rgba(255,255,255,0)',
  uncommon: 'rgba(34,197,94,0.08)',
  rare: 'rgba(59,130,246,0.10)',
  epic: 'rgba(139,92,246,0.12)',
  legendary: 'rgba(245,158,11,0.15)',
}
const RARITY_GLOWS: Record<string, string> = {
  common: '',
  uncommon: '#22c55e44',
  rare: '#3b82f666',
  epic: '#8b5cf688',
  legendary: '#f59e0baa',
}

/** Compute bounding box of a pixel grid (non-transparent pixels) */
function computeBoundingBox(grid: PixelGrid): { minRow: number; maxRow: number; minCol: number; maxCol: number } | null {
  let minRow = grid.length, maxRow = 0, minCol = grid[0]?.length ?? 0, maxCol = 0
  let found = false
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] !== 'transparent') {
        minRow = Math.min(minRow, y); maxRow = Math.max(maxRow, y)
        minCol = Math.min(minCol, x); maxCol = Math.max(maxCol, x)
        found = true
      }
    }
  }
  return found ? { minRow, maxRow, minCol, maxCol } : null
}

// ── Global sprite cache ──
const spriteCache = new Map<number, HTMLCanvasElement | null>()
const pendingLoads = new Map<number, Promise<HTMLCanvasElement | null>>()

function loadSprite(speciesIdx: number, customSeed?: number): Promise<HTMLCanvasElement | null> {
  // Species 0 uses PixelLab grid animation, skip PNG sprite
  if (speciesIdx === 0) return Promise.resolve(null)
  // Shiba (seed 23) uses custom sprite
  if (customSeed === 23) {
    const key = 999 // Unique cache key for shiba
    if (spriteCache.has(key)) return Promise.resolve(spriteCache.get(key)!)
    if (pendingLoads.has(key)) return pendingLoads.get(key)!

    const promise = new Promise<HTMLCanvasElement | null>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = `/pixel-gen/sprites/shiba.png?v=${SPRITE_VERSION}`
      img.onload = () => {
        const oc = document.createElement('canvas')
        oc.width = img.width
        oc.height = img.height
        const ox = oc.getContext('2d')!
        ox.drawImage(img, 0, 0)
        spriteCache.set(key, oc)
        resolve(oc)
      }
      img.onerror = () => { spriteCache.set(key, null); resolve(null) }
    })
    pendingLoads.set(key, promise)
    return promise
  }
  if (spriteCache.has(speciesIdx)) return Promise.resolve(spriteCache.get(speciesIdx)!)
  if (pendingLoads.has(speciesIdx)) return pendingLoads.get(speciesIdx)!

  const promise = new Promise<HTMLCanvasElement | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const oc = document.createElement('canvas')
      oc.width = img.width
      oc.height = img.height
      const ox = oc.getContext('2d')!
      ox.drawImage(img, 0, 0)
      spriteCache.set(speciesIdx, oc)
      resolve(oc)
    }
    img.onerror = () => {
      spriteCache.set(speciesIdx, null)
      resolve(null)
    }
    img.src = `/pixel-gen/sprites/${speciesIdx}.png?v=${SPRITE_VERSION}`
  })

  pendingLoads.set(speciesIdx, promise)
  promise.finally(() => pendingLoads.delete(speciesIdx))
  return promise
}

export default function PixelPetCanvas({ seed, rarity, evolutionStage, animation = 'idle', size = 5, style, onClick, forceGrid, noAnim }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spriteCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const petDataRef = useRef<PixelPetData | null>(null)
  const spriteBBRef = useRef<{ minRow: number; maxRow: number; minCol: number; maxCol: number } | null>(null)
  const animRef = useRef<ReturnType<typeof generatePetAnimation> | null>(null)
  const frameRef = useRef<number>(0)
  const animFrameRef = useRef(0) // current animation frame index
  const lastFrameTime = useRef(0)
  const timeRef = useRef(0)
  const flipRef = useRef(false) // true = sprite is horizontally flipped (faces right)

  // Auto-detect PixelLab cat and shiba — force grid rendering
  const isPixellab = IS_PIXELLAB(seed)
  const effectiveForceGrid = forceGrid || isPixellab

  // Map old Shiba seed (23) to new seed (176) for generator special case
  const effectiveSeed = (seed === 23 && isPixellab) ? 176 : seed

  const [status, setStatus] = useState<'loading' | 'fallback' | 'png'>(
    effectiveForceGrid ? 'fallback' : (spriteCache.has(getSpeciesIndex(seed)) ? 'png' : 'loading')
  )
  const [spriteBB, setSpriteBB] = useState<{ minRow: number; maxRow: number; minCol: number; maxCol: number } | null>(null)

  const speciesIdx = getSpeciesIndex(seed)

  // Generate pixel data + animation frames
  useEffect(() => {
    const pd = generatePixelPet({ seed: effectiveSeed, rarity, evolutionStage })
    petDataRef.current = pd
    const anim = generatePetAnimation(pd)
    animRef.current = anim
    // Compute sprite bounding box from first frame — normalizes visual size across species
    const bb = computeBoundingBox(anim.walkFrames[0])
    spriteBBRef.current = bb
    setSpriteBB(bb)
  }, [effectiveSeed, rarity, evolutionStage])

  // Load PNG sprite (with cache) — skip if forceGrid
  useEffect(() => {
    if (effectiveForceGrid) return
    let cancelled = false
    // Shiba custom sprite bypass (seeds 23 and 176)
    if (seed === 23 || seed === 176) {
      loadSprite(999, 23).then((oc) => {
        if (cancelled) return
        spriteCanvasRef.current = oc
        setStatus(oc ? 'png' : 'fallback')
      })
      return () => { cancelled = true }
    }
    const cached = spriteCache.get(speciesIdx)
    if (cached !== undefined) {
      spriteCanvasRef.current = cached
      if (!cancelled) setStatus(cached ? 'png' : 'fallback')
      return
    }
    loadSprite(speciesIdx, seed).then((oc) => {
      if (cancelled) return
      spriteCanvasRef.current = oc
      setStatus(oc ? 'png' : 'fallback')
    })
    return () => { cancelled = true }
  }, [speciesIdx])

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.width
    const ch = canvas.height

    timeRef.current += 0.05

    // Calculate position offsets
    let xOff = 0
    let yOff = 0

    if (!noAnim) {
      switch (animation) {
        case 'walk': {
            // Walk in place: vertical bounce + direction flip, NO lateral sway
            // (frames face left by default; flip when moving right so head faces movement)
            const dir = Math.sin(timeRef.current * 2.5)
            xOff = 0
            yOff = Math.abs(Math.sin(timeRef.current * 4)) * 3
            flipRef.current = dir > 0  // face right when moving right
            break
          }
        case 'happy': {
          yOff = Math.abs(Math.sin(timeRef.current * 6)) * 6
          break
        }
        case 'jump': {
          yOff = -(1 * 15)
          break
        }
        case 'idle': {
          yOff = Math.sin(timeRef.current * 2) * 1.5
          break
        }
      }
    }

    // Frame timing
    const now = performance.now()
    if (!noAnim && now - lastFrameTime.current >= 180) {
      lastFrameTime.current = now
      animFrameRef.current = (animFrameRef.current + 1) % 4
    }

    // Clear
    ctx.clearRect(0, 0, cw, ch)
    ctx.imageSmoothingEnabled = false

    const sprite = spriteCanvasRef.current
    const pd = petDataRef.current
    const anim = animRef.current

    if (sprite && status === 'png') {
      // ── PNG path: draw cached sprite with enhanced walk animation ──
      const pad = 20
      const displaySize = Math.min(cw, ch) - pad
      const imgScale = displaySize / Math.max(sprite.width, sprite.height)
      const dw = Math.round(sprite.width * imgScale)
      const dh = Math.round(sprite.height * imgScale)
      const dx = Math.round((cw - dw) / 2 + xOff)
      const dy = Math.round((ch - dh) / 2 + yOff)

      ctx.drawImage(sprite, dx, dy, dw, dh)

      if (RARITY_GLOWS[rarity]) {
        ctx.shadowColor = RARITY_GLOWS[rarity]
        ctx.shadowBlur = size * 3
        ctx.drawImage(sprite, dx, dy, dw, dh)
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }

      ctx.fillStyle = RARITY_TINTS[rarity]
      ctx.fillRect(dx, dy, dw, dh)

      if (rarity === 'legendary') {
        ctx.fillStyle = '#ffd70060'
        ctx.fillRect(dx - 1, dy - 1, dw + 2, 2)
        ctx.fillRect(dx - 1, dy + dh - 1, dw + 2, 2)
        ctx.fillRect(dx - 1, dy, 2, dh)
        ctx.fillRect(dx + dw - 1, dy, 2, dh)
      }
    } else if (status === 'fallback' && pd && anim) {
      // ── Fallback path: frame-by-frame pixel animation ──
      const bb = spriteBBRef.current
      const spriteW = bb ? (bb.maxCol - bb.minCol + 1) : pd.width
      const spriteH = bb ? (bb.maxRow - bb.minRow + 1) : pd.height
      const refSize = Math.max(spriteW, spriteH, 1)
      const pixelSize = (size as number) * (16 / refSize)
      const gridW = spriteW * pixelSize
      const gridH = spriteH * pixelSize
      const startX = (cw - gridW) / 2 + xOff
      const startY = (ch - gridH) / 2 + yOff

      // Pick the right frame set based on animation state
      let frameGrid = anim.walkFrames[0]
      if (noAnim) {
        // Static: always show first frame, no cycling
        frameGrid = anim.walkFrames[0]
      } else if (animation === 'walk') {
        frameGrid = anim.walkFrames[animFrameRef.current]
      } else if (animation === 'idle') {
        // Blink every ~2 seconds (alternate between base and blink)
        const blinkCycle = Math.floor(timeRef.current * 2) % 60
        frameGrid = blinkCycle === 0 ? anim.blinkFrame : anim.walkFrames[0]
      } else if (animation === 'happy') {
        // Happy: cycle through all frames faster
        frameGrid = anim.walkFrames[Math.floor(timeRef.current * 4) % 4]
      }

      if (pd.palette.glow) {
        ctx.shadowColor = pd.palette.glow
        ctx.shadowBlur = pixelSize * 4
      }

      // Clip to bounding box so centering is based on actual sprite content, not empty grid padding
      const drawGrid = bb
        ? frameGrid.slice(bb.minRow, bb.maxRow + 1).map(row => row.slice(bb.minCol, bb.maxCol + 1))
        : frameGrid

      // Flip sprite horizontally when moving right so head faces walking direction
      if (flipRef.current) {
        ctx.save()
        ctx.translate(cw, 0)
        ctx.scale(-1, 1)
        drawPixelGrid(ctx, drawGrid, pixelSize, cw - startX - gridW, startY)
        ctx.restore()
      } else {
        drawPixelGrid(ctx, drawGrid, pixelSize, startX, startY)
      }

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
    } else {
      // loading: draw pulsing skeleton
      const breathe = 0.5 + Math.sin(timeRef.current * 2) * 0.2
      ctx.fillStyle = `rgba(255,255,255,${0.04 * breathe})`
      const r = 8, rx = 2, ry = 2, rw = cw - 4, rh = ch - 4
      ctx.beginPath()
      ctx.moveTo(rx + r, ry)
      ctx.lineTo(rx + rw - r, ry)
      ctx.arcTo(rx + rw, ry, rx + rw, ry + r, r)
      ctx.lineTo(rx + rw, ry + rh - r)
      ctx.arcTo(rx + rw, ry + rh, rx + rw - r, ry + rh, r)
      ctx.lineTo(rx + r, ry + rh)
      ctx.arcTo(rx, ry + rh, rx, ry + rh - r, r)
      ctx.lineTo(rx, ry + r)
      ctx.arcTo(rx, ry, rx + r, ry, r)
      ctx.closePath()
      ctx.fill()
    }

    frameRef.current = requestAnimationFrame(animate)
  }, [animation, size, rarity, status, speciesIdx])

  // Start/stop animation loop
  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [animate])

  const pixelVal = typeof size === 'number' ? size : 5
  // Use sprite bounding box for canvas size — ensures consistent visual size across species
  const calcBB = spriteBB || spriteBBRef.current
  const spriteW = calcBB ? (calcBB.maxCol - calcBB.minCol + 1) : (petDataRef.current?.width || (isPixellab ? 32 : 16))
  const spriteH = calcBB ? (calcBB.maxRow - calcBB.minRow + 1) : (petDataRef.current?.height || (isPixellab ? 32 : 16))
  const refSize = Math.max(spriteW, spriteH, 1)
  const sizeMult = 16 / refSize
  const effectivePixelVal = pixelVal * sizeMult
  const canvasW = Math.round(spriteW * effectivePixelVal + 40)
  const canvasH = Math.round(spriteH * effectivePixelVal + 30)

  const handleClick = () => {
    onClick?.()
  }

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      onClick={handleClick}
      style={{
        width: canvasW, height: canvasH,
        imageRendering: 'pixelated',
        borderRadius: 12, cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    />
  )
}
