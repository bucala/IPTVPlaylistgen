<template>
  <header class="glass-s rounded-[28px] px-5 md:px-7 py-4 md:py-5 mb-4">
    <div class="flex flex-wrap gap-4 items-start md:items-center justify-between">

      <!-- Brand -->
      <div class="flex items-center gap-4 min-w-0">
        <div class="app-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            <path d="M17 14v3m-3-3h6m-3 3v3"/>
          </svg>
        </div>
        <div>
          <div class="text-[0.7rem] font-bold tracking-[.16em] uppercase" style="color:var(--text3)">Simple Apple Style</div>
          <h1 class="text-[1.9rem] md:text-[2.2rem] leading-tight font-extrabold tracking-[-0.04em]">IPTV Playlist Generator</h1>
          <p class="text-sm mt-0.5" style="color:var(--text3)">{{ t('appSubtitle') }}</p>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex flex-col gap-2.5 items-stretch md:items-end hdr-actions">
        <div class="flex flex-wrap gap-2 justify-start md:justify-end hdr-btns">
          <button class="btn btn-primary"   @click="$emit('import')">{{ t('importPlaylist') }}</button>
          <button class="btn btn-secondary" @click="$emit('exportM3u')"  :disabled="stats.total === 0">{{ t('exportM3U') }}</button>
          <button class="btn btn-secondary" @click="$emit('exportXspf')" :disabled="stats.total === 0">{{ t('exportXSPF') }}</button>
          <button class="btn btn-secondary" @click="$emit('epgToggle')"
                  :style="epgLoaded ? 'color:var(--success)' : ''">
            <span v-html="icon('zap', 15)"></span>
            {{ epgLoaded ? t('clearEpg') : t('epgImport') }}
          </button>
          <input ref="epgFileRef" type="file" accept=".xml,.xmltv,text/xml,application/xml" class="sr-only" @change="e => $emit('epgFile', e)" />
          <button class="btn btn-secondary" @click="$emit('autoDetect')" :disabled="stats.total === 0">
            <span v-html="icon('search', 15)"></span>{{ t('autoDetectBtn') }}
          </button>
          <button class="btn btn-ghost" @click="$emit('addChannel')">
            <span class="inline-flex items-center gap-1.5">
              <span v-html="icon('plus', 14)"></span>{{ t('addChannel') }}
            </span>
          </button>
          <button class="btn btn-danger" @click="$emit('deleteSelected')" :disabled="selectedRowsCount === 0">
            {{ t('deleteSelected') }}{{ selectedRowsCount > 0 ? ' (' + selectedRowsCount + ')' : '' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Stats bar -->
    <div class="flex flex-wrap gap-2 mt-3" role="status" aria-live="polite">
      <div class="stat-pill"><strong>{{ stats.total }}</strong> {{ t('total') }}</div>
      <div class="stat-pill"><strong>{{ stats.active }}</strong> {{ t('active') }}</div>
      <div class="stat-pill"><strong>{{ stats.groups }}</strong> {{ t('groups') }}</div>
      <template v-for="(count, quality) in stats.qualities" :key="quality">
        <div class="stat-pill" v-if="count">
          <span class="q-badge" :class="'q-' + quality">{{ quality }}</span>
          <span>{{ count }}</span>
        </div>
      </template>
    </div>
  </header>
</template>

<script setup>
import { icon } from '../composables/useIcons.js'

const props = defineProps({
  stats:           { type: Object,  required: true },
  epgLoaded:       { type: Boolean, default: false },
  selectedRowsCount: { type: Number, default: 0 },
  t:               { type: Function, required: true },
})

defineEmits(['import','exportM3u','exportXspf','epgToggle','epgFile','autoDetect','addChannel','deleteSelected'])
</script>
