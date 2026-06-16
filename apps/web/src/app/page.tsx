'use client'

import { useState, useEffect, useRef } from 'react'
import { FIRST_PET_STEPS, ENCOUNTER_INTERVAL, rollEncounter, generateStats, Rarity, Mood, Pet, PetStatus, formatSteps } from '@pipz/core'
import { RARITY_COLORS, RARITY_LABELS } from '@pipz/core'
import PixelPet from '../components/PixelPet'

function genId(): string {
  return Math.random().toString(36).substring(2, 10)
}

const PET_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', hungry: '🍽️', sleepy: '😴', sad: '😢',
}

type PageTab = 'map' | 'pets' | 'eggs' | 'community'

export default function HomePage() {
  const [steps, setSteps] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [pets, setPets] = useState<Pet[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [isWalking, setIsWalking] = useState(false)
  const [showEgg, setShowEgg] = useState(false)
  const [eggHatching, setEggHatching] = useState(false)
  const [petAnim, setPetAnim] = useState<'idle' | 'walk' | 'happy'>('idle')
  const [page, setPage] = useState<PageTab>('map')
  const [log, setLog] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)
  const [encounterFx, setEncounterFx] = useState(false)

  const watchRef = useRef<number | null>(null)
  const lastPos = useRef<{ lat: number; lng: number } | null>(null)
  const stepsSinceEnc = useRef(0)
  const pity = useRef<Record<string, number>>({ legendary: 0, epic: 0 })

  const pet = pets[activeIdx] || null

  useEffect(() => { setMounted(true) }, [])

  const addLog = (m: string) => setLog(prev => [m, ...prev].slice(0, 10))

  const startWalk = () => {
    if (!navigator.geolocation) return addLog('❌ 唔支援 GPS')
    setIsWalking(true); setPetAnim('walk'); addLog('🚶 開始行路！')
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        if (pos.coords.accuracy > 100) return
        if (lastPos.current) {
          const d = haversine(lastPos.current.lat, lastPos.current.lng, pos.coords.latitude, pos.coords.longitude)
          const ns = Math.floor(d * 1300)
          if (ns > 0) {
            setSteps(s => s + ns); setTotalSteps(s => s + ns)
            stepsSinceEnc.current += ns
            checkEnc(ns)
          }
        }
        lastPos.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      },
      () => { setIsWalking(false); setPetAnim('idle') },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }

  const stopWalk = () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = null; setIsWalking(false); setPetAnim('idle'); addLog('⏹ 停低')
  }

  const checkEnc = (ns: number) => {
    if (pets.length === 0 && totalSteps + ns >= FIRST_PET_STEPS) { setShowEgg(true); return }
    if (stepsSinceEnc.current >= ENCOUNTER_INTERVAL) {
      const r = rollEncounter(stepsSinceEnc.current, pity.current)
      if (r) {
        stepsSinceEnc.current = 0
        if (r === Rarity.Legendary) pity.current.legendary = 0
        if (r === Rarity.Epic) pity.current.epic = 0
        const np: Pet = {
          id: genId(), userId: 'local', name: '',
          speciesId: genId(), imageUrl: '',
          rarity: r, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1, status: PetStatus.Baby,
          stats: generateStats(r, 1), mood: Mood.Happy, moodValue: 100,
          lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
          isForSale: false, price: 0,
        }
        setPets(prev => [...prev, np]); setActiveIdx(pets.length)
        setEncounterFx(true); setTimeout(() => setEncounterFx(false), 2000)
        addLog(`🐾 遇見 ${RARITY_LABELS[r]}！`)
      }
    }
  }

  const addSteps = () => {
    const n = 500
    setSteps(s => s + n); setTotalSteps(s => s + n)
    stepsSinceEnc.current += n
    if (pets.length === 0 && totalSteps + n >= FIRST_PET_STEPS) { setShowEgg(true); return }
    const r = rollEncounter(stepsSinceEnc.current, pity.current)
    if (r) {
      stepsSinceEnc.current = 0
      const np: Pet = {
        id: genId(), userId: 'local', name: '',
        speciesId: genId(), imageUrl: '',
        rarity: r, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1, status: PetStatus.Baby,
        stats: generateStats(r, 1), mood: Mood.Happy, moodValue: 100,
        lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
        isForSale: false, price: 0,
      }
      setPets(prev => [...prev, np]); setActiveIdx(pets.length)
      setEncounterFx(true); setTimeout(() => setEncounterFx(false), 2000)
      addLog(`🐾 遇見 ${RARITY_LABELS[r]}！`)
    }
  }

  const feed = () => {
    if (!pet) return
    setPets(prev => prev.map((p, i) => i === activeIdx ? { ...p, mood: Mood.Happy, moodValue: 100, lastFedAt: Date.now(), xp: p.xp + 10 } : p))
    setPetAnim('happy'); addLog('🍖 餵食咗！+10XP')
    setTimeout(() => setPetAnim('idle'), 1500)
  }

  const petAction = () => {
    if (!pet) return
    setPetAnim('happy')
    setPets(prev => prev.map((p, i) => i === activeIdx ? { ...p, mood: Mood.Happy, moodValue: Math.min(100, p.moodValue + 15) } : p))
    addLog('✋ 摸頭～')
    setTimeout(() => setPetAnim('idle'), 1500)
  }

  const playAction = () => {
    if (!pet) return
    setPetAnim('happy')
    setPets(prev => prev.map((p, i) => i === activeIdx ? { ...p, mood: Mood.Excited, moodValue: Math.min(100, p.moodValue + 20), xp: p.xp + 5 } : p))
    addLog('🎾 玩緊！+5XP')
    setTimeout(() => setPetAnim('idle'), 2000)
  }

  const hatchEgg = () => {
    setEggHatching(true)
    setTimeout(() => {
      setShowEgg(false)
      setEggHatching(false)
      const np: Pet = {
        id: genId(), userId: 'local', name: '',
        speciesId: genId(), imageUrl: '',
        rarity: Rarity.Common, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1, status: PetStatus.Baby,
        stats: generateStats(Rarity.Common, 1), mood: Mood.Happy, moodValue: 100,
        lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
        isForSale: false, price: 0,
      }
      setPets(prev => [...prev, np]); setActiveIdx(pets.length)
      addLog('🎉 孵化成功！')
    }, 2000)
  }

  const xpMax = (p: Pet) => p.level * 50
  const xpPct = (p: Pet) => Math.min(100, (p.xp / xpMax(p)) * 100)

  useEffect(() => {
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current) }
  }, [])

  // Nearby pets (for map page)
  const nearbyPets = pets.length > 0 ? pets.slice(-4).reverse() : []

  // ═══════════ RENDER ═══════════

  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto overflow-hidden select-none relative">
      {/* ── Sky Background ── */}
      <div className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #0c1a2a 30%, #0d2818 70%, #0a1f12 100%)'
        }}
      >
        {/* Stars */}
        <div className="absolute top-4 left-6 w-1 h-1 rounded-full bg-white star" />
        <div className="absolute top-8 right-10 w-1.5 h-1.5 rounded-full bg-white star" />
        <div className="absolute top-16 left-12 w-0.5 h-0.5 rounded-full bg-white star" />
        <div className="absolute top-20 right-6 w-1 h-1 rounded-full bg-blue-200 star" />
        <div className="absolute top-12 left-1/3 w-0.5 h-0.5 rounded-full bg-white star" />

        {/* Ground / Grass */}
        <div className="absolute bottom-0 left-0 right-0 h-[30%]"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, #0a2a14 20%, #0d3318 60%, #0f3d1a 100%)'
          }}
        >
          {/* Grass blades */}
          <svg className="absolute bottom-0 left-0 w-full h-12" viewBox="0 0 400 48" preserveAspectRatio="none">
            <path d="M0,48 Q10,30 20,48 Q30,25 40,48 Q50,28 60,48 Q70,22 80,48 Q90,26 100,48 Q110,20 120,48 Q130,28 140,48 Q150,24 160,48 Q170,30 180,48 Q190,18 200,48 Q210,26 220,48 Q230,22 240,48 Q250,30 260,48 Q270,20 280,48 Q290,28 300,48 Q310,24 320,48 Q330,30 340,48 Q350,20 360,48 Q370,26 380,48 Q390,22 400,48"
              fill="none" stroke="#1a5c30" strokeWidth="2" className="grass-sway" />
            <path d="M0,44 Q8,26 16,42 Q24,20 32,42 Q40,22 48,42 Q56,18 64,42 Q72,24 80,42 Q88,16 96,42 Q104,22 112,42 Q120,20 128,42 Q136,24 144,42 Q152,14 160,42 Q168,20 176,42 Q184,18 192,42 Q200,24 208,42 Q216,16 224,42 Q232,22 240,42 Q248,20 256,42 Q264,24 272,42 Q280,18 288,42 Q296,22 304,42 Q312,14 320,42 Q328,20 336,42 Q344,22 352,42 Q360,18 368,42 Q376,24 384,42 Q392,16 400,42"
              fill="none" stroke="#2d6b3a" strokeWidth="1.5" className="grass-sway-2" />
            <path d="M0,46 Q12,28 24,44 Q36,22 48,44 Q60,26 72,44 Q84,18 96,44 Q108,24 120,44 Q132,20 144,44 Q156,26 168,44 Q180,16 192,44 Q204,22 216,44 Q228,28 240,44 Q252,18 264,44 Q276,24 288,44 Q300,20 312,44 Q324,26 336,44 Q348,22 360,44 Q372,28 384,44 Q396,18 400,44"
              fill="none" stroke="#3d7a3d" strokeWidth="1" className="grass-sway-3" />
          </svg>
        </div>
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-extrabold"
            style={{
              background: 'linear-gradient(135deg, #c084fc, #22d3ee)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em'
            }}>
            Pipz
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 glass-light rounded-full px-2.5 py-1">
            <span className="text-cyan-400">👣</span>
            <span className="font-bold text-white text-[11px]">{mounted ? formatSteps(totalSteps) : '0'}</span>
          </div>
          {isWalking && (
            <span className="flex items-center gap-1 text-green-400 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              GPS
            </span>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative z-10 flex-1 overflow-y-auto px-3 pb-1">

        {/* ══════ MAP TAB ══════ */}
        {page === 'map' && (
          <div className="flex flex-col gap-2 min-h-full fade-in">

            {/* ── Pet/Egg Display Card ── */}
            <div className="relative rounded-2xl overflow-hidden min-h-[180px] glass border border-white/5">
              {/* Inner glow */}
              <div className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.08) 0%, transparent 70%)'
                }}
              />

              {/* Encounter flash */}
              {encounterFx && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-purple-900/60 backdrop-blur-sm fade-in">
                  <div className="text-center animate-bounce">
                    <div className="text-5xl mb-1">✨</div>
                    <div className="text-sm font-bold text-purple-300">遇見新寵物！</div>
                  </div>
                </div>
              )}

              {!mounted ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-1">🥚</div>
                    <p className="text-xs text-gray-400">行 {formatSteps(FIRST_PET_STEPS)} 步孵化</p>
                  </div>
                </div>
              ) : showEgg ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  {eggHatching ? (
                    <>
                      <div className="text-5xl egg-crack">🥚</div>
                      <div className="text-sm text-purple-400 font-bold animate-pulse">孵化中...</div>
                      {/* Cracking particles */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {['✨', '⭐', '💫', '🌟'].map((s, i) => (
                          <span key={i} className="absolute text-lg"
                            style={{
                              animation: `bounce 0.5s ease-in-out ${i * 0.15}s infinite`,
                              top: `${30 + Math.random() * 40}%`,
                              left: `${30 + Math.random() * 40}%`
                            }}
                          >{s}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl egg-shake">🥚</div>
                      <p className="text-sm text-purple-400 font-bold">就快孵化！</p>
                      <div className="flex gap-1 text-xs text-gray-400">
                        <span>❤️</span>
                        <span>溫度剛剛好</span>
                      </div>
                      <button onClick={hatchEgg}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-full text-xs font-bold active:scale-90 transition-transform shadow-lg shadow-purple-900/30">
                        孵化 🐣
                      </button>
                    </>
                  )}
                </div>
              ) : pet ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 py-2">
                  {/* Rarity color glow behind pet */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background: `radial-gradient(circle, ${PET_COLORS[pet.rarity]}33 0%, transparent 70%)`,
                      boxShadow: `0 0 30px ${PET_COLORS[pet.rarity]}22`
                    }}
                  >
                    <div className={`${petAnim === 'walk' ? 'animate-bounce' : petAnim === 'happy' ? 'animate-pulse' : ''}`}>
                      <PixelPet color={PET_COLORS[pet.rarity]} size={4.5} animation={petAnim} />
                    </div>
                  </div>
                  {/* Rarity badge + Level */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide"
                      style={{ color: RARITY_COLORS[pet.rarity], backgroundColor: RARITY_COLORS[pet.rarity] + '20' }}>
                      {RARITY_LABELS[pet.rarity]}
                    </span>
                    <span className="text-[10px] text-gray-400">Lv.{pet.level}</span>
                    {/* CP */}
                    <span className="text-[10px] font-bold text-yellow-400 cp-glow">
                      CP {pet.stats.speed + pet.stats.luck + pet.stats.charm + pet.stats.energy}
                    </span>
                  </div>
                  {/* Stats */}
                  <div className="flex gap-2.5 text-[9px] text-gray-500">
                    <span>⚡{pet.stats.speed}</span>
                    <span>🍀{pet.stats.luck}</span>
                    <span>💜{pet.stats.charm}</span>
                    <span>🔋{pet.stats.energy}</span>
                  </div>
                  {/* Mood */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{MOOD_EMOJI[pet.mood] || '😐'}</span>
                    <span className="text-[9px] text-green-400">{pet.mood === 'happy' ? '開心' : pet.mood}</span>
                  </div>
                  {/* XP Bar */}
                  <div className="w-32">
                    <div className="flex justify-between text-[8px] text-gray-500 mb-0.5">
                      <span>EXP</span>
                      <span>{pet.xp}/{xpMax(pet)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-700/50 overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, #a855f7, #22d3ee)',
                          width: `${xpPct(pet)}%`,
                          transition: 'width 0.5s ease'
                        }}
                      />
                    </div>
                  </div>
                  {/* Interaction buttons */}
                  <div className="flex gap-2 mt-0.5">
                    <button onClick={feed}
                      className="px-3 py-1 bg-green-600/80 text-white rounded-full text-[10px] font-bold active:scale-90 transition-transform shadow-sm backdrop-blur-sm border border-green-500/20">
                      🍖餵食
                    </button>
                    <button onClick={petAction}
                      className="px-3 py-1 bg-blue-600/80 text-white rounded-full text-[10px] font-bold active:scale-90 transition-transform shadow-sm backdrop-blur-sm border border-blue-500/20">
                      ✋摸頭
                    </button>
                    <button onClick={playAction}
                      className="px-3 py-1 bg-amber-600/80 text-white rounded-full text-[10px] font-bold active:scale-90 transition-transform shadow-sm backdrop-blur-sm border border-amber-500/20">
                      🎾玩
                    </button>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                  <div className="text-4xl mb-1">🥚</div>
                  <p className="text-sm text-gray-400 font-medium">未有寵物</p>
                  <div className="w-40 mt-1">
                    <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
                      <span>孵化進度</span>
                      <span>{formatSteps(totalSteps)}/{formatSteps(FIRST_PET_STEPS)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-700/50 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300"
                        style={{
                          background: 'linear-gradient(90deg, #a855f7, #22d3ee)',
                          width: `${Math.min(100, (totalSteps / FIRST_PET_STEPS) * 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-[9px] text-gray-500 text-center mt-1">行 1,000 步孵化第一隻寵物</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Walk Button + Steps Row ── */}
            <div className="flex items-center justify-around glass rounded-2xl px-3 py-2.5 border border-white/5">
              {/* Today Steps */}
              <div className="text-center">
                <div className="text-lg font-bold text-white">{mounted ? formatSteps(steps) : '0'}</div>
                <div className="text-[9px] text-gray-400 tracking-wide">今日步數</div>
              </div>

              {/* Walk Button (Pokéball style) */}
              <div className="relative flex items-center justify-center">
                {/* Pulse ring */}
                <div className={`absolute w-16 h-16 rounded-full border-2 border-purple-400/30 walk-ring-pulse ${isWalking ? 'opacity-100' : 'opacity-0'}`} />
                <button onClick={isWalking ? stopWalk : startWalk}
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-lg active:scale-90 transition-all duration-200 btn-glow ${
                    isWalking
                      ? 'bg-gradient-to-br from-red-500 to-red-700'
                      : 'bg-gradient-to-br from-purple-500 to-purple-700'
                  }`}
                  style={{
                    boxShadow: isWalking
                      ? '0 4px 15px rgba(239,68,68,0.4), inset 0 -2px 4px rgba(0,0,0,0.3)'
                      : '0 4px 15px rgba(168,85,247,0.3), inset 0 -2px 4px rgba(0,0,0,0.3)'
                  }}
                >
                  {isWalking ? (
                    <div className="flex flex-col items-center">
                      <span className="text-sm">⏹</span>
                      <span className="text-[6px] text-white/70 -mt-0.5">停止</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-lg">🚶</span>
                      <span className="text-[6px] text-white/70 -mt-0.5">行路</span>
                    </div>
                  )}
                </button>
              </div>

              {/* Total Steps */}
              <div className="text-center">
                <div className="text-lg font-bold text-white">{mounted ? formatSteps(totalSteps) : '0'}</div>
                <div className="text-[9px] text-gray-400 tracking-wide">總計步數</div>
              </div>
            </div>

            {/* ── Nearby Pets Horizontal Slider ── */}
            {nearbyPets.length > 0 && (
              <div className="glass rounded-2xl px-3 py-2.5 border border-white/5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px]">📍</span>
                    <span className="text-[10px] font-bold text-gray-300">附近</span>
                  </div>
                  <span className="text-[8px] text-gray-500">{nearbyPets.length}隻</span>
                </div>
                <div className="flex gap-2 overflow-x-auto nearby-scroll pb-0.5">
                  {nearbyPets.map((p, i) => (
                    <button key={p.id} onClick={() => { setActiveIdx(pets.indexOf(p)); setPage('map') }}
                      className="flex-shrink-0 glass-light rounded-xl p-2 text-center min-w-[72px] active:scale-95 transition-transform">
                      {/* Pet Mini */}
                      <div className="w-9 h-9 mx-auto rounded-lg flex items-center justify-center mb-1"
                        style={{ background: `${PET_COLORS[p.rarity]}15` }}>
                        <PixelPet color={PET_COLORS[p.rarity]} size={2.5} animation="idle" />
                      </div>
                      {/* Rarity */}
                      <div className="text-[7px] font-bold mb-0.5" style={{ color: RARITY_COLORS[p.rarity] }}>
                        {RARITY_LABELS[p.rarity]}
                      </div>
                      {/* CP */}
                      <div className="text-[8px] font-bold text-yellow-400">
                        CP {p.stats.speed + p.stats.luck + p.stats.charm + p.stats.energy}
                      </div>
                      <div className="text-[7px] text-gray-500">Lv.{p.level}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Test Button + Log ── */}
            <div className="flex items-center justify-between">
              <button onClick={addSteps}
                className="glass-light rounded-full px-3 py-1.5 text-[10px] text-gray-300 active:scale-90 transition-transform border border-white/5">
                +500 測試步數
              </button>
              <div className="flex items-center gap-1 text-[8px] text-gray-600">
                <span className="w-1 h-1 rounded-full bg-purple-500/50" />
                <span>使用 GPS 記錄真實步數</span>
              </div>
            </div>

            {/* Log */}
            {log.length > 0 && (
              <div className="glass-light rounded-xl px-2.5 py-1.5 border border-white/5">
                <div className="text-[8px] text-gray-500 mb-0.5">📝 活動記錄</div>
                {log.slice(0, 3).map((m, i) => (
                  <div key={i} className="text-[9px] text-gray-400 py-0.5">{m}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════ PETS TAB ══════ */}
        {page === 'pets' && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-200">🐾 寵物</h2>
              <span className="text-[10px] text-gray-500">{pets.length}隻</span>
            </div>
            {pets.length === 0 ? (
              <div className="glass rounded-2xl text-center py-16 border border-white/5">
                <div className="text-4xl mb-2">🥚</div>
                <p className="text-gray-500 text-xs">未有寵物，行路孵化啦！</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {pets.map((p, i) => (
                  <button key={p.id} onClick={() => { setActiveIdx(i); setPage('map') }}
                    className="glass rounded-xl p-3 text-center border border-white/5 active:scale-95 transition-transform hover:border-purple-500/30">
                    {/* Pet with glow */}
                    <div className="w-11 h-11 mx-auto mb-1.5 rounded-xl flex items-center justify-center"
                      style={{ background: `radial-gradient(circle, ${PET_COLORS[p.rarity]}20, transparent)` }}>
                      <PixelPet color={PET_COLORS[p.rarity]} size={3} animation="idle" />
                    </div>
                    <div className="text-[10px] font-bold" style={{ color: RARITY_COLORS[p.rarity] }}>
                      {RARITY_LABELS[p.rarity]}
                    </div>
                    <div className="text-[8px] text-yellow-400 font-bold">CP {p.stats.speed + p.stats.luck + p.stats.charm + p.stats.energy}</div>
                    <div className="text-[8px] text-gray-500">Lv.{p.level}</div>
                    <span className="text-[10px]">{MOOD_EMOJI[p.mood] || '😐'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════ EGGS TAB ══════ */}
        {page === 'eggs' && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-200">🥚 蛋</h2>
              <span className="text-[10px] text-gray-500">孵化器 1/1</span>
            </div>

            {/* Egg Incubator */}
            <div className="glass rounded-2xl p-3 border border-white/5 mb-2">
              <div className="flex items-center gap-3">
                {/* Egg slot */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent)',
                    border: '2px dashed rgba(168,85,247,0.3)'
                  }}
                >
                  {pets.length === 0 ? (
                    <span className="text-3xl">🥚</span>
                  ) : (
                    <span className="text-3xl opacity-30">🥚</span>
                  )}
                </div>
                {/* Incubator info */}
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-gray-300">
                    {pets.length === 0 ? '基本孵化器' : '已孵化'}
                  </div>
                  <div className="text-[9px] text-gray-500 mb-1">
                    {pets.length === 0 ? '行 1,000 步孵化' : '完成！'}
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-700/50 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{
                        background: pets.length === 0
                          ? 'linear-gradient(90deg, #a855f7, #22d3ee)'
                          : 'linear-gradient(90deg, #22c55e, #16a34a)',
                        width: pets.length === 0
                          ? `${Math.min(100, (totalSteps / FIRST_PET_STEPS) * 100)}%`
                          : '100%'
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] text-gray-600 mt-0.5">
                    <span>進度</span>
                    <span>
                      {pets.length === 0
                        ? `${formatSteps(totalSteps)}/${formatSteps(FIRST_PET_STEPS)}`
                        : '✅ 完成'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Empty slots */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2].map(i => (
                <div key={i} className="glass rounded-xl p-3 text-center border border-white/5 opacity-50">
                  <div className="text-2xl mb-1">🔒</div>
                  <div className="text-[9px] text-gray-500">額外孵化器</div>
                  <div className="text-[7px] text-gray-600">即將開放</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════ COMMUNITY TAB ══════ */}
        {page === 'community' && (
          <div className="fade-in flex flex-col items-center justify-center py-12">
            <div className="glass rounded-2xl p-6 text-center border border-white/5 max-w-xs">
              <div className="text-5xl mb-3">🏪</div>
              <h3 className="text-sm font-bold text-gray-200 mb-1">社群 &amp; 交易</h3>
              <p className="text-[10px] text-gray-500 mb-3">與其他玩家交換寵物</p>
              <div className="flex flex-col gap-1.5">
                <div className="glass-light rounded-lg px-3 py-2 text-[10px] text-gray-400 flex items-center justify-between">
                  <span>行路競賽</span>
                  <span className="text-purple-400">即將開放</span>
                </div>
                <div className="glass-light rounded-lg px-3 py-2 text-[10px] text-gray-400 flex items-center justify-between">
                  <span>交易市場</span>
                  <span className="text-purple-400">即將開放</span>
                </div>
                <div className="glass-light rounded-lg px-3 py-2 text-[10px] text-gray-400 flex items-center justify-between">
                  <span>好友列表</span>
                  <span className="text-purple-400">即將開放</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── Bottom Navigation (Floating Glass Pill) ── */}
      <nav className="relative z-20 px-3 pb-2 pt-1">
        <div className="nav-glass rounded-2xl px-1.5 py-1 max-w-md mx-auto">
          <div className="grid grid-cols-4 gap-0.5">
            {([
              { key: 'map', label: '地圖', icon: '🗺️' },
              { key: 'pets', label: '寵物', icon: '🐾' },
              { key: 'eggs', label: '蛋', icon: '🥚' },
              { key: 'community', label: '社群', icon: '🏪' },
            ] as const).map((tab) => (
              <button key={tab.key} onClick={() => setPage(tab.key as PageTab)}
                className={`flex flex-col items-center py-1.5 rounded-xl transition-all duration-200 ${
                  page === tab.key
                    ? 'bg-purple-600/40 shadow-sm shadow-purple-900/20'
                    : 'hover:bg-white/5'
                }`}>
                <span className={`text-sm leading-none mb-0.5 transition-transform duration-200 ${page === tab.key ? 'scale-110' : ''}`}>
                  {tab.icon}
                </span>
                <span className={`text-[8px] font-bold leading-none transition-colors duration-200 ${
                  page === tab.key ? 'text-purple-300' : 'text-gray-500'
                }`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>
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
