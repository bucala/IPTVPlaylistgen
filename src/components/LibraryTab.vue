<template>
        <section v-if="activeTab === 'library'" class="glass rounded-[24px] p-4 md:p-5" aria-label="Channel library">
          <div class="mb-4">
            <div class="sec-label">{{ t('tabLibrary') }}</div>
            <h2 class="text-[1.3rem] font-bold tracking-[-0.03em]">{{ t('libraryHeading') }}</h2>
          </div>

          <!-- Mobile filter toggle (hidden on ≥1024px via Tailwind lg:hidden) -->
          <div class="mb-3 lg:hidden">
            <button
              class="btn btn-secondary" style="width:100%; justify-content:space-between"
              @click="mobFilterOpen = !mobFilterOpen"
              :aria-expanded="mobFilterOpen.toString()"
              aria-controls="mob-filter-panel"
            >
              <span>{{ t('filterSet') }}<span v-if="hasActiveFilters" style="color:var(--primary);margin-left:5px">●</span></span>
              <span aria-hidden="true" v-html="mobFilterOpen ? icon('chevUp', 14) : icon('chevDown', 14)"></span>
            </button>
            <div v-if="mobFilterOpen" id="mob-filter-panel" class="glass rounded-[16px] p-4 mt-2 space-y-3">
              <div>
                <label class="label" for="mob-search">{{ t('search') }}</label>
                <input id="mob-search" class="field" v-model.trim="filters.search" :placeholder="t('searchPlaceholder')" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="label" for="mob-group">{{ t('group') }}</label>
                  <select id="mob-group" class="select" v-model="filters.group">
                    <option value="">{{ t('allGroups') }}</option>
                    <option v-for="g in groupOptions" :key="g" :value="g">{{ g }}</option>
                  </select>
                </div>
                <div>
                  <label class="label" for="mob-quality">{{ t('quality') }}</label>
                  <select id="mob-quality" class="select" v-model="filters.quality">
                    <option value="">{{ t('allQuality') }}</option>
                    <option value="4K">4K</option>
                    <option value="FHD">FHD</option>
                    <option value="HD">HD</option>
                    <option value="SD">SD</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="label" for="mob-country">{{ t('country') }}</label>
                  <input id="mob-country" class="field" v-model.trim="filters.country" placeholder="SK, CZ…" />
                </div>
                <div>
                  <label class="label" for="mob-limit">{{ t('perPage') }}</label>
                  <select id="mob-limit" class="select" v-model.number="pagination.limit">
                    <option :value="50">50</option>
                    <option :value="100">100</option>
                    <option :value="200">200</option>
                  </select>
                </div>
              </div>
              <div class="seg" style="width:100%" role="group" :aria-label="t('status')">
                <button class="seg-btn" :class="{ active: filters.status === 'all' }"      @click="filters.status='all'">{{ t('all') }}</button>
                <button class="seg-btn" :class="{ active: filters.status === 'active' }"   @click="filters.status='active'">{{ t('activeLabel') }}</button>
                <button class="seg-btn" :class="{ active: filters.status === 'inactive' }" @click="filters.status='inactive'">{{ t('offLabel') }}</button>
              </div>
              <button class="btn btn-ghost" style="width:100%" @click="resetFilters; mobFilterOpen = false">{{ t('resetFilters') }}</button>
            </div>
          </div>

          <div class="table-shell" role="region" aria-label="Channels table">
            <table role="grid">
              <thead>
                <tr>
                  <th scope="col" class="w-9" style="padding:10px 8px">
                    <input type="checkbox" :checked="allPageSelected" @change="toggleSelectAll($event.target.checked)" :title="t('autoDetectSelectAll')" />
                  </th>
                  <th scope="col" class="w-10 sortable" @click="setSort('index')" :aria-sort="sort.by==='index' ? (sort.asc?'ascending':'descending') : 'none'">#<span class="sort-ic" v-html="sort.by==='index' ? (sort.asc ? icon('chevUp',12) : icon('chevDown',12)) : ''" aria-hidden="true"></span></th>
                  <th scope="col" class="w-14">{{ t('logo') }}</th>
                  <th scope="col" class="sortable" @click="setSort('name')" :aria-sort="sort.by==='name' ? (sort.asc?'ascending':'descending') : 'none'">{{ t('name') }}<span class="sort-ic" v-html="sort.by==='name' ? (sort.asc ? icon('chevUp',12) : icon('chevDown',12)) : ''" aria-hidden="true"></span></th>
                  <th scope="col" class="w-[150px] sortable" @click="setSort('group')" :aria-sort="sort.by==='group' ? (sort.asc?'ascending':'descending') : 'none'">{{ t('group') }}<span class="sort-ic" v-html="sort.by==='group' ? (sort.asc ? icon('chevUp',12) : icon('chevDown',12)) : ''" aria-hidden="true"></span></th>
                  <th scope="col" class="w-[100px] sortable" @click="setSort('quality')" :aria-sort="sort.by==='quality' ? (sort.asc?'ascending':'descending') : 'none'">{{ t('quality') }}<span class="sort-ic" v-html="sort.by==='quality' ? (sort.asc ? icon('chevUp',12) : icon('chevDown',12)) : ''" aria-hidden="true"></span></th>
                  <th scope="col" class="w-[160px] sortable" @click="setSort('tvg_id')" :aria-sort="sort.by==='tvg_id' ? (sort.asc?'ascending':'descending') : 'none'">TVG-ID<span class="sort-ic" v-html="sort.by==='tvg_id' ? (sort.asc ? icon('chevUp',12) : icon('chevDown',12)) : ''" aria-hidden="true"></span></th>
                  <th scope="col" class="w-[80px] sortable" @click="setSort('country')" :aria-sort="sort.by==='country' ? (sort.asc?'ascending':'descending') : 'none'">{{ t('country') }}<span class="sort-ic" v-html="sort.by==='country' ? (sort.asc ? icon('chevUp',12) : icon('chevDown',12)) : ''" aria-hidden="true"></span></th>
                  <th scope="col">URL</th>
                  <th scope="col" class="w-[110px] text-center sortable" @click="setSort('status')" :aria-sort="sort.by==='status' ? (sort.asc?'ascending':'descending') : 'none'">{{ t('status') }}<span class="sort-ic" v-html="sort.by==='status' ? (sort.asc ? icon('chevUp',12) : icon('chevDown',12)) : ''" aria-hidden="true"></span></th>
                  <th scope="col" class="w-[150px] text-right">{{ t('actions') }}</th>
                </tr>
              </thead>
              <tbody v-if="paginatedChannels.length">
                <tr v-for="(ch, i) in paginatedChannels" :key="ch.id" :class="{ selected: selectedId === ch.id || selectedRows.has(ch.id) }" @click="selectRow(ch, $event)">
                  <td style="padding:9px 8px" @click.stop><input type="checkbox" :checked="selectedRows.has(ch.id)" @change="toggleRowSelect(ch, $event.target.checked)" /></td>
                  <td class="muted">{{ (pagination.page - 1) * pagination.limit + i + 1 }}</td>
                  <td>
                    <img v-if="ch.tvg_logo && !logoErrors.has(ch.id)" :src="ch.tvg_logo" class="ch-logo logo-fade" loading="lazy" :alt="ch.name + ' logo'" @error="logoErrors.add(ch.id)" />
                    <div v-else class="ch-logo logo-initials" :title="ch.name" aria-hidden="true">{{ (ch.name||'?').slice(0,2).toUpperCase() }}</div>
                  </td>
                  <td>
                    <div class="font-semibold">{{ ch.name || t('untitled') }}</div>
                    <div class="text-xs muted">{{ ch.tvg_name || t('noTvgName') }}</div>
                    <div v-if="epgLoaded && getCurrentProgram(ch)" class="epg-tag now">{{ t('nowPlaying') }}: {{ getCurrentProgram(ch).title }}</div>
                    <div v-else-if="epgLoaded && getNextProgram(ch)" class="epg-tag nxt">{{ t('nextProgram') }}: {{ getNextProgram(ch).title }}</div>
                  </td>
                  <td class="muted">{{ ch.group_title || '—' }}</td>
                  <td>
                    <span v-if="ch.quality" class="q-badge" :class="'q-' + ch.quality">{{ ch.quality }}</span>
                    <span v-else class="muted">—</span>
                  </td>
                  <td class="mono muted">
                    <span v-if="epgLoaded && ch.tvg_id" class="epg-dot" :style="{ background: epgData[ch.tvg_id] ? 'var(--success)' : 'var(--text4)' }" :title="epgData[ch.tvg_id] ? t('epgMatchTip') : t('noEpgMatchTip')" aria-hidden="true"></span>{{ ch.tvg_id || '—' }}
                  </td>
                  <td class="uppercase text-xs muted">{{ ch.tvg_country || '—' }}</td>
                  <td class="mono muted" style="max-width:260px"><div class="truncate" :title="ch.url">{{ ch.url }}</div></td>
                  <td class="text-center">
                    <button
                      class="btn btn-ghost" style="padding:5px 10px; font-size:12px"
                      @click="toggleChannel(ch)"
                      :aria-label="(ch.is_active ? t('deactivate') : t('activate')) + ' ' + ch.name"
                      role="switch" :aria-checked="ch.is_active.toString()"
                    >
                      <span :style="{ color: ch.is_active ? 'var(--success)' : 'var(--text3)' }" class="inline-flex items-center gap-1"><span v-html="icon(ch.is_active ? 'circle' : 'circleOff', 8)"></span>{{ ch.is_active ? t('activeLabel') : t('offLabel') }}</span>
                    </button>
                  </td>
                  <td>
                    <div class="flex gap-1.5 justify-end">
                      <button class="btn btn-secondary" style="padding:5px 10px; font-size:12px" @click="editChannel(ch)" :aria-label="t('edit') + ' ' + ch.name">{{ t('edit') }}</button>
                      <button class="btn btn-danger"    style="padding:5px 10px; font-size:12px" @click="removeChannel(ch.id)" :aria-label="t('delete') + ' ' + ch.name">{{ t('delete') }}</button>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tbody v-else>
                <tr><td colspan="11">
                  <div class="empty-state">
                    <div class="icon" aria-hidden="true" v-html="icon('tv', 44)"></div>
                    <h3>{{ t('emptyLibraryTitle') }}</h3>
                    <p>{{ t('emptyLibraryDesc') }}</p>
                    <button class="btn btn-primary mt-4" @click="triggerImport">{{ t('importPlaylist') }}</button>
                  </div>
                </td></tr>
              </tbody>
            </table>
          </div>

          <!-- EPG Schedule panel -->
          <transition name="fade">
            <div v-if="selectedId && epgLoaded" class="epg-panel mt-3">
              <div class="epg-panel-head">
                <span>{{ (channels.find(c => c.id === selectedId) || {}).name || '' }} — {{ t('schedule') }}</span>
                <button class="btn btn-ghost" style="padding:3px 8px" @click.stop="selectedId = null" v-html="icon('x', 14)"></button>
              </div>
              <template v-if="getTodayPrograms(channels.find(c => c.id === selectedId) || {}).length">
                <div v-for="prog in getTodayPrograms(channels.find(c => c.id === selectedId) || {})" :key="prog.start?.getTime()"
                     class="epg-row" :class="{ 'on-air': prog.start <= new Date() && prog.stop > new Date() }">
                  <div class="epg-time">{{ formatEpgTime(prog.start) }}–{{ formatEpgTime(prog.stop) }}</div>
                  <div><div class="epg-title">{{ prog.title }}</div><div v-if="prog.desc" class="epg-desc">{{ prog.desc }}</div></div>
                </div>
              </template>
              <div v-else class="epg-row" style="justify-content:center;padding:16px;color:var(--text3)">{{ t('noEpg') }}</div>
            </div>
          </transition>

          <div class="flex flex-wrap gap-3 items-center justify-between mt-3">
            <div class="text-sm muted">{{ t('showing') }} <strong style="color:var(--text)">{{ paginatedChannels.length }}</strong> {{ t('of') }} <strong style="color:var(--text)">{{ filteredChannels.length }}</strong> {{ t('filteredChannels') }}</div>
            <div class="flex items-center gap-2" role="navigation" :aria-label="t('pagination')">
              <button class="btn btn-secondary" style="padding:6px 14px" @click="prevPage" :disabled="pagination.page === 1" aria-label="Previous page"><span class="inline-flex items-center gap-1"><span v-html="icon('chevLeft', 14)"></span>{{ t('previous') }}</span></button>
              <div class="stat-pill" aria-live="polite">{{ t('page') }} {{ pagination.page }} / {{ totalPages }}</div>
              <button class="btn btn-secondary" style="padding:6px 14px" @click="nextPage" :disabled="pagination.page >= totalPages" aria-label="Next page"><span class="inline-flex items-center gap-1">{{ t('next') }}<span v-html="icon('chevRight', 14)"></span></span></button>
            </div>
          </div>
        </section>

        <!-- ══ CONTENT TAB ══ -->
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps([
  'channels','filters','sort','pagination','paginatedChannels',
  'totalPages','groupOptions','stats','epgLoaded','epgData',
  'selectedId','selectedRows','allPageSelected','selectedRowsCount',
  'logoErrors','mobFilterOpen','hasActiveFilters','t',
  'epgRef','icon'
])
const emit = defineEmits([
  'edit','delete','toggleChannel','selectRow','toggleRowSelect',
  'toggleSelectAll','deleteSelected','prevPage','nextPage',
  'setSort','resetFilters','filterChange','openAdd','setFilter',
  'triggerEpgImport','clearEpg','getCurrentProgram','getTodayPrograms','formatEpgTime'
])
</script>

