import fs from 'node:fs'
import path from 'node:path'

const LEGACY = fs.readdirSync('legacy').find(f => f.startsWith('index.pre-vite') && f.endsWith('.html'))
const lines = fs.readFileSync(path.join('legacy', LEGACY), 'utf8').split('\n')

function block(from, to) { return lines.slice(from - 1, to).join('\n') }

// Funkcie podľa grep výstupu — [štart, koniec]
// koniec = riadok pred ďalšou funkciou
const fns = {
  icon:                   [1731, 1740],
  visibleTabs:            [1741, 1746],
  groupOptions:           [1747, 1750],
  filteredChannels:       [1751, 1786],
  totalPages:             [1787, 1790],
  paginatedChannels:      [1791, 1795],
  stats:                  [1796, 1806],
  groupList:              [1807, 1815],
  hasActiveFilters:       [1816, 1819],
  editIsDirty:            [1820, 1824],
  filteredAutoDetect:     [1825, 1831],
  autoDetectFieldStats:   [1832, 1846],
  autoDetectSummary:      [1847, 1852],
  autoDetectAllSelected:  [1853, 1857],
  selectedRowsCount:      [1858, 1859],
  allPageSelected:        [1860, 1865],
  persist:                [1866, 1869],
  showToast:              [1870, 1876],
  newId:                  [1877, 1878],
  setTheme:               [1880, 1885],
  toggleTheme:            [1886, 1887],
  setLang:                [1888, 1894],
  setSort:                [1895, 1900],
  prevPage:               [1901, 1901],
  nextPage:               [1902, 1902],
  resetFilters:           [1904, 1909],
  toggleChannel:          [1910, 1911],
  editChannel:            [1912, 1918],
  openAddChannel:         [1919, 1928],
  closeEditSafe:          [1929, 1933],
  forceCloseEdit:         [1934, 1938],
  validUrl:               [1939, 1945],
  saveEdit:               [1946, 1963],
  removeChannel:          [1964, 1965],
  confirmDelete:          [1966, 1971],
  clearAll:               [1972, 1978],
  triggerImport:          [1979, 1982],
  importFromFile:         [1983, 2020],
  processImport:          [2021, 2035],
  parseM3U:               [2036, 2051],
  parseXSPF:              [2052, 2069],
  parseExtinf:            [2070, 2084],
  extractAttr:            [2085, 2089],
  detectQuality:          [2090, 2099],
  exportPlaylist:         [2100, 2140],
  xmlEsc:                 [2141, 2147],
  handleKeydown:          [2148, 2189],
  parseXMLTVDate:         [2190, 2203],
  parseXMLTV:             [2204, 2227],
  importEpgFromFile:      [2228, 2246],
  clearEpg:               [2247, 2247],
  triggerEpgImport:       [2248, 2248],
  parseM3UforAutoDetect:  [2250, 2391],
  toggleAutoDetectSource: [2392, 2396],
  toggleEnrichmentSource: [2397, 2401],
  getCurrentProgram:      [2402, 2407],
  getNextProgram:         [2408, 2413],
  getTodayPrograms:       [2414, 2422],
  formatEpgTime:          [2423, 2428],
  normName:               [2429, 2439],
  strSimilarity:          [2440, 2470],
  runAutoDetect:          [2471, 2548],
  toggleExpand:           [2549, 2553],
  openAutoDetect:         [2554, 2562],
  applyAutoDetect:        [2563, 2580],
  toggleAllAutoDetect:    [2581, 2586],
  selectRow:              [2587, 2591],
  toggleRowSelect:        [2592, 2596],
  toggleSelectAll:        [2597, 2603],
  deleteSelected:         [2604, 2614],
}

// State vars (riadky 1658–1705)
const stateBlock = block(1658, 1705)
// IPTV/ENRICHMENT sources (1294–1320)
const sourcesBlock = block(1294, 1319)
// ICONS (1707–1729)
const iconsBlock = block(1707, 1729)

function get(...names) { return names.map(n => block(...fns[n])).join('\n\n') }

// ── useIcons.js ───────────────────────────────────────────────────────────────
fs.writeFileSync('src/composables/useIcons.js',
`${iconsBlock}

export ${block(...fns.icon)}
`)
console.log('✓ useIcons.js')

