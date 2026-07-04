'use client'

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { generatePixelPet, drawPixelGrid } from '@pipz/core'

interface Props {
  position: { lat: number; lng: number; heading?: number } | null
  walking: boolean
  mode: 'walk' | 'vehicle' | 'stationary' | null
  deviceHeading?: number | null
  compassActive?: boolean
  pet?: { rarity: string; speciesId?: string; evolutionStage?: number } | null
}

const RC: Record<string, string> = {
  common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6',
  epic: '#8b5cf6', legendary: '#f59e0b',
}

const DAY_COLORS = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6']

// ── Monopoly grid config ──
const CELL_SIZE_DEG = 0.0006  // ~60m per cell (at HK latitude)
const MAX_GRID_CELLS = 5000   // safety cap — skip rendering if viewport covers way more
const GRID_PAD = 8            // extra cells beyond viewport for smooth panning
const ZONE_COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444', '#3b82f6']

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Generate a data URL of the pet's pixel art sprite */
function petSpriteDataUrl(pet: NonNullable<Props['pet']>): string {
  const seed = parseInt(pet.speciesId ?? '0', 10) || 1
  const stage = pet.evolutionStage ?? 1
  const rarity = (['common','uncommon','rare','epic','legendary'].includes(pet.rarity) ? pet.rarity : 'common') as any

  const data = generatePixelPet({ seed, rarity, evolutionStage: stage })
  const pixelSize = 2 // 2px per pixel → 64x64 for a 32-grid pet, 32x32 for 16-grid
  const w = data.width * pixelSize
  const h = data.height * pixelSize

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  drawPixelGrid(ctx, data.grid, pixelSize, 0, 0)
  return canvas.toDataURL()
}

export interface RealMapHandle {
  generateTestTrails: () => void
  clearStoredTrails: () => void
  recenterMap: () => void
}

