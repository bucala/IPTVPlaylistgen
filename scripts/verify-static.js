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
]) {
  if (sameFile(left, right)) ok(`${right} matches ${left}`);
  else fail(`${right} differs from ${left}; run npm run sync:www`);
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
