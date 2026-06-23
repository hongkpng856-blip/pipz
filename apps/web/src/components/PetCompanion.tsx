'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { generatePixelPet, PixelPetData, Pet, RARITY_COLORS, RARITY_LABELS, formatSteps, Mood, getSpeciesIndex } from '@pipz/core'

interface Props {
  pet: Pet | null
  onFeed: () => void
  onPet: () => void
  onPlay: () => void
  onRename?: (name: string) => void
  anim: 'idle' | 'walk' | 'happy'
  steps: number
  totalSteps: number
  evolutionStage: number
}

type Behavior = 'idle' | 'walkLeft' | 'walkRight' | 'mischief' | 'happy'
type Reaction = 'none' | 'heart' | 'sparkle' | 'bounce'

const MOOD_MAP: Record<string, string> = {
  happy: '😊', excited: '🤩', hungry: '😋', sleepy: '😴', sad: '😢',
}
const MOOD_CN: Record<string, string> = {
  happy: '開心', excited: '興奮', hungry: '肚餓', sleepy: '眼瞓', sad: '傷心',
}

export default function PetCompanion({
  pet, onFeed, onPet, onPlay, onRename, anim, steps, totalSteps, evolutionStage,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const petDataRef = useRef<PixelPetData | null>(null)
  const rafRef = useRef(0)
  const timeRef = useRef(0)
  const behaviorRef = useRef<Behavior>('idle')
  const behaviorTimer = useRef(0)
  const xRef = useRef(0)
  const walkDir = useRef(1)
  const bounceRef = useRef(0)
  const reactionRef = useRef<Reaction>('none')
  const reactionTimer = useRef(0)
  const particlesRef = useRef<{x:number;y:number;life:number;emoji:string}[]>([])
  const spriteImageRef = useRef<HTMLImageElement | null>(null)
  const [spriteLoaded, setSpriteLoaded] = useState(false)
  const [behavior, setBehavior] = useState<Behavior>('idle')
  const [showTapHint, setShowTapHint] = useState(true)
  const [showInfo, setShowInfo] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState('')
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
    } else {
      petDataRef.current = null
      setSpeciesName('')
    }
  }, [pet])

  // Load PNG sprite and pre-process to remove white background
  useEffect(() => {
    let cancelled = false
    if (!pet) { setSpriteLoaded(false); return }
    const idx = getSpeciesIndex(parseInt(pet.speciesId) || 1)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      // Pre-process: remove white background pixels onto an offscreen canvas
      const oc = document.createElement('canvas')
      oc.width = img.width
      oc.height = img.height
      const ox = oc.getContext('2d')!
      ox.drawImage(img, 0, 0)
      const od = ox.getImageData(0, 0, img.width, img.height)
      for (let i = 0; i < od.data.length; i += 4) {
        if (od.data[i] > 245 && od.data[i + 1] > 245 && od.data[i + 2] > 245 && od.data[i + 3] > 0) {
          od.data[i + 3] = 0
        }
      }
      ox.putImageData(od, 0, 0)
      // Convert processed canvas to image
      const processed = new Image()
      processed.onload = () => {
        if (!cancelled) {
          spriteImageRef.current = processed
          setSpriteLoaded(true)
        }
      }
      processed.src = oc.toDataURL()
    }
    img.onerror = () => {
      if (!cancelled) setSpriteLoaded(false)
    }
    img.src = `/pixel-gen/sprites/${idx}.png`
    return () => { cancelled = true }
  }, [pet])

  // Auto behavior cycle
  useEffect(() => {
    if (!pet) return
    const pick = () => {
      const r = Math.random()
      if (r < 0.35) {
        const dir = Math.random() > 0.5 ? 'walkRight' : 'walkLeft'
        behaviorRef.current = dir as Behavior
        walkDir.current = dir === 'walkRight' ? 1 : -1
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

    // ── Draw room ──
    const floorY = H * 0.38
    ctx.fillStyle = '#16122a'; ctx.fillRect(0, 0, W, floorY)
    ctx.fillStyle = '#1e1a35'
    for (let i = 0; i < 8; i++) ctx.fillRect((i/8)*W, 0, 1, floorY)
    ctx.fillStyle = '#2a2550'; ctx.fillRect(0, floorY-4, W, 4)
    // Floor tiles
    const tile = 24
    for (let y = 0; y < Math.ceil((H-floorY)/tile)+1; y++) {
      for (let x = 0; x < Math.ceil(W/tile)+1; x++) {
        ctx.fillStyle = (x+y)%2===0 ? '#2a2040' : '#1e1835'
        ctx.fillRect(x*tile, floorY+y*tile, tile, tile)
      }
    }
    // Rug
    const rugW = W*0.75, rugH = H*0.2, rugX = (W-rugW)/2
    const rugY = floorY + (H-floorY-rugH)*0.2
    const r = () => { ctx.beginPath(); ctx.roundRect(rugX, rugY, rugW, rugH, 12); ctx.fill() }
    ctx.fillStyle = '#3a2a5a'; r()
    ctx.strokeStyle = '#4a3a6a'; ctx.lineWidth=1; r()

    // Draw pet
    const pd = petDataRef.current
    const spriteImg = spriteImageRef.current
    if (pet && (spriteImg || pd)) {
      const ps = 6
      const gy = rugY + rugH * 0.6
      const bx = behaviorRef.current
      if (bx === 'walkLeft') { xRef.current -= 1.2; if (xRef.current < -W * 0.25) behaviorTimer.current = 0 }
      if (bx === 'walkRight') { xRef.current += 1.2; if (xRef.current > W * 0.25) behaviorTimer.current = 0 }
      xRef.current = Math.max(-W * 0.25, Math.min(W * 0.25, xRef.current))
      bounceRef.current = Math.max(0, bounceRef.current - 0.05)

      const idleBob = bx === 'idle' ? Math.sin(timeRef.current * 3) * 1.5 : 0
      const walkBob = (bx === 'walkLeft' || bx === 'walkRight') ? Math.abs(Math.sin(timeRef.current * 8)) * 3 : 0
      let mY = 0, mRot = 0
      if (bx === 'mischief') { mY = Math.abs(Math.sin(timeRef.current * 10)) * 8; mRot = Math.sin(timeRef.current * 6) * 0.15 }

      // Shake effect on pet
      let shakeX = 0
      if (shake) shakeX = (Math.random() - 0.5) * 4

      const cy = gy + idleBob + walkBob - mY + (bounceRef.current * -20)

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.beginPath(); ctx.ellipse(W / 2 + xRef.current + shakeX, gy + 2, 28, 3, 0, 0, Math.PI * 2); ctx.fill()

      if (spriteImg && spriteLoaded) {
        // ── Draw PNG sprite ──
        const spriteSize = Math.min(80, Math.min(W, H) * 0.2)
        const sw = spriteSize
        const sh = spriteSize
        const sx = W / 2 + xRef.current + shakeX - sw / 2
        const sy = cy - sh / 2 + mRot * 20

        // Glow
        if (pd?.palette?.glow) { ctx.shadowColor = RARITY_COLORS[pet.rarity]; ctx.shadowBlur = 15 }

        ctx.save()
        ctx.translate(W / 2 + xRef.current + shakeX, cy + mRot * 10)
        ctx.rotate(mRot)

        ctx.drawImage(spriteImg, -sw / 2, -sh / 2, sw, sh)

        ctx.restore()
        ctx.shadowBlur = 0
      } else if (pd) {
        // ── Fallback: procedural pixel grid ──
        const pw = pd.width * ps, ph = pd.height * ps

        // Glow
        if (pd.palette.glow) { ctx.shadowColor = RARITY_COLORS[pet.rarity]; ctx.shadowBlur = 15 }

        ctx.save()
        ctx.translate(W / 2 + xRef.current + shakeX, cy)
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
        ctx.font = '20px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(MOOD_MAP[pet.mood] || '😊', W / 2 + xRef.current, cy - 40)
      }

      // ── Particles ──
      particlesRef.current = particlesRef.current.filter(p => p.life > 0)
      for (const p of particlesRef.current) {
        p.y -= 1.2; p.life -= 0.025
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.font = '14px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(p.emoji, W / 2 + xRef.current + p.x, cy - 50 + p.y)
      }
      ctx.globalAlpha = 1

      // ── Tap hint ──
      if (showTapHint) {
        ctx.globalAlpha = 0.4 + Math.sin(timeRef.current*4)*0.2
        ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#94a5b8'
        ctx.fillText('👆 禁下我啦', W/2, H-30)
        ctx.globalAlpha = 1
      }

    } else {
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
  }, [pet, anim, showTapHint, shake])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [animate])

  const handleCanvasClick = () => {
    if (!pet) return
    handlePet()
  }

  // ── Rename handler ──
  const submitRename = () => {
    if (nameInput.trim() && onRename) {
      onRename(nameInput.trim())
    }
    setRenaming(false)
  }

  return (
    <div style={{ width:'100%', position:'relative', overflow:'hidden', background:'#0b1120' }}>
      <canvas
        ref={canvasRef}
        width={400} height={460}
        onClick={handleCanvasClick}
        style={{ width:'100%', height:'auto', display:'block', cursor:pet?'pointer':'default', imageRendering:'pixelated' }}
      />

      {/* ── Top overlay: name + info toggle ── */}
      {pet && (
        <div style={{ position:'absolute', top:12, left:12, right:12, display:'flex', alignItems:'center', gap:8 }}>
          {renaming ? (
            <div style={{ display:'flex', gap:4, alignItems:'center', background:'rgba(0,0,0,0.7)', padding:'4px 8px', borderRadius:10 }}>
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && submitRename()}
                style={{ background:'#141b2d', border:'1px solid #8b5cf6', borderRadius:6, color:'white',
                  fontSize:12, padding:'3px 6px', width:100, fontFamily:'inherit', outline:'none' }}
              />
              <button onClick={submitRename} style={{ background:'#8b5cf6', border:'none', borderRadius:6,
                color:'white', fontSize:10, padding:'3px 8px', cursor:'pointer', fontFamily:'inherit' }}>✓</button>
              <button onClick={()=>setRenaming(false)} style={{ background:'none', border:'none',
                color:'#5a6d85', fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
            </div>
          ) : (
            <button onClick={() => { setNameInput(pet.name || ''); setRenaming(true) }}
              style={{ background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10,
                color:'#f0f4f8', fontSize:14, fontWeight:700, padding:'4px 12px', cursor:'pointer',
                fontFamily:'inherit', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', gap:6 }}>
              {pet.name || '未命名'} ✏️
              <span style={{ fontSize:8, fontWeight:400, color:'#5a6d85', marginLeft:4 }}>#{speciesName}</span>
            </button>
          )}

          <div style={{ flex:1 }} />

          <button onClick={() => setShowInfo(!showInfo)}
            style={{ background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10,
              color:'#94a5b8', fontSize:10, padding:'4px 10px', cursor:'pointer', fontFamily:'inherit',
              backdropFilter:'blur(4px)', display:'flex', alignItems:'center', gap:4 }}>
            📊 {showInfo ? '隱藏' : '詳情'}
          </button>
        </div>
      )}

      {/* ── Info overlay ── */}
      {pet && showInfo && (
        <div style={{ position:'absolute', top:60, left:12, right:12,
          background:'rgba(11,17,32,0.92)', backdropFilter:'blur(8px)', borderRadius:16,
          border:'1px solid #1e2a45', padding:16, display:'flex', flexDirection:'column', gap:8, zIndex:10 }}>
          
          {/* Row 1: Mood bar */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
              <span style={{ fontSize:9, color:'#94a5b8' }}>😊 {MOOD_CN[pet.mood] || pet.mood}</span>
              <span style={{ fontSize:9, color:'#5a6d85' }}>{getMoodValue()}%</span>
            </div>
            <div className="progress-wrap" style={{ height:4 }}>
              <div className="progress-bar"><div className="progress-fill" style={{
                width:`${getMoodValue()}%`,
                background: getMoodValue() > 60 ? 'linear-gradient(90deg,#22c55e,#4ade80)' :
                           getMoodValue() > 30 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' :
                           'linear-gradient(90deg,#ef4444,#f87171)',
              }}/></div>
            </div>
          </div>

          {/* Species + Rarity row */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:10, fontWeight:600, color:'#f0f4f8' }}>#{speciesName}</span>
            <span className="pet-badge" style={{ color:RARITY_COLORS[pet.rarity], background:RARITY_COLORS[pet.rarity]+'18', fontSize:9 }}>{RARITY_LABELS[pet.rarity]}</span>
          </div>

          {/* Row 2: Stats */}
          <div style={{ display:'flex', gap:12 }}>
            {[
              { icon:'⚡', label:'速度', val:pet.stats.speed },
              { icon:'🍀', label:'運氣', val:pet.stats.luck },
              { icon:'💜', label:'魅力', val:pet.stats.charm },
              { icon:'🔋', label:'能量', val:pet.stats.energy },
            ].map(s => (
              <div key={s.label} style={{ flex:1, textAlign:'center', background:'#141b2d', borderRadius:8, padding:'6px 4px' }}>
                <div style={{ fontSize:14 }}>{s.icon}</div>
                <div style={{ fontSize:8, color:'#5a6d85', marginTop:2 }}>{s.label}</div>
                <div style={{ fontSize:10, fontWeight:700, color:'#f0f4f8' }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Row 3: Evolution progress */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
              <span style={{ fontSize:9, color:'#94a5b8' }}>
                🌟 {['BB','幼年','成年','完全體','傳說'][pet.evolutionStage-1]||'初級'}
              </span>
              <span style={{ fontSize:9, color:'#5a6d85' }}>Lv.{pet.level}</span>
            </div>
            <div className="progress-wrap" style={{ height:4 }}>
              <div className="progress-bar"><div className="progress-fill" style={{
                width:`${Math.min(100,(pet.totalSteps/(10000*pet.evolutionStage))*100)}%`,
                background:'linear-gradient(90deg,#f59e0b,#ffd700)',
              }}/></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom: action buttons + pet info ── */}
      {pet && (
        <div style={{ position:'absolute', bottom:12, left:12, right:12, display:'flex', flexDirection:'column', gap:6 }}>
          {/* Quick action buttons */}
          <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
            <button className="btn btn-green" onClick={(e)=>{e.stopPropagation(); handleFeed()}}
              style={{ fontSize:10, padding:'5px 14px', borderRadius:16, display:'flex', alignItems:'center', gap:4 }}>
              🍖 餵食
            </button>
            <button className="btn btn-blue" onClick={(e)=>{e.stopPropagation(); handlePet()}}
              style={{ fontSize:10, padding:'5px 14px', borderRadius:16, display:'flex', alignItems:'center', gap:4 }}>
              ✋ 摸頭
            </button>
            <button className="btn btn-amber" onClick={(e)=>{e.stopPropagation(); handlePlay()}}
              style={{ fontSize:10, padding:'5px 14px', borderRadius:16, display:'flex', alignItems:'center', gap:4 }}>
              🎾 玩
            </button>
          </div>
          {/* Bottom info bar */}
          <div style={{ display:'flex', justifyContent:'center', gap:12, fontSize:9, color:'#5a6d85' }}>
            <span>👣 {formatSteps(pet.totalSteps)}步</span>
            <span>❤️ {getMoodValue()}%</span>
            <span style={{ color:RARITY_COLORS[pet.rarity] }}>{RARITY_LABELS[pet.rarity]}</span>
          </div>
        </div>
      )}
    </div>
  )
}
