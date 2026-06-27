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

const aliasBlock = extract('const ALLOWED_TVG_URLS = new Set([', 'createApp({');
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
  allowedTvgUrl,
  exportableTvgUrl,
  epgTvgIdKeys,
  putEpgTvgUrl,
  putEpgSourceIndex,
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
  allowedTvgUrl,
  exportableTvgUrl,
  epgTvgIdKeys,
  putEpgTvgUrl,
  putEpgSourceIndex,
  parseExtinf,
  detectQuality,
} = sandbox.module.exports;

const dirtyNames = [
  ['(1080p) Doma HD.sk [Not 24/7]', 'Doma HD.sk'],
  ['[Not 24/7] DajTo (720p)', 'DajTo'],
  ['SK: Markiza HD', 'Markiza'],
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
assert(cleanTvgId('CNNPrimaNewsHD.sk') === 'CNNPrimaNews.sk', 'cleans compact HD suffix before tvg-id country');
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

const xmlIdx = {};
const nameIdx = {};
const idIdx = {};
const nameIdIdx = {};
const displayIdx = {};
const nameDisplayIdx = {};
putEpgSourceIndex('Markíza HD.sk', 'Markíza HD.sk', 'https://www.open-epg.com/files/slovakia1.xml', xmlIdx, nameIdx, idIdx, nameIdIdx, displayIdx, nameDisplayIdx);
assert(xmlIdx['markiza.sk'] === 'https://www.open-epg.com/files/slovakia1.xml', 'indexes diacritic-free EPG TVG-ID variants to source URL');
assert(idIdx['markiza.sk'] === 'Markíza HD.sk', 'keeps exact XMLTV channel ID for canonical TVG-ID lookup');
assert(nameIdx.markiza === 'https://www.open-epg.com/files/slovakia1.xml', 'indexes cleaned EPG display-name to source URL');
assert(nameIdIdx.markiza === 'Markíza HD.sk', 'keeps exact XMLTV channel ID for display-name lookup');
assert(displayIdx['markiza.sk'] === 'Markíza HD.sk', 'keeps exact XMLTV display-name for canonical TVG-ID lookup');
assert(nameDisplayIdx.markiza === 'Markíza HD.sk', 'keeps exact XMLTV display-name for display-name lookup');

const czXmlIdx = {};
const czNameIdx = {};
const czIdIdx = {};
const czNameIdIdx = {};
const czDisplayIdx = {};
const czNameDisplayIdx = {};
putEpgSourceIndex('ČT2.sk', 'ČT2.sk', 'https://www.open-epg.com/files/czech1.xml', czXmlIdx, czNameIdx, czIdIdx, czNameIdIdx, czDisplayIdx, czNameDisplayIdx);
assert(czXmlIdx['ct2.sk'] === 'https://www.open-epg.com/files/czech1.xml', 'indexes CT2 without diacritics to Open EPG CZ source');
assert(czIdIdx['ct2.sk'] === 'ČT2.sk', 'keeps exact CT2 XMLTV channel ID');
assert(czDisplayIdx['ct2.sk'] === 'ČT2.sk', 'keeps exact CT2 XMLTV display-name');

const aliasCases = [
  ['DOMA', 'Doma.sk'],
  ['DajTo', 'Dajto.sk'],
  ['JOJ Svet', 'JOJSvet.sk'],
  ['Wau', 'Wau.sk'],
  ['Markíza', 'Markíza.sk'],
  ['TA3', 'TA3.sk'],
  ['Jednotka', 'Jednotka.sk'],
  ['Dvojka', 'Dvojka.sk'],
];

for (const [name, expected] of aliasCases) {
  const ids = aliasTvgIdVariants({ name, tvg_name: '', tvg_id: '' });
  assert(ids[0] === expected, `maps ${name} to primary ${expected}`);
}

const parsed = parseExtinf('#EXTINF:-1 tvg-id="Doma.sk@HD" tvg-name="(1080p) DOMA HD [Not 24/7]" tvg-logo="https://example.test/logo.png",SK: DOMA HD');
assert(parsed.name === 'DOMA', 'parseExtinf strips visible channel prefix/decorations');
assert(parsed.tvg_name === 'DOMA', 'parseExtinf strips tvg-name prefix/decorations');
assert(parsed.tvg_id === 'Doma.sk', 'parseExtinf cleans tvg-id quality suffix');
assert(parsed.quality === 'FHD', 'parseExtinf keeps quality detection from raw channel name');

assert(JSON.stringify(tvgIdVariants('Dajto.sk')) === JSON.stringify(['Dajto.sk', 'Dajto.cz']), 'tvgIdVariants orders SK before CZ');
assert(JSON.stringify(nameTvgIdVariants('JOJ Svet')) === JSON.stringify(['jojsvet.sk', 'jojsvet.cz']), 'nameTvgIdVariants creates SK then CZ fallbacks');
assert(detectQuality('(720p) DajTo') === 'HD', 'detectQuality recognizes decorated 720p source names');
assert(
  allowedTvgUrl('https://www.open-epg.com/files/slovakia1.xml') === 'https://www.open-epg.com/files/slovakia1.xml',
  'allows approved Open EPG TVG URLs'
);
assert(
  allowedTvgUrl('https://raw.githubusercontent.com/globetvapp/epg/main/Slovakia/slovakia1.xml') === '',
  'rejects Globe XML as a TVG URL while keeping it available for matching'
);
assert(
  exportableTvgUrl('http://example.test/custom.xml') === 'https://example.test/custom.xml',
  'normalizes custom HTTP EPG URLs for export'
);
assert(
  exportableTvgUrl('uploaded:guide.xml') === '',
  'does not export local uploaded file labels as TVG URLs'
);
assert(
  JSON.stringify(epgTvgIdKeys('Markiza Krimi HD.sk')) === JSON.stringify(['markiza krimi hd.sk', 'markizakrimi.sk']),
  'indexes raw and canonical Open EPG TVG-ID variants'
);
const epgUrlIndex = {};
putEpgTvgUrl(epgUrlIndex, 'Markiza Krimi HD.sk', 'https://www.open-epg.com/files/slovakia3.xml');
assert(
  epgUrlIndex['markizakrimi.sk'] === 'https://www.open-epg.com/files/slovakia3.xml',
  'maps canonical TVG-ID to the Open EPG file containing its decorated ID'
);
putEpgTvgUrl(epgUrlIndex, 'Markiza Krimi HD.sk', 'https://www.open-epg.com/files/czech3.xml');
assert(
  epgUrlIndex['markizakrimi.sk'] === 'https://www.open-epg.com/files/slovakia3.xml',
  'keeps deterministic Open EPG source priority when IDs occur more than once'
);
const exactMatchIndex = {};
putEpgTvgUrl(exactMatchIndex, 'Jednotka HD.sk', 'https://www.open-epg.com/files/slovakia1.xml');
putEpgTvgUrl(exactMatchIndex, 'Jednotka.sk', 'https://www.open-epg.com/files/slovakia2.xml');
assert(
  exactMatchIndex['jednotka.sk'] === 'https://www.open-epg.com/files/slovakia2.xml',
  'prefers an exact TVG-ID source over an earlier normalized HD alias'
);

// Markíza Klasik.sk: XML has <channel id="Markíza Klasik.sk"><display-name>Markíza Klasik.sk</display-name></channel>
// After autodetect: TVG-ID = "Markíza Klasik.sk", TVG-NAME = "Markíza Klasik.sk" (exact XML values, .sk NOT stripped)
{
  const xi = {}, ni = {}, ii = {}, nii = {}, di = {}, ndi = {};
  putEpgSourceIndex('Markíza Klasik.sk', 'Markíza Klasik.sk', 'https://www.open-epg.com/files/slovakia1.xml',
    xi, ni, ii, nii, di, ndi);
  assert(xi['markizaklasik.sk'] === 'https://www.open-epg.com/files/slovakia1.xml',
    'Markíza Klasik.sk indexed under diacritic-free key for playlist lookup');
  assert(ii['markizaklasik.sk'] === 'Markíza Klasik.sk',
    'autodetect TVG-ID for Markíza Klasik is exact XML id "Markíza Klasik.sk" (diacritics + .sk preserved)');
  assert(di['markizaklasik.sk'] === 'Markíza Klasik.sk',
    'autodetect TVG-NAME for Markíza Klasik is raw XML display-name "Markíza Klasik.sk" (.sk suffix NOT stripped)');
}

process.exit(failed ? 1 : 0);
