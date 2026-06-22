// Pipz Service Worker — v2
// Cache-first for static assets, network-first for everything else

const CACHE = 'pipz-v2'
const STATIC = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Static assets: cache-first
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(cache => cache.put(request, clone))
        return res
      }))
    )
    return
  }

  // Navigation / API: network-first (fall back to cache offline)
  event.respondWith(
    fetch(request).then(res => {
      const clone = res.clone()
      caches.open(CACHE).then(cache => cache.put(request, clone))
      return res
    }).catch(() => caches.match(request))
  )
})
