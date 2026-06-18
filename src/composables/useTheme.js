import { ref } from 'vue'
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

