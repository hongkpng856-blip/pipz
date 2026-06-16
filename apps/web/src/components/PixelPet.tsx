'use client'

import { useRef, useEffect } from 'react'

interface PixelPetProps {
  color?: string
  size?: number
  animation?: 'idle' | 'walk' | 'happy'
}

const BODY = [
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,1,1,2,2,2,2,1,1,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
  [0,1,2,2,2,3,3,2,2,3,3,2,2,2,1,0],
  [1,2,2,2,3,3,3,3,3,3,3,3,2,2,2,1],
  [1,2,2,2,2,3,3,3,3,3,3,2,2,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,0,0,1,1,2,2,2,2,1,1,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

const C = ['', '#374151', '#a855f7', '#d8b4fe', '#1e293b']

export default function PixelPet({ color, size = 4, animation = 'idle' }: PixelPetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const animRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 16 * size
    canvas.height = 16 * size

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const bob = animation === 'walk' ? Math.sin(frameRef.current * 0.2) * 1.5 : 0

      BODY.forEach((row, y) => {
        row.forEach((val, x) => {
          if (val === 0) return
          ctx.fillStyle = color || C[val] || C[2]
          ctx.fillRect(x * size, y * size + bob, size, size)
        })
      })

      // Eyes
      const eyeY = 6 + (animation === 'happy' ? 0.5 : 0)
      const eyeX = 5
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(eyeX * size, eyeY * size + bob, size * (animation === 'happy' ? 1.5 : 1), size)
      ctx.fillRect((eyeX + 2) * size, eyeY * size + bob, size * (animation === 'happy' ? 1.5 : 1), size)

      frameRef.current++
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [color, size, animation])

  return <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />
}
