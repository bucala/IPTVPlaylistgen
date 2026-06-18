<template>
  <div :data-theme="theme" style="background:var(--bg);color:var(--text);min-height:100vh">

    <!-- portované sekcie prídu sem cez komponenty -->
    <p style="padding:2rem;font-size:1.2rem">
      🚧 Scaffold OK — komponenty sa portujú…
    </p>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n }   from './composables/useI18n.js'
import { useTheme }  from './composables/useTheme.js'

const { lang, t, setLang }             = useI18n()
const { theme, setTheme, toggleTheme } = useTheme()
</script>
