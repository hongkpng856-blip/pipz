'use client'

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { generatePixelPet, drawPixelGrid } from '@pipz/core'

interface Props {
  position: { lat: number; lng: number; heading?: number } | null
  walking: boolean
  mode: 'walk' | 'vehicle' | null
  pet?: { rarity: string; speciesId?: string; evolutionStage?: number } | null
}

const RC: Record<string, string> = {
  common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6',
  epic: '#8b5cf6', legendary: '#f59e0b',
}

const DAY_COLORS = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6']

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
}

const RealMap = forwardRef<RealMapHandle, Props>(function RealMap({ position, walking, pet, mode }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const accCircleRef = useRef<L.Circle | null>(null)
  const trailByDay = useRef<Map<number, [number, number][]>>(new Map())
  const polylineByDay = useRef<Map<number, L.Polyline>>(new Map())
  const headingRef = useRef(0)
  const lastPosForHeading = useRef<{lat:number;lng:number} | null>(null)
  const initialised = useRef(false)
  const autoZoomingRef = useRef(false)
  const lastManualZoomRef = useRef(0)
  const initialZoomDoneRef = useRef(false)
  const TRAIL_STORAGE_KEY = 'pipz_trail_data'

  function saveTrailToStorage() {
    const obj: Record<string, [number, number][]> = {}
    trailByDay.current.forEach((pts, day) => {
      if (pts.length > 0) obj[String(day)] = pts
    })
    try { localStorage.setItem(TRAIL_STORAGE_KEY, JSON.stringify(obj)) } catch {}
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
  }), [])

  const buildPetIcon = useCallback(() => {
    const rarityColor = pet ? (RC[pet.rarity] || '#9ca3af') : '#9ca3af'

    // If no pet, show a simple egg dot with direction chevron
    if (!pet) {
      return L.divIcon({
        className: 'pipz-player-marker',
        html: `<div style="width:32px;height:32px;position:relative;display:flex;align-items:center;justify-content:center;">
          <div class="pipz-heading-arrow" style="transition:transform 0.25s ease;">
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
        <div class="pipz-heading-arrow" style="transition:transform 0.25s ease;">
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

    return () => {
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

    userMarkerRef.current.setLatLng([lat, lng])
    accCircleRef.current?.setLatLng([lat, lng])

    // ── Initial zoom: show all trails first, then fly to current ──
    if (!initialZoomDoneRef.current) {
      initialZoomDoneRef.current = true
      const allPoints: [number, number][] = []
      trailByDay.current.forEach(pts => allPoints.push(...pts))
      if (allPoints.length > 0) {
        autoZoomingRef.current = true
        map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50], animate: true })
        map.once('zoomend', () => {
          setTimeout(() => {
            map.flyTo([lat, lng], 18, { duration: 1.5 })
            map.once('zoomend', () => { autoZoomingRef.current = false })
          }, 1500)
        })
      } else {
        map.setView([lat, lng], 18, { animate: true })
      }
    } else {
      map.setView([lat, lng], map.getZoom(), { animate: true })
    }

    // ── Compute heading from GPS track ──
    let finalHeading = heading
    if (lastPosForHeading.current) {
      const dLat = lat - lastPosForHeading.current.lat
      const dLng = lng - lastPosForHeading.current.lng
      if (Math.abs(dLat) > 0.00001 || Math.abs(dLng) > 0.00001) {
        const bearing = (Math.atan2(dLng, dLat) * 180 / Math.PI + 360) % 360
        finalHeading = bearing
      }
    }
    lastPosForHeading.current = { lat, lng }

    if (finalHeading !== undefined && finalHeading >= 0) {
      headingRef.current = finalHeading
      const arrow = userMarkerRef.current.getElement()?.querySelector('.pipz-heading-arrow') as HTMLElement
      if (arrow) {
        arrow.style.transform = `rotate(${finalHeading}deg)`
      }
    }

    // ── Trail drawing + persist ──
    if (walking && mode === 'walk') {
      const dayIdx = new Date().getDay()
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
      saveTrailToStorage()
    }
  }, [position?.lat, position?.lng, mode])

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
        <div className={`real-map-gps-badge ${mode === 'vehicle' ? 'real-map-mode-vehicle' : ''}`}>
          <span className={`gps-dot ${mode === 'vehicle' ? 'gps-dot-vehicle' : ''}`} />
          {mode === 'vehicle' ? '🚗 乘車中' : '🚶 步行中'}
        </div>
      )}
    </div>
  )
})

export default RealMap
