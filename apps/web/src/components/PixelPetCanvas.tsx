'use client'

import { useEffect, useRef, useCallback } from 'react'
import { generatePixelPet, renderPixelPetToCanvas, PixelPetData } from '@pipz/core'

interface Props {
  seed: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  evolutionStage: number
  animation?: 'idle' | 'walk' | 'happy' | 'jump'
  size?: number
  style?: React.CSSProperties
  onClick?: () => void
}

export default function PixelPetCanvas({ seed, rarity, evolutionStage, animation = 'idle', size = 5, style, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const petDataRef = useRef<PixelPetData | null>(null)
  const frameRef = useRef<number>(0)
  const xOffsetRef = useRef(0)
  const yOffsetRef = useRef(0)
  const bounceRef = useRef(0)
  const walkDirRef = useRef(1)
  const timeRef = useRef(0)

  // Generate pixel pet data
  useEffect(() => {
    petDataRef.current = generatePixelPet({ seed, rarity, evolutionStage })
  }, [seed, rarity, evolutionStage])

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    const petData = petDataRef.current
    if (!canvas || !petData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pixelSize = (size as number)
    const gridW = petData.width * pixelSize
    const gridH = petData.height * pixelSize
    const canvasW = canvas.width
    const canvasH = canvas.height

    // Calculate offsets based on animation state
    let xOff = 0
    let yOff = 0

    timeRef.current += 0.05

    switch (animation) {
      case 'walk': {
        // Walk left/right
        xOffsetRef.current += 0.3 * walkDirRef.current
        if (xOffsetRef.current > 20) walkDirRef.current = -1
        if (xOffsetRef.current < -20) walkDirRef.current = 1
        xOff = xOffsetRef.current
        // Bob up and down
        yOff = Math.abs(Math.sin(timeRef.current * 4)) * 3
        break
      }
      case 'happy': {
        // Bounce in place
        yOff = Math.abs(Math.sin(timeRef.current * 6)) * 6
        break
      }
      case 'jump': {
        bounceRef.current = Math.max(0, bounceRef.current - 0.08)
        yOff = -(bounceRef.current * 15)
        break
      }
      case 'idle': {
        // Gentle idle bob
        yOff = Math.sin(timeRef.current * 2) * 1.5
        break
      }
    }

    // Clear
    ctx.clearRect(0, 0, canvasW, canvasH)

    // Glow
    if (petData.palette.glow) {
      ctx.shadowColor = petData.palette.glow
      ctx.shadowBlur = pixelSize * 4
    }

    // Center position
    const startX = (canvasW - gridW) / 2 + xOff
    const startY = (canvasH - gridH) / 2 + yOff

    // Draw each pixel
    for (let y = 0; y < petData.height; y++) {
      for (let x = 0; x < petData.width; x++) {
        const color = petData.grid[y][x]
        if (color && color !== 'transparent') {
          ctx.fillStyle = color
          ctx.fillRect(
            startX + x * pixelSize,
            startY + y * pixelSize,
            pixelSize,
            pixelSize
          )
        }
      }
    }

    // Reset shadow
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0

    frameRef.current = requestAnimationFrame(animate)
  }, [animation, size])

  // Start/stop animation loop
  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [animate])

  // Size calculation
  const pixelVal = typeof size === 'number' ? size : 5
  const canvasW = 16 * pixelVal + 60
  const canvasH = 16 * pixelVal + 30

  const handleClick = () => {
    // Trigger jump on click
    bounceRef.current = 1
    onClick?.()
  }

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      onClick={handleClick}
      style={{
        display: 'block',
        cursor: onClick ? 'pointer' : 'default',
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  )
}
