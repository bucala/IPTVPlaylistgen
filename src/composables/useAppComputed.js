import { computed } from 'vue'

export function useAppComputed(channels, filters, sort, pagination, epgLoaded) {



  return {
    stats, filteredChannels, paginatedChannels,
    totalPages, groupOptions, groupList,
    hasActiveFilters, visibleTabs,
  }
}

// Icon helper (SVG)
export     function icon(name, size = 16) {
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


