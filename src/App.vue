<template>
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
