'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { generatePixelPet, PixelPetData, Pet, RARITY_COLORS, RARITY_LABELS, formatSteps, Mood } from '@pipz/core'

interface Props {
  pet: Pet | null
  onFeed: () => void
  onPet: () => void
  onPlay: () => void
  anim: 'idle' | 'walk' | 'happy'
  steps: number
  totalSteps: number
  evolutionStage: number
}

/* ── Room palette ── */
const FLOOR_A = '#2a2040'
const FLOOR_B = '#1e1835'
const WALL = '#16122a'
const WALL_DETAIL = '#1e1a35'
const BASEBOARD = '#2a2550'
const RUG_COLOR = '#3a2a5a'
const RUG_ACCENT = '#4a3a6a'

/* ── Behavior cycle ── */
type Behavior = 'idle' | 'walkLeft' | 'walkRight' | 'mischief' | 'happy'
type MoodEmoji = '😊' | '😋' | '😴' | '😢' | '🤩'

const MOOD_MAP: Record<string, MoodEmoji> = {
  happy: '😊',
  excited: '🤩',
  hungry: '😋',
  sleepy: '😴',
  sad: '😢',
}

export default function PetCompanion({
  pet, onFeed, onPet, onPlay, anim, steps, totalSteps, evolutionStage,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const petDataRef = useRef<PixelPetData | null>(null)
  const rafRef = useRef(0)
  const timeRef = useRef(0)
  const behaviorRef = useRef<Behavior>('idle')
  const behaviorTimer = useRef(0)
  const xRef = useRef(0)           // horizontal position offset
  const walkDir = useRef(1)        // 1 = right, -1 = left
  const bounceRef = useRef(0)      // bounce animation
  const heartsRef = useRef<{x: number; y: number; life: number}[]>([])
  const [behavior, setBehavior] = useState<Behavior>('idle')
  const [showTapHint, setShowTapHint] = useState(true)

  // Generate pet data
  useEffect(() => {
    if (pet) {
      petDataRef.current = generatePixelPet({
        seed: parseInt(pet.speciesId) || 1,
        rarity: pet.rarity,
        evolutionStage: pet.evolutionStage,
      })
    } else {
      petDataRef.current = null
    }
  }, [pet])

  // Auto behavior cycle
  useEffect(() => {
    if (!pet) return
    const pickBehavior = () => {
      const roll = Math.random()
      if (roll < 0.35) {
        behaviorRef.current = Math.random() > 0.5 ? 'walkLeft' : 'walkRight'
        walkDir.current = behaviorRef.current === 'walkRight' ? 1 : -1
      } else if (roll < 0.55) {
        behaviorRef.current = 'mischief'
      } else {
        behaviorRef.current = 'idle'
      }
      setBehavior(behaviorRef.current)
      behaviorTimer.current = 1.5 + Math.random() * 2.5  // hold for 1.5-4s
      showTapHint && setShowTapHint(false)
    }
    pickBehavior()

    const interval = setInterval(() => {
      if (behaviorTimer.current <= 0) {
        pickBehavior()
      }
    }, 100)  // check every 100ms

    return () => clearInterval(interval)
  }, [pet])

  // Decrease behavior timer
  useEffect(() => {
    if (!pet) return
    const dec = setInterval(() => {
      behaviorTimer.current = Math.max(0, behaviorTimer.current - 0.1)
    }, 100)
    return () => clearInterval(dec)
  }, [pet])

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    timeRef.current += 0.02

    // ── Background: Room ──
    // Wall
    ctx.fillStyle = WALL
    ctx.fillRect(0, 0, W, H * 0.35)

    // Wall detail (wainscoting lines)
    ctx.fillStyle = WALL_DETAIL
    for (let i = 0; i < 6; i++) {
      const lx = (i / 6) * W
      ctx.fillRect(lx, 0, 1, H * 0.35)
    }
    // Wall top border
    ctx.fillStyle = '#1a1640'
    ctx.fillRect(0, 0, W, 3)

    // Baseboard
    ctx.fillStyle = BASEBOARD
    ctx.fillRect(0, H * 0.35 - 4, W, 4)

    // Floor (checkered)
    const tileSize = 24
    const floorStart = H * 0.35
    for (let y = 0; y < Math.ceil(H * 0.65 / tileSize) + 1; y++) {
      for (let x = 0; x < Math.ceil(W / tileSize) + 1; x++) {
        const isA = (x + y) % 2 === 0
        ctx.fillStyle = isA ? FLOOR_A : FLOOR_B
        ctx.fillRect(x * tileSize, floorStart + y * tileSize, tileSize, tileSize)
      }
    }

    // Floor reflection / perspective lines
    ctx.fillStyle = 'rgba(255,255,255,0.02)'
    for (let i = 0; i < 4; i++) {
      const lx = W * 0.2 + i * (W * 0.2)
      ctx.fillRect(lx, floorStart, 1, H - floorStart)
    }

    // ── Rug ──
    const rugW = W * 0.7
    const rugH = H * 0.25
    const rugX = (W - rugW) / 2
    const rugY = floorStart + (H - floorStart - rugH) * 0.3
    ctx.fillStyle = RUG_COLOR
    roundRect(ctx, rugX, rugY, rugW, rugH, 8)
    ctx.fill()
    ctx.fillStyle = RUG_ACCENT
    roundRect(ctx, rugX + 4, rugY + 4, rugW - 8, rugH - 8, 6)
    ctx.strokeStyle = RUG_ACCENT
    ctx.lineWidth = 1
    ctx.stroke()

    // ── Pet on rug ──
    const petData = petDataRef.current
    if (pet && petData) {
      const pixelSize = 6
      const pW = petData.width * pixelSize
      const pH = petData.height * pixelSize
      const floorY = rugY + rugH * 0.6

      // Behavior-driven movement
      const bt = behaviorRef.current
      if (bt === 'walkLeft') {
        xRef.current -= 1.2
        if (xRef.current < -(W * 0.3)) { behaviorTimer.current = 0 }
      } else if (bt === 'walkRight') {
        xRef.current += 1.2
        if (xRef.current > W * 0.3) { behaviorTimer.current = 0 }
      }

      // Boundaries
      xRef.current = Math.max(-W * 0.25, Math.min(W * 0.25, xRef.current))

      // Bounce decay
      bounceRef.current = Math.max(0, bounceRef.current - 0.05)

      // Idle bob
      const idleBob = bt === 'idle' ? Math.sin(timeRef.current * 3) * 1.5 : 0

      // Walk bob
      const walkBob = (bt === 'walkLeft' || bt === 'walkRight')
        ? Math.abs(Math.sin(timeRef.current * 8)) * 3
        : 0

      // Mischief animation
      let mY = 0
      let mRot = 0
      if (bt === 'mischief') {
        mY = Math.abs(Math.sin(timeRef.current * 10)) * 8
        mRot = Math.sin(timeRef.current * 6) * 0.15
      }

      const cy = floorY - pH / 2 + idleBob + walkBob - mY + (bounceRef.current * -20)

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.beginPath()
      ctx.ellipse(W / 2 + xRef.current, floorY + 2, pW * 0.35, 3, 0, 0, Math.PI * 2)
      ctx.fill()

      // Pet glow
      const rarityColor = RARITY_COLORS[pet.rarity] || '#9ca3af'
      if (petData.palette.glow) {
        ctx.shadowColor = rarityColor
        ctx.shadowBlur = 20
      }

      // Draw pet pixels
      ctx.save()
      ctx.translate(W / 2 + xRef.current, cy)
      ctx.rotate(mRot)

      for (let y = 0; y < petData.height; y++) {
        for (let x = 0; x < petData.width; x++) {
          const color = petData.grid[y][x]
          if (color && color !== 'transparent') {
            ctx.fillStyle = color
            ctx.fillRect(
              x * pixelSize - pW / 2,
              y * pixelSize,
              pixelSize,
              pixelSize
            )
          }
        }
      }
      ctx.restore()
      ctx.shadowBlur = 0

      // ── Mood emoji above pet ──
      if (pet.mood) {
        ctx.font = '16px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(MOOD_MAP[pet.mood] || '😊', W / 2 + xRef.current, cy - pH / 2 - 12)
      }

      // ── Hearts on happy ──
      if (anim === 'happy' || bounceRef.current > 0) {
        heartsRef.current.push({
          x: (Math.random() - 0.5) * 30,
          y: 0,
          life: 1,
        })
      }
      heartsRef.current = heartsRef.current.filter(h => h.life > 0)
      for (const h of heartsRef.current) {
        h.y -= 0.5
        h.life -= 0.02
        const alpha = Math.max(0, h.life)
        ctx.globalAlpha = alpha
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('❤️', W / 2 + xRef.current + h.x, cy - pH / 2 - 20 + h.y)
      }
      ctx.globalAlpha = 1

      // ── Tap hint (first few seconds) ──
      if (showTapHint) {
        ctx.globalAlpha = 0.4 + Math.sin(timeRef.current * 4) * 0.2
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#94a5b8'
        ctx.fillText('👆 禁下我啦', W / 2, H - 30)
        ctx.globalAlpha = 1
      }

      // ── Name + rarity badge ──
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#f0f4f8'
      ctx.fillText(pet.name || 'Pipz', 12, 20)

      ctx.font = '9px sans-serif'
      ctx.fillStyle = rarityColor
      ctx.fillText(RARITY_LABELS[pet.rarity], 12, 34)

    } else {
      // ── No pet — show egg ──
      const eggBob = Math.sin(timeRef.current * 3) * 3
      ctx.fillStyle = '#d4a0c0'
      roundRect(ctx, W / 2 - 20, H * 0.4 - 30 + eggBob, 40, 50, 12)
      ctx.fill()
      ctx.fillStyle = '#b880a0'
      roundRect(ctx, W / 2 - 8, H * 0.4 - 12 + eggBob, 6, 6, 3)
      ctx.fill()
      roundRect(ctx, W / 2 + 4, H * 0.4 - 14 + eggBob, 6, 6, 3)
      ctx.fill()

      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#94a5b8'
      ctx.fillText('未有寵物', W / 2, H * 0.4 + 50 + eggBob)
      ctx.fillStyle = '#5a6d85'
      ctx.font = '9px sans-serif'
      ctx.fillText('行路孵化第一隻啦！', W / 2, H * 0.4 + 66 + eggBob)

      // Progress to first pet
      const firstPetSteps = 1000
      const prog = Math.min(1, totalSteps / firstPetSteps)
      const barW = 120
      const barH = 6
      const barX = W / 2 - barW / 2
      const barY = H * 0.4 + 82 + eggBob
      ctx.fillStyle = '#1e2a45'
      roundRect(ctx, barX, barY, barW, barH, 3)
      ctx.fill()
      ctx.fillStyle = '#8b5cf6'
      roundRect(ctx, barX, barY, barW * prog, barH, 3)
      ctx.fill()
      ctx.font = '8px sans-serif'
      ctx.fillStyle = '#5a6d85'
      ctx.textAlign = 'center'
      ctx.fillText(`${formatSteps(totalSteps)} / ${formatSteps(firstPetSteps)} 步`, W / 2, barY + barH + 12)
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [pet, anim, steps, totalSteps, showTapHint])

  // Start/stop animation
  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [animate])

  // Handle canvas click
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!pet) return
    bounceRef.current = 1
    onPet()
  }, [pet, onPet])

  return (
    <div style={{
      width: '100%', position: 'relative', overflow: 'hidden',
      background: '#0b1120', borderRadius: 0,
    }}>
      <canvas
        ref={canvasRef}
        width={400}
        height={460}
        onClick={handleClick}
        style={{
          width: '100%', height: 'auto', display: 'block',
          cursor: pet ? 'pointer' : 'default',
          imageRendering: 'pixelated',
        }}
      />
      {/* Quick action buttons overlay at bottom */}
      {pet && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12, right: 12,
          display: 'flex', gap: 6, justifyContent: 'center',
        }}>
          <button className="btn btn-green" onClick={(e) => { e.stopPropagation(); onFeed() }}
            style={{fontSize:10, padding:'4px 12px', borderRadius:16}}>
            🍖 餵食
          </button>
          <button className="btn btn-blue" onClick={(e) => { e.stopPropagation(); onPet() }}
            style={{fontSize:10, padding:'4px 12px', borderRadius:16}}>
            ✋ 摸頭
          </button>
          <button className="btn btn-amber" onClick={(e) => { e.stopPropagation(); onPlay() }}
            style={{fontSize:10, padding:'4px 12px', borderRadius:16}}>
            🎾 玩
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Helper: rounded rect path ── */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
