'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { generatePixelPet, PixelPetData, Pet, RARITY_COLORS, RARITY_LABELS, formatSteps, Mood, getSpeciesIndex, PetSkill, SkillEffect } from '@pipz/core'

interface Props {
  pet: Pet | null
  onFeed: () => void
  onPet: () => void
  onPlay: () => void
  anim: 'idle' | 'walk' | 'happy'
  steps: number
  totalSteps: number
  evolutionStage: number
  skills: PetSkill[]
}

type Behavior = 'idle' | 'walkLeft' | 'walkRight' | 'walkUp' | 'walkDown' | 'mischief' | 'happy'
type Reaction = 'none' | 'heart' | 'sparkle' | 'bounce'

const MOOD_MAP: Record<string, string> = {
  happy: '😊', excited: '🤩', hungry: '😋', sleepy: '😴', sad: '😢',
}
const MOOD_CN: Record<string, string> = {
  happy: '開心', excited: '興奮', hungry: '肚餓', sleepy: '眼瞓', sad: '傷心',
}

const SPRITE_VERSION = 'v5'
const MARGIN = 50 // px from edge so sprite doesn't clip

/** Remove warm-beige background (rgb(255,241,232)) and PICO-8 bg gray (rgb(194,195,199)) */
function removeBg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const id = ctx.getImageData(0, 0, w, h)
  const TOL = 40
  const br = 255, bg = 241, bb = 232
  const pico_r = 194, pico_g = 195, pico_b = 199
  for (let i = 0; i < id.data.length; i += 4) {
    const a = id.data[i + 3]
    if (a === 0) continue
    const r = id.data[i], g = id.data[i + 1], b = id.data[i + 2]
    if (
      Math.abs(r - br) <= TOL &&
      Math.abs(g - bg) <= TOL &&
      Math.abs(b - bb) <= TOL
    ) {
      id.data[i + 3] = 0
      continue
    }
    if (r === pico_r && g === pico_g && b === pico_b) {
      id.data[i + 3] = 0
    }
  }
  ctx.putImageData(id, 0, 0)
}

