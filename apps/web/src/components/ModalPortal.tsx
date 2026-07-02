'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children into document.body via React portal.
 * This bypasses any parent stacking context issues (e.g. body { position: fixed },
 * overflow: hidden, or Leaflet map's GPU compositing).
 * Falls back to inline rendering on server-side.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null
  return createPortal(children, document.body)
}