// ── useI18n.js — pridaj len setLang/t, MESSAGES zostávajú ─────────────────────
// (MESSAGES sú už v súbore — len pridáme setLang z legacy)
const existingI18n = fs.readFileSync('src/composables/useI18n.js', 'utf8')
if (!existingI18n.includes('function setLang')) {
  console.log('⚠ useI18n.js: setLang chýba — skontroluj manuálne')
} else {
  console.log('✓ useI18n.js OK (už má setLang)')
}

// ── useTheme.js ───────────────────────────────────────────────────────────────
fs.writeFileSync('src/composables/useTheme.js',
`import { ref } from 'vue'

export function useTheme() {
  const theme = ref((() => { try { return localStorage.getItem('iptv-theme') || 'dark' } catch { return 'dark' } })())

${get('setTheme', 'toggleTheme')}

  return { theme, setTheme, toggleTheme }
}
`)
console.log('✓ useTheme.js')

// ── useChannels.js ────────────────────────────────────────────────────────────
fs.writeFileSync('src/composables/useChannels.js',
`import { ref, reactive } from 'vue'

const ALLOWED_SCHEMES = /^(https?|rtmps?|rtsp|udp|rtp):/i

export function useChannels(t, showToast) {
  const channels      = ref((() => { try { return JSON.parse(localStorage.getItem('iptv-channels') || '[]') } catch { return [] } })())
  const importMode    = ref('file')
  const importUrl     = ref('')
  const importLoading = ref(false)
  const importFileRef = ref(null)
  const logoErrors    = reactive(new Set())
  const modal         = reactive({ import: false, edit: false, add: false, deleteConfirm: false, unsaved: false, autoDetect: false })
  const editCh        = ref(null)
  const editSnapshot  = ref(null)
  const deleteTarget  = ref(null)
  const selectedRows  = reactive(new Set())
  let _uid = Date.now()

${get('persist', 'newId', 'toggleChannel', 'editChannel', 'openAddChannel',
      'closeEditSafe', 'forceCloseEdit', 'validUrl', 'saveEdit',
      'removeChannel', 'confirmDelete', 'clearAll',
      'triggerImport', 'importFromFile', 'processImport',
      'parseM3U', 'parseXSPF', 'parseExtinf', 'extractAttr', 'detectQuality',
      'exportPlaylist', 'xmlEsc',
      'selectRow', 'toggleRowSelect', 'toggleSelectAll', 'deleteSelected')}

  return {
    channels, importMode, importUrl, importLoading, importFileRef,
    logoErrors, modal, editCh, editSnapshot, deleteTarget, selectedRows,
    persist, newId, toggleChannel, editChannel, openAddChannel,
    closeEditSafe, forceCloseEdit, validUrl, saveEdit,
    removeChannel, confirmDelete, clearAll,
    triggerImport, importFromFile, exportPlaylist,
    selectRow, toggleRowSelect, toggleSelectAll, deleteSelected,
  }
}
`)
console.log('✓ useChannels.js')

// ── useEpg.js ─────────────────────────────────────────────────────────────────
fs.writeFileSync('src/composables/useEpg.js',
`import { ref } from 'vue'

export function useEpg() {
  const epgRef         = ref(null)
  const epgData        = ref({})
  const epgChannelMeta = ref({})
  const epgLoaded      = ref(false)

${get('parseXMLTVDate', 'parseXMLTV', 'importEpgFromFile', 'clearEpg', 'triggerEpgImport',
      'getCurrentProgram', 'getNextProgram', 'getTodayPrograms', 'formatEpgTime')}

  return {
    epgRef, epgData, epgChannelMeta, epgLoaded,
    parseXMLTV, importEpgFromFile, clearEpg, triggerEpgImport,
    getCurrentProgram, getNextProgram, getTodayPrograms, formatEpgTime,
  }
}
`)
console.log('✓ useEpg.js')

// ── useAutoDetect.js ──────────────────────────────────────────────────────────
fs.writeFileSync('src/composables/useAutoDetect.js',
`import { ref, computed, reactive } from 'vue'

${sourcesBlock}

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

${get('normName', 'strSimilarity', 'parseM3UforAutoDetect',
      'toggleAutoDetectSource', 'toggleEnrichmentSource',
      'runAutoDetect', 'toggleExpand', 'openAutoDetect', 'applyAutoDetect', 'toggleAllAutoDetect')}

${get('filteredAutoDetect', 'autoDetectFieldStats', 'autoDetectSummary', 'autoDetectAllSelected')}

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
`)
console.log('✓ useAutoDetect.js')

