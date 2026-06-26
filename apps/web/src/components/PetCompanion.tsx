'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { generatePixelPet, PixelPetData, Pet, RARITY_COLORS, RARITY_LABELS, formatSteps, Mood, getSpeciesIndex, PetSkill } from '@pipz/core'

interface Props {
  pet: Pet | null
  anim: 'idle' | 'walk' | 'happy'
  steps: number
  totalSteps: number
  evolutionStage: number
  skills: PetSkill[]
}

type Behavior = 'idle' | 'walkLeft' | 'walkRight' | 'walkUp' | 'walkDown' | 'mischief' | 'sleep'
type Reaction = 'none' | 'heart' | 'sparkle' | 'bounce'

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number; emoji: string
}

const EVO_LABELS = ['BB', '幼年', '成年', '完全體', '傳說']

const SPRITE_VERSION = 'v5'
const MARGIN = 50

export default function PetCompanion({
  pet, anim, steps, totalSteps, evolutionStage, skills,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const petDataRef = useRef<PixelPetData | null>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const petKeyRef = useRef<string | null>(null)
  const rafRef = useRef(0)
  const timeRef = useRef(0)
  const behaviorRef = useRef<Behavior>('idle')
  const behaviorTimer = useRef(0)
  const xRef = useRef(0)
  const yRef = useRef(0)
  const bounceRef = useRef(0)
  const blinkTimerRef = useRef(3 + Math.random() * 4)
  const isBlinkingRef = useRef(false)
  const particlesRef = useRef<Particle[]>([])
  const clickBounceRef = useRef(0)
  const [status, setStatus] = useState<'loading' | 'png' | 'fallback'>('loading')
  const [behavior, setBehavior] = useState<Behavior>('idle')
  const [speciesName, setSpeciesName] = useState('')

  // Generate pet pixel data
  useEffect(() => {
    if (pet) {
      const data = generatePixelPet({
        seed: parseInt(pet.speciesId) || 1,
        rarity: pet.rarity,
        evolutionStage: pet.evolutionStage,
      })
      petDataRef.current = data
      setSpeciesName(data.speciesName)
      xRef.current = (Math.random() - 0.5) * 0.3
      yRef.current = (Math.random() - 0.5) * 0.2
    } else {
      petDataRef.current = null
      setSpeciesName('')
    }
  }, [pet])

  // Load PNG sprite
  useEffect(() => {
    let cancelled = false
    const currentPetId = pet?.id ?? null
    if (petKeyRef.current !== currentPetId) {
      offscreenRef.current = null
      setStatus('loading')
    }
    petKeyRef.current = currentPetId
    if (!pet) { setStatus('fallback'); return }
    const idx = getSpeciesIndex(parseInt(pet.speciesId) || 1)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      const oc = document.createElement('canvas')
      oc.width = img.width
      oc.height = img.height
      const ox = oc.getContext('2d')!
      ox.drawImage(img, 0, 0)
      offscreenRef.current = oc
      if (!cancelled) setStatus('png')
    }
    img.onerror = () => {
      if (!cancelled) setStatus('fallback')
    }
    img.src = `/pixel-gen/sprites/${idx}.png?v=${SPRITE_VERSION}`
    return () => { cancelled = true }
  }, [pet])

  // Auto behavior cycle — enhanced with sleep
  useEffect(() => {
    if (!pet) return
    const pick = () => {
      const r = Math.random()
      if (r < 0.30) {
        const dirs: Behavior[] = ['walkLeft', 'walkRight', 'walkUp', 'walkDown']
        const dir = dirs[Math.floor(Math.random() * dirs.length)]
        behaviorRef.current = dir
      } else if (r < 0.42) {
        behaviorRef.current = 'mischief'
      } else if (r < 0.50) {
        behaviorRef.current = 'sleep'
      } else {
        behaviorRef.current = 'idle'
      }
      setBehavior(behaviorRef.current)
      // Different durations per behavior
      if (behaviorRef.current === 'sleep') {
        behaviorTimer.current = 4 + Math.random() * 6
      } else if (behaviorRef.current === 'mischief') {
        behaviorTimer.current = 2 + Math.random() * 3
      } else if (behaviorRef.current.startsWith('walk')) {
        behaviorTimer.current = 1.5 + Math.random() * 2.5
      } else {
        behaviorTimer.current = 2 + Math.random() * 4
      }
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

    // Draw pet
    const pd = petDataRef.current
    const oc = offscreenRef.current
    if (pet && (status !== 'loading')) {
      const bx = behaviorRef.current
      const speed = 1.0

      // Roaming boundaries
      const maxR = (W / 2) - MARGIN
      const maxY = (H / 2) - MARGIN

      // ── Behavior movement ──
      if (bx === 'walkLeft') { xRef.current -= speed; if (xRef.current < -maxR) behaviorTimer.current = 0 }
      if (bx === 'walkRight') { xRef.current += speed; if (xRef.current > maxR) behaviorTimer.current = 0 }
      if (bx === 'walkUp') { yRef.current -= speed; if (yRef.current < -maxY) behaviorTimer.current = 0 }
      if (bx === 'walkDown') { yRef.current += speed; if (yRef.current > maxY) behaviorTimer.current = 0 }

      xRef.current = Math.max(-maxR, Math.min(maxR, xRef.current))
      yRef.current = Math.max(-maxY, Math.min(maxY, yRef.current))

      // Bounce decay
      bounceRef.current = Math.max(0, bounceRef.current - 0.05)
      clickBounceRef.current = Math.max(0, clickBounceRef.current - 0.03)

      // ── Animation offsets ──
      const isWalk = bx === 'walkLeft' || bx === 'walkRight'
      const isWalkV = bx === 'walkUp' || bx === 'walkDown'
      const idleBob = (bx === 'idle' || bx === 'sleep') ? Math.sin(timeRef.current * 3) * 1.5 : 0
      const walkBob = isWalk ? Math.abs(Math.sin(timeRef.current * 8)) * 2 : 0
      const walkBobY = isWalkV ? Math.abs(Math.sin(timeRef.current * 8)) * 2 : 0
      let mY = 0, mRot = 0
      if (bx === 'mischief') {
        mY = Math.abs(Math.sin(timeRef.current * 10)) * 10
        mRot = Math.sin(timeRef.current * 6) * 0.2
      }
      // Sleep: slight slow drift
      const sleepDrift = bx === 'sleep' ? Math.sin(timeRef.current * 0.5) * 2 : 0

      // Breathing
      const breathe = bx === 'sleep'
        ? Math.sin(timeRef.current * 0.8) * 0.02
        : Math.sin(timeRef.current * 3) * 0.015

      const cx = W / 2 + xRef.current
      const cyBase = H / 2 + yRef.current + idleBob + walkBob + walkBobY - mY + (bounceRef.current * -20) + (clickBounceRef.current * -30) + sleepDrift

      // ── Blink timer ──
      blinkTimerRef.current -= 0.02
      if (blinkTimerRef.current <= 0) {
        if (isBlinkingRef.current) {
          isBlinkingRef.current = false
          blinkTimerRef.current = 3 + Math.random() * 4
        } else {
          isBlinkingRef.current = true
          blinkTimerRef.current = 0.08
        }
      }

      // ── Particles ──
      // Sleep → Zzz
      if (bx === 'sleep' && Math.random() < 0.04) {
        particlesRef.current.push({
          x: cx - 20 + Math.random() * 5,
          y: cyBase - 20,
          vx: Math.random() * 0.1, vy: -0.2 - Math.random() * 0.2,
          life: 1, maxLife: 1, emoji: '💤',
        })
      }
      // Mischief → sparkle
      if (bx === 'mischief' && Math.random() < 0.05) {
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * 50,
          y: cyBase + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 0.2, vy: -Math.random() * 0.3,
          life: 1, maxLife: 1, emoji: Math.random() < 0.5 ? '✦' : '✨',
        })
      }
      // Click reaction → hearts
      if (clickBounceRef.current > 0.5 && Math.random() < 0.08) {
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * 40,
          y: cyBase - 10,
          vx: (Math.random() - 0.5) * 0.3, vy: -0.5 - Math.random() * 0.5,
          life: 1, maxLife: 1, emoji: '❤️',
        })
      }

      // Update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i]
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.012
        if (p.life <= 0) particlesRef.current.splice(i, 1)
      }

      // ── Shadow ──
      const shadowY = H / 2 + yRef.current + 2
      ctx.fillStyle = 'rgba(0,0,0,0.1)'
      const shadowSquash = isWalk ? 1.3 : bx === 'sleep' ? 0.7 : 1
      ctx.beginPath()
      ctx.ellipse(cx, shadowY, 24 * shadowSquash + Math.abs(walkBob) * 3, 3 * (bx === 'sleep' ? 0.5 : 1), 0, 0, Math.PI * 2)
      ctx.fill()

      // ── PIXEL CRISP ──
      ctx.imageSmoothingEnabled = false
      ctx.save()
      ctx.translate(cx, cyBase + mRot * 10)

      // Sleep: hunch down (scale down slightly)
      const sleepScale = bx === 'sleep' ? 0.85 : 1
      ctx.scale(sleepScale + breathe, sleepScale + breathe)
      ctx.rotate(mRot)

      if (oc && status === 'png') {
        const spriteSize = Math.min(120, Math.min(W, H) * 0.38)
        const sw = spriteSize

        if (pd?.palette?.glow) { ctx.shadowColor = RARITY_COLORS[pet.rarity]; ctx.shadowBlur = 12 }

        ctx.drawImage(oc, -sw / 2, -sw / 2, sw, sw)
        ctx.shadowBlur = 0

        // ── Blink overlay (draw eyelid bars over eye area) ──
        if (isBlinkingRef.current && bx !== 'sleep') {
          const eyeY = -sw * 0.02
          const eyeSpacing = sw * 0.12
          const barW = sw * 0.07
          const barH = Math.max(1, sw * 0.015)
          ctx.fillStyle = '#1e293b'
          ctx.fillRect(-eyeSpacing - barW / 2, eyeY, barW, barH)
          ctx.fillRect(eyeSpacing - barW / 2, eyeY, barW, barH)
        }

        // ── Sleep overlay: closed sleepy eyes ──
        if (bx === 'sleep') {
          const eyeY = -sw * 0.02
          const eyeSpacing = sw * 0.12
          const eyeLen = sw * 0.06
          ctx.strokeStyle = '#1e293b'
          ctx.lineWidth = Math.max(1, sw * 0.02)
          ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(-eyeSpacing - eyeLen, eyeY); ctx.lineTo(-eyeSpacing + eyeLen, eyeY); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(eyeSpacing - eyeLen, eyeY); ctx.lineTo(eyeSpacing + eyeLen, eyeY); ctx.stroke()
        }

      } else if (pd && status === 'fallback') {
        // Procedural fallback
        const ps = 7
        const pw = pd.width * ps, ph = pd.height * ps
        if (pd.palette.glow) { ctx.shadowColor = RARITY_COLORS[pet.rarity]; ctx.shadowBlur = 12 }

        for (let y = 0; y < pd.height; y++) {
          for (let x = 0; x < pd.width; x++) {
            const c = pd.grid[y][x]
            if (c && c !== 'transparent') { ctx.fillStyle = c; ctx.fillRect(x * ps - pw / 2, y * ps, ps, ps) }
          }
        }
        ctx.shadowBlur = 0

        // Blink for procedural
        if (isBlinkingRef.current && bx !== 'sleep') {
          const eyeY = pd.height / 2 * ps - ps * 2
          const eyeSpacing = ps * 2.5
          ctx.fillStyle = '#1e293b'
          ctx.fillRect(-eyeSpacing - ps, eyeY, ps * 2, Math.max(1, ps * 0.5))
          ctx.fillRect(eyeSpacing - ps, eyeY, ps * 2, Math.max(1, ps * 0.5))
        }

        // Sleep overlay for procedural
        if (bx === 'sleep') {
          const eyeY = pd.height / 2 * ps - ps * 2
          const eyeSpacing = ps * 2.5
          ctx.strokeStyle = '#1e293b'
          ctx.lineWidth = Math.max(1, ps * 0.3)
          ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(-eyeSpacing - ps, eyeY); ctx.lineTo(-eyeSpacing + ps, eyeY); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(eyeSpacing - ps, eyeY); ctx.lineTo(eyeSpacing + ps, eyeY); ctx.stroke()
        }
      }

      ctx.restore()

    } else if (!pet) {
      // No pet — egg with float animation
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
      ctx.font = '8px sans-serif'; ctx.fillStyle = '#5a6d85'; ctx.textAlign = 'center'
      ctx.fillText(`${formatSteps(totalSteps)} / 1,000 步`, W / 2, H * 0.4 + 98 + eb)
    }

    // ── Draw particles (on top of everything) ──
    for (const p of particlesRef.current) {
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.font = `${Math.max(8, p.life * 12)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(p.emoji, p.x, p.y)
    }
    ctx.globalAlpha = 1

    rafRef.current = requestAnimationFrame(animate)
  }, [pet, anim, status])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [animate])

  const handleCanvasClick = () => {
    clickBounceRef.current = 1
    bounceRef.current = 1
    // Spawn instant heart burst
    if (pet && canvasRef.current) {
      const cw = canvasRef.current.width
      const ch = canvasRef.current.height
      for (let i = 0; i < 5; i++) {
        particlesRef.current.push({
          x: cw / 2 + (Math.random() - 0.5) * 60,
          y: ch / 2 - 10,
          vx: (Math.random() - 0.5) * 0.5, vy: -0.8 - Math.random() * 0.5,
          life: 1, maxLife: 1, emoji: '❤️',
        })
      }
    }
  }

  // Stats for display
  const statEntries = pet ? [
    { icon: '⚡', label: '速度', val: pet.stats.speed },
    { icon: '🍀', label: '運氣', val: pet.stats.luck },
    { icon: '💜', label: '魅力', val: pet.stats.charm },
    { icon: '🔋', label: '能量', val: pet.stats.energy },
  ] : []

  return (
    <div style={{ width: '100%', background: '#141b2d', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
      {/* ── Hero: steps walked together (card top) ── */}
      {pet && (
        <div style={{
          background: 'linear-gradient(180deg, rgba(139,92,246,0.08) 0%, transparent 100%)',
          borderBottom: '1px solid #1e2a45',
          textAlign: 'center', padding: '18px 16px 14px',
        }}>
          <div style={{ fontSize: 22, marginBottom: 2 }}>👣</div>
          <div style={{
            fontSize: 32, fontWeight: 900, color: '#f0f4f8',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}>
            {formatSteps(pet.totalSteps)}
          </div>
          <div style={{ fontSize: 11, color: '#94a5b8', marginTop: 2 }}>
            一起走過的日子
          </div>
        </div>
      )}

      {/* ── Canvas ── */}
      <canvas
        ref={canvasRef}
        width={400} height={280}
        onClick={handleCanvasClick}
        style={{
          width: '100%', height: 'auto', display: 'block',
          cursor: pet ? 'pointer' : 'default',
          imageRendering: 'pixelated',
        }}
      />

      {/* ── Species name badge (overlaid) ── */}
      {pet && (
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            background: 'rgba(11,17,32,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
            color: '#f0f4f8', fontSize: 12, fontWeight: 700, padding: '3px 10px',
            fontFamily: 'inherit', backdropFilter: 'blur(4px)',
          }}>
            #{speciesName}
          </div>
        </div>
      )}

      {/* ── Rarity badge (overlaid, top right) ── */}
      {pet && (
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <div style={{
            fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 8, lineHeight: '12px',
            color: RARITY_COLORS[pet.rarity],
            background: RARITY_COLORS[pet.rarity] + '18',
            border: `1px solid ${RARITY_COLORS[pet.rarity]}33`,
          }}>
            {RARITY_LABELS[pet.rarity]}
          </div>
        </div>
      )}

      {/* ── Behavior indicator (subtle) ── */}
      {pet && behavior === 'sleep' && (
        <div style={{
          position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          fontSize: 9, color: '#5a6d85', opacity: 0.6,
          pointerEvents: 'none',
        }}>
          💤 瞓緊覺...
        </div>
      )}

      {/* ── Info panel ── */}
      {pet && (
        <div style={{ padding: '0 16px 12px' }}>
          {/* Divider */}
          <div style={{ height: 1, background: '#1e2a45', marginBottom: 10 }} />

          {/* Evolution + level row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, color: '#5a6d85' }}>Lv.{pet.level}</span>
              <span style={{ fontSize: 9, color: '#94a5b8' }}>·</span>
              <span style={{ fontSize: 9, color: '#94a5b8' }}>🌟 {EVO_LABELS[pet.evolutionStage - 1] || '初級'}</span>
            </div>
            {/* Small behavior tag */}
            <span style={{
              fontSize: 8, color: '#5a6d85',
              opacity: behavior === 'sleep' ? 0.8 : 0.4,
            }}>
              {behavior === 'sleep' ? '💤 瞓覺' : behavior === 'mischief' ? '✨ 玩緊' : behavior === 'idle' ? '• 休息' : '🚶 行緊'}
            </span>
          </div>

          {/* ── Stats grid (2x2) ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10,
          }}>
            {statEntries.map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(11,17,32,0.5)', borderRadius: 8, padding: '5px 10px',
              }}>
                <span style={{ fontSize: 12 }}>{s.icon}</span>
                <span style={{ fontSize: 9, color: '#5a6d85', flex: 1 }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f4f8', fontVariantNumeric: 'tabular-nums' }}>{s.val}</span>
              </div>
            ))}
          </div>

          {/* ── Skills (clean pill list) ── */}
          {skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {skills.slice(0, 6).map((s, i) => (
                <div key={i} style={{
                  fontSize: 8, color: '#94a5b8', padding: '2px 8px',
                  background: 'rgba(11,17,32,0.5)', borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <span>{s.icon}</span>
                  <span>{s.name}</span>
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
