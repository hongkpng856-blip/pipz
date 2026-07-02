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

export default function RealMap({ position, walking, pet }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const userMarkerRef = useRef<L.CircleMarker | null>(null)
  const accCircleRef = useRef<L.Circle | null>(null)
  const petMarkerRef = useRef<L.Marker | null>(null)
  const trailRef = useRef<L.Polyline | null>(null)
  const trailCoords = useRef<[number, number][]>([])
  const initialised = useRef(false)

  // ── Init map (once) ──
  useEffect(() => {
    if (!containerRef.current || initialised.current) return
    initialised.current = true

    const map = L.map(containerRef.current, {
      center: [22.3193, 114.1694], // default HK
      zoom: 18,
      zoomControl: false,
      attributionControl: false,
    })

    // CartoDB dark tiles — matches the app's dark theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      minZoom: 10,
    }).addTo(map)

    mapRef.current = map

    // ── User marker (pixel-style blue dot) ──
    const userM = L.circleMarker([0, 0], {
      radius: 8,
      color: '#44ccff',
      fillColor: '#44ccff',
      fillOpacity: 0.3,
      weight: 2,
      opacity: 0.8,
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

    // ── Pet marker ──
    const petM = L.marker([0, 0], {
      icon: L.divIcon({
        className: 'pipz-pet-marker',
        html: '<div class="pipz-pet-dot">🐾</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
      interactive: false,
    }).addTo(map)
    petMarkerRef.current = petM

    return () => {
      map.remove()
      initialised.current = false
    }
    // Only initialise once — intentional empty deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sync markers + map position from page.tsx GPS ──
  useEffect(() => {
    if (!position || !mapRef.current || !userMarkerRef.current) return
    const { lat, lng } = position

    userMarkerRef.current.setLatLng([lat, lng])
    accCircleRef.current?.setLatLng([lat, lng])
    petMarkerRef.current?.setLatLng([lat, lng])
    mapRef.current.setView([lat, lng], mapRef.current.getZoom(), { animate: true })

    // Build path trail (only while walking)
    if (walking) {
      trailCoords.current.push([lat, lng])
      if (trailCoords.current.length > 200) trailCoords.current.shift()
      trailRef.current?.setLatLngs(trailCoords.current)
    }
  }, [position?.lat, position?.lng])

  // ── Update pet marker icon when pet data changes ──
  useEffect(() => {
    if (!petMarkerRef.current) return
    const rarityColor = pet ? (RC[pet.rarity] || '#9ca3af') : '#9ca3af'
    const emoji = pet ? (pet.speciesId === '175' ? '🐱' : '🐾') : '🥚'
    petMarkerRef.current.setIcon(L.divIcon({
      className: 'pipz-pet-marker',
      html: `<div class="pipz-pet-dot" style="background:${rarityColor}33;border-color:${rarityColor}">${emoji}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }))
  }, [pet])

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