// ── useAppComputed.js ─────────────────────────────────────────────────────────
fs.writeFileSync('src/composables/useAppComputed.js',
`import { computed } from 'vue'

export function useAppComputed(channels, filters, sort, pagination, epgLoaded) {
${get('visibleTabs', 'groupOptions', 'filteredChannels', 'totalPages',
      'paginatedChannels', 'stats', 'groupList', 'hasActiveFilters')}

  return {
    visibleTabs, groupOptions, filteredChannels,
    totalPages, paginatedChannels, stats, groupList, hasActiveFilters,
  }
}
`)
console.log('✓ useAppComputed.js')

// ── App.vue — plný orchestrátor ───────────────────────────────────────────────
fs.writeFileSync('src/App.vue',
`<template>
  <div :data-theme="theme" style="background:var(--bg);color:var(--text);min-height:100vh">
    <p style="padding:2rem">✅ Composables načítané — template sa portuje</p>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useI18n }         from './composables/useI18n.js'
import { useTheme }        from './composables/useTheme.js'
import { useChannels }     from './composables/useChannels.js'
import { useEpg }          from './composables/useEpg.js'
import { useAutoDetect }   from './composables/useAutoDetect.js'
import { useAppComputed }  from './composables/useAppComputed.js'
import { icon }            from './composables/useIcons.js'

const toast = reactive({ show: false, message: '' })
let toastTimer = null
function showToast(msg) {
  toast.show = true; toast.message = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

const { lang, t, setLang }             = useI18n()
const { theme, setTheme, toggleTheme } = useTheme()

const {
  channels, importMode, importUrl, importLoading, importFileRef,
  logoErrors, modal, editCh, editSnapshot, deleteTarget, selectedRows,
  persist, toggleChannel, editChannel, openAddChannel,
  closeEditSafe, forceCloseEdit, saveEdit,
  removeChannel, confirmDelete, clearAll,
  triggerImport, importFromFile, exportPlaylist,
  selectRow, toggleRowSelect, toggleSelectAll, deleteSelected,
} = useChannels(t, showToast)

const {
  epgRef, epgData, epgChannelMeta, epgLoaded,
  parseXMLTV, importEpgFromFile, clearEpg, triggerEpgImport,
  getCurrentProgram, getNextProgram, getTodayPrograms, formatEpgTime,
} = useEpg()

const activeTab     = ref('library')
const mobFilterOpen = ref(false)
const filters       = reactive({ search: '', group: '', quality: '', status: 'all', country: '' })
const sort          = reactive({ by: 'name', asc: true })
const pagination    = reactive({ page: 1, limit: 100 })

const {
  visibleTabs, groupOptions, filteredChannels,
  totalPages, paginatedChannels, stats, groupList, hasActiveFilters,
} = useAppComputed(channels, filters, sort, pagination, epgLoaded)

const {
  IPTV_SOURCES, ENRICHMENT_SOURCES,
  autoDetectResults, autoDetectFilter, autoDetectPrefilter,
  autoDetectCustomUrl, sourceLoading, sourceLoaded,
  autoDetectSelectedSources, expandedRows, apiNormMap,
  enrichmentLoading, enrichmentLoaded, enrichmentSelectedSources,
  filteredAutoDetectResults, autoDetectFieldStats, autoDetectSummary, autoDetectAllSelected,
  runAutoDetect, toggleExpand, openAutoDetect, applyAutoDetect, toggleAllAutoDetect,
  toggleAutoDetectSource, toggleEnrichmentSource,
} = useAutoDetect(
  channels,
  computed(() => epgData.value),
  computed(() => ({})),
  computed(() => ({})),
  computed(() => ({})),
  t, showToast
)

${get('setSort', 'prevPage', 'nextPage', 'resetFilters', 'handleKeydown')}

const selectedRowsCount = computed(() => selectedRows.size)
const allPageSelected   = computed(() =>
  paginatedChannels.value.length > 0 &&
  paginatedChannels.value.every(ch => selectedRows.has(ch.id))
)
const editIsDirty = computed(() => {
  if (!editCh.value || !editSnapshot.value) return false
  return JSON.stringify(editCh.value) !== JSON.stringify(editSnapshot.value)
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
})
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>
`)
console.log('✓ App.vue')

console.log('\n✅ Hotovo! Spusti: npm run build')
