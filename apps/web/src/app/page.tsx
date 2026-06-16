'use client'

import { useState, useEffect, useRef } from 'react'
import { FIRST_PET_STEPS, ENCOUNTER_INTERVAL, rollEncounter, generateStats, Rarity, Mood, Pet, PetStatus, formatSteps } from '@pipz/core'
import { RARITY_COLORS, RARITY_LABELS } from '@pipz/core'
import PixelPet from '../components/PixelPet'

function genId() { return Math.random().toString(36).substring(2, 10) }

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
  const [encFlash, setEncFlash] = useState(false)
  const [debugCount, setDebugCount] = useState(0)

  const wid = useRef<number|null>(null)
  const last = useRef<{lat:number;lng:number}|null>(null)
  const encCnt = useRef(0)
  const pity = useRef<Record<string,number>>({legendary:0,epic:0})

  const pet = pets[activeIdx] ?? null
  const cp = (p: Pet) => p.stats.speed + p.stats.luck + p.stats.charm + p.stats.energy
  const xpMax = (p: Pet) => p.level * 50
  const xpPct = (p: Pet) => Math.min(100, (p.xp / xpMax(p)) * 100)
  const nearby = pets.length > 0 ? pets.slice(-4).reverse() : []

  useEffect(() => { setReady(true) }, [])

  const logMsg = (m: string) => setLog(v => [m, ...v].slice(0, 8))

  // ── Walk ──
  const walkStart = () => {
    if (!navigator.geolocation) return logMsg('❌ 唔支援 GPS')
    setWalking(true); setPetAnim('walk'); logMsg('🚶 開始行路！')
    wid.current = navigator.geolocation.watchPosition(
      pos => {
        if (pos.coords.accuracy > 100) return
        if (last.current) {
          const d = haversine(last.current.lat, last.current.lng, pos.coords.latitude, pos.coords.longitude)
          const ns = Math.floor(d * 1300)
          if (ns > 0) { addSt(ns) }
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

  const spawnPet = (r: Rarity) => {
    const np: Pet = {
      id: genId(), userId: 'local', name: '',
      speciesId: genId(), imageUrl: '',
      rarity: r, level: 1, xp: 0, totalSteps: 0, evolutionStage: 1,
      status: PetStatus.Baby,
      stats: generateStats(r, 1), mood: Mood.Happy, moodValue: 100,
      lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
      isForSale: false, price: 0,
    }
    setPets(v => [...v, np]); setActiveIdx(pets.length)
  }

  const addSt = (n: number) => {
    setSteps(s => s + n); setTotalSteps(s => s + n)
    encCnt.current += n
    if (pets.length === 0 && totalSteps + n >= FIRST_PET_STEPS) { setShowEgg(true); return }
    if (encCnt.current >= ENCOUNTER_INTERVAL) {
      const r = rollEncounter(encCnt.current, pity.current)
      if (r) {
        encCnt.current = 0
        if (r === Rarity.Legendary) pity.current.legendary = 0
        if (r === Rarity.Epic) pity.current.epic = 0
        spawnPet(r)
        setEncFlash(true); setTimeout(() => setEncFlash(false), 1800)
        logMsg(`🐾 遇見 ${RARITY_LABELS[r]}！`)
      }
    }
  }

  const addDebug = () => {
    setDebugCount(d => d + 1)
    addSt(500)
  }

  const feed = () => {
    if (!pet) return
    setPets(v => v.map((p,i) => i === activeIdx ? {...p, mood: Mood.Happy, moodValue: 100, lastFedAt: Date.now(), xp: p.xp + 10} : p))
    setPetAnim('happy'); logMsg('🍖 餵食咗！+10XP'); setTimeout(() => setPetAnim('idle'), 1500)
  }
  const petAction = () => {
    if (!pet) return
    setPetAnim('happy'); setPets(v => v.map((p,i) => i === activeIdx ? {...p, mood: Mood.Happy, moodValue: Math.min(100, p.moodValue + 15)} : p))
    logMsg('✋ 摸頭～'); setTimeout(() => setPetAnim('idle'), 1500)
  }
  const playAction = () => {
    if (!pet) return
    setPetAnim('happy'); setPets(v => v.map((p,i) => i === activeIdx ? {...p, mood: Mood.Excited, moodValue: Math.min(100, p.moodValue + 20), xp: p.xp + 5} : p))
    logMsg('🎾 玩緊！+5XP'); setTimeout(() => setPetAnim('idle'), 2000)
  }

  const hatch = () => {
    setHatching(true)
    setTimeout(() => {
      setHatching(false); setShowEgg(false)
      const np: Pet = {
        id: genId(), userId: 'local', name: '',
        speciesId: genId(), imageUrl: '',
        rarity: Rarity.Common, level: 1, xp: 0, totalSteps: 0,
        evolutionStage: 1, status: PetStatus.Baby,
        stats: generateStats(Rarity.Common, 1), mood: Mood.Happy, moodValue: 100,
        lastFedAt: Date.now(), lastInteractionAt: Date.now(), createdAt: Date.now(),
        isForSale: false, price: 0,
      }
      setPets(v => [...v, np]); setActiveIdx(pets.length)
      logMsg('🎉 孵化成功！')
    }, 2000)
  }

  useEffect(() => { return () => { if (wid.current !== null) navigator.geolocation.clearWatch(wid.current) } }, [])

  // ═══════ RENDER ═══════

  const TabBtn = ({ t, icon, label }: { t: Tab; icon: string; label: string }) => (
    <button onClick={() => setTab(t)}
      className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all ${tab === t ? 'bg-[#8b5cf6] text-white shadow-md shadow-purple-900/30' : 'text-[#5a6d85] hover:text-[#94a5b8]'}`}>
      <span className={`text-lg leading-none ${tab === t ? 'scale-110' : ''}`}>{icon}</span>
      <span className="text-[9px] font-bold mt-0.5">{label}</span>
    </button>
  )

  // ═══════ FIXED BOTTOM NAV LAYOUT ═══════

  return (
    <div className="h-dvh max-w-sm mx-auto overflow-hidden select-none relative" style={{background:'#0b1120', color:'#f0f4f8'}}>

      {/* Scrollable content area with padding for fixed nav */}
      <div className="h-full overflow-y-auto pb-[62px]">

        {/* ═══ TOP BAR ═══ */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 z-10" style={{background:'#0b1120'}}>
          <h1 className="text-lg font-extrabold tracking-tight"
            style={{background:'linear-gradient(135deg,#c084fc,#22d3ee)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>
            Pipz
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-[#5a6d85] text-xs">👣</span>
            <span className="text-sm font-bold">{ready ? formatSteps(totalSteps) : '0'}</span>
            {walking && <span className="flex items-center gap-1 text-[10px] text-[#22c55e] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse"/>GPS</span>}
          </div>
        </div>

        {/* ═══ MAIN ═══ */}
        <div className="px-3 space-y-2.5">

        {/* ── MAP TAB ── */}
        {tab === 'map' && <div className="fade-up space-y-2.5">

          {/* Pet Display Card */}
          <div className="card card-glow overflow-hidden" style={{minHeight: 200}}>
            {/* Encounter flash */}
            {encFlash && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1e1b4b]/90 fade-in" style={{borderRadius:16}}>
              <div className="text-center">
                <div className="text-4xl mb-1" style={{animation:'hatch-pop 0.5s ease-out'}}>✨</div>
                <p className="text-sm font-bold text-[#c084fc]">遇見新寵物！</p>
              </div>
            </div>}

            <div className="p-4 flex flex-col items-center justify-center min-h-[200px]">
              {!ready ? (
                <div className="text-center"><div className="text-4xl mb-2">🥚</div><p className="text-xs text-[#5a6d85]">載入中...</p></div>
              ) : showEgg ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  {hatching ? (
                    <div className="text-center py-4">
                      <div className="text-5xl mb-2" style={{animation:'hatch-pop 0.6s ease-out'}}>🥚</div>
                      <p className="text-sm text-[#8b5cf6] font-bold animate-pulse">孵化中...</p>
                      <div className="flex justify-center gap-2 mt-2">
                        {['✨','⭐','💫','🌟'].map((s,i) => <span key={i} className="text-lg animate-bounce" style={{animationDelay:`${i*0.15}s`}}>{s}</span>)}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-5xl egg-shake">🥚</div>
                      <p className="text-sm font-bold text-[#c084fc]">就快孵化！</p>
                      <p className="text-[10px] text-[#5a6d85]">❤️ 溫度剛剛好</p>
                      <button onClick={hatch} className="btn btn-primary mt-1">孵化 🐣</button>
                    </>
                  )}
                </div>
              ) : pet ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  {/* Pet + glow */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{background:`radial-gradient(circle,${PC[pet.rarity]}22,transparent 70%)`}}>
                      <div className={petAnim === 'walk' ? 'animate-bounce' : petAnim === 'happy' ? 'animate-pulse' : ''}>
                        <PixelPet color={PC[pet.rarity]} size={5} animation={petAnim} />
                      </div>
                    </div>
                  </div>
                  {/* Rarity + Level + CP */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold"
                      style={{color:RARITY_COLORS[pet.rarity], background:RARITY_COLORS[pet.rarity]+'18'}}>
                      {RARITY_LABELS[pet.rarity]}
                    </span>
                    <span className="text-[11px] text-[#5a6d85]">Lv.{pet.level}</span>
                    <span className="text-[11px] font-bold text-[#f59e0b]">CP {cp(pet)}</span>
                  </div>
                  {/* Stats row */}
                  <div className="flex gap-3 text-[10px] text-[#5a6d85]">
                    <span>⚡{pet.stats.speed}</span>
                    <span>🍀{pet.stats.luck}</span>
                    <span>💜{pet.stats.charm}</span>
                    <span>🔋{pet.stats.energy}</span>
                  </div>
                  {/* XP Bar */}
                  {pet.xp > 0 && <div className="w-36 mt-0.5">
                    <div className="flex justify-between text-[8px] text-[#5a6d85] mb-0.5"><span>EXP</span><span>{pet.xp}/{xpMax(pet)}</span></div>
                    <div className="progress-bar"><div className="progress-fill" style={{width:`${xpPct(pet)}%`}}/></div>
                  </div>}
                  {/* Mood */}
                  <div className="flex items-center gap-1">
                    <span>{ME[pet.mood] || '😐'}</span>
                    <span className="text-[10px] text-[#22c55e] font-medium">{pet.mood === 'happy' ? '開心' : pet.mood}</span>
                  </div>
                  {/* Interactions */}
                  <div className="flex gap-2 mt-1">
                    <button onClick={feed} className="btn btn-green">🍖餵食</button>
                    <button onClick={petAction} className="btn btn-blue">✋摸頭</button>
                    <button onClick={playAction} className="btn btn-amber">🎾玩</button>
                  </div>
                </div>
              ) : (
                /* Empty state - egg */
                <div className="flex flex-col items-center gap-2">
                  <div className="text-5xl">🥚</div>
                  <p className="text-sm font-medium text-[#94a5b8]">未有寵物</p>
                  <div className="w-44 mt-1">
                    <div className="flex justify-between text-[10px] text-[#5a6d85] mb-1">
                      <span>孵化進度</span>
                      <span>{formatSteps(totalSteps)}/{formatSteps(FIRST_PET_STEPS)}</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(100,(totalSteps/FIRST_PET_STEPS)*100)}%`}}/></div>
                    <p className="text-[10px] text-[#5a6d85] text-center mt-1.5">行 1,000 步孵化第一隻寵物</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Steps + Walk Button */}
          <div className="card p-3">
            <div className="flex items-center justify-between">
              {/* Today */}
              <div className="text-center min-w-[60px]">
                <div className="text-xl font-bold">{ready ? formatSteps(steps) : '0'}</div>
                <div className="text-[9px] text-[#5a6d85] uppercase tracking-wider">今日</div>
              </div>

              {/* Walk button */}
              <div className="relative">
                <button onClick={walking ? walkStop : walkStart}
                  className={`walk-btn ${walking ? 'active' : ''}`}>
                  {walking ? '⏹' : '🚶'}
                </button>
              </div>

              {/* Total */}
              <div className="text-center min-w-[60px]">
                <div className="text-xl font-bold">{ready ? formatSteps(totalSteps) : '0'}</div>
                <div className="text-[9px] text-[#5a6d85] uppercase tracking-wider">總計</div>
              </div>
            </div>
          </div>

          {/* Nearby */}
          {nearby.length > 0 && (
            <div className="card p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">📍</span>
                  <span className="text-xs font-bold text-[#94a5b8]">附近</span>
                </div>
                <span className="text-[9px] text-[#5a6d85]">{nearby.length}隻</span>
              </div>
              <div className="flex gap-2 overflow-x-auto nearby-scroll">
                {nearby.map((p,i) => {
                  const idx = pets.indexOf(p)
                  return (
                    <button key={p.id} onClick={() => { setActiveIdx(idx); setTab('map') }}
                      className="flex-shrink-0 card-2 p-2.5 text-center min-w-[76px] active:scale-95 transition-transform">
                      <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-1"
                        style={{background:`${PC[p.rarity]}12`}}>
                        <PixelPet color={PC[p.rarity]} size={2.8} animation="idle" />
                      </div>
                      <div className="text-[8px] font-bold" style={{color:RARITY_COLORS[p.rarity]}}>{RARITY_LABELS[p.rarity]}</div>
                      <div className="text-[9px] font-bold text-[#f59e0b]">CP {cp(p)}</div>
                      <div className="text-[8px] text-[#5a6d85]">Lv.{p.level}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Debug + Log */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={addDebug} className="btn btn-ghost text-[10px]">
                +500 測試步數
              </button>
              {debugCount > 0 && <span className="text-[9px] text-[#5a6d85]">+{debugCount*500}</span>}
            </div>
            <span className="text-[9px] text-[#5a6d85]">🛰️ GPS 記錄真實步數</span>
          </div>

          {log.length > 0 && (
            <div className="card-2 p-2.5">
              <p className="text-[8px] text-[#5a6d85] mb-1 uppercase tracking-wider">記錄</p>
              {log.slice(0, 3).map((m,i) => <p key={i} className="text-[10px] text-[#94a5b8] py-0.5">{m}</p>)}
            </div>
          )}
        </div>}

        {/* ── PETS TAB ── */}
        {tab === 'pets' && <div className="fade-up">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold text-[#f0f4f8]">🐾 寵物</h2>
            <span className="text-[10px] text-[#5a6d85]">{pets.length}隻</span>
          </div>
          {pets.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-4xl mb-2">🥚</div>
              <p className="text-xs text-[#5a6d85]">未有寵物，行路孵化啦！</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {pets.map((p,i) => (
                <button key={p.id} onClick={() => { setActiveIdx(i); setTab('map') }}
                  className="card p-3 text-center active:scale-95 transition-transform hover:border-[#8b5cf6]/40">
                  <div className="w-11 h-11 mx-auto mb-1.5 rounded-xl flex items-center justify-center"
                    style={{background:`radial-gradient(circle,${PC[p.rarity]}15,transparent)`}}>
                    <PixelPet color={PC[p.rarity]} size={3.2} animation="idle" />
                  </div>
                  <div className="text-[10px] font-bold" style={{color:RARITY_COLORS[p.rarity]}}>{RARITY_LABELS[p.rarity]}</div>
                  <div className="text-[9px] font-bold text-[#f59e0b]">CP {cp(p)}</div>
                  <div className="text-[9px] text-[#5a6d85]">Lv.{p.level}</div>
                  <span className="text-[11px]">{ME[p.mood] || '😐'}</span>
                </button>
              ))}
            </div>
          )}
        </div>}

        {/* ── EGGS TAB ── */}
        {tab === 'eggs' && <div className="fade-up">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold">🥚 蛋</h2>
            <span className="text-[10px] text-[#5a6d85]">孵化器 1/1</span>
          </div>

          <div className="card p-3.5 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{border:'2px dashed rgba(139,92,246,0.25)', background:'rgba(139,92,246,0.06)'}}>
                <span className="text-3xl">{pets.length === 0 ? '🥚' : '✅'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#f0f4f8]">{pets.length === 0 ? '基本孵化器' : '已孵化'}</p>
                <p className="text-[10px] text-[#5a6d85] mb-1.5">{pets.length === 0 ? '行 1,000 步孵化' : '完成！'}</p>
                <div className="progress-bar">
                  <div className="progress-fill"
                    style={{
                      width: pets.length === 0 ? `${Math.min(100,(totalSteps/FIRST_PET_STEPS)*100)}%` : '100%',
                      background: pets.length > 0 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : undefined
                    }}/>
                </div>
                <div className="flex justify-between text-[8px] text-[#5a6d85] mt-0.5">
                  <span>進度</span>
                  <span>{pets.length === 0 ? `${formatSteps(totalSteps)}/${formatSteps(FIRST_PET_STEPS)}` : '✅ 完成'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[1,2].map(i => (
              <div key={i} className="card p-3 text-center opacity-60">
                <div className="text-2xl mb-1">🔒</div>
                <p className="text-[10px] text-[#5a6d85] font-medium">額外孵化器</p>
                <p className="text-[8px] text-[#3a4d65]">即將開放</p>
              </div>
            ))}
          </div>
        </div>}

        {/* ── COMMUNITY TAB ── */}
        {tab === 'community' && <div className="fade-up flex justify-center pt-8">
          <div className="card p-6 text-center max-w-[260px]">
            <div className="text-5xl mb-3">🏪</div>
            <h3 className="text-sm font-bold mb-1">社群 &amp; 交易</h3>
            <p className="text-[10px] text-[#5a6d85] mb-4">與其他玩家交換寵物</p>
            <div className="space-y-1.5">
              {['行路競賽','交易市場','好友列表'].map(s => (
                <div key={s} className="card-2 px-3 py-2 text-[10px] text-[#5a6d85] flex items-center justify-between">
                  <span>{s}</span>
                  <span className="text-[#8b5cf6] text-[9px]">即將開放</span>
                </div>
              ))}
            </div>
          </div>
        </div>}

        </div> {/* end main content */}

      </div> {/* end scrollable area */}

      {/* ═══ BOTTOM NAV - FIXED ═══ */}
      <nav className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-2 pt-1" style={{background:'linear-gradient(transparent, #0b1120 30%)'}}>
        <div className="nav-bar">
          <div className="grid grid-cols-4 gap-1">
            <TabBtn t="map" icon="🗺️" label="地圖" />
            <TabBtn t="pets" icon="🐾" label="寵物" />
            <TabBtn t="eggs" icon="🥚" label="蛋" />
            <TabBtn t="community" icon="🏪" label="社群" />
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
