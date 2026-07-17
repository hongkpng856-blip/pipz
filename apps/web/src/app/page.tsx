'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom'
import dynamic from 'next/dynamic'
import { generateStats, generateSkills, generateAllSkills, calculateEvolution, EVOLUTION_STEPS, Rarity, Mood, PetStatus, Pet, formatSteps, RARITY_COLORS, RARITY_LABELS, calculateStepMultiplier, rollStepBonus, getEncounterMultiplier, hasMoodGuard, getEnergyBonus, SkillEffect, rollEvent, GameEvent, EVENT_POOL, HELP_ITEM_POOL, EQUIPMENT_POOL } from '@pipz/core'
import PixelPetCanvas from '../components/PixelPetCanvas'
import ModalPortal from '../components/ModalPortal'
const RealMap = dynamic(() => import('../components/RealMap'), { ssr: false })
import type { RealMapHandle } from '../components/RealMap'
import PetDetailModal from '../components/PetDetailModal'
import EventModal from '../components/EventModal'
import InventoryModal from '../components/InventoryModal'
import ProfileModal from '../components/ProfileModal'
import NotificationModal from '../components/NotificationModal'
import LoginModal from './auth-modal'

// ── Geocode cache (module-level, persists across renders) ──
const geocodeCache = new Map<string, string>()
async function fetchLocationName(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
  if (geocodeCache.has(key)) return geocodeCache.get(key)!
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
    if (!res.ok) return '📍 未知地區'
    const data = await res.json()
    const name = data.label || '📍 未知地區'
    geocodeCache.set(key, name)
    return name
  } catch {
    return '📍 未知地區'
  }
}
import { useAuth } from '../lib/auth-context'
import { ensureProfile, loadPets, savePet, updatePet, deletePet, getProfile, updateTotalSteps, upsertDailySteps, getTodaySteps, getWeeklySteps, loadEggs, saveEgg, deleteEgg, loadFavorites, setFavoriteOrder, loadAllMarketData, listPet, unlistPet, buyPet, createNotification, logEvent, loadInventory, addInventoryItem, removeInventoryItem, equipItem, loadPetEquipment, unequipSlot, MILESTONES, type Property, loadProperties, sellProperty, loadAllListedProperties, listProperty, unlistProperty, fetchAllFlagCells, type FlagCell } from '../lib/supabase-db'
import { PositionTracker } from '../lib/position-tracker'

function genSeed() { return Math.floor(Math.random() * 2147483646) + 1 }

// Demo PixelLab cat for unauthenticated users — NO LONGER USED, removed

const PC: Record<string, string> = {
  common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6',
  epic: '#8b5cf6', legendary: '#f59e0b',
}
const DAY_COLORS = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6']
const ME: Record<string, string> = {
  happy: '😊', excited: '🤩', hungry: '🍽️', sleepy: '😴', sad: '😢',
}

interface EggItem {
  id: string
  rarity: Rarity
  collectedAt: number
}

type Tab = 'map' | 'pets' | 'community' | 'inventory' | 'properties'

// ── Zone colours: cells in same 10×10 block share the same colour ──
const REGION_SIZE = 10
const ZONE_COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444', '#3b82f6']
const ZONE_NAMES = ['紫晶區', '翠綠區', '琥珀區', '碧藍區', '赤紅區', '湛藍區']
function getZoneIdx(row: number, col: number): number {
  const r = Math.floor(row / REGION_SIZE)
  const c = Math.floor(col / REGION_SIZE)
  return ((r * 7 + c * 13) % ZONE_COLORS.length + ZONE_COLORS.length) % ZONE_COLORS.length
}

