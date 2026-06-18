<template>
  <div :data-theme="theme" style="background:var(--bg);color:var(--text);min-height:100vh;padding:1rem md:1.5rem">

    <AppHeader
      :stats="stats"
      :epg-loaded="epgLoaded"
      :selected-rows-count="selectedRowsCount"
      :t="t"
      @import="triggerImport"
      @export-m3u="exportPlaylist('m3u')"
      @export-xspf="exportPlaylist('xspf')"
      @epg-toggle="epgLoaded ? clearEpg() : triggerEpgImport()"
      @epg-file="importEpgFromFile"
      @auto-detect="openAutoDetect"
      @add-channel="openAddChannel"
      @delete-selected="deleteSelected"
    />

    <!-- Toast -->
    <div v-if="toast.show"
         style="position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:9999"
         class="glass-s rounded-[14px] px-5 py-3 text-sm font-medium">
      {{ toast.message }}
    </div>

    <p style="padding:1rem;opacity:.5;font-size:.85rem">🚧 Tabs a modály sa portujú…</p>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useI18n }        from './composables/useI18n.js'
import { useTheme }       from './composables/useTheme.js'
import { useChannels }    from './composables/useChannels.js'
import { useEpg }         from './composables/useEpg.js'
import { useAutoDetect }  from './composables/useAutoDetect.js'
import { useAppComputed } from './composables/useAppComputed.js'
import { icon }           from './composables/useIcons.js'
import AppHeader          from './components/AppHeader.vue'

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
  importEpgFromFile, clearEpg, triggerEpgImport,
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
  autoDetectResults, autoDetectFilter, autoDetectPrefilter,
  autoDetectCustomUrl, sourceLoading, sourceLoaded,
  autoDetectSelectedSources, expandedRows, apiNormMap,
  enrichmentLoading, enrichmentLoaded, enrichmentSelectedSources,
  filteredAutoDetectResults, autoDetectFieldStats, autoDetectSummary, autoDetectAllSelected,
  runAutoDetect, toggleExpand, openAutoDetect, applyAutoDetect, toggleAllAutoDetect,
  toggleAutoDetectSource, toggleEnrichmentSource,
  IPTV_SOURCES, ENRICHMENT_SOURCES,
} = useAutoDetect(
  channels,
  computed(() => epgData.value),
  computed(() => ({})),
  computed(() => ({})),
  computed(() => ({})),
  t, showToast
)

const selectedRowsCount = computed(() => selectedRows.size)
const allPageSelected   = computed(() =>
  paginatedChannels.value.length > 0 &&
  paginatedChannels.value.every(ch => selectedRows.has(ch.id))
)
const editIsDirty = computed(() => {
  if (!editCh.value || !editSnapshot.value) return false
  return JSON.stringify(editCh.value) !== JSON.stringify(editSnapshot.value)
})

function setSort(by) {
  if (sort.by === by) sort.asc = !sort.asc
  else { sort.by = by; sort.asc = true }
  pagination.page = 1
}
function prevPage() { if (pagination.page > 1) pagination.page-- }
function nextPage() { if (pagination.page < totalPages.value) pagination.page++ }
function resetFilters() {
  filters.search = ''; filters.group = ''
  filters.quality = ''; filters.status = 'all'; filters.country = ''
  pagination.page = 1
}
function handleKeydown(e) {
  if (e.key === 'Escape') {
    if (modal.unsaved) return
    if (modal.edit || modal.add) { closeEditSafe(); return }
    if (modal.import) { modal.import = false; return }
    if (modal.deleteConfirm) { modal.deleteConfirm = false; return }
    if (modal.autoDetect) { modal.autoDetect = false; return }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
})
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>
