'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Props {
  /** Current GPS position from page.tsx */
  position: { lat: number; lng: number } | null
  /** Whether user is walking (GPS active) */
  walking: boolean
  /** Active pet info (optional, for pet marker) */
  pet?: { rarity: string; speciesId?: string } | null
}

// Rarity color map (matching game)
const RC: Record<string, string> = {
  common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6',
  epic: '#8b5cf6', legendary: '#f59e0b',
}
// Species emoji map
const SPECIES_EMOJI: Record<string, string> = {
  '175': '🐱',    // PixelLab cat
  'shiba': '🐕',  // Shiba
}
const FALLBACK_EMOJI = '🐾'

export default function RealMap({ position, walking, pet }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const accCircleRef = useRef<L.Circle | null>(null)
  const trailRef = useRef<L.Polyline | null>(null)
  const trailCoords = useRef<[number, number][]>([])
  const initialised = useRef(false)

  // Build pet marker HTML
  const buildPetIcon = () => {
    const rarityColor = pet ? (RC[pet.rarity] || '#9ca3af') : '#9ca3af'
    const emoji = pet ? (SPECIES_EMOJI[pet.speciesId ?? ''] || FALLBACK_EMOJI) : '🥚'
    return L.divIcon({
      className: 'pipz-player-marker',
      html: `<div style="
        width:36px;height:36px;border-radius:50%;
        background:${rarityColor}22;
        border:3px solid ${rarityColor};
        display:flex;align-items:center;justify-content:center;
        font-size:20px;line-height:1;
        box-shadow:0 0 12px ${rarityColor}66, 0 0 0 4px ${rarityColor}22;
        transform:translate(-50%,-50%);
      ">${emoji}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })
  }

  // ── Init map (once) ──
  useEffect(() => {
    if (!containerRef.current || initialised.current) return
    initialised.current = true

    const map = L.map(containerRef.current, {
      center: [22.3193, 114.1694],
      zoom: 18,
      zoomControl: false,
      attributionControl: false,
    })

    // CartoDB dark tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      minZoom: 10,
    }).addTo(map)

    mapRef.current = map

    // ── Player marker (shows active pet) ──
    const userM = L.marker([0, 0], {
      icon: buildPetIcon(),
      zIndexOffset: 1000,
    }).addTo(map)
    userMarkerRef.current = userM

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
      color: '#44ccff',
      weight: 2,
      opacity: 0.3,
      dashArray: '4 4',
    }).addTo(map)
    trailRef.current = trail

    return () => {
      map.remove()
      initialised.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Update marker icons when pet changes ──
  useEffect(() => {
    if (userMarkerRef.current) {
      userMarkerRef.current.setIcon(buildPetIcon())
    }
  }, [pet])

  // ── Sync markers + map position from page.tsx GPS ──
  useEffect(() => {
    if (!position || !mapRef.current || !userMarkerRef.current) return
    const { lat, lng } = position

    userMarkerRef.current.setLatLng([lat, lng])
    accCircleRef.current?.setLatLng([lat, lng])
    mapRef.current.setView([lat, lng], mapRef.current.getZoom(), { animate: true })

    // Build path trail (only while walking)
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
    <div className="section card" style={{ padding: 0, overflow: 'hidden', position: 'relative', width: '100%' }}>
      <div ref={containerRef} className="real-map-container" />
      {/* GPS status badge */}
      {walking && (
        <div className="real-map-gps-badge">
          <span className="gps-dot" /> GPS
        </div>
      )}
    </div>
  )
}
