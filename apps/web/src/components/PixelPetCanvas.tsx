'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { generatePixelPet, PixelPetData, getSpeciesIndex } from '@pipz/core'

const SPRITE_VERSION = 'v5' // Bump when sprite assets change (forces cache refresh)

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

/**
 * Remove warm-beige background (rgb(255,241,232)) and PICO-8 bg gray
 * (rgb(194,195,199)) from AI-generated PICO-8 style sprites.
 */
function removeBg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const id = ctx.getImageData(0, 0, w, h)
  const TOL = 40
  const br = 255, bg = 241, bb = 232
  const pico_r = 194, pico_g = 195, pico_b = 199
  for (let i = 0; i < id.data.length; i += 4) {
    const a = id.data[i + 3]
    if (a === 0) continue
    const r = id.data[i], g = id.data[i + 1], b = id.data[i + 2]
    // Warm beige removal
    if (
      Math.abs(r - br) <= TOL &&
      Math.abs(g - bg) <= TOL &&
      Math.abs(b - bb) <= TOL
    ) {
      id.data[i + 3] = 0
      continue
    }
    // PICO-8 bg gray (#C2C3C7) removal
    if (r === pico_r && g === pico_g && b === pico_b) {
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
  const [status, setStatus] = useState<'loading' | 'fallback' | 'png'>('loading')

  const speciesIdx = getSpeciesIndex(seed)

  // Load PNG sprite and pre-process to remove background
  useEffect(() => {
    let cancelled = false
    // If seed changed since last load, clear old sprite
    if (seedKeyRef.current !== seed) {
      offscreenRef.current = null
      setStatus('loading')
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

      // Remove warm-beige background (safety net — sprites should already be transparent)
      removeBg(ox, img.width, img.height)

      offscreenRef.current = oc
      if (!cancelled) setStatus('png')
    }
    img.onerror = () => {
      if (!cancelled) setStatus('fallback')
    }
    img.src = `/pixel-gen/sprites/${speciesIdx}.png?v=${SPRITE_VERSION}`
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
    } else if (status === 'loading') {
      // Draw pulsing skeleton placeholder — instant visual feedback
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
        width: canvasW, height: canvasH,
        imageRendering: 'pixelated',
        borderRadius: 12, cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    />
  )
}
