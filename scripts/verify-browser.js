// Autodetect regression test in a real browser (Chromium via Playwright).
// Imports tests/fixtures/autodetect/playlist.m3u through the app's own import, serves the fixture
// EPG files instead of open-epg.com (all other network is blocked), runs Autodetekcia and compares
// every row with tests/fixtures/autodetect/expected.json.
// Usage: npm run verify:browser   (skips with exit 0 when Playwright is not installed)
const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); } catch {
  console.log('SKIP verify:browser — Playwright is not installed (npm i -D playwright && npx playwright install chromium)');
  process.exit(0);
}

const root = path.resolve(__dirname, '..');
const fixtures = path.join(root, 'tests/fixtures/autodetect');
const expected = JSON.parse(fs.readFileSync(path.join(fixtures, 'expected.json'), 'utf8'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { failed = true; console.error(`FAIL ${m}`); };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await context.route('**/*', (route) => {
    const url = decodeURIComponent(route.request().url());
    const epg = url.match(/open-epg\.com\/files\/(slovakia1|czech1)\.xml/);
    if (epg) return route.fulfill({ status: 200, contentType: 'application/xml', path: path.join(fixtures, `${epg[1]}.xml`) });
    if (/open-epg\.com\/files\/\w+\.xml/.test(url)) return route.fulfill({ status: 200, contentType: 'application/xml', body: '<?xml version="1.0"?><tv></tv>' });
    if (url.startsWith(origin)) return route.continue();
    return route.abort('failed');
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(origin + '/');
  await page.waitForSelector('#app[data-v-app]');
  await page.click('.tool-btn:has-text("Import")');
  await page.click('.menu-pop button:has-text("Playlist")');
  await page.setInputFiles('input[type="file"][accept*=".m3u"]', path.join(fixtures, 'playlist.m3u'));
  await page.waitForFunction(() => document.querySelectorAll('.table-shell tbody tr').length >= 12, null, { timeout: 5000 });

  if (await page.$('.tool-btn-primary')) await page.click('.tool-btn-primary');
  else { await page.click('.tool-btn:has-text("Úpravy")'); await page.click('.menu-pop button:has-text("Autodetekcia")'); }
  await page.waitForFunction(() => document.querySelectorAll('.auto-detect-table tbody tr').length >= 12, null, { timeout: 15000 });
  await page.waitForTimeout(300);

  const rows = await page.$$eval('.auto-detect-table tbody tr', (trs) => trs
    .filter((tr) => tr.querySelector('td:nth-child(2) .font-semibold'))
    .map((tr) => ({
      name: tr.querySelector('td:nth-child(2) .font-semibold').textContent.trim(),
      tvgId: tr.querySelector('td:nth-child(3) .mono')?.textContent.trim() || null,
      logo: tr.querySelector('td:nth-child(3) img')?.getAttribute('src') || null,
    })));

  for (const [name, want] of Object.entries(expected)) {
    if (name.startsWith('_')) continue;
    const row = rows.find((r) => r.name === name);
    if (!row) { fail(`${name}: no autodetect row (rows: ${rows.map((r) => r.name).join(', ')})`); continue; }
    const gotId = row.tvgId && row.tvgId !== '—' ? row.tvgId : null;
    if (gotId === want.tvgId) ok(`${name}: TVG-ID ${gotId ?? 'not matched'}`);
    else fail(`${name}: TVG-ID expected ${want.tvgId ?? 'no match'}, got ${gotId ?? 'no match'}`);
    if (want.tvgId === null) continue;
    const gotLogo = row.logo ? row.logo.replace(/^.*\/countries\//, '') : null;
    if (gotLogo === want.logo) ok(`${name}: logo ${gotLogo ?? 'none'}`);
    else fail(`${name}: logo expected ${want.logo ?? 'none'}, got ${row.logo ?? 'none'}`);
  }
  if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
  else ok('no page errors');

  await browser.close();
  server.close();
  process.exit(failed ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(1); });
