'use client'

import { useEffect, useRef, useState } from 'react'

const C = [
  '#000000',      // 0
  '#1d2b53',      // 1 navy
  '#7e2553',      // 2 purple
  '#ff77a8',      // 3 pink
  '#ab5236',      // 4 brown
  '#5f574f',      // 5 dark gray
  '#c2c3c7',      // 6 bg
  '#fff1e8',      // 7 beige
  '#29adff',      // 8 blue
  '#ffa300',      // 9 orange
]

// ── Pixel cat from PixelLab (32x32) ──
type Grid = string[]

const CAT_FRAMES: Grid[] = [
  // Frame 0 — contact
  [
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666677776666666666666",
    "66666666666667777777766666666666",
    "66666666666667777767776666666666",
    "66666666666677776666776666666666",
    "66666666666677766666656666666666",
    "66666666666776666666566666666666",
    "66666666653776666666336536666666",
    "66666666334666666665333345666666",
    "66666666336666666653333333666666",
    "66666666436666661313333133566666",
    "66666666134333933313333563566666",
    "66666666643333333313377747166666",
    "66666666633333333334464637666666",
    "66666666613333333334411156666666",
    "66666666413333434433333411666666",
    "66666634441333144413331551666666",
    "66666174166133166666666666666666",
    "66666616666633166666666666666666",
    "66666666666644166666666666666666",
    "66666666666617716666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
  ],
  // Frame 1 — stride right
  [
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666661666666666666666666666666",
    "66666617166666666666666666666666",
    "66666177666666666666666666666666",
    "66666177766666666666666666666666",
    "66666667776666666666666666666666",
    "66666665777666666666666666666666",
    "66666666177166666666666666666666",
    "66666666134666666666666666666666",
    "66666661335666666666566666666666",
    "66666661316666666666336636666666",
    "66666661316666666661333346666666",
    "66666661316666661113333331666666",
    "66666666331111133313333133666666",
    "66666666133333333313333565666666",
    "66666666633333333333677567666666",
    "66666666633333333334367546666666",
    "66666666643333333433411166666666",
    "66666666623345343333541666666666",
    "66666666613316133711147166666666",
    "66666666615166117766155666666666",
    "66666666614466617766666666666666",
    "66666666661166617166666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
  ],
  // Frame 2 — contact
  [
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66665776666666666666666666666666",
    "66666677666666666666666666666666",
    "66666179166666666666666666666666",
    "66666639166666666666666666666666",
    "66666649566666666665666666666666",
    "66666649166666666653366316666666",
    "66666619966511166653699356666666",
    "66666664913333993114393736666666",
    "66666666433333333933341331666666",
    "66666666133333333333376913666666",
    "66666666433333333394777151666666",
    "66666666443343333391161116666666",
    "66666666143314913397661666666666",
    "66666661444966619916641666666666",
    "66666661451451113916144566666666",
    "66666666776166661776617766666666",
    "66666666666666666516666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
  ],
  // Frame 3 — stride left
  [
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666556677777766666666666666",
    "66666666777777777777766666666666",
    "66666666777566666666766666666666",
    "66666666166566666666666666666666",
    "66666666131666666666666666666666",
    "66666666435666666666556656666666",
    "66666666436666666665331134666666",
    "66666666436666666661333346666666",
    "66666666435113333334333334666666",
    "66666666133333333333333533566666",
    "66666666133333333333337747666666",
    "66666666433333333331377451666666",
    "66666661433333333334111176666666",
    "66666614334433343333466666666666",
    "66666649445333343333666666666666",
    "66666636566616712476166666666666",
    "66666146116666644657716666666666",
    "66666166666666141661771666666666",
    "66666611666666116666516666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
    "66666666666666666666666666666666",
  ],
]

// ── Procedural pet (16x16) from core ──
import { generatePixelPet, generatePetAnimation, drawPixelGrid } from '@pipz/core'

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

const SUBTABS = ['walk', 'idle', 'play'] as const
type SubTab = typeof SUBTABS[number]

function AnimPlayer({ frames, label, color }: { frames: Grid[]; label: string; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const S = 7
    canvas.width = 32 * S
    canvas.height = 32 * S
    let f = 0, last = 0
    const speeds: Record<string, number> = { walk: 150, idle: 180, play: 120 }
    const speed = speeds[label] || 150
    function render(t: number) {
      if (t - last >= speed) { last = t; f = (f + 1) % 4; setFrame(f) }
      draw(ctx, frames[f], S)
      requestAnimationFrame(render)
    }
    const id = requestAnimationFrame(render)
    return () => cancelAnimationFrame(id)
  }, [frames, label])

  return (
    <div style={{ background: '#141b2d', borderRadius: 16, padding: 16, textAlign: 'center' }}>
      <canvas ref={ref} style={{ imageRendering: 'pixelated', borderRadius: 8, width: 160, height: 160 }} />
      <div style={{ marginTop: 8, fontWeight: 700, color, fontSize: 14 }}>{label}</div>
      <div style={{ color: '#5a6d85', fontSize: 11, marginTop: 2 }}>4 frames · {label === 'walk' ? '150' : label === 'play' ? '120' : '180'}ms</div>
    </div>
  )
}

