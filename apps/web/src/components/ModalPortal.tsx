'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children into document.body via React portal.
 * Bypasses stacking context issues from Leaflet, overflow, etc.
 * Falls back to inline rendering on server-side.
 *
 * Entrance animation via inline style + single rAF delay, reliable on iOS.
 *
 * CRITICAL: When !open, the wrapper MUST block pointer events on ALL children
 * to prevent invisible overlay click traps. The extra inner wrapper ensures
 * inline pointer-events:none overrides the CSS .modal-portal-wrapper > * rule.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const prevChildren = useRef<ReactNode>(null)
  const rAF = useRef<number>(0)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    // When children appears (modal opens)
    if (children && !prevChildren.current) {
      setOpen(false)           // start invisible
      cancelAnimationFrame(rAF.current)
      rAF.current = requestAnimationFrame(() => {
        setOpen(true)          // fade in on next frame (no flash)
      })
    }
    // When children disappears (modal closes)
    if (!children && prevChildren.current) {
      setOpen(false)
    }
    prevChildren.current = children
    return () => cancelAnimationFrame(rAF.current)
  }, [children])

  if (!mounted) return null

  // When not open, an inner wrapper blocks pointer events on ALL children,
  // overriding the CSS .modal-portal-wrapper > * { pointer-events: auto } rule.
  const animated = children ? (
    <div className="modal-portal-wrapper"
      style={{
        opacity: open ? 1 : 0,
        transform: open
          ? 'scale(1) translateY(0) translateZ(0)'
          : 'scale(0.92) translateY(16px) translateZ(0)',
        transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        WebkitTransition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Inner wrapper blocks clicks when overlay is invisible / animating */}
      <div style={{ pointerEvents: open ? undefined : 'none' }}>
        {children}
      </div>
    </div>
  ) : null

  return createPortal(animated, document.body)
}
