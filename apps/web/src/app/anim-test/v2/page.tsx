'use client'

import { useEffect, useRef, useState } from 'react'
import { generatePixelPet, generatePetAnimation, drawPixelGrid } from '@pipz/core'

// ── Pixel cat from PixelLab (32x32) — walk only ──
type Grid = string[]
const C = [
  '#000000', '#1d2b53', '#7e2553', '#ff77a8',
  '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
  '#29adff', '#ffa300',
]

const CAT_FRAMES: Grid[] = [
  // frame 0
  ["66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666677776666666666666","66666666666667777777766666666666","66666666666667777767776666666666","66666666666677776666776666666666","66666666666677766666656666666666","66666666666776666666566666666666","66666666653776666666336536666666","66666666334666666665333345666666","66666666336666666653333333666666","66666666436666661313333133566666","66666666134333933313333563566666","66666666643333333313377747166666","66666666633333333334464637666666","66666666613333333334411156666666","66666666413333434433333411666666","66666634441333144413331551666666","66666174166133166666666666666666","66666616666633166666666666666666","66666666666644166666666666666666","66666666666617716666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666"],
  // frame 1
  ["66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666661666666666666666666666666","66666617166666666666666666666666","66666177666666666666666666666666","66666177766666666666666666666666","66666667776666666666666666666666","66666665777666666666666666666666","66666666177166666666666666666666","66666666134666666666666666666666","66666661335666666666566666666666","66666661316666666666336636666666","66666661316666666661333346666666","66666661316666661113333331666666","66666666331111133313333133666666","66666666133333333313333565666666","66666666633333333333677567666666","66666666633333333334367546666666","66666666643333333433411166666666","66666666623345343333541666666666","66666666613316133711147166666666","66666666615166117766155666666666","66666666614466617766666666666666","66666666661166617166666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666"],
  // frame 2
  ["66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66665776666666666666666666666666","66666677666666666666666666666666","66666179166666666666666666666666","66666639166666666666666666666666","66666649566666666665666666666666","66666649166666666653366316666666","66666619966511166653699356666666","66666664913333993114393736666666","66666666433333333933341331666666","66666666133333333333376913666666","66666666433333333394777151666666","66666666443343333391161116666666","66666666143314913397661666666666","66666661444966619916641666666666","66666661451451113916144566666666","66666666776166661776617766666666","66666666666666666516666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666"],
  // frame 3
  ["66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666556677777766666666666666","66666666777777777777766666666666","66666666777566666666766666666666","66666666166566666666666666666666","66666666131666666666666666666666","66666666435666666666556656666666","66666666436666666665331134666666","66666666436666666661333346666666","66666666435113333334333334666666","66666666133333333333333533566666","66666666133333333333337747666666","66666666433333333331377451666666","66666661433333333334111176666666","66666614334433343333466666666666","66666649445333343333666666666666","66666636566616712476166666666666","66666146116666644657716666666666","66666166666666141661771666666666","66666611666666116666516666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666"],
]

function drawCat(ctx: CanvasRenderingContext2D, grid: Grid, scale: number) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const ci = parseInt(grid[y][x], 10)
      ctx.fillStyle = C[ci]
      ctx.fillRect(x * scale, y * scale, scale, scale)
    }
  }
}

// ── Seeds for different species ──
const DEMO_SEEDS = [42, 777, 2024, 3301]

function CatWalkPlayer() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const S = 6; canvas.width = 32 * S; canvas.height = 32 * S
    let f = 0, last = 0
    function render(t: number) {
      if (t - last >= 150) { last = t; f = (f + 1) % 4 }
      drawCat(ctx, CAT_FRAMES[f], S)
      requestAnimationFrame(render)
    }
    const id = requestAnimationFrame(render)
    return () => cancelAnimationFrame(id)
  }, [])
  return <canvas ref={ref} style={{ imageRendering: 'pixelated', borderRadius: 8, width: 140, height: 140 }} />
}

// ── Procedural pet player with live animation switching ──
const ANIM_NAMES = ['walk', 'idle', 'play'] as const
const ANIM_LABELS: Record<string, { icon: string; color: string }> = {
  walk: { icon: '🚶', color: '#ffa300' },
  idle: { icon: '😴', color: '#29adff' },
  play: { icon: '🎉', color: '#ff77a8' },
}

function PetPlayer({ seed }: { seed: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [animType, setAnimType] = useState<typeof ANIM_NAMES[number]>('walk')

  // Recreate pet data when seed changes
  const pd = useRef(generatePixelPet({ seed, rarity: 'rare', evolutionStage: 2 }))
  pd.current = generatePixelPet({ seed, rarity: 'rare', evolutionStage: 2 })
  const anim = generatePetAnimation(pd.current)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const S = 10; canvas.width = 16 * S; canvas.height = 16 * S

    let f = 0, last = 0
    const speed = animType === 'walk' ? 150 : animType === 'play' ? 120 : 180
    const frames = animType === 'walk' ? anim.walkFrames : animType === 'play' ? anim.playFrames : anim.idleFrames

    function render(t: number) {
      if (t - last >= speed) { last = t; f = (f + 1) % 4 }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawPixelGrid(ctx, frames[f], S, 0, 0)
      requestAnimationFrame(render)
    }
    const id = requestAnimationFrame(render)
    return () => cancelAnimationFrame(id)
  }, [animType, seed])

  return (
    <div style={{ background: '#141b2d', borderRadius: 16, padding: 16, textAlign: 'center' }}>
      <canvas ref={ref} style={{ imageRendering: 'pixelated', borderRadius: 8, width: 100, height: 100 }} />
      <div style={{ fontSize: 10, color: '#5a6d85', marginTop: 4 }}>#{pd.current.speciesName}</div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {ANIM_NAMES.map(a => (
          <button key={a}
            onClick={() => setAnimType(a)}
            style={{
              flex: 1, padding: '5px 0', borderRadius: 8, border: 'none',
              background: animType === a ? ANIM_LABELS[a].color + '33' : '#1a2338',
              color: animType === a ? ANIM_LABELS[a].color : '#5a6d85',
              fontWeight: 700, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}>
            {ANIM_LABELS[a].icon} {a}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AnimTestV2Page() {
  return (
    <div style={{ background: '#0b1120', minHeight: '100dvh', color: '#f0f4f8', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>🎮 3 動作 Animation Preview</h1>
        <p style={{ color: '#94a5b8', fontSize: 14, marginBottom: 8 }}>
          每隻寵物有 3 個獨立動作：🚶 walk · 😴 idle · 🎉 play
        </p>
        <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 16, fontStyle: 'italic' }}>
          ⚠️ 限測試用 · 未上正式 app
        </p>

        {/* ── PixelLab Cat — walk only ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8', marginBottom: 12 }}>
            🐱 PixelLab Cat (32×32) — 4-frame walk
          </div>
          <div style={{ background: '#141b2d', borderRadius: 16, padding: 20, display: 'flex', justifyContent: 'center' }}>
            <CatWalkPlayer />
          </div>
        </div>

        {/* ── Procedural Pets — 3 actions each ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8', marginBottom: 12 }}>
            🎲 Procedural Pets (16×16) — Walk / Idle / Play
          </div>
          <p style={{ color: '#5a6d85', fontSize: 12, marginBottom: 12 }}>
            Click buttons on each pet to switch animations · All generated procedurally from pixel grid
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {DEMO_SEEDS.map(s => <PetPlayer key={s} seed={s} />)}
          </div>
        </div>

        {/* ── Spec table ── */}
        <div style={{ background: '#141b2d', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8', marginBottom: 8 }}>📋 Animation Spec</div>
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