export default function PetCompanion({
  pet, onFeed, onPet, onPlay, anim, steps, totalSteps, evolutionStage, skills,
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
  const walkDirX = useRef(1)
  const walkDirY = useRef(1)
  const bounceRef = useRef(0)
  const reactionRef = useRef<Reaction>('none')
  const reactionTimer = useRef(0)
  const particlesRef = useRef<{x:number;y:number;life:number;emoji:string}[]>([])
  const [status, setStatus] = useState<'loading' | 'png' | 'fallback'>('loading')
  const [behavior, setBehavior] = useState<Behavior>('idle')
  const [showTapHint, setShowTapHint] = useState(true)
  const [shake, setShake] = useState(false)
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
      // Random starting position within roam bounds
      xRef.current = (Math.random() - 0.5) * 0.6
      yRef.current = (Math.random() - 0.5) * 0.4
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
      removeBg(ox, img.width, img.height)
      offscreenRef.current = oc
      if (!cancelled) setStatus('png')
    }
    img.onerror = () => {
      if (!cancelled) setStatus('fallback')
    }
    img.src = `/pixel-gen/sprites/${idx}.png?v=${SPRITE_VERSION}`
    return () => { cancelled = true }
  }, [pet])

  // ── Auto behavior cycle (full 2D roaming) ──
  useEffect(() => {
    if (!pet) return
    const pick = () => {
      const r = Math.random()
      if (r < 0.40) {
        // Walk in a random direction
        const dirs: Behavior[] = ['walkLeft', 'walkRight', 'walkUp', 'walkDown']
        const dir = dirs[Math.floor(Math.random() * dirs.length)]
        behaviorRef.current = dir
        walkDirX.current = Math.random() > 0.5 ? 1 : -1
        walkDirY.current = Math.random() > 0.5 ? 1 : -1
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

  // Timer dec
  useEffect(() => {
    if (!pet) return
    const iv = setInterval(() => { behaviorTimer.current = Math.max(0, behaviorTimer.current - 0.2) }, 200)
    return () => clearInterval(iv)
  }, [pet])

  // Trigger reaction from external anim change
  useEffect(() => {
    if (anim === 'happy') triggerReaction('heart')
  }, [anim])

  // ── Reaction system ──
  const triggerReaction = useCallback((type: Reaction) => {
    reactionRef.current = type
    reactionTimer.current = 1.5
    if (type === 'heart') {
      for (let i = 0; i < 5; i++) {
        particlesRef.current.push({
          x: (Math.random() - 0.5) * 40,
          y: 0,
          life: 1,
          emoji: ['❤️','💕','💖','💗','✨'][Math.floor(Math.random()*5)],
        })
      }
    } else if (type === 'sparkle') {
      for (let i = 0; i < 3; i++) {
        particlesRef.current.push({
          x: (Math.random() - 0.5) * 30,
          y: 0,
          life: 1,
          emoji: '✨',
        })
      }
    } else if (type === 'bounce') {
      bounceRef.current = 1
      for (let i = 0; i < 3; i++) {
        particlesRef.current.push({
          x: (Math.random() - 0.5) * 25,
          y: 0,
          life: 1,
          emoji: '⭐',
        })
      }
    }
  }, [])

  const handleFeed = useCallback(() => {
    onFeed()
    triggerReaction('heart')
  }, [onFeed, triggerReaction])

  const handlePet = useCallback(() => {
    onPet()
    triggerReaction('sparkle')
    setShake(true); setTimeout(() => setShake(false), 300)
  }, [onPet, triggerReaction])

  const handlePlay = useCallback(() => {
    onPlay()
    triggerReaction('bounce')
  }, [onPlay, triggerReaction])

  // ── Mood decay check ──
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

    // ── Card background (uniform dark) ──
    ctx.fillStyle = '#141b2d'; ctx.fillRect(0, 0, W, H)

    // Subtle paw-print / circle decorations
    ctx.fillStyle = 'rgba(255,255,255,0.015)'
    const decoPositions = [
      [W*0.08, H*0.12], [W*0.92, H*0.08], [W*0.15, H*0.85],
      [W*0.85, H*0.82], [W*0.50, H*0.05],
    ]
    for (const [dx, dy] of decoPositions) {
      ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill()
    }

    // Bottom accent line
    ctx.fillStyle = '#1e2a45'
    ctx.fillRect(0, H - 1, W, 1)

    // Draw pet
    const pd = petDataRef.current
    const oc = offscreenRef.current
    if (pet && (status !== 'loading')) {
      const bx = behaviorRef.current
      const speed = 1.0

      // ── Full 2D roaming (no boundaries except sprite margin) ──
      const maxX = (W / 2) - MARGIN
      const maxY = (H / 2) - MARGIN

      if (bx === 'walkLeft') { xRef.current -= speed; if (xRef.current < -maxX) behaviorTimer.current = 0 }
      if (bx === 'walkRight') { xRef.current += speed; if (xRef.current > maxX) behaviorTimer.current = 0 }
      if (bx === 'walkUp') { yRef.current -= speed; if (yRef.current < -maxY) behaviorTimer.current = 0 }
      if (bx === 'walkDown') { yRef.current += speed; if (yRef.current > maxY) behaviorTimer.current = 0 }

      // Hard clamp to edges (safety)
      xRef.current = Math.max(-maxX, Math.min(maxX, xRef.current))
      yRef.current = Math.max(-maxY, Math.min(maxY, yRef.current))

      bounceRef.current = Math.max(0, bounceRef.current - 0.05)

      const idleBob = bx === 'idle' ? Math.sin(timeRef.current * 3) * 1.5 : 0
      const walkBob = (bx === 'walkLeft' || bx === 'walkRight') ? Math.abs(Math.sin(timeRef.current * 8)) * 2 : 0
      const walkBobY = (bx === 'walkUp' || bx === 'walkDown') ? Math.abs(Math.sin(timeRef.current * 8)) * 2 : 0
      let mY = 0, mRot = 0
      if (bx === 'mischief') { mY = Math.abs(Math.sin(timeRef.current * 10)) * 10; mRot = Math.sin(timeRef.current * 6) * 0.2 }

      let shakeX = 0
      if (shake) shakeX = (Math.random() - 0.5) * 4

      // Final position: center of canvas + offset
      const cx = W / 2 + xRef.current + shakeX
      const cy = H / 2 + yRef.current + idleBob + walkBob + walkBobY - mY + (bounceRef.current * -20)

      // Shadow (below pet)
      const shadowY = H / 2 + yRef.current + 2
      ctx.fillStyle = 'rgba(0,0,0,0.1)'
      ctx.beginPath(); ctx.ellipse(cx, shadowY, 24 + Math.abs(walkBob) * 3, 3, 0, 0, Math.PI * 2); ctx.fill()

      if (oc && status === 'png') {
        const spriteSize = Math.min(72, Math.min(W, H) * 0.18)
        const sw = spriteSize
        const sh = spriteSize

        // Glow
        if (pd?.palette?.glow) { ctx.shadowColor = RARITY_COLORS[pet.rarity]; ctx.shadowBlur = 12 }

        ctx.save()
        ctx.translate(cx, cy + mRot * 10)
        ctx.rotate(mRot)
        ctx.drawImage(oc, -sw / 2, -sh / 2, sw, sh)
        ctx.restore()
        ctx.shadowBlur = 0

      } else if (pd && status === 'fallback') {
        const ps = 6
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

      // Mood emoji
      if (pet.mood) {
        ctx.font = '18px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(MOOD_MAP[pet.mood] || '😊', cx, cy - 36)
      }

      // ── Particles ──
      particlesRef.current = particlesRef.current.filter(p => p.life > 0)
      for (const p of particlesRef.current) {
        p.y -= 1.2; p.life -= 0.025
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.font = '14px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(p.emoji, cx + p.x, cy - 50 + p.y)
      }
      ctx.globalAlpha = 1

      // ── Tap hint ──
      if (showTapHint) {
        ctx.globalAlpha = 0.4 + Math.sin(timeRef.current*4)*0.2
        ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#94a5b8'
        ctx.fillText('👆 禁下我啦', W/2, H-20)
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
  }, [pet, anim, showTapHint, shake, status])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [animate])

  const handleCanvasClick = () => {
    if (!pet) return
    handlePet()
    if (showTapHint) setShowTapHint(false)
  }

  return (
    <div style={{ width:'100%', background:'#141b2d', borderRadius:16, overflow:'hidden', position:'relative' }}>
      {/* ── Canvas (shorter/wider play area) ── */}
      <canvas
        ref={canvasRef}
        width={400} height={300}
        onClick={handleCanvasClick}
        style={{ width:'100%', height:'auto', display:'block', cursor:pet?'pointer':'default', imageRendering:'pixelated' }}
      />

      {/* ── Species name badge (overlaid on canvas) ── */}
      {pet && (
        <div style={{ position:'absolute', top:10, left:10, right:10, display:'flex', alignItems:'center', gap:6 }}>
          <div style={{
            background:'rgba(11,17,32,0.7)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8,
            color:'#f0f4f8', fontSize:12, fontWeight:700, padding:'3px 10px',
            fontFamily:'inherit', backdropFilter:'blur(4px)',
          }}>
            #{speciesName}
          </div>
          <div style={{ flex:1 }} />
        </div>
      )}

      {/* ── Skills overlay (bottom of canvas) ── */}
      {pet && skills.length > 0 && (
        <div style={{
          position:'absolute', bottom:4, left:8, right:8,
          display:'flex', gap:3, flexWrap:'wrap', alignItems:'center',
        }}>
          <span style={{ fontSize:7, color:'#5a6d85', marginRight:1 }}>🎯</span>
          {skills.map(s => (
            <div key={s.id} style={{
              background:'rgba(11,17,32,0.7)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:6,
              padding:'2px 6px', display:'flex', alignItems:'center', gap:3, fontSize:8,
            }}>
              <span>{s.icon}</span>
              <span style={{ color:'#f0f4f8', fontWeight:600 }}>{s.name}</span>
              {s.effect && (
                <span style={{ fontSize:6, color:'#f59e0b', background:'rgba(245,158,11,0.15)', borderRadius:3, padding:'0 3px' }}>
                  加成中
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Always-visible info panel ── */}
      {pet && (
        <div style={{ padding:'10px 12px 8px', display:'flex', flexDirection:'column', gap:6 }}>
          {/* Row 1: Mood + Stats */}
          <div style={{ display:'flex', gap:8, alignItems:'stretch' }}>
            {/* Mood column */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:8, color:'#94a5b8' }}>😊 {MOOD_CN[pet.mood] || pet.mood}</span>
                <span style={{ fontSize:8, color:'#5a6d85' }}>{getMoodValue()}%</span>
              </div>
              <div className="progress-wrap" style={{ height:2 }}>
                <div className="progress-bar"><div className="progress-fill" style={{
                  width:`${getMoodValue()}%`,
                  background: getMoodValue() > 60 ? 'linear-gradient(90deg,#22c55e,#4ade80)' :
                             getMoodValue() > 30 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' :
                             'linear-gradient(90deg,#ef4444,#f87171)',
                }}/></div>
              </div>
              {/* Evolution + Rarity */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:2 }}>
                <span style={{ fontSize:8, color:'#94a5b8' }}>
                  🌟 {['BB','幼年','成年','完全體','傳說'][pet.evolutionStage-1]||'初級'} · Lv.{pet.level}
                </span>
                <span className="pet-badge" style={{ color:RARITY_COLORS[pet.rarity], background:RARITY_COLORS[pet.rarity]+'18', fontSize:7 }}>{RARITY_LABELS[pet.rarity]}</span>
              </div>
            </div>
            {/* 4 Stats */}
            <div style={{ display:'flex', gap:4 }}>
              {[
                { icon:'⚡', label:'速度', val:pet.stats.speed },
                { icon:'🍀', label:'運氣', val:pet.stats.luck },
                { icon:'💜', label:'魅力', val:pet.stats.charm },
                { icon:'🔋', label:'能量', val:pet.stats.energy },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center', background:'rgba(20,27,45,0.6)', borderRadius:6, padding:'3px 5px', minWidth:38 }}>
                  <div style={{ fontSize:11 }}>{s.icon}</div>
                  <div style={{ fontSize:6, color:'#5a6d85', marginTop:0 }}>{s.label}</div>
                  <div style={{ fontSize:8, fontWeight:700, color:'#f0f4f8' }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom: action buttons ── */}
      {pet && (
        <div style={{ display:'flex', gap:4, justifyContent:'center', padding:'0 12px 10px' }}>
          <button className="btn btn-green" onClick={(e)=>{e.stopPropagation(); handleFeed()}}
            style={{ fontSize:9, padding:'4px 10px', borderRadius:14, display:'flex', alignItems:'center', gap:3 }}>
            🍖 餵食
          </button>
          <button className="btn btn-blue" onClick={(e)=>{e.stopPropagation(); handlePet()}}
            style={{ fontSize:9, padding:'4px 10px', borderRadius:14, display:'flex', alignItems:'center', gap:3 }}>
            ✋ 摸頭
          </button>
          <button className="btn btn-amber" onClick={(e)=>{e.stopPropagation(); handlePlay()}}
            style={{ fontSize:9, padding:'4px 10px', borderRadius:14, display:'flex', alignItems:'center', gap:3 }}>
            🎾 玩
          </button>
        </div>
      )}
    </div>
  )
}