export default function HomePage() {
  const [steps, setSteps] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [pets, setPets] = useState<Pet[]>([])
  const [eggs, setEggs] = useState<EggItem[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [walking, setWalking] = useState(false)
  const [petAnim, setPetAnim] = useState<'idle'|'walk'|'happy'>('idle')
  const [tab, setTab] = useState<Tab>('map')
  const [cardTab, setCardTab] = useState<Tab>('map')
  const [log, setLog] = useState<string[]>([])
  const [cardExpanded, setCardExpanded] = useState(false)
  const cardDragStartY = useRef(0)
  const cardDragging = useRef(false)
  const cardDragDirRef = useRef<'up'|'down'|null>(null)
  const cardHandleRef = useRef<HTMLDivElement>(null)
  const cardTouchHandled = useRef(false)
  const cardAnimRef = useRef(false)
  const cardDragYRef = useRef(0)
  const [cardDragY, setCardDragY] = useState(0) // extra height in px (0=collapsed, up to 280=expanded)
  const [compactProps, setCompactProps] = useState(false)
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
    const [showDevTools, setShowDevTools] = useState(false)
    const [trailDayFilter, setTrailDayFilter] = useState<number | null>(new Date().getDay())
    const [simulating, setSimulating] = useState(false)
    const [simSpeed, setSimSpeed] = useState(1) // 1x, 5x, 10x, 50x
    const [simGpsWalking, setSimGpsWalking] = useState(false)
    const [manualMode, setManualMode] = useState(false)
    const simGpsPosRef = useRef({ lat: 22.3194, lng: 114.1694, heading: 0, step: 0 })
    const [mapPos, setMapPos] = useState<{lat: number; lng: number; heading?: number; accuracy?: number} | null>(null)
    const [movementMode, setMovementMode] = useState<'walk' | 'vehicle' | 'stationary' | null>(null)
    const [compassHeading, setCompassHeading] = useState<number | null>(null)
    const [compassActive, setCompassActive] = useState(false)
    const compassHeadingRef = useRef(0)
    const realMapRef = useRef<RealMapHandle>(null)
    const simRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const manualWalkRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const manualPosRef = useRef({ lat: 22.3194, lng: 114.1694 })
    const [eggHatchingId, setEggHatchingId] = useState<string | null>(null)
    const [newPetId, setNewPetId] = useState<string | null>(() => {
      if (typeof window !== 'undefined') return localStorage.getItem('pipz_new_pet') || null
      return null
    }) // most recently hatched pet, persisted in localStorage
  const [popupDismissed, setPopupDismissed] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [weeklySteps, setWeeklySteps] = useState<{date:string;dayLabel:string;steps:number;isToday:boolean}[]>([])
  const [marketListings, setMarketListings] = useState<Pet[]>([])
  const [myListings, setMyListings] = useState<Pet[]>([])
  const [marketSellerId, setMarketSellerId] = useState<string | null>(null)
  // ── Monopoly Properties ──
  const [properties, setProperties] = useState<Property[]>([])
  const [allFlagCells, setAllFlagCells] = useState<FlagCell[]>([])
  const [showProperties, setShowProperties] = useState(false)
  const [listingPropId, setListingPropId] = useState<number | null>(null)
  const [listingPriceStr, setListingPriceStr] = useState('')
  const [listedProperties, setListedProperties] = useState<Property[]>([])

  // Build owned cells map: "anchorLat,anchorLng,row,col" — each cell with its own anchor
  const ownedCells = useMemo(() => {
    const s = new Set<string>()
    properties.forEach(p => s.add(`${p.anchorLat},${p.anchorLng},${p.cellRow},${p.cellCol}`))
    return s
  }, [properties])
  const [detailProperty, setDetailProperty] = useState<Property | null>(null)
  const [detailLocName, setDetailLocName] = useState('')
  // When detailProperty changes, fetch its location name
  useEffect(() => {
    if (detailProperty) {
      // Lock body scroll when modal opens
      document.body.style.overflow = 'hidden'
      if (detailProperty.locationName) {
        setDetailLocName(detailProperty.locationName)
      } else {
        setDetailLocName('')
        fetchLocationName(
          detailProperty.anchorLat + detailProperty.cellRow * 0.0003 + 0.00015,
          detailProperty.anchorLng + detailProperty.cellCol * 0.0003 + 0.00015
        ).then(n => {
          setDetailLocName(n)
          detailProperty.locationName = n
        })
      }
    } else {
      // Restore body scroll when modal closes
      document.body.style.overflow = ''
    }
  }, [detailProperty?.id])
  
  // ── Batch-fetch location names for properties ──
  const enrichWithLocation = useCallback(async (props: Property[]): Promise<Property[]> => {
    const needsFetch = props.filter(p => !p.locationName)
    if (needsFetch.length === 0) return props
    // Fetch in parallel with a small concurrency limit (Nominatim rate)
    const results = await Promise.all(
      needsFetch.map(async (p) => {
        const name = await fetchLocationName(
          p.anchorLat + p.cellRow * 0.0003 + 0.00015,
          p.anchorLng + p.cellCol * 0.0003 + 0.00015
        )
        p.locationName = name
        return p
      })
    )
    return [...props]
  }, [])
  // ── Buy confirmation modal (map grid) ──
  const [buyConfirm, setBuyConfirm] = useState<{row:number; col:number; anchorLat:number; anchorLng:number} | null>(null)
  const [buyingCell, setBuyingCell] = useState(false)
  // ── Alert modal (replaces toast) ──
  const [alertModal, setAlertModal] = useState<{message:string; type:'success'|'error'|'info'} | null>(null)
  const showAlert = (m: string, type: 'success'|'error'|'info' = 'info') => setAlertModal({message:m, type})
  // ── Confirm modal (replaces native confirm) ──
  const [confirmModal, setConfirmModal] = useState<{message:string; onConfirm:()=>void; onCancel?:()=>void} | null>(null)
  // ── Roguelike: pet equipment ──
  const [petEquipment, setPetEquipment] = useState<{equipmentId: string; slot: string}[]>([])
  // ── Roguelike: inventory ──
  const [showInventory, setShowInventory] = useState(false)
  const [inventory, setInventory] = useState<{itemId: string; itemType: 'equipment' | 'help'; quantity: number}[]>([])
  // ── Roguelike: events ──
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null)
  const eventStepCounter = useRef(0)
  const [eventCounterState, setEventCounterState] = useState(0) // triggers re-render on progress change
  const INV = 800 // event check interval (steps)
  // ── Egg encounter popup + modal queue ──
  const [eggFoundData, setEggFoundData] = useState<{type:'cat'|'shiba'; rarity:Rarity; eggId:string} | null>(null)
  const pendingEggRef = useRef<{type:'cat'|'shiba'; rarity:Rarity; eggId:string} | null>(null)
  const pendingEventRef = useRef<GameEvent | null>(null)
  // ── Step visual effects ──
  const [stepAnimTick, setStepAnimTick] = useState(0)
  const [stepFlashType, setStepFlashType] = useState<'normal'|'skill'|'none'>('none')
  const [stepArrows, setStepArrows] = useState<{id:number;type:'normal'|'skill'}[]>([])
  const stepArrowId = useRef(0)
  const { user, signOut, signInWithPassword } = useAuth()

  // ── Auto-login for testing (remove before production) ──
  useEffect(() => {
    if (user || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('autotest') === '1') {
      signInWithPassword('pipztest@gmail.com', 'test1234')
    }
  }, [user, signInWithPassword])

  // ── Load pet equipment when detail modal opens ──
  useEffect(() => {
    if (detailPetId && user) {
      loadPetEquipment(detailPetId).then(setPetEquipment).catch(() => setPetEquipment([]))
      // Also load inventory for available equipment display
      loadInventory(user.id).then(items => setInventory(items as any)).catch(() => {})
    }
  }, [detailPetId, user])

  const wid = useRef<number|null>(null)
  const last = useRef<{lat:number;lng:number}|null>(null)
  const gpsWarmup = useRef(0) // skip first N readings for GPS stabilization
  const posTrackerRef = useRef(new PositionTracker()) // Kalman filter for smooth position
  const gpsLastTime = useRef(0) // timestamp of last valid GPS reading
  const loadedUser = useRef<string|null>(null)
  const syncTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  const pendingSteps = useRef(0)
  const loadedStorage = useRef(false)
  const dismissedNewPets = useRef<Set<string>>(new Set())
  const badgeDismissed = useRef<Set<string>>(new Set())
  const lastEggRarityRef = useRef<Rarity | null>(null)
  const encCnt = useRef(0)
  const eggStepCounter = useRef(0) // for encounter eggs while walking
  const pity = useRef<Record<string,number>>({legendary:0,epic:0})
  const addStRef = useRef<(n:number)=>void>(() => {})
  const orientRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null)
  const orientThrottleRef = useRef(0)
  const stepDetectRef = useRef({
    // Step count
    totalSteps: 0, lastStepTime: 0, lastGpsSteps: 0, fallbackSteps: 0,
    // Band-pass filter state
    lp: 0,          // low-pass (removes high freq noise)
    dcBlock: 0,     // very slow average for DC/gravity removal
    // Adaptive threshold (running stats)
    runningMean: 0, runningVar: 0, alpha: 0.005,
    // Peak-pair detection
    peakValue: 0, peakTime: 0, lookingNeg: false,
    minInterval: 200, // ms between steps
    // Walking bout detection
    consecutive: 0, boutThreshold: 5, lastBoutTime: 0,
  })
  const motionRef = useRef<((e: DeviceMotionEvent) => void) | null>(null)

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

  const contentRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [innerH, setInnerH] = useState(250) // generous initial avoids clipping
  const [navH, setNavH] = useState(75)
  // Measure inner content + nav after render
  useEffect(() => {
    if (innerRef.current) setInnerH(innerRef.current.getBoundingClientRect().height)
    if (navRef.current) setNavH(navRef.current.getBoundingClientRect().height)
  }, [weeklySteps, user, steps, totalSteps, cardTab])
  const HANDLE_H = 24
  // iOS fix: native touchstart/touchmove preventDefault so touch-action:none works
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const stopTouch = (e: TouchEvent) => { e.preventDefault(); e.stopPropagation() }
    el.addEventListener('touchstart', stopTouch, { passive: false })
    el.addEventListener('touchmove', stopTouch, { passive: false })
    return () => { el.removeEventListener('touchstart', stopTouch); el.removeEventListener('touchmove', stopTouch) }
  }, [])
  const CARD_TARGET_H = typeof window !== 'undefined' ? Math.round(window.innerHeight - 50) : 400
  const CARD_MAX_EXTRA = Math.max(80, CARD_TARGET_H - (innerH + HANDLE_H + navH))

  useEffect(() => { setReady(true) }, [])

  // ── iOS: request motion/orientation permission via native click (React synthetic may not trigger prompt) ──
  useEffect(() => {
    const grant = () => {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((state: string) => {
            if (state === 'granted') {
              logMsg('🧭 指南針已授權')
            } else {
              logMsg('🧭 指南針被拒絕 — 用 GPS 方向代替')
            }
          })
          .catch(() => {})
      }
      if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        (DeviceMotionEvent as any).requestPermission().catch(() => {})
      }
    }
    // Native DOM click bypasses React's synthetic event delegation that iOS may not accept
    document.addEventListener('click', grant, { once: true })
    return () => document.removeEventListener('click', grant)
  }, [])

  // Auto-detect recently created pets as "new" (safety net for localStorage miss)
  useEffect(() => {
    if (pets.length === 0 || newPetId || popupDismissed) return
    const recent = [...pets].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).find(p =>
      p.createdAt > 0 && Date.now() - p.createdAt < 5 * 60 * 1000 && !dismissedNewPets.current.has(p.id)
    )
    if (recent) {
      setNewPetId(recent.id)
      try { localStorage.setItem('pipz_new_pet', recent.id) } catch(_){}
    }
  }, [pets, newPetId, popupDismissed])

  const logMsg = (m: string) => setLog(v => [m, ...v].slice(0, 8))

  const dismissNewPet = () => {
    if (newPetId) dismissedNewPets.current.add(newPetId)
    setNewPetId(null)
    setPopupDismissed(true)
    try { localStorage.removeItem('pipz_new_pet') } catch(_){}
  }

  // ── Dismiss egg found popup ──
  const dismissEggFound = () => {
    setEggFoundData(null)
    // Check for pending event after egg dismiss
    if (pendingEventRef.current) {
      const pe = pendingEventRef.current
      pendingEventRef.current = null
      setCurrentEvent(pe)
    }
  }

  const goToEggsFromPopup = () => {
    setEggFoundData(null)
    setTab('pets')
    // Check for pending event after egg dismiss
    if (pendingEventRef.current) {
      const pe = pendingEventRef.current
      pendingEventRef.current = null
      setCurrentEvent(pe)
    }
  }

  // ── Load data when user changes ──
  useEffect(() => {
    if (!user) {
      // Not logged in — use local state
      if (loadedUser.current !== null) {
        setPets([])
        setSteps(0)
        setTotalSteps(0)
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

        const [dbPets, todaySt, dbEggs, dbFavs, dbWeekly, dbProfile, dbInv] = await Promise.all([
          loadPets(user.id),
          getTodaySteps(user.id),
          loadEggs(user.id),
          loadFavorites(user.id),
          getWeeklySteps(user.id),
          getProfile(user.id),
          loadInventory(user.id),
        ])
        setInventory(dbInv as any)

        setPets(dbPets)
        // Only keep PixelLab cat eggs; auto-delete old generic eggs
        const filteredEggs = (dbEggs as EggItem[]).filter(e => e.id.startsWith('pixellab_'))
        setEggs(filteredEggs)
        // Delete old generic eggs quietly
        if (dbEggs.length > filteredEggs.length) {
          (dbEggs as EggItem[]).filter(e => !e.id.startsWith('pixellab_')).forEach(e => {
            deleteEgg(e.id).catch(() => {})
          })
        }
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

  // ── Monopoly Properties: load + global callbacks ──
  const loadUserProperties = useCallback(async () => {
    if (!user) return
    try {
      const props = await loadProperties(user.id)
      await enrichWithLocation(props)
      setProperties([...props])
    } catch {}
    // Refresh all-flag-cells after property change
    fetchAllFlagCells().then(cells => setAllFlagCells(cells))
  }, [user, enrichWithLocation])

  useEffect(() => {
    loadUserProperties()
  }, [user?.id])

  const loadListedProperties = useCallback(async () => {
    try {
      const props = await loadAllListedProperties()
      await enrichWithLocation(props)
      setListedProperties([...props])
    } catch {}
  }, [enrichWithLocation])

  useEffect(() => {
    loadListedProperties()
  }, [])

  // Expose global callbacks for Leaflet popup buttons
  useEffect(() => {
    if (!user) return
    ;(window as any).__pipzBuyCell = async (row: number, col: number, anchorLat: number, anchorLng: number) => {
      // Show confirmation popup immediately — server handles steps validation
      setBuyConfirm({row, col, anchorLat, anchorLng})
    }
    ;(window as any).__pipzManageProperty = (_row: number, _col: number) => {
      setTab('properties')
    }
    ;(window as any).__pipzFlyToProperty = (anchorLat: number, anchorLng: number, cellRow: number, cellCol: number) => {
      // Disable GPS auto-follow so flyTo stays at the target location
      if ((window as any).__pipzSetGpsFollow) {
        (window as any).__pipzSetGpsFollow(false)
      }
      console.log('[flyTo] called', {anchorLat, anchorLng, cellRow, cellCol})
      setTab('map')
      setTimeout(() => {
        const map = (window as any).__pipzMap
        console.log('[flyTo] __pipzMap:', !!map, map?.getCenter?.())
        if (!map) return
        map.invalidateSize()
        const CELL_SIZE_DEG = 0.0003
        const cellLat = anchorLat + CELL_SIZE_DEG * cellRow + CELL_SIZE_DEG / 2
        const cellLng = anchorLng + CELL_SIZE_DEG * cellCol + CELL_SIZE_DEG / 2
        console.log('[flyTo] flying to', cellLat, cellLng)
        map.flyTo([cellLat, cellLng], 19, { animate: true, duration: 1.5 })
      }, 200)
    }
    return () => {
      delete (window as any).__pipzBuyCell
      delete (window as any).__pipzManageProperty
      delete (window as any).__pipzFlyToProperty
    }
  }, [user, loadUserProperties])

  // ── Reload market + notifs + properties when switching to community tab ──
  useEffect(() => {
    if (tab === 'community' && user) {
      loadMarketData()
      loadListedProperties()
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
    gpsWarmup.current = 0
    gpsLastTime.current = 0

    // ── DeviceOrientation API: real-time compass heading (60Hz on iPhone) ──
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let h: number | null = null
      const iosEvent = e as any
      if (iosEvent.webkitCompassHeading !== undefined && iosEvent.webkitCompassHeading !== null) {
        h = iosEvent.webkitCompassHeading // iOS true compass heading
      } else if (e.alpha !== null && e.absolute === true) {
        h = (360 - e.alpha) % 360 // standard compass heading
      }
      if (h !== null && h >= 0) {
        setCompassActive(true) // mark compass as receiving data
        // Light EMA smoothing (factor 0.5) dampens sensor jitter; at 60Hz converges in ~50ms
        let diff = h - compassHeadingRef.current
        if (diff > 180) diff -= 360
        if (diff < -180) diff += 360
        const smoothed = (compassHeadingRef.current + diff * 0.5 + 360) % 360
        compassHeadingRef.current = smoothed
        // Throttle React state updates to ~10fps (CSS transition smooths the rest)
        const now = performance.now()
        if (now - orientThrottleRef.current > 100) {
          orientThrottleRef.current = now
          setCompassHeading(smoothed)
        }
      }
    }
    orientRef.current = handleOrientation
    // iOS: listener added directly; permission requested on mount
    try { window.addEventListener('deviceorientation', handleOrientation, true) } catch (_) {}

    // ── DeviceMotion API: accelerometer step detection (60Hz) ──
    // Professional-grade algorithm with band-pass filter, adaptive threshold,
    // positive+negative peak-pair detection, and walking bout gating
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return
      const s = stepDetectRef.current
      const now = performance.now()

      // 1. Extract signal magnitude (remove gravity)
      const mag = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2) - 9.81

      // 2. Band-pass filter:
      //    Low-pass (IIR ~8Hz cutoff @ 60Hz): removes sensor noise
      s.lp = s.lp * 0.8 + mag * 0.2
      //    DC removal: subtract very slow average (removes gravity tilt changes)
      s.dcBlock = s.dcBlock * 0.99 + s.lp * 0.01
      const filtered = s.lp - s.dcBlock

      // 3. Adaptive threshold (running mean + std over ~3s window)
      const diff = filtered - s.runningMean
      s.runningMean += s.alpha * diff
      s.runningVar += s.alpha * (diff * diff - s.runningVar)
      const threshold = Math.max(0.3, s.runningMean + 1.5 * Math.sqrt(s.runningVar))

      // 4. Positive + negative peak-pair detection
      //    A step = positive peak (foot impact) → negative peak (rebound) within 500ms
      if (!s.lookingNeg) {
        // Looking for positive peak above threshold
        if (filtered > threshold && filtered > s.peakValue) {
          s.peakValue = filtered
          s.peakTime = now
        }
        // Positive peak has passed (signal dropped below threshold*0.3)
        if (s.peakValue > 0 && filtered < threshold * 0.3) {
          s.lookingNeg = true
        }
        // Timeout: reset if no positive peak found for 1s
        if (now - s.peakTime > 1000) {
          s.peakValue = 0
        }
      } else {
        // Looking for negative peak (rebound) within 500ms of positive peak
        if (filtered < -threshold * 0.3 && now - s.peakTime < 500 && now - s.lastStepTime > s.minInterval) {
          // Valid step detected!
          s.consecutive++
          s.lastStepTime = now
          // Walking bout gate: only count after 5 consecutive steps
          if (s.consecutive >= s.boutThreshold) {
            s.totalSteps++
          }
          // Reset peak search
          s.lookingNeg = false
          s.peakValue = 0
        }
        // Timeout: missed the negative peak within 500ms window
        if (now - s.peakTime > 500) {
          s.lookingNeg = false
          s.peakValue = 0
          s.consecutive = 0 // reset bout counter on false positive
        }
      }

      // Reset bout if no step for 3 seconds (not walking)
      if (now - s.lastStepTime > 3000 && s.consecutive > 0) {
        s.consecutive = 0
      }
    }
    motionRef.current = handleMotion
    // iOS: don't requestPermission (needs user gesture), just add listener directly
    // On devices without accelerometer the events simply never fire → GPS fallback
    try { window.addEventListener('devicemotion', handleMotion) } catch (_) {}

    // ── Stage 1: Quick approximate position (WiFi/cell, no GPS wait) ──
    // Like Google Maps: show blue dot immediately, refine later
    navigator.geolocation.getCurrentPosition(
      quickPos => {
        const tracker = posTrackerRef.current
        const qp = tracker.update({
          lat: quickPos.coords.latitude,
          lng: quickPos.coords.longitude,
          accuracy: quickPos.coords.accuracy,
          heading: quickPos.coords.heading ?? undefined,
          speed: quickPos.coords.speed ?? undefined,
        })
        if (qp) {
          setMapPos({ lat: qp.lat, lng: qp.lng, heading: qp.heading, accuracy: qp.accuracy })
        }
      },
      () => { /* ignore — watchPosition will get a fix */ },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 0 }
    )

    // ── Stage 2: High-accuracy GPS watch for continuous real-time tracking ──
    wid.current = navigator.geolocation.watchPosition(
      pos => {
        // Skip first few very-inaccurate readings while GPS warms up
        if (pos.coords.accuracy > 100) {
          if (gpsWarmup.current++ < 5) return
        }
        gpsWarmup.current++

        // ── GPS compass heading ──
        const rawHeading = pos.coords.heading
        if (rawHeading !== null && rawHeading !== undefined && rawHeading >= 0) {
          let diff = rawHeading - compassHeadingRef.current
          if (diff > 180) diff -= 360
          if (diff < -180) diff += 360
          const smoothed = (compassHeadingRef.current + diff * 0.5 + 360) % 360
          compassHeadingRef.current = smoothed
          setCompassHeading(smoothed)
        } else if (compassHeadingRef.current === 0 && rawHeading === null) {
          setCompassHeading(null)
        }

        // ── Movement mode ──
        let mode: 'walk' | 'vehicle' | 'stationary' = 'walk'
        if (pos.coords.speed !== null && pos.coords.speed !== undefined) {
          mode = pos.coords.speed >= 2.0 ? 'vehicle' : pos.coords.speed >= 0.5 ? 'walk' : 'stationary'
        }
        setMovementMode(mode)

        // ── Route through PositionTracker ──
        const tracker = posTrackerRef.current
        const filtered = tracker.update({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading ?? undefined,
          speed: pos.coords.speed ?? undefined,
        })
        if (filtered) {
          setMapPos({ lat: filtered.lat, lng: filtered.lng, heading: filtered.heading, accuracy: filtered.accuracy })
        }
      },
      // Error → try fallback with lower accuracy
      () => {
        // If high-accuracy fails, fall back to lower accuracy watch
        if (wid.current !== null) navigator.geolocation.clearWatch(wid.current)
        wid.current = navigator.geolocation.watchPosition(
          fallbackPos => {
            const tracker = posTrackerRef.current
            const f = tracker.update({
              lat: fallbackPos.coords.latitude,
              lng: fallbackPos.coords.longitude,
              accuracy: fallbackPos.coords.accuracy,
              heading: fallbackPos.coords.heading ?? undefined,
              speed: fallbackPos.coords.speed ?? undefined,
            })
            if (f) {
              setMapPos({ lat: f.lat, lng: f.lng, heading: f.heading, accuracy: f.accuracy })
            }
            // Still try to get heading
            const h = fallbackPos.coords.heading
            if (h !== null && h !== undefined && h >= 0 && compassHeadingRef.current === 0) {
              compassHeadingRef.current = h; setCompassHeading(h)
            }
          },
          () => { setWalking(false); setPetAnim('idle') },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 2000 }
        )
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  }
  const walkStop = () => {
    // Clean up DeviceOrientation listener
    if (orientRef.current) {
      window.removeEventListener('deviceorientation', orientRef.current)
      orientRef.current = null
    }
    // Clean up DeviceMotion listener
    if (motionRef.current) {
      window.removeEventListener('devicemotion', motionRef.current)
      motionRef.current = null
    }
    if (wid.current !== null) navigator.geolocation.clearWatch(wid.current)
    wid.current = null; setWalking(false); setPetAnim('idle'); setMapPos(null); setMovementMode(null); compassHeadingRef.current = 0; setCompassHeading(null); Object.assign(stepDetectRef.current, { totalSteps: 0, lastStepTime: 0, lastGpsSteps: 0, fallbackSteps: 0, lp: 0, dcBlock: 0, runningMean: 0, runningVar: 0, peakValue: 0, peakTime: 0, lookingNeg: false, consecutive: 0, lastBoutTime: 0 }); logMsg('⏹ 停低咗')
  }

  // ── Auto GPS when map tab is active ──
  useEffect(() => {
    if (tab === 'map' && !walking) {
      walkStart()
    } else if (tab !== 'map' && walking) {
      walkStop()
    }
  }, [tab, walking])

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

      // ── Demo egg for guests removed — no auto-eggs

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
    // Encounter egg system disabled — no auto egg popups
    // ── Roguelike: event check ──
    eventStepCounter.current += Math.round(finalSteps * encMult)
    setEventCounterState(eventStepCounter.current)
    let eventTriggeredThisCycle = false
    if (eventStepCounter.current >= INV && !currentEvent && petRef.current) {
      eventStepCounter.current = 0
      setEventCounterState(0)
      const ev = rollEvent(totalStepsRef.current)
      if (ev) {
        // Auto-dismiss new pet popup so event shows through
        if (newPetId) dismissNewPet()
        // If egg popup is showing, queue event instead
        if (eggFoundData) {
          pendingEventRef.current = ev
        } else {
          setCurrentEvent(ev)
          eventTriggeredThisCycle = true
        }
      }
    }
    // ── Egg encounter check ──
    if (user) {
      eggStepCounter.current += finalSteps
      if (eggStepCounter.current >= 2000) {
        eggStepCounter.current = 0
        // 40% chance to find an egg while walking
        if (Math.random() < 0.4) {
          const eggType = Math.random() < 0.5 ? 'cat' : 'shiba'
          const rarity = eggType === 'cat' ? Rarity.Rare : Rarity.Uncommon
          const eggId = `${eggType === 'cat' ? 'pixellab' : 'shiba'}_${Date.now()}`
          // Save egg to DB first
          if (eggType === 'cat') {
            addPixelLabEgg().catch(() => {})
          } else {
            addShibaEgg().catch(() => {})
          }
          // If event is showing or triggered this cycle, queue egg
          if (currentEvent || eventTriggeredThisCycle) {
            pendingEggRef.current = { type: eggType, rarity, eggId }
          } else {
            setEggFoundData({ type: eggType, rarity, eggId })
          }
        }
      }
    }
    // ── Step visual effects ──
    setStepAnimTick(t => t + 1)
    const hasSkillEffects = finalSteps > n || bonus > 0
    setStepFlashType(hasSkillEffects ? 'skill' : 'normal')
    const arrowType = hasSkillEffects ? 'skill' : 'normal'
    const arrowId = ++stepArrowId.current
    setStepArrows(v => [...v.slice(-4), {id: arrowId, type: arrowType}])
    setTimeout(() => setStepFlashType('none'), hasSkillEffects ? 900 : 700)
    setTimeout(() => setStepArrows(v => v.filter(a => a.id !== arrowId)), 1200)
  }
  addStRef.current = addSt

  // ── Roguelike: force event for testing ──
  const forceEvent = () => {
    if (!pet) { logMsg('❌ 未有寵物，唔可以觸發事件'); return }
    if (currentEvent) { logMsg('❌ 已經有事件進行中'); return }
    const ev = rollEvent(totalStepsRef.current)
    if (ev) {
      setCurrentEvent(ev)
      logMsg(`🎲 測試強制觸發：${ev.name}`)
    } else {
      logMsg('❌ 事件擲骰失敗，再試一次')
    }
  }

  const addDebug = () => {
    logMsg('🔍 測試步數處理中...')
    addSt(500)
  }

  // ── Step removal for testing ──
  const removeSt = (n: number) => {
    setSteps(s => Math.max(0, s - n))
    setTotalSteps(s => Math.max(0, s - n))
    logMsg(`👣 步數 -${n}`)
  }

  // ── Clear all steps ──
  const clearSteps = () => {
    setSteps(0)
    setTotalSteps(0)
    logMsg('🗑️ 所有步數已清零')
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
    addSt(n)
    logMsg(`👣 步數 +${n}（含技能加成）`)
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

  const deleteActivePet = () => {
    const cur = pets[activeIdx]
    if (!cur) { logMsg('❌ 未有寵物可刪除'); return }
    const id = cur.id
    // Remove from state
    setPets(v => v.filter(p => p.id !== id))
    // Remove from favorites if present
    setFavorites(v => v.filter(fid => fid !== id))
    // Adjust activeIdx
    setActiveIdx(prev => {
      const newLen = pets.length - 1
      return prev >= newLen ? Math.max(0, newLen - 1) : prev
    })
    // Delete from DB if logged in
    if (user) deletePet(id).catch(() => {})
    logMsg(`🗑️ 已刪除寵物 #${id.slice(0,6)}`)
  }

  // Cleanup on unmount
  useEffect(() => { return () => {
    if (wid.current !== null) navigator.geolocation.clearWatch(wid.current)
    if (orientRef.current) {
      window.removeEventListener('deviceorientation', orientRef.current)
      orientRef.current = null
    }
    if (motionRef.current) {
      window.removeEventListener('devicemotion', motionRef.current)
      motionRef.current = null
    }
  } }, [])

  // ── Walk simulation: continuous steps for testing ──
  useEffect(() => {
    if (simulating) {
      const intervalMs = Math.max(100, 800 / simSpeed)
      const baseSteps = simSpeed
      simRef.current = setInterval(() => {
        const steps = Math.floor(Math.random() * baseSteps * 4) + baseSteps
        addStRef.current(steps)
      }, intervalMs)
    } else {
      if (simRef.current) { clearInterval(simRef.current); simRef.current = null }
    }
    return () => { if (simRef.current) { clearInterval(simRef.current); simRef.current = null } }
  }, [simulating, simSpeed])

  // ── GPS Walk Simulation: fake GPS movement for testing auto-follow + flags ──
  const simGpsRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (simGpsWalking) {
      setWalking(true)
      setMovementMode('walk')
      // Start at a known HK location
      const pos = simGpsPosRef.current
      pos.lat = 22.3194
      pos.lng = 114.1694
      pos.heading = 0
      pos.step = 0
      // Walk in a zigzag pattern — ~30m per tick, every 2s
      simGpsRef.current = setInterval(() => {
        pos.step++
        // Zigzag: go south-east, then north-east, repeat
        const latOffset = (pos.step % 10 < 5 ? -1 : 1) * 0.0003  // ~30m per step
        const lngOffset = 0.0003  // ~30m east each step
        pos.lat += latOffset * 0.0003
        pos.lng += lngOffset
        pos.heading = (pos.heading + 5) % 360
        setMapPos({ lat: pos.lat, lng: pos.lng, heading: pos.heading, accuracy: 8 })
        logMsg(`📍 模擬 GPS: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`)
      }, 2000)
    } else {
      if (simGpsRef.current) { clearInterval(simGpsRef.current); simGpsRef.current = null }
    }
    return () => { if (simGpsRef.current) { clearInterval(simGpsRef.current); simGpsRef.current = null } }
  }, [simGpsWalking])

  // ── Manual direction pad: arrow buttons move mapPos without GPS ──
  function stepManualWalk(dir: 'up' | 'down' | 'left' | 'right') {
    if (!manualMode) return
    setWalking(true)
    setMovementMode('walk')
    setMapPos(prev => {
      if (!prev) {
        const p = { lat: manualPosRef.current.lat, lng: manualPosRef.current.lng, heading: 0, accuracy: 8 }
        return p
      }
      let { lat, lng } = prev
      const stepSize = 0.00015  // ~15m per tick
      switch (dir) {
        case 'up':    lat += stepSize; break
        case 'down':  lat -= stepSize; break
        case 'left':  lng -= stepSize; break
        case 'right': lng += stepSize; break
      }
      manualPosRef.current = { lat, lng }
      return { ...prev, lat, lng, heading: prev.heading ?? 0, accuracy: 8 }
    })
  }
  function startManualWalk(dir: 'up' | 'down' | 'left' | 'right') {
    if (!manualMode) return
    // Take one step immediately so even a quick tap moves
    stepManualWalk(dir)
    // Then continue walking while held
    if (manualWalkRef.current) clearInterval(manualWalkRef.current)
    manualWalkRef.current = setInterval(() => stepManualWalk(dir), 150)
  }
  function stopManualWalk() {
    if (manualWalkRef.current) { clearInterval(manualWalkRef.current); manualWalkRef.current = null }
  }

  // ── Toggle manual mode: stops real GPS, enables D-pad ──
  function toggleManualMode() {
    // Save current position before walkStop clears it
    setMapPos(prev => {
      if (prev) {
        manualPosRef.current = { lat: prev.lat, lng: prev.lng }
      }
      return prev // don't change state yet
    })
    // Always stop GPS first regardless of walking flag
    walkStop()
    setManualMode(v => {
      if (!v) {
        // Turning ON: use saved position as starting point
        setWalking(true)
        setMovementMode('walk')
        setMapPos({ lat: manualPosRef.current.lat, lng: manualPosRef.current.lng, heading: 0, accuracy: 8 })
      } else {
        // Turning OFF: stop D-pad, restore last known position
        stopManualWalk()
        setWalking(false)
        // Restore last position (walkStop cleared it)
        setMapPos({ lat: manualPosRef.current.lat, lng: manualPosRef.current.lng, heading: 0, accuracy: 8 })
        setMovementMode(null)
      }
      return !v
    })
  }

  // ── Cell event handler: walking into a ❓ cell triggers a random event ──
  const handleCellEvent = useCallback((row: number, col: number, cellKey: string, monsterData: { emoji: string; label: string; color: string; level: number; rarity: string } | null) => {
    // 50% chance: monster encounter (if monster data exists)
    // 50% chance: random event from the event pool
    if (monsterData && Math.random() < 0.5) {
      // Show monster encounter modal
      logMsg(`⚔️ 遇到 ${monsterData.emoji} ${monsterData.label}！`)
      showMonsterModal(monsterData, addStRef, logMsg)
    } else {
      // Roll a random event from the full pool (excluding eventOnly events)
      const available = EVENT_POOL.filter(e => (e.weight || 0) > 0 && !e.eventOnly)
      if (available.length > 0) {
        const totalWeight = available.reduce((s, e) => s + e.weight, 0)
        let roll = Math.random() * totalWeight
        let picked = available[available.length - 1] // fallback
        for (const ev of available) {
          roll -= ev.weight
          if (roll <= 0) { picked = ev; break }
        }
        // Only trigger if not already showing an event
        if (!currentEvent && !pendingEventRef.current) {
          logMsg(`🎲 ${picked.icon} ${picked.name}：${picked.description}`)
          setCurrentEvent(picked)
        } else {
          logMsg(`🎲 ${picked.icon} ${picked.name}（已有事件）`)
        }
      } else {
        logMsg(`❓ 呢格有啲嘢，但乜都冇發生`)
      }
    }
  }, [currentEvent, logMsg, addStRef])

  // ── Shop entered handler: walking into a 🏪 shop cell ──
  const handleShopEntered = useCallback((shop: any, row: number, col: number) => {
    logMsg(`🏪 發現 ${shop.label}（${shop.displayDiscount}）！`)
    showShopModal(shop, row, col, totalSteps, setSteps, setTotalSteps, setEggs, user, logMsg, addStRef)
  }, [totalSteps, logMsg, addStRef, user])

  // ── Direct DOM monster modal (bypasses React state rendering issues) ──
  function showMonsterModal(m: { emoji: string; label: string; color: string; level: number; rarity: string }, addStRef: React.MutableRefObject<((n: number) => void) | undefined>, logMsg: (s: string) => void) {
    const c = RARITY_COLORS[m.rarity] || '#9ca3af'
    const rarityLabel = RARITY_LABELS[m.rarity] || m.rarity
    const overlay = document.createElement('div')
    overlay.className = 'fixed-modal-layer'
    overlay.style.cssText = 'position:fixed !important;inset:0;z-index:100;display:flex;align-items:center;justify-content:center'
    overlay.innerHTML = `<div class="card" style="width:260px;padding:20px;text-align:center;border:1.5px solid ${c}66;box-shadow:0 0 30px ${c}33;background:#1a1b2e;border-radius:12px;">
      <div style="font-size:48px;line-height:1;margin-bottom:8px">${m.emoji}</div>
      <div style="font-size:18px;font-weight:800;color:#e8e0d0;margin-bottom:2px">${m.label}</div>
      <div style="font-size:10px;font-weight:700;color:${c};margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">${rarityLabel} · Lv.${m.level}</div>
      <div style="font-size:11px;color:#5a6d85;margin-bottom:14px">⚔️ 野生怪獸擋住去路！</div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button id="monster-battle-btn" style="padding:6px 20px;border-radius:10px;cursor:pointer;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#22c55e;font-size:12px;font-weight:700;font-family:inherit">⚔️ 戰鬥</button>
        <button id="monster-run-btn" style="padding:6px 20px;border-radius:10px;cursor:pointer;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;font-size:12px;font-weight:600;font-family:inherit">🏃 逃走</button>
      </div>
    </div>`
    overlay.querySelector('#monster-battle-btn')?.addEventListener('click', () => {
      addStRef.current?.(m.level * 10)
      logMsg(`🎉 擊敗 ${m.emoji} ${m.label}！獲得 ${m.level * 10} 步獎勵！`)
      overlay.remove()
    })
    overlay.querySelector('#monster-run-btn')?.addEventListener('click', () => {
      logMsg(`🏃 從 ${m.emoji} ${m.label} 手中逃走`)
      overlay.remove()
    })
    document.body.appendChild(overlay)
  }

  // ── Direct DOM shop modal ──
  function showShopModal(
    shop: { id: string; label: string; desc: string; color: string; displayDiscount: string; actualPrice: number; isTrap: boolean; isSurprise: boolean; expiresAt: number },
    row: number, col: number,
    totalSteps: number,
    setSteps: React.Dispatch<React.SetStateAction<number>>,
    setTotalSteps: React.Dispatch<React.SetStateAction<number>>,
    setEggs: React.Dispatch<React.SetStateAction<any[]>>,
    user: any,
    logMsg: (s: string) => void,
    addStRef: React.MutableRefObject<((n: number) => void) | undefined>,
  ) {
    const overlay = document.createElement('div')
    overlay.className = 'fixed-modal-layer'
    overlay.style.cssText = 'position:fixed !important;inset:0;z-index:100;display:flex;align-items:center;justify-content:center'

    const isTrap = shop.isTrap
    const isSurprise = shop.isSurprise

    // The price shown in the modal depends on the shop type
    // - Normal shops: show actualPrice
    // - Trap: show "85% discount" version (low price to lure player), but buying = lose steps
    // - Surprise: show "10% discount" version (high price), but buying = low price
    const displayPrice = isTrap ? 500 : isSurprise ? 5000 : shop.actualPrice  // trap looks cheap, surprise looks expensive
    const canAfford = totalSteps >= (isTrap ? 500 : isSurprise ? shop.actualPrice : shop.actualPrice)

    overlay.innerHTML = `<div class="card" style="width:300px;overflow:hidden;border:1.5px solid ${shop.color}66;box-shadow:0 0 30px ${shop.color}33;background:#1a1b2e;border-radius:14px;">
      <!-- Shop Header / Sign -->
      <div style="background:linear-gradient(135deg,${shop.color}22,${shop.color}11);padding:16px 20px 12px;text-align:center;border-bottom:1px solid ${shop.color}33">
        <div style="font-size:32px;line-height:1;margin-bottom:4px">🏪</div>
        <div style="font-size:16px;font-weight:800;color:#e8e0d0;letter-spacing:0.5px;text-shadow:0 1px 4px rgba(0,0,0,0.4)">${shop.label}</div>
        <div style="font-size:10px;color:#5a6d85;margin-top:2px">${shop.desc}</div>
      </div>
      <!-- Big Discount Percentage -->
      <div style="padding:18px 20px 8px;text-align:center">
        <div style="font-size:42px;font-weight:900;color:${shop.color};line-height:1;letter-spacing:1px;text-shadow:0 2px 8px ${shop.color}44">
          ${shop.displayDiscount}
        </div>
        <div style="font-size:11px;color:#5a6d85;margin-top:4px;font-weight:600">
          ${shop.isTrap ? '⚡ 限時優惠即將結束！' : shop.isSurprise ? '💼 限定商品限時折扣' : shop.displayDiscount === '??' ? '🎲 揭開神秘價格' : '🎉 限時折扣'}
        </div>
      </div>
      <!-- Countdown Timer (beautiful) -->
      <div style="padding:4px 20px 10px;text-align:center">
        <div id="shop-countdown" style="display:flex;align-items:center;justify-content:center;gap:4px;font-size:11px;color:${shop.color};font-weight:700">
          <span>⏳</span>
          <span id="shop-countdown-text" style="font-variant-numeric:tabular-nums">--:--</span>
          <span style="font-weight:400;color:#5a6d85">剩餘</span>
        </div>
      </div>
      <!-- Product Display -->
      <div style="padding:10px 20px;display:flex;align-items:center;gap:12px;border-top:1px solid rgba(255,255,255,0.04)">
        <div style="flex-shrink:0;width:56px;height:56px;background:${shop.color}15;border-radius:12px;border:1px solid ${shop.color}22;display:flex;align-items:center;justify-content:center;font-size:28px">🥚</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:#e8e0d0">圓貓蛋</div>
          <div style="font-size:10px;color:#5a6d85">孵化出圓貓 PixelLab 寵物</div>
        </div>
      </div>
      <!-- Price Tag -->
      <div style="padding:8px 20px 14px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05)">
        <div style="font-size:11px;color:#5a6d85;margin-bottom:4px">原價</div>
        <div style="font-size:14px;color:#5a6d85;text-decoration:line-through;margin-bottom:2px">👣 ${isTrap ? 1500 : isSurprise ? 6000 : shop.actualPrice * 2}</div>
        <div style="font-size:22px;font-weight:800;color:${shop.color}">
          👣 ${displayPrice}
          <span style="font-size:10px;font-weight:600;color:#5a6d85;margin-left:4px">/ 步</span>
        </div>
      </div>
      <!-- Bottom: Player Steps + Buttons -->
      <div style="padding:12px 20px 16px;display:flex;flex-direction:column;gap:10px">
        <div style="font-size:11px;color:#5a6d85;text-align:center">
          你而家有 👣 <strong style="color:#e8e0d0">${totalSteps}</strong>
          ${isTrap ? ' · <span style="color:#ef4444">⚠️ 留意條款</span>' : ''}
          ${isSurprise ? ' · <span style="color:#22c55e">🎉 驚喜價</span>' : ''}
        </div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button id="shop-buy-btn" style="flex:1;padding:10px 16px;border-radius:10px;cursor:pointer;
            background:${isTrap ? 'rgba(239,68,68,0.2)' : canAfford ? `linear-gradient(135deg,${shop.color}44,${shop.color}22)` : 'rgba(100,100,100,0.1)'};
            border:1px solid ${isTrap ? 'rgba(239,68,68,0.4)' : canAfford ? `${shop.color}44` : 'rgba(100,100,100,0.2)'};
            color:${isTrap ? '#ef4444' : canAfford ? shop.color : '#5a6d85'};
            font-size:13px;font-weight:700;font-family:inherit;
            ${!canAfford && !isTrap ? 'opacity:0.5;cursor:not-allowed' : isTrap ? '' : ''}">
            ${isTrap ? '⚡ 限時搶購！' : canAfford ? '🛒 立即購買' : '😢 步數不足'}
          </button>
          <button id="shop-close-btn" style="padding:10px 16px;border-radius:10px;cursor:pointer;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#ef4444;font-size:12px;font-weight:600;font-family:inherit">✕</button>
        </div>
      </div>
    </div>`

    overlay.querySelector('#shop-buy-btn')?.addEventListener('click', () => {
      // Clear countdown timer
      const ct = (overlay as any).__countdownTimer; if (ct) clearInterval(ct)
      if (isTrap) {
        // Trap! Looks cheap but actually LOSES steps
        const lostSteps = 3000
        setSteps(s => Math.max(0, s - lostSteps))
        setTotalSteps(s => Math.max(0, s - lostSteps))
        logMsg(`💥 中計！呢間 ${shop.label} 係陷阱！失去 👣 ${lostSteps} 步！😱`)
        overlay.remove()
        return
      }
      if (totalSteps < shop.actualPrice) {
        logMsg(`👣 步數不足 (需要 ${shop.actualPrice}，你有 ${totalSteps})`)
        return
      }
      // Deduct steps (surprise shops have much lower actualPrice than displayed)
      const paidSteps = isSurprise ? shop.actualPrice : shop.actualPrice
      setSteps(s => Math.max(0, s - paidSteps))
      setTotalSteps(s => Math.max(0, s - paidSteps))
      if (isSurprise) {
        logMsg(`🎉 驚喜！呢間 ${shop.label} 話就話唔抵，但其實只需 👣 ${paidSteps} 步！買到 🥚 蛋！`)
      } else {
        logMsg(`🛒 用 👣 ${paidSteps} 步買咗 🥚 蛋！`)
      }

      // Add egg
      const eggId = `pixellab_${Date.now()}`
      const newEgg = { id: eggId, rarity: 'Rare', collectedAt: Date.now() }
      setEggs(v => [...v, newEgg])
      // Save to DB if logged in
      if (user) {
        import('../lib/supabase-db').then(({ saveEgg }) => {
          saveEgg(user.id, 'Rare', eggId).catch(() => {})
        })
      }

      overlay.remove()
      logMsg(`🥚 圓貓蛋已加入背包！去 🐾 寵物頁孵化`)
    })

    overlay.querySelector('#shop-close-btn')?.addEventListener('click', () => {
      logMsg(`🚪 離開 ${shop.label}`)
      overlay.remove()
    })

    document.body.appendChild(overlay)

    // ── Countdown timer for shop modal ──
    const countdownEl = document.getElementById('shop-countdown-text')
    const countdownTimer = setInterval(() => {
      if (!overlay.parentNode) { clearInterval(countdownTimer); return }
      const rem = Math.max(0, shop.expiresAt - Date.now())
      if (countdownEl) {
        const min = Math.floor(rem / 60000)
        const sec = Math.floor((rem % 60000) / 1000)
        countdownEl.textContent = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      }
      if (rem <= 0) {
        clearInterval(countdownTimer)
        countdownEl && (countdownEl.textContent = '已結束')
        // Auto-close after 2s
        setTimeout(() => { if (overlay.parentNode) overlay.remove() }, 2000)
      }
    }, 1000)
    // Clean up timer when modal is closed
    const origClose = overlay.querySelector('#shop-close-btn')?.click
    overlay.querySelector('#shop-close-btn')?.addEventListener('click', () => { clearInterval(countdownTimer) })
    // Also clean up on buy
    const origBuy = overlay.querySelector('#shop-buy-btn')?.click
    overlay.querySelector('#shop-buy-btn')?.addEventListener('change', () => {})  // dummy, real cleanup in buy handler below

    // Store cleanup ref for buy handler
    ;(overlay as any).__countdownTimer = countdownTimer
  }

  // ── Hatch an egg from inventory ──
  const hatchEgg = async (egg: EggItem) => {
    setEggHatchingId(egg.id)
    // Wait for hatching animation, then spawn, then delete from DB
    setTimeout(async () => {
      setEggs(v => v.filter(e => e.id !== egg.id))
      // PixelLab shiba egg
      if (egg.id.startsWith('shiba_')) {
        await spawnShiba()
        if (user) await deleteEgg(egg.id).catch(() => {})
      } else if (egg.id.startsWith('pixellab_')) {
        await spawnPixelLabCat()
        if (user) await deleteEgg(egg.id).catch(() => {})
      } else {
        // Old non-pixellab eggs also hatch into PixelLab cat
        await spawnPixelLabCat()
        if (user) await deleteEgg(egg.id).catch(() => {})
      }
      setEggHatchingId(null)
      setTab('pets')
      logMsg(`🐣 孵化出 ${RARITY_LABELS[egg.rarity]}！`)
      if (user) { createNotification(user.id, 'egg_hatched', '🥚 蛋孵化咗！', `${RARITY_LABELS[egg.rarity]}新寵物出世啦！快啲去寵物欄睇下`); setNotifUnread(n => n + 1) }
    }, 2000)
  }

  // ── Roguelike: handle event ──
  const handleEventChoice = (choiceIndex?: number) => {
    const ev = currentEvent
    if (!ev) return

    // Special: Risk Ladder — choiceIndex = accumulated steps
    if (ev.id === 'risk_ladder' && choiceIndex !== undefined && choiceIndex > 0) {
      // Apply accumulated steps
      setSteps(s => s + choiceIndex)
      setTotalSteps(s => s + choiceIndex)
      logMsg(`📦 連環寶箱：拎走 👣 +${choiceIndex} 步！`)
      setCurrentEvent(null)
      return
    }
    if (ev.id === 'risk_ladder') {
      // Busted or 0 — no reward
      logMsg(`💥 連環寶箱：爆咗！`)
      setCurrentEvent(null)
      return
    }

    const chosenEffects = (choiceIndex !== undefined && ev.choices)
      ? ev.choices[choiceIndex].effects
      : ev.effects

    // Apply effects to active pet
    if (pet) {
      let updatedPet = { ...pet }
      for (const eff of chosenEffects) {
        switch (eff.type) {
          case 'mood_change':
            updatedPet = { ...updatedPet, moodValue: Math.max(0, Math.min(100, updatedPet.moodValue + eff.value)) }
            if (eff.value > 0 && updatedPet.mood !== Mood.Happy) updatedPet.mood = Mood.Happy
            if (eff.value < 0 && updatedPet.mood === Mood.Happy) updatedPet.mood = Mood.Sad
            break
          case 'step_bonus':
            setSteps(s => s + eff.value)
            setTotalSteps(s => s + eff.value)
            break
          case 'step_loss':
            setSteps(s => Math.max(0, s - eff.value))
            setTotalSteps(s => Math.max(0, s - eff.value))
            break
          case 'xp_gain':
            updatedPet = { ...updatedPet, xp: updatedPet.xp + eff.value }
            break
          case 'stat_boost':
            if (eff.target) {
              updatedPet = {
                ...updatedPet,
                stats: { ...updatedPet.stats, [eff.target]: updatedPet.stats[eff.target] + eff.value },
              }
            }
            break
          case 'item_gain':
            if (eff.itemId && user) {
              const isEquip = EQUIPMENT_POOL.some(e => e.id === eff.itemId)
              addInventoryItem(user.id, eff.itemId, isEquip ? 'equipment' : 'help', 1).catch(() => {})
            }
            break
          case 'item_loss':
            if (user) {
              // Remove a random item from inventory
              loadInventory(user.id).then(items => {
                if (items.length > 0) {
                  const randomItem = items[Math.floor(Math.random() * items.length)]
                  removeInventoryItem(user.id, randomItem.itemId, 1).catch(() => {})
                }
              })
            }
            break
        }
      }
      setPets(v => v.map((p, i) => i === activeIdx ? updatedPet : p))
      if (user) updatePet(updatedPet)
    }

    setCurrentEvent(null)
    logMsg(`🎲 ${ev.name} — ${choiceIndex !== undefined ? `選擇: ${ev.choices?.[choiceIndex]?.label}` : '已處理'}`)
    if (user) logEvent(user.id, ev.id, pet?.id, choiceIndex).catch(() => {})
    // Check for pending egg after event dismiss
    if (pendingEggRef.current) {
      const pe = pendingEggRef.current
      pendingEggRef.current = null
      setEggFoundData(pe)
    }
  }

  // ── Roguelike: open inventory ──
  const openInventory = async () => {
    if (user) {
      const items = await loadInventory(user.id)
      setInventory(items as any)
    }
    setShowInventory(true)
  }

  // ── Roguelike: use help item ──
  const useHelpItem = async (item: typeof HELP_ITEM_POOL[0]) => {
    if (!user || !pet) return
    setShowInventory(false)
    await removeInventoryItem(user.id, item.id, 1)

    let updatedPet = { ...pet }
    switch (item.effect) {
      case 'restore_mood':
        updatedPet = { ...updatedPet, mood: Mood.Happy, moodValue: Math.min(100, updatedPet.moodValue + item.power) }
        logMsg(`🫐 使用 ${item.name}，心情 +${item.power}%`)
        break
      case 'heal_xp':
        updatedPet = { ...updatedPet, xp: updatedPet.xp + item.power }
        logMsg(`✨ 使用 ${item.name}，+${item.power}XP`)
        break
      default:
        logMsg(`🧪 使用 ${item.name}`)
    }
    setPets(v => v.map((p, i) => i === activeIdx ? updatedPet : p))
    if (user) updatePet(updatedPet)
  }

  // ── Roguelike: equip item ──
  const handleEquipItem = async (item: typeof EQUIPMENT_POOL[0]) => {
    if (!user || !pet) return
    setShowInventory(false)
    await equipItem(user.id, pet.id, item.id, item.slot)

    logMsg(`👕 裝備 ${item.name} 到 ${item.slot}`)
    // Re-load inventory
    const items = await loadInventory(user.id)
    setInventory(items as any)
  }

  // ── Roguelike: unequip item ──
  const handleUnequip = async (slot: string) => {
    if (!user || !detailPetId) return
    await unequipSlot(detailPetId, slot)
    setPetEquipment(prev => prev.filter(e => e.slot !== slot))
    logMsg(`👕 脫下 ${slot} 裝備`)
  }

  // ── Roguelike: equip item on a specific slot (drag-drop or click) ──
  const handleEquipToSlot = async (slot: string, equipmentId: string) => {
    if (!user || !detailPetId) return
    await equipItem(user.id, detailPetId, equipmentId, slot)
    // Reload pet equipment + inventory
    const [eq, inv] = await Promise.all([
      loadPetEquipment(detailPetId),
      loadInventory(user.id),
    ])
    setPetEquipment(eq)
    setInventory(inv as any)
    logMsg(`👕 拖放裝備完成`)
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

  // ── Pet action helpers (deprecated: removed feed/pet/play) ──

  // ── Spawn PixelLab cat (species 0, seed 175) ──
  const spawnPixelLabCat = async () => {
    const np: Pet = {
      id: `cat-${Date.now()}`,
      userId: user?.id ?? 'local',
      name: '圓貓',
      speciesId: '175',
      imageUrl: '',
      rarity: Rarity.Rare,
      level: 5,
      xp: 0,
      totalSteps: 0,
      evolutionStage: 2,
      status: PetStatus.Adult,
      stats: { speed: 8, luck: 6, charm: 10, energy: 100 },
      skills: generateSkills(Rarity.Rare, 5),
      mood: Mood.Happy,
      moodValue: 100,
      lastFedAt: Date.now(),
      lastInteractionAt: Date.now(),
      createdAt: Date.now(),
      isForSale: false,
      price: 0,
    }
    if (user) {
      const dbId = await savePet(user.id, np)
      if (dbId) np.id = dbId
    }
    setPets(v => [...v, np])
    setActiveIdx(pets.length)
    setNewPetId(np.id)
    try { localStorage.setItem('pipz_new_pet', np.id) } catch(_){}
    logMsg('🐱 圓貓（PixelLab）誕生！')
  }

  // ── Spawn PixelLab Shiba (seed 176 → species 1, 柴犬) ──
  const spawnShiba = async () => {
    const np: Pet = {
      id: `shiba-${Date.now()}`,
      userId: user?.id ?? 'local',
      name: '柴犬',
      speciesId: '176',
      imageUrl: '',
      rarity: Rarity.Uncommon,
      level: 3,
      xp: 0,
      totalSteps: 0,
      evolutionStage: 2,
      status: PetStatus.Adult,
      stats: { speed: 12, luck: 5, charm: 8, energy: 80 },
      skills: generateSkills(Rarity.Uncommon, 3),
      mood: Mood.Happy,
      moodValue: 100,
      lastFedAt: Date.now(),
      lastInteractionAt: Date.now(),
      createdAt: Date.now(),
      isForSale: false,
      price: 0,
    }
    if (user) {
      const dbId = await savePet(user.id, np)
      if (dbId) np.id = dbId
    }
    setPets(v => [...v, np])
    setActiveIdx(pets.length)
    setNewPetId(np.id)
    try { localStorage.setItem('pipz_new_pet', np.id) } catch(_){}
    logMsg('🐶 柴犬（PixelLab）誕生！')
  }

  // ── PixelLab cat egg ──
  const addPixelLabEgg = async () => {
    if (!user) return
    const eggId = `pixellab_${Date.now()}`
    const newEgg: EggItem = {
      id: eggId,
      rarity: Rarity.Rare,
      collectedAt: Date.now(),
    }
    const dbId = await saveEgg(user.id, Rarity.Rare, eggId)
    if (dbId) newEgg.id = dbId
    setEggs(v => [...v, newEgg])
    logMsg('🥚 圓貓蛋已加入！去寵物頁孵化')
    setTab('pets')
  }

  // ── PixelLab Shiba egg ──
  const addShibaEgg = async () => {
    if (!user) return
    const eggId = `shiba_${Date.now()}`
    const newEgg: EggItem = {
      id: eggId,
      rarity: Rarity.Uncommon,
      collectedAt: Date.now(),
    }
    const dbId = await saveEgg(user.id, Rarity.Uncommon, eggId)
    if (dbId) newEgg.id = dbId
    setEggs(v => [...v, newEgg])
    logMsg('🥚 柴犬蛋已加入！去寵物頁孵化')
    setTab('pets')
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
            <button onClick={() => setShowDevTools(!showDevTools)}
              style={{
                background:'rgba(59,130,246,0.12)', border:'none',
                cursor:'pointer', color:'#60a5fa',
                fontSize:11, padding:'2px 6px', borderRadius:6,
                fontFamily:'inherit', marginRight:2,
              }}>
              🔧
            </button>
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
              {/* ── Dev Tools panel (toggled by header 🔧 button) ── */}
              {showDevTools && (
                <div className="card" style={{
                  position:'fixed', top:42, left:0, right:0, zIndex:1002,
                  padding:12, margin:'0 12px',
                  maxHeight:'50vh', overflowY:'auto',
                }}>
                    {/* ── GPS Control ── */}
                    <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:8, flexWrap:'wrap'}}>
                      <button
                        onClick={walking ? walkStop : walkStart}
                        style={{
                          background: walking ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)',
                          border: walking ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(34,197,94,0.3)',
                          cursor:'pointer', color: walking ? '#ef4444' : '#22c55e',
                          fontSize:14, padding:'4px 12px', borderRadius:10,
                          fontFamily:'inherit', lineHeight:1,
                        }}>
                        {walking ? '⏹ 熄GPS' : '📡 開GPS'}
                      </button>
                      {walking && <span style={{fontSize:10, color:'#22c55e'}}>🟢 GPS 運作中</span>}
                    </div>
                    {/* ── Walk Simulation + Steps ── */}
                    <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:8, flexWrap:'wrap'}}>
                      <button className="btn btn-ghost" onClick={forceEvent}
                        style={{fontSize:10, padding:'4px 10px'}}>
                        🎲 Event
                      </button>
                      <button className="btn btn-ghost" onClick={addDebug}
                        style={{fontSize:10, padding:'4px 10px'}}>
                        +500 步
                      </button>
                      <button className="btn btn-ghost" onClick={() => removeSt(500)}
                        style={{fontSize:10, padding:'4px 10px', color:'#ef4444'}}>
                        -500 步
                      </button>
                      <button className="btn btn-ghost" onClick={clearSteps}
                        style={{fontSize:10, padding:'4px 10px', color:'#ef4444', fontWeight:800}}>
                        🗑️ 清零
                      </button>
                      <button className={`btn ${simulating ? 'btn-danger' : 'btn-ghost'}`}
                        onClick={() => setSimulating(v => !v)}
                        style={{fontSize:10, padding:'4px 10px'}}>
                        {simulating ? '⏹ 停止' : '🚶 模擬'}
                      </button>
                      {/* Speed toggle */}
                      {[1,5,10,50].map(s => (
                        <button key={s}
                          onClick={() => { setSimSpeed(s); if (!simulating) setSimulating(true) }}
                          style={{
                            fontSize:9, padding:'2px 8px', cursor:'pointer', fontFamily:'inherit',
                            background: simSpeed === s ? '#8b5cf644' : 'transparent',
                            border: simSpeed === s ? '1px solid #8b5cf6' : '1px solid #2a3a5a',
                            color: simSpeed === s ? '#c4b5fd' : '#5a6d85',
                            borderRadius:6,
                          }}>
                          {s}x
                        </button>
                      ))}
                      <span style={{fontSize:9, color: simulating ? '#22c55e' : '#5a6d85'}}>
                        {simulating ? `🟢 ${simSpeed}x` : '🛰️ GPS'}
                      </span>
                    </div>

                    {/* ── GPS Walk Simulation (auto-follow + flag test) ── */}
                    <div style={{display:'flex', gap:8, marginBottom:8, flexWrap:'wrap'}}>
                      <button className={`btn ${simGpsWalking ? 'btn-danger' : 'btn-ghost'}`}
                        onClick={() => setSimGpsWalking(v => !v)}
                        style={{fontSize:10, padding:'4px 10px', color: simGpsWalking ? '#f59e0b' : '#22d3ee'}}>
                        {simGpsWalking ? '⏹ 停GPS模擬' : '🗺️ GPS步行模擬'}
                      </button>
                      {simGpsWalking && <span style={{fontSize:9, color:'#22c55e'}}>🟢 模擬步行中</span>}
                    </div>

                    {/* ── Manual Mode Toggle ── */}
                    <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:8, flexWrap:'wrap'}}>
                      <button
                        onClick={toggleManualMode}
                        style={{
                          fontSize:10, padding:'4px 10px', cursor:'pointer', fontFamily:'inherit',
                          borderRadius:10, lineHeight:1,
                          background: manualMode ? 'rgba(34,211,238,0.15)' : 'rgba(59,130,246,0.08)',
                          border: manualMode ? '1px solid rgba(34,211,238,0.4)' : '1px solid rgba(59,130,246,0.15)',
                          color: manualMode ? '#22d3ee' : '#60a5fa',
                        }}>
                        🕹️ {manualMode ? '手動模式 ON' : '手動模式 OFF'}
                      </button>
                      {manualMode && <span style={{fontSize:9, color:'#22d3ee'}}>🟢 GPS 已停用，使用方向鍵移動</span>}
                    </div>

                    {/* ── Manual D-Pad Walk ── */}
                    <div style={{
                      display:'flex', flexDirection:'column', alignItems:'center',
                      marginBottom:8, gap:3,
                    }}>
                      <div style={{fontSize:9, color:'#5a6d85', marginBottom:2}}>🕹️ 手動方向</div>
                      <div style={{display:'flex', gap:3, justifyContent:'center'}}>
                        <button
                          onMouseDown={() => startManualWalk('up')}
                          onMouseUp={stopManualWalk}
                          onMouseLeave={stopManualWalk}
                          onTouchStart={() => startManualWalk('up')}
                          onTouchEnd={stopManualWalk}
                          style={{
                            width:40, height:34, borderRadius:8, cursor:'pointer',
                            background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.3)',
                            color:'#22d3ee', fontSize:18, lineHeight:1,
                            fontFamily:'inherit', userSelect:'none',
                            WebkitUserSelect:'none',
                          }}
                        >▲</button>
                      </div>
                      <div style={{display:'flex', gap:3, justifyContent:'center'}}>
                        <button
                          onMouseDown={() => startManualWalk('left')}
                          onMouseUp={stopManualWalk}
                          onMouseLeave={stopManualWalk}
                          onTouchStart={() => startManualWalk('left')}
                          onTouchEnd={stopManualWalk}
                          style={{
                            width:40, height:34, borderRadius:8, cursor:'pointer',
                            background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.3)',
                            color:'#22d3ee', fontSize:18, lineHeight:1,
                            fontFamily:'inherit', userSelect:'none',
                            WebkitUserSelect:'none',
                          }}
                        >◄</button>
                        <div style={{
                          width:40, height:34, borderRadius:8,
                          background:'rgba(255,255,255,0.03)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:10, color:'#5a6d85',
                        }}>⬥</div>
                        <button
                          onMouseDown={() => startManualWalk('right')}
                          onMouseUp={stopManualWalk}
                          onMouseLeave={stopManualWalk}
                          onTouchStart={() => startManualWalk('right')}
                          onTouchEnd={stopManualWalk}
                          style={{
                            width:40, height:34, borderRadius:8, cursor:'pointer',
                            background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.3)',
                            color:'#22d3ee', fontSize:18, lineHeight:1,
                            fontFamily:'inherit', userSelect:'none',
                            WebkitUserSelect:'none',
                          }}
                        >►</button>
                      </div>
                      <div style={{display:'flex', gap:3, justifyContent:'center'}}>
                        <button
                          onMouseDown={() => startManualWalk('down')}
                          onMouseUp={stopManualWalk}
                          onMouseLeave={stopManualWalk}
                          onTouchStart={() => startManualWalk('down')}
                          onTouchEnd={stopManualWalk}
                          style={{
                            width:40, height:34, borderRadius:8, cursor:'pointer',
                            background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.3)',
                            color:'#22d3ee', fontSize:18, lineHeight:1,
                            fontFamily:'inherit', userSelect:'none',
                            WebkitUserSelect:'none',
                          }}
                        >▼</button>
                      </div>
                      {mapPos && (
                        <span style={{fontSize:8, color:'#5a6d85', marginTop:2}}>
                          {mapPos.lat.toFixed(5)}, {mapPos.lng.toFixed(5)}
                        </span>
                      )}
                    </div>

                    {/* ── Test Pet ── */}
                    <div style={{display:'flex', gap:8, marginBottom:8, flexWrap:'wrap'}}>
                      <button className="btn btn-primary" onClick={createTestPet}
                        style={{fontSize:10, padding:'4px 10px'}}>
                        🧪 全能測試寵物
                      </button>
                      {/* ── PixelLab cat for logged-in users ── */}
                      {user && (
                        <>
                          <button className="btn" onClick={addPixelLabEgg}
                            style={{fontSize:10, padding:'4px 10px', background:'rgba(212,132,90,0.15)', border:'1px solid rgba(212,132,90,0.3)', color:'#d4845a', borderRadius:10, cursor:'pointer', fontFamily:'inherit'}}>
                            🥚 圓貓蛋
                          </button>
                          <button className="btn" onClick={addShibaEgg}
                            style={{fontSize:10, padding:'4px 10px', background:'rgba(168,120,200,0.15)', border:'1px solid rgba(168,120,200,0.3)', color:'#a878c8', borderRadius:10, cursor:'pointer', fontFamily:'inherit'}}>
                            🥚 柴犬蛋
                          </button>
                        </>   
                      )}
                    </div>

                    {/* ── 7日路線測試 ── */}
                    <div style={{display:'flex', gap:8, marginBottom:8, flexWrap:'wrap'}}>
                      <button className="btn btn-ghost" onClick={() => realMapRef.current?.generateTestTrails()}
                        style={{fontSize:10, padding:'4px 10px', color:'#22d3ee'}}>
                        🎨 測試7日路線
                      </button>
                      <button className="btn btn-ghost" onClick={() => realMapRef.current?.clearStoredTrails()}
                        style={{fontSize:10, padding:'4px 10px', color:'#f59e0b'}}>
                        🗑️ 清除路線記憶
                      </button>
                      <button className="btn btn-ghost" onClick={() => {
                        // Generate test trail data for the initial zoom animation
                        const hkLat = 22.3193, hkLng = 114.1694
                        const testData: Record<string, [number,number][]> = {}
                        const days = [0, 1, 2, 4, 6] // Sun, Mon, Tue, Thu, Sat
                        days.forEach((day, di) => {
                          const pts: [number,number][] = []
                          for (let i = 0; i < 30; i++) {
                            const angle = (di / days.length) * Math.PI * 2 + i * 0.08
                            const lat = hkLat + Math.cos(angle) * 0.001 * (0.5 + di * 0.2)
                            const lng = hkLng + Math.sin(angle) * 0.0008
                            pts.push([lat, lng])
                          }
                          testData[String(day)] = pts
                        })
                        localStorage.setItem('pipz_trail_data', JSON.stringify(testData))
                        window.location.reload()
                      }}
                        style={{fontSize:10, padding:'4px 10px', color:'#a78bfa'}}>
                        🎬 重播初始動畫
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
                          <button className="btn btn-ghost" onClick={deleteActivePet}
                            style={{fontSize:9, padding:'3px 8px', color:'#ef4444'}}>🗑️ 刪除</button>
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

          {/* ════ Loading ════ */}
          {loading ? (
            <div style={{textAlign:'center', padding: '60px 0', color:'#5a6d85', fontSize:13}}>
              <div style={{fontSize:24, marginBottom:8}}>⏳</div>
              載入中...
            </div>
          ) : (

          <>
          {/* ════ MAP TAB (always mounted, hidden via display:none) ════ */}
          <div className="fade-up" style={{ display: tab === 'map' ? 'flex' : 'none', flexDirection:'column', overflow:'hidden', position:'fixed', top:42, left:0, right:0, bottom:0, zIndex:1 }}>

              {/* ── Map fills everything ── */}
              <div style={{ flex:1, minHeight:0, position:'relative' }}>
              {walking && mapPos ? (
                <RealMap ref={realMapRef} position={mapPos} walking={walking} pet={pet} mode={movementMode} deviceHeading={compassHeading} compassActive={compassActive} userId={user?.id} ownedCells={ownedCells} allFlagCells={allFlagCells} trailDayFilter={trailDayFilter} onCellEvent={handleCellEvent} onShopEntered={handleShopEntered} />
              ) : (
                <RealMap ref={realMapRef} position={null} walking={false} pet={pet} mode={null} deviceHeading={null} userId={user?.id} ownedCells={ownedCells} allFlagCells={allFlagCells} trailDayFilter={trailDayFilter} onCellEvent={handleCellEvent} onShopEntered={handleShopEntered} />
              )}
                {/* 📊 Semi-transparent Steps Card overlay at bottom — expandable */}
                <div ref={cardRef} className="section card"
                  onPointerDown={(e) => {
                    cardDragStartY.current = e.clientY;
                    cardDragging.current = false;
                    cardDragDirRef.current = null;
                    cardAnimRef.current = false;
                    // Capture events at document level for reliable tracking
                    // Track incremental movement (not cumulative from start)
                    let prevMoveY = e.clientY;
                    const onMove = (ev: PointerEvent) => {
                      const deltaY = prevMoveY - ev.clientY; // positive = up, negative = down
                      prevMoveY = ev.clientY;
                      if (Math.abs(deltaY) > 8) {
                        cardDragging.current = true;
                        cardDragDirRef.current = deltaY > 0 ? 'up' : 'down';
                      }
                      const newExtra = Math.max(0, Math.min(CARD_MAX_EXTRA, cardDragYRef.current + deltaY));
                      cardDragYRef.current = newExtra;
                      setCardDragY(newExtra);
                    };
                    const onUp = () => {
                      document.removeEventListener('pointermove', onMove);
                      document.removeEventListener('pointerup', onUp);
                      const currentY = cardDragYRef.current;
                      if (!cardDragging.current) {
                        cardAnimRef.current = true;
                        // Tap — always expands if collapsed, no-op if already expanded
                        setCardDragY(CARD_MAX_EXTRA);
                        cardDragYRef.current = CARD_MAX_EXTRA;
                      } else {
                        cardAnimRef.current = true;
                        // Direction-based snap
                        const snapTarget = cardDragDirRef.current === 'up' ? CARD_MAX_EXTRA : 0;
                        cardDragYRef.current = snapTarget;
                        setCardDragY(snapTarget);
                      }
                      cardDragging.current = false;
                      setTimeout(() => { cardAnimRef.current = false; }, 350);
                    };
                    document.addEventListener('pointermove', onMove);
                    document.addEventListener('pointerup', onUp);
                  }}
                  style={{position:'absolute', bottom:0, left:0, right:0, zIndex:1003, background:'rgba(15,23,42,0.7)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', borderBottomLeftRadius:0, borderBottomRightRadius:0, border:'1px solid rgba(255,255,255,0.06)', borderBottom:'none', padding:0, marginBottom:0, borderRadius:'16px 16px 0 0', touchAction:'none', overflow:'hidden', display:'flex', flexDirection:'column', height: innerH + HANDLE_H + navH + cardDragY, transition: cardAnimRef.current ? 'height 0.3s cubic-bezier(0.4,0,0.2,1)' : 'none'}}>
                  {/* ── Drag handle ── */}
                  <div
                    ref={cardHandleRef}
                    style={{flexShrink:0, display:'flex', justifyContent:'center', padding:'12px 0 8px', cursor:'grab', touchAction:'none', WebkitTouchCallout:'none', userSelect:'none', WebkitUserSelect:'none'}}
                  >
                    <div style={{
                      width: 40, height: 4, borderRadius: 2,
                      background: 'rgba(255,255,255,0.25)',
                      transition: 'opacity 0.2s',
                      opacity: cardDragY > 50 ? 0.5 : 1,
                    }} />
                  </div>
                  {/* ── Collapsible content: switches by cardTab ── */}
                  <div style={{flex:1, overflow:'hidden'}}>
                    {/* ── Preview (measured for collapsed height) ── */}
                    <div ref={innerRef} style={{padding:'0 16px'}}>
                      {/* ── 🗺️ Map preview: steps numbers ── */}
                      {cardTab === 'map' && (
                        <div style={{display:'flex', justifyContent:'space-around', marginBottom:14, position:'relative'}}>
                          <div style={{textAlign:'center', position:'relative'}}>
                            <div className="steps-num step-bounce" key={stepAnimTick}>
                              {ready ? steps.toLocaleString() : '0'}
                            </div>
                            {stepFlashType !== 'none' && (
                              <div className={stepFlashType === 'skill' ? 'step-flash-skill' : 'step-flash'}
                                style={{position:'absolute', inset:-8, borderRadius:8, pointerEvents:'none', zIndex:2}} />
                            )}
                            {stepArrows.map((a, i) => (
                              <div key={a.id} className={a.type === 'skill' ? 'arrow-float-skill' : 'arrow-float'}
                                style={{position:'absolute', fontSize:14, fontWeight:700, color:'#22c55e', left:`${-20 + i * 14}px`, top:0, pointerEvents:'none', zIndex:3}}>↑</div>
                            ))}
                            <div className="steps-label" style={{marginTop:2}}>今日步數</div>
                            {pet?.skills?.some(s => s.effect === SkillEffect.DoubleSteps) && (<div style={{fontSize:7, color:'#f59e0b', marginTop:2}}>👟 雙倍步伐</div>)}
                            {pet?.skills?.some(s => s.effect === SkillEffect.StepBonus) && (<div style={{fontSize:7, color:'#22d3ee', marginTop:1}}>💨 疾步如飛</div>)}
                          </div>
                          <div style={{width:1, background:'#1e2a45'}} />
                          <div style={{textAlign:'center'}}>
                            <div className="steps-num">{ready ? formatSteps(totalSteps) : '0'}</div>
                            <div className="steps-label" style={{marginTop:2}}>總步數</div>
                            {pet?.skills?.some(s => s.effect === SkillEffect.EnergyBonus) && (<div style={{fontSize:7, color:'#f59e0b', marginTop:2}}>⚡ 能量過載</div>)}
                          </div>
                          <div style={{width:1, background:'#1e2a45'}} />
                          <div style={{textAlign:'center'}}>
                            <div className="steps-num">{weeklySteps.length > 0 ? Math.round(weeklySteps.reduce((a,b) => a+b.steps, 0) / 7) : 0}</div>
                            <div className="steps-label" style={{marginTop:2}}>日均</div>
                          </div>
                        </div>
                      )}

                      {/* ── 🐾 Pets preview: active pet summary ── */}
                      {cardTab === 'pets' && (
                        <div style={{display:'flex', alignItems:'center', gap:10, padding:'4px 0', marginBottom:14}}>
                          <div style={{fontSize:32}}>{pet?.name?.[0] || '🐣'}</div>
                          <div style={{flex:1, minWidth:0}}>
                            <div style={{display:'flex', alignItems:'center', gap:6}}>
                              <div style={{fontSize:14, fontWeight:700, color:'#e2e8f0'}}>{pet?.name || '無寵物'}</div>
                              <span style={{fontSize:9, color:'#94a5b8'}}>Lv.{pet?.level || 1}</span>
                            </div>
                            <div style={{marginTop:4, height:4, borderRadius:2, background:'#1e2a45', overflow:'hidden'}}>
                              <div style={{width:`${((pet?.xp || 0) / ((pet?.level || 1) * 100) * 100).toFixed(1)}%`, height:'100%', borderRadius:2, background:'#22c55e', transition:'width 0.3s'}} />
                            </div>
                            <div style={{fontSize:9, color:'#5a6d85', marginTop:2}}>{pets.length} 隻寵物</div>
                          </div>
                        </div>
                      )}

                      {/* ── 🏠 Properties preview ── */}
                      {cardTab === 'properties' && (
                        <div style={{display:'flex', alignItems:'center', gap:12, padding:'4px 0', marginBottom:14}}>
                          <div style={{fontSize:32}}>🏡</div>
                          <div>
                            <div style={{fontSize:14, fontWeight:700, color:'#e2e8f0'}}>我的地產</div>
                            <div style={{fontSize:10, color:'#5a6d85', marginTop:2}}>{ownedCells?.length || 0} 佔領 · {allFlagCells?.length || 0} 插旗</div>
                          </div>
                        </div>
                      )}

                      {/* ── 🏪 Community preview ── */}
                      {cardTab === 'community' && (
                        <div style={{display:'flex', alignItems:'center', gap:12, padding:'4px 0', marginBottom:14}}>
                          <div style={{fontSize:32}}>🏪</div>
                          <div>
                            <div style={{fontSize:14, fontWeight:700, color:'#e2e8f0'}}>社群</div>
                            <div style={{fontSize:10, color:'#5a6d85', marginTop:2}}>商店 · 玩家互動</div>
                          </div>
                        </div>
                      )}

                      {/* ── 🎒 Backpack preview ── */}
                      {cardTab === 'inventory' && (
                        <div style={{display:'flex', alignItems:'center', gap:12, padding:'4px 0', marginBottom:14}}>
                          <div style={{fontSize:32}}>🎒</div>
                          <div>
                            <div style={{fontSize:14, fontWeight:700, color:'#e2e8f0'}}>背包</div>
                            <div style={{fontSize:10, color:'#5a6d85', marginTop:2}}>道具 · 裝備</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Extended content (revealed by pull-up) ── */}
                    <div style={{padding:'0 16px 14px'}}>
                      {/* ── 🗺️ Map extended: weekly chart ── */}
                      {cardTab === 'map' && (<>
                        {weeklySteps.length > 0 && (
                          <div style={{marginBottom:8}}>
                            <div style={{display:'flex', justifyContent:'space-between', fontSize:9, color:'#94a5b8', marginBottom:8}}>
                              <span>📊 本週步數</span>
                              <span>{formatSteps(weeklySteps.reduce((a,b) => a+b.steps, 0))} / 週</span>
                            </div>
                            <div className="weekly-chart">
                              {(()=>{const m=Math.max(...weeklySteps.map(d=>d.steps),1);return weeklySteps.map((day,i)=>{const h=m>0?Math.round((day.steps/m)*60):4;return(
                                <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:70}}>
                                  <div style={{width:'100%', maxWidth:28, height:h, borderRadius:'4px 4px 0 0', background:day.isToday?'linear-gradient(180deg,#22c55e,#16a34a)':'rgba(255,255,255,0.1)', minHeight:4}} />
                                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', marginTop:4}}>
                                    <span className="weekly-bar-steps">{formatSteps(day.steps)}</span>
                                    <span className={`weekly-bar-label ${day.isToday ? 'weekly-bar-label-today' : ''}`}>{day.dayLabel}</span>
                                  </div>
                                </div>
                              )})})()}
                            </div>
                          </div>
                        )}
                        {/* 佔領 + 寵物狀態 */}
                        <div style={{display:'flex', gap:20, padding:'6px 0', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                          <div style={{textAlign:'center'}}>
                            <div style={{fontSize:14, fontWeight:700, color:'#e2e8f0'}}>{ownedCells?.length || 0}</div>
                            <div style={{fontSize:9, color:'#5a6d85'}}>佔領地</div>
                          </div>
                          <div style={{textAlign:'center'}}>
                            <div style={{fontSize:14, fontWeight:700, color:'#e2e8f0'}}>{allFlagCells?.length || 0}</div>
                            <div style={{fontSize:9, color:'#5a6d85'}}>插旗點</div>
                          </div>
                          <div style={{textAlign:'center'}}>
                            <div style={{fontSize:14, fontWeight:700, color:'#e2e8f0'}}>{pet && walking ? '步行中' : pet ? '待機' : '離線'}</div>
                            <div style={{fontSize:9, color:'#5a6d85'}}>寵物</div>
                          </div>
                        </div>
                      </>)}

                      {/* ── 🐾 Pets: full content from pets page ── */}
                      {cardTab === 'pets' && (() => {
                        if (pets.length === 0) return (
                          <div style={{textAlign:'center', padding:'30px 0', color:'#5a6d85'}}>
                            <div style={{fontSize:36, marginBottom:8}}>🥚</div>
                            <div style={{fontSize:12}}>未有寵物，行路孵化啦！</div>
                          </div>
                        )
                        const sorted = [...pets].sort((a, b) => {
                          const af = favorites.includes(a.id) ? 0 : 1
                          const bf = favorites.includes(b.id) ? 0 : 1
                          if (af !== bf) return af - bf
                          return (b.createdAt || 0) - (a.createdAt || 0)
                        })
                        const teamPets = favorites.map(fid => pets.find(p => p.id === fid)).filter((p): p is Pet => p !== undefined).slice(0, 5)
                        const otherPets = sorted.filter(p => !favorites.includes(p.id))
                        const activePetSkills = pets[activeIdx]?.skills ?? []
                        const energyMult = 1 + getEnergyBonus(activePetSkills)
                        const displayEnergy = Math.round(totalSteps * energyMult)
                        return (
                          <>
                            {/* Headline */}
                            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                              <div style={{fontSize:12, fontWeight:700, color:'#e2e8f0'}}>🐾 寵物</div>
                              <div style={{fontSize:10, color:'#5a6d85'}}>{pets.length} 隻</div>
                            </div>

                            {/* ⚡ Energy + Eggs section — same as pets page */}
                            <div style={{padding:'8px 0', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                              <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:6}}>
                                <div style={{fontSize:10, color:'#5a6d85'}}>⚡ 你擁有的能量</div>
                                {eggs.length > 0 && <div style={{fontSize:10, color:'#94a5b8', marginLeft:'auto'}}>🥚 ×{eggs.length}</div>}
                              </div>
                              <div style={{display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.04)'}}>
                                <svg width="18" height="26" viewBox="0 0 26 38" fill="none"><path d="M14.5 0L0 20h10.5L9 38l17-22H15l2-16h-2.5z" fill="#f59e0b"/></svg>
                                <div style={{fontSize:20, fontWeight:800, color:'#f59e0b'}}>{ready ? formatSteps(displayEnergy) : '0'}</div>
                              </div>
                              {/* Eggs grid */}
                              {eggs.length > 0 && (
                                <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:4, marginTop:6}}>
                                  {eggs.map(egg => {
                                    const isHatching = eggHatchingId === egg.id
                                    return (
                                      <div key={egg.id} onClick={() => !isHatching && hatchEgg(egg)}
                                        style={{textAlign:'center', padding:'6px 4px', borderRadius:6, borderColor:`${PC[egg.rarity]}44`, border:'1px solid', background:isHatching?'rgba(245,158,11,0.1)':'rgba(255,255,255,0.03)', cursor:isHatching?'default':'pointer'}}>
                                        <div style={{fontSize:22}}>{isHatching ? '✨' : '🥚'}</div>
                                        <div style={{fontSize:7, fontWeight:700, color:PC[egg.rarity], marginTop:2}}>{RARITY_LABELS[egg.rarity]}</div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            {/* ⭐ Team section */}
                            <div style={{padding:'8px 0', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
                                <div style={{fontSize:10, color:'#5a6d85'}}>⭐ 主力隊伍</div>
                                <div style={{fontSize:10, color:'#5a6d85'}}>{favorites.length}/5</div>
                              </div>
                              <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:4}}>
                                {Array.from({length:5}).map((_, slotIdx) => {
                                  const pet = teamPets[slotIdx]
                                  if (pet) return (
                                    <div key={pet.id} onClick={() => setDetailPetId(pet.id)}
                                      style={{textAlign:'center', padding:'6px 2px', borderRadius:6, background:'rgba(255,255,255,0.04)', border:`2px solid ${RARITY_COLORS[pet.rarity]}44`, cursor:'pointer', position:'relative'}}>
                                      <PixelPetCanvas key={pet.id} seed={parseInt(pet.speciesId)||1} rarity={pet.rarity} evolutionStage={pet.evolutionStage} size={1.3} animation="idle" noAnim />
                                      <div style={{fontSize:8, color:'#e2e8f0', marginTop:2}}>Lv.{pet.level}</div>
                                      <div onClick={e => { e.stopPropagation(); toggleFavorite(pet.id) }}
                                        style={{position:'absolute', top:0, right:0, fontSize:14, color:'#ef4444', cursor:'pointer', lineHeight:1}}>×</div>
                                    </div>
                                  )
                                  return (
                                    <div key={`empty-${slotIdx}`} style={{textAlign:'center', padding:'6px 2px', borderRadius:6, background:'rgba(255,255,255,0.02)', border:'2px dashed rgba(255,255,255,0.08)'}}>
                                      <div style={{fontSize:14, opacity:0.2}}>+</div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            {/* 🐾 Other pets grid */}
                            {otherPets.length > 0 && (
                              <div style={{padding:'8px 0', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
                                  <div style={{fontSize:10, color:'#5a6d85'}}>🐾 其他寵物</div>
                                  <div style={{fontSize:10, color:'#5a6d85'}}>{otherPets.length} 隻</div>
                                </div>
                                <div style={{maxHeight:180, overflow:'auto'}}>
                                  <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:4, padding:'4px 0'}}>
                                    {otherPets.map(p => {
                                      const sc = RARITY_COLORS[p.rarity]
                                      const origIdx = pets.indexOf(p)
                                      return (
                                        <div key={p.id} onClick={() => setDetailPetId(p.id)}
                                          style={{textAlign:'center', padding:'6px 2px', borderRadius:6, background:'rgba(255,255,255,0.03)', border:`1px solid ${sc}33`, cursor:'pointer', position:'relative'}}>
                                          <PixelPetCanvas key={p.id} seed={parseInt(p.speciesId)||1} rarity={p.rarity} evolutionStage={p.evolutionStage} size={1.2} animation="idle" noAnim />
                                          <div style={{fontSize:7, color:'#e2e8f0', marginTop:2}}>Lv.{p.level}</div>
                                          {origIdx === activeIdx && <div style={{fontSize:6, color:'#22c55e', marginTop:1}}>活躍</div>}
                                          <div onClick={e => { e.stopPropagation(); toggleFavorite(p.id) }}
                                            style={{position:'absolute', top:0, right:0, fontSize:10, color:'#f59e0b', cursor:'pointer', lineHeight:1}}>+</div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}

                      {/* ── 🏠 Properties extended ── */}
                      {cardTab === 'properties' && (<>
                        <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', padding:'8px 0'}}>
                          <div style={{fontSize:10, color:'#94a5b8', marginBottom:6}}>🏴 佔領區域</div>
                          {ownedCells && ownedCells.length > 0 ? (
                            <div style={{maxHeight:120, overflow:'auto'}}>
                              {ownedCells.slice(0, 5).map((c, i) => (
                                <div key={i} style={{fontSize:10, color:'#e2e8f0', padding:'3px 0', borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                                  📍 ({c.row}, {c.col})
                                </div>
                              ))}
                              {ownedCells.length > 5 && <div style={{fontSize:9, color:'#5a6d85', padding:'3px 0'}}>...仲有 {ownedCells.length - 5} 塊</div>}
                            </div>
                          ) : (
                            <div style={{fontSize:10, color:'#5a6d85', fontStyle:'italic'}}>未有佔領任何地</div>
                          )}
                        </div>
                        <button onClick={() => setTab('properties')} style={{display:'flex', alignItems:'center', gap:4, marginTop:8, background:'rgba(255,255,255,0.05)', border:'none', borderRadius:8, padding:'7px 14px', fontSize:10, color:'#f59e0b', cursor:'pointer', fontFamily:'inherit', width:'100%', justifyContent:'center'}}>
                          🏠 詳細地產頁 →
                        </button>
                      </>)}

                      {/* ── 🏪 Community extended ── */}
                      {cardTab === 'community' && (<>
                        <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', padding:'10px 0', color:'#5a6d85', fontSize:10, fontStyle:'italic'}}>
                          附近玩家 · 商店 · 排行榜（開發中）
                        </div>
                        <button onClick={() => setTab('community')} style={{display:'flex', alignItems:'center', gap:4, marginTop:8, background:'rgba(255,255,255,0.05)', border:'none', borderRadius:8, padding:'7px 14px', fontSize:10, color:'#06b6d4', cursor:'pointer', fontFamily:'inherit', width:'100%', justifyContent:'center'}}>
                          🏪 詳細社群頁 →
                        </button>
                      </>)}

                      {/* ── 🎒 Backpack extended ── */}
                      {cardTab === 'inventory' && (<>
                        <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', padding:'10px 0', color:'#5a6d85', fontSize:10, fontStyle:'italic'}}>
                          道具 · 裝備 · 使用（開發中）
                        </div>
                        <button onClick={() => setTab('inventory')} style={{display:'flex', alignItems:'center', gap:4, marginTop:8, background:'rgba(255,255,255,0.05)', border:'none', borderRadius:8, padding:'7px 14px', fontSize:10, color:'#8b5cf6', cursor:'pointer', fontFamily:'inherit', width:'100%', justifyContent:'center'}}>
                          🎒 詳細背包頁 →
                        </button>
                      </>)}
                    </div>
                  </div>

                  {/* ── Fixed nav area ── */}
                  <div ref={navRef} style={{flexShrink:0, padding:'0 16px 14px'}}>
                    {/* ── Tab nav integrated into steps card ── */}
                    <div style={{display:'flex', justifyContent:'space-around', padding:'6px 0 0', borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:6}}>
                      {([
                        { k: 'map' as Tab, icon: '🗺️', label: '地圖' },
                        { k: 'pets' as Tab, icon: '🐾', label: '寵物' },
                        { k: 'properties' as Tab, icon: '🏠', label: '地產' },
                        { k: 'community' as Tab, icon: '🏪', label: '社群' },
                        { k: 'inventory' as Tab, icon: '🎒', label: '背包' },
                      ]).map(t => (
                        <button key={t.k} onClick={() => setCardTab(t.k)}
                           style={{
                             display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                             background:'transparent', border:'none', padding:'4px 8px',
                             cursor:'pointer', fontFamily:'inherit',
                             opacity: cardTab === t.k ? 1 : 0.5,
                             filter: cardTab === t.k ? 'none' : 'grayscale(0.5)',
                             transition:'opacity 0.15s',
                           }}>
                          <span style={{fontSize:16}}>{t.icon}</span>
                          <span style={{fontSize:8, color: cardTab === t.k ? '#e2e8f0' : '#5a6d85', fontWeight: cardTab === t.k ? 700 : 500}}>{t.label}</span>
                        </button>
                      ))}
                    </div>

                </div>              {/* ── close nav area ── */}
              </div>                {/* ── close stats card overlay ── */}
            </div>                {/* ── close map wrapper ── */}
          </div>

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
                  {/* ⚡ 你擁有的能量 + 🥚 蛋 */}
                  <div className="section" style={{marginBottom:8, flexShrink:0}}>
                    <div className="section-header">
                      <span className="section-title">⚡ 你擁有的能量</span>
                      {eggs.length > 0 && <span className="section-count">🥚 ×{eggs.length}</span>}
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
                      {/* 🥚 蛋 card grid — inside energy card */}
                      {eggs.length > 0 && (
                        <>
                          <div style={{height:1, background:'rgba(255,255,255,0.06)', margin:'8px 0 6px'}} />
                          <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:6}}>
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
                                      <div style={{fontSize:28, animation:'pulse 0.5s ease-in-out infinite', marginBottom:6}}>✨</div>
                                      <div style={{fontSize:9, color:'#f59e0b', fontWeight:700}}>孵化中...</div>
                                    </>
                                  ) : (
                                    <>
                                      <div style={{fontSize:32, marginBottom:4}}>🥚</div>
                                      <div style={{
                                        fontSize:7, fontWeight:700, color:PC[egg.rarity],
                                        background:`${PC[egg.rarity]}18`,
                                        display:'inline-block', padding:'1px 8px', borderRadius:3,
                                      }}>
                                        {RARITY_LABELS[egg.rarity]}
                                      </div>
                                      <div style={{fontSize:8, color:'#5a6d85', marginTop:4}}>點擊孵化</div>
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                      {eggs.length === 0 && (
                        <>
                          <div style={{height:1, background:'rgba(255,255,255,0.06)', margin:'8px 0 6px'}} />
                          <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:6}}>
                            {[1,2,3].map(i => (
                              <div key={`empty-egg-${i}`}
                                className="pet-card"
                                style={{
                                  borderColor: 'rgba(255,255,255,0.08)',
                                  padding: '12px 4px',
                                  opacity:0.4,
                                }}>
                                <div style={{fontSize:32, marginBottom:4, filter:'grayscale(0.6)'}}>🥚</div>
                                <div style={{
                                  fontSize:7, fontWeight:700, color:'#5a6d85',
                                  display:'inline-block', padding:'1px 8px', borderRadius:3,
                                  background:'rgba(255,255,255,0.04)',
                                }}>
                                  蛋槽 {i}
                                </div>
                                <div style={{fontSize:8, color:'#3a4a5a', marginTop:4}}>行路獲得</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
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
                                <PixelPetCanvas key={pet.id} seed={parseInt(pet.speciesId)||1} rarity={pet.rarity} evolutionStage={pet.evolutionStage} size={1.8} animation="idle" noAnim />
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
                                <PixelPetCanvas key={p.id} seed={parseInt(p.speciesId)||1} rarity={p.rarity} evolutionStage={p.evolutionStage} size={1.6} animation="idle" noAnim />
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
                              <PixelPetCanvas key={p.id} seed={parseInt(p.speciesId)||1} rarity={p.rarity} evolutionStage={p.evolutionStage} size={2.2} animation="idle" noAnim />
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
                              <PixelPetCanvas key={p.id} seed={parseInt(p.speciesId)||1} rarity={p.rarity} evolutionStage={p.evolutionStage} size={2.2} animation="idle" noAnim />
                            </div>
                            <div style={{fontSize:7, color:'#94a5b8', fontWeight:600}}>Lv.{p.level}</div>
                            <div style={{fontSize:7, fontWeight:700, color:'#f59e0b'}}>⚡{formatSteps(p.price)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section: Property Market */}
                  <div className="section" style={{marginBottom:10}}>
                    <div className="section-header">
                      <span className="section-title">🏠 地皮市集</span>
                      <span className="section-count">{listedProperties.length}塊</span>
                    </div>
                    {listedProperties.length === 0 ? (
                      <div className="card" style={{padding:'14px 16px', textAlign:'center'}}>
                        <div style={{fontSize:11, color:'#5a6d85'}}>
                          市集暫時未有地皮出售
                        </div>
                      </div>
                    ) : (
                      <div className="prop-grid" style={{gap:8}}>
                        {listedProperties
                          .map(prop => {
                            const name = `${prop.cellRow+1}區 ${prop.cellCol+1}號`
                            const zoneIdx = getZoneIdx(prop.cellRow, prop.cellCol)
                            const colors = ['#8b5cf6', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444', '#3b82f6']
                            const color = colors[zoneIdx]
                            const sellPrice = prop.listPrice ?? prop.price
                            const isOwn = user && prop.userId === user.id
                            return (
                              <div key={prop.id} className="pet-card" style={{
                                borderColor: isOwn ? '#22c55e44' : `${color}44`,
                                padding:'10px 4px 8px', cursor:'pointer',
                                opacity: isOwn ? 0.7 : 1,
                              }} onClick={() => {
                                  setDetailProperty(prop)
                              }}>
                                <div style={{position:'absolute', top:0, left:0, right:0, height:2,
                                  background: isOwn ? '#22c55e' : color,
                                  borderRadius:'14px 14px 0 0'}} />
                                <div style={{fontSize:24, marginBottom:2}}>{isOwn ? '✅' : '🏠'}</div>
                                <div style={{fontSize:9, fontWeight:700, color: isOwn ? '#22c55e' : color,
                                  textTransform:'uppercase', letterSpacing:'0.5px'}}>{name}</div>
                                <div style={{fontSize:6, color:'#94a5b8', marginTop:1, lineHeight:1.2}}>
                                  {prop.locationName ? prop.locationName.replace('📍 ','') : '🔍 載入地段…'}
                                </div>
                                <div style={{fontSize:7, color:'#5a6d85', marginTop:2}}>
                                  {isOwn ? '👤 你擁有' : (prop.sellerName ? `👤 ${prop.sellerName}` : '由賣家出售')}
                                </div>
                                <div style={{fontSize:8, fontWeight:700, color:'#f59e0b', marginTop:1}}>
                                  ⚡{formatSteps(sellPrice)}
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>

                </>
              )}

            </div>
          )}

          {/* ════ INVENTORY TAB ════ */}
          {tab === 'inventory' && user && (
            <div className="fade-up" style={{paddingBottom: 20}}>
              <div className="section-header">
                <span className="section-title">🎒 背包</span>
                <span className="section-count">
                  {inventory.filter((i: any) => i.itemType === 'help').length}道具 · {inventory.filter((i: any) => i.itemType === 'equipment').length}裝備
                </span>
              </div>

              {inventory.length === 0 ? (
                <div className="card empty-state">
                  <div className="empty-icon">📭</div>
                  <div className="empty-text">未有物品 — 行路探索拎道具啦！</div>
                </div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:8, padding:'0 4px'}}>
                  {(() => {
                    const items = inventory.map((e: any) => {
                      const def = e.itemType === 'help'
                        ? HELP_ITEM_POOL.find(d => d.id === e.itemId)
                        : EQUIPMENT_POOL.find(d => d.id === e.itemId)
                      return { ...e, def }
                    }).filter((x: any) => x.def)

                    return items.map((item: any, i: number) => {
                      const def = item.def
                      const isHelp = 'effect' in def
                      const rarColor = def.rarity ? (RARITY_COLORS[def.rarity as Rarity] || '#9ca3af') : '#9ca3af'
                      return (
                        <div key={item.itemId + i} style={{
                          background: '#141b2d', border: `1px solid ${rarColor}22`, borderRadius: 14,
                          padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: `${rarColor}15`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, flexShrink: 0,
                          }}>
                            {def.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8' }}>{def.name}</span>
                              <span style={{ fontSize: 8, color: rarColor, fontWeight: 600 }}>
                                {RARITY_LABELS[def.rarity as Rarity] || ''}
                              </span>
                            </div>
                            <div style={{ fontSize: 10, color: '#5a6d85', marginTop: 1, lineHeight: 1.3 }}>
                              {def.description || ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            {item.quantity > 1 && (
                              <span style={{ fontSize: 10, color: '#94a5b8' }}>x{item.quantity}</span>
                            )}
                            {isHelp ? (
                              <button onClick={() => { useHelpItem(def); setTab('map') }}
                                style={{
                                  fontSize: 8, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                                  border: '1px solid #22c55e44', background: 'rgba(34,197,94,0.12)',
                                  color: '#22c55e', cursor: 'pointer', fontFamily: 'inherit',
                                }}>
                                使用
                              </button>
                            ) : (
                              <button onClick={() => setDetailPetId(pets[0]?.id)}
                                style={{
                                  fontSize: 8, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                                  border: '1px solid #3b82f644', background: 'rgba(59,130,246,0.12)',
                                  color: '#3b82f6', cursor: 'pointer', fontFamily: 'inherit',
                                }}>
                                裝備
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ════ PROPERTIES TAB ════ */}
          {tab === 'properties' && (
            <div className="fade-up">
              <div className="section-header">
                <span className="section-title">🏠 地產</span>
                <span className="section-count">{properties.length}塊</span>
                <button onClick={() => setCompactProps(v => !v)}
                  style={{
                    marginLeft:'auto', fontSize:10, fontWeight:600,
                    padding:'3px 10px', border:'1px solid #8b5cf644',
                    borderRadius:20, background:'rgba(139,92,246,0.08)',
                    color:'#a78bfa', cursor:'pointer', fontFamily:'inherit',
                    whiteSpace:'nowrap', lineHeight:1.3,
                  }}>
                  {compactProps ? '📜 細卡' : '📜 大卡'}
                </button>
              </div>
              {!user ? (
                <div className="card empty-state">
                  <div className="empty-icon">🔑</div>
                  <div className="empty-text">需要登入先可以購買地皮</div>
                </div>
              ) : properties.length === 0 ? (
                <div className="card empty-state">
                  <div className="empty-icon">🏠</div>
                  <div className="empty-text">未擁有任何地皮</div>
                  <div style={{fontSize:10, color:'#5a6d85', marginTop:4}}>
                    喺地圖點擊格仔即可佔領（25 步）
                  </div>
                </div>
              ) : (
                <div className={`${compactProps ? 'prop-grid' : 'pet-grid'}`} style={{gap: compactProps ? 8 : 6}}>
                  {properties.map(prop => {
                    const name = `${prop.cellRow+1}區 ${prop.cellCol+1}號`
                    const zoneIdx = getZoneIdx(prop.cellRow, prop.cellCol)
                    const colors = ['#8b5cf6', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444', '#3b82f6']
                    const color = colors[zoneIdx]
                    const zoneNames = ['紫晶區', '翠綠區', '琥珀區', '碧藍區', '赤紅區', '湛藍區']
                    const isListed = prop.isListed
                    return (
                      <div key={prop.id}
                        className="pet-card"
                        onClick={() => setDetailProperty(prop)}
                        style={{
                          borderColor: `${color}44`,
                          padding: '8px 4px 6px',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                        }}>
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                          background: color,
                        }} />
                        <div style={{fontSize: 18, lineHeight: 1.2, marginBottom: 1}}>🏠</div>
                        <div style={{
                          fontSize: 9, fontWeight: 700, color,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          lineHeight: 1.3,
                        }}>{name}</div>
                        <div style={{
                          fontSize: 7, color: '#5a6d85', marginTop: 1,
                        }}>{zoneNames[zoneIdx]}</div>
                        <div style={{
                          fontSize: 8, fontWeight: 600, color: '#94a5b8', marginTop: 1,
                        }}>⚡{formatSteps(prop.price)}</div>
                        {isListed && (
                          <div style={{
                            fontSize: 6, color: '#22c55e', fontWeight: 700, marginTop: 1,
                          }}>📌 上架中</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          </>
          )}

        </div>
      </div>

      {/* ════ BOTTOM NAV (hidden on map tab — integrated into steps card) ════ */}
      <div className="bottom-nav" style={{ display: tab === 'map' ? 'none' : '' }}>
        <div className="nav-bar">
          <div className="nav-grid">
            {([
              { k: 'map' as Tab, icon: '🗺️', label: '地圖' },
              { k: 'pets' as Tab, icon: '🐾', label: '寵物' },
              { k: 'properties' as Tab, icon: '🏠', label: '地產' },
              { k: 'community' as Tab, icon: '🏪', label: '社群' },
              { k: 'inventory' as Tab, icon: '🎒', label: '背包' },
            ]).map(t => (
              <button key={t.k} className={`nav-btn ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)}>
                <span className={`nav-icon ${tab === t.k ? 'active' : ''}`}>{t.icon}</span>
                <span className={`nav-label ${tab === t.k ? 'active' : 'inactive'}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <ModalPortal>
      <NotificationModal
        open={showNotifications}
        onClose={() => { setShowNotifications(false); if (user) fetch(`/api/notifications?userId=${user.id}`).then(r => r.json()).then(d => setNotifUnread((d.notifications ?? []).filter((n: any) => !n.read).length)).catch(() => {}) }}
        userId={user?.id ?? null}
      />
      </ModalPortal>

      <ModalPortal>
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
      </ModalPortal>

      <ModalPortal>
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
      </ModalPortal>

      <ModalPortal>
      {showInventory && (
        <InventoryModal
          inventory={inventory}
          onUseHelpItem={useHelpItem}
          onEquipItem={handleEquipItem}
          onClose={() => setShowInventory(false)}
        />
      )}
      </ModalPortal>

      <ModalPortal>
      {/* ════ Pet detail modal ── */}
      {detailPetId && (() => {
        const detailPet = pets.find(p => p.id === detailPetId) ?? marketListings.find(p => p.id === detailPetId)
        if (!detailPet) return null
        const isMarketView = isMarketPet(detailPet.id)
        const isOwnPet = user ? detailPet.userId === user.id : false
        // Compute available equipment (items not currently equipped on this pet)
        const equippedIds = new Set(petEquipment.map(e => e.equipmentId))
        const availEquip = EQUIPMENT_POOL.filter(d =>
          inventory.some((i: any) => i.itemId === d.id && i.itemType === 'equipment')
          && !equippedIds.has(d.id)
        )
        return (
          <PetDetailModal
            pet={detailPet}
            totalSteps={totalSteps}
            onClose={() => { setDetailPetId(null); setMarketSellerId(null) }}
            onEvolve={() => { setDetailPetId(null); setActiveIdx(pets.indexOf(detailPet)); setShowEvolve(true) }}
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
            }}
            equipment={petEquipment}
            onUnequip={handleUnequip}
            onEquipToSlot={handleEquipToSlot}
            availableEquipment={availEquip}
            hasInventory={inventory.some((i: any) => i.itemType === 'equipment')}
            onOpenInventory={() => setShowInventory(true)}
            onList={user && isOwnPet ? handleList : undefined}
            onUnlist={user && isOwnPet ? handleUnlist : undefined}
            onBuy={user && isMarketView && !isOwnPet ? handleBuy : undefined}
            isMarket={isMarketView && !isOwnPet}
            sellerId={marketSellerId ?? undefined}
            currentUserId={user?.id}
          />
        )
      })()}
      </ModalPortal>

      <ModalPortal>
      {showEvolve && pet && canEvolve && (
        <div className="fixed-modal-layer" style={{
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
                  size={4}
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
      </ModalPortal>

      <ModalPortal>
      {/* ════ Roguelike event ── */}
      {currentEvent && (
        <EventModal
          event={currentEvent}
          onChoose={handleEventChoice}
          onDismiss={() => setCurrentEvent(null)}
        />
      )}
      </ModalPortal>

      <ModalPortal>
      {/* ════ New Pet Popup (after hatching) ════ */}
      {newPetId && (() => {
        const newPet = pets.find(p => p.id === newPetId)
        if (!newPet) return null
        return (
          <div className="fixed-modal-layer-top" style={{
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
      </ModalPortal>

      {/* ════ Egg Found Popup ════ */}
      <ModalPortal>
      {eggFoundData && (() => {
        const { type, rarity } = eggFoundData
        const eggName = type === 'cat' ? '圓貓蛋' : '柴犬蛋'
        const eggEmoji = type === 'cat' ? '🐱' : '🐶'
        return (
          <div className="fixed-modal-layer" style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)',
            padding:16,
          }} onClick={dismissEggFound}>
            <div style={{
              background:'#141b2d', border:`1px solid ${RARITY_COLORS[rarity]}44`,
              borderRadius:24, padding:28, maxWidth:300, width:'100%', textAlign:'center',
            }} onClick={e => e.stopPropagation()}>
              <div style={{fontSize:48, marginBottom:8}}>🥚</div>
              <div style={{fontSize:10, color:'#5a6d85', marginBottom:4, letterSpacing:2, textTransform:'uppercase'}}>
                🚶 行路發現新蛋！
              </div>
              <div style={{fontSize:14, fontWeight:700, color:'#f0f4f8', marginBottom:4}}>
                {eggName}
              </div>
              <div className="pet-badge" style={{
                display:'inline-block',
                color:RARITY_COLORS[rarity],
                background:RARITY_COLORS[rarity]+'18',
                fontSize:10, fontWeight:700,
                padding:'3px 14px', borderRadius:10,
                marginBottom:16,
              }}>
                {RARITY_LABELS[rarity]}
              </div>
              <div style={{fontSize:11, color:'#94a5b8', marginBottom:20}}>
                {eggEmoji} 行路途中發現咗 {eggName}！快啲去孵化啦！
              </div>
              <div style={{display:'flex', gap:8, justifyContent:'center'}}>
                <button onClick={dismissEggFound}
                  style={{
                    padding:'8px 20px', borderRadius:16, border:'1px solid #2a3a5a',
                    background:'transparent', color:'#94a5b8',
                    fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  }}>
                  收埋
                </button>
                <button onClick={goToEggsFromPopup}
                  style={{
                    padding:'8px 24px', borderRadius:16, border:'none',
                    background:'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                    color:'white', fontSize:12, fontWeight:700, cursor:'pointer',
                    fontFamily:'inherit',
                  }}>
                  🥚 去寵物頁孵化
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      </ModalPortal>

      {/* ════ Alert Modal (replaces toast) ════ */}
      <ModalPortal>
      {alertModal && (
        <div className="fixed-modal-layer" style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)',
          padding:16,
        }} onClick={() => setAlertModal(null)}>
          <div style={{
            background:'#141b2d', border:`1px solid ${
              alertModal.type === 'success' ? '#22c55e44' : alertModal.type === 'error' ? '#ef444444' : '#8b5cf644'
            }`,
            borderRadius:24, padding:28, maxWidth:300, width:'100%', textAlign:'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{fontSize:40, marginBottom:8}}>
              {alertModal.type === 'success' ? '✅' : alertModal.type === 'error' ? '❌' : 'ℹ️'}
            </div>
            <div style={{fontSize:13, color:'#f0f4f8', fontWeight:600, lineHeight:1.5, whiteSpace:'pre-wrap'}}>
              {alertModal.message}
            </div>
            <button onClick={() => setAlertModal(null)} style={{
              marginTop:16, padding:'8px 28px', border:'1px solid #2a3a5a',
              borderRadius:14, background:'transparent', color:'#94a5b8',
              fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
            }}>
              關閉
            </button>
          </div>
        </div>
      )}
      </ModalPortal>

      {/* ════ Confirm Modal (replaces native confirm) ════ */}
      <ModalPortal>
      {confirmModal && (
        <div className="fixed-modal-layer" style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)',
          padding:16,
        }} onClick={() => { setConfirmModal(null); confirmModal.onCancel?.() }}>
          <div style={{
            background:'#141b2d', border:'1px solid #8b5cf644',
            borderRadius:24, padding:28, maxWidth:300, width:'100%', textAlign:'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{fontSize:40, marginBottom:8}}>⚠️</div>
            <div style={{fontSize:13, color:'#f0f4f8', fontWeight:600, marginBottom:16, whiteSpace:'pre-wrap'}}>
              {confirmModal.message}
            </div>
            <div style={{display:'flex', gap:8}}>
              <button onClick={() => { setConfirmModal(null); confirmModal.onCancel?.() }} style={{
                flex:1, padding:'8px 0', border:'1px solid #2a3a5a', borderRadius:14,
                background:'transparent', color:'#5a6d85',
                fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              }}>
                取消
              </button>
              <button onClick={async () => {
                if ((window as any).__processingConfirm) return
                ;(window as any).__processingConfirm = true
                setConfirmModal(null)
                await confirmModal.onConfirm()
                ;(window as any).__processingConfirm = false
              }} style={{
                flex:1, padding:'8px 0', border:'none', borderRadius:14,
                background: (window as any).__processingConfirm ? '#4a3a6d' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                color:'white', fontSize:12, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
                opacity: (window as any).__processingConfirm ? 0.5 : 1,
              }}>
                {(window as any).__processingConfirm ? '⏳ 處理中...' : '確定'}
              </button>
            </div>
          </div>
        </div>
      )}
      </ModalPortal>

      {/* ════ Buy Confirmation Modal (from map grid) ════ */}
      {buyConfirm && (() => {
        const {row, col, anchorLat, anchorLng} = buyConfirm
        const name = `第${row+1}區 ${col+1}號`
        const zoneIdx = getZoneIdx(row, col)
        const colors = ['#8b5cf6', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444', '#3b82f6']
        const color = colors[zoneIdx]
        return (
          <div className="fixed-modal-layer" style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)',
            padding:16,
          }} onClick={() => setBuyConfirm(null)}>
            <div style={{
              background:'#141b2d', border:`2px solid ${color}66`,
              borderRadius:24, padding:24, maxWidth:320, width:'100%',
            }} onClick={e => e.stopPropagation()}>
              <div style={{textAlign:'center', marginBottom:16}}>
                <div style={{fontSize:36, marginBottom:4}}>🏠</div>
                <div style={{fontSize:14, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.5px'}}>{name}</div>
                <div style={{fontSize:9, color:'#5a6d85', marginTop:4}}>確認購買地皮</div>
              </div>
              <div style={{background:'#0f1729', borderRadius:12, padding:12, marginBottom:16}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}>
                  <span style={{fontSize:9, color:'#5a6d85'}}>價格</span>
                  <span style={{fontSize:13, color:'#f59e0b', fontWeight:800}}>⚡25</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <span style={{fontSize:9, color:'#5a6d85'}}>你嘅步數</span>
                  <span style={{fontSize:11, color:'#f0f4f8', fontWeight:600}}>👣 {formatSteps(totalSteps)}</span>
                </div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <button onClick={() => setBuyConfirm(null)} style={{
                  flex:1, padding:'10px 0', border:'1px solid #2a3a5a', borderRadius:14,
                  background:'transparent', color:'#5a6d85',
                  fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                }}>
                  取消
                </button>
                <button onClick={async () => {
                  if (buyingCell) return
                  if (!user) { showAlert('❌ 需要登入', 'error'); setBuyConfirm(null); return }
                  setBuyingCell(true)
                  try {
                    const res = await fetch('/api/properties', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: user.id, anchorLat, anchorLng, cellRow: row, cellCol: col, price: 25 }),
                    })
                    const data = await res.json()
                    if (data.success) {
                      const newSteps = totalSteps - 25
                      setTotalSteps(newSteps)
                      await updateTotalSteps(user.id, newSteps)
                      showAlert(`🏠 佔領地皮成功！ ${name}`)
                      loadUserProperties()
                    } else {
                      showAlert(`❌ ${data.error || '佔領失敗'}`, 'error')
                    }
                  } catch { showAlert('❌ 網絡錯誤', 'error') }
                  setBuyingCell(false)
                  setBuyConfirm(null)
                }} style={{
                  flex:1, padding:'10px 0', border:'none', borderRadius:14,
                  background: buyingCell ? '#4a3a6d' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                  color:'white', fontSize:12, fontWeight:700,
                  cursor: buyingCell ? 'not-allowed' : 'pointer', fontFamily:'inherit',
                  opacity: buyingCell ? 0.5 : 1,
                }}>
                  {buyingCell ? '⏳ 處理中...' : '✅ 確認佔領'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ════ Property Detail Modal ════ */}
      {detailProperty && (
        <ModalPortal key={detailProperty.id}>
          <PropertyModalContent
            p={detailProperty}
            user={user}
            totalSteps={totalSteps}
            setDetailProperty={setDetailProperty}
            setConfirmModal={setConfirmModal}
            showAlert={showAlert}
            loadUserProperties={loadUserProperties}
            loadListedProperties={loadListedProperties}
            formatSteps={formatSteps}
            getZoneIdx={getZoneIdx}
            detailLocName={detailLocName}
            listProperty={listProperty}
            unlistProperty={unlistProperty}
            sellProperty={sellProperty}
            updateTotalSteps={updateTotalSteps}
            setTotalSteps={setTotalSteps}
          />
        </ModalPortal>
      )}

    </div>
  )
}

/* ── Property Detail Modal Content (Monopoly deed) ── */
function PropertyModalContent({
  p, user, totalSteps, setDetailProperty, setConfirmModal, showAlert,
  loadUserProperties, loadListedProperties, formatSteps, getZoneIdx,
  detailLocName, listProperty, unlistProperty, sellProperty, updateTotalSteps, setTotalSteps,
}: {
  p: any; user: any; totalSteps: number;
  setDetailProperty: (v: any) => void; setConfirmModal: (v: any) => void;
  showAlert: (m: string, t?: 'success' | 'error' | 'info') => void;
  loadUserProperties: () => void; loadListedProperties: () => void;
  formatSteps: (n: number) => string; getZoneIdx: (r: number, c: number) => number;
  detailLocName: string | null;
  listProperty: Function;
  unlistProperty: Function;
  sellProperty: Function;
  updateTotalSteps: Function;
  setTotalSteps: (n: number) => void;
}) {
  const name = `第${p.cellRow+1}區 ${p.cellCol+1}號`
  const zoneIdx = getZoneIdx(p.cellRow, p.cellCol)
  const colors = ['#8b5cf6', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444', '#3b82f6']
  const color = colors[zoneIdx]
  const zoneNames = ['紫晶區', '翠綠區', '琥珀區', '碧藍區', '赤紅區', '湛藍區']
  const sellPrice = p.listPrice ?? p.price
  const isOwn = user && p.userId === user.id
  return (
    <div className="fixed-modal-layer" style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)',
      padding:16,
    }} onClick={() => setDetailProperty(null)}>
      <div style={{
        background:'#0f1729', border:`2px solid ${color}66`,
        borderRadius:12, width:300, maxWidth:'100%',
        position:'relative', overflow:'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* ── Monopoly deed header ── */}
        <div style={{
          background: color,
          padding: '20px 16px 14px',
          textAlign: 'center',
        }}>
          <div style={{fontSize:28, lineHeight:1, marginBottom:6}}>🏠</div>
          <div style={{
            fontSize:16, fontWeight:800, color:'#fff',
            letterSpacing:1,
          }}>{name}</div>
          <div style={{
            fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.7)',
            textTransform:'uppercase', letterSpacing:2, marginTop:4,
          }}>{zoneNames[zoneIdx]} · 地段</div>
        </div>

        {/* ── Deed body ── */}
        <div style={{padding:'14px 16px 16px'}}>

          {/* Location */}
          <div className="prop-modal-row">
            <span className="prop-modal-label">📍 地段</span>
            <span className="prop-modal-value">
              {detailLocName ? detailLocName.replace('📍 ','') : '🔍 載入中…'}
            </span>
          </div>

          {/* Price */}
          <div className="prop-modal-row">
            <span className="prop-modal-label">⚡ 價格</span>
            <span className="prop-modal-value" style={{color:'#f59e0b', fontWeight:800}}>
              {formatSteps(sellPrice)} 步
            </span>
          </div>

          {/* Purchase date */}
          <div className="prop-modal-row">
            <span className="prop-modal-label">📅 購入</span>
            <span className="prop-modal-value">{new Date(p.purchasedAt).toLocaleDateString('zh-HK')}</span>
          </div>

          {/* Coordinates */}
          <div className="prop-modal-row">
            <span className="prop-modal-label">🌐 座標</span>
            <span className="prop-modal-value">{p.anchorLat.toFixed(4)}, {p.anchorLng.toFixed(4)}</span>
          </div>

          {/* Seller */}
          <div className="prop-modal-row" style={{borderBottom:'none'}}>
            <span className="prop-modal-label">👤 賣家</span>
            <span className="prop-modal-value">{p.sellerName ? p.sellerName : '匿名賣家'}</span>
          </div>

          {/* Listed status badge */}
          {p.isListed && (
            <div style={{
              textAlign:'center', marginTop:10,
              fontSize:9, color:'#22c55e', fontWeight:700,
              padding:'4px 0', borderTop:'1px solid #1a2a3a',
            }}>
              📌 上架中 · ⚡{formatSteps(p.listPrice ?? 0)} 步
            </div>
          )}

          {/* ── Actions (all uniform full-width) ── */}
          <div style={{marginTop:14, display:'flex', flexDirection:'column', gap:6}}>
            {isOwn ? (
              <>
                {!p.isListed ? (
                  <button onClick={() => {
                    const priceStr = window.prompt('設定售價（步）：', '500')
                    if (!priceStr) return
                    const price = parseInt(priceStr)
                    if (isNaN(price) || price <= 0) { showAlert('❌ 請輸入有效價格', 'error'); return }
                    setDetailProperty(null)
                    listProperty(p.id, price).then((err: any) => {
                      if (err) { showAlert(`❌ 上架失敗: ${err}`, 'error'); return }
                      showAlert(`📌 ${name} 已上架，售價 ⚡${formatSteps(price)}`)
                      loadUserProperties()
                      loadListedProperties()
                    })
                  }} style={{
                    width:'100%', padding:'7px 0',
                    border:'1px solid #22c55e44', borderRadius:10,
                    background:'rgba(34,197,94,0.1)',
                    color:'#22c55e', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  }}>
                    📌 上架出售
                  </button>
                ) : (
                  <button onClick={async () => {
                    const err = await unlistProperty(p.id)
                    if (err) { showAlert(`❌ 下架失敗: ${err}`, 'error'); return }
                    showAlert(`📭 ${name} 已下架`)
                    loadUserProperties()
                    loadListedProperties()
                    setDetailProperty(null)
                  }} style={{
                    width:'100%', padding:'7px 0',
                    border:'1px solid #f59e0b44', borderRadius:10,
                    background:'rgba(245,158,11,0.1)',
                    color:'#f59e0b', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  }}>
                    📭 下架
                  </button>
                )}
                <button onClick={() => {
                  setConfirmModal({
                    message: '確定放棄此地？(唔會拎返步數)',
                    onConfirm: async () => {
                      const err = await sellProperty(p.id)
                      if (err) { showAlert(`❌ 放棄失敗: ${err}`, 'error'); return }
                      showAlert(`🏚️ 已放棄 ${name}`)
                      loadUserProperties()
                      loadListedProperties()
                      setDetailProperty(null)
                    },
                  })
                }} style={{
                  width:'100%', padding:'7px 0',
                  border:'1px solid #ef444444', borderRadius:10,
                  background:'rgba(239,68,68,0.1)',
                  color:'#ef4444', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                }}>
                  🗑️ 放棄
                </button>
              </>
            ) : user && user.id !== p.userId ? (
              <button onClick={() => {
                if (!user) { showAlert('❌ 需要登入', 'error'); return }
                if (totalSteps < sellPrice) { showAlert(`❌ 步驟不足！需要 ${sellPrice} 步`, 'error'); return }
                setConfirmModal({
                  message: `確定用 ⚡${formatSteps(sellPrice)} 購買 ${name}？`,
                  onConfirm: async () => {
                    try {
                      const res = await fetch('/api/properties/transfer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ propertyId: p.id, buyerId: user!.id }),
                      })
                      const data = await res.json()
                      if (data.success) {
                        const newSteps = totalSteps - sellPrice
                        setTotalSteps(newSteps)
                        await updateTotalSteps(user.id, newSteps)
                        showAlert(`🏠 成功購買 ${name}！`)
                        loadListedProperties()
                        loadUserProperties()
                        setDetailProperty(null)
                      } else {
                        showAlert(`❌ ${data.error || '購買失敗'}`, 'error')
                      }
                    } catch { showAlert('❌ 網絡錯誤', 'error') }
                  },
                })
              }} style={{
                width:'100%', padding:'7px 0',
                border:'1px solid #a855f744', borderRadius:10,
                background:'linear-gradient(135deg,#8b5cf644,#7c3aed44)',
                color:'#c084fc', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              }}>
                ⚡ 購買地皮
              </button>
            ) : null}

            {/* Navigate to map */}
            <button onClick={() => {
              setDetailProperty(null)
              ;(window as any).__pipzFlyToProperty?.(p.anchorLat, p.anchorLng, p.cellRow, p.cellCol)
            }} style={{
              width:'100%', padding:'7px 0',
              border:'1px solid #3b82f644', borderRadius:10,
              background:'transparent', color:'#60a5fa',
              fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
            }}>
              🗺️ 在地圖上顯示
            </button>

            {/* Cancel */}
            <button onClick={() => setDetailProperty(null)} style={{
              width:'100%', padding:'7px 0',
              border:'1px solid #2a3a5a', borderRadius:10,
              background:'transparent', color:'#5a6d85',
              fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
            }}>
              關閉
            </button>
          </div>
        </div>
      </div>

      {/* Monster modal is rendered via direct DOM in monsterEncountered callback */}
      {/* This placeholder stays empty - the DOM modal takes over */}
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