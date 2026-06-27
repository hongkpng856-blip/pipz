'use client'

import { useEffect, useRef } from 'react'

// PICO-8 palette
const C = [
  '#000000', // 0 black (eyes/pupils)
  '#1d2b53', // 1 navy (outlines — skill: avoid pure black)
  '#7e2553', // 2 purple
  '#008751', // 3 green
  '#ab5236', // 4 brown (shadow fur)
  '#5f574f', // 5 dark gray (paw pads)
  '#c2c3c7', // 6 gray (bg/empty space)
  '#fff1e8', // 7 beige (belly/face/muzzle)
  '#ff004d', // 8 red
  '#ffa300', // 9 orange (main body)
  '#ffec27', // 10 yellow
  '#00e436', // 11 green
  '#29adff', // 12 blue (eyes)
  '#83769c', // 13 purple
  '#ff77a8', // 14 pink (inner ear, nose)
  '#ffccaa', // 15 skin
]

type Grid = string[]

// Skill: start with silhouette → layer shading → consistent volume
//
// 24x24 cat design:
// - Orange (9) main body with brown (4) shadow
// - Beige (7) belly/face/muzzle
// - Navy (1) outlines instead of pure black
// - Blue (12) eyes, pink (14) nose/inner ear
// - Gray (6) = background (transparent within sprite)

const WALK: Grid[] = [
  // Frame 0: Contact — left front leg forward, right back
  [
    "666666666666666666666666",
    "666666666666666666666666",
    "666666666119116666666666",
    "666666661999199166666666",
    "666666619999991666666666",
    "666666666199166666666666",
    "666666617777716666666666",
    "666666197777791666666666",
    "666619999999999166666666",
    "666619111991119166666666",
    "666661999699996166666666",
    "666661999999996166666666",
    "666619999999999166666666",
    "666199999999999916666666",
    "666199944944999916666666",
    "666619999999999166666666",
    "666661977777916666666666",
    "666666199999916666666666",
    "666666171111716666666666",
    "666666617777716666666666",
    "666666195555591666666666",
    "666666195555591666666666",
    "666666619999916666666666",
    "666666661555516666666666",
  ],
  // Frame 1: Passing — legs cross, body bob +1px
  [
    "666666666666666666666666",
    "666666666666666666666666",
    "666666666119116666666666",
    "666666661999199166666666",
    "666666619999991666666666",
    "666666666199166666666666",
    "666666617777716666666666",
    "666666197777791666666666",
    "666619999999999166666666",
    "666619111991119166666666",
    "666661999699996166666666",
    "666661999999996166666666",
    "666619999999999166666666",
    "666199999999999916666666",
    "666199944944999916666666",
    "666619999999999166666666",
    "666661977777916666666666",
    "666666199999916666666666",
    "666666171111716666666666",
    "666666617777716666666666",
    "666666155999551666666666",
    "666666615555516666666666",
    "666666661555516666666666",
    "666666666111666666666666",
  ],
  // Frame 2: Contact mirrored — right front leg forward
  [
    "666666666666666666666666",
    "666666666666666666666666",
    "666666666119116666666666",
    "666666661999199166666666",
    "666666619999991666666666",
    "666666666199166666666666",
    "666666617777716666666666",
    "666666197777791666666666",
    "666619999999999166666666",
    "666619111991119166666666",
    "666661999699996166666666",
    "666661999999996166666666",
    "666619999999999166666666",
    "666199999999999916666666",
    "666199944944999916666666",
    "666619999999999166666666",
    "666661977777916666666666",
    "666666199999916666666666",
    "666666171111716666666666",
    "666666617777716666666666",
    "666666195555591666666666",
    "666666195555591666666666",
    "666666619999916666666666",
    "666666661555516666666666",
  ],
  // Frame 3: Passing mirrored
  [
    "666666666666666666666666",
    "666666666666666666666666",
    "666666666119116666666666",
    "666666661999199166666666",
    "666666619999991666666666",
    "666666666199166666666666",
    "666666617777716666666666",
    "666666197777791666666666",
    "666619999999999166666666",
    "666619111991119166666666",
    "666661999699996166666666",
    "666661999999996166666666",
    "666619999999999166666666",
    "666199999999999916666666",
    "666199944944999916666666",
    "666619999999999166666666",
    "666661977777916666666666",
    "666666199999916666666666",
    "666666171111716666666666",
    "666666617777716666666666",
    "666666155999551666666666",
    "666666615555516666666666",
    "666666661555516666666666",
    "666666666111666666666666",
  ],
]