export default function AnimTestV2Page() {
  const [subtab, setSubtab] = useState<SubTab>('walk')
  const pRef = useRef<HTMLCanvasElement>(null)

  // Procedural pet demo
  useEffect(() => {
    const canvas = pRef.current!
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const seed = 42
    const pd = generatePixelPet({ seed, rarity: 'rare', evolutionStage: 2 })
    const anim = generatePetAnimation(pd)
    const S = 8
    canvas.width = 16 * S
    canvas.height = 16 * S

    let f = 0, last = 0
    const speed = subtab === 'walk' ? 150 : subtab === 'play' ? 120 : 180
    const frames = subtab === 'walk' ? anim.walkFrames : subtab === 'play' ? anim.playFrames : anim.idleFrames

    function render(t: number) {
      if (t - last >= speed) { last = t; f = (f + 1) % 4 }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawPixelGrid(ctx, frames[f], S, 0, 0)
      requestAnimationFrame(render)
    }
    const id = requestAnimationFrame(render)
    return () => cancelAnimationFrame(id)
  }, [subtab])

  return (
    <div style={{ background: '#0b1120', minHeight: '100dvh', color: '#f0f4f8', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>🐱 Animation Preview v2</h1>
        <p style={{ color: '#94a5b8', fontSize: 14, marginBottom: 8 }}>
          3 actions per pet — walk / idle / play
        </p>
        <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 16, fontStyle: 'italic' }}>
          限測試用 · 未上正式 app
        </p>

        {/* ── PixelLab cat — 3 animations side by side ── */}
        <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8', marginBottom: 12 }}>
          🐱 PixelLab Cat (32×32)
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <AnimPlayer frames={CAT_FRAMES} label="walk" color="#ffa300" />
          {/* idle: frame0 = cat[0], frame1 = blink, frame2/3 = normal variants */}
          <AnimPlayer frames={[CAT_FRAMES[0], CAT_FRAMES[2], CAT_FRAMES[0], CAT_FRAMES[0]]} label="idle" color="#29adff" />
          {/* play: bounce variants of cat frames */}
          <AnimPlayer frames={[CAT_FRAMES[3], CAT_FRAMES[1], CAT_FRAMES[2], CAT_FRAMES[0]]} label="play" color="#ff77a8" />
        </div>

        {/* ── Procedural pet (16×16) — interactive switch ── */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8', marginBottom: 12 }}>
            🎲 Procedural Pet (16×16, seed=42)
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {SUBTABS.map(t => (
              <button key={t}
                onClick={() => setSubtab(t)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                  background: subtab === t ? '#8b5cf6' : '#1a2338',
                  color: subtab === t ? 'white' : '#94a5b8',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}>
                {t === 'walk' ? '🚶 Walk' : t === 'idle' ? '😴 Idle' : '🎉 Play'}
              </button>
            ))}
          </div>
          <div style={{ background: '#141b2d', borderRadius: 16, padding: 24, display: 'flex', justifyContent: 'center' }}>
            <canvas ref={pRef} style={{ imageRendering: 'pixelated', borderRadius: 8 }} />
          </div>
        </div>

        {/* ── Legend ── */}
        <div style={{ marginTop: 24, background: '#141b2d', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8', marginBottom: 8 }}>📋 Animation spec</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, color: '#94a5b8' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e2a45' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>動作</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Frames</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Timing</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #1a2338' }}>
                <td style={{ padding: '4px 8px', color: '#ffa300' }}>🚶 Walk</td>
                <td style={{ padding: '4px 8px' }}>4</td>
                <td style={{ padding: '4px 8px' }}>150ms</td>
                <td style={{ padding: '4px 8px' }}>contact → strideR → contact → strideL</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1a2338' }}>
                <td style={{ padding: '4px 8px', color: '#29adff' }}>😴 Idle</td>
                <td style={{ padding: '4px 8px' }}>4</td>
                <td style={{ padding: '4px 8px' }}>180ms</td>
                <td style={{ padding: '4px 8px' }}>normal → blink → ear twitch → normal</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 8px', color: '#ff77a8' }}>🎉 Play</td>
                <td style={{ padding: '4px 8px' }}>4</td>
                <td style={{ padding: '4px 8px' }}>120ms</td>
                <td style={{ padding: '4px 8px' }}>bounce → squish → stretchR → stretchL</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
