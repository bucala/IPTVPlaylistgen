<template>
    <!-- Import Modal -->
    <div v-if="modal.import" class="modal-overlay" @mousedown.self="modal.import = false"
         role="dialog" aria-modal="true" :aria-label="t('importTitle')">
      <div class="modal-card glass-s">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold" id="import-title">{{ t('importTitle') }}</h2>
          <button class="btn btn-ghost" style="padding:6px 10px" @click="modal.import = false" :aria-label="t('close')" v-html="icon('x', 16)"></button>
        </div>

        <div class="seg mb-4" style="width:100%" role="group" :aria-label="t('importMode')">
          <button class="seg-btn flex-1" :class="{ active: importMode === 'file' }" @click="importMode = 'file'" :aria-pressed="(importMode === 'file').toString()">{{ t('importFromFile') }}</button>
          <button class="seg-btn flex-1" :class="{ active: importMode === 'url'  }" @click="importMode = 'url'"  :aria-pressed="(importMode === 'url').toString()">{{ t('importFromUrl') }}</button>
        </div>

        <div v-if="importMode === 'file'">
          <input type="file" accept=".m3u,.m3u8,.xspf" ref="importFileRef" @change="importFromFile" class="sr-only" aria-hidden="true" tabindex="-1" />
          <button class="btn btn-secondary" style="width:100%;padding:14px 16px" @click="importFileRef.click()">
            <span class="inline-flex items-center gap-2"><span v-html="icon('folder', 16)"></span>{{ t('chooseFile') }}</span>
          </button>
        </div>
        <div v-else class="flex gap-2">
          <input class="field flex-1" v-model.trim="importUrl" :placeholder="t('urlPlaceholder')"
                 @keyup.enter="importFromUrl" aria-label="Playlist URL" type="url" />
          <button class="btn btn-primary" @click="importFromUrl" :disabled="!importUrl || importLoading">
            {{ importLoading ? t('importing') : t('importBtn') }}
          </button>
        </div>

        <p class="text-xs mt-3" style="color:var(--text4)">M3U · M3U8 · XSPF</p>
      </div>
    </div>

</template>

<script setup>
defineProps(['importMode','importUrl','importLoading','importFileRef','t','icon'])
defineEmits(['close','importFile','importFromUrl','modeChange'])
</script>

