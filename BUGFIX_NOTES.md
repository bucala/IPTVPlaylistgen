# Phase 1 Bug Fixes — Auto-detect: Logo URL + TVG URL prázdne

## Zistené bugy

### ✅ Bug 0: processImport / parseM3U — tvg-url
`parseExtinf()` číta `tvg-url` správne cez `extractAttr(line, 'tvg-url')` → **žiadna zmena**.

### 🐛 Bug 1: Logo URL prázdne v autodetect paneli
**Príčina:** Ak `iptv-org/api` nemá logo pre daný kanál (`apiHit.logo = ''`), fallback
`logoChannelIndexById.value[cleanId]` lookupuje podľa `editId` — ale `editId` môže obsahovať
`@SD` / `@HD` suffix. `cleanId` tento suffix stripuje ✅, no ak je `editId` odlišný od
`suggestedId` z M3U zdroja, nepoužije sa `suggestedId` pre ID-based lookup.

**Fix:** Pri logo fallback skúsiť aj `suggestedId` (bez suffix).

### 🐛 Bug 2: TVG URL prázdne v autodetect paneli  
**Príčina:** `epgChannelIndex` (z `iptv-org/epg/channels.json`) pokrýva väčšinu globálnych
kanálov, ale SK/CZ lokálne kanály (Folklorika.sk, KinoBarrandov.cz@SD, atď.) v ňom nie sú.
`epgXmlIndex` sa plní zo SK/CZ EPG XML zdrojov — má ich, ale lookup používal len `editId`
a `ch.tvg_id`, nie `suggestedId` z M3U zdrojov.

**Fix:** Pridaný fallback lookup cez `suggestedId` pre `epgXmlIndex`.

### 🐛 Bug 3: openAutoDetect race condition
**Príčina:** Keď sa modal otvoril po predchádzajúcom fetchovaní (`sourceLoaded=true` ale
`enrichmentLoaded=false`), `runAutoDetect()` bežal s prázdnymi `logoChannelIndex` /
`epgChannelIndex` → všetky Logo URL a TVG URL polia prázdne.

**Fix:** Podmienka `if (sourceLoaded.value || apiNormMap.value.size > 0)` zmenená na
`if ((sourceLoaded.value || apiNormMap.value.size > 0) && enrichmentLoaded.value)`.

### 🐛 Bug 4: applyAutoDetect neprepisuje tvg_url na prázdny string
**Príčina:** `if (r.editTvgUrl) ch.tvg_url = r.editTvgUrl` — ak používateľ manuálne
vyčistí pole TVG URL na prázdne, zmena sa neuloží.

**Fix:** Ukladá vždy keď je riadok `selected` (aj prázdny string).
