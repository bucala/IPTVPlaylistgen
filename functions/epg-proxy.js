/**
 * Cloudflare Pages Function: /epg-proxy?url=<encoded-url>
 *
 * Proxies EPG XML files from open-epg.com (which lacks CORS headers) so the
 * browser app can fetch them cross-origin from iptvplaylistgen.pages.dev.
 * Only URLs matching the known open-epg.com XML pattern are allowed.
 */

const ALLOWED_PATTERN = /^https:\/\/www\.open-epg\.com\/files\/[a-z0-9_-]+\.xml$/i

export async function onRequest({ request }) {
  const { searchParams } = new URL(request.url)
  const target = searchParams.get('url')

  if (!target || !ALLOWED_PATTERN.test(target)) {
    return new Response('Forbidden', { status: 403 })
  }

  const upstream = await fetch(target, {
    headers: { 'User-Agent': 'IPTVPlaylistGen/1.0', 'Accept': 'application/xml,text/xml,*/*' },
    cf: { cacheEverything: true, cacheTtl: 3600 },
  })

  const headers = new Headers()
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/xml')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Cache-Control', 'public, max-age=3600')

  return new Response(upstream.body, { status: upstream.status, headers })
}
