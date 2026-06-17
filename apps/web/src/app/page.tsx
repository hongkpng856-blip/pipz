'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FIRST_PET_STEPS, ENCOUNTER_INTERVAL, rollEncounter, generateStats, generateSkills, calculateEvolution, EVOLUTION_STEPS, Rarity, Mood, PetStatus, Pet, formatSteps, RARITY_COLORS, RARITY_LABELS } from '@pipz/core'
import PixelPetCanvas from '../components/PixelPetCanvas'
import WalkingCanvas from '../components/WalkingCanvas'
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
  const [camState, setCamState] = useState<'idle'|'walk'|'encounter'>('idle')
  const [walkSpeed, setWalkSpeed] = useState(0)
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
    setWalking(true); setCamState('walk'); setWalkSpeed(30); setPetAnim('walk'); logMsg('🚶 開始行路！')
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
      () => { setWalking(false); setCamState('idle'); setWalkSpeed(0); setPetAnim('idle') },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }
  const walkStop = () => {
    if (wid.current !== null) navigator.geolocation.clearWatch(wid.current)
    wid.current = null; setWalking(false); setCamState('idle'); setWalkSpeed(0); setPetAnim('idle'); logMsg('⏹ 停低咗')
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
        setCamState('encounter')
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
            {syncing && <span style={{fontSize:10, color:'#5a6d85'}}>⏳</span>}
            {walking && (
              <span className="header-gps">
                <span className="gps-dot" />GPS
              </span>
            )}
            {user ? (
              <>
                <button onClick={() => setShowLogin(true)}
                  style={{
                    background:'var(--accent-active)', border:'2px solid var(--accent-bright)',
                    cursor:'pointer', color:'var(--accent-bright)',
                    fontSize: 11, padding: '3px 6px', fontFamily:'inherit', whiteSpace:'nowrap',
                    maxWidth: 120, overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                  {user.email}
                </button>
                <button onClick={() => signOut()}
                  style={{
                    background:'none', border:'none', cursor:'pointer',
                    color:'#ef4444', fontSize: 11, padding: '3px 4px',
                    fontFamily:'inherit',
                  }}>
                  登出
                </button>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)}
                style={{
                  background:'none', border:'none',
                  cursor:'pointer', color:'#5a6d85',
                  fontSize: 14, padding: '2px 4px',
                  fontFamily:'inherit',
                }}>
                🔑
              </button>
            )}
            <span className="header-icon">👣</span>
            <span className="header-steps">{ready ? formatSteps(totalSteps) : '0'}</span>
          </div>
        </div>

        {/* ── Main ── */}
        <div className="main">

          {/* ════ Loading ════ */}
          {loading ? (
            <div style={{textAlign:'center', padding: '60px 0', color:'#5a6d85', fontSize:13}}>
              <div style={{fontSize:24, marginBottom:8}}>⏳</div>
              載入中...
            </div>
          ) : (

          <>
          {/* ════ MAP TAB ════ */}
          {tab === 'map' && (
            <div className="fade-up">

              {/* Walking Canvas — full card (VS Code panel style) */}
              <div className="section canvas-card">
                <WalkingCanvas
                  state={camState}
                  speed={walkSpeed}
                  onEncounterEnd={() => {
                    setCamState(walking ? 'walk' : 'idle')
                    logMsg(`🐾 遇到新寵物！`)
                  }}
                  size={3}
                />
                {/* Speed test buttons — Pixel Agents style */}
                <div style={{position:'absolute', bottom:6, left:6, display:'flex', gap:3}}>
                  <button
                    onClick={() => { setCamState('walk'); setWalkSpeed(25); logMsg('🚶 步行中') }}
                    style={{
                      padding:'3px 7px', border:'2px solid #22c55e', background:'#166534',
                      color:'#fff', fontFamily:'inherit', fontSize:9, cursor:'pointer',
                      boxShadow:'2px 2px 0px #0a0a14',
                    }}>🚶 WALK</button>
                  <button
                    onClick={() => { setCamState('walk'); setWalkSpeed(90); logMsg('🏃 跑步中') }}
                    style={{
                      padding:'3px 7px', border:'2px solid #f59e0b', background:'#5c3d0e',
                      color:'#fff', fontFamily:'inherit', fontSize:9, cursor:'pointer',
                      boxShadow:'2px 2px 0px #0a0a14',
                    }}>🏃 RUN</button>
                  <button
                    onClick={() => { setCamState('idle'); setWalkSpeed(0); logMsg('⏹ 停低') }}
                    style={{
                      padding:'3px 7px', border:'2px solid #ef4444', background:'#5c1a1a',
                      color:'#fff', fontFamily:'inherit', fontSize:9, cursor:'pointer',
                      boxShadow:'2px 2px 0px #0a0a14',
                    }}>⏹ STOP</button>
                </div>
              </div>

              {/* Active Pet status bar */}
              {pet && camState !== 'encounter' && (
                <div className="section card card-pad-sm">
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <div style={{width:36, height:36, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                      background:`radial-gradient(circle,${PC[pet.rarity]}22,transparent 70%)`, borderRadius:8}}>
                      <PixelPetCanvas seed={parseInt(pet.speciesId)||1} rarity={pet.rarity} evolutionStage={pet.evolutionStage} size={2.5} animation={petAnim} />
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:'flex', alignItems:'center', gap:6}}>
                        <span className="pet-badge" style={{color:RARITY_COLORS[pet.rarity], background:RARITY_COLORS[pet.rarity]+'18', fontSize:9}}>{RARITY_LABELS[pet.rarity]}</span>
                        <span style={{fontSize:11, fontWeight:700, color:'#f0f4f8'}}>Lv.{pet.level}</span>
                        <span style={{fontSize:11, fontWeight:700, color:'#f59e0b'}}>CP {cp(pet)}</span>
                        <span style={{fontSize:10, color:'#94a5b8'}}>| ⚡{pet.stats.speed} 🍀{pet.stats.luck} 💜{pet.stats.charm} 🔋{pet.stats.energy}</span>
                      </div>
                      <div style={{display:'flex', alignItems:'center', gap:3, marginTop:2}}>
                        <span>{ME[pet.mood] || '😐'}</span>
                        <span style={{fontSize:9, color:'#22c55e'}}>{pet.mood === 'happy' ? '開心' : pet.mood}</span>
                        <span style={{fontSize:9, color:'#5a6d85', marginLeft:6}}>
                          步 {formatSteps(pet.totalSteps)} | {['BB','幼年','成年','完全體','傳說'][pet.evolutionStage-1] || '初級'}
                        </span>
                      </div>
                    </div>
                    <div style={{display:'flex', gap:4}}>
                      <button className="btn btn-green" onClick={feed} style={{fontSize:8, padding:'3px 8px'}}>🍖</button>
                      <button className="btn btn-blue" onClick={petAction} style={{fontSize:8, padding:'3px 8px'}}>✋</button>
                      <button className="btn btn-amber" onClick={playAction} style={{fontSize:8, padding:'3px 8px'}}>🎾</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Egg ready / no pet */}
              {!pet && camState !== 'encounter' && (
                <div className="section card card-pad-sm">
                  {!showEgg ? (
                    <div style={{textAlign:'center', padding:'8px 0'}}>
                      <span style={{fontSize:24}}>🥚</span>
                      <div style={{fontSize:11, color:'#94a5b8', marginTop:4}}>行 {formatSteps(FIRST_PET_STEPS)} 步孵化第一隻寵物</div>
                      <div className="progress-wrap" style={{width:'100%', marginTop:6}}>
                        <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(100,(totalSteps/FIRST_PET_STEPS)*100)}%`}}/></div>
                      </div>
                    </div>
                  ) : hatching ? (
                    <div style={{textAlign:'center', padding:'8px 0'}}>
                      <span className="pet-egg egg-crack">🥚</span>
                      <p style={{fontSize:14, color:'#8b5cf6', fontWeight:700, marginTop:6, animation:'pulse 1s ease-in-out infinite'}}>孵化中...</p>
                    </div>
                  ) : (
                    <div style={{textAlign:'center', padding:'8px 0'}}>
                      <span className="pet-egg egg-shake">🥚</span>
                      <p style={{fontSize:13, fontWeight:700, color:'#c084fc', marginTop:4}}>就快孵化！</p>
                      <button className="btn btn-primary" onClick={hatch} style={{marginTop:6}}>孵化 🐣</button>
                    </div>
                  )}
                </div>
              )}

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
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <span style={{fontSize:10}}>📍</span>
                      <span style={{fontSize:12, fontWeight:700, color:'#94a5b8'}}>附近</span>
                    </div>
                    <span style={{fontSize:9, color:'#5a6d85'}}>{nearby.length}隻</span>
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
                <span className="section-title">🐾 寵物</span>
                <span className="section-count">{pets.length}隻</span>
              </div>
              {pets.length === 0 ? (
                <div className="card empty-state">
                  <div className="empty-icon">🥚</div>
                  <div className="empty-text">未有寵物，行路孵化啦！</div>
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
                <span className="section-title">🥚 蛋</span>
                <span className="section-count">孵化器 1/1</span>
              </div>

              <div className="section card">
                <div className="incubator">
                  <div className={`incubator-slot ${pets.length > 0 ? 'incubator-slot-done' : ''}`}>
                    <span style={{fontSize:24}}>{pets.length === 0 ? '🥚' : '✅'}</span>
                  </div>
                  <div className="incubator-info">
                    <div className="incubator-name">{pets.length === 0 ? '基本孵化器' : '已孵化'}</div>
                    <div className="incubator-desc">{pets.length === 0 ? '行 1,000 步孵化' : '完成！'}</div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{
                        width: pets.length === 0 ? `${Math.min(100,(totalSteps/FIRST_PET_STEPS)*100)}%` : '100%',
                        background: pets.length > 0 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : undefined
                      }}/>
                    </div>
                    <div className="incubator-labels">
                      <span>進度</span>
                      <span>{pets.length === 0 ? `${formatSteps(totalSteps)}/${formatSteps(FIRST_PET_STEPS)}` : '✅ 完成'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="locked-grid">
                {[1,2].map(i => (
                  <div key={i} className="card locked-slot">
                    <div className="locked-icon">🔒</div>
                    <div className="locked-title">額外孵化器</div>
                    <div className="locked-sub">即將開放</div>
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
                <div className="community-title">社群 &amp; 交易</div>
                <div className="community-desc">與其他玩家交換寵物</div>
                <div className="community-list">
                  {['行路競賽','交易市場','好友列表'].map(s => (
                    <div key={s} className="card-2 community-item">
                      <span>{s}</span>
                      <span className="community-status">即將開放</span>
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
              { k: 'map' as Tab, icon: '🗺️', label: '地圖' },
              { k: 'pets' as Tab, icon: '🐾', label: '寵物' },
              { k: 'eggs' as Tab, icon: '🥚', label: '蛋' },
              { k: 'community' as Tab, icon: '🏪', label: '社群' },
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
          background:'rgba(0,0,0,0.85)', padding:16
        }} onClick={() => !evolvingId && setShowEvolve(false)}>
          <div style={{
            background:'#252535', border:'2px solid #f59e0b44', padding:24, textAlign:'center', maxWidth:300, width:'100%',
            boxShadow:'2px 2px 0px #0a0a14',
          }} onClick={e => e.stopPropagation()}>
            {evolvingId === pet.id ? (
              <>
                <div style={{fontSize:40, marginBottom:10, animation:'pulse 0.5s ease-in-out infinite'}}>✨</div>
                <div style={{fontSize:20, fontWeight:800, color:'rgba(255,255,255,0.9)', marginBottom:6}}>
                  進化中...
                </div>
                <div style={{display:'flex', gap:8, justifyContent:'center', marginTop:8}}>
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
                  size={5}
                />
                <div style={{fontSize:17, fontWeight:800, color:'#f59e0b', margin:'10px 0 4px'}}>
                  🌟 進化可能！
                </div>
                <div style={{fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:14}}>
                  {['baby','juvenile','adult','evolved','legendary'][pet.evolutionStage-1] || '初級'}
                  {' → '}
                  {['幼年','成年','完全體','傳說','神話'][pet.evolutionStage-1] || '下一步'}
                </div>
                <div style={{display:'flex', gap:6, justifyContent:'center'}}>
                  <button className="btn btn-ghost" onClick={() => setShowEvolve(false)}
                    style={{padding:'6px 18px', fontSize:11}}>
                    下次先
                  </button>
                  <button onClick={doEvolve}
                    style={{
                      padding:'6px 20px', border:'2px solid #f59e0b',
                      background:'#5c3d0e',
                      color:'white', fontSize:11, fontWeight:700, cursor:'pointer',
                      fontFamily:'inherit', boxShadow:'2px 2px 0px #0a0a14',
                    }}>
                    🌟 進化！
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
