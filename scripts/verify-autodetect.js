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
  document: {
    createElement() {
      return {
        value: '',
        set innerHTML(value) {
          this.value = String(value || '')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
        },
      };
    },
  },
};

vm.createContext(sandbox);
vm.runInContext(`
${aliasBlock}
${autodetectFunctions}
${parseFunctions}
${detectQualityBlock}
module.exports = {
  stripChannelDecorations,
  decodeXmlText,
  normName,
  cleanTvgId,
  tvgCountry,
  supportedEpgCountry,
  pickPreferredEntry,
  tvgIdVariants,
  nameTvgIdVariants,
  preferredCandidateHit,
  aliasTvgIdVariants,
  channelLookupIds,
  allowedTvgUrl,
  exportableTvgUrl,
  epgTvgIdKeys,
  putEpgTvgUrl,
  putEpgSourceIndex,
  parseExtinf,
  detectQuality,
  cleanDisplayNameQuality,
};
`, sandbox, { filename: 'autodetect-regressions.vm.js' });

const {
  stripChannelDecorations,
  decodeXmlText,
  normName,
  cleanTvgId,
  tvgCountry,
  supportedEpgCountry,
  pickPreferredEntry,
  tvgIdVariants,
  nameTvgIdVariants,
  preferredCandidateHit,
  aliasTvgIdVariants,
  channelLookupIds,
  allowedTvgUrl,
  exportableTvgUrl,
  epgTvgIdKeys,
  putEpgTvgUrl,
  putEpgSourceIndex,
  parseExtinf,
  detectQuality,
  cleanDisplayNameQuality,
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
assert(supportedEpgCountry('pl') === '', 'does not hard-filter unsupported playlist country suffixes');
assert(decodeXmlText('Crime &amp; Investigation.cz') === 'Crime & Investigation.cz', 'decodes XML entities before preserving exact channel text');

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

const domaXmlIdx = {};
const domaNameIdx = {};
const domaIdIdx = {};
const domaNameIdIdx = {};
const domaDisplayIdx = {};
const domaNameDisplayIdx = {};
putEpgSourceIndex('Doma HD.sk', 'Doma HD.sk', 'https://www.open-epg.com/files/slovakia1.xml', domaXmlIdx, domaNameIdx, domaIdIdx, domaNameIdIdx, domaDisplayIdx, domaNameDisplayIdx);
assert(domaXmlIdx['doma.sk'] === 'https://www.open-epg.com/files/slovakia1.xml', 'indexes Doma HD.sk under canonical Doma.sk lookup');
assert(domaIdIdx['doma.sk'] === 'Doma HD.sk', 'keeps exact Doma XMLTV channel ID with HD suffix');
assert(domaDisplayIdx['doma.sk'] === 'Doma HD.sk', 'keeps exact Doma XMLTV display-name with HD suffix');

const hboXmlIdx = {};
const hboNameIdx = {};
const hboIdIdx = {};
const hboNameIdIdx = {};
const hboDisplayIdx = {};
const hboNameDisplayIdx = {};
putEpgSourceIndex('HBO 2.sk', 'HBO 2.sk', 'https://www.open-epg.com/files/slovakia2.xml', hboXmlIdx, hboNameIdx, hboIdIdx, hboNameIdIdx, hboDisplayIdx, hboNameDisplayIdx);
assert(hboXmlIdx['hbo2.sk'] === 'https://www.open-epg.com/files/slovakia2.xml', 'indexes HBO 2.sk under canonical HBO2.sk lookup');
assert(hboIdIdx['hbo2.sk'] === 'HBO 2.sk', 'keeps exact HBO 2 XMLTV channel ID including the space');
assert(hboDisplayIdx['hbo2.sk'] === 'HBO 2.sk', 'keeps exact HBO 2 XMLTV display-name including the space');

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

const staleDomaAliases = aliasTvgIdVariants({ name: 'Doma', tvg_name: 'MarkizaDoma.sk', tvg_id: 'MarkizaDoma.sk' });
assert(staleDomaAliases[0] === 'Doma.sk', 'prefers visible channel name before stale TVG metadata for aliases');

const axnLookupIds = channelLookupIds({ name: 'AXN', tvg_name: 'AXN', tvg_id: 'AXN.pl' }, supportedEpgCountry(tvgCountry('AXN.pl')));
assert(axnLookupIds.includes('axn.sk') && axnLookupIds.includes('axn.cz'), 'AXN.pl can still search selected SK/CZ Open EPG XML sources');

const hbo2LookupIds = channelLookupIds({ name: 'HBO 2', tvg_name: 'HBO 2', tvg_id: 'HBO2.sk' }, supportedEpgCountry(tvgCountry('HBO2.sk')));
assert(hbo2LookupIds.includes('hbo2.sk') && !hbo2LookupIds.includes('hbo2.cz'), 'HBO2.sk exact lookup stays in SK country');

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

assert(cleanDisplayNameQuality('Doma HD.sk') === 'Doma.sk', 'cleanDisplayNameQuality strips HD before .sk');
assert(cleanDisplayNameQuality('DAJTO HD.sk') === 'DAJTO.sk', 'cleanDisplayNameQuality strips HD before .sk (uppercase name)');
assert(cleanDisplayNameQuality('JOJ Svet HD.sk') === 'JOJ Svet.sk', 'cleanDisplayNameQuality strips HD from multi-word name before .sk');
assert(cleanDisplayNameQuality('Markíza Klasik.sk') === 'Markíza Klasik.sk', 'cleanDisplayNameQuality leaves name unchanged when no quality marker present');
assert(cleanDisplayNameQuality('Prima FHD.cz') === 'Prima.cz', 'cleanDisplayNameQuality strips FHD before .cz');
assert(cleanDisplayNameQuality('Doma.sk') === 'Doma.sk', 'cleanDisplayNameQuality leaves clean name unchanged');
assert(cleanDisplayNameQuality('TA3 HD') === 'TA3', 'cleanDisplayNameQuality strips trailing HD without country suffix');
assert(cleanDisplayNameQuality('Nova FHD') === 'Nova', 'cleanDisplayNameQuality strips trailing FHD without country suffix');
assert(cleanDisplayNameQuality('Sport1 4K') === 'Sport1', 'cleanDisplayNameQuality strips trailing 4K without country suffix');

const jojCinemaIds = aliasTvgIdVariants({ name: 'JOJ Cinema', tvg_name: '', tvg_id: '' });
assert(jojCinemaIds[0] === 'JOJCinema.sk', 'maps JOJ Cinema to JOJCinema.sk');

const trojkaIds = aliasTvgIdVariants({ name: 'Trojka', tvg_name: '', tvg_id: '' });
assert(trojkaIds[0] === 'Trojka.sk', 'maps Trojka to Trojka.sk');

const rtvs1Ids = aliasTvgIdVariants({ name: 'RTVS 1', tvg_name: '', tvg_id: '' });
assert(rtvs1Ids[0] === 'Jednotka.sk', 'maps RTVS 1 to Jednotka.sk');

const rtvs2Ids = aliasTvgIdVariants({ name: 'RTVS 2', tvg_name: '', tvg_id: '' });
assert(rtvs2Ids[0] === 'Dvojka.sk', 'maps RTVS 2 to Dvojka.sk');

const sport1Ids = aliasTvgIdVariants({ name: 'Sport 1', tvg_name: '', tvg_id: '' });
assert(sport1Ids[0] === 'Sport1.sk', 'maps Sport 1 to Sport1.sk');

const sport2Ids = aliasTvgIdVariants({ name: 'Sport 2', tvg_name: '', tvg_id: '' });
assert(sport2Ids[0] === 'Sport2.sk', 'maps Sport 2 to Sport2.sk');

process.exit(failed ? 1 : 0);
