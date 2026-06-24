const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let failed = false;

function fail(message) {
  failed = true;
  console.error(`FAIL ${message}`);
}

function ok(message) {
  console.log(`OK ${message}`);
}

function assert(condition, message) {
  if (condition) ok(message);
  else fail(message);
}

function extract(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  if (from === -1 || to === -1 || to <= from) {
    throw new Error(`Unable to extract block from ${start} to ${end}`);
  }
  return html.slice(from, to);
}

const aliasBlock = extract('const CHANNEL_TVG_ALIASES = [', 'createApp({');
const autodetectFunctions = extract('function stripChannelDecorations', 'function strSimilarity');
const parseFunctions = extract('function parseExtinf', 'function detectQuality');
const detectQualityBlock = extract('function detectQuality', 'function exportPlaylist');

const sandbox = {
  module: { exports: {} },
};

vm.createContext(sandbox);
vm.runInContext(`
${aliasBlock}
${autodetectFunctions}
${parseFunctions}
${detectQualityBlock}
module.exports = {
  stripChannelDecorations,
  normName,
  cleanTvgId,
  tvgCountry,
  pickPreferredEntry,
  tvgIdVariants,
  nameTvgIdVariants,
  preferredCandidateHit,
  aliasTvgIdVariants,
  parseExtinf,
  detectQuality,
};
`, sandbox, { filename: 'autodetect-regressions.vm.js' });

const {
  stripChannelDecorations,
  normName,
  cleanTvgId,
  tvgCountry,
  pickPreferredEntry,
  tvgIdVariants,
  nameTvgIdVariants,
  preferredCandidateHit,
  aliasTvgIdVariants,
  parseExtinf,
  detectQuality,
} = sandbox.module.exports;

const dirtyNames = [
  ['(1080p) Doma HD.sk [Not 24/7]', 'Doma HD.sk'],
  ['[Not 24/7] DajTo (720p)', 'DajTo'],
  ['SK: Markiza HD', 'Markiza HD'],
  ['Slovenské - JOJ Svet [Backup]', 'JOJ Svet'],
  ['Prima LOVE [Geo-blocked]', 'Prima LOVE'],
  ['Prima MAX ©', 'Prima MAX'],
  ['TV Nova Ⓢ', 'TV Nova'],
];

for (const [input, expected] of dirtyNames) {
  assert(stripChannelDecorations(input) === expected, `strips playlist decorations from "${input}"`);
}

assert(normName('(1080p) DOMA HD.sk [Not 24/7]') === 'doma', 'normalizes decorated DOMA to canonical name');
assert(normName('SK: Markiza HD') === 'markiza', 'normalizes prefixed Markiza HD');
assert(cleanTvgId('(720p) Doma HD.sk@SD') === 'Doma.sk', 'cleans decorated tvg-id and quality suffix');
assert(tvgCountry('Dajto.sk') === 'sk', 'detects SK tvg-id country');
assert(tvgCountry('Dajto.cz') === 'cz', 'detects CZ tvg-id country');

const preferred = pickPreferredEntry([
  { id: 'Doma.cz', name: 'Doma CZ' },
  { id: 'Doma.sk', name: 'Doma SK' },
]);
assert(preferred?.id === 'Doma.sk', 'prefers Slovak metadata entries before Czech entries');

const hit = preferredCandidateHit(
  ['Doma.cz', 'Doma.sk', 'Doma.us'],
  [{ 'doma.cz': 'cz.xml', 'doma.sk': 'sk.xml' }]
);
assert(hit?.id === 'Doma.sk' && hit.url === 'sk.xml', 'prefers SK EPG URL before CZ fallback');

const aliasCases = [
  ['DOMA', 'Doma.sk'],
  ['DajTo', 'Dajto.sk'],
  ['JOJ Svet', 'JOJSvet.sk'],
  ['Wau', 'Wau.sk'],
  ['Markíza', 'Markiza.sk'],
  ['TA3', 'TA3.sk'],
  ['Jednotka', 'Jednotka.sk'],
  ['Dvojka', 'Dvojka.sk'],
];

for (const [name, expected] of aliasCases) {
  const ids = aliasTvgIdVariants({ name, tvg_name: '', tvg_id: '' });
  assert(ids[0] === expected, `maps ${name} to primary ${expected}`);
}

const parsed = parseExtinf('#EXTINF:-1 tvg-id="Doma.sk@HD" tvg-name="(1080p) DOMA HD [Not 24/7]" tvg-logo="https://example.test/logo.png",SK: DOMA HD');
assert(parsed.name === 'DOMA HD', 'parseExtinf strips visible channel prefix/decorations');
assert(parsed.tvg_name === 'DOMA HD', 'parseExtinf strips tvg-name prefix/decorations');
assert(parsed.quality === 'FHD', 'parseExtinf keeps quality detection from raw channel name');

assert(JSON.stringify(tvgIdVariants('Dajto.sk')) === JSON.stringify(['Dajto.sk', 'Dajto.cz']), 'tvgIdVariants orders SK before CZ');
assert(JSON.stringify(nameTvgIdVariants('JOJ Svet')) === JSON.stringify(['jojsvet.sk', 'jojsvet.cz']), 'nameTvgIdVariants creates SK then CZ fallbacks');
assert(detectQuality('(720p) DajTo') === 'HD', 'detectQuality recognizes decorated 720p source names');

process.exit(failed ? 1 : 0);
