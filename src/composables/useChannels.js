import { ref, reactive } from 'vue'

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

    function persist() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(channels.value)) } catch {}
    }


    function newId() { return 'ch_' + (++_uid) }


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

    function selectRow(ch, event) {
      if (event.target.closest('button, a, input[type="checkbox"]')) return
      selectedId.value = selectedId.value === ch.id ? null : ch.id
    }


    function toggleRowSelect(ch, checked) {
      if (checked) selectedRows.add(ch.id)
      else selectedRows.delete(ch.id)
    }


    function toggleSelectAll(checked) {
      filteredChannels.value.forEach(ch => {
        if (checked) selectedRows.add(ch.id)
        else selectedRows.delete(ch.id)
      })
    }


    function deleteSelected() {
      const n = selectedRows.size
      if (n === 0) return
      if (!confirm(t('confirmDeleteSel').replace('{n}', n))) return
      channels.value = channels.value.filter(c => !selectedRows.has(c.id))
      selectedRows.clear()
      persist()
      showToast(t('channelsDeletedN').replace('{n}', n))
    }

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
