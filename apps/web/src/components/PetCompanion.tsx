'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { generatePixelPet, PixelPetData, Pet, RARITY_COLORS, RARITY_LABELS, formatSteps, getSpeciesIndex, PetSkill, generatePetAnimation, drawPixelGrid } from '@pipz/core'

interface Props {
  pet: Pet | null
  anim: 'idle' | 'walk' | 'happy'
  steps: number
  totalSteps: number
  evolutionStage: number
  skills: PetSkill[]
  themedEgg?: 'cat' | 'none'  // PixelLab-cat-themed egg
  hatchProgress?: number       // 0-1 for demo egg hatch progress
}

type Behavior = 'idle' | 'walkLeft' | 'walkRight' | 'walkUp' | 'walkDown' | 'mischief'
type Reaction = 'none' | 'heart' | 'sparkle' | 'bounce'

const EVO_LABELS = ['BB', '幼年', '成年', '完全體', '傳說']

const SPRITE_VERSION = 'v5'
const MARGIN = 50
const FRAME_DURATION = 180 // ms per frame

export default function PetCompanion({
  pet, anim, steps, totalSteps, evolutionStage, skills, themedEgg, hatchProgress,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const petDataRef = useRef<PixelPetData | null>(null)
  const animRef = useRef<ReturnType<typeof generatePetAnimation> | null>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const petKeyRef = useRef<string | null>(null)
  const rafRef = useRef(0)
  const timeRef = useRef(0)
  const animFrameRef = useRef(0) // current walk frame (0-3)
  const lastFrameTime = useRef(0)
  const behaviorRef = useRef<Behavior>('idle')
  const behaviorTimer = useRef(0)
  const xRef = useRef(0)
  const yRef = useRef(0)
  const bounceRef = useRef(0)
  const [status, setStatus] = useState<'loading' | 'png' | 'fallback'>('loading')
  const [behavior, setBehavior] = useState<Behavior>('idle')
  const [speciesName, setSpeciesName] = useState('')

  // Generate pet pixel data + animation frames
  useEffect(() => {
    if (pet) {
      const seed = parseInt(pet.speciesId) || 1
      const data = generatePixelPet({
        seed,
        rarity: pet.rarity,
        evolutionStage: pet.evolutionStage,
      })
      petDataRef.current = data
      animRef.current = generatePetAnimation(data)
      setSpeciesName(data.speciesName)
      xRef.current = (Math.random() - 0.5) * 0.3
      yRef.current = (Math.random() - 0.5) * 0.2
    } else {
      petDataRef.current = null
      animRef.current = null
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

  // ── Canvas animation ──
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height
    timeRef.current += 0.02

    // Advance animation frame
    const now = performance.now()
    if (now - lastFrameTime.current >= FRAME_DURATION) {
      lastFrameTime.current = now
      animFrameRef.current = (animFrameRef.current + 1) % 4
    }

    // Clear
    ctx.clearRect(0, 0, W, H)
    ctx.imageSmoothingEnabled = false

    // Draw pet
    const pd = petDataRef.current
    const anim = animRef.current
    const oc = offscreenRef.current
    if (pet && (status !== 'loading')) {
      const bx = behaviorRef.current
      const speed = 0.8
      const isMoving = bx === 'walkLeft' || bx === 'walkRight' || bx === 'walkUp' || bx === 'walkDown'

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

      if (oc && status === 'png') {
        // ── PNG path: draw with enhanced walk bob ──
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

      } else if (pd && anim && status === 'fallback') {
        // ── Fallback path: frame-by-frame pixel animation ──
        const ps = 7
        const pw = pd.width * ps, ph = pd.height * ps

        // Choose frame based on behavior
        let frameGrid = anim.walkFrames[0]
        if (isMoving) {
          frameGrid = anim.walkFrames[animFrameRef.current]
        } else if (bx === 'idle') {
          // Blink every ~2 sec
          const blinkTick = Math.floor(timeRef.current * 3) % 60
          frameGrid = blinkTick === 0 ? anim.blinkFrame : anim.walkFrames[0]
        } else {
          // mischief: cycle frames
          frameGrid = anim.walkFrames[Math.floor(timeRef.current * 6) % 4]
        }

        if (pd.palette.glow) { ctx.shadowColor = RARITY_COLORS[pet.rarity]; ctx.shadowBlur = 12 }

        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(mRot)
        drawPixelGrid(ctx, frameGrid, ps, -pw / 2, -ph / 2)
        ctx.restore()
        ctx.shadowBlur = 0
      }

    } else if (!pet) {
      // No pet — egg with progress
      const eb = Math.sin(timeRef.current*3)*3
      if (themedEgg === 'cat') {
        // PixelLab cat themed egg — orange/brown spots
        const hp = hatchProgress ?? 0
        // Egg body: cream/beige
        ctx.fillStyle = '#FFF1E8'
        ctx.beginPath(); ctx.roundRect(W/2-22, H*0.4-32+eb, 44, 54, 14); ctx.fill()
        // Orange spot 1 (big)
        ctx.fillStyle = '#d4845a'
        ctx.beginPath(); ctx.roundRect(W/2-14, H*0.4-18+eb, 12, 10, 5); ctx.fill()
        // Brown spot 2
        ctx.fillStyle = '#8a5a3a'
        ctx.beginPath(); ctx.roundRect(W/2+6, H*0.4-8+eb, 10, 8, 4); ctx.fill()
        // Orange spot 3
        ctx.fillStyle = '#d4845a'
        ctx.beginPath(); ctx.roundRect(W/2-16, H*0.4+6+eb, 8, 8, 4); ctx.fill()
        // Brown spot 4
        ctx.fillStyle = '#8a5a3a'
        ctx.beginPath(); ctx.roundRect(W/2+2, H*0.4+12+eb, 14, 7, 4); ctx.fill()
        // Small orange spot
        ctx.fillStyle = '#d4845a'
        ctx.beginPath(); ctx.roundRect(W/2-6, H*0.4-22+eb, 6, 6, 3); ctx.fill()
        // Crack lines when close to hatch
        if (hp > 0.6) {
          const crackAlpha = Math.min(1, (hp - 0.6) / 0.3)
          ctx.strokeStyle = `rgba(60,40,20,${crackAlpha})`
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(W/2-4, H*0.4-20+eb)
          ctx.lineTo(W/2-2, H*0.4-10+eb)
          ctx.lineTo(W/2-6, H*0.4-2+eb)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(W/2+3, H*0.4-22+eb)
          ctx.lineTo(W/2+5, H*0.4-12+eb)
          ctx.lineTo(W/2+1, H*0.4-4+eb)
          ctx.stroke()
          // Glow pulse when ready
          if (hp >= 1) {
            ctx.fillStyle = `rgba(212,132,90,${0.2 + Math.sin(timeRef.current*8)*0.1})`
            ctx.beginPath(); ctx.roundRect(W/2-26, H*0.4-36+eb, 52, 62, 16); ctx.fill()
          }
        }
        // Progress bar
        ctx.fillStyle = '#1e2a45'
        ctx.beginPath(); ctx.roundRect(W/2-60, H*0.4+36+eb, 120, 6, 3); ctx.fill()
        ctx.fillStyle = hp >= 1 ? '#22c55e' : '#d4845a'
        ctx.beginPath(); ctx.roundRect(W/2-60, H*0.4+36+eb, 120*hp, 6, 3); ctx.fill()
        ctx.font = '9px sans-serif'; ctx.fillStyle = '#94a5b8'; ctx.textAlign = 'center'
        ctx.fillText(hp >= 1 ? '🐱 㩒個蛋孵化！' : `孵化進度 ${Math.round(hp*100)}%`, W/2, H*0.4+56+eb)
      } else {
        // Default generic egg (original)
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
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [pet, anim, status])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [animate])

  const handleCanvasClick = () => {
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
      {/* ── Hero: steps walked together (card top) ── */}
      {pet && (
        <div style={{
          background:'linear-gradient(180deg, rgba(139,92,246,0.08) 0%, transparent 100%)',
          borderBottom:'1px solid #1e2a45',
          textAlign:'center', padding:'18px 16px 14px',
        }}>
          <div style={{ fontSize:22, marginBottom:2 }}>👣</div>
          <div style={{
            fontSize:32, fontWeight:900, color:'#f0f4f8',
            fontVariantNumeric:'tabular-nums', letterSpacing:'-0.03em',
            lineHeight:1.1,
          }}>
            {formatSteps(pet.totalSteps)}
          </div>
          <div style={{ fontSize:11, color:'#94a5b8', marginTop:2 }}>
            一起走過的日子
          </div>
        </div>
      )}

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

      {/* ── Info panel ── */}
      {pet && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ height:1, background:'#1e2a45', marginBottom:10 }} />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:9, color:'#5a6d85' }}>Lv.{pet.level}</span>
              <span style={{ fontSize:9, color:'#94a5b8' }}>·</span>
              <span style={{ fontSize:9, color:'#94a5b8' }}>🌟 {EVO_LABELS[pet.evolutionStage-1]||'初級'}</span>
            </div>
          </div>
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
