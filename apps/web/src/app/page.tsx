'use client'

import { useState, useEffect, useRef } from 'react'
import { FIRST_PET_STEPS, ENCOUNTER_INTERVAL, rollEncounter, generateStats, calculateEvolution, calculateMoodDecay, Rarity, Mood, Pet, PetStatus, formatSteps } from '@pipz/core'
import { RARITY_COLORS, RARITY_LABELS } from '@pipz/core'

// 簡單 ID 生成器（純 client 版）
function genId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export default function HomePage() {
  const [steps, setSteps] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [pets, setPets] = useState<Pet[]>([])
  const [activePetIndex, setActivePetIndex] = useState(0)
  const [isWalking, setIsWalking] = useState(false)
  const [encounterLog, setEncounterLog] = useState<string[]>([])
  const [showEgg, setShowEgg] = useState(false)
  const [eggProgress, setEggProgress] = useState(0)

  const watchIdRef = useRef<number | null>(null)
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const stepsSinceEncounter = useRef(0)
  const pityCounter = useRef<Record<string, number>>({ legendary: 0, epic: 0 })

  const activePet = pets[activePetIndex] || null

  // GPS 行路追蹤
  const startWalking = () => {
    if (!navigator.geolocation) {
      addLog('你嘅裝置唔支援 GPS')
      return
    }

    setIsWalking(true)
    addLog('開始行路！')

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords

        if (accuracy > 100) return // 精度唔好就 skip

        if (lastPosRef.current) {
          const dist = haversine(
            lastPosRef.current.lat,
            lastPosRef.current.lng,
            latitude,
            longitude
          )

          // 1 公里 ~= 1300 步（粗略）
          const newSteps = Math.floor(dist * 1300)
          if (newSteps > 0) {
            setSteps((s) => s + newSteps)
            setTotalSteps((s) => s + newSteps)
            stepsSinceEncounter.current += newSteps
            checkEncounter(newSteps)
          }
        }

        lastPosRef.current = { lat: latitude, lng: longitude }
      },
      (err) => {
        addLog('GPS 錯誤：' + err.message)
        setIsWalking(false)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }

  const stopWalking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsWalking(false)
    addLog('停低休息')
  }

  // 遇見寵物檢查
  const checkEncounter = (newSteps: number) => {
    // 檢查孵化
    if (pets.length === 0 && totalSteps + newSteps >= FIRST_PET_STEPS) {
      setShowEgg(true)
      setEggProgress(100)
      // 唔 check encounter，專注孵化
      return
    }

    if (stepsSinceEncounter.current >= ENCOUNTER_INTERVAL) {
      const rarity = rollEncounter(stepsSinceEncounter.current, pityCounter.current)
      if (rarity) {
        stepsSinceEncounter.current = 0
        // Reset pity if we got one
        if (rarity === Rarity.Legendary) pityCounter.current.legendary = 0
        if (rarity === Rarity.Epic) pityCounter.current.epic = 0

        const newPet: Pet = {
          id: genId(),
          userId: 'local',
          name: '',
          speciesId: genId(),
          imageUrl: '',
          rarity,
          level: 1,
          xp: 0,
          totalSteps: 0,
          evolutionStage: 1,
          status: PetStatus.Baby,
          stats: generateStats(rarity, 1),
          mood: Mood.Happy,
          moodValue: 100,
          lastFedAt: Date.now(),
          lastInteractionAt: Date.now(),
          createdAt: Date.now(),
          isForSale: false,
          price: 0,
        }

        setPets((prev) => [...prev, newPet])
        addLog(`遇見咗一隻 ${RARITY_LABELS[rarity]} 寵物！`)
      }
    }
  }

  // 孵化第一隻寵物
  const hatchEgg = () => {
    const firstPet: Pet = {
      id: genId(),
      userId: 'local',
      name: '',
      speciesId: genId(),
      imageUrl: '',
      rarity: Rarity.Uncommon,
      level: 1,
      xp: 0,
      totalSteps: 0,
      evolutionStage: 1,
      status: PetStatus.Baby,
      stats: generateStats(Rarity.Uncommon, 1),
      mood: Mood.Excited,
      moodValue: 100,
      lastFedAt: Date.now(),
      lastInteractionAt: Date.now(),
      createdAt: Date.now(),
      isForSale: false,
      price: 0,
    }

    setPets([firstPet])
    setActivePetIndex(0)
    setShowEgg(false)
    addLog('孵化成功！呢個係你第一隻寵物！')
  }

  // 手動加步數（測試用）
  const addTestSteps = () => {
    const added = 500
    setSteps((s) => s + added)
    setTotalSteps((s) => s + added)
    stepsSinceEncounter.current += added

    if (pets.length === 0 && totalSteps + added >= FIRST_PET_STEPS) {
      setShowEgg(true)
      setEggProgress(100)
      return
    }

    const rarity = rollEncounter(stepsSinceEncounter.current, pityCounter.current)
    if (rarity) {
      stepsSinceEncounter.current = 0
      const newPet: Pet = {
        id: genId(),
        userId: 'local',
        name: '',
        speciesId: genId(),
        imageUrl: '',
        rarity,
        level: 1,
        xp: 0,
        totalSteps: 0,
        evolutionStage: 1,
        status: PetStatus.Baby,
        stats: generateStats(rarity, 1),
        mood: Mood.Happy,
        moodValue: 100,
        lastFedAt: Date.now(),
        lastInteractionAt: Date.now(),
        createdAt: Date.now(),
        isForSale: false,
        price: 0,
      }
      setPets((prev) => [...prev, newPet])
      addLog(`遇見咗一隻 ${RARITY_LABELS[rarity]} 寵物！`)
    }
  }

  const addLog = (msg: string) => {
    setEncounterLog((prev) => [msg, ...prev].slice(0, 20))
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen p-4 max-w-md mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#a855f7]">Pipz</h1>
        <span className="text-sm text-[#94a3b8]">陪你每一步</span>
      </header>

      {/* Main Pet Display */}
      <div className="flex-1 relative bg-[#1e293b] rounded-2xl mb-4 overflow-hidden min-h-[300px]">
        {showEgg ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl mb-4">🥚</div>
            <div className="text-lg font-bold mb-2">寵物蛋就快孵化...</div>
            <div className="w-48 h-2 bg-[#0f172a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#f59e0b] transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(eggProgress, 100)}%` }}
              />
            </div>
            <button
              onClick={hatchEgg}
              className="mt-4 px-6 py-2 bg-[#a855f7] text-white rounded-full font-bold text-sm hover:bg-[#9333ea]"
            >
              點擊孵化！
            </button>
          </div>
        ) : activePet ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* 寵物 Canvas 區域（placeholder） */}
            <div className="w-32 h-32 bg-[#0f172a] rounded-2xl mb-4 flex items-center justify-center text-5xl">
              🐾
            </div>
            <div className="text-lg font-bold mb-1">
              {RARITY_LABELS[activePet.rarity]} 寵物
            </div>
            <div className="flex gap-2 text-xs mb-3">
              <span className="px-2 py-0.5 rounded-full bg-[#0f172a] text-[#94a3b8]">
                Lv.{activePet.level}
              </span>
              <span
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: RARITY_COLORS[activePet.rarity] + '33', color: RARITY_COLORS[activePet.rarity] }}
              >
                {activePet.status}
              </span>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              {Object.entries(activePet.stats).map(([key, val]) => (
                <div key={key} className="bg-[#0f172a] rounded-xl p-2">
                  <div className="text-[#94a3b8] capitalize">{key}</div>
                  <div className="font-bold text-sm">{val}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#94a3b8]">
            <div className="text-5xl mb-4">🥚</div>
            <div className="text-center px-8">
              <p className="mb-2">行 {formatSteps(FIRST_PET_STEPS)} 步</p>
              <p className="text-sm">孵化你第一隻寵物</p>
            </div>
          </div>
        )}
      </div>

      {/* 行路控制 */}
      <div className="bg-[#1e293b] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xl font-bold">{formatSteps(steps)}</div>
            <div className="text-xs text-[#94a3b8]">今日步數</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{formatSteps(totalSteps)}</div>
            <div className="text-xs text-[#94a3b8]">累計步數</div>
          </div>
        </div>

        <div className="flex gap-2">
          {!isWalking ? (
            <button
              onClick={startWalking}
              className="flex-1 py-3 bg-[#22d3ee] text-[#0f172a] rounded-xl font-bold text-sm hover:bg-[#06b6d4]"
            >
              開始行路
            </button>
          ) : (
            <button
              onClick={stopWalking}
              className="flex-1 py-3 bg-[#ef4444] text-white rounded-xl font-bold text-sm hover:bg-[#dc2626]"
            >
              停低休息
            </button>
          )}
          <button
            onClick={addTestSteps}
            className="px-4 py-3 bg-[#334155] text-[#94a3b8] rounded-xl text-xs hover:bg-[#475569]"
          >
            +500 test
          </button>
        </div>
      </div>

      {/* 寵物列表 */}
      {pets.length > 0 && (
        <div className="bg-[#1e293b] rounded-2xl p-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {pets.map((pet, i) => (
              <button
                key={pet.id}
                onClick={() => setActivePetIndex(i)}
                className={`flex-shrink-0 p-3 rounded-xl text-center transition-colors ${
                  i === activePetIndex ? 'bg-[#a855f7] text-white' : 'bg-[#0f172a] text-[#94a3b8]'
                }`}
              >
                <div className="text-2xl mb-1">🐾</div>
                <div className="text-xs">{RARITY_LABELS[pet.rarity]}</div>
                <div className="text-xs">Lv.{pet.level}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Encounter Log */}
      {encounterLog.length > 0 && (
        <div className="bg-[#1e293b] rounded-2xl p-4 mb-4">
          <div className="text-xs text-[#94a3b8] mb-2">日誌</div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {encounterLog.map((msg, i) => (
              <div key={i} className="text-xs text-[#f1f5f9]">{msg}</div>
            ))}
          </div>
        </div>
      )}

      {/* 底部導航 */}
      <nav className="grid grid-cols-4 gap-2">
        <button className="py-2 bg-[#a855f7] text-white rounded-xl text-xs font-bold">行路</button>
        <button className="py-2 bg-[#1e293b] text-[#94a3b8] rounded-xl text-xs">寵物</button>
        <button className="py-2 bg-[#1e293b] text-[#94a3b8] rounded-xl text-xs">圖鑑</button>
        <button className="py-2 bg-[#1e293b] text-[#94a3b8] rounded-xl text-xs">交易</button>
      </nav>
    </div>
  )
}

// Haversine 距離計算（米）
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
