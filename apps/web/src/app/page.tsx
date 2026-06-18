'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FIRST_PET_STEPS, ENCOUNTER_INTERVAL, rollEncounter, generateStats, generateSkills, calculateEvolution, EVOLUTION_STEPS, Rarity, Mood, PetStatus, Pet, formatSteps, RARITY_COLORS, RARITY_LABELS } from '@pipz/core'
import PixelPetCanvas from '../components/PixelPetCanvas'
import WalkingCanvas from '../components/WalkingCanvas'
import PetDetailModal from '../components/PetDetailModal'
import LoginModal from './auth-modal'
import { useAuth } from '../lib/auth-context'
import { ensureProfile, loadPets, savePet, updatePet, deletePet, updateTotalSteps, upsertDailySteps, getTodaySteps, loadEggs, saveEgg, deleteEgg, loadFavorites, setFavoriteOrder } from '../lib/supabase-db'

function genSeed() { return Math.floor(Math.random() * 2147483646) + 1 }

const PC: Record<string, string> = {
  common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6',
  epic: '#8b5cf6', legendary: '#f59e0b',
}
const ME: Record<string, string> = {
  happy: '😊', excited: '🤩', hungry: '🍽️', sleepy: '😴', sad: '😢',
}

interface EggItem {
  id: string
  rarity: Rarity
  collectedAt: number
}

type Tab = 'map' | 'pets' | 'eggs' | 'community'

