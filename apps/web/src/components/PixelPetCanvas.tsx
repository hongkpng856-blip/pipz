'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { generatePixelPet, PixelPetData, getSpeciesIndex } from '@pipz/core'

const SPRITE_VERSION = 'v6' // Bump when sprite assets change (forces cache refresh)

interface Props {
  seed: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  evolutionStage: number
  animation?: 'idle' | 'walk' | 'happy' | 'jump'
  size?: number
  style?: React.CSSProperties
  onClick?: () => void
}

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

// ── Global sprite cache ──
// Shared across all PixelPetCanvas instances so the same species only loads once.
// Key: speciesIdx, Value: pre-processed offscreen canvas (or null if PNG failed)
const spriteCache = new Map<number, HTMLCanvasElement | null>()
const pendingLoads = new Map<number, Promise<HTMLCanvasElement | null>>()

function loadSprite(speciesIdx: number): Promise<HTMLCanvasElement | null> {
  // Return cached if already loaded
  if (spriteCache.has(speciesIdx)) return Promise.resolve(spriteCache.get(speciesIdx)!)
  // Deduplicate in-flight loads
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
      spriteCache.set(speciesIdx, null) // null = fallback needed
      resolve(null)
    }
    img.src = `/pixel-gen/sprites/${speciesIdx}.png?v=${SPRITE_VERSION}`
  })

  pendingLoads.set(speciesIdx, promise)
  promise.finally(() => pendingLoads.delete(speciesIdx))
  return promise
}

export default function PixelPetCanvas({ seed, rarity, evolutionStage, animation = 'idle', size = 5, style, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spriteCanvasRef = useRef<HTMLCanvasElement | null>(null) // cached sprite
  const petDataRef = useRef<PixelPetData | null>(null)
  const frameRef = useRef<number>(0)
  const xOffsetRef = useRef(0)
  const yOffsetRef = useRef(0)
  const bounceRef = useRef(0)
  const walkDirRef = useRef(1)
  const timeRef = useRef(0)
  const loadedRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'fallback' | 'png'>(
    spriteCache.has(getSpeciesIndex(seed)) ? 'png' : 'loading'
  )

  const speciesIdx = getSpeciesIndex(seed)

  // Load PNG sprite (with cache)
  useEffect(() => {
    let cancelled = false

    // Check cache first
    const cached = spriteCache.get(speciesIdx)
    if (cached !== undefined) {
      spriteCanvasRef.current = cached
      if (!cancelled) setStatus(cached ? 'png' : 'fallback')
      return
    }

    loadSprite(speciesIdx).then((oc) => {
      if (cancelled) return
      spriteCanvasRef.current = oc
      setStatus(oc ? 'png' : 'fallback')
    })

    return () => { cancelled = true }
  }, [speciesIdx])

  // Generate procedural pet data as fallback (lazy: only when PNG fails)
  useEffect(() => {
    if (status === 'fallback') {
      petDataRef.current = generatePixelPet({ seed, rarity, evolutionStage })
    }
  }, [status, seed, rarity, evolutionStage])

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.width
    const ch = canvas.height

    // Calculate offsets based on animation state
    let xOff = 0
    let yOff = 0

    timeRef.current += 0.05

    switch (animation) {
      case 'walk': {
        xOffsetRef.current += 0.3 * walkDirRef.current
        if (xOffsetRef.current > 20) walkDirRef.current = -1
        if (xOffsetRef.current < -20) walkDirRef.current = 1
        xOff = xOffsetRef.current
        yOff = Math.abs(Math.sin(timeRef.current * 4)) * 3
        break
      }
      case 'happy': {
        yOff = Math.abs(Math.sin(timeRef.current * 6)) * 6
        break
      }
      case 'jump': {
        bounceRef.current = Math.max(0, bounceRef.current - 0.08)
        yOff = -(bounceRef.current * 15)
        break
      }
      case 'idle': {
        yOff = Math.sin(timeRef.current * 2) * 1.5
        break
      }
    }

    // Clear
    ctx.clearRect(0, 0, cw, ch)
    loadedRef.current = true

    const sprite = spriteCanvasRef.current
    if (sprite && status === 'png') {
      // Draw cached sprite
      const pad = 20
      const displaySize = Math.min(cw, ch) - pad
      const imgScale = displaySize / Math.max(sprite.width, sprite.height)
      const dw = Math.round(sprite.width * imgScale)
      const dh = Math.round(sprite.height * imgScale)
      const dx = Math.round((cw - dw) / 2 + xOff)
      const dy = Math.round((ch - dh) / 2 + yOff)

      ctx.drawImage(sprite, dx, dy, dw, dh)

      // Glow for high rarity
      if (RARITY_GLOWS[rarity]) {
        ctx.shadowColor = RARITY_GLOWS[rarity]
        ctx.shadowBlur = size * 3
        ctx.drawImage(sprite, dx, dy, dw, dh)
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }

      // Rarity tint overlay
      ctx.fillStyle = RARITY_TINTS[rarity]
      ctx.fillRect(dx, dy, dw, dh)

      // Legendary sparkle
      if (rarity === 'legendary') {
        ctx.fillStyle = '#ffd70060'
        ctx.fillRect(dx - 1, dy - 1, dw + 2, 2)
        ctx.fillRect(dx - 1, dy + dh - 1, dw + 2, 2)
        ctx.fillRect(dx - 1, dy, 2, dh)
        ctx.fillRect(dx + dw - 1, dy, 2, dh)
      }
    } else if (status === 'fallback') {
      // Fallback: procedural grid — only when PNG failed
      const petData = petDataRef.current
      if (!petData) {
        frameRef.current = requestAnimationFrame(animate)
        return
      }

      const pixelSize = (size as number)
      const gridW = petData.width * pixelSize
      const gridH = petData.height * pixelSize
      const startX = (cw - gridW) / 2 + xOff
      const startY = (ch - gridH) / 2 + yOff

      if (petData.palette.glow) {
        ctx.shadowColor = petData.palette.glow
        ctx.shadowBlur = pixelSize * 4
      }

      for (let y = 0; y < petData.height; y++) {
        for (let x = 0; x < petData.width; x++) {
          const color = petData.grid[y][x]
          if (color && color !== 'transparent') {
            ctx.fillStyle = color
            ctx.fillRect(startX + x * pixelSize, startY + y * pixelSize, pixelSize, pixelSize)
          }
        }
      }
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
    } else {
      // loading: draw pulsing skeleton placeholder
      const breathe = 0.5 + Math.sin(timeRef.current * 2) * 0.2
      ctx.fillStyle = `rgba(255,255,255,${0.04 * breathe})`
      const r = 8
      const rx = 2, ry = 2, rw = cw - 4, rh = ch - 4
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

  // Size calculation
  const pixelVal = typeof size === 'number' ? size : 5
  const spriteGridSize = 16
  const canvasW = spriteGridSize * pixelVal + 40
  const canvasH = spriteGridSize * pixelVal + 30

  const handleClick = () => {
    bounceRef.current = 1
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
