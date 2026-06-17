'use client'

import { useEffect, useRef } from 'react'

type CamState = 'idle' | 'walk' | 'run' | 'encounter'

interface Props {
  state: CamState
  speed?: number       // 0-100, for walk/run intensity
  onEncounterEnd?: () => void
  size?: number        // pixel size multiplier
}

const ROAD_COLOR = '#3a3a4a'
// ROAD_LINE = lane markings
const GRASS_COLOR_1 = '#1a5a2a'
const GRASS_COLOR_2 = '#1a4a22'
const LINE_COLOR = '#6a6a7a'
const HORIZON_COLOR = '#1e1e2e'

export default function WalkingCanvas({ state, speed = 50, onEncounterEnd, size = 3 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef(0)
  const encTimerRef = useRef(0)
  const rafRef = useRef(0)

  const W = Math.floor(320 / size)   // base pixel width
  const H = Math.floor(180 / size)   // base pixel height
  const CX = W / 2
  const CY = H * 0.55                // horizon line

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isEncounter = state === 'encounter'
    const isWalking = state === 'walk'
    const isRunning = state === 'run'
    const isIdle = state === 'idle'

    let encounterPhase = 0
    let encounterDone = false

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // ── Sky ──
      ctx.fillStyle = HORIZON_COLOR
      ctx.fillRect(0, 0, W, CY + 2)

      // ── Ground (perspective road) ──
      const scrollSpeed = isRunning ? 6 : isWalking ? 2.5 : 0.5
      scrollRef.current += scrollSpeed * (speed / 50)

      // Draw road segments from near to far
      const segCount = 20
      for (let i = segCount; i >= 0; i--) {
        const z = i / segCount  // 0 = horizon, 1 = bottom
        const y = CY + (H - CY) * z
        const nextZ = (i + 0.5) / segCount
        const nextY = CY + (H - CY) * nextZ

        // Road width narrows toward horizon
        const roadW = CX * z * 1.1
        const roadW2 = CX * nextZ * 1.1

        // Grass
        ctx.fillStyle = (Math.floor(i + scrollRef.current * 0.1) % 2 === 0) ? GRASS_COLOR_1 : GRASS_COLOR_2
        ctx.fillRect(0, y, W, nextY - y + 1)

        // Road surface
        ctx.fillStyle = ROAD_COLOR
        ctx.fillRect(CX - roadW, y, roadW * 2, nextY - y + 1)

        // Lane marking (dashed center line)
        if (i % 2 === 0) {
          const lineW = Math.max(1, roadW * 0.08)
          const lineH = Math.max(1, nextY - y)
          ctx.fillStyle = LINE_COLOR
          ctx.fillRect(CX - lineW / 2, y, lineW, lineH + 1)
        }

        // Road edge line
        ctx.fillStyle = '#4a4a5a'
        const edgeW = Math.max(0.5, roadW * 0.03)
        ctx.fillRect(CX - roadW, y, edgeW, nextY - y + 1)
        ctx.fillRect(CX + roadW - edgeW, y, edgeW, nextY - y + 1)

        // Grass tufts (pixel details on sides)
        if (i % 3 === 0) {
          const tuftX = Math.floor(Math.sin(i * 2.7 + scrollRef.current * 0.05) * 15)
          ctx.fillStyle = '#2a7a3a'
          const grassY = y
          ctx.fillRect(CX - roadW - 4 + tuftX, grassY, 2, Math.max(1, nextY - y))
          ctx.fillRect(CX + roadW + 2 + tuftX, grassY, 2, Math.max(1, nextY - y))
        }

        // Speed lines (running only)
        if (isRunning && i % 2 === 0 && z > 0.3) {
          ctx.fillStyle = `rgba(255,255,255,${0.05 + (z - 0.3) * 0.1})`
          const slx = CX + (Math.sin(i * 3.1 + scrollRef.current * 2) * roadW * 0.6)
          ctx.fillRect(slx, y, Math.max(0.5, roadW * 0.02), Math.max(1, nextY - y))
        }
      }

      // ── Feet indicator (bottom centre) ──
      if (isWalking || isRunning) {
        const bob = Math.sin(scrollRef.current * 0.3) * 2
        const footY = H - 6 + bob
        ctx.fillStyle = '#4a3a2a'
        ctx.fillRect(CX - 4, footY, 3, 3)   // left foot
        ctx.fillRect(CX + 1, footY, 3, 3)   // right foot
      }

      // ── Encounter animation ──
      if (isEncounter && !encounterDone) {
        encounterPhase += 0.04
        if (encounterPhase > 1) {
          encounterPhase = 1
          encounterDone = true
          if (onEncounterEnd) setTimeout(onEncounterEnd, 500)
        }

        // Dark vignette closing in
        const vig = Math.min(encounterPhase * 0.6, 0.5)
        ctx.fillStyle = `rgba(0,0,0,${vig})`
        ctx.fillRect(0, 0, W, H)

        // Grass parting effect
        if (encounterPhase > 0.15) {
          const part = Math.min((encounterPhase - 0.15) / 0.3, 1)
          const grassH = 30 * part
          ctx.fillStyle = GRASS_COLOR_1
          // Left grass
          ctx.fillRect(0, H - grassH, CX - 30, grassH)
          // Right grass
          ctx.fillRect(CX + 30, H - grassH, W - (CX + 30), grassH)
          // Egg in centre
          if (encounterPhase > 0.3) {
            const eggBob = Math.sin(encounterPhase * 10) * 1.5
            ctx.fillStyle = '#d4a0c0'
            ctx.fillRect(CX - 4, H - grassH - 8 + eggBob, 8, 10)
            ctx.fillStyle = '#b880a0'
            ctx.fillRect(CX - 3, H - grassH - 7 + eggBob, 2, 2)
            ctx.fillRect(CX + 1, H - grassH - 7 + eggBob, 2, 2)
            // Sparkles
            if (encounterPhase > 0.5) {
              ctx.fillStyle = '#ffd700'
              for (let i = 0; i < 3; i++) {
                const sx = CX + Math.sin(encounterPhase * 5 + i * 2) * 12
                const sy = H - grassH - 14 + Math.cos(encounterPhase * 4 + i * 1.5) * 6
                ctx.fillRect(sx, sy, 1, 1)
              }
            }
          }
        }

        // "!" mark
        if (encounterPhase > 0.05 && encounterPhase < 0.4) {
          const pop = Math.min((encounterPhase - 0.05) / 0.1, 1)
          ctx.fillStyle = '#ff3355'
          ctx.fillRect(CX - 1, CY - 20 * pop, 2, 12)
          ctx.fillRect(CX - 3, CY - 20 * pop - 4, 6, 4)
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [state, speed, W, H, CX, CY, onEncounterEnd])

  const scaledW = W * size
  const scaledH = H * size

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{
        width: scaledW,
        height: scaledH,
        imageRendering: 'pixelated',
        display: 'block',
      }}
    />
  )
}
