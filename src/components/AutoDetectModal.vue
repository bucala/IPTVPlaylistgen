<template>
    <!-- Autodetect Modal -->
    <div v-if="modal.autoDetect" class="modal-overlay" @mousedown.self="modal.autoDetect = false"
         role="dialog" aria-modal="true" :aria-label="t('autoDetectTitle')">
      <div class="modal-card glass-s" style="width:min(1060px,100%);max-height:96vh;display:flex;flex-direction:column;overflow:hidden">

        <!-- ── Header ── -->
        <div class="flex items-start justify-between mb-3" style="flex-shrink:0">
          <div>
            <h2 class="text-xl font-bold flex items-center gap-2">
              <span v-html="icon('search', 20)"></span>{{ t('autoDetectTitle') }}
            </h2>
            <!-- Prefilter badge -->
            <div v-if="autoDetectPrefilter" class="flex items-center gap-1 mt-1 text-xs" style="color:var(--primary)">
              <span v-html="icon('circle', 11)"></span>
              {{ t('autoDetectPrefiltered').replace('{n}', autoDetectPrefilter.size) }}
            </div>
          </div>
          <button class="btn btn-ghost" style="padding:6px 10px;flex-shrink:0" @click="modal.autoDetect = false" :aria-label="t('close')" v-html="icon('x', 16)"></button>
        </div>

        <!-- ── Compact source bar ── -->
        <div class="mb-3 p-2.5 rounded-xl flex flex-wrap items-center gap-2" style="background:var(--surface);border:1px solid var(--sep);flex-shrink:0">
          <!-- Pills -->
          <label v-for="src in IPTV_SOURCES" :key="src.id" class="cursor-pointer select-none" :title="src.label + ' — ' + src.detail + '\n' + src.url">
            <input type="checkbox" :checked="autoDetectSelectedSources.has(src.id)"
                   @change="toggleAutoDetectSource(src.id, $event.target.checked)" class="sr-only" />
            <div class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                 :style="autoDetectSelectedSources.has(src.id)
                   ? 'background:var(--primary);color:#fff'
                   : 'background:var(--bg);color:var(--text2);border:1px solid var(--sep)'">
              <span v-if="autoDetectSelectedSources.has(src.id)" v-html="icon('check', 10)"></span>
              {{ src.label }}
            </div>
          </label>
          <!-- Divider -->
          <div style="width:1px;height:20px;background:var(--sep);flex-shrink:0"></div>
          <!-- Custom URL -->
          <input class="field text-xs" style="flex:1;min-width:120px;padding:5px 8px"
                 type="url" v-model="autoDetectCustomUrl"
                 :placeholder="t('autoDetectCustomUrlPh')"
                 @keydown.enter="fetchAndRunAutoDetect" />
          <!-- Fetch button -->
          <button class="btn btn-primary" style="white-space:nowrap;padding:6px 12px;gap:5px;flex-shrink:0"
                  :disabled="sourceLoading" @click="fetchAndRunAutoDetect">
            <span v-html="sourceLoading ? icon('refresh', 13) : icon('search', 13)"></span>
            <span class="text-xs">{{ sourceLoading ? t('autoDetectFetching') : t('autoDetectFetch') }}</span>
          </button>
          <!-- Enrichment sources row -->
          <div class="flex flex-wrap items-center gap-1.5 w-full pt-2" style="border-top:1px solid var(--sep)">
            <span class="text-xs mr-1" style="color:var(--text3);white-space:nowrap">{{ t('autoDetectEnrichWith') }}</span>
            <!-- Metadata enrichment (purple) -->
            <template v-for="src in ENRICHMENT_SOURCES.filter(s => s.type !== 'epg-xml')" :key="src.id">
              <label class="cursor-pointer select-none" :title="src.label + ' — ' + src.detail + '\n' + src.url">
                <input type="checkbox" :checked="enrichmentSelectedSources.has(src.id)"
                       @change="toggleEnrichmentSource(src.id, $event.target.checked)" class="sr-only" />
                <div class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                     :style="enrichmentSelectedSources.has(src.id)
                       ? 'background:var(--purple);color:#fff'
                       : 'background:var(--bg);color:var(--text2);border:1px solid var(--sep)'">
                  <span v-if="enrichmentSelectedSources.has(src.id)" v-html="icon('check', 10)"></span>
                  {{ src.label }}
                </div>
              </label>
            </template>
            <!-- Divider -->
            <div style="width:1px;height:18px;background:var(--sep);flex-shrink:0"></div>
            <span class="text-xs" style="color:var(--text3);white-space:nowrap">EPG:</span>
            <!-- EPG XML sources (orange/warning) -->
            <template v-for="src in ENRICHMENT_SOURCES.filter(s => s.type === 'epg-xml')" :key="src.id">
              <label class="cursor-pointer select-none" :title="src.label + ' — ' + src.detail + '\n' + src.url">
                <input type="checkbox" :checked="enrichmentSelectedSources.has(src.id)"
                       @change="toggleEnrichmentSource(src.id, $event.target.checked)" class="sr-only" />
                <div class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                     :style="enrichmentSelectedSources.has(src.id)
                       ? 'background:var(--warning);color:#000'
                       : 'background:var(--bg);color:var(--text2);border:1px solid var(--sep)'">
                  <span v-if="enrichmentSelectedSources.has(src.id)" v-html="icon('check', 10)"></span>
                  {{ src.label }}
                </div>
              </label>
            </template>
            <span v-if="enrichmentLoaded" class="text-xs flex items-center gap-1 ml-1" style="color:var(--success)">
              <span v-html="icon('check', 10)"></span>{{ t('autoDetectEnrichLoaded') }}
            </span>
          </div>
        </div>

        <!-- ── Stats + filter (always visible) ── -->
        <div class="flex items-center gap-2 mb-3" style="flex-shrink:0">
          <!-- 3 stat pills -->
          <div class="flex gap-2 flex-shrink-0">
            <div class="stat-card" style="padding:4px 10px;min-width:60px;text-align:center">
              <div class="num" style="font-size:1.1rem;color:var(--primary)">
                <template v-if="sourceLoading"><span style="opacity:.4">…</span></template>
                <template v-else>{{ autoDetectSummary.matched }}</template>
              </div>
              <div class="lbl" style="font-size:10px">{{ t('autoDetectMatched') }}</div>
            </div>
            <div class="stat-card" style="padding:4px 10px;min-width:60px;text-align:center">
              <div class="num" style="font-size:1.1rem;color:var(--success)">
                <template v-if="sourceLoading"><span style="opacity:.4">…</span></template>
                <template v-else>{{ autoDetectSummary.selected }}</template>
              </div>
              <div class="lbl" style="font-size:10px">{{ t('autoDetectSelected') }}</div>
            </div>
            <div class="stat-card" style="padding:4px 10px;min-width:60px;text-align:center">
              <div class="num" style="font-size:1.1rem;color:var(--text3)">
                <template v-if="sourceLoading"><span style="opacity:.4">…</span></template>
                <template v-else>{{ autoDetectSummary.total }}</template>
              </div>
              <div class="lbl" style="font-size:10px">{{ t('total') }}</div>
            </div>
          </div>
          <!-- Filter tabs -->
          <div class="seg flex-1" role="group">
            <button class="seg-btn flex-1" :class="{ active: autoDetectFilter === 'all' }" @click="autoDetectFilter = 'all'">{{ t('all') }}</button>
            <button class="seg-btn flex-1" :class="{ active: autoDetectFilter === 'matched' }" @click="autoDetectFilter = 'matched'">{{ t('autoDetectMatchedOnly') }}</button>
            <button class="seg-btn flex-1" :class="{ active: autoDetectFilter === 'unmatched' }" @click="autoDetectFilter = 'unmatched'">{{ t('autoDetectUnmatched') }}</button>
          </div>
          <button class="btn btn-ghost" style="padding:6px 10px;flex-shrink:0"
                  @click="fetchAndRunAutoDetect" :disabled="sourceLoading" :title="t('autoDetectRerun')">
            <span v-html="icon('refresh', 15)"></span>
          </button>
        </div>

        <!-- ── Results table (scrollable) ── -->
        <div class="table-shell" style="flex:1;min-height:0;overflow-y:auto;border-radius:10px">
          <table>
            <thead>
              <tr>
                <th style="width:36px">
                  <input type="checkbox" :checked="autoDetectAllSelected"
                         @change="toggleAllAutoDetect($event.target.checked)"
                         :title="t('autoDetectSelectAll')" />
                </th>
                <th style="min-width:150px">{{ t('channelName') }}</th>
                <th style="min-width:150px">{{ t('autoDetectSuggested') }}</th>
                <th class="text-center" style="width:60px">{{ t('autoDetectScore') }}</th>
                <th style="width:32px"></th>
              </tr>
            </thead>
            <tbody>
              <!-- Loading skeleton -->
              <template v-if="sourceLoading">
                <tr v-for="i in 6" :key="'sk'+i" style="opacity:.35">
                  <td><div style="width:14px;height:14px;border-radius:3px;background:var(--sep)"></div></td>
                  <td><div style="height:12px;border-radius:4px;background:var(--sep);width:70%"></div></td>
                  <td><div style="height:12px;border-radius:4px;background:var(--sep);width:55%"></div></td>
                  <td><div style="height:12px;border-radius:4px;background:var(--sep);width:36px;margin:0 auto"></div></td>
                  <td></td>
                </tr>
              </template>
              <!-- Actual results -->
              <template v-else-if="filteredAutoDetectResults.length">
                <template v-for="r in filteredAutoDetectResults" :key="r.ch.id">
                  <tr :class="{ selected: r.selected }"
                      :style="r.score > 0 ? 'cursor:pointer' : ''"
                      @click.stop="r.score > 0 && toggleExpand(r.ch.id)">
                    <td @click.stop>
                      <input type="checkbox" v-model="r.selected" :disabled="r.score === 0" />
                    </td>
                    <td>
                      <div class="font-semibold text-sm">{{ r.ch.name }}</div>
                      <div class="text-xs mono" style="color:var(--text4)">{{ r.ch.tvg_id || '—' }}</div>
                    </td>
                    <td>
                      <template v-if="r.score > 0">
                        <div class="flex items-center gap-1.5">
                          <img v-if="r.suggestedLogo" :src="r.suggestedLogo" width="18" height="18"
                               style="border-radius:3px;object-fit:contain;flex-shrink:0"
                               @error="e => e.target.style.display='none'" />
                          <div>
                            <div class="font-semibold text-sm">{{ r.suggestedName || r.editName }}</div>
                            <div class="text-xs mono" style="color:var(--text4)">{{ r.editId || '—' }}</div>
                          </div>
                        </div>
                      </template>
                      <span v-else class="text-xs" style="color:var(--text4)">{{ t('autoDetectNoMatch') }}</span>
                    </td>
                    <td class="text-center">
                      <span v-if="r.score > 0" class="text-sm font-bold"
                            :style="{ color: r.score >= 0.7 ? 'var(--success)' : r.score >= 0.4 ? 'var(--warning)' : 'var(--danger)' }">
                        {{ Math.round(r.score * 100) }}%
                      </span>
                      <span v-else style="color:var(--text4)">—</span>
                    </td>
                    <td class="text-center" style="color:var(--text4)">
                      <span v-if="r.score > 0" v-html="expandedRows.has(r.ch.id) ? icon('chevUp', 14) : icon('chevDown', 14)"></span>
                    </td>
                  </tr>
                  <!-- Expanded edit panel -->
                  <tr v-if="expandedRows.has(r.ch.id) && r.score > 0"
                      style="background:color-mix(in srgb,var(--primary) 5%,transparent)">
                    <td colspan="5" style="padding:10px 14px">
                      <div class="grid gap-2" style="grid-template-columns:1fr 1fr">
                        <div class="flex items-center gap-2">
                          <span class="label" style="min-width:58px;margin:0;font-size:11px">TVG-ID</span>
                          <input class="field flex-1" style="font-size:12px;padding:4px 7px" v-model="r.editId" :placeholder="t('tvgId')" @click.stop />
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="label" style="min-width:58px;margin:0;font-size:11px">{{ t('tvgName') }}</span>
                          <input class="field flex-1" style="font-size:12px;padding:4px 7px" v-model="r.editName" :placeholder="t('tvgName')" @click.stop />
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="label" style="min-width:58px;margin:0;font-size:11px">Logo URL</span>
                          <div class="flex gap-1.5 flex-1 items-center">
                            <img v-if="r.editLogo" :src="r.editLogo" width="24" height="24"
                                 style="border-radius:4px;object-fit:contain;background:var(--surface);flex-shrink:0"
                                 @error="e => e.target.style.display='none'" />
                            <input class="field flex-1" style="font-size:12px;padding:4px 7px" v-model="r.editLogo"
                                   :placeholder="t('tvgLogo')" type="url" @click.stop />
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="label" style="min-width:58px;margin:0;font-size:11px">TVG URL</span>
                          <input class="field flex-1" style="font-size:12px;padding:4px 7px" v-model="r.editTvgUrl"
                                 :placeholder="t('tvgUrl')" type="url" @click.stop />
                        </div>
                      </div>
                      <div class="flex gap-2 mt-2 justify-end" @click.stop>
                        <button class="btn btn-ghost" style="font-size:11px;padding:3px 9px"
                                @click="r.editId=r.ch.tvg_id||'';r.editName=r.ch.tvg_name||'';r.editLogo=r.ch.tvg_logo||'';r.editTvgUrl=r.ch.tvg_url||''">
                          {{ t('autoDetectKeepOriginal') }}
                        </button>
                        <button class="btn btn-secondary" style="font-size:11px;padding:3px 9px"
                                @click="r.editId=r.suggestedId;r.editName=r.suggestedName;r.editLogo=r.suggestedLogo;r.editTvgUrl=r.suggestedTvgUrl||''">
                          {{ t('autoDetectUseSuggested') }}
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>
              </template>
              <!-- Empty state -->
              <tr v-else-if="!sourceLoading">
                <td colspan="5">
                  <div class="empty-state" style="padding:2rem 0">
                    <div class="icon" v-html="icon('search', 40)"></div>
                    <h3>{{ sourceLoaded ? t('autoDetectEmpty') : t('autoDetectFetch') }}</h3>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ── Footer ── -->
        <div class="mt-3 pt-3" style="border-top:1px solid var(--sep);flex-shrink:0">
          <div class="flex items-center gap-3 flex-wrap">
            <!-- Coverage inline -->
            <template v-if="sourceLoaded && autoDetectSummary.total > 0">
              <span class="text-xs" style="color:var(--primary)">TVG-ID <strong>{{ autoDetectFieldStats.tvgIdPct }}%</strong></span>
              <span class="text-xs" style="color:var(--success)">TVG-Name <strong>{{ autoDetectFieldStats.tvgNamePct }}%</strong></span>
              <span class="text-xs" style="color:var(--purple)">Logo <strong>{{ autoDetectFieldStats.logoPct }}%</strong></span>
              <span class="text-xs" style="color:var(--warning)">TVG URL <strong>{{ autoDetectFieldStats.tvgUrlPct }}%</strong></span>
              <span class="text-xs" style="color:var(--text4)">
                · {{ t('autoDetectMatchPct').replace('{pct}', Math.round(autoDetectSummary.matched / autoDetectSummary.total * 100)) }}
              </span>
            </template>
            <div class="flex gap-2 ml-auto">
              <button class="btn btn-secondary" @click="modal.autoDetect = false">{{ t('cancel') }}</button>
              <button class="btn btn-primary" @click="applyAutoDetect"
                      :disabled="autoDetectSummary.selected === 0">
                <span class="inline-flex items-center gap-1.5">
                  <span v-html="icon('check', 14)"></span>
                  {{ t('autoDetectApply') }} ({{ autoDetectSummary.selected }})
                </span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
</template>

<script setup>
defineProps([
  'show','results','filter','summary','allSelected','fieldStats',
  'selectedSources','enrichmentSources','enrichmentLoaded',
  'sourceLoading','expandedRows','t','icon',
  'autoDetectPrefilter','autoDetectCustomUrl','enrichmentSelectedSources',
  'IPTV_SOURCES','ENRICHMENT_SOURCES'
])
defineEmits(['close','apply','runAgain','toggleSource','toggleEnrichment','toggleAll','filterChange','toggleExpand'])
</script>

