/**
 * PositionTracker — GPS smoothing + prediction for accurate map position
 *
 * Google Maps–style real-time positioning:
 *   Raw GPS → Speed anomaly gate → Kalman filter (1D per axis)
 *   → Velocity estimator → Smoothed output (for React state)
 *   → Predicted position extrapolation (for 60fps marker interpolation)
 *
 * Kalman: measurement noise R = GPS accuracy (m), process noise Q = 0.01
 */

// ── 1D Kalman filter ──
class Kalman1D {
  private x = 0
  private p = 1
  private q: number
  private initialized = false

  constructor(processNoise = 0.01) {
    this.q = processNoise
  }

  /** Feed measurement z with uncertainty r, return filtered estimate */
  update(z: number, r: number): number {
    if (!this.initialized) {
      this.x = z
      this.p = r
      this.initialized = true
      return this.x
    }
    // Predict: uncertainty grows slightly
    this.p += this.q
    // Update: blend based on relative uncertainty
    const k = this.p / (this.p + r)
    this.x += k * (z - this.x)
    this.p *= 1 - k
    return this.x
  }

  reset() { this.initialized = false }
}

export interface PositionSample {
  lat: number
  lng: number
  heading?: number
  accuracy: number
  speed?: number
}

export class PositionTracker {
  private kfLat = new Kalman1D(0.01)
  private kfLng = new Kalman1D(0.01)
  private lastTime = 0
  private lastSmoothed: { lat: number; lng: number } | null = null
  private velocity = { lat: 0, lng: 0 }
  private _latest: PositionSample | null = null

  get latest(): PositionSample | null { return this._latest }

  /** Feed raw GPS reading → returns smoothed position, or null if rejected */
  update(gps: {
    lat: number; lng: number; accuracy: number
    heading?: number; speed?: number
  }): PositionSample | null {
    const now = Date.now()

    // ── Speed anomaly gate (reject impossible jumps > 108 km/h) ──
    if (this.lastSmoothed && this.lastTime > 0) {
      const dt = (now - this.lastTime) / 1000
      if (dt > 0) {
        const d = this.haversine(this.lastSmoothed.lat, this.lastSmoothed.lng, gps.lat, gps.lng)
        if (d / dt > 30) return null
      }
    }

    // ── Kalman ──
    const r = Math.max(gps.accuracy, 1)
    const lat = this.kfLat.update(gps.lat, r)
    const lng = this.kfLng.update(gps.lng, r)

    // ── Velocity (for prediction between GPS fixes) ──
    if (this.lastSmoothed && this.lastTime > 0) {
      const dt = (now - this.lastTime) / 1000
      if (dt > 0) {
        this.velocity.lat = (lat - this.lastSmoothed.lat) / dt
        this.velocity.lng = (lng - this.lastSmoothed.lng) / dt
      }
    }

    this.lastSmoothed = { lat, lng }
    this.lastTime = now
    this._latest = { lat, lng, heading: gps.heading, accuracy: gps.accuracy, speed: gps.speed }
    return this._latest
  }

  /** Get extrapolated position at arbitrary time (for 60fps map animation) */
  getPredicted(now = Date.now()): { lat: number; lng: number } | null {
    if (!this.lastSmoothed) return null
    const dt = (now - this.lastTime) / 1000
    if (dt <= 0.1) return { ...this.lastSmoothed }
    // Cap to 2 s so it doesn't run away on GPS loss
    const t = Math.min(dt, 2)
    return {
      lat: this.lastSmoothed.lat + this.velocity.lat * t,
      lng: this.lastSmoothed.lng + this.velocity.lng * t,
    }
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000
    const toRad = (d: number) => d * Math.PI / 180
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
}
