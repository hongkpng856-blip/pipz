'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children into document.body via React portal with maximum z-index
 * and GPU compositing to defeat any stacking context (Leaflet tiles, etc.).
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null
  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2147483647,
      transform: 'translateZ(0)',
    }}>
      {children}
    </div>,
    document.body
  )
}
