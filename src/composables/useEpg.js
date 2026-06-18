import { ref } from 'vue'

export function useEpg() {
  const epgRef         = ref(null)
  const epgData        = ref({})
  const epgChannelMeta = ref({})
  const epgLoaded      = ref(false)

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

  return {
    epgRef, epgData, epgChannelMeta, epgLoaded,
    parseXMLTV, importEpgFromFile, clearEpg, triggerEpgImport,
    getCurrentProgram, getNextProgram, getTodayPrograms, formatEpgTime,
  }
}
