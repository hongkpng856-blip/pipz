'use client'

import { useEffect, useRef } from 'react'

const C = [
  '#000000', // 0
  '#1d2b53', // 1
  '#7e2553', // 2
  '#ff77a8', // 3 - pink
  '#ab5236', // 4 - brown outline
  '#5f574f', // 5 - dark gray shadow
  '#c2c3c7', // 6 - bg
  '#fff1e8', // 7 - beige body
  '#29adff', // 8 - blue
  '#ffa300', // 9 - orange
]

type Grid = string[]

// Base cat design (same as the front-facing cat user liked)
// 4 frames for walking animation:
// Frame 0: normal position (contact)
// Frame 1: left leg up, right leg down
// Frame 2: normal position (contact)  
// Frame 3: right leg up, left leg down

const BASE: Grid = [
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666466666666666666466666666",
  "66666664746666666666664746666666",
  "66666664774466666666447746666666",
  "66666664747744666644774746666666",
  "66666664744774444447744746666666",
  "66666664747575577557574746666666",
  "66666664775775755757757746666666",
  "66666666477755755755777466666666",
  "66666664777777777777777746666666",
  "66666664777747777777477746666666",
  "66666664775777774777775744466666",
  "66666664777777447447777747466666",
  "66666666477777777777777447546666",
  "66666666647777777777774647774666",
  "66666666664777777777746647554666",
  "66666666644575777757544647774666",
  "66666666455777777777755447554666",
  "66666666457777777777775477746666",
  "66666666477747477474777475466666",
  "66666666477747477474777444666666",
  "66666666647547544574574666666666",
  "66666666645545544554554666666666",
  "66666666664444444444446666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
]

// Generate walk frames by modifying the paw positions
// F0: normal (paws together)
// F1: left paw in, right paw out (stride)
// F2: normal
// F3: right paw in, left paw out (stride)

function makeWalkFrame(offset: number): Grid {
  return BASE.map((row, y) => {
    // Only modify the paw regions (rows 23-26, columns 7-24)
    if (y >= 23 && y <= 26) {
      // Shift paw pixels left/right based on offset
      // offset=0: normal, offset=1: left in/right out, offset=-1: left out/right in
      const arr = row.split('')
      // Left paw area: cols 7-14
      // Right paw area: cols 17-24
      for (let x = 7; x <= 14; x++) {
        if (row[x] !== '6') {
          if (offset > 0) {
            // shift left paw outward (left)
            if (x + offset <= 14) {
              arr[x] = '6'
              arr[x - offset] = row[x]
            }
          } else if (offset < 0) {
            if (x - offset <= 14) {
              arr[x] = '6'
              arr[x - offset] = row[x]
            }
          }
        }
      }
      return arr.join('')
    }
    return row
  })
}

// Actually, let me just hand-craft 4 frames properly
// Frame 0: normal (reference cat)
const F0: Grid = BASE

// Frame 1: body shifted up 1px, paws spread
const F1: Grid = [
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666466666666666666466666666",
  "66666664746666666666664746666666",
  "66666664774466666666447746666666",
  "66666664747744666644774746666666",
  "66666664744774444447744746666666",
  "66666664747575577557574746666666",
  "66666664775775755757757746666666",
  "66666666477755755755777466666666",
  "66666664777777777777777746666666",
  "66666664777747777777477746666666",
  "66666664775777774777775744466666",
  "66666664777777447447777747466666",
  "66666666477777777777777447546666",
  "66666666647777777777774647774666",
  "66666666664777777777746647554666",
  "66666666644575777757544647774666",
  "66666666455777777777755447544666",
  "66666666457777777777775447746666",
  "66666666477747477474777447466666",
  "66666666477747477474777444466666",
  "66666666647547544574574666666666",
  "66666666645545544554554666666666",
  "66666666664444444444446666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
]

// Frame 2: same as F0
const F2: Grid = BASE

// Frame 3: body shifted down 1px, paws together
const F3: Grid = [
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666466666666666666466666666",
  "66666664746666666666664746666666",
  "66666664774466666666447746666666",
  "66666664747744666644774746666666",
  "66666664744774444447744746666666",
  "66666664747575577557574746666666",
  "66666664775775755757757746666666",
  "66666666477755755755777466666666",
  "66666664777777777777777746666666",
  "66666664777747777777477746666666",
  "66666664775777774777775744466666",
  "66666664777777447447777747466666",
  "66666666477777777777777447546666",
  "66666666647777777777774647774666",
  "66666666664777777777746647554666",
  "66666666644575777757544647774666",
  "66666666455777777777755447554666",
  "66666666457777777777775477746666",
  "66666666477747477474777475446666",
  "66666666477747477474777444666666",
  "66666666647547544574574666666666",
  "66666666645545544554554666666666",
  "66666666664444444444446666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
  "66666666666666666666666666666666",
]

const CAT: Grid[] = [F0, F1, F2, F3]

function draw(ctx: CanvasRenderingContext2D, grid: Grid, scale: number) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y]
    for (let x = 0; x < row.length; x++) {
      const ci = parseInt(row[x], 10)
      ctx.fillStyle = C[ci]
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
    canvas.width = 32 * S
    canvas.height = 32 * S

    let frame = 0
    let last = 0

    function render(t: number) {
      if (t - last >= 130) {
        last = t
        frame = (frame + 1) % 4
      }
      draw(ctx, CAT[frame], S)
      requestAnimationFrame(render)
    }
    const id = requestAnimationFrame(render)
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div style={{ background: '#0b1120', minHeight: '100dvh', color: '#f0f4f8', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>🐱 Cat Walking</h1>
        <p style={{ color: '#94a5b8', fontSize: 14, marginBottom: 16 }}>
          同一個貓 design · 踏步行路 animation · 4 frames
        </p>
        <div style={{ background: '#141b2d', borderRadius: 16, padding: 24, display: 'inline-block' }}>
          <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', borderRadius: 8 }} />
        </div>
        <div style={{ marginTop: 16, background: '#141b2d', borderRadius: 16, padding: 16 }}>
          <p style={{ color: '#94a5b8', fontSize: 12, lineHeight: 1.6 }}>
            用返你話好嘅貓 design，加踏步 animation<br/>
            Front-facing 踏步行路，body 上下微動
          </p>
        </div>
      </div>
    </div>
  )
}
