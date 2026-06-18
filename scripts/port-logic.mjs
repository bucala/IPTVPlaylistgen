import fs from 'node:fs'
import path from 'node:path'

const LEGACY = fs.readdirSync('legacy').find(f => f.startsWith('index.pre-vite') && f.endsWith('.html'))
const src = fs.readFileSync(path.join('legacy', LEGACY), 'utf8')
const lines = src.split('\n')

function findLine(pattern, from = 0) {
  for (let i = from; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i
  }
  return -1
}

function block(from, to) {
  return lines.slice(from, to + 1).join('\n')
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content + '\n')
  console.log(`  ✓ ${filePath}`)
}

// ── Locate key blocks ─────────────────────────────────────────────────────────
const scriptStart   = findLine(/<script>\s*$/)
const scriptEnd     = findLine(/<\/script>/)
const setupStart    = findLine(/setup\s*\(\s*\)/)
const returnStart   = findLine(/^\s*return\s*\{/)
const mountEnd      = findLine(/\.mount\('#app'\)/)

const cssStart      = findLine(/Apple HIG Design Tokens/)
const cssEnd        = findLine(/<\/style>/)

const messagesStart = findLine(/const MESSAGES\s*=/)
const messagesEnd   = findLine(/^\s*\}\s*$/, messagesStart + 10)

const iptvSources   = findLine(/const IPTV_SOURCES\s*=/)
const enrichSources = findLine(/const ENRICHMENT_SOURCES\s*=/)
const enrichEnd     = findLine(/^\s*\]\s*$/, enrichSources + 5)