export default function HomePage() {
  const [steps, setSteps] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [pets, setPets] = useState<Pet[]>([])
  const [eggs, setEggs] = useState<EggItem[]>([])
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
  const [showEncounterEgg, setShowEncounterEgg] = useState(false)
  const [encounterEggRarity, setEncounterEggRarity] = useState<Rarity | null>(null)
  const [eggHatchingId, setEggHatchingId] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const { user, signOut } = useAuth()

  const wid = useRef<number|null>(null)
  const last = useRef<{lat:number;lng:number}|null>(null)
  const encCnt = useRef(0)
  const pity = useRef<Record<string,number>>({legendary:0,epic:0})
  const loadedUser = useRef<string|null>(null)
  const syncTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  const pendingSteps = useRef(0)
  const loadedStorage = useRef(false)

  const pet = pets[activeIdx] ?? null
  const cp = (p: Pet) => p.stats.speed + p.stats.luck + p.stats.charm + p.stats.energy
  const xpMax = (p: Pet) => p.level * 50
  const xpPct = (p: Pet) => Math.min(100, (p.xp / xpMax(p)) * 100)
  const nearby = pets.length > 0 ? pets.slice(-4).reverse() : []
  const canEvolve = pet ? calculateEvolution(pet.totalSteps, pet.evolutionStage, pet.stats) : null

  // ── Load persisted eggs + favorites from localStorage (guest) or Supabase ──
  useEffect(() => {
    if (loadedStorage.current) return
    if (!user) {
      try {
        const savedEggs = localStorage.getItem('pipz_eggs')
        if (savedEggs) setEggs(JSON.parse(savedEggs))
        const savedFavs = localStorage.getItem('pipz_favs')
        if (savedFavs) setFavorites(JSON.parse(savedFavs))
      } catch {}
    }
    loadedStorage.current = true
  }, [user])

  // ── Persist eggs + favorites to localStorage (guest) or Supabase (logged in) ──
  useEffect(() => {
    if (!user) { try { localStorage.setItem('pipz_eggs', JSON.stringify(eggs)) } catch {} }
  }, [eggs, user])
  useEffect(() => {
    if (!user) { try { localStorage.setItem('pipz_favs', JSON.stringify(favorites)) } catch {} }
  }, [favorites, user])

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
        const [dbPets, todaySt, dbEggs, dbFavs] = await Promise.all([
          loadPets(user.id),
          getTodaySteps(user.id),
          loadEggs(user.id),
          loadFavorites(user.id),
        ])

        setPets(dbPets)
        setEggs(dbEggs as EggItem[])
        setFavorites(dbFavs)
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
        // Store rarity for the encounter — don't spawn pet yet
        setEncounterEggRarity(r)
        setCamState('encounter')
        logMsg(`🥚 發現 ${RARITY_LABELS[r]} 蛋！`)
      }
    }
  }

  const addDebug = () => addSt(500)

  // ── Hatch an egg from inventory ──
  const hatchEgg = async (egg: EggItem) => {
    setEggHatchingId(egg.id)
    // Delete from Supabase if logged in
    if (user) await deleteEgg(egg.id)
    // Wait for hatching animation
    setTimeout(async () => {
      setEggs(v => v.filter(e => e.id !== egg.id))
      await spawnPet(egg.rarity)
      setEggHatchingId(null)
      setTab('pets')
      logMsg(`🐣 孵化出 ${RARITY_LABELS[egg.rarity]}！`)
    }, 2000)
  }

  // ── Toggle favorite (max 5) ──
  const toggleFavorite = (petId: string) => {
    setFavorites(prev => {
      const isFav = prev.includes(petId)
      if (isFav) {
        if (user) setFavoriteOrder(petId, null)
        return prev.filter(id => id !== petId)
      }
      if (prev.length >= 5) return prev
      if (user) setFavoriteOrder(petId, prev.length + 1)
      return [...prev, petId]
    })
  }

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

        {/* ── Header (with Walk button) ── */}
        <div className="header">
          <span className="header-title">Pipz</span>
          <div className="header-right">
            {syncing && <span style={{fontSize:10, color:'#5a6d85'}}>⏳</span>}
            <button
              onClick={walking ? walkStop : walkStart}
              style={{
                background: walking ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)',
                border: walking ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(34,197,94,0.3)',
                cursor:'pointer', color: walking ? '#ef4444' : '#22c55e',
                fontSize: 16, padding: '2px 6px', borderRadius: 10,
                fontFamily:'inherit', lineHeight:1,
              }}>
              {walking ? '⏹' : '🚶'}
            </button>
            {walking && (
              <span className="header-gps">
                <span className="gps-dot" />GPS
              </span>
            )}
            {user ? (
              <>
                <button onClick={() => setShowLogin(true)}
                  style={{
                    background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)',
                    cursor:'pointer', color:'#c084fc',
                    fontSize: 11, padding: '3px 6px', borderRadius: 10,
                    fontFamily:'inherit', whiteSpace:'nowrap',
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

              {/* Walking Canvas — full card (fills entire space) */}
              <div className="section card" style={{
                padding:0, overflow:'hidden', position:'relative',
                aspectRatio:'4/3', width:'100%',
              }}>
                <WalkingCanvas
                  state={camState}
                  speed={walkSpeed}
                  onEncounterEnd={() => {
                    setCamState(walking ? 'walk' : 'idle')
                    // Collect the egg from encounter
                    if (encounterEggRarity) {
                      const newEgg: EggItem = {
                        id: genSeed().toString(),
                        rarity: encounterEggRarity,
                        collectedAt: Date.now(),
                      }
                      // Save to Supabase if logged in
                      if (user) {
                        saveEgg(user.id, encounterEggRarity).then(dbId => {
                          if (dbId) setEggs(v => v.map(e => e.id === newEgg.id ? { ...e, id: dbId } : e))
                        })
                      }
                      setEggs(v => [...v, newEgg])
                      setEncounterEggRarity(null)
                      setShowEncounterEgg(true)
                    }
                  }}
                  size={3}
                  pet={pet ? { rarity: pet.rarity, evolutionStage: pet.evolutionStage } : null}
                  nearby={nearby.slice(0, 3).map(p => ({ rarity: p.rarity, evolutionStage: p.evolutionStage }))}
                />
                {/* Speed test buttons */}
                <div style={{position:'absolute', bottom:6, left:6, display:'flex', gap:4}}>
                  <button
                    onClick={() => { setCamState('walk'); setWalkSpeed(25); logMsg('🚶 步行中') }}
                    style={{
                      padding:'3px 8px', border:'2px solid #22c55e', background:'rgba(0,0,0,0.6)',
                      color:'#22c55e', fontFamily:'inherit', fontSize:9, cursor:'pointer',
                    }}>🚶 WALK</button>
                  <button
                    onClick={() => { setCamState('walk'); setWalkSpeed(90); logMsg('🏃 跑步中') }}
                    style={{
                      padding:'3px 8px', border:'2px solid #f59e0b', background:'rgba(0,0,0,0.6)',
                      color:'#f59e0b', fontFamily:'inherit', fontSize:9, cursor:'pointer',
                    }}>🏃 RUN</button>
                  <button
                    onClick={() => { setCamState('idle'); setWalkSpeed(0); logMsg('⏹ 停低') }}
                    style={{
                      padding:'3px 8px', border:'2px solid #ef4444', background:'rgba(0,0,0,0.6)',
                      color:'#ef4444', fontFamily:'inherit', fontSize:9, cursor:'pointer',
                    }}>⏹ STOP</button>
                </div>
              </div>

              {/* Active Pet status bar — cleaner layout */}
              {pet && camState !== 'encounter' && (
                <div className="section card card-pad-sm">
                  <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
                    <div style={{width:28, height:28, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                      background:`radial-gradient(circle,${PC[pet.rarity]}22,transparent 70%)`, borderRadius:6}}>
                      <PixelPetCanvas seed={parseInt(pet.speciesId)||1} rarity={pet.rarity} evolutionStage={pet.evolutionStage} size={2} animation={petAnim} />
                    </div>
                    <span className="pet-badge" style={{color:RARITY_COLORS[pet.rarity], background:RARITY_COLORS[pet.rarity]+'18', fontSize:9}}>{RARITY_LABELS[pet.rarity]}</span>
                    <span style={{fontSize:11, fontWeight:700, color:'#f0f4f8'}}>Lv.{pet.level}</span>
                    <span style={{fontSize:11, fontWeight:700, color:'#f59e0b'}}>CP {cp(pet)}</span>
                    <span style={{flex:1}} />
                    <span>{ME[pet.mood] || '😐'}</span>
                    <span style={{fontSize:9, color:'#22c55e'}}>{pet.mood === 'happy' ? '開心' : pet.mood}</span>
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:6, fontSize:9, color:'#5a6d85', marginBottom:4}}>
                    <span>👣 {formatSteps(pet.totalSteps)}步</span>
                    <span>|</span>
                    <span>{['BB','幼年','成年','完全體','傳說'][pet.evolutionStage-1] || '初級'}</span>
                  </div>
                  <div style={{display:'flex', gap:4}}>
                    <button className="btn btn-green" onClick={feed} style={{fontSize:8, padding:'2px 8px'}}>🍖 餵食</button>
                    <button className="btn btn-blue" onClick={petAction} style={{fontSize:8, padding:'2px 8px'}}>✋ 摸頭</button>
                    <button className="btn btn-amber" onClick={playAction} style={{fontSize:8, padding:'2px 8px'}}>🎾 玩</button>
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

              {/* 📊 Stats Card — bigger, with bar charts */}
              <div className="section card" style={{padding:0}}>
                <div style={{padding:'14px 16px'}}>
                  {/* Numbers row */}
                  <div style={{display:'flex', justifyContent:'space-around', marginBottom:14}}>
                    <div style={{textAlign:'center'}}>
                      <div className="steps-num">{ready ? formatSteps(steps) : '0'}</div>
                      <div className="steps-label" style={{marginTop:2}}>今日步數</div>
                    </div>
                    <div style={{width:1, background:'#1e2a45'}} />
                    <div style={{textAlign:'center'}}>
                      <div className="steps-num">{ready ? formatSteps(totalSteps) : '0'}</div>
                      <div className="steps-label" style={{marginTop:2}}>總步數</div>
                    </div>
                  </div>

                  {/* Bar: 今日進度 */}
                  <div style={{marginBottom:10}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:9, color:'#94a5b8', marginBottom:3}}>
                      <span>📊 今日進度</span>
                      <span>{formatSteps(steps)} / 5,000</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(100,(steps/5000)*100)}%`}}/></div>
                  </div>

                  {/* Bar: 總步數進度 */}
                  <div style={{marginBottom:10}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:9, color:'#94a5b8', marginBottom:3}}>
                      <span>📈 總步數進度</span>
                      <span>{formatSteps(totalSteps)}步</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(100,(totalSteps/10000)*100)}%`, background:'linear-gradient(90deg, #8b5cf6, #22d3ee)'}}/></div>
                  </div>

                  {/* Bar: 孵化/進化進度 */}
                  {!pet ? (
                    <div>
                      <div style={{display:'flex', justifyContent:'space-between', fontSize:9, color:'#94a5b8', marginBottom:3}}>
                        <span>🥚 孵化進度</span>
                        <span>{formatSteps(totalSteps)} / {formatSteps(FIRST_PET_STEPS)}</span>
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(100,(totalSteps/FIRST_PET_STEPS)*100)}%`, background:'#f59e0b'}}/></div>
                    </div>
                  ) : pet.evolutionStage < 5 && (() => {
                    const nextStep = (() => {
                      if (pet.evolutionStage === 1) return 10000
                      if (pet.evolutionStage === 2) return 30000
                      if (pet.evolutionStage === 3) return 60000
                      if (pet.evolutionStage === 4) return 100000
                      return 999999
                    })()
                    return (
                      <div>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:9, color:'#94a5b8', marginBottom:3}}>
                          <span>🌟 進化進度</span>
                          <span>{formatSteps(totalSteps)} / {formatSteps(nextStep)}</span>
                        </div>
                        <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(100,(totalSteps/nextStep)*100)}%`, background:'#f59e0b'}}/></div>
                      </div>
                    )
                  })()}
                </div>
              </div>

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
                  {[...pets].sort((a, b) => {
                    const af = favorites.includes(a.id) ? 0 : 1
                    const bf = favorites.includes(b.id) ? 0 : 1
                    return af - bf
                  }).map((p,i) => {
                    const origIdx = pets.indexOf(p)
                    const starCount = {common:1, uncommon:2, rare:3, epic:4, legendary:5}[p.rarity] || 1
                    const starColor = RARITY_COLORS[p.rarity]
                    const canThisEvolve = calculateEvolution(p.totalSteps, p.evolutionStage, p.stats)
                    const isActive = origIdx === activeIdx
                    const isFav = favorites.includes(p.id)
                    return (
                    <div key={p.id} className="pet-card"
                      onClick={() => { setActiveIdx(origIdx); logMsg(`⭐ ${RARITY_LABELS[p.rarity]} 設為主力`) }}
                      style={{
                        borderColor: isActive ? `${starColor}88` : `${starColor}33`,
                        boxShadow: isActive ? `0 0 10px ${starColor}44` : undefined,
                        padding: '6px 3px 3px',
                      }}>
                      {/* Rarity top strip */}
                      <div style={{position:'absolute', top:0, left:0, right:0, height:3, background: starColor}} />
                      {/* Favorite star (top-left) */}
                      <div
                        onClick={e => { e.stopPropagation(); toggleFavorite(p.id) }}
                        style={{
                          position:'absolute', top:4, left:3, fontSize:9, cursor:'pointer',
                          color: isFav ? '#f59e0b' : '#3a4d65', lineHeight:1, zIndex:2,
                          textShadow: isFav ? '0 0 4px rgba(245,158,11,0.5)' : undefined,
                        }}>
                        {isFav ? '★' : '☆'}
                      </div>
                      {/* Detail button (top-right) */}
                      <div
                        onClick={e => { e.stopPropagation(); setDetailPetId(p.id) }}
                        style={{
                          position:'absolute', top:4, right:3, fontSize:8, cursor:'pointer',
                          color:'#5a6d85', lineHeight:1, zIndex:2,
                        }}>ℹ️</div>
                      {/* Active badge */}
                      {isActive && (
                        <div style={{
                          position:'absolute', top:4, left:14, fontSize:6, fontWeight:700,
                          color: starColor, background: `${starColor}18`,
                          padding:'1px 4px', lineHeight:1,
                        }}>主力</div>
                      )}
                      {/* CP badge (top-center) */}
                      <div className="pet-card-cp" style={{top:4, right:20}}>{cp(p)}</div>
                      {/* Icon — smaller */}
                      <div className="pet-card-icon" style={{width:36, height:36}}>
                        <PixelPetCanvas seed={parseInt(p.speciesId) || 1} rarity={p.rarity} evolutionStage={p.evolutionStage} size={2.8} animation="idle" />
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
                <span className="section-count">{eggs.length}粒</span>
              </div>

              {/* Collected eggs grid */}
              {eggs.length > 0 && (
                <div className="pet-grid" style={{marginBottom:12}}>
                  {eggs.map(egg => {
                    const isHatching = eggHatchingId === egg.id
                    return (
                      <div key={egg.id}
                        className="pet-card"
                        onClick={() => !isHatching && hatchEgg(egg)}
                        style={{
                          borderColor: `${PC[egg.rarity]}44`,
                          cursor: isHatching ? 'default' : 'pointer',
                          padding: '12px 4px',
                        }}>
                        {isHatching ? (
                          <>
                            <div style={{fontSize:32, animation:'pulse 0.5s ease-in-out infinite', marginBottom:4}}>✨</div>
                            <div style={{fontSize:9, color:'#f59e0b', fontWeight:700}}>孵化中...</div>
                          </>
                        ) : (
                          <>
                            <div style={{fontSize:32, marginBottom:4}}>🥚</div>
                            <div style={{
                              fontSize:7, fontWeight:700, color:PC[egg.rarity],
                              background: `${PC[egg.rarity]}18`,
                              display:'inline-block', padding:'1px 8px',
                            }}>
                              {RARITY_LABELS[egg.rarity]}
                            </div>
                            <div style={{fontSize:8, color:'#5a6d85', marginTop:2}}>
                              點擊孵化
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* First pet incubator */}
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

              {/* Empty state */}
              {eggs.length === 0 && (
                <div className="card empty-state" style={{marginBottom:12}}>
                  <div style={{fontSize:36, marginBottom:8}}>🥚</div>
                  <div style={{fontSize:11, color:'#5a6d85'}}>
                    行路遇到嘅蛋會係度顯示
                  </div>
                </div>
              )}

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
          background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)',
          padding:16
        }} onClick={() => !evolvingId && setShowEvolve(false)}>
          <div style={{
            background:'#141b2d', border:'1px solid #f59e0b44', borderRadius:24,
            padding:32, textAlign:'center', maxWidth:300, width:'100%',
          }} onClick={e => e.stopPropagation()}>
            {evolvingId === pet.id ? (
              <>
                <div style={{fontSize:48, marginBottom:12, animation:'pulse 0.5s ease-in-out infinite'}}>✨</div>
                <div style={{fontSize:24, fontWeight:800, background:'linear-gradient(135deg,#f59e0b,#ffd700)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:8}}>
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
                <div style={{fontSize:20, fontWeight:800, color:'#f59e0b', margin:'12px 0 4px'}}>
                  🌟 進化可能！
                </div>
                <div style={{fontSize:12, color:'#94a5b8', marginBottom:16}}>
                  {['baby','juvenile','adult','evolved','legendary'][pet.evolutionStage-1] || '初級'}
                  {' → '}
                  {['幼年','成年','完全體','傳說','神話'][pet.evolutionStage-1] || '下一步'}
                </div>
                <div style={{display:'flex', gap:8, justifyContent:'center'}}>
                  <button className="btn btn-ghost" onClick={() => setShowEvolve(false)}
                    style={{padding:'8px 20px', fontSize:12}}>
                    下次先
                  </button>
                  <button onClick={doEvolve}
                    style={{
                      padding:'8px 24px', borderRadius:20, border:'none',
                      background:'linear-gradient(135deg,#f59e0b,#d97706)',
                      color:'white', fontSize:12, fontWeight:700, cursor:'pointer',
                      fontFamily:'inherit',
                    }}>
                    🌟 進化！
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════ Encounter Egg Popup ════ */}
      {showEncounterEgg && encounterEggRarity === null && eggs.length > 0 && (
        <div style={{
          position:'fixed', inset:0, zIndex:100,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,0.75)',
          padding:16,
        }} onClick={() => setShowEncounterEgg(false)}>
          <div style={{
            background:'#141b2d', border:`2px solid ${PC[eggs[eggs.length-1].rarity]}44`,
            borderRadius:20, padding:28, maxWidth:280, width:'100%', textAlign:'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{fontSize:48, marginBottom:8, animation:'wiggle 0.6s ease-in-out infinite'}}>🥚</div>
            <div style={{fontSize:13, fontWeight:700, marginBottom:4}}>
              發現蛋！🥚
            </div>
            <div style={{
              fontSize:11, fontWeight:700,
              color: PC[eggs[eggs.length-1].rarity],
              background: `${PC[eggs[eggs.length-1].rarity]}18`,
              display:'inline-block', padding:'2px 12px', borderRadius:10,
              marginBottom:8,
            }}>
              {RARITY_LABELS[eggs[eggs.length-1].rarity]}
            </div>
            <div style={{fontSize:11, color:'#94a5b8', marginBottom:16}}>
              已收錄到蛋列表！去蛋頁面孵化啦
            </div>
            <div style={{display:'flex', gap:8, justifyContent:'center'}}>
              <button onClick={() => setShowEncounterEgg(false)}
                style={{
                  padding:'8px 16px', border:'1px solid #2a3a5a',
                  background:'#1a2338', color:'#94a5b8', fontSize:11, fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit', borderRadius:12,
                }}>
                關閉
              </button>
              <button onClick={() => { setShowEncounterEgg(false); setTab('eggs') }}
                style={{
                  padding:'8px 16px', border:'none',
                  background:'linear-gradient(135deg,#8b5cf6,#7c3aed)', color:'white',
                  fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  borderRadius:12,
                }}>
                去蛋頁 🥚
              </button>
            </div>
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
