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

createApp({
  setup() {
    const STORAGE_KEY = 'iptv-channels'
    const LANG_KEY    = 'iptv-lang'
    const THEME_KEY   = 'iptv-theme'

    /* ── i18n ── */
    const messages = {
      sk: {
        appSubtitle:      'Importuj, upravuj a exportuj M3U / XSPF playlisty',
        importPlaylist:   'Import Playlist',
        exportM3U:        'Export M3U',
        exportXSPF:       'Export XSPF',
        addChannel:       'Pridať kanál',
        clearAll:         'Vymazať všetko',
        total:            'kanálov',
        active:           'aktívnych',
        groups:           'skupín',
        workspace:        'Pracovný priestor',
        tabLibrary:       'Knižnica',
        tabLibraryDesc:   'Kanály a playlist',
        tabContent:       'Obsah',
        tabContentDesc:   'Skupiny a štatistiky',
        tabDesign:        'Dizajn',
        tabDesignDesc:    'Vzhľad aplikácie',
        filterSet:        'Filter',
        search:           'Hľadať',
        searchPlaceholder:'Názov kanálu alebo URL…',
        group:            'Skupina',
        allGroups:        'Všetky skupiny',
        quality:          'Kvalita',
        allQuality:       'Všetky kvality',
        status:           'Stav',
        all:              'Všetky',
        activeLabel:      'Aktívny',
        offLabel:         'Vypnutý',
        activate:         'Aktivovať',
        deactivate:       'Deaktivovať',
        country:          'Krajina',
        perPage:          'Na stránku',
        resetFilters:     'Resetovať filtre',
        quickStats:       'Rýchle štatistiky',
        totalChannels:    'Celkový počet',
        activeChannels:   'Aktívne',
        designInfo:       'O dizajne',
        designInfoDesc:   'Aplikácia používa Apple HIG dizajn systém s dynamickými farbami, skleným efektom a plynulými animáciami.',
        libraryHeading:   'Moje kanály',
        sortLabel:        'Zoradiť podľa',
        sortName:         'Názov',

    const autoDetectResults    = ref([])
    const autoDetectFilter     = ref('all')
    const autoDetectPrefilter  = ref(null)  // Set of channel IDs to process, null = all
    const autoDetectCustomUrl  = ref('')
    const sourceIndex          = ref([])    // { name, tvg_id, tvg_name, tvg_logo, tvg_url }
    const sourceLoading        = ref(false)
    const sourceLoaded         = ref(false)
    const autoDetectSelectedSources = reactive(new Set(['iptv-sk', 'iptv-cz']))
    const expandedRows              = reactive(new Set())
    const epgChannelIndex           = ref({})   // id.toLowerCase() → guide URL
    const epgXmlIndex               = ref({})   // id.toLowerCase() → source XML URL
    const logoChannelIndex          = ref({})      // normName → logo URL
    const logoChannelIndexById      = ref({})      // id.toLowerCase() → logo URL
    const apiNormMap                = ref(new Map()) // normName/collapsed → {id, name, logo}
    const enrichmentLoading         = ref(false)
    const enrichmentLoaded          = ref(false)
    const enrichmentSelectedSources = reactive(new Set(['epg-index', 'logo-api']))

    const filters    = reactive({ search: '', group: '', quality: '', status: 'all', country: '' })
    const sort       = reactive({ by: 'name', asc: true })
    const pagination    = reactive({ page: 1, limit: 100 })
    const selectedRows  = reactive(new Set())
    const modal         = reactive({ import: false, edit: false, add: false, deleteConfirm: false, unsaved: false, autoDetect: false })
    const toast      = reactive({ show: false, message: '' })
    const editCh     = ref(null)
    const editSnapshot = ref(null)
    const deleteTarget = ref(null)

    let toastTimer = null
    let _uid = Date.now()

    /* ── Icons ── */
    const ICONS = {
      tv:        '<rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/>',
      barChart:  '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
      sliders:   '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
      globe:     '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
      sun:       '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
      moon:      '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
      antenna:   '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
      search:    '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
      folder:    '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
      x:         '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      arrowUR:   '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>',
      refresh:   '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
      chevUp:    '<polyline points="18 15 12 9 6 15"/>',
      chevDown:  '<polyline points="6 9 12 15 18 9"/>',
      chevLeft:  '<polyline points="15 18 9 12 15 6"/>',
      chevRight: '<polyline points="9 18 15 12 9 6"/>',
      plus:      '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
      circle:    '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>',
      circleOff: '<circle cx="12" cy="12" r="5"/>',
      check:     '<polyline points="20 6 9 17 4 12"/>',
      link:      '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    }

    function icon(name, size = 16) {
      const s = Number(size) || 16
      const p = ICONS[name] || ''
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:middle;flex-shrink:0">${p}</svg>`
    }

    /* ── i18n ── */
    const t = (key) => messages[lang.value]?.[key] ?? messages.en?.[key] ?? key

    /* ── Computed ── */
    const visibleTabs = computed(() => [
      { id: 'library', svgKey: 'tv',       labelKey: 'tabLibrary', descKey: 'tabLibraryDesc' },
      { id: 'content', svgKey: 'barChart', labelKey: 'tabContent', descKey: 'tabContentDesc' },
      { id: 'design',  svgKey: 'sliders',  labelKey: 'tabDesign',  descKey: 'tabDesignDesc'  },
    ])

    const groupOptions = computed(() =>
      [...new Set(channels.value.map(c => c.group_title).filter(Boolean))].sort()
    )

    const filteredChannels = computed(() => {
      let arr = channels.value

      if (filters.search) {
        const q = filters.search.toLowerCase()
        arr = arr.filter(c =>
          (c.name     || '').toLowerCase().includes(q) ||
          (c.url      || '').toLowerCase().includes(q) ||
          (c.tvg_name || '').toLowerCase().includes(q)
        )
      }
      if (filters.group)   arr = arr.filter(c => c.group_title === filters.group)
      if (filters.quality) arr = arr.filter(c => c.quality === filters.quality)
      if (filters.status === 'active')   arr = arr.filter(c =>  c.is_active)
      if (filters.status === 'inactive') arr = arr.filter(c => !c.is_active)
      if (filters.country) {
        const cu = filters.country.toUpperCase()
        arr = arr.filter(c => (c.tvg_country || '').toUpperCase() === cu)
      }

      const fieldMap = { name: 'name', index: '_idx', group: 'group_title', quality: 'quality', country: 'tvg_country', status: 'is_active', tvg_id: 'tvg_id' }
      const f = fieldMap[sort.by] || 'name'
      return [...arr].sort((a, b) => {
        if (f === '_idx') {
          const ai = channels.value.indexOf(a), bi = channels.value.indexOf(b)
          return sort.asc ? ai - bi : bi - ai
        }
        const av = a[f], bv = b[f]
        if (typeof av === 'boolean' || typeof bv === 'boolean') {
          return sort.asc ? (bv === av ? 0 : av ? -1 : 1) : (bv === av ? 0 : av ? 1 : -1)
        }
        const as = (av || '').toLowerCase(), bs = (bv || '').toLowerCase()
        return sort.asc ? as.localeCompare(bs) : bs.localeCompare(as)
      })
    })

    const totalPages = computed(() =>
      Math.max(1, Math.ceil(filteredChannels.value.length / pagination.limit))
    )

    const paginatedChannels = computed(() => {
      const s = (pagination.page - 1) * pagination.limit
      return filteredChannels.value.slice(s, s + pagination.limit)
    })

    const stats = computed(() => {
      const total  = channels.value.length
      const active = channels.value.filter(c => c.is_active).length
      const groups = new Set(channels.value.map(c => c.group_title).filter(Boolean)).size
      const qualities = { '4K': 0, 'FHD': 0, 'HD': 0, 'SD': 0 }
      channels.value.forEach(c => {
        if (c.quality && qualities[c.quality] !== undefined) qualities[c.quality]++
      })
      return { total, active, groups, qualities }
    })

    const groupList = computed(() => {
      const m = {}
      channels.value.forEach(c => {
        const g = c.group_title || ''
        m[g] = (m[g] || 0) + 1
      })
      return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]))
    })

    const hasActiveFilters = computed(() =>
      !!(filters.search || filters.group || filters.quality || filters.country || filters.status !== 'all')
    )

    const editIsDirty = computed(() => {
      if (!editCh.value || !editSnapshot.value) return false
      return JSON.stringify(editCh.value) !== editSnapshot.value
    })

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

    const selectedRowsCount = computed(() => selectedRows.size)

    const allPageSelected = computed(() =>
      filteredChannels.value.length > 0 &&
      filteredChannels.value.every(ch => selectedRows.has(ch.id))
    )

    /* ── Helpers ── */
    function persist() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(channels.value)) } catch {}
    }

    function showToast(msg) {
      clearTimeout(toastTimer)
      toast.message = msg
      toast.show = true
      toastTimer = setTimeout(() => { toast.show = false }, 2800)
    }

    function newId() { return 'ch_' + (++_uid) }

    /* ── Theme / Lang ── */
    function setTheme(newTheme) {
      theme.value = newTheme
      document.documentElement.setAttribute('data-theme', newTheme)
      try { localStorage.setItem(THEME_KEY, newTheme) } catch {}
    }

    function toggleTheme() { setTheme(theme.value === 'dark' ? 'light' : 'dark') }

    function setLang(l) {
      lang.value = l
      document.documentElement.lang = l
      try { localStorage.setItem(LANG_KEY, l) } catch {}
    }

    /* ── Table ── */
    function setSort(by) {
      if (sort.by === by) sort.asc = !sort.asc
      else { sort.by = by; sort.asc = true }
      pagination.page = 1
    }

    function prevPage() { if (pagination.page > 1) pagination.page-- }
    function nextPage() { if (pagination.page < totalPages.value) pagination.page++ }

    function resetFilters() {
      Object.assign(filters, { search: '', group: '', quality: '', status: 'all', country: '' })
      pagination.page = 1
    }

    /* ── Channel CRUD ── */
    function toggleChannel(ch) { ch.is_active = !ch.is_active; persist() }

    function editChannel(ch) {
      editCh.value = { ...ch }
      editSnapshot.value = JSON.stringify({ ...ch })
      modal.add  = false
      modal.edit = true
    }

    function openAddChannel() {
      editCh.value = {
        id: null, name: '', tvg_id: '', tvg_name: '', tvg_logo: '', tvg_url: '',
        tvg_country: '', group_title: '', url: '', quality: '', is_active: true
      }
      editSnapshot.value = JSON.stringify({ ...editCh.value })
      modal.edit = false
      modal.add  = true
    }

    function closeEditSafe() {
      if (editIsDirty.value) { modal.unsaved = true }
      else { modal.edit = false; modal.add = false }
    }

    function forceCloseEdit() {
      modal.unsaved = false; modal.edit = false; modal.add = false
    }

    const ALLOWED_SCHEMES = new Set(['http', 'https', 'rtmp', 'rtmps', 'rtsp', 'udp', 'rtp'])
    function validUrl(url) {
      try {
        const scheme = (url || '').split('://')[0].toLowerCase()
        return ALLOWED_SCHEMES.has(scheme)
      } catch { return false }
    }

    function saveEdit() {
      if (!editCh.value?.name?.trim() || !editCh.value?.url?.trim()) {
        return showToast(t('validationError'))
      }
      if (!validUrl(editCh.value.url)) {
        return showToast(t('invalidUrl'))
      }
      const idx = channels.value.findIndex(c => c.id === editCh.value.id)
      if (idx >= 0) {
        channels.value.splice(idx, 1, { ...editCh.value })
      } else {
        channels.value.push({ ...editCh.value, id: newId() })
      }
      persist()
      modal.edit = false; modal.add = false; modal.unsaved = false
      showToast(t('channelSaved'))
    }

    function removeChannel(id) { deleteTarget.value = id; modal.deleteConfirm = true }

    function confirmDelete() {
      channels.value = channels.value.filter(c => c.id !== deleteTarget.value)
      persist(); modal.deleteConfirm = false
      showToast(t('channelDeleted'))
    }

    function clearAll() {
      if (!confirm(t('confirmClearAll'))) return
      channels.value = []; persist()
      showToast(t('allCleared'))
    }

    /* ── Import ── */
    function triggerImport() { modal.import = true }

    const MAX_FILE_SIZE = 50 * 1024 * 1024  // 50 MB

    function importFromFile(e) {
      const file = e.target.files[0]; if (!file) return
      if (file.size > MAX_FILE_SIZE) {
        showToast(t('fileTooLarge'))
        e.target.value = ''
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => {
        const fmt = file.name.toLowerCase().endsWith('.xspf') ? 'xspf' : 'm3u'
        processImport(ev.target.result, fmt)
        modal.import = false
        e.target.value = ''
      }
      reader.readAsText(file, 'UTF-8')
    }

    async function importFromUrl() {
      if (!importUrl.value) return
      importLoading.value = true
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 15000)
      try {
        const r = await fetch(importUrl.value, { signal: ctrl.signal })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const text = await r.text()
        const fmt = importUrl.value.toLowerCase().endsWith('.xspf') ? 'xspf' : 'm3u'
        processImport(text, fmt)
        modal.import = false
        importUrl.value = ''
      } catch (e) {
        showToast(t('importError') + ': ' + (e.name === 'AbortError' ? t('fetchTimeout') : e.message))
      } finally {
        clearTimeout(timer)
        importLoading.value = false
      }
    }

    function processImport(text, fmt) {
      const fresh = fmt === 'm3u' ? parseM3U(text) : parseXSPF(text)
      const existingUrls = new Set(channels.value.map(c => c.url))
      const existingIds  = new Set(channels.value.map(c => c.tvg_id).filter(Boolean))
      const unique = fresh.filter(c =>
        !existingUrls.has(c.url) && !(c.tvg_id && existingIds.has(c.tvg_id))
      )
      const skipped = fresh.length - unique.length
      channels.value = [...channels.value, ...unique]
      persist()
      let msg = t('imported') + ' ' + unique.length + ' ' + t('channels')
      if (skipped > 0) msg += ' · ' + skipped + ' ' + t('skippedDuplicates')
      showToast(msg)
    }

    function parseM3U(text) {
      const lines = text.split(/\r?\n/)
      const result = []
      let meta = null
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.startsWith('#EXTINF:')) {
          meta = parseExtinf(line)
        } else if (line && !line.startsWith('#')) {
          result.push({ id: newId(), ...(meta || {}), url: line, is_active: true })
          meta = null
        }
      }
      return result
    }

    function parseXSPF(text) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/xml')
      const tracks = doc.querySelectorAll('track')
      const result = []
      tracks.forEach(tr => {
        const g = (tag) => tr.querySelector(tag)?.textContent?.trim() || ''
        const url = g('location')
        if (url) result.push({
          id: newId(), name: g('title'), url,
          tvg_id: '', tvg_name: g('title'), tvg_logo: g('image'),
          tvg_country: '', group_title: g('annotation'),
          quality: detectQuality(g('title')), is_active: true
        })
      })
      return result
    }

    function parseExtinf(line) {
      const nameM = line.match(/,(.+)$/)
      const name  = nameM ? nameM[1].trim() : ''
      return {
        name,
        tvg_id:      extractAttr(line, 'tvg-id'),
        tvg_name:    extractAttr(line, 'tvg-name') || name,
        tvg_logo:    extractAttr(line, 'tvg-logo'),
        tvg_url:     extractAttr(line, 'tvg-url'),
        tvg_country: extractAttr(line, 'tvg-country'),
        group_title: extractAttr(line, 'group-title'),
        quality:     detectQuality(name),
      }
    }

    function extractAttr(line, attr) {
      const m = line.match(new RegExp(attr + '="([^"]*)"', 'i'))
      return m ? m[1] : ''
    }

    function detectQuality(name) {
      const n = (name || '').toUpperCase()
      if (n.includes('4K') || n.includes('UHD') || n.includes('2160')) return '4K'
      if (n.includes('FHD') || n.includes('1080') || n.includes('FULL HD')) return 'FHD'
      if ((n.includes('HD') || n.includes('720')) && !n.includes('UHD') && !n.includes('FHD')) return 'HD'
      if (n.includes('SD') || n.includes('480') || n.includes('360')) return 'SD'
      return ''
    }

    /* ── Export ── */
    function exportPlaylist(fmt) {
      const active = channels.value.filter(c => c.is_active)
      if (!active.length) return

      let content, filename, type
      if (fmt === 'm3u') {
        content = '#EXTM3U\n'
        active.forEach(c => {
          content += '#EXTINF:-1'
          if (c.tvg_id)      content += ` tvg-id="${xmlEsc(c.tvg_id)}"`
          if (c.tvg_name)    content += ` tvg-name="${xmlEsc(c.tvg_name)}"`
          if (c.tvg_logo)    content += ` tvg-logo="${xmlEsc(c.tvg_logo)}"`
          if (c.tvg_url)     content += ` tvg-url="${xmlEsc(c.tvg_url)}"`
          if (c.group_title) content += ` group-title="${xmlEsc(c.group_title)}"`
          if (c.tvg_country) content += ` tvg-country="${xmlEsc(c.tvg_country)}"`
          content += `,${c.name}\n${c.url}\n`
        })
        filename = 'playlist.m3u'; type = 'audio/x-mpegurl'
      } else {
        content  = '<?xml version="1.0" encoding="UTF-8"?>\n'
        content += '<playlist version="1" xmlns="http://xspf.org/ns/0/">\n  <trackList>\n'
        active.forEach(c => {
          content += '    <track>\n'
          content += `      <title>${xmlEsc(c.name)}</title>\n`
          content += `      <location>${xmlEsc(c.url)}</location>\n`
          if (c.tvg_logo)    content += `      <image>${xmlEsc(c.tvg_logo)}</image>\n`
          if (c.group_title) content += `      <annotation>${xmlEsc(c.group_title)}</annotation>\n`
          content += '    </track>\n'
        })
        content += '  </trackList>\n</playlist>'
        filename = 'playlist.xspf'; type = 'application/xspf+xml'
      }

      const blob = new Blob([content], { type })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      showToast(t('exported'))
    }

    function xmlEsc(s) {
      return (s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    }

    /* ── Keyboard ── */
    function handleKeydown(e) {
      if (e.key !== 'Escape') return
      if (modal.unsaved)      { modal.unsaved = false; return }
      if (modal.deleteConfirm){ modal.deleteConfirm = false; return }
      if (modal.edit || modal.add) { closeEditSafe(); return }
      if (modal.import)       { modal.import = false; return }
      if (modal.autoDetect)   { modal.autoDetect = false; return }
    }

    /* ── Lifecycle ── */
    onMounted(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) channels.value = JSON.parse(saved)
      } catch {}

      const savedTheme = localStorage.getItem(THEME_KEY) || 'dark'
      setTheme(savedTheme)

      const savedLang = localStorage.getItem(LANG_KEY) || 'sk'
      setLang(savedLang)

      document.addEventListener('keydown', handleKeydown)

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {})
      }
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown)
    })

    watch(
      [() => filters.search, () => filters.group, () => filters.quality,
       () => filters.status, () => filters.country, () => pagination.limit],
      () => { pagination.page = 1; selectedRows.clear() }
    )

    watch(() => activeTab.value, () => { mobFilterOpen.value = false; selectedRows.clear() })

    /* ── EPG ── */
    function parseXMLTVDate(str) {
      if (!str) return null
      const m = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{2}:?\d{2})?/)
      if (!m) return null
      const [, y, mo, d, h, mi, s, tz] = m
      let offset = 0
      if (tz) {
        const sign = tz[0] === '-' ? -1 : 1
        const digits = tz.slice(1).replace(':','')
        offset = sign * (parseInt(digits.slice(0,2)) * 60 + parseInt(digits.slice(2,4))) * 60000
      }
      return new Date(Date.UTC(+y, +mo-1, +d, +h, +mi, +s) - offset)
    }

    function parseXMLTV(xmlText) {
      const doc = new DOMParser().parseFromString(xmlText, 'text/xml')
      if (doc.querySelector('parsererror')) throw new Error('Invalid XML')
      const channelMeta = {}
      doc.querySelectorAll('channel').forEach(ch => {
        const id = ch.getAttribute('id'); if (!id) return
        channelMeta[id] = {
          displayName: ch.querySelector('display-name')?.textContent?.trim() || '',
          icon: ch.querySelector('icon')?.getAttribute('src') || ''
        }
      })
      const programs = {}
      doc.querySelectorAll('programme').forEach(prog => {
        const ch = prog.getAttribute('channel'); if (!ch) return
        const start = parseXMLTVDate(prog.getAttribute('start'))
        const stop  = parseXMLTVDate(prog.getAttribute('stop'))
        const title = prog.querySelector('title')?.textContent?.trim() || ''
        const desc  = prog.querySelector('desc')?.textContent?.trim()  || ''
        if (!programs[ch]) programs[ch] = []
        programs[ch].push({ start, stop, title, desc })
      })
      return { programs, channelMeta }
    }

    function importEpgFromFile(event) {
      const file = event.target.files?.[0]; if (!file) return
      if (file.size > MAX_FILE_SIZE) return showToast(t('fileTooLarge'))
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const { programs, channelMeta } = parseXMLTV(e.target.result)
          epgData.value = { ...epgData.value, ...programs }
          epgChannelMeta.value = { ...epgChannelMeta.value, ...channelMeta }
          epgLoaded.value = true
          const chCount = Object.keys(programs).length
          const pCount  = Object.values(programs).reduce((s, a) => s + a.length, 0)
          showToast(`${t('epgLoadedMsg')}: ${pCount} ${t('epgPrograms')}, ${chCount} ${t('epgChannels')}`)
        } catch { showToast(t('importError')) }
        event.target.value = ''
      }
      reader.readAsText(file, 'UTF-8')
    }

    function clearEpg() { epgData.value = {}; epgChannelMeta.value = {}; epgLoaded.value = false }
    function triggerEpgImport() { epgRef.value?.click() }

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

    function getCurrentProgram(ch) {
      if (!epgLoaded.value || !ch.tvg_id) return null
      const now = new Date()
      return (epgData.value[ch.tvg_id] || []).find(p => p.start <= now && p.stop > now) || null
    }

    function getNextProgram(ch) {
      if (!epgLoaded.value || !ch.tvg_id) return null
      const now = new Date()
      return (epgData.value[ch.tvg_id] || []).filter(p => p.start > now).sort((a,b) => a.start-b.start)[0] || null
    }

    function getTodayPrograms(ch) {
      if (!ch?.tvg_id) return []
      const today = new Date(); today.setHours(0,0,0,0)
      const tmrw  = new Date(today); tmrw.setDate(tmrw.getDate()+1)
      return (epgData.value[ch.tvg_id] || [])
        .filter(p => p.start >= today && p.start < tmrw)
        .sort((a,b) => a.start - b.start)
    }

    function formatEpgTime(date) {
      if (!date) return ''
      return date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    }

    /* ── Autodetect ── */
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


