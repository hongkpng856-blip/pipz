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
  happy: '😊',
  excited: '🤩',
  hungry: '🍽️',
  sleepy: '😴',
  sad: '😢',
}

const RARITY_GRADIENT: Record<string, string> = {
  common: 'from-[#9ca3af] to-[#6b7280]',
  uncommon: 'from-[#22c55e] to-[#16a34a]',
  rare: 'from-[#3b82f6] to-[#2563eb]',
  epic: 'from-[#a855f7] to-[#7c3aed]',
  legendary: 'from-[#f59e0b] to-[#d97706]',
}

type PageTab = 'map' | 'pets' | 'eggs' | 'social'

export default function HomePage() {
  const [steps, setSteps] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [pets, setPets] = useState<Pet[]>([])
  const [activePetIndex, setActivePetIndex] = useState(0)
  const [isWalking, setIsWalking] = useState(false)
  const [encounterLog, setEncounterLog] = useState<string[]>([])
  const [showEgg, setShowEgg] = useState(false)
  const [eggCrack, setEggCrack] = useState(0)
  const [petAnim, setPetAnim] = useState<'idle' | 'walk' | 'happy'>('idle')
  const [page, setPage] = useState<PageTab>('map')
  const [isHatching, setIsHatching] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [nearby, setNearby] = useState<{ rarity: Rarity; steps: number }[]>([])

  const watchIdRef = useRef<number | null>(null)
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const stepsSinceEncounter = useRef(0)
  const pityCounter = useRef<Record<string, number>>({ legendary: 0, epic: 0 })
  const drawerRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const dragOffset = useRef(0)

  const activePet = pets[activePetIndex] || null

  const addLog = (msg: string) => setEncounterLog(prev => [msg, ...prev].slice(0, 20))

  const startWalking = () => {
    if (!navigator.geolocation) { addLog('唔支援 GPS'); return }
    setIsWalking(true); setPetAnim('walk'); addLog('開始行路！')
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (pos.coords.accuracy > 100) return
        if (lastPosRef.current) {
          const dist = haversine(lastPosRef.current.lat, lastPosRef.current.lng, pos.coords.latitude, pos.coords.longitude)
          const ns = Math.floor(dist * 1300)
          if (ns > 0) {
            setSteps(s => s + ns)
            setTotalSteps(s => s + ns)
            stepsSinceEncounter.current += ns
            checkEncounter(ns)
          }
        }
        lastPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      },
      () => { setIsWalking(false); setPetAnim('idle') },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }

  const stopWalking = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    watchIdRef.current = null
    setIsWalking(false); setPetAnim('idle'); addLog('停低休息')
  }

  const checkEncounter = (newSteps: number) => {
    if (pets.length === 0 && totalSteps + newSteps >= FIRST_PET_STEPS) {
      setShowEgg(true); return
    }
    if (stepsSinceEncounter.current >= ENCOUNTER_INTERVAL) {
      const rarity = rollEncounter(stepsSinceEncounter.current, pityCounter.current)
      if (rarity) {
        stepsSinceEncounter.current = 0
        if (rarity === Rarity.Legendary) pityCounter.current.legendary = 0
        if (rarity === Rarity.Epic) pityCounter.current.epic = 0
        const np: Pet = {
          id: genId(), userId: 'local', name: '',
          speciesId: genId(), imageUrl: '',
          rarity, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1, status: PetStatus.Baby,
          stats: generateStats(rarity, 1), mood: Mood.Happy, moodValue: 100,
          lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
          isForSale: false, price: 0,
        }
        setPets(prev => [...prev, np])
        setActivePetIndex(pets.length)
        addLog(`🐾 遇見 ${RARITY_LABELS[rarity]} 寵物！`)
        setPetAnim('happy')
        setNearby(prev => prev.filter(n => n.rarity !== rarity))
        setTimeout(() => setPetAnim('idle'), 2000)
      }
    }
  }

  const hatchEgg = () => {
    setIsHatching(true)
    const crackInterval = setInterval(() => setEggCrack(c => c + 1), 300)
    setTimeout(() => {
      clearInterval(crackInterval); setEggCrack(0); setIsHatching(false)
      const rarities = [Rarity.Common, Rarity.Uncommon, Rarity.Rare]
      const r = rarities[Math.floor(Math.random() * rarities.length)]
      const fp: Pet = {
        id: genId(), userId: 'local', name: '',
        speciesId: genId(), imageUrl: '',
        rarity: r as Rarity, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1, status: PetStatus.Baby,
        stats: generateStats(r as Rarity, 1), mood: Mood.Excited, moodValue: 100,
        lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
        isForSale: false, price: 0,
      }
      setPets([fp]); setActivePetIndex(0); setShowEgg(false)
      setPetAnim('happy')
      addLog(`🎉 孵化成功！${RARITY_LABELS[r as Rarity]} 寵物出世！`)
      setTimeout(() => setPetAnim('idle'), 3000)
    }, 2000)
  }

  const feedPet = () => {
    if (!activePet) return
    setPets(prev => prev.map((p, i) =>
      i === activePetIndex ? { ...p, mood: Mood.Happy, moodValue: 100, lastFedAt: Date.now(), xp: p.xp + 10 } : p
    ))
    setPetAnim('happy'); addLog(`${activePet.name || '寵物'} 食飽飽！+10 XP`)
    setTimeout(() => setPetAnim('idle'), 2000)
  }

  const petPet = () => {
    if (!activePet) return
    setPetAnim('happy')
    setPets(prev => prev.map((p, i) =>
      i === activePetIndex ? { ...p, mood: Mood.Happy, moodValue: Math.min(100, p.moodValue + 15), lastInteractionAt: Date.now() } : p
    ))
    addLog(`${activePet.name || '寵物'} 好享受摸頭～`)
    setTimeout(() => setPetAnim('idle'), 2000)
  }

  const playPet = () => {
    if (!activePet) return
    setPetAnim('happy')
    setPets(prev => prev.map((p, i) =>
      i === activePetIndex ? { ...p, mood: Mood.Excited, moodValue: Math.min(100, p.moodValue + 20), xp: p.xp + 5, lastInteractionAt: Date.now() } : p
    ))
    addLog(`${activePet.name || '寵物'} 玩得好癲！+5 XP`)
    setTimeout(() => setPetAnim('idle'), 2500)
  }

  const addTestSteps = () => {
    const added = 500
    setSteps(s => s + added); setTotalSteps(s => s + added)
    stepsSinceEncounter.current += added
    if (pets.length === 0 && totalSteps + added >= FIRST_PET_STEPS) { setShowEgg(true); return }
    const rarity = rollEncounter(stepsSinceEncounter.current, pityCounter.current)
    if (rarity) {
      stepsSinceEncounter.current = 0
      const np: Pet = {
        id: genId(), userId: 'local', name: '',
        speciesId: genId(), imageUrl: '',
        rarity, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1, status: PetStatus.Baby,
        stats: generateStats(rarity, 1), mood: Mood.Happy, moodValue: 100,
        lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
        isForSale: false, price: 0,
      }
      setPets(prev => [...prev, np])
      setActivePetIndex(pets.length)
      addLog(`🐾 遇見 ${RARITY_LABELS[rarity]} 寵物！`)
    }
  }

  const xpToNext = (pet: Pet) => pet.level * 50
  const xpProgress = (pet: Pet) => Math.min(100, (pet.xp / xpToNext(pet)) * 100)

  const moodColor = (mood: string) => {
    if (mood === 'happy' || mood === 'excited') return '#22c55e'
    if (mood === 'hungry') return '#f59e0b'
    if (mood === 'sleepy') return '#3b82f6'
    if (mood === 'sad') return '#ef4444'
    return '#94a3b8'
  }

  const eggProgress = () => Math.min(100, (totalSteps / FIRST_PET_STEPS) * 100)

  // Nearby simulation
  useEffect(() => {
    if (pets.length === 0) return
    if (nearby.length < 3 && Math.random() > 0.97) {
      const r = [Rarity.Common, Rarity.Uncommon, Rarity.Rare, Rarity.Epic][Math.floor(Math.random() * 4)] as Rarity
      if (!nearby.find(n => n.rarity === r)) {
        setNearby(prev => [...prev, { rarity: r, steps: Math.floor(Math.random() * 200) + 50 }])
      }
    }
  }, [pets.length, nearby])

  useEffect(() => {
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current) }
  }, [])

  // Drawer drag
  const onDrawerPointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY
    document.addEventListener('pointermove', onDrawerPointerMove)
    document.addEventListener('pointerup', onDrawerPointerUp)
  }
  const onDrawerPointerMove = (e: PointerEvent) => {
    dragOffset.current = e.clientY - dragStartY.current
    if (drawerRef.current) {
      drawerRef.current.style.transform = `translateY(${Math.max(0, dragOffset.current)}px)`
    }
  }
  const onDrawerPointerUp = () => {
    document.removeEventListener('pointermove', onDrawerPointerMove)
    document.removeEventListener('pointerup', onDrawerPointerUp)
    if (drawerRef.current) drawerRef.current.style.transform = ''
    if (dragOffset.current < -80) setDrawerOpen(true)
    else if (dragOffset.current > 80) setDrawerOpen(false)
    dragOffset.current = 0
  }

  const tabIcons: Record<PageTab, { icon: string; label: string }> = {
    map: { icon: '🗺️', label: '地圖' },
    pets: { icon: '🐾', label: '寵物' },
    eggs: { icon: '🥚', label: '蛋' },
    social: { icon: '🏪', label: '社群' },
  }

  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto bg-[#0f172a] text-[#f1f5f9] select-none overflow-hidden relative">
      {/* ── Map / Background ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c1929] via-[#0f2847] to-[#1a3a2a]" />

      {/* Decorative ground path */}
      <div className="absolute bottom-28 left-0 right-0 h-48">
        {/* Grass patches */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, #22c55e 0%, transparent 40%),
                              radial-gradient(circle at 80% 70%, #16a34a 0%, transparent 35%),
                              radial-gradient(circle at 50% 90%, #15803d 0%, transparent 30%)`
          }}
        />
        {/* Path */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-32 opacity-10"
          style={{
            background: `linear-gradient(to top, #94a3b8 0%, transparent 100%)`,
            clipPath: 'polygon(30% 0%, 70% 0%, 85% 100%, 15% 100%)',
          }}
        />
        {/* Grass blades */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute bottom-24 w-0.5 bg-[#22c55e]/20 rounded-full"
            style={{
              left: `${10 + i * 8}%`,
              height: `${6 + Math.sin(i * 1.5) * 4}px`,
              transform: `rotate(${-15 + Math.sin(i * 2) * 20}deg)`,
              transformOrigin: 'bottom',
              animation: `sway ${2 + Math.random()}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Stars */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full opacity-30 animate-pulse"
          style={{
            top: `${5 + Math.random() * 20}%`,
            left: `${5 + Math.random() * 90}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        />
      ))}

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center text-xs font-bold shadow-lg shadow-[#a855f7]/30">
            P
          </div>
          <h1 className="text-base font-bold">Pipz</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <span className="text-[11px]">👣</span>
            <span className="text-xs font-bold">{formatSteps(totalSteps)}</span>
          </div>
          {isWalking && (
            <div className="w-6 h-6 rounded-full bg-[#22c55e]/20 flex items-center justify-center animate-pulse">
              <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
            </div>
          )}
        </div>
      </header>

      {/* ── Scrollable Main ── */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 pb-2">
        {/* ── MAP TAB ── */}
        {page === 'map' && (
          <div className="flex flex-col h-full animate-fade-in">
            {/* Pet / Egg display — like Pokémon on map */}
            <div className="relative flex-1 min-h-[280px] flex flex-col items-center justify-center">
              {/* Encounter ring */}
              {activePet && !showEgg && (
                <div className="absolute w-48 h-48 rounded-full border-2 border-dashed border-[#a855f7]/20 animate-pulse-glow" />
              )}

              {isHatching ? (
                <div className="flex flex-col items-center">
                  <div className={`text-7xl mb-3 ${eggCrack > 3 ? 'animate-egg-shake' : 'animate-egg-pulse'}`}>
                    {eggCrack > 5 ? '🐣' : '🥚'}
                  </div>
                  <div className="flex gap-1 mb-2">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-[#a855f7] animate-bounce" style={{ animationDelay: `${i * 0.15}s`, opacity: eggCrack > i * 2 ? 1 : 0.3 }} />
                    ))}
                  </div>
                  <p className="text-sm text-[#a855f7] font-bold">孵化中...</p>
                </div>
              ) : showEgg ? (
                <div className="flex flex-col items-center cursor-pointer" onClick={hatchEgg}>
                  <div className="relative">
                    <div className="text-7xl mb-2 animate-egg-pulse drop-shadow-2xl">🥚</div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#a855f7]/30 rounded-full blur-sm" />
                  </div>
                  <div className="flex items-center gap-2 mt-1 mb-3">
                    <div className="text-sm font-bold text-[#f1f5f9]">就快孵化！</div>
                    <span className="text-xs text-[#94a3b8]">㩒個蛋</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); hatchEgg() }}
                    className="px-8 py-2.5 bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white rounded-full font-bold text-sm shadow-lg shadow-[#a855f7]/30 hover:scale-105 active:scale-95 transition-all"
                  >
                    孵化 🎉
                  </button>
                </div>
              ) : activePet ? (
                <div className="flex flex-col items-center">
                  {/* Pet on grass */}
                  <div className="relative mb-1">
                    <div
                      className={`bg-[#0f172a]/60 backdrop-blur-sm rounded-2xl p-3 border border-white/10 ${
                        petAnim === 'happy' ? 'animate-happy-jump' : petAnim === 'walk' ? 'animate-walk-bounce' : ''
                      }`}
                    >
                      <PixelPet color={PET_COLORS[activePet.rarity]} size={5} animation={petAnim} />
                    </div>
                    {/* Shadow under pet */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-2 bg-black/30 rounded-full blur-sm" />
                  </div>
                  {/* CP / Level badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                      style={{
                        backgroundColor: `${RARITY_COLORS[activePet.rarity]}20`,
                        color: RARITY_COLORS[activePet.rarity],
                        borderColor: `${RARITY_COLORS[activePet.rarity]}40`,
                      }}
                    >
                      {RARITY_LABELS[activePet.rarity]}
                    </div>
                    <div className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] text-[#94a3b8]">
                      CP {activePet.stats.speed + activePet.stats.luck + activePet.stats.charm + activePet.stats.energy}
                    </div>
                    <div className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] text-[#94a3b8]">
                      Lv.{activePet.level}
                    </div>
                  </div>
                  {/* Pet name */}
                  <div className="text-lg font-bold text-[#f1f5f9] mb-1">
                    {activePet.name || `${RARITY_LABELS[activePet.rarity]}寵物`}
                  </div>
                  {/* Mood */}
                  <div className="flex items-center gap-1 text-xs" style={{ color: moodColor(activePet.mood) }}>
                    <span>{MOOD_EMOJI[activePet.mood] || '😐'}</span>
                    <span>{activePet.mood === 'happy' ? '開心' : activePet.mood === 'excited' ? '興奮' : activePet.mood === 'hungry' ? '肚餓' : activePet.mood === 'sleepy' ? '眼瞓' : activePet.mood}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="text-6xl mb-3 opacity-40">🥚</div>
                  <p className="text-[#94a3b8] text-sm mb-1">未有寵物</p>
                  <p className="text-[#64748b] text-xs">行路去搵你嘅第一隻寵物啦</p>
                  {/* Egg progress */}
                  <div className="w-48 mt-4">
                    <div className="flex justify-between text-[10px] text-[#64748b] mb-1">
                      <span>孵化進度</span>
                      <span>{formatSteps(totalSteps)} / {formatSteps(FIRST_PET_STEPS)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#a855f7] to-[#22d3ee] transition-all duration-500"
                        style={{ width: `${eggProgress()}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Nearby Tracker (like Pokémon Go nearby) ── */}
            {activePet && !showEgg && (
              <div className="mb-2">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">附近</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {/* Show encountered pets as nearby */}
                  {pets.slice(-3).reverse().map((pet) => (
                    <div key={pet.id}
                      onClick={() => { setActivePetIndex(pets.indexOf(pet)); }}
                      className="flex-shrink-0 flex flex-col items-center bg-white/5 backdrop-blur-md rounded-xl p-2 border border-white/5 min-w-[64px] cursor-pointer hover:bg-white/10 transition-all"
                    >
                      <div className="bg-[#0f172a]/60 rounded-lg p-1 mb-1">
                        <PixelPet color={PET_COLORS[pet.rarity]} size={2.5} animation="idle" />
                      </div>
                      <div className="text-[9px] font-bold" style={{ color: RARITY_COLORS[pet.rarity] }}>
                        {RARITY_LABELS[pet.rarity]}
                      </div>
                      <div className="text-[8px] text-[#64748b]">CP {pet.stats.speed + pet.stats.luck + pet.stats.charm + pet.stats.energy}</div>
                    </div>
                  ))}
                  {/* Placeholder wilds */}
                  {nearby.map((n, i) => (
                    <div key={`wild-${i}`}
                      className="flex-shrink-0 flex flex-col items-center bg-white/5 backdrop-blur-md rounded-xl p-2 border border-white/5 min-w-[64px] opacity-60"
                    >
                      <div className="bg-[#0f172a]/60 rounded-lg p-1 mb-1">
                        <PixelPet color={PET_COLORS[n.rarity]} size={2.5} animation="idle" />
                      </div>
                      <div className="text-[9px] font-bold" style={{ color: RARITY_COLORS[n.rarity] }}>
                        ????
                      </div>
                      <div className="text-[8px] text-[#64748b]">{n.steps}m</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Walk Button (Big Pokéball-style) ── */}
            <div className="flex flex-col items-center py-2">
              <button
                onClick={isWalking ? stopWalking : startWalking}
                className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] shadow-xl shadow-[#a855f7]/40 hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
              >
                <div className="absolute inset-1 rounded-full bg-white/10" />
                <span className="text-2xl relative z-10">{isWalking ? '⏹' : '🚶'}</span>
              </button>
              <p className="text-[10px] text-[#64748b] mt-1.5">{isWalking ? '㩒停低' : '開始行路'}</p>
              {/* Step count */}
              <div className="flex items-center gap-4 mt-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-[#f1f5f9]">{formatSteps(steps)}</div>
                  <div className="text-[9px] text-[#64748b] uppercase tracking-wider">今日</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <div className="text-lg font-bold text-[#f1f5f9]">{formatSteps(totalSteps)}</div>
                  <div className="text-[9px] text-[#64748b] uppercase tracking-wider">總計</div>
                </div>
                {activePet && (
                  <>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-center">
                      <div className="text-lg">{MOOD_EMOJI[activePet.mood] || '😐'}</div>
                      <div className="text-[9px] text-[#64748b] uppercase tracking-wider">{activePet.moodValue}%</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Quick actions row ── */}
            {activePet && (
              <div className="flex justify-center gap-3 py-1">
                <button onClick={feedPet}
                  className="px-5 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/10 hover:bg-white/20 active:scale-90 transition-all">
                  🍖 餵食
                </button>
                <button onClick={petPet}
                  className="px-5 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/10 hover:bg-white/20 active:scale-90 transition-all">
                  ✋ 摸頭
                </button>
                <button onClick={playPet}
                  className="px-5 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/10 hover:bg-white/20 active:scale-90 transition-all">
                  🎾 玩
                </button>
              </div>
            )}

            {/* ── Test +500 ── */}
            <div className="flex justify-center mt-2 mb-2">
              <button onClick={addTestSteps}
                className="px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full text-[10px] text-[#64748b] border border-white/5 hover:bg-white/10 active:scale-90 transition-all">
                +{formatSteps(500)} 測試步數
              </button>
            </div>

            {/* ── Log (compact) ── */}
            {encounterLog.length > 0 && (
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-2.5 mb-1 border border-white/5">
                <div className="text-[9px] text-[#64748b] mb-1 uppercase tracking-wider">記錄</div>
                {encounterLog.slice(0, 3).map((msg, i) => (
                  <div key={i} className="text-[10px] text-[#cbd5e1] py-0.5 border-b border-white/5 last:border-0">{msg}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PETS TAB ── */}
        {page === 'pets' && (
          <div className="animate-fade-in py-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">寵物</h2>
              <span className="text-xs text-[#64748b]">{pets.length} 隻</span>
            </div>
            {pets.length === 0 ? (
              <div className="flex flex-col items-center py-16">
                <div className="text-5xl mb-3 opacity-40">🏠</div>
                <p className="text-sm text-[#94a3b8]">未有寵物</p>
                <p className="text-xs text-[#64748b]">去行路搵寵物啦</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {pets.map((pet, i) => {
                  const cp = pet.stats.speed + pet.stats.luck + pet.stats.charm + pet.stats.energy
                  return (
                    <button key={pet.id}
                      onClick={() => { setActivePetIndex(i); setPage('map') }}
                      className="relative bg-white/5 backdrop-blur-md rounded-xl p-3 text-center border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                    >
                      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ backgroundColor: RARITY_COLORS[pet.rarity] }} />
                      <div className="bg-[#0f172a]/60 rounded-lg p-1.5 mb-2 inline-block">
                        <PixelPet color={PET_COLORS[pet.rarity]} size={3.5} animation="idle" />
                      </div>
                      <div className="text-sm font-bold text-[#f1f5f9]">{pet.name || `${RARITY_LABELS[pet.rarity]}寵物`}</div>
                      <div className="flex items-center justify-center gap-1.5 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${RARITY_COLORS[pet.rarity]}20`, color: RARITY_COLORS[pet.rarity] }}>
                          {RARITY_LABELS[pet.rarity]}
                        </span>
                        <span className="text-[9px] text-[#64748b]">CP {cp}</span>
                        <span className="text-[9px] text-[#64748b]">Lv.{pet.level}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 mt-1.5">
                        <span className="text-xs">{MOOD_EMOJI[pet.mood] || '😐'}</span>
                        <span className="text-[9px]" style={{ color: moodColor(pet.mood) }}>
                          {pet.moodValue}%
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── EGGS TAB ── */}
        {page === 'eggs' && (
          <div className="animate-fade-in py-2">
            <h2 className="text-lg font-bold mb-3">蛋孵化器</h2>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 mb-3">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{pets.length === 0 && !showEgg ? '🥚' : showEgg ? '🥚' : '🐣'}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#f1f5f9]">
                    {showEgg ? '就快孵化！' : pets.length > 0 ? '已孵化' : '行路 1K 步孵化'}
                  </div>
                  <div className="mt-1.5">
                    <div className="flex justify-between text-[9px] text-[#64748b] mb-0.5">
                      <span>進度</span>
                      <span>{formatSteps(totalSteps)} / {formatSteps(FIRST_PET_STEPS)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#a855f7] to-[#22d3ee] transition-all duration-500"
                        style={{ width: `${eggProgress()}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Future incubator slots */}
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="aspect-square bg-white/5 backdrop-blur-md rounded-xl border border-dashed border-white/10 flex items-center justify-center text-2xl text-[#334155]">
                  {i === 0 && pets.length === 0 ? '🥚' : '+'}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#64748b] text-center mt-3">更多孵化器即將開放</p>
          </div>
        )}

        {/* ── SOCIAL TAB ── */}
        {page === 'social' && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="text-5xl mb-3 opacity-40">🏪</div>
            <p className="text-base font-bold text-[#f1f5f9] mb-1">社群</p>
            <p className="text-xs text-[#64748b] mb-4">與其他玩家交流</p>
            <div className="flex gap-1 mb-4">
              {[0,1,2,3].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 text-center max-w-xs border border-white/10">
              <p className="text-xs text-[#64748b]">準備中 — 可以交換寵物同互動</p>
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom Navigation (Floating Pill) ── */}
      <nav className="relative z-20 px-4 pb-3">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-2 py-1.5 border border-white/10 shadow-2xl">
          <div className="grid grid-cols-4 gap-1">
            {(Object.entries(tabIcons) as [PageTab, { icon: string; label: string }][]).map(([key, val]) => (
              <button key={key}
                onClick={() => setPage(key)}
                className={`relative py-2 rounded-xl text-[10px] font-bold transition-all ${
                  page === key ? 'text-white' : 'text-[#64748b]'
                }`}
              >
                {page === key && (
                  <div className="absolute inset-0 bg-white/10 rounded-xl" />
                )}
                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <span className="text-lg">{val.icon}</span>
                  <span>{val.label}</span>
                </div>
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
