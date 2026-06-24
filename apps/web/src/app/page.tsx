'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FIRST_PET_STEPS, ENCOUNTER_INTERVAL, rollEncounter, generateStats, generateSkills, generateAllSkills, calculateEvolution, EVOLUTION_STEPS, Rarity, Mood, PetStatus, Pet, formatSteps, RARITY_COLORS, RARITY_LABELS, calculateStepMultiplier, rollStepBonus, getEncounterMultiplier, hasMoodGuard, getEnergyBonus } from '@pipz/core'
import PixelPetCanvas from '../components/PixelPetCanvas'
import PetCompanion from '../components/PetCompanion'
import PetDetailModal from '../components/PetDetailModal'
import ProfileModal from '../components/ProfileModal'
import NotificationModal from '../components/NotificationModal'
import LoginModal from './auth-modal'
import { useAuth } from '../lib/auth-context'
import { ensureProfile, loadPets, savePet, updatePet, deletePet, getProfile, updateTotalSteps, upsertDailySteps, getTodaySteps, getWeeklySteps, loadEggs, saveEgg, deleteEgg, loadFavorites, setFavoriteOrder, loadAllMarketData, listPet, unlistPet, buyPet, createNotification, MILESTONES } from '../lib/supabase-db'

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
  const [showLogin, setShowLogin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showEvolve, setShowEvolve] = useState(false)
  const [evolvingId, setEvolvingId] = useState<string | null>(null)
  const [detailPetId, setDetailPetId] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifUnread, setNotifUnread] = useState(0)
  const [showEncounterEgg, setShowEncounterEgg] = useState(false)
  const [encounterEggRarity, setEncounterEggRarity] = useState<Rarity | null>(null)
  const [showDevTools, setShowDevTools] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [eggHatchingId, setEggHatchingId] = useState<string | null>(null)
  const [newPetId, setNewPetId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('pipz_new_pet') || null
    return null
  }) // most recently hatched pet, persisted in localStorage
  const [favorites, setFavorites] = useState<string[]>([])
  const [weeklySteps, setWeeklySteps] = useState<{date:string;dayLabel:string;steps:number;isToday:boolean}[]>([])
  const [marketListings, setMarketListings] = useState<Pet[]>([])
  const [myListings, setMyListings] = useState<Pet[]>([])
  const [marketSellerId, setMarketSellerId] = useState<string | null>(null)
  const { user, signOut } = useAuth()

  const wid = useRef<number|null>(null)
  const last = useRef<{lat:number;lng:number}|null>(null)
  const loadedUser = useRef<string|null>(null)
  const syncTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  const pendingSteps = useRef(0)
  const loadedStorage = useRef(false)
  const dismissedNewPets = useRef<Set<string>>(new Set())
  const badgeDismissed = useRef<Set<string>>(new Set())
  const lastEggRarityRef = useRef<Rarity | null>(null)
  const encCnt = useRef(0)
  const pity = useRef<Record<string,number>>({legendary:0,epic:0})

  const pet = pets[activeIdx] ?? null
  const cp = (p: Pet) => p.stats.speed + p.stats.luck + p.stats.charm + p.stats.energy
  const xpMax = (p: Pet) => p.level * 50
  const xpPct = (p: Pet) => Math.min(100, (p.xp / xpMax(p)) * 100)
  const nearby = pets.length > 0 ? pets.slice(-4).reverse() : []
  const canEvolve = pet ? calculateEvolution(pet.totalSteps, pet.evolutionStage, pet.stats) : null

  const stepsRef = useRef(steps)
  const totalStepsRef = useRef(totalSteps)
  const userRef = useRef(user)
  const petsRef = useRef(pets)
  const petRef = useRef(pet)
  const activeIdxRef = useRef(activeIdx)
  // Update refs every render
  stepsRef.current = steps
  totalStepsRef.current = totalSteps
  userRef.current = user
  petsRef.current = pets
  petRef.current = pet
  activeIdxRef.current = activeIdx

  // ── Load persisted data from localStorage (guest) or Supabase ──
  useEffect(() => {
    if (loadedStorage.current) return
    if (!user) {
      try {
        const savedEggs = localStorage.getItem('pipz_eggs')
        if (savedEggs) setEggs(JSON.parse(savedEggs))
        const savedFavs = localStorage.getItem('pipz_favs')
        if (savedFavs) setFavorites(JSON.parse(savedFavs))
        const savedPets = localStorage.getItem('pipz_pets')
        if (savedPets) setPets(JSON.parse(savedPets))
        const savedSteps = localStorage.getItem('pipz_steps')
        if (savedSteps) setSteps(parseInt(savedSteps, 10) || 0)
        const savedTotal = localStorage.getItem('pipz_totalSteps')
        if (savedTotal) setTotalSteps(parseInt(savedTotal, 10) || 0)
      } catch {}
    }
    loadedStorage.current = true
  }, [user])

  // ── Persist guest data to localStorage ──
  // (pets, steps, totalSteps, eggs, favorites)
  useEffect(() => { if (!user) { try { localStorage.setItem('pipz_eggs', JSON.stringify(eggs)) } catch {} } }, [eggs, user])
  useEffect(() => { if (!user) { try { localStorage.setItem('pipz_favs', JSON.stringify(favorites)) } catch {} } }, [favorites, user])
  useEffect(() => { if (!user) { try { localStorage.setItem('pipz_pets', JSON.stringify(pets)) } catch {} } }, [pets, user])
  useEffect(() => { if (!user) { try { localStorage.setItem('pipz_steps', String(steps)) } catch {} } }, [steps, user])
  useEffect(() => { if (!user) { try { localStorage.setItem('pipz_totalSteps', String(totalSteps)) } catch {} } }, [totalSteps, user])

  useEffect(() => { setReady(true) }, [])

  // Auto-detect recently created pets as "new" (safety net for localStorage miss)
  useEffect(() => {
    if (pets.length === 0 || newPetId) return
    const recent = [...pets].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).find(p =>
      p.createdAt > 0 && Date.now() - p.createdAt < 5 * 60 * 1000 && !dismissedNewPets.current.has(p.id)
    )
    if (recent) {
      setNewPetId(recent.id)
      try { localStorage.setItem('pipz_new_pet', recent.id) } catch(_){}
    }
  }, [pets, newPetId])

  const logMsg = (m: string) => setLog(v => [m, ...v].slice(0, 8))

  const dismissNewPet = () => {
    if (newPetId) dismissedNewPets.current.add(newPetId)
    setNewPetId(null)
    try { localStorage.removeItem('pipz_new_pet') } catch(_){}
  }

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

        // Merge any guest data into DB before overwriting with DB state
        if (pets.length > 0 || eggs.length > 0 || favorites.length > 0) {
          await Promise.all([
            ...pets.map(p => savePet(user.id, p).catch(() => {})),
            ...eggs.map(e => saveEgg(user.id, e.rarity).catch(() => {})),
            ...favorites.map((fid, i) => setFavoriteOrder(fid, i + 1).catch(() => {})),
          ])
        }

        const [dbPets, todaySt, dbEggs, dbFavs, dbWeekly, dbProfile] = await Promise.all([
          loadPets(user.id),
          getTodaySteps(user.id),
          loadEggs(user.id),
          loadFavorites(user.id),
          getWeeklySteps(user.id),
          getProfile(user.id),
        ])

        setPets(dbPets)
        setEggs(dbEggs as EggItem[])
        setFavorites(dbFavs)
        setWeeklySteps(dbWeekly)
        setSteps(todaySt)
        setTotalSteps(dbProfile?.total_steps ?? todaySt)
        pendingSteps.current = todaySt
        setActiveIdx(0)
        loadedUser.current = user.id
      } catch (e) {
        console.error('Failed to load data:', e)
        logMsg('❌ 載入數據失敗')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user?.id])

  // ── First team slot = active map pet ──
  useEffect(() => {
    if (favorites.length > 0) {
      const firstId = favorites[0]
      const idx = pets.findIndex(p => p.id === firstId)
      if (idx >= 0 && idx !== activeIdx) setActiveIdx(idx)
    }
  }, [favorites, pets])

  // ── Load market listings when user changes or tab switches ──
  const loadMarketData = useCallback(async () => {
    if (!user) return
    try {
      const { listings: ml, myListings: own } = await loadAllMarketData(user.id)
      setMarketListings(ml)
      setMyListings(own)
    } catch (e) {
      console.error('Market load failed:', e)
    }
  }, [user])

  useEffect(() => {
    if (user) loadMarketData()
  }, [user?.id])

  // ── Reload market + notifs when switching to community tab ──
  useEffect(() => {
    if (tab === 'community' && user) {
      loadMarketData()
      // Fetch unread notifications count
      fetch(`/api/notifications?userId=${user.id}`)
        .then(r => r.json())
        .then(d => setNotifUnread((d.notifications ?? []).filter((n: any) => !n.read).length))
        .catch(() => {})
    }
  }, [tab])

  // ── Load unread notification count on user login ──
  useEffect(() => {
    if (!user) { setNotifUnread(0); return }
    fetch(`/api/notifications?userId=${user.id}`)
      .then(r => r.json())
      .then(d => setNotifUnread((d.notifications ?? []).filter((n: any) => !n.read).length))
      .catch(() => {})
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
          ...(petsRef.current[activeIdxRef.current]
            ? [updatePet(petsRef.current[activeIdxRef.current])]
            : []),
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

  // ── Pet spawn ──
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

    setPets(v => [...v, np])
    setActiveIdx(pets.length) // point to the new pet (last index)
    setNewPetId(np.id)
    try { localStorage.setItem('pipz_new_pet', np.id) } catch(_){}
    return np.id
  }

  // ── Step manager ──
  const addSt = (n: number) => {
    // Apply active pet's skill effects
    const curPets = petsRef.current
    const curActiveIdx = activeIdxRef.current
    const activePet = curPets[curActiveIdx]
    const activeSkills = activePet?.skills ?? []

    // Double steps effect
    const stepMult = calculateStepMultiplier(activeSkills)
    const finalSteps = n * stepMult

    // Random step bonus
    const bonus = rollStepBonus(activeSkills)

    setSteps(s => s + finalSteps + bonus)
    const curUser = userRef.current

    // Add steps to active pet (with multiplier)
    if (activePet) {
      setPets(v => v.map((p, i) => i === curActiveIdx ? { ...p, totalSteps: p.totalSteps + finalSteps } : p))
    }
    setTotalSteps(s => {
      const newTotal = s + finalSteps

      // ── First pet check ──
      if (curPets.length === 0 && newTotal >= FIRST_PET_STEPS) { setShowEgg(true) }

      // Milestone check (side-effect free)
      const oldM = MILESTONES.filter(m => s >= m).length
      const newM = MILESTONES.filter(m => newTotal >= m).length
      if (newM > oldM && curUser) {
        const ms = MILESTONES[oldM]
        createNotification(curUser.id, 'milestone', '🏆 步數里程碑！', `你行咗 ${ms.toLocaleString()} 步！繼續加油！`)
        setNotifUnread(n => n + 1)
      }

      return newTotal
    })
    // ── Side-effects outside setState callback ──
    const encMult = getEncounterMultiplier(activeSkills)
    scheduleSync(pendingSteps.current + finalSteps, totalSteps + finalSteps)
    encCnt.current += Math.round(n * encMult)
    pity.current.legendary += Math.round(n * encMult)
    pity.current.epic += Math.round(n * encMult)
    if (encCnt.current >= ENCOUNTER_INTERVAL) {
      const r = rollEncounter(encCnt.current, pity.current)
      if (r) {
        encCnt.current = 0
        if (r === Rarity.Legendary) pity.current.legendary = 0
        if (r === Rarity.Epic) pity.current.epic = 0
        setEncounterEggRarity(r)
        setShowEncounterEgg(true)
        // Save egg immediately
        if (curUser) {
          saveEgg(curUser.id, r).then(dbId => {
            const eggId = dbId || genSeed().toString()
            const newEgg: EggItem = {
              id: eggId,
              rarity: r,
              collectedAt: Date.now(),
            }
            setEggs(v => [...v, newEgg])
          })
        } else {
          const newEgg: EggItem = {
            id: genSeed().toString(),
            rarity: r,
            collectedAt: Date.now(),
          }
          setEggs(v => [...v, newEgg])
        }
        logMsg(`🥚 發現 ${RARITY_LABELS[r]} 蛋！`)
        if (curUser) createNotification(curUser.id, 'egg_encounter', '🥚 發現新蛋！', `行路途中發現咗 ${RARITY_LABELS[r]}蛋！快啲去收咗佢`)
        if (curUser) setNotifUnread(n => n + 1)
      }
    }
  }

  const addDebug = () => {
    logMsg('🔍 測試步數處理中...')
    addSt(500)
  }

  // ── Create test pet with ALL skills for development testing ──
  const createTestPet = async () => {
    const seed = genSeed()
    const np: Pet = {
      id: seed.toString(), userId: user?.id ?? 'local', name: '',
      speciesId: seed.toString(), imageUrl: '',
      rarity: Rarity.Legendary, level: 99, xp: 99999, totalSteps: 999999, evolutionStage: 5,
      status: PetStatus.Legendary,
      stats: { speed: 999, luck: 999, charm: 999, energy: 999 },
      skills: generateAllSkills(99),
      mood: Mood.Happy, moodValue: 100,
      lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
      isForSale: false, price: 0,
    }

    if (user) {
      const dbId = await savePet(user.id, np)
      if (dbId) np.id = dbId
    }

    setPets(v => [...v, np])
    setActiveIdx(pets.length)
    setNewPetId(np.id)
    try { localStorage.setItem('pipz_new_pet', np.id) } catch(_){}
    logMsg(`🧪 全能測試寵物誕生！（全部 ${np.skills.length} 個技能）`)
  }

  // ── Quick modify helpers ──
  const levelUpPet = () => {
    const cur = pets[activeIdx]
    if (!cur) return
    setPets(v => v.map((p, i) => i === activeIdx ? { ...p, level: p.level + 1, xp: p.xp + 100 } : p))
    logMsg(`⬆️ 寵物升至 Lv.${pets[activeIdx]?.level + 1}`)
  }
  const addPetSteps = (n: number) => {
    const cur = pets[activeIdx]
    if (!cur) return
    setPets(v => v.map((p, i) => i === activeIdx ? { ...p, totalSteps: p.totalSteps + n } : p))
    logMsg(`👣 寵物步數 +${n}`)
  }
  const evolvePet = () => {
    const cur = pets[activeIdx]
    if (!cur || cur.evolutionStage >= 5) return
    setPets(v => v.map((p, i) => i === activeIdx ? { ...p, evolutionStage: p.evolutionStage + 1 } : p))
    logMsg(`🌟 寵物進化至階段 ${(pets[activeIdx]?.evolutionStage ?? 0) + 1}`)
  }
  const maxOutPet = () => {
    const cur = pets[activeIdx]
    if (!cur) return
    setPets(v => v.map((p, i) => i === activeIdx ? {
      ...p, level: 99, xp: 99999, totalSteps: 999999, evolutionStage: 5,
      stats: { speed: 999, luck: 999, charm: 999, energy: 999 },
      mood: Mood.Happy, moodValue: 100,
    } : p))
    logMsg('💪 寵物已 MAX！')
  }

  useEffect(() => { return () => { if (wid.current !== null) navigator.geolocation.clearWatch(wid.current) } }, [])

  // ── Walk simulation: continuous steps for testing ──
  useEffect(() => {
    if (simulating) {
      simRef.current = setInterval(() => {
        // Simulate real walking: 1-4 steps every 800ms (≈ 4,500-18,000 steps/hr)
        const steps = Math.floor(Math.random() * 4) + 1
        addSt(steps)
      }, 800)
    } else {
      if (simRef.current) { clearInterval(simRef.current); simRef.current = null }
    }
    return () => { if (simRef.current) { clearInterval(simRef.current); simRef.current = null } }
  }, [simulating])

  // ── Hatch an egg from inventory ──
  const hatchEgg = async (egg: EggItem) => {
    setEggHatchingId(egg.id)
    // Wait for hatching animation, then spawn, then delete from DB
    setTimeout(async () => {
      setEggs(v => v.filter(e => e.id !== egg.id))
      await spawnPet(egg.rarity)
      // Delete from Supabase only AFTER successful spawn
      if (user) await deleteEgg(egg.id).catch(() => {})
      setEggHatchingId(null)
      setTab('pets')
      logMsg(`🐣 孵化出 ${RARITY_LABELS[egg.rarity]}！`)
      if (user) { createNotification(user.id, 'egg_hatched', '🥚 蛋孵化咗！', `${RARITY_LABELS[egg.rarity]}新寵物出世啦！快啲去寵物欄睇下`); setNotifUnread(n => n + 1) }
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
    const wasHungry = pet.moodValue < 40 || pet.mood !== Mood.Happy
    const updated = { ...pet, mood: Mood.Happy, moodValue: 100, lastFedAt: Date.now(), xp: pet.xp + 10 }
    setPets(v => v.map((p,i) => i === activeIdx ? updated : p))
    if (user) updatePet(updated)
    if (user && wasHungry) { createNotification(user.id, 'pet_care', '🍖 寵物餵食咗', `${pet.name || '你嘅寵物'}好開心！心情回復返晒 +10XP`, pet.id); setNotifUnread(n => n + 1) }
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
    setPetAnim('happy'); logMsg('🎾 玩緊！+5XP'); setTimeout(() => setPetAnim('idle'), 1500)
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
    if (user) { createNotification(user.id, 'pet_evolved', '🌟 寵物進化咗！', `${pet.name || '你嘅寵物'}進化到${['BB','幼年','成年','完全體','傳說'][e.newStage-1]||'新'}形態！繼續行路拎更多進化！`, pet.id); setNotifUnread(n => n + 1) }
    if (user) updatePet(evolved)
    // Animation → 帶回寵物頁
    setTimeout(() => {
      setEvolvingId(null)
      setShowEvolve(false)
      setTab('pets')
      setDetailPetId(null)
    }, 1200)
  }


  // ── Market actions ──
  const handleList = async (petId: string, price: number) => {
    if (!user) return logMsg('❌ 需要登入')
    const err = await listPet(petId, price)
    if (err) return logMsg(`❌ ${err}`)
    logMsg(`📤 已上架，價格 ⚡${formatSteps(price)}`)
    setPets(v => v.map(p => p.id === petId ? { ...p, isForSale: true, price } : p))
    setDetailPetId(null)
    loadMarketData()
  }

  const handleUnlist = async (petId: string) => {
    if (!user) return logMsg('❌ 需要登入')
    const err = await unlistPet(petId)
    if (err) return logMsg(`❌ ${err}`)
    logMsg('📥 已取消上架')
    setPets(v => v.map(p => p.id === petId ? { ...p, isForSale: false, price: 0 } : p))
    setDetailPetId(null)
    loadMarketData()
  }

  const handleBuy = async (petId: string, sellerId: string, price: number) => {
    if (!user) return logMsg('❌ 需要登入')
    if (totalStepsRef.current < price) return logMsg('❌ 能量不足')
    const err = await buyPet(petId, user.id, sellerId, price)
    if (err) return logMsg(`❌ ${err}`)
    logMsg(`🎉 購買成功！花費 ⚡${formatSteps(price)}`)
    setDetailPetId(null)
    // Update local energy
    setTotalSteps(s => Math.max(0, s - price))
    loadMarketData()
    // Reload user's pets to include the new one
    if (user) {
      const dbPets = await loadPets(user.id)
      setPets(dbPets)
    }
  }

  const viewMarketPet = (p: Pet) => {
    setMarketSellerId(p.userId)
    setDetailPetId(p.id)
  }

  const isMarketPet = (petId: string) => marketListings.some(p => p.id === petId)

  // ═══════ RENDER ═══════

  return (
    <div className="layout">

      {/* Scrollable content */}
      <div className="scroll-wrap">

        {/* ── Header (with Walk button) ── */}
        <div className="header">
          <span className="header-title">Pipz</span>
          {user ? (
            <button onClick={() => { setShowNotifications(true); if (user) fetch(`/api/notifications?userId=${user.id}`).then(r => r.json()).then(d => setNotifUnread((d.notifications ?? []).filter((n: any) => !n.read).length)).catch(() => {}) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, fontFamily: 'inherit', position: 'relative',
                padding: 0, lineHeight: 1, marginLeft: 4,
              }}>
              <span style={{ color: notifUnread > 0 ? '#fbbf24' : '#9ca3af', position: 'relative' }}>
                🔔
                {notifUnread > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -8,
                    background: '#ef4444', color: 'white',
                    fontSize: 8, fontWeight: 700,
                    padding: '1px 5px', borderRadius: 8,
                    lineHeight: '12px', minWidth: 16, textAlign: 'center',
                  }}>
                    {notifUnread > 99 ? '99+' : notifUnread}
                  </span>
                )}
              </span>
            </button>
          ) : null}
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
                <button onClick={() => setShowProfile(true)}
                  style={{
                    background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)',
                    cursor:'pointer', color:'#c084fc',
                    fontSize: 11, padding: '3px 8px', borderRadius: 10,
                    fontFamily:'inherit', whiteSpace:'nowrap',
                    maxWidth: 100, overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                  👤 {user.email}
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

                              {/* ── PetCompanion card ── */}
                <div className="section card" style={{
                  padding:0, overflow:'hidden', position:'relative', width:'100%',
                }}>
                  <PetCompanion
                    pet={pet}
                    onFeed={feed}
                    onPet={petAction}
                    onPlay={playAction}
                    anim={petAnim}
                    steps={steps}
                    totalSteps={totalSteps}
                    evolutionStage={pet?.evolutionStage ?? 1}
                  />
                </div>{/* 📊 Stats Card — with weekly bar chart (health app style) */}
              <div className="section card" style={{padding:0}}>
                <div style={{padding:'14px 16px'}}>
                  {/* Numbers row */}
                  <div style={{display:'flex', justifyContent:'space-around', marginBottom:14}}>
                    <div style={{textAlign:'center'}}>
                      <div className="steps-num">{ready ? steps.toLocaleString() : '0'}</div>
                      <div className="steps-label" style={{marginTop:2}}>今日步數</div>
                    </div>
                    <div style={{width:1, background:'#1e2a45'}} />
                    <div style={{textAlign:'center'}}>
                      <div className="steps-num">{ready ? formatSteps(totalSteps) : '0'}</div>
                      <div className="steps-label" style={{marginTop:2}}>總步數</div>
                    </div>
                    <div style={{width:1, background:'#1e2a45'}} />
                    <div style={{textAlign:'center'}}>
                      <div className="steps-num">{weeklySteps.length > 0 ? Math.round(weeklySteps.reduce((a,b) => a+b.steps, 0) / 7) : 0}</div>
                      <div className="steps-label" style={{marginTop:2}}>日均</div>
                    </div>
                  </div>

                  {/* Weekly bar chart — like Apple Health / Google Fit */}
                  {weeklySteps.length > 0 && (
                    <div style={{marginBottom:14}}>
                      <div style={{display:'flex', justifyContent:'space-between', fontSize:9, color:'#94a5b8', marginBottom:8}}>
                        <span>📊 本週步數</span>
                        <span>{formatSteps(weeklySteps.reduce((a,b) => a+b.steps, 0))} / 週</span>
                      </div>
                      <div className="weekly-chart">
                        {(() => {
                          const maxSt = Math.max(...weeklySteps.map(d => d.steps), 1)
                          return weeklySteps.map((day, i) => (
                            <div key={day.date} className="weekly-bar-col">
                              <div className="weekly-bar-wrap">
                                <div
                                  className={`weekly-bar ${day.isToday ? 'weekly-bar-today' : ''}`}
                                  style={{
                                    height: `${Math.max(4, (day.steps / maxSt) * 60)}px`,
                                    background: day.isToday
                                      ? 'linear-gradient(180deg, #8b5cf6, #22d3ee)'
                                      : 'linear-gradient(180deg, #2a3a5a, #1e2a45)',
                                  }}
                                />
                              </div>
                              <div style={{display:'flex', flexDirection:'column', alignItems:'center', marginTop:4}}>
                                <span className="weekly-bar-steps">{formatSteps(day.steps)}</span>
                                <span className={`weekly-bar-label ${day.isToday ? 'weekly-bar-label-today' : ''}`}>{day.dayLabel}</span>
                              </div>
                            </div>
                          ))
                        })()}
                      </div>
                    </div>
                  )}

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

            </div>
          )}

          {/* ════ PETS TAB ════ */}
          {tab === 'pets' && (
            <div className="fade-up" style={{display:'flex', flexDirection:'column', height:'calc(100dvh - 110px)', overflow:'hidden'}}>
              <div className="section-header" style={{flexShrink:0}}>
                <span className="section-title">🐾 寵物</span>
                <span className="section-count">{pets.length}隻</span>
              </div>
              {pets.length === 0 ? (
                <div className="card empty-state">
                  <div className="empty-icon">🥚</div>
                  <div className="empty-text">未有寵物，行路孵化啦！</div>
                </div>
              ) : (() => {
                const sorted = [...pets].sort((a, b) => {
                  const af = favorites.includes(a.id) ? 0 : 1
                  const bf = favorites.includes(b.id) ? 0 : 1
                  if (af !== bf) return af - bf
                  // Within same group (both fav or both non-fav), newest first
                  return (b.createdAt || 0) - (a.createdAt || 0)
                })
                const teamPets = favorites.map(fid => pets.find(p => p.id === fid)).filter((p): p is Pet => p !== undefined).slice(0, 5)
                const otherPets = sorted.filter(p => !favorites.includes(p.id))
                // Newest non-favorite pet (for NEW badge)
                const newestPet = otherPets.length > 0 ? otherPets.reduce((a, b) => (a.createdAt || 0) > (b.createdAt || 0) ? a : b) : null
                const isNewBadge = (pid: string, cat: number) => {
                  if (badgeDismissed.current.has(pid)) return false
                  if (cat > 0 && Date.now() - cat < 5 * 60 * 1000) return true
                  if (newestPet && pid === newestPet.id) return true
                  return false
                }
                const activePetSkills = pets[activeIdx]?.skills ?? []
                const energyMult = 1 + getEnergyBonus(activePetSkills)
                const displayEnergy = Math.round(totalSteps * energyMult)
                return (
                <>
                  {/* ⚡ 你擁有的能量 */}
                  <div className="section" style={{marginBottom:8, flexShrink:0}}>
                    <div className="section-header">
                      <span className="section-title">⚡ 你擁有的能量</span>
                    </div>
                    <div className="card" style={{padding:'10px 16px'}}>
                      <div style={{display:'flex', alignItems:'center', gap:12}}>
                        {/* Pixel-style lightning bolt */}
                        <div style={{
                          width:36, height:36, flexShrink:0, borderRadius:10,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          background:'rgba(245,158,11,0.12)',
                        }}>
                          <svg width="20" height="30" viewBox="0 0 26 38" fill="none">
                            <path d="M14.5 0L0 20h10.5L9 38l17-22H15l2-16h-2.5z" fill="#f59e0b" />
                          </svg>
                        </div>
                        <div>
                          <div style={{fontSize:9, color:'#5a6d85', marginBottom:1}}>
                            🔋 累積能量{energyMult > 1 ? ' ⚡能量過載' : ''}
                          </div>
                          <div style={{fontSize:22, fontWeight:800, color:'#f59e0b', letterSpacing:'-0.02em'}}>
                            {ready ? formatSteps(displayEnergy) : '0'}
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>

                    {/* ⭐ 主力隊伍 (drag-drop target, max 5) */}
                    <div className="section" style={{marginBottom:8, flexShrink:0}}>
                      <div className="section-header">
                        <span className="section-title">⭐ 主力隊伍</span>
                        <span className="section-count">{favorites.length}/5</span>
                      </div>
                      <div className="team-grid">
                        {Array.from({length:5}).map((_, slotIdx) => {
                          const pet = teamPets[slotIdx]
                          if (pet) {
                            return (
                              <div key={pet.id} className="team-slot team-slot-filled"
                                onClick={() => { badgeDismissed.current.add(pet.id); setDetailPetId(pet.id) }}
                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                                onDrop={e => { e.preventDefault(); logMsg('🐉 slot 已有寵物') }}
                                style={{borderColor: `${RARITY_COLORS[pet.rarity]}44`}}>
                                <div style={{position:'absolute', top:0, left:0, right:0, height:2, background: RARITY_COLORS[pet.rarity], borderRadius:'12px 12px 0 0'}} />
                                <PixelPetCanvas key={pet.id} seed={parseInt(pet.speciesId)||1} rarity={pet.rarity} evolutionStage={pet.evolutionStage} size={1.8} animation="idle" />
                                {isNewBadge(pet.id, pet.createdAt) && <div className="new-badge">NEW</div>}
                                <div className="team-slot-lv">Lv.{pet.level}</div>
                                {/* Minus button — remove from team */}
                                <div
                                  onClick={e => { e.stopPropagation(); toggleFavorite(pet.id) }}
                                  className="team-slot-minus">−</div>
                              </div>
                            )
                          }
                          return (
                            <div key={`empty-${slotIdx}`} className="team-slot team-slot-empty"
                              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                              onDrop={e => {
                                e.preventDefault()
                                const pid = e.dataTransfer.getData('text/plain')
                                if (pid && !favorites.includes(pid) && favorites.length < 5) {
                                  setFavorites(prev => {
                                    const newFavs = [...prev]
                                    const insertAt = Math.min(slotIdx, newFavs.length)
                                    newFavs.splice(insertAt, 0, pid)
                                    return newFavs
                                  })
                                  if (user) setFavoriteOrder(pid, slotIdx + 1)
                                  logMsg(`🐉 加入 slot ${slotIdx + 1}！`)
                                }
                              }}>
                              <span style={{fontSize:18, opacity:0.3}}>+</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* 🐾 其他寵物 — title fixed, only grid scrolls */}
                    {otherPets.length > 0 && (
                      <>
                        <div className="section" style={{flexShrink:0, marginBottom:0}}>
                          <div className="section-header">
                            <span className="section-title">🐾 其他寵物</span>
                            <span className="section-count">{otherPets.length}隻</span>
                          </div>
                        </div>
                        <div style={{flex:1, overflowY:'auto', minHeight:0}}>
                          <div className="pet-grid pet-grid-other" style={{paddingTop:8}}>
                            {otherPets.map(p => {
                              const origIdx = pets.indexOf(p)
                              const sc = RARITY_COLORS[p.rarity]
                              const canThisEvolve = calculateEvolution(p.totalSteps, p.evolutionStage, p.stats)
                              const teamFull = favorites.length >= 5
                              return (
                              <div key={p.id} className="pet-card-other"
                                draggable
                                onDragStart={e => {
                                  e.dataTransfer.setData('text/plain', p.id)
                                  e.dataTransfer.effectAllowed = 'move'
                                }}
                                onClick={() => { badgeDismissed.current.add(p.id); setDetailPetId(p.id) }}
                                style={{borderColor: origIdx === activeIdx ? `${sc}88` : `${sc}33`}}>
                                <div style={{position:'absolute', top:0, left:0, right:0, height:2, background: sc, borderRadius:'10px 10px 0 0'}} />
                                <PixelPetCanvas key={p.id} seed={parseInt(p.speciesId)||1} rarity={p.rarity} evolutionStage={p.evolutionStage} size={1.6} animation="idle" />
                                {isNewBadge(p.id, p.createdAt) && <div className="new-badge">NEW</div>}
                                {canThisEvolve && (
                                  <div style={{position:'absolute', bottom:1, right:2, fontSize:6, color:'#f59e0b'}}>▶</div>
                                )}
                                {/* + button: add to team (mobile friendly) */}
                                <div className="pet-add-btn"
                                  onClick={e => {
                                    e.stopPropagation()
                                    if (teamFull) return
                                    toggleFavorite(p.id)
                                  }}
                                  title="加入隊伍">
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <line x1="6" y1="0" x2="6" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <line x1="0" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  </svg>
                                </div>
                              </div>
                            )})}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )
              })()}
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

          {/* ════ COMMUNITY / MARKET TAB ════ */}
          {tab === 'community' && (
            <div className="fade-up">
              {!user ? (
                <div className="card empty-state" style={{marginTop:32}}>
                  <div className="empty-icon">🔑</div>
                  <div className="empty-text">需要登入先可以使用交易市場</div>
                </div>
              ) : (
                <>
                  {/* Section: My Listings */}
                  <div className="section" style={{marginBottom:12}}>
                    <div className="section-header">
                      <span className="section-title">📋 我的上架</span>
                            <span className="section-count">{myListings.length}隻</span>
                            <div style={{ flex: 1 }} />
                    </div>
                    {myListings.length === 0 ? (
                      <div className="card" style={{padding:'14px 16px', textAlign:'center'}}>
                        <div style={{fontSize:11, color:'#5a6d85'}}>
                          未有上架 — 喺寵物詳細頁可以上架
                        </div>
                      </div>
                    ) : (
                      <div className="pet-grid" style={{gap:6}}>
                        {myListings.map(p => (
                          <div key={p.id} className="pet-card"
                            onClick={() => setDetailPetId(p.id)}
                            style={{borderColor: `${RARITY_COLORS[p.rarity]}44`, padding:'6px 4px 4px'}}>
                            <div style={{position:'absolute', top:0, left:0, right:0, height:2, background: RARITY_COLORS[p.rarity], borderRadius:'14px 14px 0 0'}} />
                            <div className="pet-card-icon" style={{width:32, height:32}}>
                              <PixelPetCanvas key={p.id} seed={parseInt(p.speciesId)||1} rarity={p.rarity} evolutionStage={p.evolutionStage} size={2.2} animation="idle" />
                            </div>
                            <div style={{fontSize:7, color:'#94a5b8', fontWeight:600}}>Lv.{p.level}</div>
                            <div style={{fontSize:7, fontWeight:700, color:'#f59e0b'}}>⚡{formatSteps(p.price)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section: Marketplace */}
                  <div className="section" style={{marginBottom:10}}>
                    <div className="section-header">
                      <span className="section-title">🛒 市集</span>
                      <span className="section-count">{marketListings.length}隻</span>
                    </div>
                    {marketListings.length === 0 ? (
                      <div className="card" style={{padding:'14px 16px', textAlign:'center'}}>
                        <div style={{fontSize:11, color:'#5a6d85'}}>
                          市集暫時未有寵物出售
                        </div>
                      </div>
                    ) : (
                      <div className="pet-grid" style={{gap:6}}>
                        {marketListings.map(p => (
                          <div key={p.id} className="pet-card"
                            onClick={() => viewMarketPet(p)}
                            style={{borderColor: `${RARITY_COLORS[p.rarity]}44`, padding:'6px 4px 4px'}}>
                            <div style={{position:'absolute', top:0, left:0, right:0, height:2, background: RARITY_COLORS[p.rarity], borderRadius:'14px 14px 0 0'}} />
                            <div className="pet-card-icon" style={{width:32, height:32}}>
                              <PixelPetCanvas key={p.id} seed={parseInt(p.speciesId)||1} rarity={p.rarity} evolutionStage={p.evolutionStage} size={2.2} animation="idle" />
                            </div>
                            <div style={{fontSize:7, color:'#94a5b8', fontWeight:600}}>Lv.{p.level}</div>
                            <div style={{fontSize:7, fontWeight:700, color:'#f59e0b'}}>⚡{formatSteps(p.price)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </>
              )}

              {/* ── Dev Tools (collapsible — always visible even when logged out) ── */}
              <div className="section" style={{marginTop:16}}>
                <button onClick={() => setShowDevTools(!showDevTools)}
                  style={{
                    background:'none', border:'none', color:'#3a4d65',
                    fontSize:10, cursor:'pointer', fontFamily:'inherit',
                    padding:'4px 0', width:'100%', textAlign:'center',
                  }}>
                  🔧 {showDevTools ? '收起 Dev 工具' : 'Dev 工具'}
                </button>
                {showDevTools && (
                  <div className="card" style={{padding:12}}>
                    {/* ── Walk Simulation + Steps ── */}
                    <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:8, flexWrap:'wrap'}}>
                      <button className="btn btn-ghost" onClick={addDebug}
                        style={{fontSize:10, padding:'4px 10px'}}>
                        +500 步
                      </button>
                      <button className={`btn ${simulating ? 'btn-danger' : 'btn-ghost'}`}
                        onClick={() => setSimulating(v => !v)}
                        style={{fontSize:10, padding:'4px 10px'}}>
                        {simulating ? '⏹ 停止' : '🚶 模擬'}
                      </button>
                      <span style={{fontSize:9, color: simulating ? '#22c55e' : '#5a6d85'}}>
                        {simulating ? '🟢 模擬中' : '🛰️ GPS'}
                      </span>
                    </div>

                    {/* ── Test Pet ── */}
                    <div style={{display:'flex', gap:8, marginBottom:8, flexWrap:'wrap'}}>
                      <button className="btn btn-primary" onClick={createTestPet}
                        style={{fontSize:10, padding:'4px 10px'}}>
                        🧪 全能測試寵物
                      </button>
                    </div>

                    {/* ── Quick Modify (only when pet exists) ── */}
                    {pets[activeIdx] && (
                      <div style={{background:'#1a2338', borderRadius:8, padding:'8px 10px', marginBottom:8}}>
                        <div style={{fontSize:8, color:'#5a6d85', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                          ⚡ 快速修改 — Lv.{pets[activeIdx].level} Stage.{pets[activeIdx].evolutionStage}
                        </div>
                        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                          <button className="btn btn-ghost" onClick={levelUpPet}
                            style={{fontSize:9, padding:'3px 8px'}}>⬆️ 升 Lv</button>
                          <button className="btn btn-ghost" onClick={() => addPetSteps(10000)}
                            style={{fontSize:9, padding:'3px 8px'}}>👣 +10K 步</button>
                          <button className="btn btn-ghost" onClick={evolvePet}
                            style={{fontSize:9, padding:'3px 8px'}}>🌟 進化</button>
                          <button className="btn btn-ghost" onClick={maxOutPet}
                            style={{fontSize:9, padding:'3px 8px'}}>💪 MAX</button>
                        </div>
                      </div>
                    )}

                    {log.length > 0 && (
                      <div style={{background:'#1a2338', borderRadius:8, padding:'6px 8px'}}>
                        <div style={{fontSize:8, color:'#5a6d85', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em'}}>記錄</div>
                        {log.slice(0, 3).map((m,i) => (
                          <div key={i} style={{fontSize:10, color:'#94a5b8', padding:'1px 0'}}>{m}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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

      <NotificationModal
        open={showNotifications}
        onClose={() => { setShowNotifications(false); if (user) fetch(`/api/notifications?userId=${user.id}`).then(r => r.json()).then(d => setNotifUnread((d.notifications ?? []).filter((n: any) => !n.read).length)).catch(() => {}) }}
        userId={user?.id ?? null}
      />

      <ProfileModal
        open={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
        totalSteps={totalSteps}
        todaySteps={steps}
        pets={pets}
        eggCount={eggs.length}
        onSignOut={() => signOut()}
      />

      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />

      {/* ════ Pet Detail Modal ════ */}
      {detailPetId && (() => {
        const detailPet = pets.find(p => p.id === detailPetId) ?? marketListings.find(p => p.id === detailPetId)
        if (!detailPet) return null
        const isMarketView = isMarketPet(detailPet.id)
        const isOwnPet = user ? detailPet.userId === user.id : false
        return (
          <PetDetailModal
            pet={detailPet}
            totalSteps={totalSteps}
            onClose={() => { setDetailPetId(null); setMarketSellerId(null) }}
            onEvolve={() => { setDetailPetId(null); setActiveIdx(pets.indexOf(detailPet)); setShowEvolve(true) }}
            onFeed={() => {
              setPets(v => v.map(p => p.id === detailPet.id ? { ...p, mood: Mood.Happy, moodValue: 100, lastFedAt: Date.now(), xp: p.xp + 10 } : p))
              if (user) { updatePet({ ...detailPet, mood: Mood.Happy, moodValue: 100, lastFedAt: Date.now(), xp: detailPet.xp + 10 } as Pet); createNotification(user.id, 'pet_care', '🍖 寵物餵食咗', `${detailPet.name || '你嘅寵物'}好開心！心情回復返晒 +10XP`, detailPet.id); setNotifUnread(n => n + 1) }
              logMsg('🍖 餵食咗！+10XP')
            }}
            onPet={() => {
              setPets(v => v.map(p => p.id === detailPet.id ? { ...p, mood: Mood.Happy, moodValue: Math.min(100, p.moodValue + 15) } : p))
              if (user) updatePet({ ...detailPet, mood: Mood.Happy, moodValue: Math.min(100, detailPet.moodValue + 15) } as Pet)
              logMsg('✋ 摸頭～')
            }}
            onPlay={() => {
              setPets(v => v.map(p => p.id === detailPet.id ? { ...p, mood: Mood.Excited, moodValue: Math.min(100, p.moodValue + 20), xp: p.xp + 5 } : p))
              if (user) updatePet({ ...detailPet, mood: Mood.Excited, moodValue: Math.min(100, detailPet.moodValue + 20), xp: detailPet.xp + 5 } as Pet)
              logMsg('🎾 玩緊！+5XP')
            }}
            onDelete={(id) => {
              setPets(v => v.filter(p => p.id !== id))
              // Adjust activeIdx — use setTimeout to read updated pets length
              setTimeout(() => {
                setActiveIdx(prev => {
                  const newLen = pets.length - 1
                  return prev >= newLen ? Math.max(0, newLen - 1) : prev
                })
              }, 0)
              setDetailPetId(null)
              if (user) deletePet(id)
              logMsg('🗑️ 寵物已剷除')
            }}
            onList={user && isOwnPet ? handleList : undefined}
            onUnlist={user && isOwnPet ? handleUnlist : undefined}
            onBuy={user && isMarketView && !isOwnPet ? handleBuy : undefined}
            isMarket={isMarketView && !isOwnPet}
            sellerId={marketSellerId ?? undefined}
            currentUserId={user?.id}
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
      {showEncounterEgg && encounterEggRarity && (
        <div style={{
          position:'fixed', inset:0, zIndex:100,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,0.75)',
          padding:16,
        }} onClick={() => setShowEncounterEgg(false)}>
          <div style={{
            background:'#141b2d', border:`2px solid ${PC[encounterEggRarity || 'common']}44`,
            borderRadius:20, padding:28, maxWidth:280, width:'100%', textAlign:'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{fontSize:48, marginBottom:8, animation:'wiggle 0.6s ease-in-out infinite'}}>🥚</div>
            <div style={{fontSize:13, fontWeight:700, marginBottom:4}}>
              發現蛋！🥚
            </div>
            <div style={{
              fontSize:11, fontWeight:700,
              color: PC[encounterEggRarity || 'common'],
              background: `${PC[encounterEggRarity || 'common']}18`,
              display:'inline-block', padding:'2px 12px', borderRadius:10,
              marginBottom:8,
            }}>
              {RARITY_LABELS[encounterEggRarity || 'common']}
            </div>
            <div style={{fontSize:11, color:'#94a5b8', marginBottom:16}}>
              已收錄到蛋列表！去蛋頁面孵化啦
            </div>
            <div style={{display:'flex', gap:8, justifyContent:'center'}}>
              <button onClick={() => setShowEncounterEgg(false)}
                style={{
                  padding:'8px 16px', border:'1px solid #2a3a5a',
                  background:'#1a2338', color:'#94a5b8', fontSize:11, fontWeight:600,
                  borderRadius:14, cursor:'pointer', fontFamily:'inherit',
                }}>
                ✅ 收埋
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ First Pet Egg (showEgg) ════ */}
      {showEgg && !hatching && (
        <div style={{
          position:'fixed', inset:0, zIndex:100,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,0.75)',
          padding:16,
        }} onClick={() => setShowEgg(false)}>
          <div style={{
            background:'#141b2d', border:'2px solid #8b5cf644',
            borderRadius:20, padding:28, maxWidth:280, width:'100%', textAlign:'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{fontSize:52, marginBottom:8, animation:'wiggle 0.6s ease-in-out infinite'}}>🥚</div>
            <div style={{fontSize:15, fontWeight:800, color:'#f0f4f8', marginBottom:4}}>
              行夠 1,000 步啦！🎉
            </div>
            <div style={{fontSize:12, color:'#94a5b8', marginBottom:16}}>
              第一隻寵物等緊你！孵化佢啦～
            </div>
            <div style={{display:'flex', gap:8, justifyContent:'center'}}>
              <button onClick={() => setShowEgg(false)}
                style={{
                  padding:'10px 20px', border:'1px solid #2a3a5a',
                  background:'#1a2338', color:'#94a5b8', fontSize:12, fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit', borderRadius:14,
                }}>
                睇多陣
              </button>
              <button onClick={hatch}
                style={{
                  padding:'10px 24px', border:'none',
                  background:'linear-gradient(135deg,#8b5cf6,#7c3aed)', color:'white',
                  fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  borderRadius:14, display:'flex', alignItems:'center', gap:6,
                }}>
                🐣 孵化！
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ New Pet Popup (after hatching) ════ */}
      {newPetId && (() => {
        const newPet = pets.find(p => p.id === newPetId)
        if (!newPet) return null
        return (
          <div style={{
            position:'fixed', inset:0, zIndex:200,
            display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)',
            padding:16,
          }} onClick={() => { dismissNewPet() }}>
            <div style={{
              background:'#141b2d', border:`2px solid ${RARITY_COLORS[newPet.rarity]}66`,
              borderRadius:24, padding:28, maxWidth:320, width:'100%', textAlign:'center',
            }} onClick={e => e.stopPropagation()}>
              <div style={{fontSize:10, color:'#5a6d85', marginBottom:4, letterSpacing:4, textTransform:'uppercase'}}>
                🐣 新寵物孵化！
              </div>
              <div style={{margin:'8px 0'}}>
                <PixelPetCanvas
                  seed={parseInt(newPet.speciesId) || 1}
                  rarity={newPet.rarity}
                  evolutionStage={newPet.evolutionStage}
                  animation="happy"
                  size={5}
                />
              </div>
              <div className="pet-badge" style={{
                display:'inline-block',
                color:RARITY_COLORS[newPet.rarity],
                background:RARITY_COLORS[newPet.rarity]+'18',
                fontSize:10, fontWeight:700,
                padding:'3px 14px', borderRadius:10,
                marginBottom:8,
              }}>
                {RARITY_LABELS[newPet.rarity]}
              </div>
              <div style={{fontSize:18, fontWeight:800, color:'#f0f4f8', marginBottom:4}}>
                #{newPet.speciesId?.slice(0,6) || '???'}
              </div>
              <div style={{fontSize:9, color:'#5a6d85', marginBottom:10}}>
                Lv.{newPet.level} · {['BB','幼年','成年','完全體','傳說'][newPet.evolutionStage-1] || '初級'}
              </div>
              {/* Stats */}
              <div style={{display:'flex', gap:8, justifyContent:'center', marginBottom:16}}>
                {[
                  { icon:'⚡', val:newPet.stats.speed },
                  { icon:'🍀', val:newPet.stats.luck },
                  { icon:'💜', val:newPet.stats.charm },
                  { icon:'🔋', val:newPet.stats.energy },
                ].map(s => (
                  <div key={s.icon} style={{
                    background:'#1a2338', borderRadius:10,
                    padding:'6px 12px', textAlign:'center',
                  }}>
                    <div style={{fontSize:14}}>{s.icon}</div>
                    <div style={{fontSize:10, fontWeight:700, color:'#f0f4f8'}}>{s.val}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => { dismissNewPet(); setTab('pets') }}
                style={{
                  padding:'10px 28px', border:'none',
                  background:'linear-gradient(135deg,#8b5cf6,#7c3aed)', color:'white',
                  fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  borderRadius:16,
                }}>
                🎉 睇下寵物！
              </button>
            </div>
          </div>
        )
      })()}

    </div>
  )
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}