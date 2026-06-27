'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { generatePixelPet, PixelPetData, getSpeciesIndex, generatePetAnimation, drawPixelGrid } from '@pipz/core'

const SPRITE_VERSION = 'v7' // Bump when sprite assets change (forces cache refresh)

type PetAnimType = 'idle' | 'walk' | 'play'

interface Props {
  seed: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  evolutionStage: number
  animation?: PetAnimType
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
  const animRef = useRef<ReturnType<typeof generatePetAnimation> | null>(null)
  const frameRef = useRef<number>(0)
  const animFrameRef = useRef(0)
  const lastFrameTime = useRef(0)
  const xOffsetRef = useRef(0)
  const yOffsetRef = useRef(0)
  const walkDirRef = useRef(1)
  const timeRef = useRef(0)
  const [status, setStatus] = useState<'loading' | 'fallback' | 'png'>(
    spriteCache.has(getSpeciesIndex(seed)) ? 'png' : 'loading'
  )

  const speciesIdx = getSpeciesIndex(seed)

  // Generate pixel data + animation frames
  useEffect(() => {
    const pd = generatePixelPet({ seed, rarity, evolutionStage })
    petDataRef.current = pd
    animRef.current = generatePetAnimation(pd)
  }, [seed, rarity, evolutionStage])

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

  // Get the correct frame set for current animation type
  const getCurrentFrame = useCallback((anim: ReturnType<typeof generatePetAnimation>, animType: PetAnimType, frameIdx: number) => {
    switch (animType) {
      case 'walk':
        return anim.walkFrames[frameIdx % 4]
      case 'idle':
        return anim.idleFrames[frameIdx % 4]
      case 'play':
        return anim.playFrames[frameIdx % 4]
    }
  }, [])

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.width
    const ch = canvas.height

    timeRef.current += 0.05

    // Calculate position offsets per animation type
    let xOff = 0
    let yOff = 0
    let useYBob = false

    switch (animation) {
      case 'walk': {
        // Walk: horizontal oscillation + vertical bob
        xOffsetRef.current += 0.3 * walkDirRef.current
        if (xOffsetRef.current > 20) walkDirRef.current = -1
        if (xOffsetRef.current < -20) walkDirRef.current = 1
        xOff = xOffsetRef.current
        yOff = Math.abs(Math.sin(timeRef.current * 4)) * 3
        break
      }
      case 'idle': {
        // Idle: subtle breathing bob
        yOff = Math.sin(timeRef.current * 2) * 1.5
        break
      }
      case 'play': {
        // Play: bounce up and down + slight sway
        yOff = Math.abs(Math.sin(timeRef.current * 5)) * 5 - 2.5
        xOff = Math.sin(timeRef.current * 3) * 2
        break
      }
    }

    // Frame timing (different speeds per animation)
    let frameDelay = 180 // ms
    if (animation === 'play') frameDelay = 120
    if (animation === 'walk') frameDelay = 150

    const now = performance.now()
    if (now - lastFrameTime.current >= frameDelay) {
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
      // ── PNG path: draw cached sprite with positional effects ──
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
      const pixelSize = size as number
      const gridW = pd.width * pixelSize
      const gridH = pd.height * pixelSize
      const startX = (cw - gridW) / 2 + xOff
      const startY = (ch - gridH) / 2 + yOff

      // Pick the right frame set based on animation type
      const frameGrid = getCurrentFrame(anim, animation, animFrameRef.current)

      if (pd.palette.glow) {
        ctx.shadowColor = pd.palette.glow
        ctx.shadowBlur = pixelSize * 4
      }

      drawPixelGrid(ctx, frameGrid, pixelSize, startX, startY)

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
  }, [animation, size, rarity, status, speciesIdx, getCurrentFrame])

  // Start/stop animation loop
  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [animate])

  const pixelVal = typeof size === 'number' ? size : 5
  const spriteGridSize = 16
  const canvasW = spriteGridSize * pixelVal + 40
  const canvasH = spriteGridSize * pixelVal + 30

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      onClick={onClick}
      style={{
        width: canvasW, height: canvasH,
        imageRendering: 'pixelated',
        borderRadius: 12, cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    />
  )
}
