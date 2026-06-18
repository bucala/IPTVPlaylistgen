import { ref } from 'vue'
import { uiStore } from './storage.js'



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

