'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  generatePixelPet, generateAnimationFrames,
  PixelPetData, AnimationFrame, AnimationType, Pet,
  RARITY_COLORS, RARITY_LABELS, formatSteps, getSpeciesIndex, PetSkill,
} from '@pipz/core'

interface Props {
  pet: Pet | null
  anim: 'idle' | 'walk' | 'happy'
  steps: number
  totalSteps: number
  evolutionStage: number
  skills: PetSkill[]
}

type Behavior = 'idle' | 'walkLeft' | 'walkRight' | 'walkUp' | 'walkDown' | 'mischief' | 'sleep'

const EVO_LABELS = ['BB', '幼年', '成年', '完全體', '傳說']
const SPRITE_VERSION = 'v6'
const MARGIN = 50
const GRID = 16
const PIXEL_SIZE = 7

/** Build a horizontal strip sprite sheet for all animation types */
function buildSheet(seed: number, rarity: string, evoStage: number): HTMLCanvasElement {
  const config = { seed: parseInt(String(seed)) || 1, rarity: rarity as any, evolutionStage: evoStage }
  const animTypes: { type: AnimationType; count: number }[] = [
    { type: 'idle', count: 4 },
    { type: 'walk', count: 4 },
    { type: 'happy', count: 2 },
    { type: 'sleep', count: 4 },
  ]
  const frameW = GRID * PIXEL_SIZE
  const totalW = animTypes.reduce((w, a) => w + frameW * a.count, 0)
  const sheet = document.createElement('canvas')
  sheet.width = totalW
  sheet.height = GRID * PIXEL_SIZE
  const ctx = sheet.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  let xOff = 0
  for (const { type, count } of animTypes) {
    const frames = generateAnimationFrames(config, type)
    for (let i = 0; i < count; i++) {
      const f = frames[Math.min(i, frames.length - 1)]
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          const c = f.grid[y][x]
          if (c && c !== 'transparent') {
            ctx.fillStyle = c
            ctx.fillRect(xOff + x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
          }
        }
      }
      xOff += frameW
    }
  }
  return sheet
}

// Sheet offsets for each animation type
const SHEET_MAP: Record<string, { start: number; count: number }> = {
  idle:  { start: 0, count: 4 },
  walk:  { start: 4, count: 4 },
  happy: { start: 8, count: 2 },
  sleep: { start: 10, count: 4 },
}

// Behavior → animation type mapping
function behaviorToAnim(bx: Behavior): AnimationType {
  if (bx === 'sleep') return 'sleep'
  if (bx === 'mischief') return 'happy'
  if (bx.startsWith('walk')) return 'walk'
  return 'idle'
}

