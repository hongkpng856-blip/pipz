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

type Behavior = 'idle' | 'walkLeft' | 'walkRight' | 'walkUp' | 'walkDown' | 'mischief'
type Reaction = 'none' | 'heart' | 'sparkle' | 'bounce'

const MOOD_MAP: Record<string, string> = {
  happy: '😊', excited: '🤩', hungry: '😋', sleepy: '😴', sad: '😢',
}
const MOOD_CN: Record<string, string> = {
  happy: '開心', excited: '興奮', hungry: '肚餓', sleepy: '眼瞓', sad: '傷心',
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
  const particlesRef = useRef<{x:number;y:number;life:number;emoji:string}[]>([])
  const [status, setStatus] = useState<'loading' | 'png' | 'fallback'>('loading')
  const [behavior, setBehavior] = useState<Behavior>('idle')
  const [showTapHint, setShowTapHint] = useState(true)
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

  // Auto behavior cycle
  useEffect(() => {
    if (!pet) return
    const pick = () => {
      const r = Math.random()
      if (r < 0.40) {
        const dirs: Behavior[] = ['walkLeft', 'walkRight', 'walkUp', 'walkDown']
        const dir = dirs[Math.floor(Math.random() * dirs.length)]
        behaviorRef.current = dir
      } else if (r < 0.55) {
        behaviorRef.current = 'mischief'
      } else {
        behaviorRef.current = 'idle'
      }
      setBehavior(behaviorRef.current)
      behaviorTimer.current = 1.5 + Math.random() * 3
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

  const getMoodValue = useCallback(() => {
    if (!pet) return 100
    const hoursSinceFed = (Date.now() - pet.lastFedAt) / 3600000
    const decay = Math.min(70, Math.floor(hoursSinceFed * 5))
    return Math.max(10, pet.moodValue - decay)
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

      // Roaming boundaries (symmetric)
      const maxR = (W / 2) - MARGIN
      const maxY = (H / 2) - MARGIN

      if (bx === 'walkLeft') { xRef.current -= speed; if (xRef.current < -maxR) behaviorTimer.current = 0 }
      if (bx === 'walkRight') { xRef.current += speed; if (xRef.current > maxR) behaviorTimer.current = 0 }
      if (bx === 'walkUp') { yRef.current -= speed; if (yRef.current < -maxY) behaviorTimer.current = 0 }
      if (bx === 'walkDown') { yRef.current += speed; if (yRef.current > maxY) behaviorTimer.current = 0 }

      xRef.current = Math.max(-maxR, Math.min(maxR, xRef.current))
      yRef.current = Math.max(-maxY, Math.min(maxY, yRef.current))

      bounceRef.current = Math.max(0, bounceRef.current - 0.05)

      const idleBob = bx === 'idle' ? Math.sin(timeRef.current * 3) * 1.5 : 0
      const walkBob = (bx === 'walkLeft' || bx === 'walkRight') ? Math.abs(Math.sin(timeRef.current * 8)) * 2 : 0
      const walkBobY = (bx === 'walkUp' || bx === 'walkDown') ? Math.abs(Math.sin(timeRef.current * 8)) * 2 : 0
      let mY = 0, mRot = 0
      if (bx === 'mischief') { mY = Math.abs(Math.sin(timeRef.current * 10)) * 10; mRot = Math.sin(timeRef.current * 6) * 0.2 }

      const cx = W / 2 + xRef.current
      const cy = H / 2 + yRef.current + idleBob + walkBob + walkBobY - mY + (bounceRef.current * -20)

      // Shadow
      const shadowY = H / 2 + yRef.current + 2
      ctx.fillStyle = 'rgba(0,0,0,0.1)'
      ctx.beginPath(); ctx.ellipse(cx, shadowY, 24 + Math.abs(walkBob) * 3, 3, 0, 0, Math.PI * 2); ctx.fill()

      // ── PIXEL CRISP ──
      ctx.imageSmoothingEnabled = false

      if (oc && status === 'png') {
        const spriteSize = Math.min(120, Math.min(W, H) * 0.38)
        const sw = spriteSize
        const sh = spriteSize

        if (pd?.palette?.glow) { ctx.shadowColor = RARITY_COLORS[pet.rarity]; ctx.shadowBlur = 12 }

        ctx.save()
        ctx.translate(cx, cy + mRot * 10)
        ctx.rotate(mRot)
        ctx.drawImage(oc, -sw / 2, -sh / 2, sw, sh)
        ctx.restore()
        ctx.shadowBlur = 0

      } else if (pd && status === 'fallback') {
        const ps = 7
        const pw = pd.width * ps, ph = pd.height * ps
        if (pd.palette.glow) { ctx.shadowColor = RARITY_COLORS[pet.rarity]; ctx.shadowBlur = 12 }
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(mRot)
        for (let y = 0; y < pd.height; y++) {
          for (let x = 0; x < pd.width; x++) {
            const c = pd.grid[y][x]
            if (c && c !== 'transparent') { ctx.fillStyle = c; ctx.fillRect(x * ps - pw / 2, y * ps, ps, ps) }
          }
        }
        ctx.restore()
        ctx.shadowBlur = 0
      }

      // Mood emoji above sprite
      if (pet.mood) {
        ctx.font = '16px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(MOOD_MAP[pet.mood] || '😊', cx, cy - 38)
      }

      // Tap hint
      if (showTapHint) {
        ctx.globalAlpha = 0.4 + Math.sin(timeRef.current*4)*0.2
        ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#94a5b8'
        ctx.fillText('👆 禁下我啦', W/2, H-16)
        ctx.globalAlpha = 1
      }

    } else if (!pet) {
      // No pet — egg
      const eb = Math.sin(timeRef.current*3)*3
      ctx.fillStyle = '#d4a0c0'
      ctx.beginPath(); ctx.roundRect(W/2-20, H*0.4-30+eb, 40, 50, 12); ctx.fill()
      ctx.fillStyle = '#b880a0'
      ctx.beginPath(); ctx.roundRect(W/2-8, H*0.4-12+eb, 6, 6, 3); ctx.fill()
      ctx.beginPath(); ctx.roundRect(W/2+4, H*0.4-14+eb, 6, 6, 3); ctx.fill()
      ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#94a5b8'
      ctx.fillText('未有寵物', W/2, H*0.4+50+eb)
      ctx.fillStyle = '#5a6d85'; ctx.font = '9px sans-serif'
      ctx.fillText('行路孵化第一隻啦！', W/2, H*0.4+66+eb)
      const prog = Math.min(1, totalSteps/1000)
      ctx.fillStyle = '#1e2a45'
      ctx.beginPath(); ctx.roundRect(W/2-60, H*0.4+82+eb, 120, 6, 3); ctx.fill()
      ctx.fillStyle = '#8b5cf6'
      ctx.beginPath(); ctx.roundRect(W/2-60, H*0.4+82+eb, 120*prog, 6, 3); ctx.fill()
      ctx.font = '8px sans-serif'; ctx.fillStyle = '#5a6d85'; ctx.textAlign = 'center'
      ctx.fillText(`${formatSteps(totalSteps)} / 1,000 步`, W/2, H*0.4+98+eb)
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [pet, anim, showTapHint, status])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [animate])

  const handleCanvasClick = () => {
    if (!pet) return
    if (showTapHint) setShowTapHint(false)
  }

  // Stats for display
  const statEntries = pet ? [
    { icon: '⚡', label: '速度', val: pet.stats.speed },
    { icon: '🍀', label: '運氣', val: pet.stats.luck },
    { icon: '💜', label: '魅力', val: pet.stats.charm },
    { icon: '🔋', label: '能量', val: pet.stats.energy },
  ] : []

  return (
    <div style={{ width:'100%', background:'#141b2d', borderRadius:16, overflow:'hidden', position:'relative' }}>
      {/* ── Canvas ── */}
      <canvas
        ref={canvasRef}
        width={400} height={280}
        onClick={handleCanvasClick}
        style={{ width:'100%', height:'auto', display:'block', cursor:pet?'pointer':'default', imageRendering:'pixelated' }}
      />

      {/* ── Species name badge (overlaid) ── */}
      {pet && (
        <div style={{ position:'absolute', top:10, left:10, display:'flex', alignItems:'center', gap:6 }}>
          <div style={{
            background:'rgba(11,17,32,0.7)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8,
            color:'#f0f4f8', fontSize:12, fontWeight:700, padding:'3px 10px',
            fontFamily:'inherit', backdropFilter:'blur(4px)',
          }}>
            #{speciesName}
          </div>
        </div>
      )}

      {/* ── Rarity badge (overlaid, top right) ── */}
      {pet && (
        <div style={{ position:'absolute', top:10, right:10 }}>
          <div style={{
            fontSize:8, fontWeight:700, padding:'3px 8px', borderRadius:8, lineHeight:'12px',
            color: RARITY_COLORS[pet.rarity],
            background: RARITY_COLORS[pet.rarity] + '18',
            border: `1px solid ${RARITY_COLORS[pet.rarity]}33`,
          }}>
            {RARITY_LABELS[pet.rarity]}
          </div>
        </div>
      )}

      {/* ── Steps walked together (overlaid, bottom-center of canvas) ── */}
      {pet && (
        <div style={{
          position:'absolute', bottom:8, left:0, right:0,
          display:'flex', justifyContent:'center', pointerEvents:'none',
        }}>
          <div style={{
            background:'rgba(11,17,32,0.7)', backdropFilter:'blur(4px)',
            border:'1px solid rgba(255,255,255,0.08)', borderRadius:12,
            padding:'4px 14px', display:'flex', alignItems:'center', gap:6,
          }}>
            <span style={{ fontSize:11 }}>👣</span>
            <span style={{ fontSize:13, fontWeight:800, color:'#f0f4f8', fontVariantNumeric:'tabular-nums' }}>
              {formatSteps(pet.totalSteps)}
            </span>
            <span style={{ fontSize:8, color:'#94a5b8' }}>一起行咗</span>
          </div>
        </div>
      )}

      {/* ── Info panel ── */}
      {pet && (
        <div style={{ padding: '0 16px 12px' }}>
          {/* Divider */}
          <div style={{ height:1, background:'#1e2a45', marginBottom:10 }} />

          {/* Top row: mood + evolution */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:10 }}>{MOOD_MAP[pet.mood]}</span>
              <span style={{ fontSize:10, color:'#94a5b8' }}>{MOOD_CN[pet.mood] || pet.mood}</span>
              <span style={{ fontSize:8, color:'#5a6d85' }}>{getMoodValue()}%</span>
              <div className="progress-wrap" style={{ width:50, height:3 }}>
                <div className="progress-bar" style={{ height:3 }}>
                  <div className="progress-fill" style={{
                    width:`${getMoodValue()}%`, height:3,
                    background: getMoodValue() > 60 ? '#22c55e' : getMoodValue() > 30 ? '#f59e0b' : '#ef4444',
                    borderRadius: 2,
                  }}/>
                </div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:9, color:'#5a6d85' }}>Lv.{pet.level}</span>
              <span style={{ fontSize:9, color:'#94a5b8' }}>·</span>
              <span style={{ fontSize:9, color:'#94a5b8' }}>🌟 {EVO_LABELS[pet.evolutionStage-1]||'初級'}</span>
            </div>
          </div>

          {/* ── Stats grid (2x2) ── */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10,
          }}>
            {statEntries.map(s => (
              <div key={s.label} style={{
                display:'flex', alignItems:'center', gap:6,
                background:'rgba(11,17,32,0.5)', borderRadius:8, padding:'5px 10px',
              }}>
                <span style={{ fontSize:12 }}>{s.icon}</span>
                <span style={{ fontSize:9, color:'#5a6d85', flex:1 }}>{s.label}</span>
                <span style={{ fontSize:13, fontWeight:700, color:'#f0f4f8', fontVariantNumeric:'tabular-nums' }}>{s.val}</span>
              </div>
            ))}
          </div>

          {/* ── Skills (clean pill list) ── */}
          {skills.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:10 }}>
              {skills.slice(0, 6).map((s, i) => (
                <div key={i} style={{
                  fontSize:8, color:'#94a5b8', padding:'2px 8px',
                  background:'rgba(11,17,32,0.5)', borderRadius:6,
                  border:'1px solid rgba(255,255,255,0.06)',
                  display:'flex', alignItems:'center', gap:3,
                }}>
                  <span>{s.icon}</span>
                  <span>{s.name}</span>
                  {s.effect && <span style={{ color:'#f59e0b', fontSize:6, marginLeft:1 }}>●</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
