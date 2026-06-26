'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  generateAnimationFrames, generatePixelPet,
  PixelPetData, AnimationFrame, AnimationType,
  getSpeciesIndex,
} from '@pipz/core'

const SPRITE_VERSION = 'v6'

interface Props {
  seed: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  evolutionStage: number
  animation?: 'idle' | 'walk' | 'happy' | 'jump' | 'sleep'
  size?: number
  style?: React.CSSProperties
  onClick?: () => void
}

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

// ── Global caches ──
const sheetCache = new Map<string, HTMLCanvasElement | null>() // "speciesIdx_animType" → composited frame strip
const pendingSheetLoads = new Map<string, Promise<HTMLCanvasElement | null>>()

/** Pre-composite animation frames into a horizontal strip canvas (one row per anim type) */
function buildAnimSheet(
  seed: number, rarity: Props['rarity'], evoStage: number,
): HTMLCanvasElement {
  const pixelSize = 5
  const GRID = 16
  const frameW = GRID * pixelSize
  const frameH = GRID * pixelSize
  const config = { seed, rarity, evolutionStage: evoStage }

  const animTypes: { type: AnimationType; frames: number }[] = [
    { type: 'idle', frames: 4 },
    { type: 'walk', frames: 4 },
    { type: 'happy', frames: 2 },
    { type: 'sleep', frames: 4 },
  ]

  const totalWidth = animTypes.reduce((w, a) => w + frameW * a.frames, 0)
  const totalHeight = frameH

  const sheet = document.createElement('canvas')
  sheet.width = totalWidth
  sheet.height = totalHeight
  const ctx = sheet.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  let xOff = 0
  for (const { type, frames } of animTypes) {
    const animFrames = generateAnimationFrames(config, type)
    for (let i = 0; i < Math.min(frames, animFrames.length); i++) {
      const frame = animFrames[i]
      // Draw pixels
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          const c = frame.grid[y][x]
          if (c && c !== 'transparent') {
            ctx.fillStyle = c
            ctx.fillRect(xOff + x * pixelSize, y * pixelSize, pixelSize, pixelSize)
          }
        }
      }
      xOff += frameW
    }
    // Pad remaining frames with last frame
    for (let i = animFrames.length; i < frames; i++) {
      const lastFrame = animFrames[animFrames.length - 1]
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          const c = lastFrame.grid[y][x]
          if (c && c !== 'transparent') {
            ctx.fillStyle = c
            ctx.fillRect(xOff + x * pixelSize, y * pixelSize, pixelSize, pixelSize)
          }
        }
      }
      xOff += frameW
    }
  }

  return sheet
}

const ANIM_OFFSETS: Record<string, { start: number; frames: number }> = {
  idle:  { start: 0, frames: 4 },
  walk:  { start: 4, frames: 4 },
  happy: { start: 8, frames: 2 },
  sleep: { start: 10, frames: 4 },
}

