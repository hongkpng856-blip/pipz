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

type PageTab = 'walk' | 'pets' | 'dex' | 'market'

export default function HomePage() {
  const [steps, setSteps] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [pets, setPets] = useState<Pet[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [isWalking, setIsWalking] = useState(false)
  const [showEgg, setShowEgg] = useState(false)
  const [petAnim, setPetAnim] = useState<'idle' | 'walk' | 'happy'>('idle')
  const [page, setPage] = useState<PageTab>('walk')
  const [log, setLog] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  const watchRef = useRef<number | null>(null)
  const lastPos = useRef<{ lat: number; lng: number } | null>(null)
  const stepsSinceEnc = useRef(0)
  const pity = useRef<Record<string, number>>({ legendary: 0, epic: 0 })

  const pet = pets[activeIdx] || null

  // Only render interactive content after mount
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

  const play = () => {
    if (!pet) return
    setPetAnim('happy')
    setPets(prev => prev.map((p, i) => i === activeIdx ? { ...p, mood: Mood.Excited, moodValue: Math.min(100, p.moodValue + 20), xp: p.xp + 5 } : p))
    addLog('🎾 玩緊！+5XP')
    setTimeout(() => setPetAnim('idle'), 2000)
  }

  const xpMax = (p: Pet) => p.level * 50
  const xpPct = (p: Pet) => Math.min(100, (p.xp / xpMax(p)) * 100)

  useEffect(() => {
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current) }
  }, [])

  // ═══════════ RENDER ═══════════
  // Always render: header skeleton + navigation
  // Pet area conditionally shows static placeholder vs interactive

  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto bg-[#0f172a] text-[#f1f5f9] overflow-hidden select-none">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Pipz</h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-cyan-400">👣</span>
          <span className="font-bold">{mounted ? formatSteps(totalSteps) : '0'}</span>
          {isWalking && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
        </div>
      </header>

      {/* ── Main Area ── */}
      <main className="flex-1 overflow-y-auto px-4 pb-1">

        {/* ── WALK TAB ── */}
        {page === 'walk' && (
          <div className="min-h-full flex flex-col">
            {/* Pet / Egg Display */}
            <div className="flex-1 relative bg-[#1e293b] rounded-2xl mb-2 overflow-hidden min-h-[260px] border border-[#334155]/30">
              {!mounted ? (
                /* Static placeholder (server-rendered) */
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl mb-2">🥚</div>
                    <p className="text-sm text-gray-400">行 {formatSteps(FIRST_PET_STEPS)} 步孵化</p>
                  </div>
                </div>
              ) : showEgg ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="text-6xl animate-bounce">🥚</div>
                  <p className="text-sm text-purple-400 font-bold">就快孵化！</p>
                  <button onClick={() => { setShowEgg(false); addLog('🎉 孵化成功！'); addSteps() }}
                    className="px-6 py-2 bg-purple-600 text-white rounded-full text-sm font-bold active:scale-90 transition-transform">
                    孵化
                  </button>
                </div>
              ) : pet ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <div className={`bg-[#0f172a]/60 rounded-xl p-2 ${petAnim === 'walk' ? 'animate-bounce' : petAnim === 'happy' ? 'animate-pulse' : ''}`}>
                    <PixelPet color={PET_COLORS[pet.rarity]} size={5} animation={petAnim} />
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ color: RARITY_COLORS[pet.rarity], backgroundColor: RARITY_COLORS[pet.rarity] + '20' }}>
                    {RARITY_LABELS[pet.rarity]} · Lv.{pet.level}
                  </span>
                  <div className="flex gap-3 text-xs">
                    {Object.entries(pet.stats).map(([k, v]) => (
                      <span key={k} className="text-gray-400">
                        {k === 'speed' ? '⚡' : k === 'luck' ? '🍀' : k === 'charm' ? '💜' : '🔋'}{v}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1 text-xs">
                    <span>{MOOD_EMOJI[pet.mood] || '😐'}</span>
                    <span className="text-green-400">{pet.mood === 'happy' ? '開心' : pet.mood}</span>
                  </div>
                  {/* XP Bar */}
                  <div className="w-36">
                    <div className="h-1 rounded-full bg-gray-700 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all"
                        style={{ width: `${xpPct(pet)}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={feed} className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold active:scale-90">🍖餵食</button>
                    <button onClick={petAction} className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold active:scale-90">✋摸頭</button>
                    <button onClick={play} className="px-3 py-1 bg-amber-600 text-white rounded-full text-xs font-bold active:scale-90">🎾玩</button>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl mb-2">🥚</div>
                  <p className="text-sm text-gray-400 mb-1">未有寵物</p>
                  <div className="w-44">
                    <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                      <span>孵化進度</span>
                      <span>{formatSteps(totalSteps)}/{formatSteps(FIRST_PET_STEPS)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all"
                        style={{ width: `${Math.min(100, (totalSteps / FIRST_PET_STEPS) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Walk Button + Steps */}
            <div className="bg-[#1e293b] rounded-2xl p-3 mb-2 border border-[#334155]/30">
              <div className="flex items-center justify-center gap-4 mb-2 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold">{mounted ? formatSteps(steps) : '0'}</div>
                  <div className="text-[10px] text-gray-400">今日</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{mounted ? formatSteps(totalSteps) : '0'}</div>
                  <div className="text-[10px] text-gray-400">總計</div>
                </div>
                <button onClick={isWalking ? stopWalk : startWalk}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-2xl shadow-lg active:scale-90 transition-transform shrink-0">
                  {isWalking ? '⏹' : '🚶'}
                </button>
                <button onClick={addSteps}
                  className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-full text-[10px] hover:bg-gray-600 active:scale-90">
                  +500
                </button>
              </div>
            </div>

            {/* Log */}
            {log.length > 0 && mounted && (
              <div className="bg-[#1e293b]/80 rounded-xl p-2 mb-1 border border-[#334155]/30">
                <div className="text-[9px] text-gray-500 mb-0.5 uppercase">記錄</div>
                {log.slice(0, 3).map((m, i) => (
                  <div key={i} className="text-[10px] text-gray-300 py-0.5">{m}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PETS TAB ── */}
        {page === 'pets' && (
          <div>
            <h2 className="text-base font-bold mb-2">寵物</h2>
            {pets.length === 0 ? (
              <div className="text-center py-16 text-gray-500 text-sm">未有寵物</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {pets.map((p, i) => (
                  <button key={p.id} onClick={() => { setActiveIdx(i); setPage('walk') }}
                    className="bg-[#1e293b] rounded-xl p-3 text-center border border-[#334155]/30 active:scale-95 transition-transform">
                    <div className="w-12 h-12 mx-auto mb-1 bg-[#0f172a] rounded-lg flex items-center justify-center">
                      <PixelPet color={PET_COLORS[p.rarity]} size={3} animation="idle" />
                    </div>
                    <div className="text-xs font-bold" style={{ color: RARITY_COLORS[p.rarity] }}>{RARITY_LABELS[p.rarity]}</div>
                    <div className="text-[9px] text-gray-400">Lv.{p.level}</div>
                    <span className="text-xs">{MOOD_EMOJI[p.mood] || '😐'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DEX TAB ── */}
        {page === 'dex' && (
          <div>
            <h2 className="text-base font-bold mb-2">圖鑑</h2>
            <div className="grid grid-cols-2 gap-2">
              {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as const).map((r, i) => {
                const c = pets.filter(p => p.rarity === r).length
                return (
                  <div key={r} className={`bg-[#1e293b] rounded-xl p-3 text-center border border-[#334155]/30 ${c === 0 ? 'opacity-50' : ''}`}>
                    <div className="w-10 h-10 mx-auto mb-1 bg-[#0f172a] rounded-lg flex items-center justify-center">
                      <PixelPet color={PET_COLORS[r]} size={2.5} animation="idle" />
                    </div>
                    <div className="text-xs font-bold" style={{ color: c > 0 ? RARITY_COLORS[r] : '#64748b' }}>{RARITY_LABELS[r]}</div>
                    <div className="text-[9px] text-gray-400">{c > 0 ? `${c}隻` : '🔒'}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── MARKET TAB ── */}
        {page === 'market' && (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">🏪</div>
            <p className="text-gray-400 text-sm">交易市場即將開放</p>
          </div>
        )}
      </main>

      {/* ── Bottom Nav ── */}
      <nav className="shrink-0 px-4 pb-2 pt-1">
        <div className="bg-[#1e293b]/90 rounded-2xl px-2 py-1 border border-[#334155]/30">
          <div className="grid grid-cols-4 gap-1">
            {(['walk', 'pets', 'dex', 'market'] as const).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`py-2 rounded-xl text-[10px] font-bold transition-all ${page === p ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                {p === 'walk' ? '🚶行路' : p === 'pets' ? '🐾寵物' : p === 'dex' ? '📖圖鑑' : '🏪交易'}
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
