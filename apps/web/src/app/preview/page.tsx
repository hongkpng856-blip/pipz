'use client'

import { useEffect, useRef } from 'react'

export default function PreviewPage() {
  const sheetRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const W = 128, H = 128

      // ── Draw sprite sheet ──
      const sheet = sheetRef.current
      if (sheet) {
        const sx = sheet.getContext('2d')!
        sheet.width = W * 8
        sheet.height = H + 30
        sx.imageSmoothingEnabled = false
        sx.fillStyle = '#0b1120'
        sx.fillRect(0, 0, sheet.width, sheet.height)

        // Frame 0: original
        sx.drawImage(img, 0, 0)
        // Frame 1: blink
        sx.drawImage(img, W, 0)
        sx.fillStyle = '#1e293b'
        sx.fillRect(W + 48, 52, 8, 3)
        sx.fillRect(W + 72, 52, 8, 3)
        // Frame 2: original
        sx.drawImage(img, W * 2, 0)
        // Frame 3: blink
        sx.drawImage(img, W * 3, 0)
        sx.fillRect(W * 3 + 48, 52, 8, 3)
        sx.fillRect(W * 3 + 72, 52, 8, 3)
        // Frame 4: walk L
        sx.drawImage(img, 4, 0, W - 4, H, W * 4, 0, W - 4, H)
        // Frame 5: walk R
        sx.drawImage(img, 0, 0, W - 4, H, W * 5 + 4, 0, W - 4, H)
        // Frame 6: sleep
        sx.drawImage(img, W * 6, 0)
        sx.strokeStyle = '#1e293b'
        sx.lineWidth = 3
        sx.beginPath()
        sx.moveTo(W * 6 + 44, 56); sx.lineTo(W * 6 + 56, 56)
        sx.moveTo(W * 6 + 72, 56); sx.lineTo(W * 6 + 84, 56)
        sx.stroke()
        // Frame 7: happy
        sx.drawImage(img, W * 7, -4)

        // Labels
        sx.fillStyle = '#ffffff88'
        sx.font = '12px sans-serif'
        sx.textAlign = 'center'
        const labels = ['idle', 'blink', '', 'blink', 'walk←', 'walk→', 'sleep', 'happy']
        labels.forEach((t, i) => { if (t) sx.fillText(t, W * i + W / 2, H + 20) })
      }

      // ── Animated preview (4-frame walk cycle) ──
      const ac = animRef.current
      if (ac) {
        ac.width = W
        ac.height = H
        const ax = ac.getContext('2d')!
        ax.imageSmoothingEnabled = false
        const W2 = W, H2 = H
        let frame = 0, timer = 0

        const walkFrames = [
          // [srcX, srcY, srcW, srcH, dstX, dstY]
          [0, 0, W2, H2, 0, 0],          // neutral
          [4, 0, W2 - 4, H2, 0, 0],      // left shift
          [0, 0, W2, H2, 0, 0],          // neutral
          [0, 0, W2 - 4, H2, 4, 0],      // right shift
        ]

        const animate = () => {
          timer++
          if (timer > 10) { timer = 0; frame = (frame + 1) % 4 }
          ax.clearRect(0, 0, W2, H2)
          const bob = Math.sin(frame * Math.PI / 2) * 2
          const [sx, sy, sw, sh, dx, dy] = walkFrames[frame]
          ax.drawImage(img, sx, sy, sw, sh, dx, dy + bob, sw, sh)

          // Draw feet
          ax.fillStyle = '#0b1120'
          ax.fillRect(0, 0, W2, 4)
          ax.fillStyle = '#1e293b'
          if (frame === 0) { ax.fillRect(52, 110, 8, 14); ax.fillRect(70, 110, 8, 14) }
          else if (frame === 1) { ax.fillRect(46, 110, 8, 14); ax.fillRect(74, 110, 8, 14) }
          else if (frame === 2) { ax.fillRect(52, 110, 8, 14); ax.fillRect(70, 110, 8, 14) }
          else if (frame === 3) { ax.fillRect(56, 110, 8, 14); ax.fillRect(66, 110, 8, 14) }

          rafRef.current = requestAnimationFrame(animate)
        }
        animate()
      }
    }
    img.src = '/pixel-gen/sprites/0.png?v=v6'
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  return (
    <div style={{
      background: '#0b1120', minHeight: '100dvh',
      color: '#f0f4f8', fontFamily: 'system-ui, sans-serif',
      padding: 20, maxWidth: 800, margin: '0 auto',
    }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>🎬 寵物動畫 Preview</h1>
      <p style={{ color: '#94a5b8', fontSize: 13, marginBottom: 20 }}>
        Sprite 0.png — 圓貓 · 8 frames sprite sheet
      </p>

      {/* Sprite Sheet */}
      <div style={{
        background: '#141b2d', borderRadius: 16, padding: 16, marginBottom: 16,
      }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, color: '#8b5cf6' }}>Sprite Sheet（8 frames）</h2>
        <canvas ref={sheetRef} style={{ width: '100%', height: 'auto', imageRendering: 'pixelated' }} />
      </div>

      {/* Animated Walk Cycle */}
      <div style={{
        background: '#141b2d', borderRadius: 16, padding: 16, marginBottom: 16,
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, color: '#8b5cf6' }}>Walk Cycle Animation</h2>
        <canvas ref={animRef} style={{
          width: 256, height: 256,
          imageRendering: 'pixelated',
          borderRadius: 12, margin: '0 auto',
          background: '#0b1120',
        }} />
        <p style={{ color: '#5a6d85', fontSize: 11, marginTop: 8 }}>
          4-frame walk cycle · 腳步交替 + body bob
        </p>
      </div>

      {/* Frame descriptions */}
      <div style={{
        background: '#141b2d', borderRadius: 16, padding: 16,
      }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, color: '#8b5cf6' }}>Frame 說明</h2>
        <table style={{ width: '100%', fontSize: 12, color: '#94a5b8', borderCollapse: 'collapse' }}>
          <thead><tr style={{ color: '#f0f4f8' }}><th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #1e2a45' }}>Frame</th><th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #1e2a45' }}>Type</th><th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #1e2a45' }}>效果</th></tr></thead>
          <tbody>
            <tr><td style={{ padding: '4px 8px' }}>0</td><td style={{ padding: '4px 8px' }}>idle</td><td style={{ padding: '4px 8px' }}>原圖</td></tr>
            <tr><td style={{ padding: '4px 8px' }}>1</td><td style={{ padding: '4px 8px' }}>blink</td><td style={{ padding: '4px 8px' }}>眨眼（眼仔遮黑條）</td></tr>
            <tr><td style={{ padding: '4px 8px' }}>2</td><td style={{ padding: '4px 8px' }}>idle</td><td style={{ padding: '4px 8px' }}>原圖</td></tr>
            <tr><td style={{ padding: '4px 8px' }}>3</td><td style={{ padding: '4px 8px' }}>blink</td><td style={{ padding: '4px 8px' }}>眨眼</td></tr>
            <tr><td style={{ padding: '4px 8px' }}>4</td><td style={{ padding: '4px 8px' }}>walk←</td><td style={{ padding: '4px 8px' }}>身體左移 + 腳步交替</td></tr>
            <tr><td style={{ padding: '4px 8px' }}>5</td><td style={{ padding: '4px 8px' }}>walk→</td><td style={{ padding: '4px 8px' }}>身體右移 + 腳步交替</td></tr>
            <tr><td style={{ padding: '4px 8px' }}>6</td><td style={{ padding: '4px 8px' }}>sleep</td><td style={{ padding: '4px 8px' }}>眼瞓 — — 眼</td></tr>
            <tr><td style={{ padding: '4px 8px' }}>7</td><td style={{ padding: '4px 8px' }}>happy</td><td style={{ padding: '4px 8px' }}>跳起</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
