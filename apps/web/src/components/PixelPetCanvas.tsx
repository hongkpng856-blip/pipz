'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { generatePixelPet, generatePetAnimationTraits, PixelPetData, PetAnimationTraits, getSpeciesIndex } from '@pipz/core'

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
  common: '', uncommon: '#22c55e44', rare: '#3b82f666', epic: '#8b5cf688', legendary: '#f59e0baa',
}
const RARITY_EYE_Y: Record<string, number> = {
  common: 0.38, uncommon: 0.38, rare: 0.38, epic: 0.36, legendary: 0.34,
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
      oc.width = img.width; oc.height = img.height
      oc.getContext('2d')!.drawImage(img, 0, 0)
      spriteCache.set(speciesIdx, oc); resolve(oc)
    }
    img.onerror = () => { spriteCache.set(speciesIdx, null); resolve(null) }
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
  const traitsRef = useRef<PetAnimationTraits | null>(null)
  const frameRef = useRef<number>(0)
  const timeRef = useRef(0)
  const xOffsetRef = useRef(0)
  const yOffsetRef = useRef(0)
  const bounceRef = useRef(0)
  const walkDirRef = useRef(1)
  const blinkTimerRef = useRef(0)
  const isBlinkingRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'fallback' | 'png'>(
    spriteCache.has(getSpeciesIndex(seed)) ? 'png' : 'loading'
  )

  const speciesIdx = getSpeciesIndex(seed)

  // Generate traits from seed — one per pet identity
  useEffect(() => {
    traitsRef.current = generatePetAnimationTraits(seed, rarity, evolutionStage)
  }, [seed, rarity, evolutionStage])

  // Load PNG
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

  // Fallback procedural gen
  useEffect(() => {
    if (status === 'fallback') {
      petDataRef.current = generatePixelPet({ seed, rarity, evolutionStage })
    }
  }, [status, seed, rarity, evolutionStage])

  // Draw eyelids for blink
  const drawBlink = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spriteW: number) => {
    const eyeY = cy + spriteW * RARITY_EYE_Y[rarity] * 0.5
    const eyeSpacing = spriteW * 0.12
    const barW = spriteW * 0.08
    const barH = Math.max(1, spriteW * 0.015)
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(cx - eyeSpacing - barW / 2, eyeY, barW, barH)
    ctx.fillRect(cx + eyeSpacing - barW / 2, eyeY, barW, barH)
  }

  // Sleepy eyes
  const drawSleepyEyes = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spriteW: number) => {
    const eyeY = cy + spriteW * 0.08
    const eyeSpacing = spriteW * 0.14
    const eyeLen = spriteW * 0.07
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = Math.max(1, spriteW * 0.02)
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(cx - eyeSpacing - eyeLen, eyeY); ctx.lineTo(cx - eyeSpacing + eyeLen, eyeY); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx + eyeSpacing - eyeLen, eyeY); ctx.lineTo(cx + eyeSpacing + eyeLen, eyeY); ctx.stroke()
  }

  // ── Animation loop ──
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.width
    const ch = canvas.height
    timeRef.current += 0.05

    const traits = traitsRef.current
    const baseWalkSpeed = traits?.walkSpeed ?? 5
    const baseWalkBounce = traits?.walkBounce ?? 3
    const baseBlinkInt = traits?.blinkInterval ?? 4000
    const baseBlinkDur = traits?.blinkDuration ?? 120

    // ── Animation offsets ──
    let xOff = 0, yOff = 0, scale = 1, rot = 0
    const breathe = animation === 'sleep'
      ? Math.sin(timeRef.current * 1.5) * 0.01
      : Math.sin(timeRef.current * 3) * 0.012

    switch (animation) {
      case 'walk': {
        const speed = baseWalkSpeed * 0.06
        xOffsetRef.current += speed * walkDirRef.current
        if (xOffsetRef.current > 20) walkDirRef.current = -1
        if (xOffsetRef.current < -20) walkDirRef.current = 1
        xOff = xOffsetRef.current
        yOff = Math.abs(Math.sin(timeRef.current * (baseWalkBounce * 1.5))) * (baseWalkBounce * 0.4)
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
        scale = 1 + breathe
        break
      }
    }

    // ── Blink timer ──
    blinkTimerRef.current -= 0.05
    if (blinkTimerRef.current <= 0) {
      if (isBlinkingRef.current) {
        isBlinkingRef.current = false
        blinkTimerRef.current = baseBlinkInt / 1000
      } else {
        isBlinkingRef.current = true
        blinkTimerRef.current = baseBlinkDur / 1000
      }
    }

    ctx.clearRect(0, 0, cw, ch)
    ctx.imageSmoothingEnabled = false

    const sprite = spriteCanvasRef.current
    if (sprite && status === 'png') {
      // PNG sprite rendering
      const pad = 20
      const displaySize = Math.min(cw, ch) - pad
      const imgScale = (displaySize / Math.max(sprite.width, sprite.height)) * scale
      const dw = Math.round(sprite.width * imgScale)
      const dh = Math.round(sprite.height * imgScale)
      const dx = Math.round((cw - dw) / 2 + xOff)
      const dy = Math.round((ch - dh) / 2 + yOff)

      ctx.save()
      ctx.translate(cw / 2 + xOff, ch / 2 + yOff)
      ctx.rotate(rot)

      if (RARITY_GLOWS[rarity]) {
        ctx.shadowColor = RARITY_GLOWS[rarity]
        ctx.shadowBlur = size * 3
        ctx.drawImage(sprite, -dw / 2, -dh / 2, dw, dh)
        ctx.shadowBlur = 0
      }
      ctx.drawImage(sprite, -dw / 2, -dh / 2, dw, dh)
      ctx.restore()

      ctx.fillStyle = RARITY_TINTS[rarity]
      ctx.fillRect(dx, dy, dw, dh)

      if (rarity === 'legendary') {
        ctx.fillStyle = '#ffd70060'
        ctx.fillRect(dx - 1, dy - 1, dw + 2, 2)
        ctx.fillRect(dx - 1, dy + dh - 1, dw + 2, 2)
        ctx.fillRect(dx - 1, dy, 2, dh)
        ctx.fillRect(dx + dw - 1, dy, 2, dh)
      }

      // Blink overlay
      if (isBlinkingRef.current && animation !== 'sleep') {
        drawBlink(ctx, cw / 2 + xOff, ch / 2 + yOff, displaySize)
      }
      if (animation === 'sleep') {
        drawSleepyEyes(ctx, cw / 2 + xOff, ch / 2 + yOff, displaySize)
      }

    } else if (status === 'fallback') {
      // Procedural fallback
      const petData = petDataRef.current
      if (!petData) { frameRef.current = requestAnimationFrame(animate); return }

      const pixelSize = (size as number)
      const gridW = petData.width * pixelSize
      const gridH = petData.height * pixelSize
      const cx = cw / 2 + xOff, cy = ch / 2 + yOff

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rot)
      ctx.scale(scale, scale)

      if (petData.palette.glow) {
        ctx.shadowColor = petData.palette.glow
        ctx.shadowBlur = pixelSize * 4
      }
      for (let y = 0; y < petData.height; y++) {
        for (let x = 0; x < petData.width; x++) {
          const color = petData.grid[y][x]
          if (color && color !== 'transparent') {
            ctx.fillStyle = color
            ctx.fillRect(x * pixelSize - gridW / 2, y * pixelSize - gridH / 2, pixelSize, pixelSize)
          }
        }
      }
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.restore()

      if (isBlinkingRef.current && animation !== 'sleep') {
        drawBlink(ctx, cw / 2 + xOff, ch / 2 + yOff, gridW)
      }
      if (animation === 'sleep') {
        drawSleepyEyes(ctx, cw / 2 + xOff, ch / 2 + yOff, gridW)
      }

    } else {
      // Loading skeleton
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
      width={canvasW} height={canvasH}
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