export default function PixelPetCanvas({
  seed, rarity, evolutionStage, animation = 'idle', size = 5, style, onClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sheetRef = useRef<HTMLCanvasElement | null>(null)
  const pngBaseRef = useRef<HTMLCanvasElement | null>(null) // loaded PNG as base overlay
  const frameRef = useRef(0)
  const timeRef = useRef(0)
  const frameIdxRef = useRef(0)
  const frameTimerRef = useRef(0)
  const bounceRef = useRef(0)
  const walkDirRef = useRef(1)
  const xOffRef = useRef(0)
  const [pngStatus, setPngStatus] = useState<'loading' | 'ready' | 'none'>(
    spriteImmediateCache.has(getSpeciesIndex(seed)) ? 'ready' : 'loading'
  )

  const speciesIdx = getSpeciesIndex(seed)
  const sheetKey = `${speciesIdx}_${rarity}_${evolutionStage}`

  // ── Quick sprite cache for transparent PNG→canvas conversion ──
  // We use a separate module-level cache keyed by speciesIdx
  // so the base PNG is loaded once globally
  const spriteCacheRef = useRef(spriteImmediateCache)

  // Ensure animation sheet exists
  useEffect(() => {
    const cached = sheetCache.get(sheetKey)
    if (cached !== undefined) {
      sheetRef.current = cached
      return
    }
    // Build synchronously (fast — pure array ops)
    const sheet = buildAnimSheet(seed, rarity, evolutionStage)
    sheetCache.set(sheetKey, sheet)
    sheetRef.current = sheet
  }, [sheetKey, seed, rarity, evolutionStage])

  // Load PNG sprite as optional base overlay (background, for visual quality)
  useEffect(() => {
    let cancelled = false
    const cached = spriteImmediateCache.get(speciesIdx)
    if (cached !== undefined) {
      pngBaseRef.current = cached
      if (!cancelled) setPngStatus('ready')
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      const oc = document.createElement('canvas')
      oc.width = img.width
      oc.height = img.height
      oc.getContext('2d')!.drawImage(img, 0, 0)
      spriteImmediateCache.set(speciesIdx, oc)
      pngBaseRef.current = oc
      if (!cancelled) setPngStatus('ready')
    }
    img.onerror = () => {
      if (!cancelled) setPngStatus('none')
    }
    img.src = `/pixel-gen/sprites/${speciesIdx}.png?v=${SPRITE_VERSION}`
    return () => { cancelled = true }
  }, [speciesIdx])

  // Reset frame timer on animation change
  useEffect(() => {
    frameIdxRef.current = 0
    frameTimerRef.current = 0
  }, [animation])

  // ── Animation loop ──
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const cw = canvas.width
    const ch = canvas.height
    timeRef.current += 0.05

    const sheet = sheetRef.current
    const pngBase = pngBaseRef.current

    // ── Frame cycling ──
    const animInfo = ANIM_OFFSETS[animation] || ANIM_OFFSETS.idle
    frameTimerRef.current += 16
    // Duration per frame varies by anim type
    let frameDuration = 200
    if (animation === 'idle') frameDuration = frameIdxRef.current % 2 === 0 ? 2500 : 120
    else if (animation === 'walk') frameDuration = 150
    else if (animation === 'happy') frameDuration = 200
    else if (animation === 'jump') frameDuration = 200
    else if (animation === 'sleep') frameDuration = 2000

    if (frameTimerRef.current >= frameDuration) {
      frameTimerRef.current = 0
      frameIdxRef.current = (frameIdxRef.current + 1) % animInfo.frames
    }

    // ── Transform offsets ──
    let xOff = 0, yOff = 0, scale = 1, rot = 0
    switch (animation) {
      case 'walk': {
        xOffRef.current += 0.3 * walkDirRef.current
        if (xOffRef.current > 20) walkDirRef.current = -1
        if (xOffRef.current < -20) walkDirRef.current = 1
        xOff = xOffRef.current
        yOff = Math.abs(Math.sin(timeRef.current * 4)) * 3
        rot = Math.sin(timeRef.current * 4) * 0.03
        break
      }
      case 'happy': {
        yOff = Math.abs(Math.sin(timeRef.current * 6)) * 8
        scale = 1 + Math.sin(timeRef.current * 8) * 0.03
        break
      }
      case 'jump': {
        bounceRef.current = Math.max(0, bounceRef.current - 0.08)
        yOff = -(bounceRef.current * 15)
        if (bounceRef.current < 0.05 && bounceRef.current > 0)
          scale = 1 + (1 - bounceRef.current / 0.05) * 0.08
        break
      }
      case 'sleep': {
        yOff = Math.sin(timeRef.current * 0.5) * 1.5
        scale = 1 + Math.sin(timeRef.current * 0.8) * 0.01
        break
      }
      case 'idle': {
        yOff = Math.sin(timeRef.current * 2) * 1.5
        scale = 1 + Math.sin(timeRef.current * 3) * 0.012
        break
      }
    }

    // ── Clear ──
    ctx.clearRect(0, 0, cw, ch)
    ctx.imageSmoothingEnabled = false

    const pixelSize = (size as number)
    const GRID = 16
    const frameW = GRID * pixelSize
    const frameH = GRID * pixelSize

    if (sheet) {
      // ── Draw from sprite sheet ──
      const frameCol = animInfo.start + frameIdxRef.current
      const sx = frameCol * frameW
      const sy = 0

      // Center in canvas
      const displayScale = Math.min(cw / frameW, ch / frameH) * scale
      const dw = Math.round(frameW * displayScale)
      const dh = Math.round(frameH * displayScale)
      const dx = Math.round((cw - dw) / 2 + xOff)
      const dy = Math.round((ch - dh) / 2 + yOff)

      ctx.save()
      ctx.translate(cw / 2 + xOff, ch / 2 + yOff)
      ctx.rotate(rot)

      if (RARITY_GLOWS[rarity]) {
        ctx.shadowColor = RARITY_GLOWS[rarity]
        ctx.shadowBlur = pixelSize * 3
      }

      // Draw the frame from sheet
      ctx.drawImage(sheet, sx, sy, frameW, frameH, -dw / 2, -dh / 2, dw, dh)
      ctx.shadowBlur = 0
      ctx.restore()

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

      // ── PNG base overlay (optional visual enhancement) ──
      // If PNG loaded, draw it underneath with alpha for richer colors
      if (pngBase && pngStatus === 'ready') {
        ctx.globalAlpha = 0.35
        ctx.save()
        ctx.translate(cw / 2 + xOff, ch / 2 + yOff)
        ctx.rotate(rot)
        const pngScale = (Math.min(cw, ch) - 20) / Math.max(pngBase.width, pngBase.height)
        const pw = pngBase.width * pngScale * scale
        const ph = pngBase.height * pngScale * scale
        ctx.drawImage(pngBase, -pw / 2, -ph / 2, pw, ph)
        ctx.restore()
        ctx.globalAlpha = 1
      }

      // ── Breathing highlight (subtle pulse overlay on sprite-sheet mode) ──
      // This makes the procedural sprite feel alive even without PNG
      const breathe = animation === 'sleep'
        ? Math.sin(timeRef.current * 1.5) * 0.08
        : Math.sin(timeRef.current * 3) * 0.06
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, breathe * 0.5)})`
      ctx.fillRect(drawX, drawY, dw, dh)

    } else {
      // Sheet not ready — fallback loading skeleton
      const breathe = 0.5 + Math.sin(timeRef.current * 2) * 0.2
      ctx.fillStyle = `rgba(255,255,255,${0.04 * breathe})`
      const r = 8
      ctx.beginPath()
      ctx.moveTo(2 + r, 2); ctx.lineTo(cw - 2 - r, 2)
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

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [animate])

  const pixelVal = typeof size === 'number' ? size : 5
  const canvasW = 16 * pixelVal + 40
  const canvasH = 16 * pixelVal + 30

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      onClick={() => { bounceRef.current = 1; onClick?.() }}
      style={{
        width: canvasW, height: canvasH,
        imageRendering: 'pixelated',
        borderRadius: 12, cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    />
  )
}

// Module-level cache for immediate PNG→canvas conversion (shared across instances)
const spriteImmediateCache = new Map<number, HTMLCanvasElement>()
