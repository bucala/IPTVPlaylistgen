import fs from 'node:fs'
import path from 'node:path'

const LEGACY = fs.readdirSync('legacy').find(f => f.startsWith('index.pre-vite') && f.endsWith('.html'))
if (!LEGACY) { console.error('Legacy HTML not found in legacy/'); process.exit(1) }

const src = fs.readFileSync(path.join('legacy', LEGACY), 'utf8')
const lines = src.split('\n')

console.log(`Parsing ${lines.length} lines from ${LEGACY}`)

// ── Helpers ──────────────────────────────────────────────────────────────────
function extract(fromPattern, toPattern) {
  const start = lines.findIndex(l => fromPattern.test(l))
  if (start === -1) return ''
  let depth = 0, end = start
  for (let i = start; i < lines.length; i++) {
    if (toPattern.test(lines[i])) { end = i; break }
  }
  return lines.slice(start, end + 1).join('\n')
}

function extractBetween(startIdx, endIdx) {
  return lines.slice(startIdx, endIdx + 1).join('\n')
}

function findLine(pattern, from = 0) {
  for (let i = from; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i
  }
  return -1
}

function findClosingDiv(startIdx) {
  let depth = 0
  for (let i = startIdx; i < lines.length; i++) {
    const opens = (lines[i].match(/<div/g) || []).length
    const closes = (lines[i].match(/<\/div>/g) || []).length
    depth += opens - closes
    if (i > startIdx && depth <= 0) return i
  }
  return lines.length - 1
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content.trimStart() + '\n')
  console.log(`  ✓ ${filePath}`)
}

// ── 1. CSS Design Tokens → src/styles.css ────────────────────────────────────
const cssStart = findLine(/Apple HIG Design Tokens/)
const cssEnd = findLine(/<\/style>/, cssStart)
const cssTokens = lines.slice(cssStart - 1, cssEnd).join('\n')

write('src/styles.css',
`@tailwind base;
@tailwind components;
@tailwind utilities;

${cssTokens}
`)