// Run cycle — more extreme poses, longer strides, body leans forward
// Timing: 80ms (vs walk 130ms)
const RUN: Grid[] = [
  // Frame 0: Contact — big stretch forward
  [
    "666666666666666666666666",
    "666666666666666666666666",
    "666666666119116666666666",
    "666666661999199166666666",
    "666666619999991666666666",
    "666666666199166666666666",
    "666666617777716666666666",
    "666666197777791666666666",
    "666619999999999166666666",
    "666619111991119166666666",
    "666661999999996166666666",
    "666661999999996166666666",
    "666619999999999166666666",
    "666199999999999916666666",
    "666199944944999916666666",
    "666619999999999166666666",
    "666661977777916666666666",
    "666666199999916666666666",
    "666666171111716666666666",
    "666666617777716666666666",
    "666666195000591666666666",
    "666666195000591666666666",
    "666666615555516666666666",
    "666666661555516666666666",
  ],
  // Frame 1: Float — both legs tucked under
  [
    "666666666666666666666666",
    "666666666666666666666666",
    "666666666119116666666666",
    "666666661999199166666666",
    "666666619999991666666666",
    "666666666199166666666666",
    "666666617777716666666666",
    "666666197777791666666666",
    "666619999999999166666666",
    "666619111991119166666666",
    "666661999999996166666666",
    "666661999999996166666666",
    "666619999999999166666666",
    "666199999999999916666666",
    "666199944944999916666666",
    "666619999999999166666666",
    "666661977777916666666666",
    "666666199999916666666666",
    "666666171111716666666666",
    "666666617777716666666666",
    "666666155555551666666666",
    "666666615555516666666666",
    "666666661555516666666666",
    "666666666111666666666666",
  ],
  // Frame 2: Contact mirrored
  [
    "666666666666666666666666",
    "666666666666666666666666",
    "666666666119116666666666",
    "666666661999199166666666",
    "666666619999991666666666",
    "666666666199166666666666",
    "666666617777716666666666",
    "666666197777791666666666",
    "666619999999999166666666",
    "666619111991119166666666",
    "666661999999996166666666",
    "666661999999996166666666",
    "666619999999999166666666",
    "666199999999999916666666",
    "666199944944999916666666",
    "666619999999999166666666",
    "666661977777916666666666",
    "666666199999916666666666",
    "666666171111716666666666",
    "666666617777716666666666",
    "666666195000591666666666",
    "666666195000591666666666",
    "666666615555516666666666",
    "666666661555516666666666",
  ],
  // Frame 3: Float mirrored
  [
    "666666666666666666666666",
    "666666666666666666666666",
    "666666666119116666666666",
    "666666661999199166666666",
    "666666619999991666666666",
    "666666666199166666666666",
    "666666617777716666666666",
    "666666197777791666666666",
    "666619999999999166666666",
    "666619111991119166666666",
    "666661999999996166666666",
    "666661999999996166666666",
    "666619999999999166666666",
    "666199999999999916666666",
    "666199944944999916666666",
    "666619999999999166666666",
    "666661977777916666666666",
    "666666199999916666666666",
    "666666171111716666666666",
    "666666617777716666666666",
    "666666155555551666666666",
    "666666615555516666666666",
    "666666661555516666666666",
    "666666666111666666666666",
  ],
]

