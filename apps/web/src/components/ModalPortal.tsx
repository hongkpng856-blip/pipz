'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children into document.body via React portal.
 * Bypasses stacking context issues from Leaflet, overflow, etc.
 *
 * THREE-PHASE animation to prevent invisible overlay click traps:
 *   Phase 0: children appears → render NOTHING (no DOM, 0 risk)
 *   Phase 1: rAF → render wrapper with opacity:0 + children (still invisible)
 *   Phase 2: rAF → opacity:1 (fade-in begins)
 *
 * Closing: revert Phase 0 instantly (unmount portal content).
 * No fade-out — instant removal is safer than a translucent overlay.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<-1 | 0 | 1 | 2>(-1)
  // -1 = no content (nothing rendered)
  //  0 = visible=false (reserved, not used)
  //  1 = wrapper rendered but opacity 0 (invisible, waiting for fade-in)
  //  2 = fully visible (opacity 1)
  const prevChildren = useRef<ReactNode>(null)
  const rAF1 = useRef<number>(0)
  const rAF2 = useRef<number>(0)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    // Children appears (modal opens)
    if (children && !prevChildren.current) {
      // Phase -1: render nothing
      setPhase(-1)
      cancelAnimationFrame(rAF1.current)
      cancelAnimationFrame(rAF2.current)
      // Phase 1: render invisible wrapper (opacity 0)
      rAF1.current = requestAnimationFrame(() => {
        setPhase(1)
        // Phase 2: fade in
        rAF2.current = requestAnimationFrame(() => {
          setPhase(2)
        })
      })
    }
    // Children disappears (modal closes) — instant removal
    if (!children && prevChildren.current) {
      cancelAnimationFrame(rAF1.current)
      cancelAnimationFrame(rAF2.current)
      setPhase(-1)
    }
    prevChildren.current = children
    return () => {
      cancelAnimationFrame(rAF1.current)
      cancelAnimationFrame(rAF2.current)
    }
  }, [children])

  if (!mounted || phase === -1) return null
  if (phase === 1) {
    // Invisible frame — wrapper exists but no children rendered,
    // so there's NOTHING to catch clicks. No overlay trap possible.
    return createPortal(
      <div className="modal-portal-wrapper"
        style={{
          opacity: 0,
          transform: 'scale(0.92) translateY(16px) translateZ(0)',
          transition: 'none',
          pointerEvents: 'none',
        }}
      />,
      document.body,
    )
  }
  // Phase 2: fully visible with children
  return createPortal(
    <div className="modal-portal-wrapper"
      style={{
        opacity: 1,
        transform: 'scale(1) translateY(0) translateZ(0)',
        transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        WebkitTransition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
