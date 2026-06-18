const CACHE_NAME = 'iptv-playlistgen-2.0.0'
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg'
]

function isNetworkOnly(url) {
  return /\.m3u8?$/i.test(url) ||
         /\.xml(tv)?$/i.test(url) ||
         url.includes('raw.githubusercontent.com') ||
         url.includes('iptv-org') ||
         url.includes('/epg')
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  if (isNetworkOnly(event.request.url)) {
    event.respondWith(fetch(event.request))
    return
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) return cached
      try {
        const response = await fetch(event.request)
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(event.request, response.clone())
        }
        return response
      } catch {
        const fallback = await caches.match('/index.html')
        return fallback || new Response('Offline', { status: 503 })
      }
    })
  )
})
