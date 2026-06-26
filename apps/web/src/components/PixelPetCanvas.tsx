'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { generatePixelPet, generateAnimationFrames, PixelPetData, AnimationFrame, getSpeciesIndex } from '@pipz/core'

const SPRITE_VERSION = 'v6' // Bump when sprite assets change (forces cache refresh)

interface Props {
  seed: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  evolutionStage: number
  animation?: 'idle' | 'walk' | 'happy' | 'jump' | 'sleep'
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
const spriteCache = new Map<number, HTMLCanvasElement | null>()
const pendingLoads = new Map<number, Promise<HTMLCanvasElement | null>>()

function loadSprite(speciesIdx: number): Promise<HTMLCanvasElement | null> {
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

export default function PixelPetCanvas({ seed, rarity, evolutionStage, animation = 'idle', size = 5, style, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spriteCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const petDataRef = useRef<PixelPetData | null>(null)
  const animFramesRef = useRef<AnimationFrame[]>([])
  const frameIdxRef = useRef(0)
  const frameTimerRef = useRef(0)
  const frameRef = useRef<number>(0)
  const timeRef = useRef(0)
  const xOffsetRef = useRef(0)
  const yOffsetRef = useRef(0)
  const bounceRef = useRef(0)
  const walkDirRef = useRef(1)
  const loadedRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'fallback' | 'png'>(
    spriteCache.has(getSpeciesIndex(seed)) ? 'png' : 'loading'
  )

  const speciesIdx = getSpeciesIndex(seed)

  // Load PNG sprite (with cache)
  useEffect(() => {
    let cancelled = false
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

  // Generate procedural pet data OR animation frames as fallback
  useEffect(() => {
    if (status === 'fallback') {
      const config = { seed, rarity, evolutionStage }
      // Map animation prop to AnimationType
      const animMap: Record<string, 'idle' | 'walk' | 'happy' | 'sleep'> = {
        idle: 'idle',
        walk: 'walk',
        happy: 'happy',
        jump: 'happy', // jump falls back to happy
        sleep: 'sleep',
      }
      const frames = generateAnimationFrames(config, animMap[animation] || 'idle')
      animFramesRef.current = frames
      frameIdxRef.current = 0
      frameTimerRef.current = 0
    } else if (status === 'png') {
      // For PNG mode, still generate base pet data for reference
      petDataRef.current = generatePixelPet({ seed, rarity, evolutionStage })
    }
  }, [status, seed, rarity, evolutionStage, animation])

  // Reset frame index when animation changes
  useEffect(() => {
    frameIdxRef.current = 0
    frameTimerRef.current = 0
  }, [animation])

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.width
    const ch = canvas.height
    timeRef.current += 0.05

    // ── Frame timing (only for fallback/procedural mode) ──
    const frames = animFramesRef.current
    if (frames.length > 0 && status === 'fallback') {
      frameTimerRef.current += 16 // ~60fps, roughly 16ms per frame call
      const currentFrame = frames[frameIdxRef.current]
      if (currentFrame && frameTimerRef.current >= currentFrame.duration) {
        frameTimerRef.current = 0
        frameIdxRef.current = (frameIdxRef.current + 1) % frames.length
      }
    }

    // ── Calculate animation offsets (for all modes) ──
    let xOff = 0, yOff = 0, scale = 1, rot = 0

    // Smooth breathing for PNG mode
    const breathe = animation === 'sleep'
      ? Math.sin(timeRef.current * 1.5) * 0.01
      : Math.sin(timeRef.current * 3) * 0.012

    switch (animation) {
      case 'walk': {
        xOffsetRef.current += 0.3 * walkDirRef.current
        if (xOffsetRef.current > 20) walkDirRef.current = -1
        if (xOffsetRef.current < -20) walkDirRef.current = 1
        xOff = xOffsetRef.current
        yOff = Math.abs(Math.sin(timeRef.current * 4)) * 3
        rot = Math.sin(timeRef.current * 4) * 0.03
        break
      }
      case 'happy': {
        yOff = Math.abs(Math.sin(timeRef.current * 6)) * 8
        scale = 1 + Math.sin(timeRef.current * 8) * 0.03
        rot = Math.sin(timeRef.current * 5) * 0.05
        break
      }
      case 'jump': {
        bounceRef.current = Math.max(0, bounceRef.current - 0.08)
        yOff = -(bounceRef.current * 15)
        if (bounceRef.current < 0.05 && bounceRef.current > 0) {
          scale = 1 + (1 - bounceRef.current / 0.05) * 0.08
        }
        break
      }
      case 'sleep': {
        yOff = Math.sin(timeRef.current * 0.5) * 1.5
        scale = 1 + Math.sin(timeRef.current * 0.8) * 0.01
        break
      }
      case 'idle': {
        yOff = Math.sin(timeRef.current * 2) * 1.5
        scale = 1 + breathe
        break
      }
    }

    // ── Clear ──
    ctx.clearRect(0, 0, cw, ch)
    ctx.imageSmoothingEnabled = false
    loadedRef.current = true

    const sprite = spriteCanvasRef.current
    if (sprite && status === 'png') {
      // PNG mode: draw sprite with transform animation
      const pad = 20
      const displaySize = Math.min(cw, ch) - pad
      const imgScale = (displaySize / Math.max(sprite.width, sprite.height)) * scale
      const dw = Math.round(sprite.width * imgScale)
      const dh = Math.round(sprite.height * imgScale)
      const dx = Math.round((cw - dw) / 2 + xOff)
      const dy = Math.round((ch - dh) / 2 + yOff)

      if (RARITY_GLOWS[rarity]) {
        ctx.shadowColor = RARITY_GLOWS[rarity]
        ctx.shadowBlur = size * 3
      }

      ctx.save()
      ctx.translate(cw / 2 + xOff, ch / 2 + yOff)
      ctx.rotate(rot)
      ctx.drawImage(sprite, -dw / 2, -dh / 2, dw, dh)
      ctx.restore()

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      // Rarity tint
      const drawX = Math.round((cw - dw) / 2 + xOff)
      const drawY = Math.round((ch - dh) / 2 + yOff)
      ctx.fillStyle = RARITY_TINTS[rarity]
      ctx.fillRect(drawX, drawY, dw, dh)

      // Legendary border
      if (rarity === 'legendary') {
        ctx.fillStyle = '#ffd70060'
        ctx.fillRect(drawX - 1, drawY - 1, dw + 2, 2)
        ctx.fillRect(drawX - 1, drawY + dh - 1, dw + 2, 2)
        ctx.fillRect(drawX - 1, drawY, 2, dh)
        ctx.fillRect(drawX + dw - 1, drawY, 2, dh)
      }

    } else if (status === 'fallback') {
      // ── Procedural mode: draw current animation frame ──
      const frameData = frames[frameIdxRef.current]
      if (!frameData) {
        frameRef.current = requestAnimationFrame(animate)
        return
      }

      const GRID_SZ = 16 // fixed grid size for all frames
      const pixelSize = (size as number)
      const gridW = GRID_SZ * pixelSize
      const gridH = GRID_SZ * pixelSize

      // Apply transform offsets on top of frame
      ctx.save()
      ctx.translate(cw / 2 + xOff, ch / 2 + yOff)
      ctx.rotate(rot)
      ctx.scale(scale, scale)

      if (RARITY_GLOWS[rarity]) {
        ctx.shadowColor = RARITY_GLOWS[rarity]
        ctx.shadowBlur = pixelSize * 3
      }

      for (let y = 0; y < GRID_SZ; y++) {
        for (let x = 0; x < GRID_SZ; x++) {
          const color = frameData.grid[y][x]
          if (color && color !== 'transparent') {
            ctx.fillStyle = color
            ctx.fillRect(x * pixelSize - gridW / 2, y * pixelSize - gridH / 2, pixelSize, pixelSize)
          }
        }
      }
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.restore()

    } else {
      // loading: pulsing skeleton
      const breathe = 0.5 + Math.sin(timeRef.current * 2) * 0.2
      ctx.fillStyle = `rgba(255,255,255,${0.04 * breathe})`
      const r = 8
      ctx.beginPath()
      ctx.moveTo(2 + r, 2)
      ctx.lineTo(cw - 2 - r, 2)
      ctx.arcTo(cw - 2, 2, cw - 2, 2 + r, r)
      ctx.lineTo(cw - 2, ch - 2 - r)
      ctx.arcTo(cw - 2, ch - 2, cw - 2 - r, ch - 2, r)
      ctx.lineTo(2 + r, ch - 2)
      ctx.arcTo(2, ch - 2, 2, ch - 2 - r, r)
      ctx.lineTo(2, 2 + r)
      ctx.arcTo(2, 2, 2 + r, 2, r)
      ctx.closePath()
      ctx.fill()
    }

    frameRef.current = requestAnimationFrame(animate)
  }, [animation, size, rarity, speciesIdx])

  // Start animation loop
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
