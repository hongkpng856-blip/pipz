'use client'

import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { generatePixelPet, drawPixelGrid } from '@pipz/core'

interface Props {
  position: { lat: number; lng: number; heading?: number } | null
  walking: boolean
  pet?: { rarity: string; speciesId?: string; evolutionStage?: number } | null
}

const RC: Record<string, string> = {
  common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6',
  epic: '#8b5cf6', legendary: '#f59e0b',
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

export default function RealMap({ position, walking, pet }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const accCircleRef = useRef<L.Circle | null>(null)
  const trailRef = useRef<L.Polyline | null>(null)
  const trailCoords = useRef<[number, number][]>([])
  const headingRef = useRef(0)
  const initialised = useRef(false)

  const buildPetIcon = useCallback(() => {
    const rarityColor = pet ? (RC[pet.rarity] || '#9ca3af') : '#9ca3af'

    // If no pet, show a simple egg dot with compass ring
    if (!pet) {
      return L.divIcon({
        className: 'pipz-player-marker',
        html: `<div style="
          width:44px;height:44px;position:relative;
        ">
          <div style="
            position:absolute;inset:-2px;border-radius:50%;
            border:2px solid ${rarityColor}44;opacity:0.5;
          ">
            <div style="
              position:absolute;top:-4px;left:50%;margin-left:-2px;
              width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
              border-bottom:6px solid ${rarityColor};
              transform-origin:2px 26px;
            " class="pipz-heading-arrow" />
          </div>
          <div style="
            width:32px;height:32px;border-radius:50%;
            background:${rarityColor}22;
            border:3px solid ${rarityColor};
            display:flex;align-items:center;justify-content:center;
            font-size:18px;line-height:1;
            box-shadow:0 0 12px ${rarityColor}66, 0 0 0 4px ${rarityColor}22;
          ">🥚</div>
        </div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      })
    }

    // Generate pixel art sprite
    const dataUrl = petSpriteDataUrl(pet)

    return L.divIcon({
      className: 'pipz-player-marker',
      html: `<div style="
        width:56px;height:56px;position:relative;
      ">
        <div style="
          position:absolute;inset:-2px;border-radius:50%;
          border:2px solid ${rarityColor}44;opacity:0.5;
        ">
          <div style="
            position:absolute;top:-4px;left:50%;margin-left:-2px;
            width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
            border-bottom:6px solid ${rarityColor};
            transform-origin:2px 30px;
          " class="pipz-heading-arrow" />
        </div>
        <div style="
          width:44px;height:44px;border-radius:50%;
          background:${rarityColor}22;
          border:3px solid ${rarityColor};
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 14px ${rarityColor}66, 0 0 0 5px ${rarityColor}22;
          overflow:hidden;
        ">
          <img src="${dataUrl}" style="width:36px;height:36px;image-rendering:pixelated;display:block;" />
        </div>
      </div>`,
      iconSize: [56, 56],
      iconAnchor: [28, 28],
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

    // ── Path trail ──
    const trail = L.polyline([], {
      color: '#00ddff',
      weight: 3,
      opacity: 0.6,
      dashArray: '6 4',
    }).addTo(map)
    trailRef.current = trail

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

    userMarkerRef.current.setLatLng([lat, lng])
    accCircleRef.current?.setLatLng([lat, lng])
    mapRef.current.setView([lat, lng], mapRef.current.getZoom(), { animate: true })

    // Update heading arrow rotation
    if (heading !== undefined && heading >= 0) {
      headingRef.current = heading
      const el = userMarkerRef.current.getElement()
      if (el) {
        const arrow = el.querySelector('.pipz-heading-arrow') as HTMLElement
        if (arrow) {
          arrow.style.transform = `rotate(${heading}deg)`
        }
      }
    }

    if (walking) {
      trailCoords.current.push([lat, lng])
      if (trailCoords.current.length > 200) trailCoords.current.shift()
      trailRef.current?.setLatLngs(trailCoords.current)
    }
  }, [position?.lat, position?.lng])

  // ── Clear trail when walking stops ──
  useEffect(() => {
    if (!walking) {
      trailCoords.current = []
      trailRef.current?.setLatLngs([])
    }
  }, [walking])

  return (
    <div className="section card" style={{ padding: 0, position: 'relative', width: '100%' }}>
      <div ref={containerRef} className="real-map-container" />
      {walking && (
        <div className="real-map-gps-badge">
          <span className="gps-dot" /> GPS
        </div>
      )}
    </div>
  )
}
