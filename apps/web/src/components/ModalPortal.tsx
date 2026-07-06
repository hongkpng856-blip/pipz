'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children into document.body via React portal.
 * Bypasses stacking context issues from Leaflet, overflow, etc.
 *
 * No animation — instant appearance/disappearance.
 * This avoids ALL invisible-overlay click-trap race conditions.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  return createPortal(
    children ? (
      <div className="modal-portal-wrapper"
        style={{
          opacity: 1,
          transform: 'scale(1) translateY(0) translateZ(0)',
        }}
      >
        {children}
      </div>
    ) : null,
    document.body,
  )
}
