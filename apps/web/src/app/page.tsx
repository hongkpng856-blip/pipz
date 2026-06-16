'use client'

import { useState, useEffect, useRef } from 'react'
import { FIRST_PET_STEPS, ENCOUNTER_INTERVAL, rollEncounter, generateStats, Rarity, Mood, Pet, PetStatus, formatSteps } from '@pipz/core'
import { RARITY_COLORS, RARITY_LABELS } from '@pipz/core'
import PixelPet from '../components/PixelPet'

// ── ID generator ──
function genId(): string {
  return Math.random().toString(36).substring(2, 10)
}

// ── Pet colour map ──
const PET_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

// ── Mood emoji map ──
const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  excited: '🤩',
  hungry: '🍽️',
  sleepy: '😴',
  sad: '😢',
}

// ── Rarity gradient map ──
const RARITY_GRADIENT: Record<string, string> = {
  common: 'from-[#9ca3af] to-[#6b7280]',
  uncommon: 'from-[#22c55e] to-[#16a34a]',
  rare: 'from-[#3b82f6] to-[#2563eb]',
  epic: 'from-[#a855f7] to-[#7c3aed]',
  legendary: 'from-[#f59e0b] to-[#d97706]',
}

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
  const [page, setPage] = useState<'walk' | 'pets' | 'collection' | 'market'>('walk')
  const [isHatching, setIsHatching] = useState(false)

  const watchIdRef = useRef<number | null>(null)
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const stepsSinceEncounter = useRef(0)
  const pityCounter = useRef<Record<string, number>>({ legendary: 0, epic: 0 })
  const mainRef = useRef<HTMLDivElement>(null)

  const activePet = pets[activePetIndex] || null

  const addLog = (msg: string) => {
    setEncounterLog(prev => [msg, ...prev].slice(0, 20))
  }

  const startWalking = () => {
    if (!navigator.geolocation) { addLog('唔支援 GPS'); return }
    setIsWalking(true)
    setPetAnim('walk')
    addLog('開始行路！')
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
    setIsWalking(false)
    setPetAnim('idle')
    addLog('停低休息')
  }

  const checkEncounter = (newSteps: number) => {
    if (pets.length === 0 && totalSteps + newSteps >= FIRST_PET_STEPS) {
      setShowEgg(true)
      return
    }
    if (stepsSinceEncounter.current >= ENCOUNTER_INTERVAL) {
      const rarity = rollEncounter(stepsSinceEncounter.current, pityCounter.current)
      if (rarity) {
        stepsSinceEncounter.current = 0
        if (rarity === Rarity.Legendary) pityCounter.current.legendary = 0
        if (rarity === Rarity.Epic) pityCounter.current.epic = 0
        const np: Pet = {
          id: genId(), userId: 'local', name: `#${(pets.length + 1).toString().padStart(3, '0')}`,
          speciesId: genId(), imageUrl: '',
          rarity, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1, status: PetStatus.Baby,
          stats: generateStats(rarity, 1), mood: Mood.Happy, moodValue: 100,
          lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
          isForSale: false, price: 0,
        }
        setPets(prev => [...prev, np])
        setActivePetIndex(pets.length)
        addLog(`🐾 遇見 ${RARITY_LABELS[rarity]} 寵物！#${pets.length + 1}`)
        setPetAnim('happy')
        setTimeout(() => setPetAnim('idle'), 2000)
      }
    }
  }

  const hatchEgg = () => {
    setIsHatching(true)
    // Crack animation
    const crackInterval = setInterval(() => {
      setEggCrack(c => c + 1)
    }, 300)

    setTimeout(() => {
      clearInterval(crackInterval)
      setEggCrack(0)
      setIsHatching(false)
      const fp: Pet = {
        id: genId(), userId: 'local', name: '小紫',
        speciesId: genId(), imageUrl: '',
        rarity: Rarity.Uncommon, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1, status: PetStatus.Baby,
        stats: generateStats(Rarity.Uncommon, 1), mood: Mood.Excited, moodValue: 100,
        lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
        isForSale: false, price: 0,
      }
      setPets([fp])
      setActivePetIndex(0)
      setShowEgg(false)
      setPetAnim('happy')
      addLog('🎉 孵化成功！係罕見小紫！')
      setTimeout(() => setPetAnim('idle'), 3000)
    }, 2000)
  }

  const feedPet = () => {
    if (!activePet) return
    setPets(prev => prev.map((p, i) =>
      i === activePetIndex ? {
        ...p,
        mood: Mood.Happy,
        moodValue: 100,
        lastFedAt: Date.now(),
        xp: p.xp + 10,
      } : p
    ))
    setPetAnim('happy')
    addLog(`${activePet.name} 食飽飽，好開心！+10 XP`)
    setTimeout(() => setPetAnim('idle'), 2000)
  }

  const petPet = () => {
    if (!activePet) return
    setPetAnim('happy')
    setPets(prev => prev.map((p, i) =>
      i === activePetIndex ? { ...p, mood: Mood.Happy, moodValue: Math.min(100, p.moodValue + 15), lastInteractionAt: Date.now() } : p
    ))
    addLog(`${activePet.name} 好享受摸頭～ ❤️`)
    setTimeout(() => setPetAnim('idle'), 2000)
  }

  const playPet = () => {
    if (!activePet) return
    setPetAnim('happy')
    setPets(prev => prev.map((p, i) =>
      i === activePetIndex ? { ...p, mood: Mood.Excited, moodValue: Math.min(100, p.moodValue + 20), xp: p.xp + 5, lastInteractionAt: Date.now() } : p
    ))
    addLog(`${activePet.name} 玩得好癲！+5 XP`)
    setTimeout(() => setPetAnim('idle'), 2500)
  }

  const addTestSteps = () => {
    const added = 500
    setSteps(s => s + added)
    setTotalSteps(s => s + added)
    stepsSinceEncounter.current += added
    if (pets.length === 0 && totalSteps + added >= FIRST_PET_STEPS) { setShowEgg(true); return }
    const rarity = rollEncounter(stepsSinceEncounter.current, pityCounter.current)
    if (rarity) {
      stepsSinceEncounter.current = 0
      const np: Pet = {
        id: genId(), userId: 'local', name: `#${(pets.length + 1).toString().padStart(3, '0')}`,
        speciesId: genId(), imageUrl: '',
        rarity, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1, status: PetStatus.Baby,
        stats: generateStats(rarity, 1), mood: Mood.Happy, moodValue: 100,
        lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
        isForSale: false, price: 0,
      }
      setPets(prev => [...prev, np])
      setActivePetIndex(pets.length)
      addLog(`🐾 遇見 ${RARITY_LABELS[rarity]} 寵物！#${pets.length + 1}`)
    }
  }

  // XP to next level
  const xpToNext = (pet: Pet) => pet.level * 50
  const xpProgress = (pet: Pet) => Math.min(100, (pet.xp / xpToNext(pet)) * 100)

  // Mood colour
  const moodColor = (mood: string) => {
    if (mood === 'happy' || mood === 'excited') return '#22c55e'
    if (mood === 'hungry') return '#f59e0b'
    if (mood === 'sleepy') return '#3b82f6'
    if (mood === 'sad') return '#ef4444'
    return '#94a3b8'
  }

  useEffect(() => {
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current) }
  }, [])

  // Page transitions
  const pageRef = useRef(page)
  const [pageTransition, setPageTransition] = useState<'enter' | 'active' | 'leave'>('active')
  useEffect(() => {
    if (pageRef.current !== page) {
      setPageTransition('leave')
      const t = setTimeout(() => {
        pageRef.current = page
        setPageTransition('enter')
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setPageTransition('active'))
        })
      }, 200)
      return () => clearTimeout(t)
    }
  }, [page])

  return (
    <div className="flex flex-col min-h-dvh max-w-md mx-auto bg-[#0f172a] text-[#f1f5f9] select-none">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold bg-gradient-to-r from-[#a855f7] to-[#22d3ee] bg-clip-text text-transparent">
            Pipz
          </h1>
          {activePet && (
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: moodColor(activePet.mood) }}
            />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-[#1e293b] px-2.5 py-1.5 rounded-full">
            <span className="text-[#22d3ee]">👣</span>
            <span className="font-bold text-[#f1f5f9]">{formatSteps(totalSteps)}</span>
          </div>
          <div className={`w-2 h-2 rounded-full transition-colors ${isWalking ? 'bg-[#22c55e]' : 'bg-[#334155]'}`} />
        </div>
      </header>

      {/* ── Main Content ── */}
      <main ref={mainRef} className="flex-1 px-4 pb-2 overflow-y-auto">
        {page === 'walk' && (
          <div className={`${pageTransition === 'enter' ? 'animate-fade-in' : ''}`}>
            {/* ── Pet / Egg Display ── */}
            <div className="relative bg-[#1e293b] rounded-2xl mb-3 overflow-hidden min-h-[340px] animate-pulse-glow">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1e293b]/80 to-[#1e293b]" />

              {isHatching ? (
                /* ── Hatching Animation ── */
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`text-7xl mb-4 ${eggCrack > 3 ? 'animate-egg-shake' : 'animate-egg-pulse'}`}>
                    {eggCrack > 5 ? '🐣' : '🥚'}
                  </div>
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-[#a855f7] animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s`, opacity: eggCrack > i * 2 ? 1 : 0.3 }}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-[#a855f7] mt-3 font-bold">孵化中...</p>
                </div>
              ) : showEgg ? (
                /* ── Egg Ready ── */
                <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer" onClick={hatchEgg}>
                  <div className="text-7xl mb-3 animate-egg-pulse">🥚</div>
                  <div className="text-base font-bold mb-1 text-[#f1f5f9]">就快孵化！</div>
                  <p className="text-xs text-[#94a3b8] mb-4">㩒個蛋孵化啦</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); hatchEgg() }}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white rounded-full font-bold text-sm hover:shadow-lg hover:shadow-[#a855f7]/30 active:scale-95 transition-all"
                  >
                    點擊孵化 🎯
                  </button>
                </div>
              ) : activePet ? (
                /* ── Pet Display ── */
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {/* Pet glow */}
                  <div
                    className="absolute w-32 h-32 rounded-full opacity-20 blur-3xl"
                    style={{ backgroundColor: RARITY_COLORS[activePet.rarity] }}
                  />

                  {/* Pet Canvas */}
                  <div className={`bg-[#0f172a]/80 rounded-2xl p-3 mb-3 border border-[#334155]/50 ${
                    petAnim === 'happy' ? 'animate-happy-jump' : petAnim === 'walk' ? 'animate-walk-bounce' : ''
                  }`}>
                    <PixelPet color={PET_COLORS[activePet.rarity]} size={5} animation={petAnim} />
                  </div>

                  {/* Rarity badge */}
                  <div
                    className="px-3 py-0.5 rounded-full text-xs font-bold mb-1 bg-gradient-to-r"
                    style={{
                      backgroundImage: `linear-gradient(to right, ${RARITY_COLORS[activePet.rarity]}40, ${RARITY_COLORS[activePet.rarity]}20)`,
                      color: RARITY_COLORS[activePet.rarity],
                      border: `1px solid ${RARITY_COLORS[activePet.rarity]}40`,
                    }}
                  >
                    {RARITY_LABELS[activePet.rarity]}
                  </div>

                  {/* Name + Level */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-[#f1f5f9]">{activePet.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#0f172a] text-[#94a3b8]">Lv.{activePet.level}</span>
                    <span className="text-xs" style={{ color: moodColor(activePet.mood) }}>
                      {MOOD_EMOJI[activePet.mood] || '😐'} {activePet.mood === 'happy' ? '開心' : activePet.mood === 'excited' ? '興奮' : activePet.mood === 'hungry' ? '肚餓' : activePet.mood === 'sleepy' ? '眼瞓' : activePet.mood}
                    </span>
                  </div>

                  {/* XP Bar */}
                  <div className="w-48 mb-3">
                    <div className="flex justify-between text-[10px] text-[#64748b] mb-1">
                      <span>EXP</span>
                      <span>{activePet.xp}/{xpToNext(activePet)}</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill bg-gradient-to-r from-[#a855f7] to-[#7c3aed]"
                        style={{ width: `${xpProgress(activePet)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 w-full max-w-xs px-4 mb-3">
                    {Object.entries(activePet.stats).map(([k, v], i) => (
                      <div
                        key={k}
                        className="bg-[#0f172a]/80 rounded-xl p-2 text-center border border-[#334155]/30 animate-fade-in"
                        style={{ animationDelay: `${i * 0.08}s` }}
                      >
                        <div className="text-[#94a3b8] text-[10px] mb-0.5">
                          {k === 'speed' ? '⚡速度' : k === 'luck' ? '🍀運氣' : k === 'charm' ? '💜魅力' : '🔋能量'}
                        </div>
                        <div className="font-bold text-sm text-[#f1f5f9]">{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={feedPet}
                      className="px-4 py-2 bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white rounded-full text-xs font-bold hover:shadow-lg hover:shadow-[#22c55e]/30 active:scale-90 transition-all"
                    >
                      🍖 餵食
                    </button>
                    <button
                      onClick={petPet}
                      className="px-4 py-2 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white rounded-full text-xs font-bold hover:shadow-lg hover:shadow-[#3b82f6]/30 active:scale-90 transition-all"
                    >
                      ✋ 摸頭
                    </button>
                    <button
                      onClick={playPet}
                      className="px-4 py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white rounded-full text-xs font-bold hover:shadow-lg hover:shadow-[#f59e0b]/30 active:scale-90 transition-all"
                    >
                      🎾 玩
                    </button>
                  </div>
                </div>
              ) : (
                /* ── No Pet ── */
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-6xl mb-4 opacity-60">🥚</div>
                  <p className="text-base text-[#94a3b8] mb-1">未有寵物</p>
                  <p className="text-sm text-[#64748b]">行 {formatSteps(FIRST_PET_STEPS)} 步孵化你的第一隻寵物</p>
                  <div className="flex items-center gap-1 mt-3">
                    {[1,2,3].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[#334155]"
                        style={{ animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Step Controls ── */}
            <div className="bg-[#1e293b]/80 rounded-2xl p-4 mb-2 border border-[#334155]/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-2xl font-bold text-[#f1f5f9]">{formatSteps(steps)}</div>
                  <div className="text-xs text-[#94a3b8]">今日</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#f1f5f9]">{formatSteps(totalSteps)}</div>
                  <div className="text-xs text-[#94a3b8]">累計</div>
                </div>
                {activePet && (
                  <div
                    className="text-right"
                    style={{ color: moodColor(activePet.mood) }}
                  >
                    <div className="text-lg">{MOOD_EMOJI[activePet.mood] || '😐'}</div>
                    <div className="text-[10px]">{activePet.moodValue}%</div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {!isWalking ? (
                  <button
                    onClick={startWalking}
                    className="flex-1 py-3 bg-gradient-to-r from-[#22d3ee] to-[#06b6d4] text-[#0f172a] rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-[#22d3ee]/30 active:scale-[0.98] transition-all"
                  >
                    🚶 開始行路
                  </button>
                ) : (
                  <button
                    onClick={stopWalking}
                    className="flex-1 py-3 bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-[#ef4444]/30 active:scale-[0.98] transition-all"
                  >
                    ⏹ 停低
                  </button>
                )}
                <button
                  onClick={addTestSteps}
                  className="px-4 py-3 bg-[#334155] text-[#94a3b8] rounded-xl text-xs hover:bg-[#475569] hover:text-[#f1f5f9] active:scale-90 transition-all"
                  title="測試：加 500 步"
                >
                  +{formatSteps(500)}
                </button>
              </div>
            </div>

            {/* ── Encounter Log ── */}
            {encounterLog.length > 0 && (
              <div className="glass rounded-2xl p-3 mb-2 animate-fade-in">
                <div className="text-[10px] text-[#64748b] mb-1.5 uppercase tracking-wider">活動記錄</div>
                {encounterLog.slice(0, 4).map((msg, i) => (
                  <div key={i} className="text-xs text-[#cbd5e1] py-1 border-b border-[#334155]/30 last:border-0 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                    {msg}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {page === 'pets' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-bold mb-3 text-[#f1f5f9]">我嘅寵物</h2>
            {pets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#94a3b8]">
                <div className="text-5xl mb-4 opacity-50">🏠</div>
                <p className="text-sm mb-1">未有寵物</p>
                <p className="text-xs text-[#64748b]">行路搵你嘅第一隻寵物啦</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {pets.map((pet, i) => (
                  <button
                    key={pet.id}
                    onClick={() => { setActivePetIndex(i); setPage('walk') }}
                    className={`relative bg-[#1e293b] rounded-xl p-4 text-center border transition-all hover:scale-[1.02] active:scale-95 ${
                      i === activePetIndex
                        ? `border-[#a855f7] shadow-lg shadow-[#a855f7]/20`
                        : 'border-[#334155]/30'
                    }`}
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    {/* Rarity glow */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                      style={{ backgroundColor: RARITY_COLORS[pet.rarity] }}
                    />
                    <div
                      className="bg-[#0f172a]/80 rounded-lg p-2 mb-2 inline-block border border-[#334155]/30"
                    >
                      <PixelPet color={PET_COLORS[pet.rarity]} size={3.5} animation="idle" />
                    </div>
                    <div className="text-sm font-bold" style={{ color: RARITY_COLORS[pet.rarity] }}>
                      {pet.name}
                    </div>
                    <div className="text-[10px] text-[#94a3b8] mb-1">
                      {RARITY_LABELS[pet.rarity]} · Lv.{pet.level}
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span style={{ color: moodColor(pet.mood) }} className="text-xs">
                        {MOOD_EMOJI[pet.mood] || '😐'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {page === 'collection' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-bold mb-3 text-[#f1f5f9]">圖鑑</h2>
            <p className="text-xs text-[#64748b] mb-4">收集不同稀有度嘅寵物</p>
            <div className="grid grid-cols-2 gap-3">
              {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as const).map((r, i) => {
                const count = pets.filter(p => p.rarity === r).length
                const unlocked = count > 0
                return (
                  <div
                    key={r}
                    className={`relative bg-[#1e293b] rounded-xl p-4 text-center border border-[#334155]/30 animate-fade-in ${
                      unlocked ? '' : 'opacity-60'
                    }`}
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    {/* Rarity bar */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                      style={{ backgroundColor: unlocked ? RARITY_COLORS[r] : '#334155' }}
                    />
                    <div className={`bg-[#0f172a]/80 rounded-lg p-2 mb-2 inline-block border border-[#334155]/30 ${
                      unlocked ? '' : 'grayscale'
                    }`}>
                      <PixelPet color={PET_COLORS[r]} size={3.5} animation="idle" />
                    </div>
                    <div className="text-sm font-bold" style={{ color: unlocked ? RARITY_COLORS[r] : '#64748b' }}>
                      {RARITY_LABELS[r]}
                    </div>
                    <div className="text-xs text-[#94a3b8]">
                      {unlocked ? `${count} 隻` : '🔒 未解鎖'}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Total stats */}
            <div className="glass rounded-2xl p-3 mt-3 text-center">
              <div className="text-[#94a3b8] text-xs">收集進度</div>
              <div className="text-lg font-bold text-[#f1f5f9]">{pets.length} 隻寵物</div>
              <div className="progress-bar mt-2">
                <div
                  className="progress-bar-fill bg-gradient-to-r from-[#a855f7] to-[#22d3ee]"
                  style={{ width: `${Math.min(100, (pets.length / 10) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {page === 'market' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="text-6xl mb-4 opacity-60">🏪</div>
            <p className="text-lg font-bold text-[#f1f5f9] mb-1">交易市場</p>
            <p className="text-sm text-[#94a3b8] mb-4">即將開放交易功能</p>
            <div className="flex gap-1">
              {[0,1,2,3].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#a855f7] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <div className="glass rounded-2xl p-4 mt-6 text-center max-w-xs">
              <p className="text-xs text-[#64748b]">
                準備中 — 可以同其他玩家交換寵物！
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom Navigation ── */}
      <nav className="glass mx-4 mb-3 rounded-2xl px-2 py-1.5">
        <div className="grid grid-cols-4 gap-1">
          {(['walk', 'pets', 'collection', 'market'] as const).map((p, i) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`relative py-2.5 rounded-xl text-xs font-bold transition-all ${
                page === p
                  ? 'text-white'
                  : 'text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              {page === p && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#a855f7]/20 to-[#7c3aed]/20 rounded-xl border border-[#a855f7]/30" />
              )}
              <span className="relative z-10">
                {p === 'walk' ? '🚶 行路' : p === 'pets' ? '🐾 寵物' : p === 'collection' ? '📖 圖鑑' : '🏪 交易'}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

// ── Haversine distance ──
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
