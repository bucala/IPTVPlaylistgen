import { ref } from 'vue'

export function useTheme() {
  const theme = ref((() => { try { return localStorage.getItem('iptv-theme') || 'dark' } catch { return 'dark' } })())

    function setTheme(newTheme) {
      theme.value = newTheme
      document.documentElement.setAttribute('data-theme', newTheme)
      try { localStorage.setItem(THEME_KEY, newTheme) } catch {}
    }


    function toggleTheme() { setTheme(theme.value === 'dark' ? 'light' : 'dark') }


  return { theme, setTheme, toggleTheme }
}