function draw(ctx: CanvasRenderingContext2D, frame: Grid, scale: number) {
  for (let y = 0; y < 24; y++) {
    const row = frame[y]
    for (let x = 0; x < 24; x++) {
      ctx.fillStyle = C[parseInt(row[x], 10)]
      ctx.fillRect(x * scale, y * scale, scale, scale)
    }
  }
}

export default function AnimTestPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef<'walk' | 'run'>('walk')
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const S = 8
    canvas.width = 24 * S
    canvas.height = 24 * S

    let frame = 0
    let last = 0

    function render(t: number) {
      const frames = modeRef.current === 'walk' ? WALK : RUN
      const speed = modeRef.current === 'walk' ? 130 : 80
      if (t - last >= speed) {
        last = t
        frame = (frame + 1) % 4
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#c2c3c7'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      draw(ctx, frames[frame], S)
      requestAnimationFrame(render)
    }
    const id = requestAnimationFrame(render)
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div style={{ background: '#0b1120', minHeight: '100dvh', color: '#f0f4f8', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>🐱 Pixel Cat — Walk + Run</h1>
      <p style={{ color: '#94a5b8', fontSize: 14, marginBottom: 16 }}>
        跟 pixel-art-sprites skill 由 silhouette 起設計 · 24×24 · PICO-8 palette
      </p>

      <div style={{ background: '#141b2d', borderRadius: 16, padding: 24, display: 'inline-block', marginBottom: 16 }}>
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', borderRadius: 8, width: 192, height: 192 }} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => {
            modeRef.current = modeRef.current === 'walk' ? 'run' : 'walk'
            if (btnRef.current) {
              btnRef.current.textContent = modeRef.current === 'walk'
                ? '🔄 Switch to Run'
                : '🔄 Switch to Walk'
            }
          }}
          ref={btnRef}
          style={{
            background: '#8b5cf6', color: '#fff', border: 'none',
            borderRadius: 20, padding: '10px 24px', fontSize: 14,
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          🏃 Switch to Run
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: '#8b5cf6', marginBottom: 8, fontWeight: 600 }}>🚶 Walk Cycle (130ms)</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {WALK.map((f, i) => (
              <MiniFrame key={`w${i}`} frame={f} label={`F${i}`} />
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 8, fontWeight: 600 }}>🏃 Run Cycle (80ms)</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {RUN.map((f, i) => (
              <MiniFrame key={`r${i}`} frame={f} label={`F${i}`} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: '#141b2d', borderRadius: 16, padding: 16, maxWidth: 500 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, color: '#10b981' }}>Skill 指引應用</h2>
        <ul style={{ color: '#94a5b8', fontSize: 12, lineHeight: 1.8, paddingLeft: 16 }}>
          <li>🎯 Silhouette-first: 1x zoom 都認到係貓</li>
          <li>🎨 Palette constraint: orange/brown/beige/navy — 8 colors total</li>
          <li>📐 Navy outlines (#1d2b53) instead of pure black</li>
          <li>📏 Hue-shifted shading: shadow→brown, base→orange</li>
          <li>🚶 Walk: contact→passing→contact→passing, 130ms</li>
          <li>🏃 Run: longer strides, float phase, 80ms</li>
        </ul>
      </div>
    </div>
  )
}

function MiniFrame({ frame, label }: { frame: Grid; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext('2d')!
    c.width = 24 * 3
    c.height = 24 * 3
    ctx.fillStyle = '#c2c3c7'
    ctx.fillRect(0, 0, c.width, c.height)
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        ctx.fillStyle = C[parseInt(frame[y][x], 10)]
        ctx.fillRect(x * 3, y * 3, 3, 3)
      }
    }
  }, [frame])
  return (
    <div style={{ textAlign: 'center' }}>
      <canvas ref={ref} style={{ imageRendering: 'pixelated', borderRadius: 4, width: 72, height: 72, background: '#1a1f33' }} />
      <div style={{ fontSize: 9, color: '#5a6d85', marginTop: 2 }}>{label}</div>
    </div>
  )
}
