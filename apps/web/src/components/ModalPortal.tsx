'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children into document.body via React portal.
 * Bypasses stacking context issues from Leaflet, overflow, etc.
 * Falls back to inline rendering on server-side.
 *
 * Wraps children with entrance animation (fade + scale) using CSS transitions.
 * Double rAF ensures browser paints the initial invisible state before
 * the transition starts — reliable on iOS Safari.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [entered, setEntered] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // When children appear (non-null), trigger entrance animation
  useEffect(() => {
    if (children) {
      setEntered(false)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true))
      })
      return () => cancelAnimationFrame(id)
    } else {
      setEntered(false)
    }
  }, [children])

  if (!mounted) return null

  const animatedChildren = children ? (
    <div className="modal-portal-wrapper" data-entered={entered ? 'true' : 'false'}>
      {children}
    </div>
  ) : null

  return createPortal(animatedChildren, document.body)
}
