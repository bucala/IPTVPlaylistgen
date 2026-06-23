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
    'https://www.open-epg.com/files/slovakia1.xml',
    'https://www.open-epg.com/files/czech1.xml',
  ]) {
    if (html.includes(brokenUrl)) fail(`${rel} still references ${brokenUrl}`);
    else ok(`${rel} does not reference ${brokenUrl}`);
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
  const headers = read(rel);
  if (/script-src[^\n]*'unsafe-eval'[^\n]*https:\/\/unpkg\.com/.test(headers)) {
    ok(`${rel} allows Vue in-browser template compilation`);
  } else {
    fail(`${rel} CSP must allow unsafe-eval while using the browser Vue compiler from unpkg`);
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
