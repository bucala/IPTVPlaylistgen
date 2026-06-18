<template>
  <!-- Port header HTML from legacy HTML lines 460–530 (approx) -->
  <!-- Includes: logo, Import btn, EPG btn, AutoDetect btn, theme/lang toggles -->
  <header class="app-header">
    <slot />
  </header>
</template>

<script setup>
defineProps(['stats', 'epgLoaded', 'lang', 'theme'])
defineEmits(['import', 'epg', 'autoDetect', 'toggleTheme', 'setLang'])
</script>

