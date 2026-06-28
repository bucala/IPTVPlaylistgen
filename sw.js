const CACHE_NAME = 'iptv-playlistgen-v4-cache';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg'
];
const CACHEABLE_PATHS = new Set([
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon.png'
]);

// CDN dependencies — cached on first load so the PWA works offline afterwards
const CDN_DEPS = new Set([
  'https://unpkg.com/vue@3/dist/vue.global.prod.js',
]);

// URLs which must NEVER be served from cache (live playlist/EPG data)
function isNetworkOnly(url) {
  return /\.m3u8?$/i.test(url) ||
         /\.xml(tv)?$/i.test(url) ||
         url.includes('raw.githubusercontent.com') ||
         url.includes('iptv-org') ||
         url.includes('/epg');
}

function isCacheableAppAsset(requestUrl) {
  const url = new URL(requestUrl);
  if (url.origin !== self.location.origin) return false;
  return CACHEABLE_PATHS.has(url.pathname);
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

  // CDN deps (Vue): cache-first so the PWA works offline after the first load
  if (CDN_DEPS.has(event.request.url)) {
    event.respondWith(
      caches.match(event.request).then(async (cached) => {
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          return new Response('', { status: 503, statusText: 'Offline — CDN unavailable' });
        }
      })
    );
    return;
  }

  // Network-only: playlist/EPG data, external resources and user URLs must always be fresh
  if (isNetworkOnly(event.request.url) || !isCacheableAppAsset(event.request.url)) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', {
        status: 504,
        statusText: 'Network request failed'
      }))
    );
    return;
  }

  // Cache-first only for app shell and explicitly listed local static assets
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
