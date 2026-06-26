'use client'

import { useEffect, useRef } from 'react'

// Simple 24x24 pixel art cat (PICO-8 palette indices)
// 0=black, 6=gray, 7=beige, 8=red, 9=orange, 14=pink, 12=blue
const palette = [
  '#000000', // 0 black
  '#1d2b53', // 1 dark blue
  '#7e2553', // 2 purple
  '#008751', // 3 green
  '#ab5236', // 4 brown
  '#5f574f', // 5 dark gray
  '#c2c3c7', // 6 gray (PICO-8 bg)
  '#fff1e8', // 7 beige
  '#ff004d', // 8 red
  '#ffa300', // 9 orange
  '#ffec27', // 10 yellow
  '#00e436', // 11 green
  '#29adff', // 12 blue
  '#83769c', // 13 purple
  '#ff77a8', // 14 pink
  '#ffccaa', // 15 skin
]

// 24x24 pixel art cat sprite (frame 0: standing)
// Each byte is palette index, 99 = transparent
const FRAMES = [
  // === Frame 0: Standing ===
  [
    // row 0-23, each 24 pixels
    "000000000000000000000000",
    "000000000909000000000000",
    "000000990919990000000000",
    "000000900000099000000000",
    "000000000000000000000000",
    "000009070000000709000000",
    "000990000000000000990000",
    "009000000000000000009000",
    "000000088808888000000000",
    "000000088808888000000000",
    "000000008880888000000000",
    "000000999999999900000000",
    "000009000099000090000000",
    "000090000099000009000000",
    "000009000088000090000000",
    "000000999999999900000000",
    "000000000707000000000000",
    "000000000777000000000000",
    "000000000707000000000000",
    "000000000000000000000000",
    "000000060000006000000000",
    "000000006060600000000000",
    "000000000066000000000000",
    "000000000000000000000000",
  ],
  // === Frame 1: Left leg forward ===
  [
    "000000000000000000000000",
    "000000000909000000000000",
    "000000990919990000000000",
    "000000900000099000000000",
    "000000000000000000000000",
    "000009070000000709000000",
    "000990000000000000990000",
    "009000000000000000009000",
    "000000088808888000000000",
    "000000088808888000000000",
    "000000008880888000000000",
    "000000999999999900000000",
    "000009000099000090000000",
    "000090000099000009000000",
    "000009000088000090000000",
    "000000999999999900000000",
    "000000000707000000000000",
    "000000000777000000000000",
    "000000000707000000000000",
    "000000000000000000000000",
    "000000600000000600000000",
    "000006000000000060000000",
    "000000606060060000000000",
    "000000006606600000000000",
  ],
  // === Frame 2: Standing ===
  [
    "000000000000000000000000",
    "000000000909000000000000",
    "000000990919990000000000",
    "000000900000099000000000",
    "000000000000000000000000",
    "000009070000000709000000",
    "000990000000000000990000",
    "009000000000000000009000",
    "000000088808888000000000",
    "000000088808888000000000",
    "000000008880888000000000",
    "000000999999999900000000",
    "000009000099000090000000",
    "000090000099000009000000",
    "000009000088000090000000",
    "000000999999999900000000",
    "000000000707000000000000",
    "000000000777000000000000",
    "000000000707000000000000",
    "000000000000000000000000",
    "000000060000006000000000",
    "000000006060600000000000",
    "000000000066000000000000",
    "000000000000000000000000",
  ],
  // === Frame 3: Right leg forward ===
  [
    "000000000000000000000000",
    "000000000909000000000000",
    "000000990919990000000000",
    "000000900000099000000000",
    "000000000000000000000000",
    "000009070000000709000000",
    "000990000000000000990000",
    "009000000000000000009000",
    "000000088808888000000000",
    "000000088808888000000000",
    "000000008880888000000000",
    "000000999999999900000000",
    "000009000099000090000000",
    "000090000099000009000000",
    "000009000088000090000000",
    "000000999999999900000000",
    "000000000707000000000000",
    "000000000777000000000000",
    "000000000707000000000000",
    "000000000000000000000000",
    "000000000600000600000000",
    "000000006000000060000000",
    "000006060060606000000000",
    "000000666006660000000000",
  ],
]

export default function AnimTestPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const animRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const SCALE = 8 // 24*8 = 192px
    canvas.width = 24 * SCALE
    canvas.height = 24 * SCALE

    let lastTime = 0
    const FRAME_DURATION = 180 // ms per frame

    function render(time: number) {
      if (time - lastTime >= FRAME_DURATION) {
        lastTime = time
        frameRef.current = (frameRef.current + 1) % 4
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw background
      ctx.fillStyle = '#c2c3c7'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const frame = FRAMES[frameRef.current]
      // Draw each pixel
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 24; x++) {
          const ci = parseInt(frame[y][x], 10)
          if (ci === 9) continue // skip transparent (using 9 as skip)
          ctx.fillStyle = palette[ci]
          ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE)
        }
      }

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  return (
    <div style={{
      background: '#0b1120', minHeight: '100dvh',
      color: '#f0f4f8', fontFamily: 'system-ui, sans-serif',
      padding: 20,
    }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>🐱 Pixel Art Animation Test</h1>
      <p style={{ color: '#94a5b8', fontSize: 14, marginBottom: 24 }}>
        24×24 pixel cat · 4-frame walk cycle · PICO-8 palette
      </p>

      <div style={{
        background: '#141b2d', borderRadius: 16, padding: 24,
        display: 'inline-block', marginBottom: 24,
      }}>
        <canvas
          ref={canvasRef}
          style={{
            imageRendering: 'pixelated',
            borderRadius: 8,
            display: 'block',
            width: 192,
            height: 192,
          }}
        />
      </div>

      <div style={{
        background: '#141b2d', borderRadius: 16, padding: 16,
        maxWidth: 500,
      }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, color: '#8b5cf6' }}>下一步</h2>
        <ul style={{ color: '#94a5b8', fontSize: 12, lineHeight: 1.8, paddingLeft: 16 }}>
          <li>呢個係手畫 pixel cat + canvas animation</li>
          <li>AI gen 嘅 sprite 可以 replace 呢個 pixel data</li>
          <li>Walk cycle 4 frames 已經 work</li>
          <li>之後可以加 blink、sleep、happy 動畫</li>
        </ul>
      </div>
    </div>
  )
}
