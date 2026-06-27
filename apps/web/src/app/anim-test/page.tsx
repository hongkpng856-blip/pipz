'use client'

import { useEffect, useRef } from 'react'

const C = [
  '#000000', // 0
  '#1d2b53', // 1
  '#7e2553', // 2
  '#ff77a8', // 3 - pink (ears, nose)
  '#ab5236', // 4 - brown (outline)
  '#5f574f', // 5 - dark gray (shadow)
  '#c2c3c7', // 6 - bg
  '#fff1e8', // 7 - beige (body)
  '#29adff', // 8 - blue
  '#ffa300', // 9 - orange
]

type Grid = string[]

const CAT: Grid = [
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

function draw(ctx: CanvasRenderingContext2D, grid: Grid, scale: number) {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y]
    for (let x = 0; x < row.length; x++) {
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
    canvas.width = 32 * S
    canvas.height = 32 * S

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    draw(ctx, CAT, S)
  }, [])

  return (
    <div style={{ background: '#0b1120', minHeight: '100dvh', color: '#f0f4f8', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>🐱 Cat v5 — Reference-based Still</h1>
        <p style={{ color: '#94a5b8', fontSize: 14, marginBottom: 16 }}>
          用咗 pixel art cat sprite reference 重新設計<br/>
          ✅ 圓面 | ✅ 短耳 | ✅ 大眼 | ✅ 圓 body | ✅ 四腳
        </p>
        <div style={{ background: '#141b2d', borderRadius: 16, padding: 24, display: 'inline-block' }}>
          <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', borderRadius: 8 }} />
        </div>
        <div style={{ marginTop: 16, background: '#141b2d', borderRadius: 16, padding: 16 }}>
          <p style={{ color: '#94a5b8', fontSize: 12, lineHeight: 1.6 }}>
            Reference: lollipopak Cat Sprite Sheet 32x32<br/>
            特徵對比：耳仔短（唔似狐狸長耳）、面圓（唔尖）、對眼大、有圓 body、有鬚位
          </p>
        </div>
      </div>
    </div>
  )
}
