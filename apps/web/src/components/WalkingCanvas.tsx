'use client'

import { useEffect, useRef } from 'react'

type CamState = 'idle' | 'walk' | 'run' | 'encounter'

interface PetInfo {
  rarity: string
  evolutionStage: number
}

interface Props {
  state: CamState
  speed?: number       // 0-100, for walk/run intensity
  onEncounterEnd?: () => void
  size?: number        // pixel size multiplier
  pet?: PetInfo | null // pet to render as character
}

/* ── Top-down pixel palette ── */
const GRASS_A = '#2a5a1e'
const GRASS_B = '#326a26'
const PATH_COLOR = '#7a6348'
const PATH_EDGE = '#5a4a30'
const TREE_TRUNK = '#4a2a1a'
const TREE_LEAF = '#1a4a0a'
const TREE_LEAF2 = '#1a5a0a'
const EGG_COLOR = '#d4a0c0'
const EGG_SPOT = '#b880a0'

/* ── Rarity color map ── */
const RC: Record<string, string> = {
  common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6',
  epic: '#8b5cf6', legendary: '#f59e0b',
}

export default function WalkingCanvas({ state, speed = 50, onEncounterEnd, size = 3, pet }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef(0)
  const rafRef = useRef(0)
  const encPhase = useRef(0)
  const encDone = useRef(false)
  const stepRef = useRef(0)

  const W = Math.floor(320 / size)  // base pixel width
  const H = Math.floor(180 / size)  // base pixel height
  const CX = W / 2
  const CY = H * 0.4                // character Y position
  const TILE = 8                    // tile size in base pixels

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Reset encounter state on state change
    if (state !== 'encounter') {
    encPhase.current = 0
    encDone.current = false
    }
    // Start encounter timer for callback
    const encTimer = setTimeout(() => {
    if (state === 'encounter' && !encDone.current) {
      encDone.current = true
      if (onEncounterEnd) onEncounterEnd()
    }
    }, 4000)  // safety timeout after 4s

    const rarityColor = pet ? (RC[pet.rarity] || '#9ca3af') : '#9ca3af'
    const charSize = 3 + (pet?.evolutionStage ?? 1) * 1  // 4-8px character body
    const isEnc = state === 'encounter'
    const isWalk = state === 'walk'
    const isRun = state === 'run'

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // ── Scroll speed ──
      const scrollSpeed = isRun ? 5 : isWalk ? 2 : 0.3
      scrollRef.current += scrollSpeed * (speed / 50)

      // ── Draw ground tiles ──
      const tilesX = Math.ceil(W / TILE) + 2
      const tilesY = Math.ceil(H / TILE) + 2
      const offsetX = 0
      const offsetY = (scrollRef.current * 0.5) % (TILE * 2)

      for (let ty = -1; ty < tilesY; ty++) {
        for (let tx = -1; tx < tilesX; tx++) {
          const x = tx * TILE + offsetX
          const y = ty * TILE + (offsetY - TILE)
          const isGrassA = (tx + ty + Math.floor(scrollRef.current * 0.25)) % 2 === 0
          ctx.fillStyle = isGrassA ? GRASS_A : GRASS_B
          ctx.fillRect(x, y, TILE, TILE)

          // Grass detail (small flowers)
          if ((tx * 7 + ty * 13) % 5 === 0) {
            ctx.fillStyle = '#5a8a3a'
            ctx.fillRect(x + 2, y + 3, 1, 1)
          }
          if ((tx * 11 + ty * 3) % 7 === 0) {
            ctx.fillStyle = '#4a7a2a'
            ctx.fillRect(x + 5, y + 1, 1, 1)
          }
        }
      }

      // ── Draw path (winding trail going upward) ──
      const pathW = 14
      const pathSegments = 12
      for (let i = 0; i < pathSegments; i++) {
        const segY = (i / pathSegments) * H - (scrollRef.current * 0.5) % (H / pathSegments * 2)
        const wobble = Math.sin(i * 0.6 + scrollRef.current * 0.02) * 12  // winding
        const segCenterX = CX + wobble

        ctx.fillStyle = PATH_COLOR
        ctx.fillRect(segCenterX - pathW / 2, segY - 2, pathW, 6)

        // Path edge
        ctx.fillStyle = PATH_EDGE
        ctx.fillRect(segCenterX - pathW / 2 - 1, segY - 2, 1, 6)
        ctx.fillRect(segCenterX + pathW / 2, segY - 2, 1, 6)
      }

      // ── Trees on sides ──
      const treePositions = [
        { x: 8, y: 12 - (scrollRef.current * 0.7) % 40 },
        { x: W - 12, y: 30 - (scrollRef.current * 0.5) % 45 },
        { x: 14, y: 55 - (scrollRef.current * 0.6) % 50 },
        { x: W - 8, y: 80 - (scrollRef.current * 0.4) % 55 },
        { x: 6, y: 110 - (scrollRef.current * 0.3) % 60 },
        { x: W - 14, y: 140 - (scrollRef.current * 0.2) % 65 },
      ]
      const wrapH = H + 20
      for (const t of treePositions) {
        // Wrap Y
        let ty = ((t.y % wrapH) + wrapH) % wrapH - 16
        if (ty < -16 || ty > H + 4) continue

        // Trunk
        ctx.fillStyle = TREE_TRUNK
        ctx.fillRect(t.x - 1, ty, 2, 5)
        // Leaves (triangle-ish)
        ctx.fillStyle = TREE_LEAF
        ctx.fillRect(t.x - 4, ty - 3, 8, 5)
        ctx.fillStyle = TREE_LEAF2
        ctx.fillRect(t.x - 3, ty - 4, 6, 3)
        ctx.fillRect(t.x - 2, ty - 2, 4, 2)
      }

      // ── Bush details ──
      for (let i = 0; i < 3; i++) {
        const bx = (i * 37 + 9) % W
        const by = ((i * 23 + scrollRef.current * 0.3) % (H + 10)) - 5
        if (by < -5 || by > H) continue
        ctx.fillStyle = '#1a5a1a'
        ctx.fillRect(bx, by, 3, 2)
        ctx.fillRect(bx - 1, by + 1, 5, 1)
      }

      // ════ Character ════
      if (pet) {
        const cy = CY + Math.sin(scrollRef.current * 0.05) * 0.5  // slight idle bob

        if (isWalk || isRun) {
          stepRef.current += isRun ? 0.3 : 0.15
        }

        const walkFrame = stepRef.current
        const legOffset = (isWalk || isRun) ? Math.sin(walkFrame * 2) * 2 : 0

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)'
        ctx.fillRect(CX - charSize / 2, cy + 1, charSize, 1)

        // Body (rarity colour)
        ctx.fillStyle = rarityColor
        ctx.fillRect(CX - charSize / 2, cy - charSize, charSize, charSize - 1)

        // Head (slightly different shade - darken)
        ctx.fillStyle = rarityColor
        ctx.fillRect(CX - charSize / 3, cy - charSize - charSize / 2 + 1, charSize * 2 / 3, charSize / 2)

        // Eyes
        ctx.fillStyle = 'white'
        ctx.fillRect(CX - charSize / 4, cy - charSize - charSize / 2 + 2, 1, 1)
        ctx.fillRect(CX + charSize / 4 - 1, cy - charSize - charSize / 2 + 2, 1, 1)

        // Legs (walking animation)
        if (isWalk || isRun) {
          ctx.fillStyle = darkenColor(rarityColor, 0.3)
          ctx.fillRect(CX - charSize / 3, cy - 1, 2, 2 + legOffset)
          ctx.fillRect(CX + charSize / 3 - 2, cy - 1, 2, 2 - legOffset)
        } else {
          ctx.fillStyle = darkenColor(rarityColor, 0.3)
          ctx.fillRect(CX - charSize / 3, cy - 1, 2, 2)
          ctx.fillRect(CX + charSize / 3 - 2, cy - 1, 2, 2)
        }

        // Arms (slight swing)
        if (isWalk || isRun) {
          const armSwing = Math.sin(walkFrame * 2) * 1.5
          ctx.fillStyle = darkenColor(rarityColor, 0.2)
          ctx.fillRect(CX - charSize / 2 - 2, cy - charSize + 2 + armSwing, 2, 3)
          ctx.fillRect(CX + charSize / 2, cy - charSize + 2 - armSwing, 2, 3)
        }
      } else {
        // No pet yet — show egg at centre
        const eggBob = Math.sin(Date.now() * 0.003) * 1
        ctx.fillStyle = EGG_COLOR
        ctx.fillRect(CX - 4, CY - 6 + eggBob, 8, 10)
        ctx.fillStyle = EGG_SPOT
        ctx.fillRect(CX - 2, CY - 5 + eggBob, 1, 1)
        ctx.fillRect(CX + 1, CY - 5 + eggBob, 1, 1)
      }

      // ════ Encounter animation ──
      if (isEnc && !encDone.current) {
        encPhase.current += 0.008
        if (encPhase.current > 1) {
          encPhase.current = 1
          encDone.current = true
          if (onEncounterEnd) setTimeout(onEncounterEnd, 800)
        }

        const p = encPhase.current

        // Dark vignette
        const vig = Math.min(p * 0.5, 0.4)
        ctx.fillStyle = `rgba(0,0,0,${vig})`
        ctx.fillRect(0, 0, W, H)

        if (p > 0.15) {
          // Grass shake near character
          const shakeIntensity = Math.max(0, (0.4 - p) / 0.25) * 3
          if (shakeIntensity > 0) {
            // Shake lines around character
            ctx.fillStyle = 'rgba(50, 180, 50, 0.3)'
            for (let i = 0; i < 3; i++) {
              const sx = CX + Math.sin(p * 20 + i * 2) * 12
              const sy = CY + 8 + Math.cos(p * 15 + i * 1.5) * 4
              ctx.fillRect(sx, sy, 3, 2)
            }
          }

          // Egg appears in grass
          if (p > 0.25) {
            const eggY = CY + charSize + 8 + Math.sin(p * 8) * 2
            // Sparkles
            if (p > 0.4) {
              ctx.fillStyle = '#ffd700'
              for (let i = 0; i < 4; i++) {
                const sx = CX + Math.cos(p * 6 + i * 1.8) * (10 + p * 8)
                const sy = eggY - 4 + Math.sin(p * 5 + i * 1.2) * 4
                ctx.fillRect(sx, sy, 1, 1)
              }
            }

            // Egg
            ctx.fillStyle = EGG_COLOR
            ctx.fillRect(CX - 4, eggY - 6, 8, 10)
            ctx.fillStyle = EGG_SPOT
            ctx.fillRect(CX - 2, eggY - 5, 1, 1)
            ctx.fillRect(CX + 1, eggY - 5, 1, 1)
          }
        }

        // "!" mark pop up
        if (p > 0.05 && p < 0.35) {
          const popH = Math.min((p - 0.05) / 0.08, 1) * 10
          ctx.fillStyle = '#ff3355'
          ctx.fillRect(CX - 1, CY - charSize - 10 - popH, 2, 8)
          ctx.fillRect(CX - 3, CY - charSize - 10 - popH - 3, 6, 4)
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(encTimer)
    }
  }, [state, speed, size, pet, onEncounterEnd, CX, CY, W, H])

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated',
        display: 'block',
      }}
    />
  )
}

/* ── Helper: darken a hex colour ── */
function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const nr = Math.max(0, Math.floor(r * (1 - amount)))
  const ng = Math.max(0, Math.floor(g * (1 - amount)))
  const nb = Math.max(0, Math.floor(b * (1 - amount)))
  return `rgb(${nr},${ng},${nb})`
}
