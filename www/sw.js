// Bump CACHE_NAME whenever this file or the precached app shell changes.
const CACHE_NAME = 'iptv-playlistgen-v5-cache';
// v1–v4 served index.html cache-first, so their clients never received new deploys.
const LEGACY_SHELL_CACHE = /^iptv-playlistgen-v[1-4]-cache$/;
const VUE_RUNTIME = 'vendor/vue-3.5.44.global.prod.js';

// './index.html' is not precached: Cloudflare Pages redirects it to './',
// and a redirected response cannot answer a navigation request.
const APP_SHELL = ['./', './manifest.json', './icons/icon.svg', './' + VUE_RUNTIME];
const STATIC_ASSETS = new Set(['manifest.json', 'icons/icon.svg', 'icons/icon.png']);

// Path relative to the SW scope for same-origin URLs, otherwise null
function scopePath(requestUrl) {
  const url = new URL(requestUrl);
  const base = new URL(self.registration.scope);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null;
  return url.pathname.slice(base.pathname.length);
}

// Responses that followed a redirect must be rebuilt before they can answer a navigation
function cleanResponse(response) {
  if (!response || !response.redirected) return response;
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

// App shell HTML: always try the network so a new deploy is used on the next load;
// the cached copy is only an offline fallback.
async function networkFirst(request, isShell) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    const isHtml = (response.headers.get('Content-Type') || '').includes('text/html');
    if (isShell && isHtml && response.ok && response.type === 'basic' && !response.redirected) {
      await cache.put('./', response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match('./');
    return cleanResponse(cached) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

// Versioned vendor files never change
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) {
    event.waitUntil(update);
    return cached;
  }
  return (await update) || new Response('', { status: 504, statusText: 'Network request failed' });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const stale = (await caches.keys()).filter((key) => key !== CACHE_NAME);
    await Promise.all(stale.map((key) => caches.delete(key)));
    await self.clients.claim();
    // Pages opened under a legacy SW still show the old cached index.html — reload them once.
    // Not awaited: those navigations are fetched through this SW, which only starts handling
    // fetches after activation finishes (awaiting here would deadlock).
    if (stale.some((key) => LEGACY_SHELL_CACHE.test(key))) {
      const windows = await self.clients.matchAll({ type: 'window' });
      windows.forEach((client) => client.navigate(client.url).catch(() => {}));
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const path = scopePath(request.url);

  const isShell = path === '' || path === 'index.html';
  if (request.mode === 'navigate' || isShell) {
    event.respondWith(networkFirst(request, isShell));
    return;
  }
  if (path !== null && path.startsWith('vendor/')) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (path !== null && STATIC_ASSETS.has(path)) {
    event.respondWith(staleWhileRevalidate(event, request));
    return;
  }
  // Everything else (playlists, EPG XML, APIs, /epg-proxy, external hosts) goes straight
  // to the network without the SW in between, so aborts and errors reach the page unchanged.
});
