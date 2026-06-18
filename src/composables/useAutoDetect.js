import { ref, computed, reactive } from 'vue'


const IPTV_SOURCES = [
  { id: 'iptv-sk',  label: 'SK',      detail: 'iptv-org',        url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/sk.m3u' },
  { id: 'iptv-cz',  label: 'CZ',      detail: 'iptv-org',        url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cz.m3u' },
  { id: 'iptv-hu',  label: 'HU',      detail: 'iptv-org',        url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/hu.m3u' },
  { id: 'iptv-pl',  label: 'PL',      detail: 'iptv-org',        url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/pl.m3u' },
  { id: 'iptv-de',  label: 'DE',      detail: 'iptv-org',        url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/de.m3u' },
  { id: 'iptv-all', label: 'Všetky',  detail: 'iptv-org (veľký)',url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/index.m3u' },
  { id: 'freetv',   label: 'Free-TV', detail: 'Free-TV/IPTV',    url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8' },
]

const ENRICHMENT_SOURCES = [
  { id: 'epg-index',   label: 'EPG index',    detail: 'iptv-org/epg (CC0)',              type: 'epg',     url: 'https://iptv-org.github.io/epg/channels.json' },
  { id: 'logo-api',    label: 'Logá (API)',    detail: 'iptv-org/api (CC0)',              type: 'logo',    url: 'https://iptv-org.github.io/api/channels.json' },
  { id: 'epg-sk',      label: 'SK EPG',        detail: 'open-epg.com/slovakia1 (SK)',    type: 'epg-xml', url: 'https://www.open-epg.com/files/slovakia1.xml' },
  { id: 'epg-cz',      label: 'CZ EPG',        detail: 'open-epg.com/czech1 (CZ)',       type: 'epg-xml', url: 'https://www.open-epg.com/files/czech1.xml' },
  { id: 'epg-glcz',    label: 'Globe CZ',      detail: 'globetvapp/epg Czech1 (GitHub)', type: 'epg-xml', url: 'https://raw.githubusercontent.com/globetvapp/epg/main/Czech/czech1.xml' },
]

export function useAutoDetect(channels, epgChannelIndex, epgXmlIndex, logoChannelIndex, logoChannelIndexById, t, showToast) {
  const autoDetectResults         = ref([])
  const autoDetectFilter          = ref('all')
  const autoDetectPrefilter       = ref(null)
  const autoDetectCustomUrl       = ref('')
  const sourceIndex               = ref([])
  const sourceLoading             = ref(false)
  const sourceLoaded              = ref(false)
  const autoDetectSelectedSources = reactive(new Set(['iptv-sk', 'iptv-cz']))
  const expandedRows              = reactive(new Set())
  const apiNormMap                = ref(new Map())
  const enrichmentLoading         = ref(false)
  const enrichmentLoaded          = ref(false)
  const enrichmentSelectedSources = reactive(new Set(['epg-index', 'logo-api']))

    function normName(s) {
      return (s || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\[[^\]]*\]|\([^)]*\)/g, '')
        .replace(/\b(hd|fhd|4k|uhd|sd|tv|sk|cz|cs|en|pl|de|at|hu|it|fr|uk|us|ro|hr|rs|si|bg|mk)\b/g, '')
        .replace(/\b\d{3,4}[pi]\b/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
    }


    function strSimilarity(na, nb) {
      if (!na || !nb) return 0
      if (na === nb) return 1
      const longer  = na.length >= nb.length ? na : nb
      const shorter = na.length <  nb.length ? na : nb

      let base
      if (longer.includes(shorter)) {
        base = shorter.length / longer.length
      } else {
        const makeTrigrams = s => {
          const r = new Set()
          const p = ' ' + s + ' '
          for (let i = 0; i < p.length - 2; i++) r.add(p.slice(i, i + 3))
          return r
        }
        const ta = makeTrigrams(na), tb = makeTrigrams(nb)
        let inter = 0; ta.forEach(t => { if (tb.has(t)) inter++ })
        base = (2 * inter) / (ta.size + tb.size)
      }

      // Penalize when the longer string has unmatched significant words
      const lw = longer.split(' ').filter(w => w.length > 1)
      const sw = new Set(shorter.split(' ').filter(w => w.length > 1))
      if (lw.length >= 2 && sw.size > 0) {
        const coverage = lw.filter(w => sw.has(w)).length / lw.length
        return base * (coverage * 0.6 + 0.4)
      }
      return base
    }


    function parseM3UforAutoDetect(text) {
      const lines = text.split('\n')
      const result = []
      let extinf = null
      for (const line of lines) {
        const l = line.trim()
        if (l.startsWith('#EXTINF:')) {
          extinf = l
        } else if (extinf && l && !l.startsWith('#')) {
          const nameM = extinf.match(/,(.+)$/)
          result.push({
            name:     nameM ? nameM[1].trim() : '',
            tvg_id:   extractAttr(extinf, 'tvg-id'),
            tvg_name: extractAttr(extinf, 'tvg-name'),
            tvg_logo: extractAttr(extinf, 'tvg-logo'),
            tvg_url:  extractAttr(extinf, 'tvg-url'),
          })
          extinf = null
        }
      }
      return result
    }

    async function fetchEnrichmentIndexes() {
      const sources = ENRICHMENT_SOURCES.filter(s => enrichmentSelectedSources.has(s.id))
      if (sources.length === 0) return
      enrichmentLoading.value = true
      enrichmentLoaded.value  = false
      await Promise.all(sources.map(async src => {
        try {
          if (src.type === 'epg-xml') {
            // Stream XML, stop at first <programme> — avoids downloading the full guide
            const ctrl = new AbortController()
            const res  = await fetch(src.url, { signal: ctrl.signal })
            if (!res.ok) return
            const reader  = res.body.getReader()
            const decoder = new TextDecoder()
            let text = ''
            while (true) {
              const { value, done } = await reader.read()
              if (value) text += decoder.decode(value, { stream: !done })
              const stop = text.indexOf('<programme')
              if (done || stop !== -1) {
                if (!done) ctrl.abort()
                if (stop !== -1) text = text.slice(0, stop)
                break
              }
            }
            const re = /<channel\s+id="([^"]+)"/g
            let m
            while ((m = re.exec(text)) !== null) {
              epgXmlIndex.value[m[1].toLowerCase()] = src.url
            }
            return
          }
          const jsonCtrl = new AbortController()
          const jsonTimer = setTimeout(() => jsonCtrl.abort(), 15000)
          const res = await fetch(src.url, { signal: jsonCtrl.signal }).finally(() => clearTimeout(jsonTimer))
          if (!res.ok) return
          const data = await res.json()
          if (src.type === 'epg') {
            const idx = {}
            for (const ch of data) {
              if (ch.id && ch.guides?.length > 0) idx[ch.id.toLowerCase()] = ch.guides[0]
            }
            epgChannelIndex.value = idx
          } else if (src.type === 'logo') {
            // iptv-org/api channels.json: [{id, name, alt_names, logo, ...}]
            const byName = {}, byId = {}, nMap = new Map()
            const addToNMap = (key, entry) => {
              if (!nMap.has(key)) nMap.set(key, entry)
              const kc = key.replace(/\s+/g, '')
              if (kc !== key && !nMap.has(kc)) nMap.set(kc, entry)
            }
            for (const ch of data) {
              const logo = ch.logo || ''
              if (ch.id) byId[ch.id.toLowerCase()] = logo
              const entry = { id: ch.id || '', name: ch.name, logo }
              const key = normName(ch.name)
              if (key) {
                if (logo) byName[key] = logo
                addToNMap(key, entry)
              }
              for (const alt of (ch.alt_names || [])) {
                const akey = normName(alt)
                if (akey) {
                  if (logo && !byName[akey]) byName[akey] = logo
                  addToNMap(akey, entry)
                }
              }
            }
            logoChannelIndex.value   = byName
            logoChannelIndexById.value = byId
            apiNormMap.value         = nMap
          }
        } catch {}
      }))
      enrichmentLoading.value = false
      enrichmentLoaded.value  = true
    }

    async function fetchAndRunAutoDetect() {
      const urls = [
        ...IPTV_SOURCES.filter(s => autoDetectSelectedSources.has(s.id)).map(s => s.url),
        ...(autoDetectCustomUrl.value.trim() ? [autoDetectCustomUrl.value.trim()] : [])
      ]
      const hasEnrichment = ENRICHMENT_SOURCES.some(s => enrichmentSelectedSources.has(s.id))
      if (urls.length === 0 && !hasEnrichment) { showToast(t('autoDetectNoSources')); return }
      sourceLoading.value = true
      sourceLoaded.value  = false
      sourceIndex.value   = []
      epgChannelIndex.value      = {}
      epgXmlIndex.value          = {}
      logoChannelIndex.value     = {}
      logoChannelIndexById.value = {}
      apiNormMap.value           = new Map()
      enrichmentLoaded.value     = false
      try {
        const all = []
        await Promise.all([
          urls.length > 0 ? Promise.all(urls.map(async url => {
            const ctrl = new AbortController()
            const timer = setTimeout(() => ctrl.abort(), 20000)
            try {
              const res = await fetch(url, { signal: ctrl.signal })
              if (!res.ok) throw new Error(`HTTP ${res.status}`)
              const text = await res.text()
              all.push(...parseM3UforAutoDetect(text))
            } finally {
              clearTimeout(timer)
            }
          })) : Promise.resolve(),
          fetchEnrichmentIndexes(),
        ])
        sourceIndex.value = all
        sourceLoaded.value = true
        showToast(t('autoDetectSourcesLoaded').replace('{n}', all.length))
        runAutoDetect()
      } catch { showToast(t('importError')) }
      finally { sourceLoading.value = false }
    }


    function toggleAutoDetectSource(id, checked) {
      if (checked) autoDetectSelectedSources.add(id)
      else autoDetectSelectedSources.delete(id)
    }


    function toggleEnrichmentSource(id, checked) {
      if (checked) enrichmentSelectedSources.add(id)
      else enrichmentSelectedSources.delete(id)
    }


    function runAutoDetect() {
      const hasApiData = apiNormMap.value.size > 0
      const hasSrcData = sourceLoaded.value && sourceIndex.value.length > 0
      if (!hasApiData && !hasSrcData) { autoDetectResults.value = []; return }
      const channelsToProcess = autoDetectPrefilter.value
        ? channels.value.filter(ch => autoDetectPrefilter.value.has(ch.id))
        : channels.value
      const srcNorm = sourceIndex.value.map(s => ({
        ...s,
        nName: normName(s.tvg_name || s.name),
        nId:   normName(s.tvg_id),
      }))
      autoDetectResults.value = channelsToProcess.map(ch => {
        const chNorm = normName(ch.name)
        let best = null, bestScore = 0

        // Fast O(1) lookup against iptv-org/api channel database (exact normName or space-collapsed)
        const apiHit = apiNormMap.value.get(chNorm) || apiNormMap.value.get(chNorm.replace(/\s+/g, ''))
        if (apiHit) {
          bestScore = 0.95
          best = { tvg_id: apiHit.id, tvg_name: apiHit.name, tvg_logo: apiHit.logo, tvg_url: '', name: apiHit.name }
        }

        // Fuzzy matching against M3U sources (may override if score > 0.95)
        srcNorm.forEach(s => {
          const sc = Math.max(
            strSimilarity(chNorm, s.nName),
            s.nId ? strSimilarity(chNorm, s.nId) : 0
          )
          if (sc > bestScore) { bestScore = sc; best = s }
        })
        const matched = best && bestScore >= 0.2
        let editId     = matched ? (best.tvg_id   || '')         : (ch.tvg_id   || '')
        let editName   = matched ? (best.tvg_name  || best.name) : (ch.tvg_name || '')
        let editTvgUrl = matched ? (best.tvg_url   || '')        : (ch.tvg_url  || '')

        // Enrich TVG-URL: try exact id, then id without @quality suffix, then EPG XML index
        if (!editTvgUrl && editId) {
          const idLow   = editId.toLowerCase()
          const idClean = idLow.replace(/@(SD|HD|FHD|4K|UHD|720p|1080p)$/i, '')
          editTvgUrl = epgChannelIndex.value[idLow] || epgChannelIndex.value[idClean] || ''
        }
        if (!editTvgUrl) {
          const lookupId = (editId || ch.tvg_id || '').toLowerCase()
          const lookupClean = lookupId.replace(/@(SD|HD|FHD|4K|UHD|720p|1080p)$/i, '')
          editTvgUrl = epgXmlIndex.value[lookupId]
            || epgXmlIndex.value[lookupClean]
            || (ch.tvg_id ? epgXmlIndex.value[ch.tvg_id.toLowerCase()] : '')
            || ''
        }

        // Whether EPG XML index confirmed the channel's own existing tvg-id (high-confidence match)
        const xmlConfirmed = !!ch.tvg_id && !!epgXmlIndex.value[ch.tvg_id.toLowerCase()] && !ch.tvg_url

        // Enrich logo: iptv-org CDN takes priority over M3U/local URLs
        // 1) exact editId, 2) editId without @quality suffix, 3) channel name, 4) M3U source logo
        const fullIdLow  = (editId || ch.tvg_id || '').toLowerCase()
        const cleanIdLow = fullIdLow.replace(/@(SD|HD|FHD|4K|UHD|720p|1080p)$/i, '')
        let editLogo = logoChannelIndexById.value[fullIdLow]
          || logoChannelIndexById.value[cleanIdLow]
          || logoChannelIndex.value[normName(editName || ch.name)]
          || (matched ? (best.tvg_logo || '') : (ch.tvg_logo || ''))
          || ''

        return {
          ch,
          suggestedId:     matched ? (best.tvg_id   || '') : '',
          suggestedName:   matched ? (best.tvg_name  || best.name) : '',
          suggestedLogo:   editLogo,
          suggestedTvgUrl: editTvgUrl,
          score:         matched ? bestScore : 0,
          // Auto-select: M3U match ≥ 50%, OR EPG XML confirmed existing tvg-id
          selected:      (matched && bestScore >= 0.65) || xmlConfirmed,
          editId, editName, editLogo, editTvgUrl,
        }
      }).sort((a, b) => b.score - a.score)
    }


    function toggleExpand(id) {
      if (expandedRows.has(id)) expandedRows.delete(id)
      else expandedRows.add(id)
    }


    function openAutoDetect() {
      autoDetectFilter.value = 'all'
      autoDetectPrefilter.value = selectedRows.size > 0 ? new Set(selectedRows) : null
      expandedRows.clear()
      modal.autoDetect = true
      if (sourceLoaded.value || apiNormMap.value.size > 0) runAutoDetect()
      else if (!sourceLoading.value) fetchAndRunAutoDetect()
    }


    function applyAutoDetect() {
      let applied = 0
      autoDetectResults.value.forEach(r => {
        if (!r.selected) return
        const ch = channels.value.find(c => c.id === r.ch.id)
        if (!ch) return
        if (r.editId)     ch.tvg_id   = r.editId
        if (r.editName)   ch.tvg_name = r.editName
        if (r.editLogo)   ch.tvg_logo = r.editLogo
        if (r.editTvgUrl) ch.tvg_url  = r.editTvgUrl
        logoErrors.delete(ch.id)
        applied++
      })
      persist()
      modal.autoDetect = false
      showToast(t('autoDetectApplied').replace('{n}', applied))
    }


    function toggleAllAutoDetect(checked) {
      filteredAutoDetectResults.value.forEach(r => {
        if (r.suggestedId || r.editId) r.selected = checked
      })
    }


    const filteredAutoDetectResults = computed(() => {
      const r = autoDetectResults.value
      if (autoDetectFilter.value === 'matched')   return r.filter(x => x.score > 0)
      if (autoDetectFilter.value === 'unmatched') return r.filter(x => x.score === 0)
      return r
    })


    const autoDetectFieldStats = computed(() => {
      const arr = autoDetectResults.value
      const total = arr.length || 1
      const withId   = arr.filter(r => r.suggestedId   || r.editId).length
      const withName = arr.filter(r => r.suggestedName || r.editName).length
      const withLogo = arr.filter(r => r.suggestedLogo || r.editLogo).length
      const withUrl  = arr.filter(r => r.editTvgUrl).length
      return {
        tvgIdPct:   Math.round(withId   / total * 100),
        tvgNamePct: Math.round(withName / total * 100),
        logoPct:    Math.round(withLogo / total * 100),
        tvgUrlPct:  Math.round(withUrl  / total * 100),
      }
    })


    const autoDetectSummary = computed(() => ({
      total:    autoDetectResults.value.length,
      matched:  autoDetectResults.value.filter(r => r.score > 0).length,
      selected: autoDetectResults.value.filter(r => r.selected).length,
    }))


    const autoDetectAllSelected = computed(() => {
      const f = filteredAutoDetectResults.value
      return f.length > 0 && f.every(r => r.selected)
    })


  return {
    IPTV_SOURCES, ENRICHMENT_SOURCES,
    autoDetectResults, autoDetectFilter, autoDetectPrefilter,
    autoDetectCustomUrl, sourceLoading, sourceLoaded,
    autoDetectSelectedSources, expandedRows, apiNormMap,
    enrichmentLoading, enrichmentLoaded, enrichmentSelectedSources,
    filteredAutoDetectResults: filteredAutoDetect,
    autoDetectFieldStats, autoDetectSummary, autoDetectAllSelected,
    normName, runAutoDetect, toggleExpand, openAutoDetect,
    applyAutoDetect, toggleAllAutoDetect,
    toggleAutoDetectSource, toggleEnrichmentSource,
  }
}
