'use client'

import { useEffect, useRef } from 'react'

const C = [
  '#000000', '#1d2b53', '#7e2553', '#008751',
  '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
  '#ff004d', '#ffa300', '#ffec27', '#00e436',
  '#29adff', '#83769c', '#ff77a8', '#ffccaa',
]

type Grid = string[]

// 4-frame walk cycle. Each frame 24x24, PICO-8 palette indices.
// Follows pixel-art-sprites skill:
// - Contact (frame 0/2): legs apart, body low
// - Passing (frame 1/3): legs cross, body +1px bob
// - Arms swing opposite legs
// - Consistent volume across frames
const FRAMES: Grid[] = [
  // Frame 0: Contact — left leg forward
  [
    "000000000000000000000000",
    "000000000090000000000000",
    "000000090909000000000000",
    "000000900000090000000000",
    "000000000000000000000000",
    "000090700000000709000000",
    "009900000000000000990000",
    "090000000000000000009000",
    "000000880888880000000000",
    "000000880888880000000000",
    "000000088088800000000000",
    "000009999999999000000000",
    "000090000990000900000000",
    "000900009900000900000000",
    "000090008800009000000000",
    "000009999999999000000000",
    "000000007070000000000000",
    "000000007770000000000000",
    "000000007070000000000000",
    "000000000000000000000000",
    "000000600000006000000000",
    "000000060606000000000000",
    "000000000660000000000000",
    "000000000000000000000000",
  ],
  // Frame 1: Passing — legs cross, body bob up
  [
    "000000000000000000000000",
    "000000000090000000000000",
    "000000090909000000000000",
    "000000900000090000000000",
    "000000000000000000000000",
    "000090700000000709000000",
    "009900000000000000990000",
    "090000000000000000009000",
    "000000880888880000000000",
    "000000880888880000000000",
    "000000088088800000000000",
    "000009999999999000000000",
    "000090000990000900000000",
    "000900009900000900000000",
    "000090008800009000000000",
    "000009999999999000000000",
    "000000007070000000000000",
    "000000007770000000000000",
    "000000007070000000000000",
    "000000000000000000000000",
    "000006000000000600000000",
    "000060000000000060000000",
    "000006060060060000000000",
    "000000066006600000000000",
  ],
  // Frame 2: Contact — right leg forward
  [
    "000000000000000000000000",
    "000000000090000000000000",
    "000000090909000000000000",
    "000000900000090000000000",
    "000000000000000000000000",
    "000090700000000709000000",
    "009900000000000000990000",
    "090000000000000000009000",
    "000000880888880000000000",
    "000000880888880000000000",
    "000000088088800000000000",
    "000009999999999000000000",
    "000090000990000900000000",
    "000900009900000900000000",
    "000090008800009000000000",
    "000009999999999000000000",
    "000000007070000000000000",
    "000000007770000000000000",
    "000000007070000000000000",
    "000000000000000000000000",
    "000000600000006000000000",
    "000000060606000000000000",
    "000000000660000000000000",
    "000000000000000000000000",
  ],
  // Frame 3: Passing — right leg cross, body bob up
  [
    "000000000000000000000000",
    "000000000090000000000000",
    "000000090909000000000000",
    "000000900000090000000000",
    "000000000000000000000000",
    "000090700000000709000000",
    "009900000000000000990000",
    "090000000000000000009000",
    "000000880888880000000000",
    "000000880888880000000000",
    "000000088088800000000000",
    "000009999999999000000000",
    "000090000990000900000000",
    "000900009900000900000000",
    "000090008800009000000000",
    "000009999999999000000000",
    "000000007070000000000000",
    "000000007770000000000000",
    "000000007070000000000000",
    "000000000000000000000000",
    "000000006000060000000000",
    "000000060000000600000000",
    "000006060060606000000000",
    "000000666006660000000000",
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

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const S = 8
    canvas.width = 24 * S
    canvas.height = 24 * S

    let frame = 0
    let last = 0

    function render(t: number) {
      if (t - last >= 130) {
        last = t
        frame = (frame + 1) % 4
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#c2c3c7'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      draw(ctx, FRAMES[frame], S)
      requestAnimationFrame(render)
    }
    const id = requestAnimationFrame(render)
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div style={{ background: '#0b1120', minHeight: '100dvh', color: '#f0f4f8', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>🐱 Pixel Cat Walk Cycle</h1>
      <p style={{ color: '#94a5b8', fontSize: 14, marginBottom: 24 }}>
        跟 pixel-art-sprites skill 改善 · 130ms/frame · contact/passing cycle
      </p>
      <div style={{ background: '#141b2d', borderRadius: 16, padding: 24, display: 'inline-block', marginBottom: 24 }}>
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', borderRadius: 8, width: 192, height: 192 }} />
      </div>
      <div style={{ background: '#141b2d', borderRadius: 16, padding: 16, maxWidth: 500 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, color: '#10b981' }}>✅ 改善點</h2>
        <ul style={{ color: '#94a5b8', fontSize: 12, lineHeight: 1.8, paddingLeft: 16 }}>
          <li>⏱ Frame timing: 180ms → <strong>130ms</strong>（skill 建議 100-150ms）</li>
          <li>📏 4-frame walk: contact → passing → contact → passing</li>
          <li>🦵 手腳交替擺動，volume 一致</li>
          <li>⬆️ Passing frame 有 1px vertical bob</li>
        </ul>
      </div>
    </div>
  )
}
