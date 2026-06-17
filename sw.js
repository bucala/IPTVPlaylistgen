const CACHE_NAME = 'iptv-playlistgen-v3-cache';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg'
];

// URLs which must NEVER be served from cache (live playlist/EPG data)
function isNetworkOnly(url) {
  return /\.m3u8?$/i.test(url) ||
         /\.xml(tv)?$/i.test(url) ||
         url.includes('raw.githubusercontent.com') ||
         url.includes('iptv-org') ||
         url.includes('/epg');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Network-only: playlist/EPG data must always be fresh
  if (isNetworkOnly(event.request.url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for app shell and static assets
  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone()); // fix: properly awaited
        }
        return response;
      } catch {
        // Offline fallback: return app shell
        const fallback = await caches.match('./index.html');
        return fallback || new Response('Offline', { status: 503 });
      }
    })
  );
});