export function useAutoDetect(channels, epgChannelIndex, epgXmlIndex, logoChannelIndex, logoChannelIndexById, t) {
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

    function getCurrentProgram(ch) {
      if (!epgLoaded.value || !ch.tvg_id) return null
      const now = new Date()
      return (epgData.value[ch.tvg_id] || []).find(p => p.start <= now && p.stop > now) || null
    }

    function getNextProgram(ch) {
      if (!epgLoaded.value || !ch.tvg_id) return null
      const now = new Date()
      return (epgData.value[ch.tvg_id] || []).filter(p => p.start > now).sort((a,b) => a.start-b.start)[0] || null
    }

    function getTodayPrograms(ch) {
      if (!ch?.tvg_id) return []
      const today = new Date(); today.setHours(0,0,0,0)
      const tmrw  = new Date(today); tmrw.setDate(tmrw.getDate()+1)
      return (epgData.value[ch.tvg_id] || [])
        .filter(p => p.start >= today && p.start < tmrw)
        .sort((a,b) => a.start - b.start)
    }

    function formatEpgTime(date) {
      if (!date) return ''
      return date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    }

    /* ── Autodetect ── */
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
      function toggleExpand(id) {
      if (expandedRows.has(id)) expandedRows.delete(id)
      else expandedRows.add(id)
    }


  const filteredAutoDetectResults = computed(() => {
    if (autoDetectFilter.value === 'all') return autoDetectResults.value
    if (autoDetectFilter.value === 'found') return autoDetectResults.value.filter(r => r.score >= 40)
    return autoDetectResults.value.filter(r => r.score < 40)
  })

  const autoDetectSummary = computed(() => ({
    matched:  autoDetectResults.value.filter(r => r.score >= 40).length,
    selected: autoDetectResults.value.filter(r => r.selected).length,
    total:    autoDetectResults.value.length,
  }))

  const autoDetectAllSelected = computed({
    get: () => filteredAutoDetectResults.value.length > 0 &&
               filteredAutoDetectResults.value.every(r => r.selected),
    set: (v) => toggleAllAutoDetect(v),
  })

  return {
    IPTV_SOURCES, ENRICHMENT_SOURCES,
    autoDetectResults, autoDetectFilter, autoDetectPrefilter,
    autoDetectCustomUrl, autoDetectSelectedSources,
    enrichmentSelectedSources, enrichmentLoading, enrichmentLoaded,
    sourceLoading, sourceLoaded, expandedRows, apiNormMap,
    epgChannelIndex, epgXmlIndex, logoChannelIndex, logoChannelIndexById,
    filteredAutoDetectResults, autoDetectSummary, autoDetectAllSelected,
    runAutoDetect, fetchAndRunAutoDetect, openAutoDetect, applyAutoDetect,
    toggleAutoDetectSource, toggleEnrichmentSource,
    toggleAllAutoDetect, toggleExpand,
  }
}

