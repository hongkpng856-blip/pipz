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

export default function HomePage() {
  const [steps, setSteps] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [pets, setPets] = useState<Pet[]>([])
  const [activePetIndex, setActivePetIndex] = useState(0)
  const [isWalking, setIsWalking] = useState(false)
  const [encounterLog, setEncounterLog] = useState<string[]>([])
  const [showEgg, setShowEgg] = useState(false)
  const [petAnim, setPetAnim] = useState<'idle' | 'walk' | 'happy'>('idle')
  const [page, setPage] = useState<'walk' | 'pets' | 'collection' | 'market'>('walk')

  const watchIdRef = useRef<number | null>(null)
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const stepsSinceEncounter = useRef(0)
  const pityCounter = useRef<Record<string, number>>({ legendary: 0, epic: 0 })

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
          id: genId(), userId: 'local', name: '', speciesId: genId(), imageUrl: '',
          rarity, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1, status: PetStatus.Baby,
          stats: generateStats(rarity, 1), mood: Mood.Happy, moodValue: 100,
          lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
          isForSale: false, price: 0,
        }
        setPets(prev => [...prev, np])
        setActivePetIndex(pets.length)
        addLog(`遇見 ${RARITY_LABELS[rarity]} 寵物！`)
        setPetAnim('happy')
        setTimeout(() => setPetAnim('idle'), 2000)
      }
    }
  }

  const hatchEgg = () => {
    const fp: Pet = {
      id: genId(), userId: 'local', name: '', speciesId: genId(), imageUrl: '',
      rarity: Rarity.Uncommon, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1, status: PetStatus.Baby,
      stats: generateStats(Rarity.Uncommon, 1), mood: Mood.Excited, moodValue: 100,
      lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
      isForSale: false, price: 0,
    }
    setPets([fp])
    setActivePetIndex(0)
    setShowEgg(false)
    setPetAnim('happy')
    addLog('孵化成功！')
    setTimeout(() => setPetAnim('idle'), 3000)
  }

  const feedPet = () => {
    if (!activePet) return
    setPets(prev => prev.map((p, i) =>
      i === activePetIndex ? { ...p, mood: Mood.Happy, moodValue: 100, lastFedAt: Date.now() } : p
    ))
    setPetAnim('happy')
    addLog('餵食咗！寵物好開心')
    setTimeout(() => setPetAnim('idle'), 2000)
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
        id: genId(), userId: 'local', name: '', speciesId: genId(), imageUrl: '',
        rarity, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1, status: PetStatus.Baby,
        stats: generateStats(rarity, 1), mood: Mood.Happy, moodValue: 100,
        lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
        isForSale: false, price: 0,
      }
      setPets(prev => [...prev, np])
      setActivePetIndex(pets.length)
      addLog(`遇見 ${RARITY_LABELS[rarity]} 寵物！`)
    }
  }

  useEffect(() => {
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current) }
  }, [])

  return (
    <div className="flex flex-col min-h-dvh p-4 max-w-md mx-auto">
      <header className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-[#a855f7]">Pipz</h1>
        <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
          <span>{formatSteps(totalSteps)} 步</span>
          <span className="w-2 h-2 rounded-full bg-[#22d3ee]" />
        </div>
      </header>

      {page === 'walk' && (
        <>
          <div className="flex-1 relative bg-[#1e293b] rounded-2xl mb-3 overflow-hidden min-h-[320px]">
            {showEgg ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-6xl mb-3">🥚</div>
                <div className="text-base font-bold mb-3">就快孵化！</div>
                <button onClick={hatchEgg} className="px-6 py-2 bg-[#a855f7] text-white rounded-full font-bold text-sm hover:bg-[#9333ea]">點擊孵化</button>
              </div>
            ) : activePet ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="bg-[#0f172a] rounded-2xl p-2 mb-2">
                  <PixelPet color={PET_COLORS[activePet.rarity]} size={5} animation={petAnim} />
                </div>
                <div className="text-base font-bold" style={{ color: RARITY_COLORS[activePet.rarity] }}>{RARITY_LABELS[activePet.rarity]}</div>
                <div className="flex gap-2 text-xs mb-3 mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-[#0f172a] text-[#94a3b8]">Lv.{activePet.level}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#0f172a] text-[#94a3b8]">{activePet.status === 'baby' ? 'BB' : activePet.status}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#0f172a] text-[#94a3b8]">{activePet.mood === 'happy' ? '開心' : activePet.mood}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs w-full max-w-xs px-4 mb-3">
                  {Object.entries(activePet.stats).map(([k, v]) => (
                    <div key={k} className="bg-[#0f172a] rounded-xl p-1.5">
                      <div className="text-[#94a3b8] text-[10px]">{k === 'speed' ? '速度' : k === 'luck' ? '運氣' : k === 'charm' ? '魅力' : '能量'}</div>
                      <div className="font-bold text-sm">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={feedPet} className="px-4 py-1.5 bg-[#22c55e] text-white rounded-full text-xs font-bold hover:bg-[#16a34a]">餵食</button>
                  <button className="px-4 py-1.5 bg-[#3b82f6] text-white rounded-full text-xs font-bold hover:bg-[#2563eb]">摸頭</button>
                  <button className="px-4 py-1.5 bg-[#f59e0b] text-white rounded-full text-xs font-bold hover:bg-[#d97706]">玩</button>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#94a3b8]">
                <div className="text-5xl mb-4">🥚</div>
                <p className="mb-2 text-base">行 {formatSteps(FIRST_PET_STEPS)} 步孵化</p>
              </div>
            )}
          </div>

          <div className="bg-[#1e293b] rounded-2xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-2xl font-bold">{formatSteps(steps)}</div>
                <div className="text-xs text-[#94a3b8]">今日</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{formatSteps(totalSteps)}</div>
                <div className="text-xs text-[#94a3b8]">累計</div>
              </div>
            </div>
            <div className="flex gap-2">
              {!isWalking ? (
                <button onClick={startWalking} className="flex-1 py-2.5 bg-[#22d3ee] text-[#0f172a] rounded-xl font-bold text-sm hover:bg-[#06b6d4]">開始行路</button>
              ) : (
                <button onClick={stopWalking} className="flex-1 py-2.5 bg-[#ef4444] text-white rounded-xl font-bold text-sm hover:bg-[#dc2626]">停低</button>
              )}
              <button onClick={addTestSteps} className="px-3 py-2.5 bg-[#334155] text-[#94a3b8] rounded-xl text-xs hover:bg-[#475569]">+500</button>
            </div>
          </div>

          {encounterLog.length > 0 && (
            <div className="bg-[#1e293b] rounded-2xl p-3 mb-3">
              {encounterLog.slice(0, 3).map((msg, i) => (
                <div key={i} className="text-xs text-[#f1f5f9]">{msg}</div>
              ))}
            </div>
          )}
        </>
      )}

      {page === 'pets' && (
        <div className="flex-1">
          <h2 className="text-lg font-bold mb-3">我嘅寵物</h2>
          {pets.length === 0 ? (
            <div className="text-center text-[#94a3b8] py-16">
              <div className="text-4xl mb-3">🥚</div>
              <p className="text-sm">未有寵物</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {pets.map((pet, i) => (
                <button key={pet.id} onClick={() => { setActivePetIndex(i); setPage('walk') }}
                  className={`bg-[#1e293b] rounded-xl p-3 text-center ${i === activePetIndex ? 'ring-2 ring-[#a855f7]' : ''}`}>
                  <div className="bg-[#0f172a] rounded-lg p-1 mb-2 inline-block">
                    <PixelPet color={PET_COLORS[pet.rarity]} size={3} animation="idle" />
                  </div>
                  <div className="text-xs font-bold" style={{ color: RARITY_COLORS[pet.rarity] }}>{RARITY_LABELS[pet.rarity]}</div>
                  <div className="text-[10px] text-[#94a3b8]">Lv.{pet.level}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {page === 'collection' && (
        <div className="flex-1">
          <h2 className="text-lg font-bold mb-3">圖鑑</h2>
          <div className="grid grid-cols-3 gap-3">
            {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as const).map(r => (
              <div key={r} className="bg-[#1e293b] rounded-xl p-3 text-center">
                <div className="px-3 py-2 mb-1">
                  <PixelPet color={PET_COLORS[r]} size={3} animation="idle" />
                </div>
                <div className="text-xs" style={{ color: RARITY_COLORS[r] }}>{RARITY_LABELS[r]}</div>
                <div className="text-[10px] text-[#94a3b8]">{pets.filter(p => p.rarity === r).length} 隻</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {page === 'market' && (
        <div className="flex-1 text-center text-[#94a3b8] py-16">
          <div className="text-4xl mb-3">🏪</div>
          <p className="text-sm">交易市場即將開放</p>
        </div>
      )}

      <nav className="grid grid-cols-4 gap-2 mt-auto pt-3">
        {(['walk', 'pets', 'collection', 'market'] as const).map(p => (
          <button key={p} onClick={() => setPage(p)}
            className={`py-2 rounded-xl text-xs font-bold ${page === p ? 'bg-[#a855f7] text-white' : 'bg-[#1e293b] text-[#94a3b8]'}`}>
            {p === 'walk' ? '行路' : p === 'pets' ? '寵物' : p === 'collection' ? '圖鑑' : '交易'}
          </button>
        ))}
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
