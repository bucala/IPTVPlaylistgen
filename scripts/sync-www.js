const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const copies = [
  ['index.html', 'www/index.html'],
  ['manifest.json', 'www/manifest.json'],
  ['sw.js', 'www/sw.js'],
  ['_headers', 'www/_headers'],
  ['_redirects', 'www/_redirects'],
  ['icons/icon.svg', 'www/icons/icon.svg'],
  ['icons/icon.png', 'www/icons/icon.png'],
  // vendored runtime libraries (vendor/vue-x.y.z.global.prod.js)
  ...fs.readdirSync(path.join(root, 'vendor'))
    .filter((name) => name.endsWith('.js'))
    .map((name) => [`vendor/${name}`, `www/vendor/${name}`]),
];

for (const [from, to] of copies) {
  const source = path.join(root, from);
  const target = path.join(root, to);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`synced ${from} -> ${to}`);
}
