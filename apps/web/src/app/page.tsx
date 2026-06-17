'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FIRST_PET_STEPS, ENCOUNTER_INTERVAL, rollEncounter, generateStats, generateSkills, calculateEvolution, EVOLUTION_STEPS, Rarity, Mood, PetStatus, Pet, formatSteps, RARITY_COLORS, RARITY_LABELS } from '@pipz/core'
import PixelPetCanvas from '../components/PixelPetCanvas'
import PetDetailModal from '../components/PetDetailModal'
import LoginModal from './auth-modal'
import { useAuth } from '../lib/auth-context'
import { ensureProfile, loadPets, savePet, updatePet, deletePet, updateTotalSteps, upsertDailySteps, getTodaySteps } from '../lib/supabase-db'

function genSeed() { return Math.floor(Math.random() * 2147483646) + 1 }

const PC: Record<string, string> = {
  common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6',
  epic: '#8b5cf6', legendary: '#f59e0b',
}
const ME: Record<string, string> = {
  happy: '😊', excited: '🤩', hungry: '🍽️', sleepy: '😴', sad: '😢',
}

type Tab = 'map' | 'pets' | 'eggs' | 'community'

export default function HomePage() {
  const [steps, setSteps] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [pets, setPets] = useState<Pet[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [walking, setWalking] = useState(false)
  const [showEgg, setShowEgg] = useState(false)
  const [hatching, setHatching] = useState(false)
  const [petAnim, setPetAnim] = useState<'idle'|'walk'|'happy'>('idle')
  const [tab, setTab] = useState<Tab>('map')
  const [log, setLog] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [encFlash, setEncFlash] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showEvolve, setShowEvolve] = useState(false)
  const [evolvingId, setEvolvingId] = useState<string | null>(null)
  const [detailPetId, setDetailPetId] = useState<string | null>(null)
  const { user, signOut } = useAuth()

  const wid = useRef<number|null>(null)
  const last = useRef<{lat:number;lng:number}|null>(null)
  const encCnt = useRef(0)
  const pity = useRef<Record<string,number>>({legendary:0,epic:0})
  const loadedUser = useRef<string|null>(null)
  const syncTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  const pendingSteps = useRef(0)

  const pet = pets[activeIdx] ?? null
  const cp = (p: Pet) => p.stats.speed + p.stats.luck + p.stats.charm + p.stats.energy
  const xpMax = (p: Pet) => p.level * 50
  const xpPct = (p: Pet) => Math.min(100, (p.xp / xpMax(p)) * 100)
  const nearby = pets.length > 0 ? pets.slice(-4).reverse() : []
  const canEvolve = pet ? calculateEvolution(pet.totalSteps, pet.evolutionStage, pet.stats) : null

  useEffect(() => { setReady(true) }, [])

  const logMsg = (m: string) => setLog(v => [m, ...v].slice(0, 8))

  // ── Load data when user changes ──
  useEffect(() => {
    if (!user) {
      // Not logged in — use local state
      if (loadedUser.current !== null) {
        setPets([])
        setSteps(0)
        setTotalSteps(0)
        setShowEgg(false)
        setActiveIdx(0)
        loadedUser.current = null
      }
      setLoading(false)
      return
    }

    // User logged in — load their data
    const loadData = async () => {
      setLoading(true)
      try {
        await ensureProfile(user.id)
        const [dbPets, todaySt] = await Promise.all([
          loadPets(user.id),
          getTodaySteps(user.id),
        ])

        setPets(dbPets)
        setSteps(todaySt)
        setActiveIdx(0)
        loadedUser.current = user.id

        // Catch up old pets — set pet totalSteps to user totalSteps if behind
        if (dbPets.length > 0) {
          const maxPetSteps = Math.max(...dbPets.map(p => p.totalSteps))
          const userSteps = Math.max(maxPetSteps, todaySt)
          if (todaySt > maxPetSteps) {
            setPets(v => v.map(p => ({ ...p, totalSteps: Math.max(p.totalSteps, userSteps) })))
          }
        }
      } catch (e) {
        console.error('Failed to load data:', e)
        logMsg('❌ 載入數據失敗')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user?.id])

  // ── Debounced step sync to Supabase ──
  const scheduleSync = useCallback((s: number, ts: number) => {
    if (!user) return
    if (syncTimer.current) clearTimeout(syncTimer.current)
    pendingSteps.current = s
    syncTimer.current = setTimeout(async () => {
      setSyncing(true)
      try {
        await Promise.all([
          updateTotalSteps(user.id, ts),
          upsertDailySteps(user.id, pendingSteps.current),
        ])
      } catch (e) {
        console.error('Sync failed:', e)
      } finally {
        setSyncing(false)
      }
    }, 2000)
  }, [user])

  // Cleanup sync timer
  useEffect(() => {
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current)
    }
  }, [])

  // ── Walk ──
  const walkStart = () => {
    if (!navigator.geolocation) return logMsg('❌ 唔支援 GPS')
    setWalking(true); setPetAnim('walk'); logMsg('🚶 開始行路！')
    wid.current = navigator.geolocation.watchPosition(
      pos => {
        if (pos.coords.accuracy > 100) return
        if (last.current) {
          const d = haversine(last.current.lat, last.current.lng, pos.coords.latitude, pos.coords.longitude)
          const ns = Math.floor(d * 1300)
          if (ns > 0) addSt(ns)
        }
        last.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      },
      () => { setWalking(false); setPetAnim('idle') },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }
  const walkStop = () => {
    if (wid.current !== null) navigator.geolocation.clearWatch(wid.current)
    wid.current = null; setWalking(false); setPetAnim('idle'); logMsg('⏹ 停低咗')
  }

  // ── Pet spawn ──
  const spawnPet = async (r: Rarity) => {
    const seed = genSeed()
    const np: Pet = {
      id: seed.toString(), userId: user?.id ?? 'local', name: '',
      speciesId: seed.toString(), imageUrl: '',
      rarity: r, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1,
      status: PetStatus.Baby,
      stats: generateStats(r, 1), skills: generateSkills(r, 1), mood: Mood.Happy, moodValue: 100,
      lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
      isForSale: false, price: 0,
    }

    // Save to DB if logged in
    if (user) {
      const dbId = await savePet(user.id, np)
      if (dbId) np.id = dbId
    }

    setPets(v => {
      const updated = [...v, np]
      setActiveIdx(updated.length - 1)
      return updated
    })
  }

  // ── Step manager ──
  const addSt = (n: number) => {
    setSteps(s => s + n)
    // Also add steps to active pet
    if (pet) {
      setPets(v => v.map((p, i) => i === activeIdx ? { ...p, totalSteps: p.totalSteps + n } : p))
    }
    setTotalSteps(s => {
      const newTotal = s + n
      if (pets.length === 0 && newTotal >= FIRST_PET_STEPS) { setShowEgg(true) }
      scheduleSync(steps + n, newTotal)
      return newTotal
    })
    encCnt.current += n
    if (encCnt.current >= ENCOUNTER_INTERVAL) {
      const r = rollEncounter(encCnt.current, pity.current)
      if (r) {
        encCnt.current = 0
        if (r === Rarity.Legendary) pity.current.legendary = 0
        if (r === Rarity.Epic) pity.current.epic = 0
        spawnPet(r)
        setEncFlash(true); setTimeout(() => setEncFlash(false), 1800)
        logMsg(`🐾 遇見 ${RARITY_LABELS[r]}！`)
      }
    }
  }

  const addDebug = () => addSt(500)

  // ── Pet actions ──
  const feed = () => {
    if (!pet) return
    const updated = { ...pet, mood: Mood.Happy, moodValue: 100, lastFedAt: Date.now(), xp: pet.xp + 10 }
    setPets(v => v.map((p,i) => i === activeIdx ? updated : p))
    if (user) updatePet(updated)
    setPetAnim('happy'); logMsg('🍖 餵食咗！+10XP'); setTimeout(() => setPetAnim('idle'), 1500)
  }
  const petAction = () => {
    if (!pet) return
    const updated = { ...pet, mood: Mood.Happy, moodValue: Math.min(100, pet.moodValue + 15) }
    setPets(v => v.map((p,i) => i === activeIdx ? updated : p))
    if (user) updatePet(updated)
    setPetAnim('happy'); logMsg('✋ 摸頭～'); setTimeout(() => setPetAnim('idle'), 1500)
  }
  const playAction = () => {
    if (!pet) return
    const updated = { ...pet, mood: Mood.Excited, moodValue: Math.min(100, pet.moodValue + 20), xp: pet.xp + 5 }
    setPets(v => v.map((p,i) => i === activeIdx ? updated : p))
    if (user) updatePet(updated)
    setPetAnim('happy'); logMsg('🎾 玩緊！+5XP'); setTimeout(() => setPetAnim('idle'), 2000)
  }

  const hatch = () => {
    setHatching(true)
    setTimeout(() => {
      setHatching(false); setShowEgg(false)
      spawnPet(Rarity.Common)
      logMsg('🎉 孵化成功！')
    }, 2000)
  }

  const doEvolve = () => {
    if (!pet || !canEvolve) return
    const e = canEvolve
    const reqForThisEvolution = EVOLUTION_STEPS[pet.evolutionStage + 1] || 10000
    const remainingSteps = Math.max(0, pet.totalSteps - reqForThisEvolution)
    const evolved = {
      ...pet,
      evolutionStage: e.newStage,
      status: e.newStatus,
      stats: e.newStats,
      level: pet.level + 1,
      totalSteps: remainingSteps,
    }
    setPets(v => v.map((p, i) => i === activeIdx ? evolved : p))
    setEvolvingId(pet.id)
    logMsg(`🌟 進化！${RARITY_LABELS[pet.rarity]} → Lv.${evolved.level}`)
    if (user) updatePet(evolved)
    // Animation → 帶回寵物頁
    setTimeout(() => {
      setEvolvingId(null)
      setShowEvolve(false)
      setTab('pets')
      setDetailPetId(null)
    }, 1200)
  }

  useEffect(() => { return () => { if (wid.current !== null) navigator.geolocation.clearWatch(wid.current) } }, [])

  // ═══════ RENDER ═══════

  return (
    <div className="layout">

      {/* Scrollable content */}
      <div className="scroll-wrap">

        {/* ── Header ── */}
        <div className="header">
          <span className="header-title">Pipz</span>
          <div className="header-right">
            {syncing && <span style={{fontFamily:'var(--font-title)', fontSize:8, color:'var(--text-3)'}}>⏳</span>}
            {walking && (
              <span className="header-gps">
                <span className="gps-dot" />GPS
              </span>
            )}
            {user ? (
              <>
                <button onClick={() => setShowLogin(true)}
                  style={{
                    background:'rgba(139,92,246,0.15)', border:'2px solid rgba(139,92,246,0.3)',
                    cursor:'pointer', color:'#c084fc',
                    fontFamily:'var(--font-title)', fontSize:7, padding:'4px 6px',
                    whiteSpace:'nowrap', letterSpacing:'0.3px',
                    maxWidth: 120, overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                  {user.email}
                </button>
                <button onClick={() => signOut()}
                  style={{
                    background:'none', border:'2px solid rgba(255,51,85,0.3)', cursor:'pointer',
                    color:'#ff3355', fontFamily:'var(--font-title)', fontSize:7, padding:'3px 6px',
                    letterSpacing:'0.3px',
                  }}>
                  登出
                </button>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)}
                style={{
                  background:'none', border:'2px solid var(--border)',
                  cursor:'pointer', color:'var(--text-3)',
                  fontFamily:'var(--font-title)', fontSize:10, padding:'4px 8px',
                  letterSpacing:'0.5px',
                }}>
                🔑
              </button>
            )}
            <span className="header-steps">{ready ? formatSteps(totalSteps) : '0'}</span>
          </div>
        </div>

        {/* ── Main ── */}
        <div className="main">

          {/* ════ Loading ════ */}
          {loading ? (
            <div style={{textAlign:'center', padding: '60px 0', color:'var(--text-3)', fontFamily:'var(--font-title)', fontSize:9}}>
              <div style={{fontSize:24, marginBottom:8}}>⏳</div>
              載入中...
            </div>
          ) : (

          <>
          {/* ════ MAP TAB ════ */}
          {tab === 'map' && (
            <div className="fade-up">

              {/* Pet Display */}
              <div className="section card" style={{position:'relative', overflow:'hidden'}}>
                {encFlash && (
                  <div className="enc-flash">
                    <div><span style={{fontSize:32, display:'block', marginBottom:4}}>✦</span>
                    <span style={{fontFamily:'var(--font-title)', fontSize:9, color:'var(--pink)', letterSpacing:'1px'}}>NEW PET!</span></div>
                  </div>
                )}

                <div className="card-pad pet-area">
                  {!ready ? (
                    <><span className="pet-egg">🥚</span><span className="pet-title">載入中...</span></>
                  ) : showEgg ? (
                    hatching ? (
                      <div style={{textAlign:'center', padding:'16px 0'}}>
                        <span className="pet-egg egg-crack">🥚</span>
                        <p style={{fontFamily:'var(--font-title)', fontSize:9, color:'var(--purple)', marginTop:6, letterSpacing:'1px'}}>HATCHING...</p>
                        <div className="hatch-sparkle">
                          {['✨','⭐','💫','🌟'].map((s,i) => (
                            <span key={i} style={{animationDelay:`${i*0.15}s`, fontSize:18}}>{s}</span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="pet-egg egg-shake">🥚</span>
                        <p style={{fontFamily:'var(--font-title)', fontSize:9, color:'var(--pink)', letterSpacing:'1px', marginTop:4}}>HATCH!</p>
                        <p style={{fontFamily:'var(--font-body)', fontSize:16, color:'var(--text-3)'}}>Ready to hatch</p>
                        <button className="btn btn-primary" onClick={hatch} style={{marginTop:2}}>HATCH</button>
                      </>
                    )
                  ) : pet ? (
                    <>
                      <div className="pet-glow-wrap" style={{borderColor: PC[pet.rarity] + '44'}}>
                        <PixelPetCanvas
                          seed={parseInt(pet.speciesId) || 1}
                          rarity={pet.rarity}
                          evolutionStage={pet.evolutionStage}
                          animation={petAnim}
                          size={5}
                        />
                      </div>
                      <div className="pet-info-row">
                        <span className="pet-badge" style={{color:RARITY_COLORS[pet.rarity], background:RARITY_COLORS[pet.rarity]+'18'}}>{RARITY_LABELS[pet.rarity]}</span>
                        <span className="pet-lv">Lv.{pet.level}</span>
                        <span className="pet-cp">CP {cp(pet)}</span>
                        {canEvolve && (
                          <button className="btn" onClick={() => setShowEvolve(true)}
                            style={{background:'#8a5a00', borderColor:'var(--pixel-gold)', color:'white', padding:'2px 8px'}}>
                            EVO
                          </button>
                        )}
                      </div>
                      <div className="pet-stats">
                        <span>SPD {pet.stats.speed}</span>
                        <span>LUK {pet.stats.luck}</span>
                        <span>CHA {pet.stats.charm}</span>
                        <span>ENR {pet.stats.energy}</span>
                      </div>
                      {pet.xp > 0 && (
                        <div className="progress-wrap">
                          <div className="progress-labels"><span>EXP</span><span>{pet.xp}/{xpMax(pet)}</span></div>
                          <div className="progress-bar"><div className="progress-fill" style={{width:`${xpPct(pet)}%`}}/></div>
                        </div>
                      )}
                      <div className="pet-mood">
                        <span>{ME[pet.mood] || '😐'}</span>
                        <span className="pet-mood-text">{pet.mood === 'happy' ? 'HAPPY' : pet.mood.toUpperCase()}</span>
                      </div>
                      <div className="pet-actions">
                        <button className="btn btn-green" onClick={feed}>FEED</button>
                        <button className="btn btn-blue" onClick={petAction}>PET</button>
                        <button className="btn btn-amber" onClick={playAction}>PLAY</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="pet-egg">🥚</span>
                      <span className="pet-title">NO PET</span>
                      <div className="progress-wrap" style={{marginTop:4}}>
                        <div className="progress-labels"><span>INCUBATE</span><span>{formatSteps(totalSteps)}/{formatSteps(FIRST_PET_STEPS)}</span></div>
                        <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(100,(totalSteps/FIRST_PET_STEPS)*100)}%`}}/></div>
                        <p style={{fontFamily:'var(--font-body)', fontSize:15, color:'var(--text-3)', textAlign:'center', marginTop:4}}>Walk 1,000 steps to hatch</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Steps + Walk */}
              <div className="section card">
                <div className="steps-row">
                  <div className="steps-stat">
                    <div className="steps-num">{ready ? formatSteps(steps) : '0'}</div>
                    <div className="steps-label">今日</div>
                  </div>
                  <div className="steps-center">
                    <button className={`walk-btn ${walking ? 'active' : ''}`}
                      onClick={walking ? walkStop : walkStart}>
                      {walking ? '⏹' : '🚶'}
                    </button>
                  </div>
                  <div className="steps-stat">
                    <div className="steps-num">{ready ? formatSteps(totalSteps) : '0'}</div>
                    <div className="steps-label">總計</div>
                  </div>
                </div>
              </div>

              {/* Nearby */}
              {nearby.length > 0 && (
                <div className="section card card-pad-sm">
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <span style={{fontFamily:'var(--font-title)', fontSize:8, color:'var(--text-2)', letterSpacing:'0.3px'}}>NEARBY</span>
                    </div>
                    <span style={{fontFamily:'var(--font-title)', fontSize:7, color:'var(--text-3)'}}>{nearby.length}</span>
                  </div>
                  <div className="nearby-scroll">
                    {nearby.map(p => {
                      const idx = pets.indexOf(p)
                      return (
                        <div key={p.id} className="nearby-card" onClick={() => setDetailPetId(p.id)}>
                          <div className="nearby-pet" style={{background:`${PC[p.rarity]}12`}}>
                            <PixelPetCanvas seed={parseInt(p.speciesId) || 1} rarity={p.rarity} evolutionStage={p.evolutionStage} size={2.8} animation="idle" />
                          </div>
                          <div className="nearby-rarity" style={{color:RARITY_COLORS[p.rarity]}}>{RARITY_LABELS[p.rarity]}</div>
                          <div className="nearby-cp">CP {cp(p)}</div>
                          <div className="nearby-lv">Lv.{p.level}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Debug + Log */}
              <div className="section debug-row">
                <div>
                  <button className="btn btn-ghost" onClick={addDebug}>+500 測試步數</button>
                </div>
                <span className="debug-info">🛰️ GPS 記錄真實步數</span>
              </div>

              {log.length > 0 && (
                <div className="section card-2 log-box">
                  <div className="log-title">記錄</div>
                  {log.slice(0, 3).map((m,i) => <div key={i} className="log-item">{m}</div>)}
                </div>
              )}
            </div>
          )}

          {/* ════ PETS TAB ════ */}
          {tab === 'pets' && (
            <div className="fade-up">
              <div className="section-header">
                <span className="section-title">PETS</span>
                <span className="section-count">{pets.length}</span>
              </div>
              {pets.length === 0 ? (
                <div className="card empty-state">
                  <div className="empty-icon">🥚</div>
                  <div className="empty-text">No pets yet — start walking!</div>
                </div>
              ) : (
                <div className="pet-grid">
                  {pets.map((p,i) => {
                    const starCount = {common:1, uncommon:2, rare:3, epic:4, legendary:5}[p.rarity] || 1
                    const starColor = RARITY_COLORS[p.rarity]
                    const canThisEvolve = calculateEvolution(p.totalSteps, p.evolutionStage, p.stats)
                    return (
                    <div key={p.id} className="pet-card" onClick={() => setDetailPetId(p.id)}
                      style={{borderColor: `${starColor}33`}}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = `${starColor}66`)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = `${starColor}33`)}>
                      {/* Rarity top strip */}
                      <div style={{position:'absolute', top:0, left:0, right:0, height:3, borderRadius:'14px 14px 0 0', background: starColor}} />
                      {/* CP badge */}
                      <div className="pet-card-cp">{cp(p)}</div>
                      {/* Icon */}
                      <div className="pet-card-icon">
                        <PixelPetCanvas seed={parseInt(p.speciesId) || 1} rarity={p.rarity} evolutionStage={p.evolutionStage} size={3.5} animation="idle" />
                      </div>
                      {/* Stars */}
                      <div className="pet-card-stars" style={{color: starColor}}>
                        {'★'.repeat(starCount)}
                      </div>
                      {/* Level */}
                      <div className="pet-card-lv">Lv.{p.level}</div>
                      {/* Evolution indicator */}
                      {p.evolutionStage < 5 && (
                        <div className={`pet-card-evo ${canThisEvolve ? 'pet-card-evo-ready' : ''}`}
                          style={{color: canThisEvolve ? '#f59e0b' : '#3a4d65'}}>
                          {canThisEvolve ? '▶' : '►'}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}

          {/* ════ EGGS TAB ════ */}
          {tab === 'eggs' && (
            <div className="fade-up">
              <div className="section-header">
                <span className="section-title">EGGS</span>
                <span className="section-count">1/1</span>
              </div>

              <div className="section card">
                <div className="incubator">
                  <div className={`incubator-slot ${pets.length > 0 ? 'incubator-slot-done' : ''}`}>
                    <span style={{fontSize:24}}>{pets.length === 0 ? '🥚' : '✅'}</span>
                  </div>
                  <div className="incubator-info">
                    <div className="incubator-name">BASIC INCUBATOR</div>
                    <div className="incubator-desc">{pets.length === 0 ? 'Walk 1,000 steps' : 'Complete!'}</div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{
                        width: pets.length === 0 ? `${Math.min(100,(totalSteps/FIRST_PET_STEPS)*100)}%` : '100%',
                        background: pets.length > 0 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : undefined
                      }}/>
                    </div>
                    <div className="incubator-labels">
                      <span>PROGRESS</span>
                      <span>{pets.length === 0 ? `${formatSteps(totalSteps)}/${formatSteps(FIRST_PET_STEPS)}` : 'DONE'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="locked-grid">
                {[1,2].map(i => (
                  <div key={i} className="card locked-slot">
                    <div className="locked-icon">🔒</div>
                    <div className="locked-title">{i === 1 ? 'EXTRA INCUBATOR' : 'FRIEND INCUBATOR'}</div>
                    <div className="locked-sub">Coming soon</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ COMMUNITY TAB ════ */}
          {tab === 'community' && (
            <div className="fade-up community-wrap">
              <div className="card community-card">
                <div className="community-icon">🏪</div>
                <div className="community-title">COMMUNITY</div>
                <div className="community-desc">Trade and battle with others</div>
                <div className="community-list">
                  {['RACE', 'TRADE', 'FRIENDS'].map(s => (
                    <div key={s} className="card-2 community-item">
                      <span>{s}</span>
                      <span className="community-status">SOON</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          </>
          )}

        </div>
      </div>

      {/* ════ BOTTOM NAV (fixed) ════ */}
      <div className="bottom-nav">
        <div className="nav-bar">
          <div className="nav-grid">
            {([
              { k: 'map' as Tab, icon: '🗺️', label: 'MAP' },
              { k: 'pets' as Tab, icon: '🐾', label: 'PETS' },
              { k: 'eggs' as Tab, icon: '🥚', label: 'EGGS' },
              { k: 'community' as Tab, icon: '🏪', label: 'SHOP' },
            ]).map(t => (
              <button key={t.k} className={`nav-btn ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)}>
                <span className={`nav-icon ${tab === t.k ? 'active' : ''}`}>{t.icon}</span>
                <span className={`nav-label ${tab === t.k ? 'active' : 'inactive'}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />

      {/* ════ Pet Detail Modal ════ */}
      {detailPetId && (() => {
        const detailPet = pets.find(p => p.id === detailPetId)
        if (!detailPet) return null
        return (
          <PetDetailModal
            pet={detailPet}
            totalSteps={totalSteps}
            onClose={() => setDetailPetId(null)}
            onEvolve={() => { setDetailPetId(null); setActiveIdx(pets.indexOf(detailPet)); setShowEvolve(true) }}
            onFeed={() => {
              setPets(v => v.map(p => p.id === detailPet.id ? { ...p, mood: Mood.Happy, moodValue: 100, lastFedAt: Date.now(), xp: p.xp + 10 } : p))
              if (user) updatePet({ ...detailPet, mood: Mood.Happy, moodValue: 100, lastFedAt: Date.now(), xp: detailPet.xp + 10 })
              logMsg('🍖 餵食咗！+10XP')
            }}
            onPet={() => {
              setPets(v => v.map(p => p.id === detailPet.id ? { ...p, mood: Mood.Happy, moodValue: Math.min(100, p.moodValue + 15) } : p))
              if (user) updatePet({ ...detailPet, mood: Mood.Happy, moodValue: Math.min(100, detailPet.moodValue + 15) })
              logMsg('✋ 摸頭～')
            }}
            onPlay={() => {
              setPets(v => v.map(p => p.id === detailPet.id ? { ...p, mood: Mood.Excited, moodValue: Math.min(100, p.moodValue + 20), xp: p.xp + 5 } : p))
              if (user) updatePet({ ...detailPet, mood: Mood.Excited, moodValue: Math.min(100, detailPet.moodValue + 20), xp: detailPet.xp + 5 })
              logMsg('🎾 玩緊！+5XP')
            }}
            onDelete={(id) => {
              setPets(v => v.filter(p => p.id !== id))
              setDetailPetId(null)
              if (user) deletePet(id)
              logMsg('🗑️ 寵物已剷除')
            }}
          />
        )
      })()}
      {showEvolve && pet && canEvolve && (
        <div style={{
          position:'fixed', inset:0, zIndex:100,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,0.8)',
          padding:16
        }} onClick={() => !evolvingId && setShowEvolve(false)}>
          <div style={{
            background:'#12162b', border:'2px solid rgba(255,204,0,0.3)',
            padding:28, textAlign:'center', maxWidth:300, width:'100%',
            boxShadow:'6px 6px 0 rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            {evolvingId === pet.id ? (
              <>
                <div style={{fontSize:48, marginBottom:12, animation:'pulse 0.5s step-end infinite'}}>✨</div>
                <div style={{fontFamily:'var(--font-title)', fontSize:12, color:'var(--pixel-gold)', letterSpacing:'1px', marginBottom:8}}>
                  進化中...
                </div>
                <div className="hatch-sparkle">
                  {['🌟','⭐','💫','✨'].map((s,i) => (
                    <span key={i} style={{animationDelay:`${i*0.2}s`, fontSize:24}}>{s}</span>
                  ))}
                </div>
              </>
            ) : (
              <>
                <PixelPetCanvas
                  seed={parseInt(pet.speciesId) || 1}
                  rarity={pet.rarity}
                  evolutionStage={pet.evolutionStage}
                  animation="happy"
                  size={6}
                />
                <div style={{fontFamily:'var(--font-title)', fontSize:10, color:'var(--pixel-gold)', margin:'12px 0 6px', letterSpacing:'0.5px'}}>
                  EVOLVE?
                </div>
                <div style={{fontFamily:'var(--font-body)', fontSize:15, color:'var(--text-2)', marginBottom:14}}>
                  {['BABY','JUVENILE','ADULT','EVOLVED','LEGENDARY'][pet.evolutionStage-1] || 'BASE'}
                  {' → '}
                  {['JUVENILE','ADULT','EVOLVED','LEGENDARY','MYTHIC'][pet.evolutionStage-1] || 'NEXT'}
                </div>
                <div style={{display:'flex', gap:8, justifyContent:'center'}}>
                  <button className="btn btn-ghost" onClick={() => setShowEvolve(false)}
                    style={{padding:'8px 16px', fontSize:7}}>
                    CANCEL
                  </button>
                  <button onClick={doEvolve}
                    style={{
                      padding:'8px 20px', border:'2px solid #ffcc00',
                      background:'#8a5a00', color:'white',
                      fontFamily:'var(--font-title)', fontSize:8, cursor:'pointer',
                      letterSpacing:'0.5px', boxShadow:'2px 2px 0 rgba(0,0,0,0.4)',
                    }}>
                    EVOLVE
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
