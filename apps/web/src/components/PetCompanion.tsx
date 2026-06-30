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
}

type Behavior = 'idle' | 'walkLeft' | 'walkRight' | 'walkUp' | 'walkDown' | 'mischief'
type Reaction = 'none' | 'heart' | 'sparkle' | 'bounce'

const EVO_LABELS = ['BB', '幼年', '成年', '完全體', '傳說']

const SPRITE_VERSION = 'v5'
const MARGIN = 50
const FRAME_DURATION = 180 // ms per frame

// PixelLab cat speciesId
const IS_PIXELLAB_PET = (pet: Pet | null) => pet?.speciesId === '175'
// PixelLab Shiba speciesId (both old '23' and new '176')
const IS_SHIBA_PET = (pet: Pet | null) => pet?.speciesId === '176' || pet?.speciesId === '23'

export default function PetCompanion({
  pet, anim, steps, totalSteps, evolutionStage, skills,
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
  const facingLeft = useRef(false) // track horizontal facing
  const [status, setStatus] = useState<'loading' | 'png' | 'fallback'>('loading')
  const [behavior, setBehavior] = useState<Behavior>('idle')
  const [speciesName, setSpeciesName] = useState('')

  // Generate pet pixel data + animation frames
  useEffect(() => {
    if (pet) {
      // Shiba (old or new) always uses seed 176 for the generator special case
      const seed = IS_SHIBA_PET(pet) ? 176 : (parseInt(pet.speciesId) || 1)
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

  // Load PNG sprite — skip for PixelLab cat
  useEffect(() => {
    let cancelled = false
    const currentPetId = pet?.id ?? null
    if (petKeyRef.current !== currentPetId) {
      offscreenRef.current = null
      setStatus('loading')
    }
    petKeyRef.current = currentPetId
    if (!pet) { setStatus('fallback'); return }
    // PixelLab cat or Shiba — skip PNG, go straight to grid fallback
    if (IS_PIXELLAB_PET(pet) || IS_SHIBA_PET(pet)) { setStatus('fallback'); return }
    const idx = getSpeciesIndex(parseInt(pet.speciesId) || 1)
    // Shiba custom sprite
    const spritePath = (pet.speciesId === '176' || pet.speciesId === '23')
      ? `/pixel-gen/sprites/shiba.png?v=${SPRITE_VERSION}`
      : `/pixel-gen/sprites/${idx}.png?v=${SPRITE_VERSION}`
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
    img.src = spritePath
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

      if (bx === 'walkLeft') { xRef.current -= speed; facingLeft.current = true; if (xRef.current < -maxR) behaviorTimer.current = 0 }
      if (bx === 'walkRight') { xRef.current += speed; facingLeft.current = false; if (xRef.current > maxR) behaviorTimer.current = 0 }
      if (bx === 'walkUp') { yRef.current -= speed; if (yRef.current < -maxY) behaviorTimer.current = 0 }
      if (bx === 'walkDown') { yRef.current += speed; if (yRef.current > maxY) behaviorTimer.current = 0 }

      xRef.current = Math.max(-maxR, Math.min(maxR, xRef.current))
      yRef.current = Math.max(-maxY, Math.min(maxY, yRef.current))

      bounceRef.current = Math.max(0, bounceRef.current - 0.05)

      // walk bob (minimal, only when walking)
      const walkBob = (bx === 'walkLeft' || bx === 'walkRight') ? Math.abs(Math.sin(timeRef.current * 8)) * 1.5 : 0
      const walkBobY = (bx === 'walkUp' || bx === 'walkDown') ? Math.abs(Math.sin(timeRef.current * 8)) * 1.5 : 0
      let mY = 0, mRot = 0
      if (bx === 'mischief') { mY = Math.abs(Math.sin(timeRef.current * 10)) * 10; mRot = Math.sin(timeRef.current * 6) * 0.2 }

      // No idle bob — cat sits still and uses idle animation frames
      const cx = W / 2 + xRef.current
      const cy = H / 2 + yRef.current + walkBob + walkBobY - mY + (bounceRef.current * -20)

      // Shadow — size based on grid dimensions
      const gridW = pd?.width || 16
      const shadowScale = gridW / 16
      const shadowY = H / 2 + yRef.current + 2
      ctx.fillStyle = 'rgba(0,0,0,0.1)'
      ctx.beginPath(); ctx.ellipse(cx, shadowY, (24 + Math.abs(walkBob) * 3) * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2); ctx.fill()

      if (oc && status === 'png') {
        // ── PNG path: draw with enhanced walk bob ──
        const spriteSize = Math.min(120, Math.min(W, H) * 0.38)
        const sw = spriteSize
        const sh = spriteSize

        if (pd?.palette?.glow) { ctx.shadowColor = RARITY_COLORS[pet.rarity]; ctx.shadowBlur = 12 }

        ctx.save()
        ctx.translate(cx, cy + mRot * 10)
        // Flip PNG sprite when walking RIGHT (assumes sprites face LEFT by default)
        if (!facingLeft.current) ctx.scale(-1, 1)
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
          // Use walk frames while moving
          frameGrid = anim.walkFrames[animFrameRef.current]
        } else if (bx === 'idle') {
          // Idle: use idle frames (sit + blink)
          const idleIdx = Math.floor(timeRef.current * 3) % anim.idleFrames.length
          frameGrid = anim.idleFrames[idleIdx]
        } else {
          // Mischief/play: use play frames
          const playIdx = Math.floor(timeRef.current * 6) % anim.playFrames.length
          frameGrid = anim.playFrames[playIdx]
        }

        if (pd.palette.glow) { ctx.shadowColor = RARITY_COLORS[pet.rarity]; ctx.shadowBlur = 12 }

        ctx.save()
        ctx.translate(cx, cy)
        // Mirror horizontally — frames face LEFT, flip when walking RIGHT
        if (!facingLeft.current) ctx.scale(-1, 1)
        ctx.rotate(mRot)
        drawPixelGrid(ctx, frameGrid, ps, -pw / 2, -ph / 2)
        ctx.restore()
        ctx.shadowBlur = 0
      }

    } else if (!pet) {
      // No pet — render nothing (no egg, no auto-creation)
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
