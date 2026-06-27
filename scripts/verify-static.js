const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let failed = false;

function fail(message) {
  failed = true;
  console.error(`FAIL ${message}`);
}

function ok(message) {
  console.log(`OK ${message}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function sameFile(left, right) {
  return fs.readFileSync(path.join(root, left)).equals(fs.readFileSync(path.join(root, right)));
}

for (const rel of ['index.html', 'www/index.html']) {
  const html = read(rel);
  if (/^(?:<<<<<<<|=======|>>>>>>>)/m.test(html)) fail(`${rel} contains unresolved merge conflict markers`);
  else ok(`${rel} has no merge conflict markers`);

  if (!/<\/body>/i.test(html)) fail(`${rel} is missing </body>`);
  else ok(`${rel} has </body>`);

  if (!/<\/html>\s*$/i.test(html)) fail(`${rel} is missing closing </html>`);
  else ok(`${rel} has closing </html>`);

  if (/cdn\.tailwindcss\.com/i.test(html)) fail(`${rel} loads Tailwind from the browser CDN`);
  else ok(`${rel} does not load Tailwind from the browser CDN`);

  if (!/<meta\s+name=["']mobile-web-app-capable["']\s+content=["']yes["']/i.test(html)) {
    fail(`${rel} is missing mobile-web-app-capable meta`);
  } else ok(`${rel} has mobile-web-app-capable meta`);

  for (const mobileGuard of [
    ['safe-area mobile padding', /env\(safe-area-inset-(left|right|top|bottom)/],
    ['mobile modal sheet rules', /\.modal-card\.mobile-sheet/],
    ['mobile auto-detect card rules', /\.auto-detect-card/],
    ['mobile auto-detect edit grid rules', /\.auto-detect-edit-grid\s*\{\s*grid-template-columns:\s*1fr\s*!important/],
    ['horizontal overflow guard', /body\s*\{\s*overflow-x:\s*hidden/],
  ]) {
    if (mobileGuard[1].test(html)) ok(`${rel} has ${mobileGuard[0]}`);
    else fail(`${rel} is missing ${mobileGuard[0]}`);
  }

  for (const brokenUrl of [
    'https://iptv-org.github.io/epg/channels.json',
    'https://raw.githubusercontent.com/iptv-org/iptv/master/index.m3u',
  ]) {
    if (html.includes(brokenUrl)) fail(`${rel} still references ${brokenUrl}`);
    else ok(`${rel} does not reference ${brokenUrl}`);
  }

  for (const allowedTvgUrl of [
    'https://www.open-epg.com/files/slovakia1.xml',
    'https://www.open-epg.com/files/slovakia2.xml',
    'https://www.open-epg.com/files/slovakia3.xml',
    'https://www.open-epg.com/files/czech1.xml',
    'https://www.open-epg.com/files/czech3.xml',
    'https://www.open-epg.com/files/czech4.xml',
  ]) {
    if (html.includes(allowedTvgUrl)) ok(`${rel} includes allowed TVG URL ${allowedTvgUrl}`);
    else fail(`${rel} is missing allowed TVG URL ${allowedTvgUrl}`);
  }

  if (/epg-globe-sk[\s\S]{0,300}metadataOnly:\s*true/.test(html)) {
    ok(`${rel} keeps Globe SK metadata-only`);
  } else {
    fail(`${rel} may copy Globe SK into TVG URL`);
  }

  if (/v-if="expandedRows\.has\(r\.ch\.id\)"/.test(html) && !/expandedRows\.has\(r\.ch\.id\)\s*&&\s*r\.score/.test(html)) {
    ok(`${rel} allows manual expansion for unmatched channels`);
  } else {
    fail(`${rel} still blocks expansion for unmatched channels`);
  }

  if (/manualSuggestionCache/.test(html) && /autoDetectCandidateBuckets/.test(html)) {
    ok(`${rel} pre-indexes and caches manual suggestions`);
  } else {
    fail(`${rel} is missing manual suggestion indexing`);
  }

  if (/najviac 10 EPG XML zdrojov|at most 10 EPG XML sources/.test(html) && !/epgXmlSourceCount\(\)\s*>=\s*8/.test(html)) {
    ok(`${rel} raises EPG XML source limit to 10`);
  } else {
    fail(`${rel} does not consistently raise EPG XML source limit to 10`);
  }

  if (/url-tvg=/.test(html) && /x-tvg-url=/.test(html)) {
    ok(`${rel} exports EPG URLs in the M3U header`);
  } else {
    fail(`${rel} does not export EPG URLs in the M3U header`);
  }

  if (/const\s+chNorm\s*=\s*normName\(ch\.name\)\s*\|\|\s*normName\(ch\.tvg_name\)/.test(html)) {
    ok(`${rel} matches autodetect primarily from the visible channel name`);
  } else {
    fail(`${rel} may let stale TVG-NAME override channel-name autodetect`);
  }

  if (!/exactEpgNameForHit[\s\S]{0,180}cleanEpgDisplayName/.test(html)
    && !/epgXmlDisplayNameIndex\.value\[hit\.key\]\)\s*result\.editName\s*=\s*cleanEpgDisplayName/.test(html)
    && !/epgNameDisplayNameIndex\.value\[nameKey\]\)\s*result\.editName\s*=\s*cleanEpgDisplayName/.test(html)) {
    ok(`${rel} preserves raw XMLTV display-names in autodetect`);
  } else {
    fail(`${rel} still strips raw XMLTV display-names during autodetect`);
  }

  const inlineScripts = html
    .split(/<script(?![^>]*src=)[^>]*>/i)
    .slice(1)
    .map((part) => part.split(/<\/script>/i)[0]);

  inlineScripts.forEach((code, index) => {
    try {
      new Function(code);
      ok(`${rel} inline script ${index + 1} parses`);
    } catch (error) {
      fail(`${rel} inline script ${index + 1} does not parse: ${error.message}`);
    }
  });
}

for (const [left, right] of [
  ['index.html', 'www/index.html'],
  ['manifest.json', 'www/manifest.json'],
  ['sw.js', 'www/sw.js'],
  ['_headers', 'www/_headers'],
  ['_redirects', 'www/_redirects'],
  ['icons/icon.svg', 'www/icons/icon.svg'],
  ['icons/icon.png', 'www/icons/icon.png'],
]) {
  if (sameFile(left, right)) ok(`${right} matches ${left}`);
  else fail(`${right} differs from ${left}; run npm run sync:www`);
}


for (const rel of ['_headers', 'www/_headers']) {
  const cspLine = read(rel).split(/\n/).find((line) => line.includes('Content-Security-Policy')) || '';
  if (/script-src[^\n;]*'unsafe-eval'/.test(cspLine)) {
    ok(`${rel} allows Vue runtime template compilation`);
  } else {
    fail(`${rel} CSP blocks Vue runtime template compilation; keep 'unsafe-eval' until templates are precompiled`);
  }
}

const capacitor = JSON.parse(read('capacitor.config.json'));
if (capacitor.appId === 'com.bucala.iptvplaylistgen' && capacitor.appName === 'IPTV Playlist Generator') {
  ok('Capacitor app identity is consistent');
} else {
  fail('Capacitor app identity is not consistent');
}

const manifest = read('android/app/src/main/AndroidManifest.xml');
if (/android:allowBackup="false"/.test(manifest)) ok('Android backup is disabled');
else fail('Android backup is not disabled');

process.exit(failed ? 1 : 0);