const channelsRef   = findLine(/const channels\s*=\s*ref/)
const persistFn     = findLine(/function persist\s*\(/)
const newIdFn       = findLine(/function newId\s*\(/)
const toggleChFn    = findLine(/function toggleChannel\s*\(/)
const editChFn      = findLine(/function editChannel\s*\(/)
const openAddFn     = findLine(/function openAddChannel\s*\(/)
const closeEditFn   = findLine(/function closeEditSafe\s*\(/)
const forceCloseFn  = findLine(/function forceCloseEdit\s*\(/)
const saveEditFn    = findLine(/function saveEdit\s*\(/)
const removeChFn    = findLine(/function removeChannel\s*\(/)
const confirmDelFn  = findLine(/function confirmDelete\s*\(/)
const clearAllFn    = findLine(/function clearAll\s*\(/)
const triggerImpFn  = findLine(/function triggerImport\s*\(/)
const impFileFn     = findLine(/function importFromFile\s*\(/)
const impUrlFn      = findLine(/function importFromUrl\s*\(/)
const exportFn      = findLine(/function exportPlaylist\s*\(/)
const exportEnd     = findLine(/^\s*\}\s*$/, exportFn + 5)

const epgDataRef    = findLine(/const epgData\s*=\s*ref/)
const parseXmlFn    = findLine(/function parseXMLTV\s*\(/)
const trigEpgFn     = findLine(/function triggerEpgImport\s*\(/)
const impEpgFn      = findLine(/function importEpgFromFile\s*\(/)
const clearEpgFn    = findLine(/function clearEpg\s*\(/)
const getCurrFn     = findLine(/function getCurrentProgram\s*\(/)
const getNextFn     = findLine(/function getNextProgram\s*\(/)
const getTodayFn    = findLine(/function getTodayPrograms\s*\(/)
const fmtEpgFn      = findLine(/function formatEpgTime\s*\(/)

const statsComp     = findLine(/stats\s*=\s*computed/)
const filtChComp    = findLine(/filteredChannels\s*=\s*computed/)
const pagChComp     = findLine(/paginatedChannels\s*=\s*computed/)
const totalPgComp   = findLine(/totalPages\s*=\s*computed/)
const grpOptComp    = findLine(/groupOptions\s*=\s*computed/)
const grpListComp   = findLine(/groupList\s*=\s*computed/)
const hasActFilters = findLine(/hasActiveFilters\s*=\s*computed/)
const visTabsComp   = findLine(/visibleTabs\s*=\s*computed/)

const runAutoFn     = findLine(/function runAutoDetect\s*\(/)
const fetchRunFn    = findLine(/function fetchAndRunAutoDetect\s*\(/)
const toggleSrcFn   = findLine(/function toggleAutoDetectSource\s*\(/)
const toggleEnrFn   = findLine(/function toggleEnrichmentSource\s*\(/)
const openAutoFn    = findLine(/function openAutoDetect\s*\(/)
const applyAutoFn   = findLine(/function applyAutoDetect\s*\(/)
const toggleAllADFn = findLine(/function toggleAllAutoDetect\s*\(/)
const toggleExpFn   = findLine(/function toggleExpand\s*\(/)

const iconFn        = findLine(/function icon\s*\(/)
const showToastFn   = findLine(/function showToast\s*\(/)
const setSortFn     = findLine(/function setSort\s*\(/)
const prevPageFn    = findLine(/function prevPage\s*\(/)
const nextPageFn    = findLine(/function nextPage\s*\(/)
const resetFiltFn   = findLine(/function resetFilters\s*\(/)
const selectRowFn   = findLine(/function selectRow\s*\(/)
const togRowSelFn   = findLine(/function toggleRowSelect\s*\(/)
const togSelAllFn   = findLine(/function toggleSelectAll\s*\(/)
const delSelFn      = findLine(/function deleteSelected\s*\(/)

console.log('Script block:', scriptStart, '→', scriptEnd)
console.log('setup():', setupStart)
console.log('MESSAGES:', messagesStart, '→', messagesEnd)
console.log('IPTV_SOURCES:', iptvSources, 'ENRICHMENT_SOURCES:', enrichSources)
console.log('channels ref:', channelsRef)
console.log('persist:', persistFn, 'saveEdit:', saveEditFn, 'exportPlaylist:', exportFn)
console.log('epgData:', epgDataRef, 'parseXMLTV:', parseXmlFn)
console.log('stats computed:', statsComp, 'filteredChannels:', filtChComp)
console.log('runAutoDetect:', runAutoFn, 'openAutoDetect:', openAutoFn)

// ── Helper to find end of a function block ────────────────────────────────────
function fnEnd(startIdx, nextFnIdx) {
  if (nextFnIdx > startIdx) return nextFnIdx - 1
  // fallback: find closing brace
  let depth = 0
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++
      if (ch === '}') depth--
    }
    if (depth <= 0 && i > startIdx) return i
  }
  return startIdx + 30
}

// ── Build full setup block without return{} ───────────────────────────────────
const fullSetup = block(setupStart + 1, returnStart - 1)

// ── Extract CSS tokens ────────────────────────────────────────────────────────
const cssTokens = block(cssStart - 1, cssEnd - 1)

// ── Extract HTML template sections ───────────────────────────────────────────
const templateStart = findLine(/<div id="app"/)
const importModalStart = 868
const editModalStart   = 900
const delModalStart    = 983
const unsavedModalStart= 996
const autoDetModalStart= 1008
const autoDetModalEnd  = findLine(/^    <\/div>\s*$/, autoDetModalStart + 150)
const scriptTagLine    = findLine(/<\/div>\s*\n?\s*<script>/)

const libStart  = 616
const libEnd    = 782
const contStart = 784
const contEnd   = 831
const desStart  = 833
const desEnd    = 867

const headerStart = templateStart
const headerEnd   = 484

const mobTabStart = 485
const mobTabEnd   = 497

// ── Write: src/styles.css ─────────────────────────────────────────────────────
write('src/styles.css',
`@tailwind base;
@tailwind components;
@tailwind utilities;

${cssTokens}
`)

// ── Write: src/composables/useI18n.js ────────────────────────────────────────
const messagesBlock = block(messagesStart, messagesEnd + 200)
write('src/composables/useI18n.js',
`import { ref } from 'vue'
import { uiStore } from './storage.js'

${messagesBlock}

export function useI18n() {
  const lang = ref(uiStore.get('iptv-lang', 'sk'))

  function t(key, vars) {
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

// ── Write: src/composables/useChannels.js ────────────────────────────────────
const channelVars = block(channelsRef, epgDataRef - 1)
write('src/composables/useChannels.js',
`import { ref, computed, reactive } from 'vue'
import { uiStore, sessionStore } from './storage.js'

const ALLOWED_SCHEMES = /^(https?|rtmps?|rtsp|udp|rtp):/i

${channelVars}

export function useChannels(t, showToast) {
  function persist() {
    uiStore.set('iptv-channels', channels.value)
  }

  ${block(persistFn, fnEnd(persistFn, newIdFn))}
  ${block(newIdFn, fnEnd(newIdFn, toggleChFn))}
  ${block(toggleChFn, fnEnd(toggleChFn, editChFn))}
  ${block(editChFn, fnEnd(editChFn, openAddFn))}
  ${block(openAddFn, fnEnd(openAddFn, closeEditFn))}
  ${block(closeEditFn, fnEnd(closeEditFn, forceCloseFn))}
  ${block(forceCloseFn, fnEnd(forceCloseFn, saveEditFn))}
  ${block(saveEditFn, fnEnd(saveEditFn, removeChFn))}
  ${block(removeChFn, fnEnd(removeChFn, confirmDelFn))}
  ${block(confirmDelFn, fnEnd(confirmDelFn, clearAllFn))}
  ${block(clearAllFn, fnEnd(clearAllFn, triggerImpFn))}
  ${block(triggerImpFn, fnEnd(triggerImpFn, impFileFn))}
  ${block(impFileFn, fnEnd(impFileFn, impUrlFn))}
  ${block(impUrlFn, fnEnd(impUrlFn, exportFn))}
  ${block(exportFn, fnEnd(exportFn, epgDataRef - 1))}

  return {
    channels, modal, editCh, editIsDirty, deleteTarget,
    selectedId, selectedRows, importMode, importUrl,
    importLoading, importFileRef, logoErrors,
    persist,
    toggleChannel, editChannel, openAddChannel,
    closeEditSafe, forceCloseEdit, saveEdit,
    removeChannel, confirmDelete, clearAll,
    triggerImport, importFromFile, importFromUrl,
    exportPlaylist,
  }
}
`)

// ── Write: src/composables/useEpg.js ─────────────────────────────────────────
const epgVars = block(epgDataRef, parseXmlFn - 1)
write('src/composables/useEpg.js',
`import { ref } from 'vue'

${epgVars}

export function useEpg() {
  ${block(parseXmlFn, fnEnd(parseXmlFn, trigEpgFn))}
  ${block(trigEpgFn, fnEnd(trigEpgFn, impEpgFn))}
  ${block(impEpgFn, fnEnd(impEpgFn, clearEpgFn))}
  ${block(clearEpgFn, fnEnd(clearEpgFn, getCurrFn))}
  ${block(getCurrFn, fnEnd(getCurrFn, getNextFn))}
  ${block(getNextFn, fnEnd(getNextFn, getTodayFn))}
  ${block(getTodayFn, fnEnd(getTodayFn, fmtEpgFn))}
  ${block(fmtEpgFn, fnEnd(fmtEpgFn, fmtEpgFn + 20))}

  return {
    epgData, epgLoaded, epgRef,
    epgChannelIndex, epgXmlIndex, epgChannelMeta,
    parseXMLTV, triggerEpgImport, importEpgFromFile, clearEpg,
    getCurrentProgram, getNextProgram, getTodayPrograms, formatEpgTime,
  }
}
`)

// ── Write: src/composables/useAutoDetect.js ───────────────────────────────────
const adStart2  = findLine(/const autoDetectResults\s*=/)
const adVars    = block(adStart2, runAutoFn - 1)
const sourcesBlock = block(iptvSources, enrichEnd + 50)

write('src/composables/useAutoDetect.js',
`import { ref, computed, reactive } from 'vue'

${sourcesBlock}

${adVars}

export function useAutoDetect(channels, epgChannelIndex, epgXmlIndex, logoChannelIndex, logoChannelIndexById, t) {
  ${block(runAutoFn, fnEnd(runAutoFn, fetchRunFn))}
  ${block(fetchRunFn, fnEnd(fetchRunFn, toggleSrcFn))}
  ${block(toggleSrcFn, fnEnd(toggleSrcFn, toggleEnrFn))}
  ${block(toggleEnrFn, fnEnd(toggleEnrFn, openAutoFn))}
  ${block(openAutoFn, fnEnd(openAutoFn, applyAutoFn))}
  ${block(applyAutoFn, fnEnd(applyAutoFn, toggleAllADFn))}
  ${block(toggleAllADFn, fnEnd(toggleAllADFn, toggleExpFn))}
  ${block(toggleExpFn, fnEnd(toggleExpFn, toggleExpFn + 5))}

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
`)

// ── Write computed + utils into App.vue helpers ───────────────────────────────
const computedBlock = block(statsComp, visTabsComp + 15)
const iconBlock     = block(iconFn, fnEnd(iconFn, showToastFn))

write('src/composables/useAppComputed.js',
`import { computed } from 'vue'

export function useAppComputed(channels, filters, sort, pagination, epgLoaded) {

${computedBlock}

  return {
    stats, filteredChannels, paginatedChannels,
    totalPages, groupOptions, groupList,
    hasActiveFilters, visibleTabs,
  }
}

// Icon helper (SVG)
export ${iconBlock}
`)

// ── Write HTML template sections ──────────────────────────────────────────────
const libTemplate     = block(libStart, libEnd)
const contTemplate    = block(contStart, contEnd)
const desTemplate     = block(desStart, desEnd)
const importModal     = block(importModalStart, editModalStart - 1)
const editModal       = block(editModalStart, delModalStart - 1)
const delModal        = block(delModalStart, unsavedModalStart - 1)
const unsavedModal    = block(unsavedModalStart, autoDetModalStart - 1)
const autoDetModal    = block(autoDetModalStart, autoDetModalEnd)

write('src/components/LibraryTab.vue',
`<template>
${libTemplate}
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps([
  'channels','filters','sort','pagination','paginatedChannels',
  'totalPages','groupOptions','stats','epgLoaded','epgData',
  'selectedId','selectedRows','allPageSelected','selectedRowsCount',
  'logoErrors','mobFilterOpen','hasActiveFilters','t',
  'epgRef','icon'
])
const emit = defineEmits([
  'edit','delete','toggleChannel','selectRow','toggleRowSelect',
  'toggleSelectAll','deleteSelected','prevPage','nextPage',
  'setSort','resetFilters','filterChange','openAdd','setFilter',
  'triggerEpgImport','clearEpg','getCurrentProgram','getTodayPrograms','formatEpgTime'
])
</script>
`)

write('src/components/ContentTab.vue',
`<template>
${contTemplate}
</template>

<script setup>
defineProps(['stats','groupList','t','icon'])
defineEmits(['filterByGroup'])
</script>
`)

write('src/components/DesignTab.vue',
`<template>
${desTemplate}
</template>

<script setup>
defineProps(['theme','lang','t','icon'])
defineEmits(['toggleTheme','setLang'])
</script>
`)

write('src/components/ImportModal.vue',
`<template>
${importModal}
</template>

<script setup>
defineProps(['importMode','importUrl','importLoading','importFileRef','t','icon'])
defineEmits(['close','importFile','importFromUrl','modeChange'])
</script>
`)

write('src/components/EditModal.vue',
`<template>
${editModal}
</template>

<script setup>
defineProps(['show','isAdd','editCh','editIsDirty','t','icon'])
defineEmits(['close','save','closeSafe'])
</script>
`)

write('src/components/DeleteModal.vue',
`<template>
${delModal}
</template>

<script setup>
defineProps(['show','target','t','icon'])
defineEmits(['confirm','cancel'])
</script>
`)

write('src/components/UnsavedModal.vue',
`<template>
${unsavedModal}
</template>

<script setup>
defineProps(['show','t'])
defineEmits(['keepEditing','discard'])
</script>
`)

write('src/components/AutoDetectModal.vue',
`<template>
${autoDetModal}
</template>

<script setup>
defineProps([
  'show','results','filter','summary','allSelected','fieldStats',
  'selectedSources','enrichmentSources','enrichmentLoaded',
  'sourceLoading','expandedRows','t','icon',
  'autoDetectPrefilter','autoDetectCustomUrl','enrichmentSelectedSources',
  'IPTV_SOURCES','ENRICHMENT_SOURCES'
])
defineEmits(['close','apply','runAgain','toggleSource','toggleEnrichment','toggleAll','filterChange','toggleExpand'])
</script>
`)

// ── Write final App.vue ───────────────────────────────────────────────────────
write('src/App.vue',
`<template>
  <div :data-theme="theme" class="min-h-screen" style="background:var(--bg);color:var(--text)">

    <!-- Header -->
    <header class="app-header">
      ${block(headerStart, 484)}
    </header>

    <!-- Mobile tab bar -->
    ${block(mobTabStart, mobTabEnd)}

    <div class="app-layout">
      <!-- Sidebar -->
      <aside class="app-sidebar">
        <section class="glass rounded-[22px] p-4" v-if="activeTab === 'library'" aria-label="Filters">
          ${block(528, 578)}
        </section>
        <section class="glass rounded-[22px] p-4" v-if="activeTab === 'content'" aria-label="Quick stats">
          ${block(579, 597)}
        </section>
        <section class="glass rounded-[22px] p-4" v-if="activeTab === 'design'">
          ${block(598, 615)}
        </section>
      </aside>

      <!-- Main -->
      <main class="main-content">
        <LibraryTab     v-if="activeTab === 'library'" v-bind="libraryProps"
          @edit="editChannel" @delete="confirmDelete" @toggle-channel="toggleChannel"
          @select-row="selectRow" @open-add="openAddChannel"
          @set-sort="setSort" @prev-page="prevPage" @next-page="nextPage"
          @reset-filters="resetFilters" @delete-selected="deleteSelected"
          @toggle-row-select="toggleRowSelect" @toggle-select-all="toggleSelectAll"
        />
        <ContentTab     v-if="activeTab === 'content'" :stats="stats" :group-list="groupList" :t="t" :icon="icon"
          @filter-by-group="g => { filters.group = g; activeTab = 'library' }"
        />
        <DesignTab      v-if="activeTab === 'design'"  :theme="theme" :lang="lang" :t="t" :icon="icon"
          @toggle-theme="toggleTheme" @set-lang="setLang"
        />
      </main>
    </div>

    <ImportModal    v-bind="importProps"  @close="modal.import = false"
      @import-file="importFromFile" @import-from-url="importFromUrl" @mode-change="m => importMode = m"
    />
    <EditModal      v-bind="editProps"   @close-safe="closeEditSafe" @save="saveEdit" @close="forceCloseEdit" />
    <DeleteModal    :show="modal.deleteConfirm" :target="deleteTarget" :t="t" :icon="icon"
      @confirm="removeChannel(deleteTarget)" @cancel="modal.deleteConfirm = false"
    />
    <UnsavedModal   :show="modal.unsaved" :t="t"
      @keep-editing="modal.unsaved = false" @discard="forceCloseEdit"
    />
    <AutoDetectModal v-bind="autoDetectProps"
      @close="modal.autoDetect = false" @apply="applyAutoDetect"
      @run-again="runAutoDetect" @toggle-source="toggleAutoDetectSource"
      @toggle-enrichment="toggleEnrichmentSource" @toggle-all="toggleAllAutoDetect"
      @toggle-expand="toggleExpand"
    />

    <transition name="toast-fade">
      <div v-if="toast.visible" class="toast" role="status" aria-live="polite" aria-atomic="true">
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import AppHeader        from './components/AppHeader.vue'
import LibraryTab       from './components/LibraryTab.vue'
import ContentTab       from './components/ContentTab.vue'
import DesignTab        from './components/DesignTab.vue'
import ImportModal      from './components/ImportModal.vue'
import EditModal        from './components/EditModal.vue'
import DeleteModal      from './components/DeleteModal.vue'
import UnsavedModal     from './components/UnsavedModal.vue'
import AutoDetectModal  from './components/AutoDetectModal.vue'
import { useI18n }          from './composables/useI18n.js'
import { useTheme }         from './composables/useTheme.js'
import { useChannels }      from './composables/useChannels.js'
import { useEpg }           from './composables/useEpg.js'
import { useAutoDetect }    from './composables/useAutoDetect.js'
import { useAppComputed, icon } from './composables/useAppComputed.js'
import { uiStore }          from './composables/storage.js'

const toast = reactive({ visible: false, message: '' })
function showToast(msg, dur = 3000) {
  toast.message = msg; toast.visible = true
  setTimeout(() => { toast.visible = false }, dur)
}

const { lang, t, setLang }             = useI18n()
const { theme, setTheme, toggleTheme } = useTheme()

const {
  channels, modal, editCh, editIsDirty, deleteTarget,
  selectedId, selectedRows, importMode, importUrl,
  importLoading, importFileRef, logoErrors,
  persist,
  toggleChannel, editChannel, openAddChannel,
  closeEditSafe, forceCloseEdit, saveEdit,
  removeChannel, confirmDelete, clearAll,
  triggerImport, importFromFile, importFromUrl,
  exportPlaylist,
} = useChannels(t, showToast)

const {
  epgData, epgLoaded, epgRef,
  epgChannelIndex, epgXmlIndex, epgChannelMeta,
  parseXMLTV, triggerEpgImport, importEpgFromFile, clearEpg,
  getCurrentProgram, getNextProgram, getTodayPrograms, formatEpgTime,
} = useEpg()

const activeTab     = ref('library')
const mobFilterOpen = ref(false)
const filters       = reactive({ search: '', group: '', quality: '', country: '', status: 'all' })
const sort          = reactive({ col: 'name', dir: 'asc' })
const pagination    = reactive({ page: 1, perPage: 100 })

const {
  stats, filteredChannels, paginatedChannels,
  totalPages, groupOptions, groupList,
  hasActiveFilters, visibleTabs,
} = useAppComputed(channels, filters, sort, pagination, epgLoaded)

const {
  IPTV_SOURCES, ENRICHMENT_SOURCES,
  autoDetectResults, autoDetectFilter, autoDetectPrefilter,
  autoDetectCustomUrl, autoDetectSelectedSources,
  enrichmentSelectedSources, enrichmentLoading, enrichmentLoaded,
  sourceLoading, sourceLoaded, expandedRows,
  filteredAutoDetectResults, autoDetectSummary, autoDetectAllSelected,
  runAutoDetect, fetchAndRunAutoDetect, openAutoDetect, applyAutoDetect,
  toggleAutoDetectSource, toggleEnrichmentSource,
  toggleAllAutoDetect, toggleExpand,
  logoChannelIndex, logoChannelIndexById,
} = useAutoDetect(channels, epgChannelIndex, epgXmlIndex, null, null, t)

function setSort(col) {
  if (sort.col === col) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'
  else { sort.col = col; sort.dir = 'asc' }
  pagination.page = 1
}
function prevPage() { if (pagination.page > 1) pagination.page-- }
function nextPage() { if (pagination.page < totalPages.value) pagination.page++ }
function resetFilters() {
  filters.search = ''; filters.group = ''; filters.quality = ''
  filters.country = ''; filters.status = 'all'; pagination.page = 1
}
function selectRow(ch, event) {
  if (event?.target?.closest('button, a, input')) return
  selectedId.value = selectedId.value === ch.id ? null : ch.id
}
function toggleRowSelect(ch, checked) {
  if (checked) selectedRows.add(ch.id); else selectedRows.delete(ch.id)
}
function toggleSelectAll(checked) {
  filteredChannels.value.forEach(ch => {
    if (checked) selectedRows.add(ch.id); else selectedRows.delete(ch.id)
  })
}
function deleteSelected() {
  const n = selectedRows.size
  if (n === 0) return
  if (!confirm(t('confirmDeleteSel').replace('{n}', n))) return
  channels.value = channels.value.filter(c => !selectedRows.has(c.id))
  selectedRows.clear(); persist()
  showToast(t('channelsDeletedN').replace('{n}', n))
}

const selectedRowsCount = computed(() => selectedRows.size)
const allPageSelected   = computed(() =>
  paginatedChannels.value.length > 0 &&
  paginatedChannels.value.every(ch => selectedRows.has(ch.id))
)

const libraryProps = computed(() => ({
  channels: channels.value, filters, sort, pagination,
  paginatedChannels: paginatedChannels.value, totalPages: totalPages.value,
  groupOptions: groupOptions.value, stats: stats.value,
  epgLoaded: epgLoaded.value, epgData: epgData.value,
  selectedId: selectedId.value, selectedRows,
  allPageSelected: allPageSelected.value,
  selectedRowsCount: selectedRowsCount.value,
  logoErrors, mobFilterOpen: mobFilterOpen.value,
  hasActiveFilters: hasActiveFilters.value, t, icon,
  epgRef: epgRef.value,
}))

const importProps = computed(() => ({
  show: modal.import,
  importMode: importMode.value, importUrl: importUrl.value,
  importLoading: importLoading.value, importFileRef: importFileRef.value, t, icon,
}))

const editProps = computed(() => ({
  show: modal.edit || modal.add,
  isAdd: modal.add, editCh: editCh.value, editIsDirty: editIsDirty.value, t, icon,
}))

const autoDetectProps = computed(() => ({
  show: modal.autoDetect,
  results: filteredAutoDetectResults.value,
  filter: autoDetectFilter.value,
  summary: autoDetectSummary.value,
  allSelected: autoDetectAllSelected.value,
  selectedSources: autoDetectSelectedSources,
  enrichmentSources: ENRICHMENT_SOURCES,
  enrichmentLoaded: enrichmentLoaded.value,
  sourceLoading: sourceLoading.value,
  expandedRows, t, icon,
  autoDetectPrefilter: autoDetectPrefilter.value,
  autoDetectCustomUrl: autoDetectCustomUrl.value,
  enrichmentSelectedSources,
  IPTV_SOURCES, ENRICHMENT_SOURCES,
}))

onMounted(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
})
</script>
`)

console.log('\n✅ Full port complete!')
console.log('Run: npm run build')
console.log('If build errors appear, they will show exact line/file to fix.')