// ── 2. i18n composable ────────────────────────────────────────────────────────
const i18nStart = findLine(/const MESSAGES\s*=|const messages\s*=|'sk'\s*:\s*\{/)
const i18nEnd = findLine(/^\s*\}(\s*\/\/.*)?$/, i18nStart + 50)
// Find the full MESSAGES/translations block
let msStart = -1, msEnd = -1
for (let i = 0; i < lines.length; i++) {
  if (/const MESSAGES\s*=/.test(lines[i]) || (/const [a-z]+ = \{/.test(lines[i]) && /sk/.test(lines[i+1] || ''))) {
    msStart = i; break
  }
}
// Find lang/t() related functions
const tFnStart = findLine(/function t\s*\(|const t\s*=|computed.*lang/)
const setLangLine = findLine(/function setLang/)

write('src/composables/useI18n.js',
`import { ref, computed } from 'vue'
import { uiStore } from './storage.js'

${msStart > -1 ? lines.slice(msStart, msStart + 80).join('\n') : '// TODO: paste MESSAGES object from legacy HTML'}

export function useI18n() {
  const lang = ref(uiStore.get('iptv-lang', 'sk'))

  const t = (key, vars) => {
    const msg = MESSAGES[lang.value]?.[key] || MESSAGES['sk']?.[key] || key
    if (!vars) return msg
    return Object.entries(vars).reduce((s, [k, v]) => s.replace('{' + k + '}', v), msg)
  }

  function setLang(l) {
    lang.value = l
    uiStore.set('iptv-lang', l)
    document.documentElement.lang = l
  }

  return { lang, t, setLang }
}
`)

// ── 3. useTheme composable ────────────────────────────────────────────────────
write('src/composables/useTheme.js',
`import { ref } from 'vue'
import { uiStore } from './storage.js'

export function useTheme() {
  const theme = ref(uiStore.get('iptv-theme', 'dark'))

  function setTheme(t) {
    theme.value = t
    uiStore.set('iptv-theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, setTheme, toggleTheme }
}
`)

// ── 4. useChannels composable ─────────────────────────────────────────────────
const channelsStart = findLine(/const channels\s*=\s*ref/)
const persistLine = findLine(/function persist\s*\(/)
const exportPlaylistLine = findLine(/function exportPlaylist/)
const exportEnd = findLine(/^    \}$/, exportPlaylistLine + 5)

write('src/composables/useChannels.js',
`import { ref, computed, reactive } from 'vue'
import { uiStore, sessionStore } from './storage.js'

// Paste full channel logic from legacy HTML lines ~${channelsStart}–${exportPlaylistLine + 30}
// Key functions to port:
//   persist(), loadChannels(), newId(), toggleChannel()
//   editChannel(), openAddChannel(), saveEdit(), closeEditSafe()
//   forceCloseEdit(), removeChannel(), confirmDelete(), clearAll()
//   importFromFile(), importFromUrl(), triggerImport()
//   exportPlaylist()
//   URL validation whitelist
//   50MB file size limit

export function useChannels() {
  const channels = ref(uiStore.get('iptv-channels', []))
  const modal = reactive({ import: false, edit: false, add: false, deleteConfirm: false, unsaved: false, autoDetect: false })
  const editCh = ref(null)
  const editIsDirty = ref(false)
  const deleteTarget = ref(null)
  const selectedId = ref(null)
  const selectedRows = reactive(new Set())
  const importMode = ref('file')
  const importUrl = ref('')
  const importLoading = ref(false)
  const importFileRef = ref(null)
  const logoErrors = reactive(new Set())

  function persist() {
    uiStore.set('iptv-channels', channels.value)
  }

  // TODO: port remaining functions from legacy/index.pre-vite.*.html

  return {
    channels, modal, editCh, editIsDirty, deleteTarget,
    selectedId, selectedRows, importMode, importUrl,
    importLoading, importFileRef, logoErrors,
    persist,
  }
}
`)

// ── 5. useEpg composable ──────────────────────────────────────────────────────
const epgStart = findLine(/epgData\s*=\s*ref|const epgData/)
const parseXmltvLine = findLine(/function parseXMLTV|parseXMLTV/)

write('src/composables/useEpg.js',
`import { ref, computed } from 'vue'

// Port from legacy HTML lines ~${epgStart}–${parseXmltvLine + 60}
// Key functions to port:
//   parseXMLTV(), importEpgFromFile(), triggerEpgImport(), clearEpg()
//   getCurrentProgram(), getNextProgram(), getTodayPrograms(), formatEpgTime()
//   epgChannelIndex, epgXmlIndex, epgChannelMeta

export function useEpg() {
  const epgData = ref({})
  const epgLoaded = ref(false)
  const epgRef = ref(null)
  const epgChannelIndex = ref(new Map())
  const epgXmlIndex = ref(new Map())

  function parseXMLTV(xmlText) {
    // TODO: port from legacy HTML
  }

  function clearEpg() {
    epgData.value = {}
    epgLoaded.value = false
    epgChannelIndex.value = new Map()
    epgXmlIndex.value = new Map()
  }

  return {
    epgData, epgLoaded, epgRef,
    epgChannelIndex, epgXmlIndex,
    parseXMLTV, clearEpg,
  }
}
`)

// ── 6. useAutoDetect composable ───────────────────────────────────────────────
const adStart = findLine(/function runAutoDetect|autoDetectResults/)
const adSourcesLine = findLine(/IPTV_SOURCES|ENRICHMENT_SOURCES/)

write('src/composables/useAutoDetect.js',
`import { ref, computed, reactive } from 'vue'

// Port from legacy HTML lines ~${adStart}–${adStart + 120}
// Key functions to port:
//   runAutoDetect(), openAutoDetect(), applyAutoDetect()
//   fetchAndRunAutoDetect(), toggleAutoDetectSource(), toggleEnrichmentSource()
//   toggleAllAutoDetect(), toggleExpand()
//   IPTV_SOURCES, ENRICHMENT_SOURCES constants (~line ${adSourcesLine})
//   fuzzy matching logic (trigram similarity, normalization, diacritics)

export function useAutoDetect(channels, epgChannelIndex, epgXmlIndex, logoChannelIndex) {
  const autoDetectResults = ref([])
  const autoDetectFilter = ref('all')
  const autoDetectPrefilter = ref(null)
  const autoDetectCustomUrl = ref('')
  const autoDetectSelectedSources = reactive(new Set())
  const enrichmentSelectedSources = reactive(new Set())
  const sourceLoading = ref(false)
  const sourceLoaded = ref(false)
  const enrichmentLoading = ref(false)
  const enrichmentLoaded = ref(false)
  const expandedRows = reactive(new Set())
  const apiNormMap = ref(new Map())

  // TODO: port from legacy HTML

  return {
    autoDetectResults, autoDetectFilter, autoDetectPrefilter,
    autoDetectCustomUrl, autoDetectSelectedSources, enrichmentSelectedSources,
    sourceLoading, sourceLoaded, enrichmentLoading, enrichmentLoaded,
    expandedRows, apiNormMap,
  }
}
`)

// ── 7. Extract HTML template sections ────────────────────────────────────────

// Find main template boundaries
const templateBodyStart = findLine(/<div id="app"/)
const templateBodyEnd = findLine(/^<\/body>/)

// Find modal starts
const importModalStart = findLine(/Import Modal/)
const editModalStart = findLine(/Edit \/ Add Channel Modal/)
const deleteModalStart = findLine(/v-if="modal\.deleteConfirm"/)
const unsavedModalStart = findLine(/v-if="modal\.unsaved"/)
const autoDetectModalStart = findLine(/Autodetect Modal/)
const autoDetectModalEnd = findLine(/<\/div>\s*$/, autoDetectModalStart + 200)

// Find tab sections
const librarySectionStart = findLine(/v-if="activeTab === 'library'" class="glass rounded-\[24px\]/)
const librarySectionEnd = findLine(/v-if="activeTab === 'content'"/, librarySectionStart)
const contentSectionEnd = findLine(/v-if="activeTab === 'design'"/, librarySectionStart)
const designSectionEnd = findLine(/<!-- Import Modal/, librarySectionStart)

console.log('\nDetected boundaries:')
console.log('  Import modal:', importModalStart)
console.log('  Edit modal:', editModalStart)
console.log('  Delete modal:', deleteModalStart)
console.log('  Unsaved modal:', unsavedModalStart)
console.log('  AutoDetect modal:', autoDetectModalStart)
console.log('  Library section:', librarySectionStart)
console.log('  Content section:', librarySectionEnd)
console.log('  Design section:', contentSectionEnd)

// ── 8. Write component stubs with extracted template ─────────────────────────

write('src/components/AppHeader.vue',
`<template>
  <!-- Port header HTML from legacy HTML lines 460–530 (approx) -->
  <!-- Includes: logo, Import btn, EPG btn, AutoDetect btn, theme/lang toggles -->
  <header class="app-header">
    <slot />
  </header>
</template>

<script setup>
defineProps(['stats', 'epgLoaded', 'lang', 'theme'])
defineEmits(['import', 'epg', 'autoDetect', 'toggleTheme', 'setLang'])
</script>
`)

write('src/components/MobileTabBar.vue',
`<template>
  <!-- Port .mob-tabs section from legacy HTML lines ~480–500 -->
  <!-- Includes: Library/Content/Design tabs with badge -->
</template>

<script setup>
defineProps(['tabs', 'activeTab', 'stats'])
defineEmits(['tabChange'])
</script>
`)

write('src/components/LibraryTab.vue',
`<template>
  <!-- Port from legacy HTML lines ~${librarySectionStart}–${librarySectionEnd} -->
  <!-- Includes: filter sidebar, channel table, EPG panel, pagination, bulk actions -->
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps([
  'channels', 'filters', 'sort', 'pagination', 'paginatedChannels',
  'totalPages', 'groupOptions', 'stats', 'epgLoaded', 'epgData',
  'selectedId', 'selectedRows', 'allPageSelected', 'selectedRowsCount',
  'logoErrors', 'mobFilterOpen', 'hasActiveFilters', 't'
])
const emit = defineEmits([
  'edit', 'delete', 'toggleChannel', 'selectRow', 'toggleRowSelect',
  'toggleSelectAll', 'deleteSelected', 'prevPage', 'nextPage',
  'setSort', 'resetFilters', 'filterChange', 'openAdd'
])
</script>
`)

write('src/components/ContentTab.vue',
`<template>
  <!-- Port from legacy HTML lines ~${librarySectionEnd}–${contentSectionEnd} -->
  <!-- Includes: quality stat cards (4K/FHD/HD/SD), group list with quick-filter -->
</template>

<script setup>
defineProps(['stats', 'groupList', 't'])
defineEmits(['filterByGroup'])
</script>
`)

write('src/components/DesignTab.vue',
`<template>
  <!-- Port from legacy HTML lines ~${contentSectionEnd}–${designSectionEnd} -->
  <!-- Includes: theme toggle, language switcher -->
</template>

<script setup>
defineProps(['theme', 'lang', 't'])
defineEmits(['toggleTheme', 'setLang'])
</script>
`)

write('src/components/ImportModal.vue',
`<template>
  <!-- Port from legacy HTML lines ~${importModalStart}–${editModalStart - 1} -->
  <!-- role="dialog" aria-modal file picker + URL mode -->
</template>

<script setup>
defineProps(['show', 'importMode', 'importUrl', 'importLoading', 'importFileRef', 't'])
defineEmits(['close', 'importFile', 'importUrl', 'modeChange'])
</script>
`)

write('src/components/EditModal.vue',
`<template>
  <!-- Port from legacy HTML lines ~${editModalStart}–${deleteModalStart - 1} -->
  <!-- role="dialog" edit + add channel, logo preview, TVG fields, dirty-check -->
</template>

<script setup>
defineProps(['show', 'isAdd', 'editCh', 'editIsDirty', 't'])
defineEmits(['close', 'save', 'closeSafe'])
</script>
`)

write('src/components/DeleteModal.vue',
`<template>
  <!-- Port from legacy HTML lines ~${deleteModalStart}–${unsavedModalStart - 1} -->
  <!-- role="alertdialog" confirm delete -->
</template>

<script setup>
defineProps(['show', 'target', 't'])
defineEmits(['confirm', 'cancel'])
</script>
`)

write('src/components/UnsavedModal.vue',
`<template>
  <!-- Port from legacy HTML lines ~${unsavedModalStart}–${autoDetectModalStart - 1} -->
  <!-- role="alertdialog" unsaved changes guard -->
</template>

<script setup>
defineProps(['show', 't'])
defineEmits(['keepEditing', 'discard'])
</script>
`)

write('src/components/AutoDetectModal.vue',
`<template>
  <!-- Port from legacy HTML lines ~${autoDetectModalStart}–end of modal -->
  <!-- role="dialog" fuzzy EPG matching table, source selector, apply button -->
</template>

<script setup>
defineProps([
  'show', 'results', 'filter', 'summary', 'allSelected', 'fieldStats',
  'selectedSources', 'enrichmentSources', 'enrichmentLoaded',
  'sourceLoading', 'expandedRows', 't'
])
defineEmits(['close', 'apply', 'runAgain', 'toggleSource', 'toggleAll', 'filterChange'])
</script>
`)

// ── 9. Rewrite App.vue to orchestrate components ──────────────────────────────
write('src/App.vue',
`<template>
  <div :data-theme="theme" class="min-h-screen" style="background:var(--bg);color:var(--text)">

    <AppHeader
      :stats="stats"
      :epg-loaded="epgLoaded"
      :lang="lang"
      :theme="theme"
      @import="modal.import = true"
      @epg="triggerEpgImport"
      @auto-detect="openAutoDetect"
      @toggle-theme="toggleTheme"
      @set-lang="setLang"
    />

    <MobileTabBar
      :tabs="visibleTabs"
      :active-tab="activeTab"
      :stats="stats"
      @tab-change="tab => { activeTab = tab; mobFilterOpen = false }"
    />

    <main class="main-content">
      <LibraryTab v-if="activeTab === 'library'"
        v-bind="libraryProps"
        @edit="editChannel"
        @delete="confirmDelete"
        @toggle-channel="toggleChannel"
        @select-row="selectRow"
        @open-add="openAddChannel"
      />

      <ContentTab v-if="activeTab === 'content'"
        :stats="stats"
        :group-list="groupList"
        :t="t"
        @filter-by-group="g => { filters.group = g; activeTab = 'library' }"
      />

      <DesignTab v-if="activeTab === 'design'"
        :theme="theme"
        :lang="lang"
        :t="t"
        @toggle-theme="toggleTheme"
        @set-lang="setLang"
      />
    </main>

    <ImportModal   :show="modal.import"   v-bind="importProps"  @close="modal.import = false" />
    <EditModal     :show="modal.edit || modal.add" v-bind="editProps" @close-safe="closeEditSafe" @save="saveEdit" />
    <DeleteModal   :show="modal.deleteConfirm" :target="deleteTarget" :t="t" @confirm="removeChannel(deleteTarget)" @cancel="modal.deleteConfirm = false" />
    <UnsavedModal  :show="modal.unsaved" :t="t" @keep-editing="modal.unsaved = false" @discard="forceCloseEdit" />
    <AutoDetectModal :show="modal.autoDetect" v-bind="autoDetectProps" @close="modal.autoDetect = false" @apply="applyAutoDetect" />

    <transition name="toast-fade">
      <div v-if="toast.visible" class="toast" role="status" aria-live="polite" aria-atomic="true">
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import AppHeader       from './components/AppHeader.vue'
import MobileTabBar    from './components/MobileTabBar.vue'
import LibraryTab      from './components/LibraryTab.vue'
import ContentTab      from './components/ContentTab.vue'
import DesignTab       from './components/DesignTab.vue'
import ImportModal     from './components/ImportModal.vue'
import EditModal       from './components/EditModal.vue'
import DeleteModal     from './components/DeleteModal.vue'
import UnsavedModal    from './components/UnsavedModal.vue'
import AutoDetectModal from './components/AutoDetectModal.vue'
import { useI18n }        from './composables/useI18n.js'
import { useTheme }       from './composables/useTheme.js'
import { useChannels }    from './composables/useChannels.js'
import { useEpg }         from './composables/useEpg.js'
import { useAutoDetect }  from './composables/useAutoDetect.js'

// ── composables ──
const { lang, t, setLang }              = useI18n()
const { theme, setTheme, toggleTheme }  = useTheme()
const channelStore                      = useChannels()
const epgStore                          = useEpg()
const autoStore                         = useAutoDetect(
  channelStore.channels,
  epgStore.epgChannelIndex,
  epgStore.epgXmlIndex,
)

// ── destructure for template ──
const { channels, modal, editCh, editIsDirty, deleteTarget,
        selectedId, selectedRows, importMode, importUrl,
        importLoading, importFileRef, logoErrors,
        persist, } = channelStore

const { epgData, epgLoaded, epgRef,
        parseXMLTV, clearEpg,
        triggerEpgImport, importEpgFromFile,
        getCurrentProgram, getNextProgram, getTodayPrograms, formatEpgTime,
} = epgStore

const { autoDetectResults, autoDetectFilter, autoDetectPrefilter,
        autoDetectSelectedSources, enrichmentSelectedSources,
        sourceLoading, sourceLoaded, enrichmentLoaded, expandedRows,
        openAutoDetect, applyAutoDetect, runAutoDetect,
} = autoStore

// ── local state ──
const activeTab = ref('library')
const mobFilterOpen = ref(false)
const toast = reactive({ visible: false, message: '' })
const filters = reactive({ search: '', group: '', quality: '', country: '', status: 'all' })
const sort = reactive({ col: 'name', dir: 'asc' })
const pagination = reactive({ page: 1, perPage: 100 })

// ── TODO: port computed properties (stats, filteredChannels, paginatedChannels, etc.) ──
// ── TODO: port functions (toggleChannel, editChannel, saveEdit, etc.) ──

const libraryProps = computed(() => ({
  channels: channels.value, filters, sort, pagination,
  paginatedChannels: [], totalPages: 1,
  groupOptions: [], stats: {}, epgLoaded: epgLoaded.value,
  epgData: epgData.value, selectedId: selectedId.value,
  selectedRows, logoErrors, mobFilterOpen: mobFilterOpen.value,
  hasActiveFilters: false, t,
}))

const importProps = computed(() => ({
  importMode: importMode.value, importUrl: importUrl.value,
  importLoading: importLoading.value, importFileRef: importFileRef.value, t,
}))

const editProps = computed(() => ({
  isAdd: modal.add, editCh: editCh.value, editIsDirty: editIsDirty.value, t,
}))

const autoDetectProps = computed(() => ({
  results: autoDetectResults.value, filter: autoDetectFilter.value,
  selectedSources: autoDetectSelectedSources, sourceLoading: sourceLoading.value,
  enrichmentLoaded: enrichmentLoaded.value, expandedRows, t,
}))

const visibleTabs = computed(() => [
  { id: 'library', label: 'Library', icon: '📺' },
  { id: 'content', label: 'Content', icon: '📊' },
  { id: 'design',  label: 'Design',  icon: '🎨' },
])

// ── lifecycle ──
onMounted(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
})

function showToast(msg, dur = 3000) {
  toast.message = msg
  toast.visible = true
  setTimeout(() => { toast.visible = false }, dur)
}

function setSort(col) {
  if (sort.col === col) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'
  else { sort.col = col; sort.dir = 'asc' }
  pagination.page = 1
}

function selectRow(ch, event) {
  if (event?.target?.closest('button, a, input[type="checkbox"]')) return
  selectedId.value = selectedId.value === ch.id ? null : ch.id
}
</script>
`)

// ── 10. Final report ──────────────────────────────────────────────────────────
console.log('\n✅ Scaffold complete. Files written:')
console.log('  src/styles.css                  — Apple HIG tokens + Tailwind')
console.log('  src/App.vue                     — orchestrator with all imports')
console.log('  src/components/AppHeader.vue')
console.log('  src/components/MobileTabBar.vue')
console.log('  src/components/LibraryTab.vue')
console.log('  src/components/ContentTab.vue')
console.log('  src/components/DesignTab.vue')
console.log('  src/components/ImportModal.vue')
console.log('  src/components/EditModal.vue')
console.log('  src/components/DeleteModal.vue')
console.log('  src/components/UnsavedModal.vue')
console.log('  src/components/AutoDetectModal.vue')
console.log('  src/composables/useI18n.js')
console.log('  src/composables/useTheme.js')
console.log('  src/composables/useChannels.js')
console.log('  src/composables/useEpg.js')
console.log('  src/composables/useAutoDetect.js')
console.log('')
console.log('⚠️  Next: port actual logic from legacy HTML into composables.')
console.log('   Open legacy/' + LEGACY)
console.log('   Lines to port per composable are marked with // TODO comments.')