export default function PetCompanion({
  pet, anim, steps, totalSteps, evolutionStage, skills,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sheetRef = useRef<HTMLCanvasElement | null>(null)
  const pngOverlayRef = useRef<HTMLCanvasElement | null>(null)
  const petKeyRef = useRef<string | null>(null)
  const rafRef = useRef(0)
  const timeRef = useRef(0)
  const behaviorRef = useRef<Behavior>('idle')
  const behaviorTimer = useRef(0)
  const xRef = useRef(0)
  const yRef = useRef(0)
  const bounceRef = useRef(0)
  const frameIdxRef = useRef(0)
  const frameTimerRef = useRef(0)
  const particlesRef = useRef<{ x: number; y: number; life: number; emoji: string }[]>([])
  const [behavior, setBehavior] = useState<Behavior>('idle')
  const [speciesName, setSpeciesName] = useState('')
  const [pngReady, setPngReady] = useState(false)

  // Build sprite sheet and load PNG when pet changes
  useEffect(() => {
    if (!pet) { sheetRef.current = null; pngOverlayRef.current = null; setSpeciesName(''); return }

    const speciesIdx = getSpeciesIndex(parseInt(pet.speciesId) || 1)
    const seed = parseInt(pet.speciesId) || 1

    // Build sprite sheet (synchronous, fast)
    const sheet = buildSheet(seed, pet.rarity, pet.evolutionStage)
    sheetRef.current = sheet

    // Generate name
    const pd = generatePixelPet({ seed, rarity: pet.rarity, evolutionStage: pet.evolutionStage })
    setSpeciesName(pd.speciesName)

    // Reset position
    xRef.current = (Math.random() - 0.5) * 0.3
    yRef.current = (Math.random() - 0.5) * 0.2

    // Load PNG in background (optional overlay)
    setPngReady(false)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const oc = document.createElement('canvas')
      oc.width = img.width
      oc.height = img.height
      oc.getContext('2d')!.drawImage(img, 0, 0)
      pngOverlayRef.current = oc
      setPngReady(true)
    }
    img.src = `/pixel-gen/sprites/${speciesIdx}.png?v=${SPRITE_VERSION}`
  }, [pet])

  // Auto behavior cycle (enhanced with sleep)
  useEffect(() => {
    if (!pet) return
    const pick = () => {
      const r = Math.random()
      let bx: Behavior
      if (r < 0.30) {
        const dirs: Behavior[] = ['walkLeft', 'walkRight', 'walkUp', 'walkDown']
        bx = dirs[Math.floor(Math.random() * dirs.length)]
      } else if (r < 0.42) { bx = 'mischief' }
      else if (r < 0.50) { bx = 'sleep' }
      else { bx = 'idle' }
      behaviorRef.current = bx
      setBehavior(bx)
      // Duration
      if (bx === 'sleep') behaviorTimer.current = 4 + Math.random() * 6
      else if (bx === 'mischief') behaviorTimer.current = 2 + Math.random() * 3
      else if (bx.startsWith('walk')) behaviorTimer.current = 1.5 + Math.random() * 2.5
      else behaviorTimer.current = 2 + Math.random() * 4
    }
    pick()
    const iv = setInterval(() => { if (behaviorTimer.current <= 0) pick() }, 200)
    return () => clearInterval(iv)
  }, [pet])

  useEffect(() => {
    if (!pet) return
    const iv = setInterval(() => { behaviorTimer.current = Math.max(0, behaviorTimer.current - 0.2) }, 200)
    return () => clearInterval(iv)
  }, [pet])

  // ── Canvas animation ──
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height
    timeRef.current += 0.02

    // Clear
    ctx.clearRect(0, 0, W, H)
    ctx.imageSmoothingEnabled = false

    const sheet = sheetRef.current

    if (pet && sheet) {
      const bx = behaviorRef.current
      const speed = 1.0
      const maxR = (W / 2) - MARGIN
      const maxY = (H / 2) - MARGIN

      // Roaming
      if (bx === 'walkLeft') { xRef.current -= speed; if (xRef.current < -maxR) behaviorTimer.current = 0 }
      if (bx === 'walkRight') { xRef.current += speed; if (xRef.current > maxR) behaviorTimer.current = 0 }
      if (bx === 'walkUp') { yRef.current -= speed; if (yRef.current < -maxY) behaviorTimer.current = 0 }
      if (bx === 'walkDown') { yRef.current += speed; if (yRef.current > maxY) behaviorTimer.current = 0 }
      xRef.current = Math.max(-maxR, Math.min(maxR, xRef.current))
      yRef.current = Math.max(-maxY, Math.min(maxY, yRef.current))

      bounceRef.current = Math.max(0, bounceRef.current - 0.05)

      // Animation offsets
      const isWalk = bx === 'walkLeft' || bx === 'walkRight'
      const isWalkV = bx === 'walkUp' || bx === 'walkDown'
      const animType = behaviorToAnim(bx)

      // ── Frame cycling ──
      const info = SHEET_MAP[animType] || SHEET_MAP.idle
      frameTimerRef.current += 16
      let frameDuration = 250
      if (animType === 'idle') frameDuration = frameIdxRef.current % 2 === 0 ? 2500 : 120
      else if (animType === 'walk') frameDuration = 150
      else if (animType === 'happy') frameDuration = 200
      else if (animType === 'sleep') frameDuration = 2000
      if (frameTimerRef.current >= frameDuration) {
        frameTimerRef.current = 0
        frameIdxRef.current = (frameIdxRef.current + 1) % info.count
      }

      // Position
      const idleBob = (bx === 'idle' || bx === 'sleep') ? Math.sin(timeRef.current * 3) * 1.5 : 0
      const walkBob = isWalk ? Math.abs(Math.sin(timeRef.current * 8)) * 2 : 0
      const walkBobY = isWalkV ? Math.abs(Math.sin(timeRef.current * 8)) * 2 : 0
      let mY = 0, mRot = 0
      if (bx === 'mischief') { mY = Math.abs(Math.sin(timeRef.current * 10)) * 10; mRot = Math.sin(timeRef.current * 6) * 0.2 }
      const sleepDrift = bx === 'sleep' ? Math.sin(timeRef.current * 0.5) * 2 : 0
      const breathe = bx === 'sleep' ? Math.sin(timeRef.current * 0.8) * 1.5 : Math.sin(timeRef.current * 3) * 1

      const cx = W / 2 + xRef.current
      const cy = H / 2 + yRef.current + idleBob + walkBob + walkBobY - mY + (bounceRef.current * -20) + sleepDrift

      // ── Shadow ──
      const shadowY = H / 2 + yRef.current + 2
      ctx.fillStyle = 'rgba(0,0,0,0.1)'
      ctx.beginPath()
      ctx.ellipse(cx, shadowY, 24 + Math.abs(walkBob) * 3, 3, 0, 0, Math.PI * 2)
      ctx.fill()

      // ── Draw pet from sprite sheet ──
      const frameW = GRID * PIXEL_SIZE
      const frameH = GRID * PIXEL_SIZE
      const frameCol = info.start + frameIdxRef.current
      const sx = frameCol * frameW
      const sleepScale = bx === 'sleep' ? 0.85 : 1

      ctx.save()
      ctx.translate(cx, cy + mRot * 10)
      ctx.scale(sleepScale, sleepScale)
      ctx.rotate(mRot)

      // Glow
      if (pet) {
        ctx.shadowColor = RARITY_COLORS[pet.rarity]
        ctx.shadowBlur = 12
      }

      ctx.drawImage(sheet, sx, 0, frameW, frameH, -frameW / 2, -frameH / 2, frameW, frameH)
      ctx.shadowBlur = 0

      // PNG overlay (if loaded)
      const png = pngOverlayRef.current
      if (png && pngReady) {
        ctx.globalAlpha = 0.3
        const pngSize = Math.min(120, Math.min(W, H) * 0.38)
        ctx.drawImage(png, -pngSize / 2, -pngSize / 2, pngSize, pngSize)
        ctx.globalAlpha = 1
      }

      // Breathing overlay
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, breathe * 0.04)})`
      ctx.fillRect(-frameW / 2, -frameH / 2, frameW, frameH)

      ctx.restore()

      // ── Particles ──
      if (bx === 'sleep' && Math.random() < 0.04) {
        particlesRef.current.push({ x: cx - 20, y: cy - 20, life: 1, emoji: '💤' })
      }
      if (bx === 'mischief' && Math.random() < 0.05) {
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * 50, y: cy + (Math.random() - 0.5) * 30,
          life: 1, emoji: Math.random() < 0.5 ? '✦' : '✨',
        })
      }
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i]
        p.y -= 0.3
        p.life -= 0.015
        if (p.life <= 0) particlesRef.current.splice(i, 1)
      }
      for (const p of particlesRef.current) {
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(p.emoji, p.x, p.y)
      }
      ctx.globalAlpha = 1

    } else if (!pet) {
      // Egg
      const eb = Math.sin(timeRef.current * 3) * 3
      ctx.fillStyle = '#d4a0c0'
      ctx.beginPath(); ctx.roundRect(W / 2 - 20, H * 0.4 - 30 + eb, 40, 50, 12); ctx.fill()
      ctx.fillStyle = '#b880a0'
      ctx.beginPath(); ctx.roundRect(W / 2 - 8, H * 0.4 - 12 + eb, 6, 6, 3); ctx.fill()
      ctx.beginPath(); ctx.roundRect(W / 2 + 4, H * 0.4 - 14 + eb, 6, 6, 3); ctx.fill()
      ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#94a5b8'
      ctx.fillText('未有寵物', W / 2, H * 0.4 + 50 + eb)
      ctx.fillStyle = '#5a6d85'; ctx.font = '9px sans-serif'
      ctx.fillText('行路孵化第一隻啦！', W / 2, H * 0.4 + 66 + eb)
      const prog = Math.min(1, totalSteps / 1000)
      ctx.fillStyle = '#1e2a45'
      ctx.beginPath(); ctx.roundRect(W / 2 - 60, H * 0.4 + 82 + eb, 120, 6, 3); ctx.fill()
      ctx.fillStyle = '#8b5cf6'
      ctx.beginPath(); ctx.roundRect(W / 2 - 60, H * 0.4 + 82 + eb, 120 * prog, 6, 3); ctx.fill()
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [pet, pngReady])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [animate])

  const handleCanvasClick = () => {
    bounceRef.current = 1
    for (let i = 0; i < 5; i++) {
      particlesRef.current.push({
        x: (canvasRef.current?.width || 400) / 2 + (Math.random() - 0.5) * 60,
        y: (canvasRef.current?.height || 280) / 2 - 10,
        life: 1, emoji: '❤️',
      })
    }
  }

  const statEntries = pet ? [
    { icon: '⚡', label: '速度', val: pet.stats.speed },
    { icon: '🍀', label: '運氣', val: pet.stats.luck },
    { icon: '💜', label: '魅力', val: pet.stats.charm },
    { icon: '🔋', label: '能量', val: pet.stats.energy },
  ] : []

  return (
    <div style={{ width: '100%', background: '#141b2d', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
      {pet && (
        <div style={{
          background: 'linear-gradient(180deg, rgba(139,92,246,0.08) 0%, transparent 100%)',
          borderBottom: '1px solid #1e2a45',
          textAlign: 'center', padding: '18px 16px 14px',
        }}>
          <div style={{ fontSize: 22, marginBottom: 2 }}>👣</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#f0f4f8', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {formatSteps(pet.totalSteps)}
          </div>
          <div style={{ fontSize: 11, color: '#94a5b8', marginTop: 2 }}>一起走過的日子</div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={400} height={280}
        onClick={handleCanvasClick}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: pet ? 'pointer' : 'default', imageRendering: 'pixelated' }}
      />

      {pet && (
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ background: 'rgba(11,17,32,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f0f4f8', fontSize: 12, fontWeight: 700, padding: '3px 10px', fontFamily: 'inherit', backdropFilter: 'blur(4px)' }}>
            #{speciesName}
          </div>
        </div>
      )}

      {pet && (
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <div style={{ fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 8, lineHeight: '12px', color: RARITY_COLORS[pet.rarity], background: RARITY_COLORS[pet.rarity] + '18', border: `1px solid ${RARITY_COLORS[pet.rarity]}33` }}>
            {RARITY_LABELS[pet.rarity]}
          </div>
        </div>
      )}

      {pet && behavior === 'sleep' && (
        <div style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#5a6d85', opacity: 0.6, pointerEvents: 'none' }}>
          💤 瞓緊覺...
        </div>
      )}

      {pet && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ height: 1, background: '#1e2a45', marginBottom: 10 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, color: '#5a6d85' }}>Lv.{pet.level}</span>
              <span style={{ fontSize: 9, color: '#94a5b8' }}>·</span>
              <span style={{ fontSize: 9, color: '#94a5b8' }}>🌟 {EVO_LABELS[pet.evolutionStage - 1] || '初級'}</span>
            </div>
            <span style={{ fontSize: 8, color: '#5a6d85', opacity: behavior === 'sleep' ? 0.8 : 0.4 }}>
              {behavior === 'sleep' ? '💤 瞓覺' : behavior === 'mischief' ? '✨ 玩緊' : behavior === 'idle' ? '• 休息' : '🚶 行緊'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
            {statEntries.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(11,17,32,0.5)', borderRadius: 8, padding: '5px 10px' }}>
                <span style={{ fontSize: 12 }}>{s.icon}</span>
                <span style={{ fontSize: 9, color: '#5a6d85', flex: 1 }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f4f8', fontVariantNumeric: 'tabular-nums' }}>{s.val}</span>
              </div>
            ))}
          </div>
          {skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {skills.slice(0, 6).map((s, i) => (
                <div key={i} style={{ fontSize: 8, color: '#94a5b8', padding: '2px 8px', background: 'rgba(11,17,32,0.5)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span>{s.icon}</span><span>{s.name}</span>
                  {s.effect && <span style={{ color: '#f59e0b', fontSize: 6, marginLeft: 1 }}>●</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
