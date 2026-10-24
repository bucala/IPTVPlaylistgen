/**
 * Cloudflare Pages Function: /epg-proxy?url=<encoded-url>
 *
 * Proxies EPG XML files from open-epg.com (which lacks CORS headers) so the
 * app can read them from the web, Android (https://localhost) and desktop (file://).
 * Only URLs matching the known open-epg.com XML pattern are allowed.
 */

const ALLOWED_PATTERN = /^https:\/\/www\.open-epg\.com\/files\/[a-z0-9_-]+\.xml$/i

function reply(body, status, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
      'Content-Type': 'text/plain; charset=utf-8',
      ...extraHeaders,
    },
  })
}

export async function onRequest({ request }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return reply('Method Not Allowed', 405)

  const target = new URL(request.url).searchParams.get('url')
  if (!target || !ALLOWED_PATTERN.test(target)) return reply('Forbidden', 403)

  let upstream
  try {
    upstream = await fetch(target, {
      headers: { 'User-Agent': 'IPTVPlaylistGen/1.0', 'Accept': 'application/xml,text/xml,*/*' },
      cf: { cacheEverything: true, cacheTtl: 3600 },
    })
  } catch {
    return reply('Bad Gateway', 502)
  }
  if (!upstream.ok) return reply(`Upstream HTTP ${upstream.status}`, upstream.status === 404 ? 404 : 502)

  // open-epg.com labels its files application/force-download; the body is XMLTV
  return reply(request.method === 'HEAD' ? null : upstream.body, 200, {
    'Content-Type': 'application/xml',
    'Cache-Control': 'public, max-age=3600',
  })
}
