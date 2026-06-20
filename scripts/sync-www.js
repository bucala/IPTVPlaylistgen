const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const copies = [
  ['index.html', 'www/index.html'],
  ['manifest.json', 'www/manifest.json'],
  ['sw.js', 'www/sw.js'],
  ['icons/icon.svg', 'www/icons/icon.svg'],
  ['icons/icon.png', 'www/icons/icon.png'],
];

for (const [from, to] of copies) {
  const source = path.join(root, from);
  const target = path.join(root, to);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`synced ${from} -> ${to}`);
}
