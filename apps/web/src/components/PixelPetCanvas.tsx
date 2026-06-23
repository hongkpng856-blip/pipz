'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { generatePixelPet, PixelPetData, getSpeciesIndex } from '@pipz/core'

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

/** Sample edge pixels to detect background color, remove with ±tolerance */
function removeBgOnCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const id = ctx.getImageData(0, 0, w, h)
  // Sample edge pixels (top + bottom rows) to find background color
  const freq: Record<string, number> = {}
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4
    // Skip fully transparent pixels — their RGB may be garbage
    if (id.data[i + 3] < 128) return
    const key = `${id.data[i]},${id.data[i + 1]},${id.data[i + 2]}`
    freq[key] = (freq[key] || 0) + 1
  }
  for (let x = 0; x < w; x++) {
    sample(x, 0)
    sample(x, h - 1)
  }
  // Most common edge color = background
  const bgKey = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (!bgKey) return
  const [br, bg, bb] = bgKey.split(',').map(Number)
  const TOL = 20 // tolerance for color match
  for (let i = 0; i < id.data.length; i += 4) {
    if (
      Math.abs(id.data[i] - br) <= TOL &&
      Math.abs(id.data[i + 1] - bg) <= TOL &&
      Math.abs(id.data[i + 2] - bb) <= TOL &&
      id.data[i + 3] > 0
    ) {
      id.data[i + 3] = 0
    }
  }
  ctx.putImageData(id, 0, 0)
}

export default function PixelPetCanvas({ seed, rarity, evolutionStage, animation = 'idle', size = 5, style, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null) // pre-processed sprite
  const petDataRef = useRef<PixelPetData | null>(null)
  const frameRef = useRef<number>(0)
  const xOffsetRef = useRef(0)
  const yOffsetRef = useRef(0)
  const bounceRef = useRef(0)
  const walkDirRef = useRef(1)
  const timeRef = useRef(0)
  const seedKeyRef = useRef<number | null>(null)
  const [status, setStatus] = useState<'fallback' | 'png'>('fallback')

  const speciesIdx = getSpeciesIndex(seed)

  // Load PNG sprite and pre-process to remove background
  useEffect(() => {
    let cancelled = false
    // If seed changed since last load, clear old sprite
    if (seedKeyRef.current !== seed) {
      offscreenRef.current = null
      setStatus('fallback')
    }
    seedKeyRef.current = seed

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      const oc = document.createElement('canvas')
      oc.width = img.width
      oc.height = img.height
      const ox = oc.getContext('2d')!
      ox.drawImage(img, 0, 0)

      // Remove background color (detected from edge pixels)
      removeBgOnCanvas(ox, img.width, img.height)

      offscreenRef.current = oc
      if (!cancelled) setStatus('png')
    }
    img.onerror = () => {
      if (!cancelled) setStatus('fallback')
    }
    img.src = `/pixel-gen/sprites/${speciesIdx}.png`
    return () => { cancelled = true }
  }, [speciesIdx])

  // Generate procedural pet data as fallback
  useEffect(() => {
    petDataRef.current = generatePixelPet({ seed, rarity, evolutionStage })
  }, [seed, rarity, evolutionStage])

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

    const oc = offscreenRef.current
    if (oc && status === 'png') {
      // Draw pre-processed sprite (already has bg removed)
      const pad = 20
      const displaySize = Math.min(cw, ch) - pad
      const imgScale = displaySize / Math.max(oc.width, oc.height)
      const dw = Math.round(oc.width * imgScale)
      const dh = Math.round(oc.height * imgScale)
      const dx = Math.round((cw - dw) / 2 + xOff)
      const dy = Math.round((ch - dh) / 2 + yOff)

      ctx.drawImage(oc, dx, dy, dw, dh)

      // Glow for high rarity
      if (RARITY_GLOWS[rarity]) {
        ctx.shadowColor = RARITY_GLOWS[rarity]
        ctx.shadowBlur = size * 3
        ctx.drawImage(oc, dx, dy, dw, dh)
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
    }
    // If status === 'loading', draw nothing — avoids flash

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
  // PNG sprites displayed at 16px per 'size' unit (same visual footprint as procedural grid)
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
        display: 'block',
        cursor: onClick ? 'pointer' : 'default',
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  )
}