const RealMap = forwardRef<RealMapHandle, Props>(function RealMap({ position, walking, pet, mode, deviceHeading, compassActive }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const accCircleRef = useRef<L.Circle | null>(null)
  const trailByDay = useRef<Map<number, [number, number][]>>(new Map())
  const polylineByDay = useRef<Map<number, L.Polyline>>(new Map())
  const vehicleTrailByDay = useRef<Map<number, [number, number][]>>(new Map())
  const vehiclePolylineByDay = useRef<Map<number, L.Polyline>>(new Map())
  const headingRef = useRef(0)
  const initialised = useRef(false)
  const autoZoomingRef = useRef(false)
  const lastManualZoomRef = useRef(0)
  const initialZoomDoneRef = useRef(false)
  const initialAnimBusyRef = useRef(false)
  const gridRectsRef = useRef<L.Rectangle[]>([])
  const gridInitializedRef = useRef(false)
  const anchorRef = useRef<{ lat: number; lng: number } | null>(null)
  const lastKnownPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const [gridVisible, setGridVisible] = useState(true)
  const gridVisibleRef = useRef(true)
  gridVisibleRef.current = gridVisible

  /** Zoom-based grid fade: grid gradually disappears when zoomed out */
  function getGridZoomFactor(zoom: number): number {
    if (zoom >= 16) return 1
    if (zoom <= 13) return 0
    return (zoom - 13) / 3 // linear 0→1 between zoom 13-16
  }
  // ── Reverse geocode cache (Nominatim, 1 req/s) ──
  const geocodeCache = useRef<Map<string, { label: string; detail: string; full: string }>>(new Map())
  const geocodeQueue = useRef<Array<{ key: string; lat: number; lng: number; resolve: (v: { label: string; detail: string; full: string }) => void }>>([])
  const geocodeBusy = useRef(false)
  const TRAIL_STORAGE_KEY = 'pipz_trail_data'
  const VEHICLE_TRAIL_KEY = 'pipz_vehicle_trail'

  /** Fetch grid anchor from server (shared across all players) */
  async function fetchGridAnchor(): Promise<{ lat: number; lng: number } | null> {
    try {
      const res = await fetch('/api/grid-config')
      if (!res.ok) return null
      const json = await res.json()
      if (!json.anchor) return null
      return { lat: json.anchor.anchor_lat, lng: json.anchor.anchor_lng }
    } catch { return null }
  }

  /** Set grid anchor on server (only works if none exists yet) */
  async function setGridAnchor(lat: number, lng: number): Promise<boolean> {
    try {
      const res = await fetch('/api/grid-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      })
      return res.ok
    } catch { return false }
  }

  function roundToGrid(lat: number, lng: number) {
    return {
      lat: Math.round(lat / CELL_SIZE_DEG) * CELL_SIZE_DEG,
      lng: Math.round(lng / CELL_SIZE_DEG) * CELL_SIZE_DEG,
    }
  }

  // ── Dynamic full-map grid: renders visible L.Rectangle cells based on viewport ──
  //    Leaflet vector layers move with map automatically (no per-frame redraw).
  function updateGrid(map: L.Map, anchor: { lat: number; lng: number }) {
    // Skip if grid is toggled off
    if (!gridVisibleRef.current) return

    // Remove old grid
    gridRectsRef.current.forEach(r => r.remove())
    gridRectsRef.current = []

    const zoom = map.getZoom()
    const zoomFactor = getGridZoomFactor(zoom)
    // Skip if fully faded out at this zoom
    if (zoomFactor <= 0) return

    const bounds = map.getBounds()
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()

    // Calculate visible cell range (relative to anchor)
    const minRow = Math.floor((sw.lat - anchor.lat) / CELL_SIZE_DEG) - GRID_PAD
    const maxRow = Math.ceil((ne.lat - anchor.lat) / CELL_SIZE_DEG) + GRID_PAD
    const minCol = Math.floor((sw.lng - anchor.lng) / CELL_SIZE_DEG) - GRID_PAD
    const maxCol = Math.ceil((ne.lng - anchor.lng) / CELL_SIZE_DEG) + GRID_PAD

    const nRows = maxRow - minRow + 1
    const nCols = maxCol - minCol + 1

    // Safety cap: skip if too many cells (too zoomed out)
    if (nRows * nCols > MAX_GRID_CELLS) return

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const north = anchor.lat + row * CELL_SIZE_DEG
        const south = north + CELL_SIZE_DEG
        const west = anchor.lng + col * CELL_SIZE_DEG
        const east = west + CELL_SIZE_DEG
        const zoneIdx = ((row * 7 + col * 13) % ZONE_COLORS.length + ZONE_COLORS.length) % ZONE_COLORS.length
        const color = ZONE_COLORS[zoneIdx]
        const name = `第${row+1}區 ${col+1}號`

        const rect = L.rectangle([[north, west], [south, east]], {
          color,
          weight: 3 * zoomFactor,
          opacity: 0.55 * zoomFactor,
          fillColor: color,
          fillOpacity: 0.08 * zoomFactor,
          interactive: zoomFactor > 0.3, // only interactive when somewhat visible
        }).addTo(map)

        // Tooltip on hover — Monopoly-style
        rect.bindTooltip(`<div style="font-family:Georgia,serif;font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.5px;text-align:center;">${name}</div>`, {
          permanent: false,
          direction: 'center',
          className: 'monopoly-grid-tooltip',
        })

        // Click handler
        rect.on('click', () => {
          rect.setStyle({ fillOpacity: 0.2, weight: 2.5, opacity: 0.8 })
          setTimeout(() => rect.setStyle({ fillOpacity: 0.06, weight: 1.5, opacity: 0.4 }), 1500)

          const center = rect.getBounds().getCenter()
          showCellPopup(map, center, name, color, north + CELL_SIZE_DEG / 2, west + CELL_SIZE_DEG / 2)
        })

        gridRectsRef.current.push(rect)
      }
    }
  }
  /** Get grid cell name from lat/lng */
  function getCellInfo(lat: number, lng: number) {
    const anchor = anchorRef.current
    if (!anchor) return null
    const row = Math.floor((lat - anchor.lat) / CELL_SIZE_DEG)
    const col = Math.floor((lng - anchor.lng) / CELL_SIZE_DEG)
    const zoneIdx = ((row * 7 + col * 13) % ZONE_COLORS.length + ZONE_COLORS.length) % ZONE_COLORS.length
    return {
      row,
      col,
      name: `第${row+1}區 ${col+1}號`,
      color: ZONE_COLORS[zoneIdx],
    }
  }

  // ── Reverse geocode (Nominatim OpenStreetMap) with rate-limited queue ──
  const UKNOWN_AREA = { label: '📍 未知地區', detail: '', full: '📍 未知地區' }

  async function processGeocodeQueue() {
    if (geocodeBusy.current || geocodeQueue.current.length === 0) return
    geocodeBusy.current = true
    const item = geocodeQueue.current.shift()!
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${item.lat}&lon=${item.lng}&accept-language=zh`,
        { headers: { 'User-Agent': 'Pipz/1.0 (HongKong)' } }
      )
      if (!res.ok) throw new Error(`Nominatim ${res.status}`)
      const data = await res.json()
      const addr = data?.address || {}
      const district = addr.district || addr.town || addr.city || addr.county || ''
      const suburb = addr.suburb || addr.village || addr.neighbourhood || ''
      const road = addr.road || addr.highway || addr.pedestrian || ''
      const parts = [district, suburb].filter(Boolean)
      const label = parts.length > 0 ? `📍 ${parts.join(' · ')}` : UKNOWN_AREA.label
      const detail = road ? `📍 ${road}` : ''
      const full = [label, detail].filter(Boolean).join('\n')
      const entry = { label, detail, full }
      geocodeCache.current.set(item.key, entry)
      item.resolve(entry)
    } catch {
      item.resolve(UKNOWN_AREA)
    } finally {
      geocodeBusy.current = false
      // Rate limit: 1 req/s
      setTimeout(processGeocodeQueue, 1100)
    }
  }

  function reverseGeocode(key: string, lat: number, lng: number): Promise<{ label: string; detail: string; full: string }> {
    const cached = geocodeCache.current.get(key)
    if (cached) return Promise.resolve(cached)
    return new Promise(resolve => {
      geocodeQueue.current.push({ key, lat, lng, resolve })
      processGeocodeQueue()
    })
  }

  /** Open a Monopoly-style property card popup with real address */
  function showCellPopup(map: L.Map, latlng: L.LatLng, name: string, color: string, cellLat: number, cellLng: number) {
    const key = `${Math.round(cellLat / CELL_SIZE_DEG)}:${Math.round(cellLng / CELL_SIZE_DEG)}`
    const lighter = color + '66' // 40% opacity for secondary accents
    map.openPopup(
      `<div style="width:180px;font-family:Georgia,'Times New Roman',system-ui,sans-serif;border-radius:10px;overflow:hidden;background:#1a1b2e;box-shadow:0 4px 20px rgba(0,0,0,0.5),0 0 0 1px ${lighter};">
        <div style="background:${color};height:22px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:9px;font-weight:900;letter-spacing:3px;color:#fff;text-transform:uppercase;text-shadow:0 1px 1px rgba(0,0,0,0.3);">✦ 物 業 契 約 ✦</span>
        </div>
        <div style="padding:12px 14px 14px;text-align:center;">
          <div style="font-size:14px;font-weight:900;letter-spacing:1px;color:#e8e0d0;text-transform:uppercase;margin-bottom:2px;">${name}</div>
          <div style="font-size:10px;color:${color};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid ${lighter};border-bottom:1px solid ${lighter};padding:4px 0;margin-bottom:4px;" id="pipz-geocode-${key}">🔍 載入地區資訊…</div>
          <div style="font-size:9px;color:#94a5b8;text-transform:uppercase;letter-spacing:1px;margin-top:6px;">佔領費用</div>
          <div style="font-size:20px;font-weight:900;color:#fbbf24;line-height:1.2;">100 <span style="font-size:11px;font-weight:600;color:#fbbf24;">步</span></div>
          <div style="margin-top:8px;border-top:1px dashed ${lighter};padding-top:6px;">
            <span style="font-size:8px;color:#94a5b8;text-transform:uppercase;letter-spacing:0.5px;">👣 步行至此即可佔領</span>
          </div>
        </div>
      </div>`,
      latlng,
      { className: 'monopoly-popup', closeButton: true, maxWidth: 220 }
    )
    // Fetch real address in background
    reverseGeocode(key, cellLat, cellLng).then(addr => {
      const el = document.getElementById(`pipz-geocode-${key}`)
      if (el) {
        el.innerHTML = addr.full
      }
    })
  }

  function saveTrailToStorage() {
    const obj: Record<string, [number, number][]> = {}
    trailByDay.current.forEach((pts, day) => {
      if (pts.length > 0) obj[String(day)] = pts
    })
    try { localStorage.setItem(TRAIL_STORAGE_KEY, JSON.stringify(obj)) } catch {}

    const vObj: Record<string, [number, number][]> = {}
    vehicleTrailByDay.current.forEach((pts, day) => {
      if (pts.length > 0) vObj[String(day)] = pts
    })
    try { localStorage.setItem(VEHICLE_TRAIL_KEY, JSON.stringify(vObj)) } catch {}
  }

  function restoreTrailFromStorage(map: L.Map) {
    try {
      const raw = localStorage.getItem(TRAIL_STORAGE_KEY)
      if (!raw) return
      const obj = JSON.parse(raw)
      Object.entries(obj).forEach(([dayStr, pts]) => {
        const day = parseInt(dayStr)
        const points = pts as [number, number][]
        if (points.length === 0) return
        trailByDay.current.set(day, points)
        const poly = L.polyline(points, {
          color: DAY_COLORS[day],
          weight: 3,
          opacity: 0.7,
          dashArray: '6 4',
        }).addTo(map)
        polylineByDay.current.set(day, poly)
      })
    } catch {}

    // Restore vehicle trails (solid blue, thinner, more transparent)
    try {
      const vRaw = localStorage.getItem(VEHICLE_TRAIL_KEY)
      if (!vRaw) return
      const vObj = JSON.parse(vRaw)
      Object.entries(vObj).forEach(([dayStr, pts]) => {
        const day = parseInt(dayStr)
        const points = pts as [number, number][]
        if (points.length === 0) return
        vehicleTrailByDay.current.set(day, points)
        const poly = L.polyline(points, {
          color: '#60a5fa',    // blue-400
          weight: 2,
          opacity: 0.45,
        }).addTo(map)
        vehiclePolylineByDay.current.set(day, poly)
      })
    } catch {}
  }

  useImperativeHandle(ref, () => ({
    generateTestTrails: () => {
      const map = mapRef.current
      if (!map) return
      const center = map.getCenter()
      // Clear existing trails
      polylineByDay.current.forEach(p => p.remove())
      polylineByDay.current.clear()
      trailByDay.current.clear()
      // Create 7 small arcs, one per day, spread around the center
      for (let day = 0; day < 7; day++) {
        const angle = (day / 7) * Math.PI * 2
        const points: [number, number][] = []
        for (let t = 0; t <= 30; t++) {
          const rad = angle + (t / 30) * 0.8
          const lat = center.lat + Math.cos(rad) * 0.0007 * (1 + day * 0.06)
          const lng = center.lng + Math.sin(rad) * 0.0005
          points.push([lat, lng])
        }
        const poly = L.polyline(points, {
          color: DAY_COLORS[day],
          weight: 3,
          opacity: 0.7,
          dashArray: '6 4',
        }).addTo(map)
        polylineByDay.current.set(day, poly)
        trailByDay.current.set(day, points)
      }
    },
    clearStoredTrails: () => {
      localStorage.removeItem(TRAIL_STORAGE_KEY)
      localStorage.removeItem(VEHICLE_TRAIL_KEY)
      polylineByDay.current.forEach(p => p.remove())
      polylineByDay.current.clear()
      trailByDay.current.clear()
      vehiclePolylineByDay.current.forEach(p => p.remove())
      vehiclePolylineByDay.current.clear()
      vehicleTrailByDay.current.clear()
    },
    recenterMap: () => {
      const map = mapRef.current
      const pos = lastKnownPosRef.current
      if (map && pos) {
        map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 16), { animate: true })
      }
    },
  }), [])

  const buildPetIcon = useCallback(() => {
    const rarityColor = pet ? (RC[pet.rarity] || '#9ca3af') : '#9ca3af'

    // If no pet, show a simple egg dot with direction chevron
    if (!pet) {
      return L.divIcon({
        className: 'pipz-player-marker',
        html: `<div style="width:32px;height:32px;position:relative;display:flex;align-items:center;justify-content:center;">
          <div class="pipz-heading-arrow" style="transition:transform 0.08s ease-out;">
            <svg style="display:block;width:16px;height:12px;overflow:visible;position:absolute;top:-14px;left:8px;filter:drop-shadow(0 0 2px ${rarityColor});" viewBox="0 0 16 12" fill="none">
              <path d="M8 0L16 12H0z" fill="${rarityColor}" />
            </svg>
            <div style="
              width:32px;height:32px;border-radius:50%;
              background:${rarityColor}22;
              border:3px solid ${rarityColor};
              display:flex;align-items:center;justify-content:center;
              font-size:18px;line-height:1;
              box-shadow:0 0 12px ${rarityColor}66;
            ">🥚</div>
          </div>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
    }

    // Generate pixel art sprite
    const dataUrl = petSpriteDataUrl(pet)

    return L.divIcon({
      className: 'pipz-player-marker',
      html: `<div style="width:44px;height:44px;position:relative;display:flex;align-items:center;justify-content:center;">
        <div class="pipz-heading-arrow" style="transition:transform 0.08s ease-out;">
          <svg style="display:block;width:16px;height:12px;overflow:visible;position:absolute;top:-14px;left:14px;filter:drop-shadow(0 0 2px ${rarityColor});" viewBox="0 0 16 12" fill="none">
            <path d="M8 0L16 12H0z" fill="${rarityColor}" />
          </svg>
          <div style="
            width:44px;height:44px;border-radius:50%;
            background:${rarityColor}22;
            border:3px solid ${rarityColor};
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 14px ${rarityColor}66;
            overflow:hidden;
          ">
            <img src="${dataUrl}" style="width:36px;height:36px;image-rendering:pixelated;display:block;" />
          </div>
        </div>
      </div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    })
  }, [pet])

  // ── Init map (once) ──
  useEffect(() => {
    if (!containerRef.current || initialised.current) return
    initialised.current = true

    const map = L.map(containerRef.current, {
      center: [22.3193, 114.1694],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    })

    // Add zoom control (explicitly to avoid double instances)
    ;(map as any).zoomControl = L.control.zoom({ position: 'topleft' })
    ;(map as any).zoomControl.addTo(map)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      minZoom: 10,
    }).addTo(map)

    mapRef.current = map

    // ── Track manual zoom (for auto-zoom override) ──
    map.on('zoomend', () => {
      if (!autoZoomingRef.current) {
        lastManualZoomRef.current = Date.now()
      }
    })

    // ── Restore saved trails from localStorage ──
    restoreTrailFromStorage(map)

    // ── Player marker (shows real pet pixel art) ──
    const userM = L.marker([0, 0], {
      icon: buildPetIcon(),
      zIndexOffset: 1000,
    }).addTo(map)
    userMarkerRef.current = userM

    // ── Marker popup ──
    const rarityLabel: Record<string, string> = {
      common: '普通', uncommon: '稀有', rare: '珍貴', epic: '史詩', legendary: '傳說',
    }
    function updatePopup(p: Props['pet']) {
      if (!p) {
        userM.bindPopup(`
          <div style="text-align:center;padding:4px 8px;font-family:system-ui,sans-serif;min-width:120px;">
            <div style="font-size:28px;margin-bottom:4px;">🥚</div>
            <div style="color:#9ca3af;font-size:13px;font-weight:600;">未有出戰寵物</div>
          </div>
        `)
        return
      }
      const rc = RC[p.rarity] || '#9ca3af'
      const label = rarityLabel[p.rarity] || p.rarity
      userM.bindPopup(`
        <div style="text-align:center;padding:4px 8px;font-family:system-ui,sans-serif;min-width:140px;">
          <img src="${petSpriteDataUrl(p)}" style="width:48px;height:48px;image-rendering:pixelated;display:block;margin:0 auto 6px;" />
          <div style="color:${rc};font-size:13px;font-weight:700;">${label}</div>
          <div style="color:#c4b5fd;font-size:11px;margin-top:2px;">Lv.${p.evolutionStage ?? 1}</div>
        </div>
      `)
    }
    updatePopup(pet)

    // ── Accuracy circle ──
    const accC = L.circle([0, 0], {
      radius: 50,
      color: '#44ccff',
      fillColor: '#44ccff',
      fillOpacity: 0.06,
      weight: 1,
      opacity: 0.15,
    }).addTo(map)
    accCircleRef.current = accC

    // ── Per-day trails (created lazily) ──

    // Fetch grid anchor from server (shared world anchor for all players)
    fetchGridAnchor().then(anchor => {
      if (anchor && !gridInitializedRef.current) {
        anchorRef.current = anchor
        gridInitializedRef.current = true
        updateGrid(map, anchor)
      }
    })

    // Dynamic grid: redraw on every pan/zoom
    const onViewChange = () => {
      if (anchorRef.current) updateGrid(map, anchorRef.current)
    }
    map.on('moveend zoomend', onViewChange)

    // ── Click on grid cell → show popup with real address ──
    function onMapClick(e: L.LeafletMouseEvent) {
      const info = getCellInfo(e.latlng.lat, e.latlng.lng)
      if (!info) return
      showCellPopup(map, e.latlng, info.name, info.color, e.latlng.lat, e.latlng.lng)
    }
    map.on('click', onMapClick)

    return () => {
      map.off('click', onMapClick)
      map.off('moveend zoomend', onViewChange)
      gridRectsRef.current.forEach(r => r.remove())
      gridRectsRef.current = []
      map.remove()
      initialised.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Update marker icon when pet changes ──
  useEffect(() => {
    if (userMarkerRef.current) {
      userMarkerRef.current.setIcon(buildPetIcon())
      // Also update popup content
      const p = pet
      const rc = p ? (RC[p.rarity] || '#9ca3af') : '#9ca3af'
      const rarityLabel: Record<string, string> = {
        common: '普通', uncommon: '稀有', rare: '珍貴', epic: '史詩', legendary: '傳說',
      }
      if (!p) {
        userMarkerRef.current.bindPopup(`
          <div style="text-align:center;padding:4px 8px;font-family:system-ui,sans-serif;min-width:120px;">
            <div style="font-size:28px;margin-bottom:4px;">🥚</div>
            <div style="color:#9ca3af;font-size:13px;font-weight:600;">未有出戰寵物</div>
          </div>
        `)
      } else {
        userMarkerRef.current.bindPopup(`
          <div style="text-align:center;padding:4px 8px;font-family:system-ui,sans-serif;min-width:140px;">
            <img src="${petSpriteDataUrl(p)}" style="width:48px;height:48px;image-rendering:pixelated;display:block;margin:0 auto 6px;" />
            <div style="color:${rc};font-size:13px;font-weight:700;">${rarityLabel[p.rarity] || p.rarity}</div>
            <div style="color:#c4b5fd;font-size:11px;margin-top:2px;">Lv.${p.evolutionStage ?? 1}</div>
          </div>
        `)
      }
    }
  }, [pet, buildPetIcon])

  // ── Sync markers + map position from GPS ──
  useEffect(() => {
    if (!position || !mapRef.current || !userMarkerRef.current) return
    const { lat, lng, heading } = position
    const map = mapRef.current

    // ── Create fixed grid on first GPS fix (saved to server for all players) ──
    if (!gridInitializedRef.current) {
      gridInitializedRef.current = true
      const anchor = roundToGrid(lat, lng)
      anchorRef.current = anchor
      // Save to server (silent if already set by another player)
      setGridAnchor(anchor.lat, anchor.lng)
      // Draw grid immediately
      if (map) updateGrid(map, anchor)
    }

    userMarkerRef.current.setLatLng([lat, lng])
    accCircleRef.current?.setLatLng([lat, lng])
    lastKnownPosRef.current = { lat, lng }

    // ── Initial zoom: show all trails first, then fly to current (one-time) ──
    if (!initialZoomDoneRef.current) {
      initialZoomDoneRef.current = true
      const allPoints: [number, number][] = []
      trailByDay.current.forEach(pts => allPoints.push(...pts))
      vehicleTrailByDay.current.forEach(pts => allPoints.push(...pts))
      if (allPoints.length > 0) {
        initialAnimBusyRef.current = true
        autoZoomingRef.current = true
        map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50], animate: true, maxZoom: 14 })
        map.once('zoomend', () => {
          setTimeout(() => {
            map.flyTo([lat, lng], 18, { duration: 1.5 })
            map.once('zoomend', () => {
              initialAnimBusyRef.current = false
              autoZoomingRef.current = false
            })
          }, 1500)
        })
      } else {
        map.setView([lat, lng], 18, { animate: true })
      }
    }

    // ── Heading: compass first, GPS heading as fallback (no position drift noise) ──
    let finalHeading: number | undefined | null = deviceHeading ?? heading

    if (finalHeading !== undefined && finalHeading !== null && finalHeading >= 0) {
      headingRef.current = finalHeading
      const arrow = userMarkerRef.current.getElement()?.querySelector('.pipz-heading-arrow') as HTMLElement
      if (arrow) {
        arrow.style.transform = `rotate(${finalHeading}deg)`
      }
    }
    // No heading source → arrow stays at last known heading (default = north)

    // ── Trail drawing + persist ──
    if (walking && (mode === 'walk' || mode === 'vehicle')) {
      const dayIdx = new Date().getDay()

      if (mode === 'walk') {
        const points = trailByDay.current.get(dayIdx) || []
        points.push([lat, lng])
        trailByDay.current.set(dayIdx, points)

        let poly = polylineByDay.current.get(dayIdx)
        if (!poly) {
          poly = L.polyline([], {
            color: DAY_COLORS[dayIdx],
            weight: 3,
            opacity: 0.7,
            dashArray: '6 4',
          }).addTo(map)
          polylineByDay.current.set(dayIdx, poly)
        }
        poly.setLatLngs(points)
      } else {
        // Vehicle trail: solid blue, thinner, more transparent
        const vPoints = vehicleTrailByDay.current.get(dayIdx) || []
        vPoints.push([lat, lng])
        vehicleTrailByDay.current.set(dayIdx, vPoints)

        let vPoly = vehiclePolylineByDay.current.get(dayIdx)
        if (!vPoly) {
          vPoly = L.polyline([], {
            color: '#60a5fa',   // blue-400
            weight: 2,
            opacity: 0.45,
          }).addTo(map)
          vehiclePolylineByDay.current.set(dayIdx, vPoly)
        }
        vPoly.setLatLngs(vPoints)
      }

      saveTrailToStorage()
    }
  }, [position?.lat, position?.lng, mode, deviceHeading])

  // ── Clear trail when walking stops ──
  useEffect(() => {
    if (!walking) {
      // Keep trail visible — don't clear
    }
  }, [walking])

  // ── Auto-zoom based on movement mode (walk → zoom in, vehicle → zoom out) ──
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mode) return
    // Respect manual zoom: don't auto-zoom if user zoomed manually in the last 15s
    if (Date.now() - lastManualZoomRef.current < 15000) return

    const targetZoom = mode === 'walk' ? 18 : 14
    if (map.getZoom() === targetZoom) return // already there

    autoZoomingRef.current = true
    map.setZoom(targetZoom, { animate: true })
    map.once('zoomend', () => { autoZoomingRef.current = false })
  }, [mode])

  return (
    <div className="section card" style={{ padding: 0, position: 'relative', width: '100%' }}>
      <div ref={containerRef} className="real-map-container" />
      {walking && (
        <div className={`real-map-gps-badge ${mode === 'vehicle' ? 'real-map-mode-vehicle' : mode === 'stationary' ? 'real-map-mode-stationary' : ''}`}>
          <span className={`gps-dot ${mode === 'vehicle' ? 'gps-dot-vehicle' : mode === 'stationary' ? 'gps-dot-stationary' : ''}`} />
          {compassActive ? '🧭' : '🛰️'}
          {' '}
          {mode === 'vehicle' ? '乘車中' : mode === 'stationary' ? '靜止中' : '步行中'}
        </div>
      )}
      {/* ── Recenter button ── */}
      <button
        className="real-map-recenter-btn"
        onClick={() => {
          const map = mapRef.current
          const pos = lastKnownPosRef.current
          if (map && pos) {
            map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 16), { animate: true })
          }
        }}
        aria-label="回到我的位置"
      >
        🎯
      </button>
      {/* ── Grid toggle button ── */}
      <button
        className="real-map-grid-toggle-btn"
        onClick={() => {
          const map = mapRef.current
          const newVal = !gridVisible
          setGridVisible(newVal)
          if (!newVal) {
            // Hide: remove all grid rects
            gridRectsRef.current.forEach(r => r.remove())
            gridRectsRef.current = []
          } else if (map && anchorRef.current) {
            // Show: redraw grid
            updateGrid(map, anchorRef.current)
          }
        }}
        aria-label={gridVisible ? '隱藏網格' : '顯示網格'}
      >
        {gridVisible ? '▦' : '▢'}
      </button>
    </div>
  )
})

export default RealMap
