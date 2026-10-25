// Refreshes the TV_LOGOS snapshot in index.html from github.com/tv-logo/tv-logos.
// Usage: node scripts/update-tv-logos.js            (GitHub contents API; GITHUB_TOKEN raises the rate limit)
//        node scripts/update-tv-logos.js --from DIR  (DIR/slovakia.json and DIR/czech-republic.json, same format)
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const FOLDERS = { slovakia: 'sk', 'czech-republic': 'cz' };

async function listing(folder, fromDir) {
  if (fromDir) return JSON.parse(fs.readFileSync(path.join(fromDir, `${folder}.json`), 'utf8'));
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'iptvplaylistgen-logo-update' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/repos/tv-logo/tv-logos/contents/countries/${folder}?ref=main`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${folder}`);
  return res.json();
}

function wrap(names) {
  const lines = [];
  let line = '   ';
  for (const name of names) {
    if (line.length + name.length + 1 > 114) { lines.push(line); line = '   '; }
    line += ' ' + name;
  }
  lines.push(line);
  return lines.join('\n');
}

(async () => {
  const fromIdx = process.argv.indexOf('--from');
  const fromDir = fromIdx > 0 ? process.argv[fromIdx + 1] : '';
  const html = fs.readFileSync(htmlPath, 'utf8');
  const start = html.indexOf('const TV_LOGOS = {');
  const end = html.indexOf('\n}\n', start) + 3;
  if (start < 0 || end < 3) throw new Error('TV_LOGOS block not found in index.html');
  const current = html.slice(start, end);

  const lists = {};
  for (const [folder, cc] of Object.entries(FOLDERS)) {
    const names = (await listing(folder, fromDir))
      .filter((item) => item.type === 'file' && item.name.endsWith('.png'))
      .map((item) => item.name.slice(0, -4))
      .filter((name) => new RegExp(`-${cc}$`).test(name))
      .sort();
    if (names.length < 10) throw new Error(`Suspiciously few logos for ${folder}: ${names.length}`);
    const before = (current.match(new RegExp(`${folder === 'slovakia' ? 'slovakia' : "'czech-republic'"}: \`([^\`]*)\``)) || [])[1]?.split(/\s+/).filter(Boolean) || [];
    const added = names.filter((n) => !before.includes(n));
    const removed = before.filter((n) => !names.includes(n));
    console.log(`${folder}: ${names.length} logos (+${added.length} -${removed.length})${added.length ? ' added: ' + added.join(', ') : ''}${removed.length ? ' removed: ' + removed.join(', ') : ''}`);
    lists[folder] = names;
  }

  const block = `const TV_LOGOS = {\n  slovakia: \`\n${wrap(lists.slovakia)}\`,\n  'czech-republic': \`\n${wrap(lists['czech-republic'])}\`,\n}\n`;
  if (block === current) { console.log('TV_LOGOS is up to date'); return; }
  const today = new Date().toISOString().slice(0, 10);
  const updated = (html.slice(0, start) + block + html.slice(end))
    .replace(/(countries\/czech-republic \()\d{4}-\d{2}-\d{2}(\):)/, `$1${today}$2`);
  fs.writeFileSync(htmlPath, updated);
  console.log(`index.html updated (snapshot date ${today}); run npm run sync:www`);
})().catch((error) => { console.error(error.message); process.exit(1); });
