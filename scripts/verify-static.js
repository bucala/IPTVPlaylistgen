const fs = require('fs');
const path = require('path');
const { templateBindings, setupBindings } = require('./template-bindings');

const root = path.resolve(__dirname, '..');
const vendorFiles = fs.readdirSync(path.join(root, 'vendor')).filter((name) => name.endsWith('.js'));
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

  if (/function\s+toggleSourcesPanel\(\)/.test(html) && /@click\.stop="toggleSourcesPanel"/.test(html)) {
    ok(`${rel} has an explicit sources panel toggle`);
  } else {
    fail(`${rel} may leave the autodetect sources panel stuck open or closed`);
  }

  if (!/:disabled="r\.score === 0 \|\| r\.alreadyVerified"/.test(html) && /@input="markAutoDetectManual\(r\)"/.test(html)) {
    ok(`${rel} applies manually edited autodetect rows`);
  } else {
    fail(`${rel} still blocks applying manual autodetect edits`);
  }

  // Guard: every identifier the template reads must be returned from setup(). With the
  // production Vue build a missing binding is silently undefined and dereferencing it crashes
  // the whole render — the blank "black screen" (sourcesPanelOpen regression).
  const exposed = setupBindings(html);
  const templateNames = templateBindings(html);
  const missingBindings = [...templateNames].filter((name) => !exposed.has(name));
  if (templateNames.size < 50) fail(`${rel} template binding scan found only ${templateNames.size} names; scanner is broken`);
  else if (missingBindings.length) fail(`${rel} template reads bindings that setup() does not return: ${missingBindings.join(', ')}`);
  else ok(`${rel} template reads only bindings returned from setup() (${templateNames.size})`);

  // Vue must be the vendored, pinned build: a CDN can be offline or silently ship a new release
  if (/<script[^>]+src=["']https?:\/\//i.test(html)) fail(`${rel} loads a script from a remote origin`);
  else ok(`${rel} loads no scripts from remote origins`);
  const vueSrc = html.match(/<script src="\.\/(vendor\/vue-(\d+\.\d+\.\d+)\.global\.prod\.js)"><\/script>/);
  const vueFile = vueSrc && path.join(path.dirname(rel), vueSrc[1]);
  if (vueFile && fs.existsSync(path.join(root, vueFile)) && read(vueFile).slice(0, 80).includes(`vue v${vueSrc[2]}\n`)) {
    ok(`${rel} loads vendored Vue ${vueSrc[2]}`);
  } else {
    fail(`${rel} must load an existing vendor/vue-<version>.global.prod.js`);
  }
  if (vueSrc && read('sw.js').includes(`'${vueSrc[1]}'`)) ok(`${rel} Vue runtime is precached by sw.js`);
  else fail(`${rel} Vue runtime is not precached by sw.js (VUE_RUNTIME)`);

  if (/app\.config\.errorHandler\s*=/.test(html) && /id="app-fatal"/.test(html) && /function showAppFatal\(/.test(html)) {
    ok(`${rel} shows a fallback panel instead of a blank screen on render errors`);
  } else {
    fail(`${rel} has no render-error fallback (app.config.errorHandler + #app-fatal)`);
  }

  // On phones the channel cards must not form a nested scroller: with overscroll-behavior: contain
  // a finger swipe that starts on a card is swallowed and the page does not scroll.
  const mobileCss = [...html.matchAll(/@media \(max-width: 640px\) \{[\s\S]*?\n    \}/g)].map((m) => m[0]).join('\n');
  const coarseCss = html.match(/@media \(pointer: coarse\) \{[\s\S]*?\n    \}/)?.[0] || '';
  if (/\.table-shell:not\(\.auto-detect-table\)\s*\{[^}]*overflow:\s*visible;[^}]*overscroll-behavior:\s*auto/.test(mobileCss)
    && /\.table-shell:not\(\.auto-detect-table\)\s*\{[^}]*max-height:\s*none;[^}]*overscroll-behavior:\s*auto/.test(coarseCss)) {
    ok(`${rel} lets finger swipes on the channel list scroll the page (phones, landscape, tablets)`);
  } else {
    fail(`${rel} mobile channel cards may trap touch scrolling (need overflow: visible; overscroll-behavior: auto)`);
  }

  if (['import', 'export', 'edit', 'settings'].every((name) => html.includes(`toggleMenu('${name}'`))
    && /modal\.filter = true/.test(html) && !/role="tablist"/.test(html)) {
    ok(`${rel} groups header actions into Import/Export/Edit/Settings menus with a Filter window`);
  } else {
    fail(`${rel} header actions are not grouped into menus (or the tab bar is back)`);
  }

  if (/v-if="modal\.autoDetect" class="modal-overlay modal-fullscreen"/.test(html)
    && /\.modal-overlay\.modal-fullscreen > \.modal-card \{[^}]*height: 100dvh/.test(html)) {
    ok(`${rel} opens autodetect as a full-screen window`);
  } else {
    fail(`${rel} autodetect window is not full-screen`);
  }

  const runAutoDetectFetch = html.match(/async function fetchAndRunAutoDetect\(\)[\s\S]*?\n    \}\n/)?.[0] || '';
  if (/urls\.map\(async source => \{[\s\S]*?try \{[\s\S]*?fetchTextWithLimit[\s\S]*?\} catch/.test(runAutoDetectFetch)) {
    ok(`${rel} isolates failures of individual autodetect sources`);
  } else {
    fail(`${rel} lets one failing autodetect source abort the whole run`);
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
  ...vendorFiles.map((name) => [`vendor/${name}`, `www/vendor/${name}`]),
]) {
  if (fs.existsSync(path.join(root, right)) && sameFile(left, right)) ok(`${right} matches ${left}`);
  else fail(`${right} differs from ${left}; run npm run sync:www`);
}

const staleWwwVendor = fs.existsSync(path.join(root, 'www/vendor'))
  ? fs.readdirSync(path.join(root, 'www/vendor')).filter((name) => !vendorFiles.includes(name))
  : [];
if (staleWwwVendor.length) fail(`www/vendor has files no longer in vendor/: ${staleWwwVendor.join(', ')}`);
else ok('www/vendor has no stale files');

// Service worker: index.html must be network-first, otherwise visitors keep a cached
// (possibly broken) app shell forever and never receive fixes
const sw = read('sw.js');
const swCacheName = sw.match(/const CACHE_NAME = '([^']+)'/)?.[1] || '';
if (!swCacheName || /^iptv-playlistgen-v[1-4]-cache$/.test(swCacheName)) fail('sw.js must use a cache name newer than the cache-first v1–v4 shells');
else ok(`sw.js cache ${swCacheName}`);
const networkFirst = sw.match(/async function networkFirst[\s\S]*?\n\}/)?.[0] || '';
if (/request\.mode === 'navigate'[\s\S]{0,80}networkFirst\(/.test(sw)
  && networkFirst.includes('await fetch(')
  && networkFirst.indexOf('await fetch(') < networkFirst.indexOf('cache.match(')) {
  ok('sw.js serves the app shell network-first');
} else {
  fail('sw.js may serve a stale index.html from cache; navigations must be network-first');
}
if (/LEGACY_SHELL_CACHE[\s\S]*client\.navigate\(/.test(sw)) ok('sw.js reloads pages still running a legacy cached shell');
else fail('sw.js does not reload pages that a legacy cache-first SW is still serving');


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
