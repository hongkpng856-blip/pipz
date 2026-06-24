'use client'

import { useEffect } from 'react'

export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    }
  }, [])
  return null
}
